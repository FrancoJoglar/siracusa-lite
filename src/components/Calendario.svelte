/**
 * Calendario.svelte — Calendar grid view.
 * Faithful port of public/js/calendario.js to Svelte 5 runes.
 */
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api, isAbortError, FK, FN, DOW, SEC_COLORS, type Equipo, type Sector, type Fertilizante } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    equipos: Equipo[];
    sectores: Sector[];
    fertilizantes: Fertilizante[];
    token?: string;
    onToast: (msg: string) => void;
    onOpenFert: (solId: number) => void;
    navigateTo: (view: string) => void;
  }

  let { equipos, sectores, fertilizantes, onToast, onOpenFert, navigateTo }: Props = $props();

  const COLS_COLLAPSED = 3;
  const COLS_EXPANDED = 11;

  let selectedEquipo = $state('');
  const now = new Date();
  let selectedMes = $state(now.getMonth() + 1);
  let selectedAnio = $state(now.getFullYear());

  let gridData: any[] = $state([]);
  let expandedSector: number | null = $state(null);
  let loading = $state(false);
  let emptyMsg = $state('📅 Elegí un equipo');
  let abortCtrl: AbortController | null = null;

  // Stats
  let statDias = $state(0);
  let statHrs = $state(0);
  let statM3 = $state(0);
  let showStats = $state(false);

  // ─── Sol map for quick lookups ───
  interface SolEntry {
    sectorId: number;
    day: number;
    sols: any[];
  }

  function buildSolMap(data: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const sec of data) {
      for (const s of sec.solicitudes ?? []) {
        const d = parseInt(s.fecha_riego.split('-')[2], 10);
        const k = `${sec.id}-${d}`;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(s);
      }
    }
    return map;
  }

  function computeStats(data: any[]) {
    const solMap = buildSolMap(data);
    let tH = 0, tM3 = 0;
    for (const sec of data) {
      for (const s of sec.solicitudes ?? []) {
        tH += s.horas ?? 0;
        tM3 += s.m3_programados ?? 0;
      }
    }
    statDias = new Set([...solMap.keys()].map(k => k.split('-')[1])).size;
    statHrs = tH;
    statM3 = tM3;
    showStats = data.length > 0;
  }

  // ─── Load calendar data ───
  async function loadCalendar() {
    if (abortCtrl) abortCtrl.abort();
    if (!selectedEquipo) {
      gridData = [];
      showStats = false;
      emptyMsg = '📅 Elegí un equipo';
      return;
    }
    loading = true;
    emptyMsg = 'Cargando calendario…';
    gridData = [];
    abortCtrl = new AbortController();
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const data = await api<any[]>(`/api/grid?id_equipo=${selectedEquipo}&mes=${selectedMes}&anio=${selectedAnio}`, {
        signal: abortCtrl.signal,
        token,
      });
      gridData = data;
      expandedSector = null;
      if (!data.length) {
        emptyMsg = 'Sin sectores';
      } else {
        computeStats(data);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      emptyMsg = 'No se pudo cargar el calendario';
      onToast('❌ Error al cargar calendario');
    } finally {
      loading = false;
    }
  }

  function toggleSector(secId: number) {
    expandedSector = expandedSector === secId ? null : secId;
  }

  function getCols(sec: any): number {
    return expandedSector === sec.id ? COLS_EXPANDED : COLS_COLLAPSED;
  }

  function findFertInList(list: any[] | undefined, fertName: string) {
    if (!Array.isArray(list)) return null;
    return list.find((x: any) => x.fert_name === fertName) || null;
  }

  function solDataHasFert(sols: any[]): boolean {
    return sols.some((s: any) => FK.some((k) => (s[k] ?? 0) > 0));
  }

  function escH(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Cell click handlers ───
  function viewS(fecha: string, secId: number) {
    // Navigate to solicitudes view with context — for now just show a toast
    navigateTo('solicitudes');
  }

  function openAdd(fecha: string, secId: number, secName: string) {
    // Would open a quick-add modal — simplified for now
    navigateTo('solicitudes');
  }

  function openFertModal(fecha: string, sectorId: number) {
    // Find the solicitud for this date+sector
    const solMap = buildSolMap(gridData);
    const k = `${sectorId}-${parseInt(fecha.split('-')[2], 10)}`;
    const sols = solMap.get(k) ?? [];
    if (sols.length > 0) {
      onOpenFert(sols[0].id);
    }
  }

  // Auto-load when selections change
  $effect(() => {
    selectedEquipo;
    selectedMes;
    selectedAnio;
    loadCalendar();
  });

  // Compute day rows
  const daysInMonth = $derived(new Date(selectedAnio, selectedMes, 0).getDate());
  const today = new Date();
  const isCurrentMonth = $derived(today.getMonth() + 1 === selectedMes && today.getFullYear() === selectedAnio);
</script>

<div class="flex flex-wrap items-end gap-4 mb-4">
  <div>
    <label class="block text-xs font-medium text-gray-500 mb-1">Equipo</label>
    <select bind:value={selectedEquipo} class="border rounded-lg px-3 py-2 text-sm font-medium">
      <option value="">Seleccionar equipo...</option>
      {#each equipos as eq}
        <option value={eq.id}>{eq.name}</option>
      {/each}
    </select>
  </div>
  <div>
    <label class="block text-xs font-medium text-gray-500 mb-1">Mes</label>
    <select bind:value={selectedMes} class="border rounded-lg px-3 py-2 text-sm">
      {#each Array.from({length: 12}, (_, i) => i + 1) as m}
        <option value={m}>{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m-1]}</option>
      {/each}
    </select>
  </div>
  <div>
    <label class="block text-xs font-medium text-gray-500 mb-1">Año</label>
    <select bind:value={selectedAnio} class="border rounded-lg px-3 py-2 text-sm">
      <option value={2025}>2025</option>
      <option value={2026}>2026</option>
      <option value={2027}>2027</option>
    </select>
  </div>
</div>

{#if showStats}
  <div class="flex flex-wrap gap-3 mb-4">
    <span class="bg-white border rounded-lg px-3 py-1 text-sm">📅 <strong>{statDias}</strong> días</span>
    <span class="bg-white border rounded-lg px-3 py-1 text-sm">⏱ <strong>{statHrs.toFixed(1)}</strong> hrs</span>
    <span class="bg-white border rounded-lg px-3 py-1 text-sm">💧 <strong>{statM3.toFixed(0)}</strong> m³</span>
  </div>
{/if}

<div class="bg-white rounded-xl shadow-sm border overflow-hidden">
  {#if !selectedEquipo || gridData.length === 0}
    <div class="text-center py-12 text-gray-400">
      <p class="text-lg">{emptyMsg}</p>
    </div>
  {:else}
    <div class="cal-scroll overflow-x-auto">
      <table class="border-collapse text-xs" id="cal-table">
        <!-- Header 1: Sector names -->
        <thead>
          <tr>
            <th class="sticky left-0 z-10 bg-gray-100 border px-2 py-1 text-left text-xs" style="min-width:55px"></th>
            {#each gridData as sec, si (sec.id)}
              {@const isExp = expandedSector === sec.id}
              {@const arrow = isExp ? '▾' : '▸'}
              {@const bg = isExp ? SEC_COLORS[si % 8] + 'dd' : SEC_COLORS[si % 8]}
              {@const recetaNombre = sec.receta?.nombre ?? null}
              <th
                colspan={getCols(sec)}
                class="border px-1 py-0.5 text-center text-xs font-bold text-white py-1.5 cursor-pointer hover:opacity-90 select-none"
                style="background:{bg}"
                onclick={() => toggleSector(sec.id)}
              >
                {#if recetaNombre}
                  {escH(`${arrow} ${sec.name} | ${recetaNombre} | ${sec.variedad ?? ''} ${sec.has_hectareas ?? 0}ha`)}
                {:else}
                  {escH(`${arrow} ${sec.name} | ⚠️ Sin receta | ${sec.variedad ?? ''} ${sec.has_hectareas ?? 0}ha`)}
                {/if}
              </th>
            {/each}
          </tr>

          <!-- Header 2: Column labels -->
          <tr>
            <th class="sticky left-0 z-10 bg-gray-100 border px-2 py-1 text-xs text-gray-500">Día</th>
            {#each gridData as sec (sec.id)}
              {@const isExp = expandedSector === sec.id}
              <th class="border px-1 py-0.5 text-[10px] bg-gray-50 font-medium">Hrs</th>
              {#if isExp}
                {#each FN as n}
                  <th class="border px-1 py-0.5 text-[8px] bg-gray-50 font-medium text-orange-700" title={n}>{n.substring(0, 3)}</th>
                {/each}
              {/if}
              <th class="border px-1 py-0.5 text-[10px] bg-gray-50 font-medium">M³</th>
              <th class="border px-1 py-0.5 text-[10px] bg-gray-50 font-medium w-8">🧪</th>
            {/each}
          </tr>
        </thead>

        <tbody>
          {#each Array.from({length: daysInMonth}, (_, i) => i + 1) as d}
            {@const dt = new Date(selectedAnio, selectedMes - 1, d)}
            {@const dow = dt.getDay()}
            {@const we = dow === 0 || dow === 6}
            {@const isT = isCurrentMonth && today.getDate() === d}
            {@const fechas = `${selectedAnio}-${String(selectedMes).padStart(2, '0')}-${String(d).padStart(2, '0')}`}
            <tr class={we ? 'bg-gray-50/70' : ''}>
              <td class="sticky left-0 z-10 bg-{we ? 'gray-50' : 'white'} border px-2 py-0.5 text-xs whitespace-nowrap {isT ? 'text-blue-600 font-bold' : 'text-gray-600'}">
                {d} {DOW[dow]}
              </td>
              {#each gridData as sec, si (sec.id)}
                {@const k = `${sec.id}-${d}`}
                {@const sols = buildSolMap(gridData).get(k) ?? []}
                {@const hrs = sols.reduce((s, r) => s + (r.horas ?? 0), 0)}
                {@const m3 = sols.reduce((s, r) => s + (r.m3_programados ?? 0), 0)}
                {@const has = sols.length > 0}
                {@const isExp = expandedSector === sec.id}

                {#if has}
                  <td class="border px-1 py-0.5 text-center text-xs font-semibold cell-click {isT ? 'cell-today' : ''}" onclick={() => viewS(fechas, sec.id)}>
                    {hrs.toFixed(1)}
                  </td>
                  {#if isExp}
                    {#each FK as fk}
                      {@const val = sols.reduce((s, r) => s + (r[fk] ?? 0), 0)}
                      <td class="border px-1 py-0.5 text-center text-[9px] {val > 0 ? 'text-orange-700 font-medium' : 'text-gray-300'}">
                        {val > 0 ? val.toFixed(0) : ''}
                      </td>
                    {/each}
                  {/if}
                  <td class="border px-1 py-0.5 text-center text-[10px] text-blue-600 font-medium">
                    {m3 > 0 ? m3.toFixed(0) : ''}
                  </td>
                  <td class="border px-1 py-0.5 text-center cursor-pointer hover:bg-green-50" onclick={() => openFertModal(fechas, sec.id)}>
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 text-xs relative">
                      🧪
                      <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full {solDataHasFert(sols) ? 'bg-orange-500' : 'bg-gray-300'}"></span>
                    </span>
                  </td>
                {:else}
                  {@const cols = isExp ? COLS_EXPANDED : COLS_COLLAPSED}
                  <td colspan={cols} class="border px-1 py-0.5 text-center cell-click {isT ? 'cell-today' : ''} hover:bg-blue-50" style="min-width:60px" onclick={() => openAdd(fechas, sec.id, sec.name)}></td>
                {/if}
              {/each}
            </tr>
          {/each}

          <!-- TOTAL row -->
          <tr class="bg-gray-100 font-bold text-xs">
            <td class="sticky left-0 z-10 bg-gray-100 border px-2 py-1">TOTAL</td>
            {#each gridData as sec (sec.id)}
              {@const isExp = expandedSector === sec.id}
              {@const tHr = sec.solicitudes?.reduce((s, r) => s + (r.horas ?? 0), 0) ?? 0}
              {@const tM = sec.solicitudes?.reduce((s, r) => s + (r.m3_programados ?? 0), 0) ?? 0}
              <td class="border px-1 py-0.5 text-center">{tHr > 0 ? tHr.toFixed(1) : ''}</td>
              {#if isExp}
                {#each FK as fk}
                  {@const val = sec.solicitudes?.reduce((s, r) => s + (r[fk] ?? 0), 0) ?? 0}
                  <td class="border px-1 py-0.5 text-center text-[9px] font-bold {val > 0 ? 'text-orange-700' : 'text-gray-300'}">
                    {val > 0 ? val.toFixed(0) : ''}
                  </td>
                {/each}
              {/if}
              <td class="border px-1 py-0.5 text-center text-blue-600">{tM > 0 ? tM.toFixed(0) : ''}</td>
              <td class="border px-1 py-0.5 text-center"></td>
            {/each}
          </tr>

          <!-- MÁX MES row -->
          <tr class="bg-amber-50 text-xs">
            <td class="sticky left-0 z-10 bg-amber-50 border px-2 py-1 font-medium text-amber-700">MÁX MES</td>
            {#each gridData as sec (sec.id)}
              {@const isExp = expandedSector === sec.id}
              <td class="border px-1 py-0.5 text-center"></td>
              {#if isExp}
                {#each FK as fk, fi}
                  {@const entry = findFertInList(sec.receta_mes, FN[fi])}
                  {@const val = entry ? (entry.kilos_plan ?? 0) : 0}
                  <td class="border px-1 py-0.5 text-center text-[9px] font-bold text-amber-700">
                    {val > 0 ? val.toFixed(1) : ''}
                  </td>
                {/each}
              {/if}
              <td class="border px-1 py-0.5 text-center"></td>
              <td class="border px-1 py-0.5 text-center"></td>
            {/each}
          </tr>

          <!-- MÁX TEMP row -->
          <tr class="bg-orange-50 text-xs">
            <td class="sticky left-0 z-10 bg-orange-50 border px-2 py-1 font-medium text-orange-700">MÁX TEMP</td>
            {#each gridData as sec (sec.id)}
              {@const isExp = expandedSector === sec.id}
              <td class="border px-1 py-0.5 text-center"></td>
              {#if isExp}
                {#each FK as fk, fi}
                  {@const entry = findFertInList(sec.receta_temporada, FN[fi])}
                  {@const val = entry ? (entry.kilos_total ?? 0) : 0}
                  <td class="border px-1 py-0.5 text-center text-[9px] font-bold text-orange-700">
                    {val > 0 ? val.toFixed(0) : ''}
                  </td>
                {/each}
              {/if}
              <td class="border px-1 py-0.5 text-center"></td>
              <td class="border px-1 py-0.5 text-center"></td>
            {/each}
          </tr>

          <!-- SALDO row -->
          <tr class="bg-blue-50 text-xs">
            <td class="sticky left-0 z-10 bg-blue-50 border px-2 py-1 font-medium text-blue-700">SALDO</td>
            {#each gridData as sec (sec.id)}
              {@const isExp = expandedSector === sec.id}
              <td class="border px-1 py-0.5 text-center"></td>
              {#if isExp}
                {#each FK as fk, fi}
                  {@const entry = findFertInList(sec.saldo_temporada, FN[fi])}
                  {@const saldo = entry ? (entry.saldo ?? 0) : 0}
                  {@const maxEntry = findFertInList(sec.receta_temporada, FN[fi])}
                  {@const max = maxEntry ? (maxEntry.kilos_total ?? 0) : 0}
                  {@const cls = max === 0 ? 'text-gray-300' : (saldo < 0 ? 'saldo-over' : (saldo < max * 0.2 ? 'saldo-warn' : 'saldo-ok'))}
                  <td class="border px-1 py-0.5 text-center text-[9px] font-bold {cls}">
                    {max > 0 ? saldo.toFixed(0) : ''}
                  </td>
                {/each}
              {/if}
              <td class="border px-1 py-0.5 text-center"></td>
              <td class="border px-1 py-0.5 text-center"></td>
            {/each}
          </tr>

          <!-- Nutrient unit rows: U.N, U.P₂O₅, U.K₂O -->
          {#each [['U.N', 'N'], ['U.P₂O₅', 'P2O5'], ['U.K₂O', 'K2O']] as [label, key]}
            <tr class="bg-purple-50 text-xs">
              <td class="sticky left-0 z-10 bg-purple-50 border px-2 py-1 font-medium text-purple-700">{label}</td>
              {#each gridData as sec (sec.id)}
                {@const isExp = expandedSector === sec.id}
                <td class="border px-1 py-0.5 text-center"></td>
                {#if isExp}
                  {#each FK as fk, fi}
                    {@const fertName = FN[fi]}
                    {@const fertDef = fertilizantes.find(f => f.name === fertName)}
                    {@const coeff = fertDef ? ((fertDef as any)[key] ?? 0) : 0}
                    {@const totalApplied = sec.solicitudes?.reduce((s, r) => s + (r[fk] ?? 0), 0) ?? 0}
                    {@const units = totalApplied * coeff}
                    <td class="border px-1 py-0.5 text-center text-[9px] font-medium text-purple-700">
                      {units > 0 ? units.toFixed(1) : ''}
                    </td>
                  {/each}
                {/if}
                <td class="border px-1 py-0.5 text-center"></td>
                <td class="border px-1 py-0.5 text-center"></td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
