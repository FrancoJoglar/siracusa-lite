/**
 * ModalFertilizantes.svelte — Fullscreen fertilizer editor modal.
 * Port of public/js/fertModal.js.
 */
<script lang="ts">
  import { onMount } from 'svelte';
  import { api, FK, FN } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    solId: number;
    onToast: (msg: string) => void;
    onClose: () => void;
  }

  let { solId, onToast, onClose }: Props = $props();

  let headerHtml = $state('');
  let rows: { name: string; index: number; value: number; max: number; used: number; remaining: number }[] = $state([]);
  let totalKg = $state(0);
  let loading = $state(true);
  let solData: any = null;
  let secData: any = null;

  onMount(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      // Fetch solicitud details
      solData = await api<any>(`/api/solicitudes?id=${solId}&action=fertilizantes&_search=true`, { token });
      if (!solData) {
        onToast('No se encontró la solicitud');
        onClose();
        return;
      }

      // Fetch sector info
      const fecha = solData.fecha_riego;
      const sectorId = solData.id_sector;
      const d = new Date(fecha + 'T12:00:00');

      // Get assignment data for receta info
      const [otherSols, asigData] = await Promise.all([
        api<any[]>(`/api/solicitudes?fecha_desde=${fecha.substring(0, 7)}-01&fecha_hasta=${fecha}&id_sector=${sectorId}`, { token }),
        api<any[]>(`/api/recetas?view=asignaciones&id_equipo=${solData.id_equipo ?? 0}`, { token }).catch(() => []),
      ]);

      // Build receta map
      let recetaMap: Record<string, { max: number }> = {};
      let recetaNombre: string | null = null;
      const asig = (Array.isArray(asigData) ? asigData : []).find((a: any) => a.sector_id === sectorId);
      if (asig?.receta_id) {
        recetaNombre = asig.receta_nombre;
        try {
          const detalles = await api<any[]>(`/api/recetas?view=detalle&id_receta=${asig.receta_id}`, { token });
          const seasonMap: Record<string, number> = {};
          for (const det of detalles ?? []) {
            seasonMap[det.fert_name] = (seasonMap[det.fert_name] ?? 0) + (det.kilos_plan ?? 0);
          }
          for (const fn of Object.keys(seasonMap)) {
            recetaMap[fn] = { max: seasonMap[fn] };
          }
        } catch { /* ignore */ }
      }

      // Calculate used amounts (excluding current solicitud)
      const used: Record<string, number> = {};
      FN.forEach(n => used[n] = 0);
      for (const s of (Array.isArray(otherSols) ? otherSols : [])) {
        if (s.id === solId) continue;
        FN.forEach((n, i) => { used[n] += s[FK[i]] ?? 0; });
      }

      // Build rows
      rows = FN.map((n, i) => {
        const rec = recetaMap[n];
        const max = rec?.max ?? 0;
        const alreadyUsed = used[n];
        const currentVal = solData[FK[i]] ?? 0;
        const afterUse = alreadyUsed + currentVal;
        const remaining = max - afterUse;
        return { name: n, index: i, value: currentVal, max, used: alreadyUsed, remaining };
      });

      // Build header
      const recetaInfo = recetaNombre
        ? `<span class="text-green-600">📋 ${recetaNombre}</span>`
        : '<span class="text-amber-600">⚠️ Sin receta</span>';

      headerHtml = `
        <div class="flex items-center gap-3">
          <button class="text-gray-400 hover:text-gray-600 text-xl" onclick="document.dispatchEvent(new CustomEvent('closeFertModal'))">← Volver</button>
          <div>
            <h2 class="text-lg font-bold">🧪 Fertilizantes</h2>
            <p class="text-sm text-gray-500">${solData.fecha_riego} | ${solData.equipo_name ?? ''} — ${solData.sector_name ?? ''} | ${solData.variedad ?? ''} | ${solData.horas} hrs | ${(solData.m3_programados ?? 0).toFixed(0)} m³</p>
            <p class="text-xs mt-0.5">${recetaInfo}</p>
          </div>
        </div>`;

      updTotal();
    } catch (e) {
      onToast('❌ Error al cargar fertilizantes');
      onClose();
    } finally {
      loading = false;
    }
  });

  function updTotal() {
    totalKg = rows.reduce((s, r) => s + r.value, 0);
  }

  function onInput(idx: number, val: string) {
    let v = parseFloat(val) || 0;
    if (v > 999) { v = 999; onToast('⚠️ Máximo 999 kg por fertilizante'); }
    if (v < 0) v = 0;
    rows[idx].value = v;
    updTotal();
  }

  function maxClass(max: number, remaining: number): string {
    if (max === 0) return 'text-gray-400';
    if (remaining < 0) return 'text-red-600 font-bold';
    if (remaining < max * 0.2) return 'text-amber-600';
    return 'text-green-600';
  }

  async function save() {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const data: Record<string, number> = {};
      rows.forEach(r => { data[FK[r.index]] = r.value; });
      await api(`/api/solicitudes?id=${solId}&action=fertilizantes`, { method: 'PUT', body: data, token });
      onToast('✅ Fertilizantes guardados');
      onClose();
    } catch {
      onToast('❌ Error al guardar');
    }
  }

  // Listen for close event from header back button
  onMount(() => {
    const handler = () => onClose();
    document.addEventListener('closeFertModal', handler);
    return () => document.removeEventListener('closeFertModal', handler);
  });
