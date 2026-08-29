'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api, isAbortError, FK, FN } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CalendarSkeleton } from './Skeleton';
import { FertModal } from './FertModal';
import { QuickIrrigationModal } from './QuickIrrigationModal';
import { FertilizerModal } from './FertilizerModal';
import { Tooltip } from './Tooltip';

interface Equipo { id: number; name: string; }
interface CalendarioProps { navigateTo: (view: string) => void; onToast: (msg: string) => void; }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function findFertInList(list: any[] | undefined, fertName: string) {
  if (!Array.isArray(list)) return null;
  return list.find((x: any) => x.fert_name === fertName) || null;
}

function solDataHasFert(sols: any[]): boolean {
  return sols.some((s: any) => FK.some((k) => (s[k] ?? 0) > 0));
}

export function Calendario({ navigateTo, onToast }: CalendarioProps) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [selectedEquipo, setSelectedEquipo] = useState('');
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [gridData, setGridData] = useState<any[]>([]);
  const [expandedSector, setExpandedSector] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptyMsg, setEmptyMsg] = useState('Elegí un equipo para comenzar');
  const [showStats, setShowStats] = useState(false);
  const [statDias, setStatDias] = useState(0);
  const [statHrs, setStatHrs] = useState(0);
  const [statM3, setStatM3] = useState(0);
  const [fertilizantes, setFertilizantes] = useState<any[]>([]);

  // FertModal state
  const [showFertModal, setShowFertModal] = useState(false);
  const [fertModalData, setFertModalData] = useState<{ sectorName: string; fecha: string; sols: any[] } | null>(null);

  // QuickIrrigationModal state
  const [showQuickIrrigation, setShowQuickIrrigation] = useState(false);
  const [quickIrrigationData, setQuickIrrigationData] = useState<{
    sectorId: number;
    sectorName: string;
    fecha: string;
    day: number;
    existingHrs: number;
    existingM3: number;
    hasFert: boolean;
  } | null>(null);

  // FertilizerModal state
  const [showFertilizerModal, setShowFertilizerModal] = useState(false);
  const [fertilizerModalData, setFertilizerModalData] = useState<{
    sectorId: number;
    sectorName: string;
    fecha: string;
    day: number;
    existingHrs: number;
    existingM3: number;
  } | null>(null);

  const gridCache = useRef<Map<string, any[]>>(new Map());
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Load equipos on mount
  useEffect(() => {
    const loadEquipos = async () => {
      try {
        const [eqData, fertData] = await Promise.all([
          api<Equipo[]>('/api/equipos'),
          api<any[]>('/api/fertilizantes'),
        ]);
        setEquipos(eqData);
        setFertilizantes(fertData);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadEquipos();
  }, []);

  // Build sol map for quick lookups
  const solMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const sec of gridData) {
      for (const s of sec.solicitudes ?? []) {
        const d = parseInt(s.fecha_riego.split('-')[2], 10);
        const k = `${sec.id}-${d}`;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(s);
      }
    }
    return map;
  }, [gridData]);

  // Compute stats
  const computeStats = useCallback((data: any[]) => {
    let tH = 0, tM3 = 0;
    const diasSet = new Set<string>();
    for (const sec of data) {
      for (const s of sec.solicitudes ?? []) {
        tH += s.horas ?? 0;
        tM3 += s.m3_programados ?? 0;
        if (s.fecha_riego) diasSet.add(s.fecha_riego);
      }
    }
    setStatDias(diasSet.size);
    setStatHrs(tH);
    setStatM3(tM3);
    setShowStats(data.length > 0);
  }, []);

  // Load calendar data with caching and abort
  useEffect(() => {
    const loadCalendar = async () => {
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
      if (!selectedEquipo) {
        setGridData([]);
        setShowStats(false);
        setEmptyMsg('Elegí un equipo para comenzar');
        return;
      }

      const cacheKey = `${selectedEquipo}-${selectedMes}-${selectedAnio}`;
      const cachedData = gridCache.current.get(cacheKey);
      if (cachedData) {
        setGridData(cachedData);
        setExpandedSector(null);
        if (!cachedData.length) {
          setEmptyMsg('Sin sectores para este equipo');
        } else {
          computeStats(cachedData);
        }
        return;
      }

      setLoading(true);
      setEmptyMsg('Cargando calendario...');
      setGridData([]);
      abortCtrlRef.current = new AbortController();

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const data = await api<any[]>(`/api/grid?id_equipo=${selectedEquipo}&mes=${selectedMes}&anio=${selectedAnio}`, {
          signal: abortCtrlRef.current.signal,
          token,
        });
        
        gridCache.current.set(cacheKey, data);
        setGridData(data);
        setExpandedSector(null);
        if (!data.length) {
          setEmptyMsg('Sin sectores para este equipo');
        } else {
          computeStats(data);
        }
      } catch (e) {
        if (isAbortError(e)) return;
        setEmptyMsg('Error al cargar el calendario');
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
    return () => { abortCtrlRef.current?.abort(); };
  }, [selectedEquipo, selectedMes, selectedAnio, computeStats]);

  const daysInMonth = new Date(selectedAnio, selectedMes, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMes && today.getFullYear() === selectedAnio;

  const openFertModal = (sectorName: string, day: number) => {
    const fecha = `${selectedAnio}-${String(selectedMes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Find all solicitations for this day across all sectors or just the expanded one
    const solsForDay: any[] = [];
    for (const sec of gridData) {
      const k = `${sec.id}-${day}`;
      const sols = solMap.get(k) ?? [];
      solsForDay.push(...sols);
    }
    setFertModalData({ sectorName, fecha, sols: solsForDay });
    setShowFertModal(true);
  };

  const getCols = (sec: any) => expandedSector === sec.id ? 11 : 3;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Equipo</label>
            <select value={selectedEquipo} onChange={(e) => setSelectedEquipo(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm font-medium bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Seleccionar equipo...</option>
              {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Mes</label>
            <select value={selectedMes} onChange={(e) => setSelectedMes(parseInt(e.target.value))}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Año</label>
            <select value={selectedAnio} onChange={(e) => setSelectedAnio(parseInt(e.target.value))}
              className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 px-4 py-2 flex items-center gap-2">
            <span className="text-blue-500 text-lg">📅</span>
            <span className="text-sm text-gray-600"><strong className="text-blue-700">{statDias}</strong> días</span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 px-4 py-2 flex items-center gap-2">
            <span className="text-blue-500 text-lg">⏱️</span>
            <span className="text-sm text-gray-600"><strong className="text-blue-700">{statHrs.toFixed(1)}</strong> hrs</span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 px-4 py-2 flex items-center gap-2">
            <span className="text-blue-500 text-lg">💧</span>
            <span className="text-sm text-gray-600"><strong className="text-blue-700">{statM3.toFixed(0)}</strong> m³</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      {loading ? (
        <CalendarSkeleton />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          {!selectedEquipo || gridData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🌱</div>
              <p className="text-lg font-medium">{emptyMsg}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '60px' }} />
                  {gridData.map((sec) => (
                    <col key={sec.id} style={{ width: expandedSector === sec.id ? '464px' : '144px' }} />
                  ))}
                </colgroup>
                <thead>
                  {/* Sector headers */}
                  <tr>
                    <th className="sticky left-0 z-20 bg-blue-50 border border-blue-100 px-2 py-2 text-left text-xs font-bold text-blue-800"></th>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      const recetaNombre = sec.receta?.nombre ?? null;
                      return (
                        <th key={sec.id} colSpan={getCols(sec)}
                          className={`border border-blue-100 px-2 py-2 text-center text-xs font-bold text-white cursor-pointer hover:brightness-110 select-none transition-all ${isExp ? 'bg-blue-600' : 'bg-blue-500'}`}
                          onClick={() => setExpandedSector(isExp ? null : sec.id)}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] opacity-80">{isExp ? '▼' : '▶'} {sec.name}</span>
                            <span className="text-[10px] font-normal opacity-70">
                              {recetaNombre ? `${recetaNombre} | ${sec.variedad ?? ''} ${sec.has_hectareas ?? 0}ha` : '⚠️ Sin receta'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  {/* Column headers */}
                  <tr>
                    <th className="sticky left-0 z-20 bg-blue-50 border border-blue-100 px-2 py-1.5 text-xs text-blue-700 font-semibold">Día</th>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      return (
                        <th key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                          <div className="flex h-full">
                            <div className="flex-1 border-r border-blue-100 px-1.5 py-1 text-[10px] bg-blue-50 font-semibold text-blue-700 text-center">Hrs</div>
                            {isExp && FN.map((n) => (
                              <Tooltip key={n} content={n}>
                                <div className="w-10 border-r border-blue-100 px-1 py-1 text-[8px] bg-blue-50 font-semibold text-orange-600 text-center cursor-help">{n.substring(0, 3)}</div>
                              </Tooltip>
                            ))}
                            <div className="w-12 border-r border-blue-100 px-1.5 py-1 text-[10px] bg-blue-50 font-semibold text-blue-700 text-center">M³</div>
                            <div className="w-8 px-1 py-1 text-[10px] bg-blue-50 font-semibold text-blue-700 text-center">🧪</div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Day rows */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dt = new Date(selectedAnio, selectedMes - 1, d);
                    const dow = dt.getDay();
                    const we = dow === 0 || dow === 6;
                    const isT = isCurrentMonth && today.getDate() === d;

                    return (
                      <tr key={d} className={`${we ? 'bg-gray-50/50' : ''} ${isT ? 'bg-blue-50' : ''}`}>
                        <td className={`sticky left-0 z-10 border border-blue-100 px-2 py-1.5 text-xs whitespace-nowrap font-medium ${isT ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-600 bg-white'}`}>
                          {d} <span className="text-gray-400">{['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][dow]}</span>
                        </td>
                        {gridData.map((sec) => {
                          const k = `${sec.id}-${d}`;
                          const sols = solMap.get(k) ?? [];
                          const hrs = sols.reduce((s: number, r: any) => s + (r.horas ?? 0), 0);
                          const m3 = sols.reduce((s: number, r: any) => s + (r.m3_programados ?? 0), 0);
                          const has = sols.length > 0;
                          const isExp = expandedSector === sec.id;

                          const openQuickIrrigation = () => {
                            setQuickIrrigationData({
                              sectorId: sec.id,
                              sectorName: sec.name,
                              fecha: `${selectedAnio}-${String(selectedMes).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                              day: d,
                              existingHrs: hrs,
                              existingM3: m3,
                              hasFert: solDataHasFert(sols),
                            });
                            setShowQuickIrrigation(true);
                          };

                          return (
                            <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                              <div className="flex h-full">
                                {/* Hrs cell - click to open quick irrigation */}
                                <div className={`flex-1 border-r border-blue-100 px-1.5 py-1 text-center text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors ${has ? 'bg-blue-50' : ''} ${isT ? 'bg-blue-100' : ''}`}
                                  onClick={openQuickIrrigation}>
                                  {has ? hrs.toFixed(1) : ''}
                                </div>
                                {/* Fertilizer cells (expanded only) */}
                                {isExp && FK.map((fk) => {
                                  const val = has ? sols.reduce((s: number, r: any) => s + (r[fk] ?? 0), 0) : 0;
                                  return (
                                    <div key={fk} className="w-10 border-r border-blue-100 px-1 py-1 text-center text-[9px]">
                                      <span className={val > 0 ? 'text-orange-600 font-semibold' : 'text-gray-300'}>
                                        {val > 0 ? val.toFixed(0) : ''}
                                      </span>
                                    </div>
                                  );
                                })}
                                {/* M³ cell */}
                                <div className="w-12 border-r border-blue-100 px-1.5 py-1 text-center text-[10px] text-blue-600 font-semibold">
                                  {has && m3 > 0 ? m3.toFixed(0) : ''}
                                </div>
                                {/* Fertilizer button - always visible */}
                                <div className="w-8 px-1 py-1 flex items-center justify-center">
                                  <button
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all hover:scale-110"
                                    style={{
                                      backgroundColor: solDataHasFert(sols) ? '#fed7aa' : '#dbeafe',
                                      color: solDataHasFert(sols) ? '#c2410c' : '#1d4ed8',
                                      border: solDataHasFert(sols) ? '1px solid #fb923c' : '1px solid #93c5fd',
                                    }}
                                    title={solDataHasFert(sols) ? 'Ver/Editar fertilizantes' : 'Agregar fertilizantes'}
                                    onClick={() => {
                                      setFertilizerModalData({
                                        sectorId: sec.id,
                                        sectorName: sec.name,
                                        fecha: `${selectedAnio}-${String(selectedMes).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                                        day: d,
                                        existingHrs: hrs,
                                        existingM3: m3,
                                      });
                                      setShowFertilizerModal(true);
                                    }}
                                  >
                                    🧪
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* TOTAL row */}
                  <tr className="bg-blue-50 font-bold text-xs border-t-2 border-blue-200">
                    <td className="sticky left-0 z-10 bg-blue-50 border border-blue-100 px-2 py-2 text-blue-800">TOTAL</td>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      const tHr = sec.solicitudes?.reduce((s: number, r: any) => s + (r.horas ?? 0), 0) ?? 0;
                      const tM = sec.solicitudes?.reduce((s: number, r: any) => s + (r.m3_programados ?? 0), 0) ?? 0;
                      return (
                        <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                          <div className="flex h-full">
                            <div className="flex-1 border-r border-blue-100 px-1.5 py-2 text-center text-blue-800">{tHr > 0 ? tHr.toFixed(1) : ''}</div>
                            {isExp && FK.map((fk) => {
                              const val = sec.solicitudes?.reduce((s: number, r: any) => s + (r[fk] ?? 0), 0) ?? 0;
                              return (
                                <div key={fk} className="w-10 border-r border-blue-100 px-1 py-2 text-center text-[9px] font-bold">
                                  <span className={val > 0 ? 'text-orange-600' : 'text-gray-300'}>{val > 0 ? val.toFixed(0) : ''}</span>
                                </div>
                              );
                            })}
                            <div className="w-12 border-r border-blue-100 px-1.5 py-2 text-center text-blue-700">{tM > 0 ? tM.toFixed(0) : ''}</div>
                            <div className="w-8 px-1 py-2 text-center"></div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* MÁX MES row */}
                  <tr className="bg-amber-50 text-xs">
                    <td className="sticky left-0 z-10 bg-amber-50 border border-blue-100 px-2 py-1 font-medium text-amber-700">MÁX MES</td>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      return (
                        <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                          <div className="flex h-full">
                            <div className="flex-1 border-r border-blue-100 px-1.5 py-1"></div>
                            {isExp && FK.map((fk, fi) => {
                              const entry = findFertInList(sec.receta_mes, FN[fi]);
                              const val = entry ? (entry.kilos_plan ?? 0) : 0;
                              return (
                                <div key={fk} className="w-10 border-r border-blue-100 px-1 py-1 text-center text-[9px] font-bold text-amber-700">
                                  {val > 0 ? val.toFixed(1) : ''}
                                </div>
                              );
                            })}
                            <div className="w-12 border-r border-blue-100 px-1.5 py-1"></div>
                            <div className="w-8 px-1 py-1"></div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* MÁX TEMP row */}
                  <tr className="bg-orange-50 text-xs">
                    <td className="sticky left-0 z-10 bg-orange-50 border border-blue-100 px-2 py-1 font-medium text-orange-700">MÁX TEMP</td>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      return (
                        <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                          <div className="flex h-full">
                            <div className="flex-1 border-r border-blue-100 px-1.5 py-1"></div>
                            {isExp && FK.map((fk, fi) => {
                              const entry = findFertInList(sec.receta_temporada, FN[fi]);
                              const val = entry ? (entry.kilos_total ?? 0) : 0;
                              return (
                                <div key={fk} className="w-10 border-r border-blue-100 px-1 py-1 text-center text-[9px] font-bold text-orange-700">
                                  {val > 0 ? val.toFixed(0) : ''}
                                </div>
                              );
                            })}
                            <div className="w-12 border-r border-blue-100 px-1.5 py-1"></div>
                            <div className="w-8 px-1 py-1"></div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* SALDO row */}
                  <tr className="bg-blue-50 text-xs">
                    <td className="sticky left-0 z-10 bg-blue-50 border border-blue-100 px-2 py-1 font-medium text-blue-700">SALDO</td>
                    {gridData.map((sec) => {
                      const isExp = expandedSector === sec.id;
                      return (
                        <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                          <div className="flex h-full">
                            <div className="flex-1 border-r border-blue-100 px-1.5 py-1"></div>
                            {isExp && FK.map((fk, fi) => {
                              const entry = findFertInList(sec.saldo_temporada, FN[fi]);
                              const saldo = entry ? (entry.saldo ?? 0) : 0;
                              const maxEntry = findFertInList(sec.receta_temporada, FN[fi]);
                              const max = maxEntry ? (maxEntry.kilos_total ?? 0) : 0;
                              const cls = max === 0 ? 'text-gray-300' : (saldo < 0 ? 'text-red-600' : (saldo < max * 0.2 ? 'text-amber-600' : 'text-green-600'));
                              return (
                                <div key={fk} className={`w-10 border-r border-blue-100 px-1 py-1 text-center text-[9px] font-bold ${cls}`}>
                                  {max > 0 ? saldo.toFixed(0) : ''}
                                </div>
                              );
                            })}
                            <div className="w-12 border-r border-blue-100 px-1.5 py-1"></div>
                            <div className="w-8 px-1 py-1"></div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Nutrient unit rows: U.N, U.P₂O₅, U.K₂O */}
                  {([['U.N', 'N'], ['U.P₂O₅', 'P2O5'], ['U.K₂O', 'K2O']] as const).map(([label, key]) => (
                    <tr key={label} className="bg-purple-50 text-xs">
                      <td className="sticky left-0 z-10 bg-purple-50 border border-blue-100 px-2 py-1 font-medium text-purple-700">{label}</td>
                      {gridData.map((sec) => {
                        const isExp = expandedSector === sec.id;
                        return (
                          <td key={sec.id} colSpan={getCols(sec)} className="border border-blue-100 p-0">
                            <div className="flex h-full">
                              <div className="flex-1 border-r border-blue-100 px-1.5 py-1"></div>
                              {isExp && FK.map((fk, fi) => {
                                const fertName = FN[fi];
                                const fertDef = fertilizantes.find((f: any) => f.name === fertName);
                                const coeff = fertDef ? ((fertDef as any)[key] ?? 0) : 0;
                                const totalApplied = sec.solicitudes?.reduce((s: number, r: any) => s + (r[fk] ?? 0), 0) ?? 0;
                                const units = totalApplied * coeff;
                                return (
                                  <div key={fk} className="w-10 border-r border-blue-100 px-1 py-1 text-center text-[9px] font-medium text-purple-700">
                                    {units > 0 ? units.toFixed(1) : ''}
                                  </div>
                                );
                              })}
                              <div className="w-12 border-r border-blue-100 px-1.5 py-1"></div>
                              <div className="w-8 px-1 py-1"></div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fertilizer Modal */}
      {showFertModal && fertModalData && (
        <FertModal
          sectorName={fertModalData.sectorName}
          fecha={fertModalData.fecha}
          sols={fertModalData.sols}
          fertilizantes={fertilizantes}
          onClose={() => { setShowFertModal(false); setFertModalData(null); }}
        />
      )}

      {/* Quick Irrigation Modal */}
      {showQuickIrrigation && quickIrrigationData && (
        <QuickIrrigationModal
          sectorId={quickIrrigationData.sectorId}
          sectorName={quickIrrigationData.sectorName}
          fecha={quickIrrigationData.fecha}
          day={quickIrrigationData.day}
          existingHrs={quickIrrigationData.existingHrs}
          existingM3={quickIrrigationData.existingM3}
          hasFert={quickIrrigationData.hasFert}
          onClose={() => { setShowQuickIrrigation(false); setQuickIrrigationData(null); }}
          onSaved={() => {
            // Refresh grid data
            gridCache.current.delete(`${selectedEquipo}-${selectedMes}-${selectedAnio}`);
            const loadRefresh = async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const data = await api<any[]>(`/api/grid?id_equipo=${selectedEquipo}&mes=${selectedMes}&anio=${selectedAnio}`, { token });
                gridCache.current.set(`${selectedEquipo}-${selectedMes}-${selectedAnio}`, data);
                setGridData(data);
                computeStats(data);
              } catch (e) {
                console.error('Error refreshing:', e);
              }
            };
            loadRefresh();
          }}
          onToast={onToast}
        />
      )}

      {/* Fertilizer Modal - for adding fertilizers */}
      {showFertilizerModal && fertilizerModalData && (
        <FertilizerModal
          sectorId={fertilizerModalData.sectorId}
          sectorName={fertilizerModalData.sectorName}
          fecha={fertilizerModalData.fecha}
          day={fertilizerModalData.day}
          existingHrs={fertilizerModalData.existingHrs}
          existingM3={fertilizerModalData.existingM3}
          onClose={() => { setShowFertilizerModal(false); setFertilizerModalData(null); }}
          onSaved={() => {
            // Refresh grid data
            gridCache.current.delete(`${selectedEquipo}-${selectedMes}-${selectedAnio}`);
            const loadRefresh = async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const data = await api<any[]>(`/api/grid?id_equipo=${selectedEquipo}&mes=${selectedMes}&anio=${selectedAnio}`, { token });
                gridCache.current.set(`${selectedEquipo}-${selectedMes}-${selectedAnio}`, data);
                setGridData(data);
                computeStats(data);
              } catch (e) {
                console.error('Error refreshing:', e);
              }
            };
            loadRefresh();
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
