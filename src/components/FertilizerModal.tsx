'use client';

import { useState, useEffect } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface FertilizerModalProps {
  sectorId: number;
  sectorName: string;
  fecha: string;
  day: number;
  existingHrs: number;
  existingM3: number;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string) => void;
}

export function FertilizerModal({
  sectorId,
  sectorName,
  fecha,
  day,
  existingHrs,
  existingM3,
  onClose,
  onSaved,
  onToast,
}: FertilizerModalProps) {
  const [horas, setHoras] = useState(existingHrs > 0 ? existingHrs.toFixed(1) : '');
  const [ferts, setFerts] = useState<number[]>(Array(8).fill(0));
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [sectorInfo, setSectorInfo] = useState<any>(null);
  const [recetaWarn, setRecetaWarn] = useState('');
  const [solReceta, setSolReceta] = useState<Record<string, { max: number }>>({});

  // Load sector info and recipe
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Load sector info
        const secData = await api<any[]>(`/api/sectores?id=${sectorId}`, { token });
        if (secData && secData.length > 0) {
          setSectorInfo(secData[0]);
        }

        // Load recipe for this sector+month
        const d = new Date(fecha + 'T12:00:00');
        const recetas = await api<any[]>(`/api/recetas?id_sector=${sectorId}&mes=${d.getMonth() + 1}&anio=${d.getFullYear()}`, { token });
        const newReceta: Record<string, { max: number }> = {};
        for (const x of recetas) newReceta[x.fert_name] = { max: x.kilos_maximo };
        setSolReceta(newReceta);
        if (recetas.length) {
          setRecetaWarn('📋 Receta: ' + recetas.map((x: any) => `${x.fert_name}: máx ${x.kilos_maximo} kg`).join(' | '));
        }
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, [sectorId, fecha]);

  const calcM3 = () => {
    const h = parseFloat(horas) || 0;
    if (!sectorInfo || !h) return 0;
    return sectorInfo.has_hectareas * h * sectorInfo.m3_ha_hr;
  };

  const onFertChange = (index: number, value: string) => {
    const newFerts = [...ferts];
    newFerts[index] = parseFloat(value) || 0;
    setFerts(newFerts);
  };

  const handleSave = async () => {
    const h = parseFloat(horas) || 0;
    if (h <= 0) {
      onToast('⚠️ Ingresá las horas de riego');
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

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const user = session?.user;

      const data: Record<string, any> = {
        id_sector: sectorId,
        fecha_riego: fecha,
        horas: h,
        solicitante: user?.email ?? user?.user_metadata?.name ?? 'Anónimo',
        observaciones,
      };
      FK.forEach((k, i) => { data[k] = ferts[i] ?? 0; });

      const res = await api<any>('/api/solicitudes', { method: 'POST', body: data as any, token });
      if (res.id) {
        onToast(`✅ Registrado — ${res.m3_programados.toFixed(1)} m³ con fertilizantes`);
        onSaved();
        onClose();
      } else {
        onToast('❌ Error al guardar');
      }
    } catch {
      onToast('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const m3 = calcM3();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-lg font-bold">🧪 Agregar Fertilizantes</h3>
          <p className="text-green-100 text-sm">{sectorName} — {fecha}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Sector info */}
          {sectorInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              📍 {sectorInfo.equipo_name ?? ''} — {sectorInfo.name} | 🌿 {sectorInfo.variedad ?? 'N/A'} | 📐 {sectorInfo.has_hectareas ?? 0} has | 💧 {sectorInfo.m3_ha_hr ?? 0} m³/ha/hr
            </div>
          )}

          {/* Hours input */}
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Horas de riego</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="w-32 border border-blue-200 rounded-lg px-3 py-2.5 text-lg font-bold bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.0"
            />
          </div>

          {/* M³ preview */}
          {m3 > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              💧 <strong>{m3.toFixed(1)} m³</strong> ({sectorInfo?.has_hectareas} has × {horas} hrs × {sectorInfo?.m3_ha_hr})
            </div>
          )}

          {/* Fertilizers */}
          <div>
            <h3 className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">🧪 Fertilizantes (kg)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FN.map((name, i) => {
                const limit = solReceta[name];
                const isOver = limit && ferts[i] > limit.max;
                return (
                  <div key={name}>
                    <label className="block text-xs text-gray-500 mb-1">
                      {name}
                      {limit && <span className="text-amber-600 ml-1">(máx {limit.max})</span>}
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={ferts[i] || ''}
                      onChange={(e) => onFertChange(i, e.target.value)}
                      className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isOver ? 'border-red-400 bg-red-50' : 'border-blue-200 bg-blue-50/50'}`}
                      placeholder="0"
                    />
                    {isOver && (
                      <p className="text-red-500 text-xs mt-1">Excede por {((ferts[i] - limit.max)).toFixed(1)} kg</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipe warning */}
          {recetaWarn && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{recetaWarn}</div>
          )}

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !horas || parseFloat(horas) <= 0}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : '🧪 Guardar con Fertilizantes'}
          </button>
        </div>
      </div>
    </div>
  );
}
