'use client';

import { useState, useEffect } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface Equipo { id: number; name: string; }
interface Sector { id: number; name: string; id_equipo: number; variedad?: string; has_hectareas?: number; m3_ha_hr?: number; equipo_name?: string; }

interface SolicitudesProps {
  onToast: (msg: string) => void;
}

export function Solicitudes({ onToast }: SolicitudesProps) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [fecha, setFecha] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [horas, setHoras] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ferts, setFerts] = useState<number[]>(Array(8).fill(0));
  const [secInfo, setSecInfo] = useState('');
  const [m3Preview, setM3Preview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recetaWarn, setRecetaWarn] = useState('');
  const [solReceta, setSolReceta] = useState<Record<string, { max: number }>>({});

  // Initialize fecha to today
  useEffect(() => {
    const now = new Date();
    setFecha(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }, []);

  // Load equipos and sectores
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eqData, secData] = await Promise.all([
          api<Equipo[]>('/api/equipos'),
          api<Sector[]>('/api/sectores'),
        ]);
        setEquipos(eqData);
        setSectores(secData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  const filteredSectores = sectores.filter(s => s.id_equipo === Number(equipoId));

  const onEquipoChange = (value: string) => {
    setEquipoId(value);
    setSectorId('');
    setSecInfo('');
    setM3Preview('');
    setRecetaWarn('');
    setSolReceta({});
  };

  const onSectorChange = async (value: string) => {
    setSectorId(value);
    const sec = sectores.find(s => s.id === Number(value));
    if (!sec) { setSecInfo(''); return; }
    setSecInfo(`📍 ${sec.equipo_name ?? ''} — ${sec.name} | 🌿 ${sec.variedad ?? 'N/A'} | 📐 ${sec.has_hectareas ?? 0} has | 💧 ${sec.m3_ha_hr ?? 0} m³/ha/hr`);
    updateM3();

    // Load receta for this sector+month
    if (fecha) {
      const d = new Date(fecha + 'T12:00:00');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const r = await api<any[]>(`/api/recetas?id_sector=${sec.id}&mes=${d.getMonth() + 1}&anio=${d.getFullYear()}`, { token });
        const newReceta: Record<string, { max: number }> = {};
        for (const x of r) newReceta[x.fert_name] = { max: x.kilos_maximo };
        setSolReceta(newReceta);
        if (r.length) {
          setRecetaWarn('📋 Receta: ' + r.map((x: any) => `${x.fert_name}: máx ${x.kilos_maximo} kg`).join(' | '));
        } else {
          setRecetaWarn('');
        }
      } catch {
        setRecetaWarn('');
        setSolReceta({});
      }
    }
  };

  const updateM3 = () => {
    const sec = sectores.find(s => s.id === Number(sectorId));
    const h = parseFloat(horas) || 0;
    if (!sec || !h) { setM3Preview(''); return; }
    setM3Preview(`💧 ${(sec.has_hectareas! * h * sec.m3_ha_hr!).toFixed(1)} m³ (${sec.has_hectareas} has × ${h} hrs × ${sec.m3_ha_hr})`);
  };

  const onHorasChange = (value: string) => {
    setHoras(value);
    setTimeout(updateM3, 0);
  };

  const onFertChange = (index: number, value: string) => {
    const newFerts = [...ferts];
    newFerts[index] = parseFloat(value) || 0;
    setFerts(newFerts);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorId || !fecha || !horas) {
      onToast('⚠️ Completá todos los campos');
      return;
    }

    // Validate against recipe limits
    for (let i = 0; i < FK.length; i++) {
      const fertName = FN[i];
      const limit = solReceta[fertName];
      if (limit && ferts[i] > limit.max) {
        onToast(`⚠️ ${fertName}: ${ferts[i]} kg excede el máximo de ${limit.max} kg`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      const data: Record<string, any> = {
        id_sector: Number(sectorId),
        fecha_riego: fecha,
        horas: parseFloat(horas),
        solicitante: user?.email ?? user?.user_metadata?.name ?? 'Anónimo',
        observaciones,
      };
      FK.forEach((k, i) => { data[k] = ferts[i] ?? 0; });

      const res = await api<any>('/api/solicitudes', { method: 'POST', body: data as any, token });
      if (res.id) {
        onToast(`✅ Registrado — ${(res.m3_programados ?? 0).toFixed(1)} m³`);
        setHoras('');
        setObservaciones('');
        setFerts(Array(8).fill(0));
        setM3Preview('');
        setSecInfo('');
        setRecetaWarn('');
        setSolReceta({});
      } else {
        onToast('❌ Error al guardar');
      }
    } catch {
      onToast('❌ Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-800">Nueva Solicitud de Riego</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Equipo</label>
            <select value={equipoId} onChange={(e) => onEquipoChange(e.target.value)} required
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Seleccionar...</option>
              {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Sector</label>
            <select value={sectorId} onChange={(e) => onSectorChange(e.target.value)} required
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Elegí equipo primero</option>
              {filteredSectores.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name} ({sec.variedad ?? 'N/A'})</option>
              ))}
            </select>
          </div>
        </div>

        {secInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">{secInfo}</div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Horas</label>
          <input type="number" step="0.5" min="0" max="24" value={horas}
            onChange={(e) => onHorasChange(e.target.value)} required
            className="w-48 border border-blue-200 rounded-lg px-3 py-2.5 text-lg font-semibold bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5.0" />
        </div>

        <h3 className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">🧪 Fertilizantes (kg)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {FN.map((name, i) => {
            const limit = solReceta[name];
            const isOver = limit && ferts[i] > limit.max;
            return (
              <div key={name}>
                <label className="block text-xs text-gray-500 mb-1">
                  {name}
                  {limit && <span className="text-amber-600 ml-1">(máx {limit.max})</span>}
                </label>
                <input type="number" step="1" min="0" value={ferts[i] || ''}
                  onChange={(e) => onFertChange(i, e.target.value)}
                  className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isOver ? 'border-red-400 bg-red-50' : 'border-blue-200 bg-blue-50/50'}`}
                  placeholder="0" />
                {isOver && (
                  <p className="text-red-500 text-xs mt-1">Excede máximo por {((ferts[i] - limit.max)).toFixed(1)} kg</p>
                )}
              </div>
            );
          })}
        </div>

        {recetaWarn && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">{recetaWarn}</div>
        )}

        {m3Preview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800">{m3Preview}</div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Observaciones</label>
          <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
            className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Opcional" />
        </div>

        <button type="submit" disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 transition-colors">
          {submitting ? 'Guardando...' : '✅ Registrar'}
        </button>
      </form>
    </div>
  );
}
