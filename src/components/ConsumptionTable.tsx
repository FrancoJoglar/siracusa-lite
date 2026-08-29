'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface EquipoVariedad { equipo_id: number; equipo_name: string; variedad: string; cantidad_sectores: number; }
interface ConsumptionRow { equipo_id: number; equipo_name: string; variedad: string; fertilizantes: Record<string, number>; }
interface Fertilizante { id: number; name: string; }

interface ConsumptionTableProps {
  onToast: (msg: string) => void;
}

// Fertilizantes principales para mostrar en la tabla
const MAIN_FERT = ['Sulfato Zn', 'Nitrato Amonio', 'Nitrato Calcio', 'Cloruro K', 'Acido Borico', 'Sulfato Mg', 'FMA', 'Urea'];

export function ConsumptionTable({ onToast }: ConsumptionTableProps) {
  const [equiposVariedades, setEquiposVariedades] = useState<EquipoVariedad[]>([]);
  const [fertilizantes, setFertilizantes] = useState<Fertilizante[]>([]);
  const [tableData, setTableData] = useState<ConsumptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [semanaNumero, setSemanaNumero] = useState(0);
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFin, setSemanaFin] = useState('');

  // Initialize week to current week
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startOfYear = new Date(monday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);

    setSemanaNumero(weekNumber);
    setSemanaInicio(monday.toISOString().split('T')[0]);
    setSemanaFin(sunday.toISOString().split('T')[0]);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [evData, fertData] = await Promise.all([
          api<EquipoVariedad[]>('/api/consumo?view=equipos_variedades'),
          api<Fertilizante[]>('/api/fertilizantes'),
        ]);
        setEquiposVariedades(evData);
        setFertilizantes(fertData);

        // Sort by equipo_id then variedad
        const sortedEvData = [...evData].sort((a, b) => {
          if (a.equipo_id !== b.equipo_id) return a.equipo_id - b.equipo_id;
          return a.variedad.localeCompare(b.variedad);
        });

        // Initialize table data
        const initialData: ConsumptionRow[] = sortedEvData.map(ev => ({
          equipo_id: ev.equipo_id,
          equipo_name: ev.equipo_name,
          variedad: ev.variedad,
          fertilizantes: {},
        }));
        setTableData(initialData);
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load existing consumption when week changes
  useEffect(() => {
    if (!semanaNumero) return;

    const loadConsumption = async () => {
      setLoading(true);
      try {
        // Get all consumption for this week
        const allConsumption: Record<string, Record<string, number>> = {};

        for (const ev of equiposVariedades) {
          try {
            const consumos = await api<any[]>(
              `/api/consumo?view=consumo&id_equipo=${ev.equipo_id}&variedad=${ev.variedad}&semana_numero=${semanaNumero}`
            );
            const key = `${ev.equipo_id}-${ev.variedad}`;
            allConsumption[key] = {};
            for (const c of consumos) {
              allConsumption[key][c.fertilizante_name] = parseFloat(String(c.kilos_consumidos)) || 0;
            }
          } catch (e) {
            // Skip errors
          }
        }

        // Update table data with consumption
        setTableData(prev => prev.map(row => {
          const key = `${row.equipo_id}-${row.variedad}`;
          return {
            ...row,
            fertilizantes: allConsumption[key] || {},
          };
        }));
      } catch (e) {
        console.error('Error loading consumption:', e);
      } finally {
        setLoading(false);
      }
    };

    if (equiposVariedades.length > 0) {
      loadConsumption();
    }
  }, [semanaNumero, equiposVariedades]);

  // Update cell value
  const updateCell = useCallback((equipoId: number, variedad: string, fertName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTableData(prev => prev.map(row => {
      if (row.equipo_id === equipoId && row.variedad === variedad) {
        return {
          ...row,
          fertilizantes: {
            ...row.fertilizantes,
            [fertName]: numValue,
          },
        };
      }
      return row;
    }));
    setHasChanges(true);
  }, []);

  // Calculate row total
  const getRowTotal = (fertData: Record<string, number>) => {
    return MAIN_FERT.reduce((sum, name) => sum + (fertData[name] || 0), 0);
  };

  // Calculate column totals
  const getColumnTotal = (fertName: string) => {
    return tableData.reduce((sum, row) => sum + (row.fertilizantes[fertName] || 0), 0);
  };

  // Get grand total
  const getGrandTotal = () => {
    return tableData.reduce((sum, row) => sum + getRowTotal(row.fertilizantes), 0);
  };

  // Save all consumption
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      let savedCount = 0;
      let errorCount = 0;

      for (const row of tableData) {
        for (const fertName of MAIN_FERT) {
          const kilos = row.fertilizantes[fertName] || 0;
          if (kilos > 0) {
            const fert = fertilizantes.find(f => f.name === fertName);
            if (!fert) continue;

            try {
              await api('/api/consumo', {
                method: 'POST',
                token,
                body: {
                  id_equipo: row.equipo_id,
                  variedad: row.variedad,
                  semana_numero: semanaNumero,
                  semana_inicio: semanaInicio,
                  semana_fin: semanaFin,
                  id_fertilizante: fert.id,
                  kilos_consumidos: kilos,
                } as any,
              });
              savedCount++;
            } catch (e) {
              errorCount++;
              console.error(`Error saving ${row.equipo_name} ${row.variedad} ${fertName}:`, e);
            }
          }
        }
      }

      if (errorCount === 0) {
        onToast(`✅ ${savedCount} registros guardados correctamente`);
      } else {
        onToast(`⚠️ ${savedCount} guardados, ${errorCount} errores`);
      }

      setHasChanges(false);
    } catch (e) {
      console.error('Error saving:', e);
      onToast('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Get week options with formatted labels
  const getWeekOptions = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monday = new Date(now);
      monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - (i * 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startOfYear = new Date(monday.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);

      weeks.push({
        numero: weekNum,
        inicio: monday.toISOString().split('T')[0],
        fin: sunday.toISOString().split('T')[0],
        label: `Sem ${weekNum}`,
        dateRange: `${monday.toLocaleDateString('es-AR')} - ${sunday.toLocaleDateString('es-AR')}`,
      });
    }
    return weeks;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-blue-800">📦 Consumo de Fertilizantes</h1>
          <div className="flex flex-wrap items-end gap-4">
            {/* Week selector */}
            <div className="min-w-[220px]">
              <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Semana</label>
              <select
                value={semanaNumero}
                onChange={(e) => {
                  const week = getWeekOptions().find(w => w.numero === parseInt(e.target.value));
                  if (week) {
                    setSemanaNumero(week.numero);
                    setSemanaInicio(week.inicio);
                    setSemanaFin(week.fin);
                  }
                }}
                className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-base bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getWeekOptions().map((w) => (
                  <option key={w.numero} value={w.numero}>
                    {w.label} - {w.dateRange}
                  </option>
                ))}
              </select>
            </div>

            {/* Save button */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleSaveAll}
                disabled={saving || !hasChanges}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {saving ? 'Guardando...' : '💾 Guardar Todo'}
              </button>
              {hasChanges && (
                <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Cambios sin guardar</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 text-center text-gray-400">
          Cargando datos...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-blue-600 z-10 text-base">Equipo</th>
                  <th className="px-4 py-3 text-left font-semibold sticky left-[120px] bg-blue-600 z-10 text-base">Variedad</th>
                  {MAIN_FERT.map(name => (
                    <th key={name} className="px-4 py-3 text-center font-semibold min-w-[100px] text-base">{name}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold bg-blue-700 min-w-[80px] text-base">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {tableData.map((row, rowIdx) => (
                  <tr key={`${row.equipo_id}-${row.variedad}`} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                    <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-inherit z-10 whitespace-nowrap text-base">
                      {row.equipo_name}
                    </td>
                    <td className="px-4 py-2 text-gray-600 sticky left-[120px] bg-inherit z-10 whitespace-nowrap text-base">
                      {row.variedad}
                    </td>
                    {MAIN_FERT.map(fertName => {
                      const value = row.fertilizantes[fertName] || 0;
                      return (
                        <td key={fertName} className="px-2 py-1.5">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={value || ''}
                            onChange={(e) => updateCell(row.equipo_id, row.variedad, fertName, e.target.value)}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base text-center bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                            placeholder="0"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center font-bold text-blue-800 bg-blue-50 text-base">
                      {getRowTotal(row.fertilizantes) || ''}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                  <td colSpan={2} className="px-4 py-3 text-blue-800 sticky left-0 bg-blue-100 z-10 text-base">TOTAL</td>
                  {MAIN_FERT.map(fertName => (
                    <td key={fertName} className="px-4 py-3 text-center text-blue-800 text-base">
                      {getColumnTotal(fertName) || ''}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-blue-900 bg-blue-200 text-base">
                    {getGrandTotal() || ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-base text-blue-700">
        <p className="font-medium">💡 Instrucciones:</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Escribí los kilos consumidos en cada celda</li>
          <li>Los totales se calculan automáticamente</li>
          <li>Hacé click en "Guardar Todo" cuando termines</li>
          <li>La distribución por sector se calcula automáticamente al guardar</li>
        </ul>
      </div>
    </div>
  );
}
