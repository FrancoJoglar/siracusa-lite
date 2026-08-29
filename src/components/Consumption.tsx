'use client';

import { useState, useEffect } from 'react';
import { api, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface EquipoVariedad { equipo_id: number; equipo_name: string; variedad: string; cantidad_sectores: number; }
interface SectorInfo { id: number; name: string; has_hectareas: number; equipo_name: string; }
interface SolicitudInfo { sector_id: number; sector_name: string; fertilizante_name: string; kilos_solicitados: number; }
interface ConsumoItem { id: number; id_equipo: number; variedad: string; semana_numero: number; semana_inicio: string; semana_fin: string; id_fertilizante: number; fertilizante_name: string; kilos_consumidos: number; distribucion: any[]; }
interface Fertilizante { id: number; name: string; }

interface ConsumptionProps {
  onToast: (msg: string) => void;
}

export function Consumption({ onToast }: ConsumptionProps) {
  const [equiposVariedades, setEquiposVariedades] = useState<EquipoVariedad[]>([]);
  const [sectores, setSectores] = useState<SectorInfo[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudInfo[]>([]);
  const [consumos, setConsumos] = useState<ConsumoItem[]>([]);
  const [fertilizantes, setFertilizantes] = useState<Fertilizante[]>([]);

  const [selectedEquipo, setSelectedEquipo] = useState('');
  const [selectedVariedad, setSelectedVariedad] = useState('');
  const [semanaNumero, setSemanaNumero] = useState(0);
  const [semanaInicio, setSemanaInicio] = useState('');
  const [semanaFin, setSemanaFin] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  // Initialize week to current week
  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Calculate week number
    const startOfYear = new Date(monday.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);

    setSemanaNumero(weekNumber);
    setSemanaInicio(monday.toISOString().split('T')[0]);
    setSemanaFin(sunday.toISOString().split('T')[0]);
  }, []);

  // Load equipos-variedades and fertilizantes on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [evData, fertData] = await Promise.all([
          api<EquipoVariedad[]>('/api/consumo?view=equipos_variedades'),
          api<Fertilizante[]>('/api/fertilizantes'),
        ]);
        setEquiposVariedades(evData);
        setFertilizantes(fertData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  // Load data when selection changes
  useEffect(() => {
    if (!selectedEquipo || !selectedVariedad || !semanaNumero) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sectData, solData, consData] = await Promise.all([
          api<SectorInfo[]>(`/api/consumo?view=sectores&id_equipo=${selectedEquipo}&variedad=${selectedVariedad}`),
          api<SolicitudInfo[]>(`/api/consumo?view=solicitudes&id_equipo=${selectedEquipo}&variedad=${selectedVariedad}&semana_inicio=${semanaInicio}&semana_fin=${semanaFin}`),
          api<ConsumoItem[]>(`/api/consumo?view=consumo&id_equipo=${selectedEquipo}&variedad=${selectedVariedad}&semana_numero=${semanaNumero}`),
        ]);
        setSectores(sectData);
        setSolicitudes(solData);
        setConsumos(consData);
      } catch (e) {
        console.error('Error loading consumption data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEquipo, selectedVariedad, semanaNumero, semanaInicio, semanaFin]);

  // Get unique equipos from equipos-variedades (sorted by ID)
  const uniqueEquipos = equiposVariedades.reduce((acc, ev) => {
    if (!acc.find(e => e.equipo_id === ev.equipo_id)) {
      acc.push({ equipo_id: ev.equipo_id, equipo_name: ev.equipo_name });
    }
    return acc;
  }, [] as { equipo_id: number; equipo_name: string }[]).sort((a, b) => a.equipo_id - b.equipo_id);

  // Get variedades for selected equipo (sorted alphabetically)
  const variedadesForEquipo = equiposVariedades
    .filter(ev => ev.equipo_id === parseInt(selectedEquipo))
    .map(ev => ev.variedad)
    .sort();

  // Get solicitudes grouped by fertilizante
  const solicitudesByFert = FN.reduce((acc, name) => {
    acc[name] = solicitudes
      .filter(s => s.fertilizante_name === name)
      .reduce((sum, s) => sum + (parseFloat(String(s.kilos_solicitados)) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Get solicitudes by sector and fertilizante
  const solicitudesBySector = solicitudes.reduce((acc, s) => {
    const key = `${s.sector_id}-${s.fertilizante_name}`;
    acc[key] = parseFloat(String(s.kilos_solicitados)) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Get consumption by fertilizante
  const consumoByFert = consumos.reduce((acc, c) => {
    acc[c.fertilizante_name] = parseFloat(String(c.kilos_consumidos)) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Calculate distribution preview
  const calculateDistribution = (fertName: string, totalConsumo: number) => {
    const totalSolicitado = solicitudesByFert[fertName] || 0;
    if (totalSolicitado === 0 || totalConsumo === 0) return [];

    return sectores.map(sec => {
      const solicitado = solicitudesBySector[`${sec.id}-${fertName}`] || 0;
      const proporcion = solicitado / totalSolicitado;
      const asignados = totalConsumo * proporcion;
      return {
        sector_id: sec.id,
        sector_name: sec.name,
        kilos_solicitados: solicitado,
        kilos_asignados: Math.round(asignados * 100) / 100,
      };
    }).filter(d => d.kilos_solicitados > 0);
  };

  // Save consumption
  const handleSave = async (fertName: string, kilos: number) => {
    const fert = fertilizantes.find(f => f.name === fertName);
    if (!fert) return;

    setSaving(fert.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await api('/api/consumo', {
        method: 'POST',
        token,
        body: {
          id_equipo: parseInt(selectedEquipo),
          variedad: selectedVariedad,
          semana_numero: semanaNumero,
          semana_inicio: semanaInicio,
          semana_fin: semanaFin,
          id_fertilizante: fert.id,
          kilos_consumidos: kilos,
        } as any,
      });

      onToast(`✅ Consumo de ${fertName} guardado`);

      // Refresh consumos
      const consData = await api<ConsumoItem[]>(
        `/api/consumo?view=consumo&id_equipo=${selectedEquipo}&variedad=${selectedVariedad}&semana_numero=${semanaNumero}`,
        { token }
      );
      setConsumos(consData);
    } catch (e) {
      console.error('Error saving:', e);
      onToast('❌ Error al guardar consumo');
    } finally {
      setSaving(null);
    }
  };

  // Get week options (last 12 weeks)
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
        label: `Sem ${weekNum} (${monday.toLocaleDateString('es-AR')} - ${sunday.toLocaleDateString('es-AR')})`,
      });
    }
    return weeks;
  };

  // Get active fertilizantes (those with solicitudes or consumption)
  const activeFertilizantes = FN.filter(name => 
    solicitudesByFert[name] > 0 || consumoByFert[name] > 0
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-800">📦 Consumo de Fertilizantes</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Equipo selector */}
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Equipo</label>
            <select
              value={selectedEquipo}
              onChange={(e) => {
                setSelectedEquipo(e.target.value);
                setSelectedVariedad('');
              }}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm font-medium bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar equipo...</option>
              {uniqueEquipos.map((eq) => (
                <option key={eq.equipo_id} value={eq.equipo_id}>{eq.equipo_name}</option>
              ))}
            </select>
          </div>

          {/* Variedad selector */}
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Variedad</label>
            <select
              value={selectedVariedad}
              onChange={(e) => setSelectedVariedad(e.target.value)}
              disabled={!selectedEquipo}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Seleccionar variedad...</option>
              {variedadesForEquipo.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Semana selector */}
          <div className="min-w-[280px]">
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
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getWeekOptions().map((w) => (
                <option key={w.numero} value={w.numero}>{w.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 text-center text-gray-400">
          Cargando datos...
        </div>
      )}

      {/* Content */}
      {!loading && selectedEquipo && selectedVariedad && (
        <>
          {/* Sectores info */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
            <h3 className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
              📋 Sectores de {selectedVariedad} en este equipo
            </h3>
            <div className="flex flex-wrap gap-2">
              {sectores.map((sec) => (
                <span key={sec.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {sec.name} ({sec.has_hectareas} ha)
                </span>
              ))}
            </div>
          </div>

          {/* Solicitudes summary */}
          {activeFertilizantes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                💧 Solicitudes de la semana
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 text-blue-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sector</th>
                      {activeFertilizantes.map((name) => (
                        <th key={name} className="px-3 py-2 text-right font-semibold">{name.substring(0, 8)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {sectores.map((sec) => {
                      const hasSols = activeFertilizantes.some(name => solicitudesBySector[`${sec.id}-${name}`] > 0);
                      if (!hasSols) return null;
                      return (
                        <tr key={sec.id} className="hover:bg-blue-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800">{sec.name}</td>
                          {activeFertilizantes.map((name) => {
                            const val = solicitudesBySector[`${sec.id}-${name}`] || 0;
                            return (
                              <td key={name} className="px-3 py-2 text-right text-gray-600">
                                {val > 0 ? val.toFixed(1) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-3 py-2 text-blue-800">TOTAL</td>
                      {activeFertilizantes.map((name) => (
                        <td key={name} className="px-3 py-2 text-right text-blue-800">
                          {solicitudesByFert[name]?.toFixed(1) || '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Consumption input */}
          {activeFertilizantes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                🧪 Ingresar consumo real
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeFertilizantes.map((name) => {
                  const solicitado = solicitudesByFert[name] || 0;
                  const consumido = consumoByFert[name] || 0;
                  const diff = consumido - solicitado;
                  const diffPercent = solicitado > 0 ? ((diff / solicitado) * 100) : 0;
                  const isOver = diff > 0;

                  return (
                    <div key={name} className="border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{name}</div>
                      <div className="text-xs text-blue-600 mb-2">Pedido: {solicitado.toFixed(1)} kg</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={consumido || ''}
                          onChange={(e) => {
                            const newVal = parseFloat(e.target.value) || 0;
                            const newConsumos = [...consumos];
                            const existingIdx = newConsumos.findIndex(c => c.fertilizante_name === name);
                            
                            if (existingIdx >= 0) {
                              // Update existing record
                              newConsumos[existingIdx] = {
                                ...newConsumos[existingIdx],
                                kilos_consumidos: newVal,
                              };
                            } else {
                              // Create new temporary record
                              const fert = fertilizantes.find(f => f.name === name);
                              newConsumos.push({
                                id: 0,
                                id_equipo: parseInt(selectedEquipo),
                                variedad: selectedVariedad,
                                semana_numero: semanaNumero,
                                semana_inicio: semanaInicio,
                                semana_fin: semanaFin,
                                id_fertilizante: fert?.id || 0,
                                fertilizante_name: name,
                                kilos_consumidos: newVal,
                                distribucion: [],
                              });
                            }
                            setConsumos(newConsumos);
                          }}
                          className="flex-1 border border-blue-200 rounded px-2 py-1.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <button
                          onClick={() => handleSave(name, consumido)}
                          disabled={saving === fertilizantes.find(f => f.name === name)?.id}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving === fertilizantes.find(f => f.name === name)?.id ? '...' : '💾'}
                        </button>
                      </div>
                      {consumido > 0 && (
                        <div className={`text-xs mt-1 ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                          {isOver ? `⚠️ +${diff.toFixed(1)} kg (+${diffPercent.toFixed(0)}%)` : `✅ ${diff.toFixed(1)} kg`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Distribution preview */}
          {activeFertilizantes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                📊 Distribución por sector
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 text-blue-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sector</th>
                      {activeFertilizantes.map((name) => (
                        <th key={name} className="px-3 py-2 text-right font-semibold">{name.substring(0, 8)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {sectores.map((sec) => {
                      const hasData = activeFertilizantes.some(name => {
                        const dist = calculateDistribution(name, consumoByFert[name] || 0);
                        return dist.some(d => d.sector_id === sec.id && d.kilos_asignados > 0);
                      });
                      if (!hasData) return null;
                      return (
                        <tr key={sec.id} className="hover:bg-blue-50/50">
                          <td className="px-3 py-2 font-medium text-gray-800">{sec.name}</td>
                          {activeFertilizantes.map((name) => {
                            const dist = calculateDistribution(name, consumoByFert[name] || 0);
                            const sectorDist = dist.find(d => d.sector_id === sec.id);
                            return (
                              <td key={name} className="px-3 py-2 text-right text-gray-600">
                                {sectorDist && sectorDist.kilos_asignados > 0 ? sectorDist.kilos_asignados.toFixed(1) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 font-bold">
                      <td className="px-3 py-2 text-blue-800">TOTAL</td>
                      {activeFertilizantes.map((name) => (
                        <td key={name} className="px-3 py-2 text-right text-blue-800">
                          {consumoByFert[name]?.toFixed(1) || '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && (!selectedEquipo || !selectedVariedad) && (
        <div className="bg-blue-50 border border-blue-200 variedad rounded-xl p-6 text-center text-blue-700">
          <p className="text-lg">Seleccioná un equipo y variedad para registrar el consumo</p>
        </div>
      )}
    </div>
  );
}