</script>

<div class="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
  <div class="bg-white border-b px-6 py-4 sticky top-0 z-10">
    {@html headerHtml}
  </div>
  <div class="max-w-2xl mx-auto p-6">
    {#if loading}
      <div class="text-center py-12 text-gray-400">Cargando...</div>
    {:else}
      <div class="mb-4 flex items-center justify-between">
        <h3 class="font-semibold text-gray-700">Kilos por fertilizante</h3>
        <span class="text-sm font-bold text-green-700">
          {totalKg > 0 ? `${totalKg.toFixed(1)} kg total` : 'Sin fertilizantes'}
        </span>
      </div>

      <div class="space-y-2 mb-6">
        {#each rows as row, i}
          {@const bgClass = row.value > 0 ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}
          <div class="flex items-center gap-3 p-3 bg-white rounded-lg border {bgClass}">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">{row.name}</div>
              <div class="text-[10px] text-gray-400">
                {row.max > 0
                  ? `Temporada: ${row.max.toFixed(0)} kg | Usado: ${row.used.toFixed(0)} kg`
                  : 'Sin receta'}
              </div>
            </div>
            <div class="w-28 text-center">
              <input
                type="number" step="1" min="0" max="999"
                value={row.value}
                oninput={(e) => onInput(i, (e.target as HTMLInputElement).value)}
                class="w-full border rounded-lg px-2 py-1.5 text-sm text-center font-semibold focus:ring-2 focus:ring-green-500"
              />
              {#if row.max > 0}
                <div class="text-[10px] mt-0.5 {maxClass(row.max, row.remaining)}">
                  {row.remaining >= 0
                    ? `Queda: ${row.remaining.toFixed(0)} kg`
                    : `⚠️ Excedido: ${Math.abs(row.remaining).toFixed(0)} kg`}
                </div>
              {/if}
            </div>
            <div class="w-16 text-right text-sm font-bold {row.value > 0 ? 'text-green-700' : 'text-gray-300'}">
              {row.value > 0 ? `${row.value}kg` : ''}
            </div>
          </div>
        {/each}
      </div>

      <div class="flex gap-2 justify-end sticky bottom-0 bg-gray-100 py-4">
        <button onclick={onClose} class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
        <button onclick={save} class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">💾 Guardar Fertilizantes</button>
      </div>
    {/if}
  </div>
</div>
