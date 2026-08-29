'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface Equipo { id: number; name: string; }
interface Sector { id: number; name: string; id_equipo: number; variedad?: string; has_hectareas?: number; equipo_name?: string; }
interface Receta { id: number; nombre: string; tipo_cultivo?: string; temporada?: string; }
interface Asignacion { sector_id: number; sector_name: string; receta_id: number | null; receta_nombre: string | null; fecha_asignacion: string | null; }

interface AsignacionesProps {
  onToast: (msg: string) => void;
}

export function Asignaciones({ onToast }: AsignacionesProps) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [selectedEquipo, setSelectedEquipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eqData, secData, recData] = await Promise.all([
          api<Equipo[]>('/api/equipos'),
          api<Sector[]>('/api/sectores'),
          api<Receta[]>('/api/recetas?view=catalog'),
        ]);
        setEquipos(eqData);
        setSectores(secData);
        setRecetas(recData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  const filteredSectores = sectores.filter(s => s.id_equipo === Number(selectedEquipo));

  const loadAsignaciones = async (equipoId: string) => {
    if (!equipoId) {
      setAsignaciones([]);
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const data = await api<Asignacion[]>(`/api/recetas?view=asignaciones&id_equipo=${equipoId}`, { token });
      setAsignaciones(data);
    } catch (e) {
      console.error('Error loading asignaciones:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAsignaciones(selectedEquipo);
  }, [selectedEquipo]);

  const handleAsignar = async (sectorId: number, recetaId: number) => {
    setSaving(sectorId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await api('/api/recetas?view=asignar', {
        method: 'POST',
        token,
        body: { id_sector: sectorId, id_receta: recetaId, motivo: motivo || 'Asignación manual' } as any,
      });

      onToast('✅ Receta asignada correctamente');
      setMotivo('');
      await loadAsignaciones(selectedEquipo);
    } catch (e) {
      console.error('Error assigning:', e);
      onToast('❌ Error al asignar receta');
    } finally {
      setSaving(null);
    }
  };

  const handleDesasignar = async (sectorId: number) => {
    if (!confirm('¿Desasignar receta de este sector?')) return;

    setSaving(sectorId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Assign null receta to remove
      await api('/api/recetas?view=asignar', {
        method: 'POST',
        token,
        body: { id_sector: sectorId, id_receta: null, motivo: motivo || 'Desasignación' } as any,
      });

      onToast('✅ Receta desasignada');
      setMotivo('');
      await loadAsignaciones(selectedEquipo);
    } catch (e) {
      console.error('Error unassigning:', e);
      onToast('❌ Error al desasignar');
    } finally {
      setSaving(null);
    }
  };

  const getAsignacion = (sectorId: number) => {
    return asignaciones.find(a => a.sector_id === sectorId);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-800">📋 Asignación de Recetas a Sectores</h1>

      {/* Equipo selector */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
        <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Equipo</label>
        <select
          value={selectedEquipo}
          onChange={(e) => setSelectedEquipo(e.target.value)}
          className="w-full md:w-64 border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar equipo...</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
      </div>

      {/* Asignaciones table */}
      {selectedEquipo && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando asignaciones...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-blue-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Sector</th>
                  <th className="px-4 py-3 text-left font-semibold">Variedad</th>
                  <th className="px-4 py-3 text-left font-semibold">Hectáreas</th>
                  <th className="px-4 py-3 text-left font-semibold">Receta Actual</th>
                  <th className="px-4 py-3 text-left font-semibold">Nueva Receta</th>
                  <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {filteredSectores.map((sec) => {
                  const asig = getAsignacion(sec.id);
                  return (
                    <tr key={sec.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{sec.name}</td>
                      <td className="px-4 py-3 text-gray-600">{sec.variedad ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{sec.has_hectareas ?? 0} ha</td>
                      <td className="px-4 py-3">
                        {asig?.receta_nombre ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {asig.receta_nombre}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Sin receta
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAsignar(sec.id, parseInt(e.target.value));
                            }
                          }}
                        >
                          <option value="">Seleccionar receta...</option>
                          {recetas.map((r) => (
                            <option key={r.id} value={r.id}>{r.nombre} ({r.tipo_cultivo ?? '—'})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {asig?.receta_id && (
                          <button
                            onClick={() => handleDesasignar(sec.id)}
                            disabled={saving === sec.id}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {saving === sec.id ? '...' : '🗑️'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Info */}
      {!selectedEquipo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center text-blue-700">
          <p className="text-lg">Seleccioná un equipo para ver y editar las asignaciones de recetas</p>
        </div>
      )}
    </div>
  );
}
