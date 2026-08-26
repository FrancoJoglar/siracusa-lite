/**
 * Database.svelte — Database table with filters.
 * Port of public/js/database.js.
 */
<script lang="ts">
  import { api, FK, type Equipo } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    equipos: Equipo[];
    onToast: (msg: string) => void;
  }

  let { equipos, onToast }: Props = $props();

  let desde = $state('');
  let hasta = $state('');
  let equipoFilter = $state('');
  let rows: any[] = $state([]);
  let showStats = $state(false);
  let stN = $state(0);
  let stH = $state(0);
  let stM = $state(0);
  let stF = $state(0);

  async function loadDatabase() {
    const params = new URLSearchParams();
    if (desde) params.set('fecha_desde', desde);
    if (hasta) params.set('fecha_hasta', hasta);
    if (equipoFilter) params.set('id_equipo', equipoFilter);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const data = await api<any[]>('/api/solicitudes?' + params.toString(), { token });
    rows = data;
    if (!data.length) {
      showStats = false;
      return;
    }
    showStats = true;
    stN = data.length;
    stH = data.reduce((s, r) => s + (r.horas ?? 0), 0);
    stM = data.reduce((s, r) => s + (r.m3_programados ?? 0), 0);
    stF = data.reduce((s, r) => s + FK.reduce((a, k) => a + (r[k] ?? 0), 0), 0);
  }

  function clearFilters() {
    desde = '';
    hasta = '';
    equipoFilter = '';
    loadDatabase();
  }

  async function deleteRow(id: number) {
    if (!confirm('¿Eliminar?')) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await api(`/api/solicitudes?id=${id}`, { method: 'DELETE', token });
    onToast('✅ Eliminado');
    await loadDatabase();
  }
</script>

<h1 class="text-2xl font-bold text-gray-800 mb-6">📊 Base de Datos</h1>

<div class="bg-white rounded-xl shadow-sm p-4 border mb-4">
  <div class="flex flex-wrap gap-3 items-end">
    <div>
      <label class="block text-xs text-gray-500 mb-1">Desde</label>
      <input type="date" bind:value={desde} class="border rounded-lg px-3 py-1.5 text-sm" />
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1">Hasta</label>
      <input type="date" bind:value={hasta} class="border rounded-lg px-3 py-1.5 text-sm" />
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1">Equipo</label>
      <select bind:value={equipoFilter} class="border rounded-lg px-3 py-1.5 text-sm">
        <option value="">Todos</option>
        {#each equipos as eq}
          <option value={eq.id}>{eq.name}</option>
        {/each}
      </select>
    </div>
    <button onclick={loadDatabase} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm">🔍 Filtrar</button>
    <button onclick={clearFilters} class="text-gray-500 hover:text-gray-700 px-3 py-1.5 text-sm">Limpiar</button>
  </div>
</div>

{#if showStats}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
    <div class="bg-white rounded-lg p-3 border text-center"><div class="text-2xl font-bold text-blue-600">{stN}</div><div class="text-xs text-gray-500">Solicitudes</div></div>
    <div class="bg-white rounded-lg p-3 border text-center"><div class="text-2xl font-bold text-green-600">{stH.toFixed(1)}</div><div class="text-xs text-gray-500">Horas</div></div>
    <div class="bg-white rounded-lg p-3 border text-center"><div class="text-2xl font-bold text-purple-600">{stM.toFixed(0)}</div><div class="text-xs text-gray-500">M³</div></div>
    <div class="bg-white rounded-lg p-3 border text-center"><div class="text-2xl font-bold text-orange-600">{stF.toFixed(0)}</div><div class="text-xs text-gray-500">Fert kg</div></div>
  </div>
{/if}

<div class="bg-white rounded-xl shadow-sm border overflow-x-auto">
  <table class="w-full text-sm">
    <thead class="bg-gray-50 text-gray-600">
      <tr>
        <th class="px-3 py-2 text-left">Fecha</th>
        <th class="px-3 py-2 text-left">Equipo</th>
        <th class="px-3 py-2 text-left">Sector</th>
        <th class="px-3 py-2 text-right">Hrs</th>
        <th class="px-3 py-2 text-right">M³</th>
        <th class="px-3 py-2 text-right">S.Zn</th>
        <th class="px-3 py-2 text-right">N.Amo</th>
        <th class="px-3 py-2 text-right">N.Ca</th>
        <th class="px-3 py-2 text-right">Cl.K</th>
        <th class="px-3 py-2 text-left">Solicitante</th>
        <th class="px-3 py-2 text-center"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#each rows as r}
        <tr class="hover:bg-gray-50">
          <td class="px-3 py-2 whitespace-nowrap">{r.fecha_riego}</td>
          <td class="px-3 py-2">{r.equipo_name}</td>
          <td class="px-3 py-2">{r.sector_name}</td>
          <td class="px-3 py-2 text-right font-semibold">{r.horas}</td>
          <td class="px-3 py-2 text-right text-blue-600">{(r.m3_programados ?? 0).toFixed(1)}</td>
          <td class="px-3 py-2 text-right text-xs">{r.fert_sulfato_zn ?? ''}</td>
          <td class="px-3 py-2 text-right text-xs">{r.fert_nitrato_amo ?? ''}</td>
          <td class="px-3 py-2 text-right text-xs">{r.fert_nitrato_ca ?? ''}</td>
          <td class="px-3 py-2 text-right text-xs">{r.fert_cloruro_k ?? ''}</td>
          <td class="px-3 py-2">{r.solicitante}</td>
          <td class="px-3 py-2 text-center">
            <button onclick={() => deleteRow(r.id)} class="text-red-400 hover:text-red-600">🗑</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if rows.length === 0}
    <div class="text-center py-8 text-gray-400">Sin resultados</div>
  {/if}
</div>
