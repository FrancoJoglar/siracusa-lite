/**
 * Recetas.svelte — Recipe catalog + new/edit recipe modal.
 * Port of public/js/recetas.js (catalog + edit portions).
 */
<script lang="ts">
  import { onMount } from 'svelte';
  import { api, FK, FN } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    onToast: (msg: string) => void;
  }

  let { onToast }: Props = $props();

  const SEASON_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4];
  const MONTH_LABELS: Record<number, string> = {
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  };
  const FERT_MAX = 999;

  let recetasList: any[] = $state([]);
  let showModal = $state(false);
  let editId: number | null = $state(null);
  let nombre = $state('');
  let tipo = $state('olivos');
  let temporada = $state('2026-2027');
  let descripcion = $state('');
  let currentMonth = $state(9);
  let monthData: Record<number, Record<string, number>> = $state({});
  let currentMonthInputs: number[] = $state(Array(8).fill(0));

  function monthIdx(m: number) { return SEASON_MONTHS.indexOf(m); }

  async function loadCatalog() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    recetasList = await api<any[]>('/api/recetas?view=catalog', { token });
  }

  onMount(loadCatalog);

  function esc(s: string) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function deleteReceta(id: number, nombreReceta: string) {
    if (!confirm(`¿Eliminar la receta "${nombreReceta}"?`)) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    await api(`/api/recetas?view=catalog&id=${id}`, { method: 'DELETE', token });
    onToast('✅ Receta eliminada');
    await loadCatalog();
  }

  function openNew() {
    editId = null;
    nombre = '';
    tipo = 'olivos';
    temporada = '2026-2027';
    descripcion = '';
    monthData = {};
    SEASON_MONTHS.forEach(m => {
      monthData[m] = {};
      FK.forEach((_, i) => monthData[m]['fert' + i] = 0);
    });
    currentMonth = 9;
    currentMonthInputs = Array(8).fill(0);
    showModal = true;
  }

  async function openEdit(id: number) {
    const rec = recetasList.find(r => r.id === id);
    if (!rec) return;
    editId = id;
    nombre = rec.nombre ?? '';
    tipo = rec.tipo_cultivo ?? 'olivos';
    temporada = rec.temporada ?? '2026-2027';
    descripcion = rec.descripcion ?? '';

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const detalles = await api<any[]>(`/api/recetas?view=detalle&id_receta=${id}`, { token });
    monthData = {};
    SEASON_MONTHS.forEach(m => {
      monthData[m] = {};
      FK.forEach((_, i) => monthData[m]['fert' + i] = 0);
    });
    for (const d of detalles ?? []) {
      const mi = monthIdx(d.mes);
      if (mi === -1) continue;
      const fertIdx = FK.indexOf(d.fert_key);
      if (fertIdx === -1) continue;
      monthData[d.mes]['fert' + fertIdx] = d.kilos_plan ?? 0;
    }
    currentMonth = 9;
    syncInputsFromMonthData();
    showModal = true;
  }

  function syncInputsFromMonthData() {
    const data = monthData[currentMonth] ?? {};
    currentMonthInputs = FK.map((_, i) => data['fert' + i] ?? 0);
  }

  function saveInputsToMonthData() {
    if (!monthData[currentMonth]) monthData[currentMonth] = {};
    FK.forEach((_, i) => { monthData[currentMonth]['fert' + i] = currentMonthInputs[i] ?? 0; });
  }

  function monthPrev() {
    saveInputsToMonthData();
    const idx = monthIdx(currentMonth);
    currentMonth = SEASON_MONTHS[(idx - 1 + SEASON_MONTHS.length) % SEASON_MONTHS.length];
    syncInputsFromMonthData();
  }

  function monthNext() {
    saveInputsToMonthData();
    const idx = monthIdx(currentMonth);
    currentMonth = SEASON_MONTHS[(idx + 1) % SEASON_MONTHS.length];
    syncInputsFromMonthData();
  }

  function monthTotal(): number {
    return currentMonthInputs.reduce((s, v) => s + v, 0);
  }

  async function saveReceta() {
    saveInputsToMonthData();
    if (!nombre.trim()) { onToast('⚠️ Ingresá un nombre para la receta'); return; }

    const detalles: any[] = [];
    SEASON_MONTHS.forEach(m => {
      const data = monthData[m] ?? {};
      FK.forEach((fk, fi) => {
        const kilos = data['fert' + fi] ?? 0;
        if (kilos > 0) {
          detalles.push({ mes: m, fert_key: fk, fert_name: FN[fi], kilos_plan: kilos });
        }
      });
    });

    const body = { nombre: nombre.trim(), tipo_cultivo: tipo, temporada: temporada.trim(), descripcion: descripcion.trim(), detalles };
    const token = (await supabase.auth.getSession()).data.session?.access_token;

    if (editId) {
      await api(`/api/recetas?view=catalog&id=${editId}`, { method: 'PUT', body, token });
      onToast('✅ Receta actualizada');
    } else {
      await api('/api/recetas?view=catalog', { method: 'POST', body, token });
      onToast('✅ Receta creada');
    }
    showModal = false;
    await loadCatalog();
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold text-gray-800">🧪 Recetas de Fertilización</h1>
  <button onclick={openNew} class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nueva Receta</button>
</div>

<div class="bg-white rounded-xl shadow-sm border overflow-hidden">
  <table class="w-full text-sm">
    <thead class="bg-gray-50 text-gray-600">
      <tr>
        <th class="px-4 py-3 text-left">Nombre</th>
        <th class="px-4 py-3 text-left">Tipo Cultivo</th>
        <th class="px-4 py-3 text-left">Temporada</th>
        <th class="px-4 py-3 text-left">Descripción</th>
        <th class="px-4 py-3 text-right">Acciones</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#if recetasList.length === 0}
        <tr><td colspan="5" class="text-center py-8 text-gray-400">No hay recetas creadas. Hacé click en "Nueva Receta".</td></tr>
      {:else}
        {#each recetasList as r}
          <tr class="border-b hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-800">{esc(r.nombre)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{esc(r.tipo_cultivo ?? '—')}</td>
            <td class="px-4 py-3 text-sm text-gray-600">{esc(r.temporada ?? '—')}</td>
            <td class="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{esc(r.descripcion ?? '')}</td>
            <td class="px-4 py-3 text-sm text-right space-x-2">
              <button onclick={() => openEdit(r.id)} class="text-blue-600 hover:text-blue-800 font-medium">✏️</button>
              <button onclick={() => deleteReceta(r.id, r.nombre)} class="text-red-500 hover:text-red-700 font-medium">🗑️</button>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<!-- Edit/New Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-xl mx-4 shadow-xl w-full max-h-[90vh] overflow-y-auto">
      <h3 class="text-lg font-semibold mb-4">{editId ? 'Editar Receta' : 'Nueva Receta'}</h3>
      <div class="space-y-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input type="text" bind:value={nombre} class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej: Olivos 10 ton/ha" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Cultivo</label>
            <select bind:value={tipo} class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="olivos">Olivos</option>
              <option value="cerezos">Cerezos</option>
              <option value="avellanos">Avellanos</option>
              <option value="kiwi">Kiwi</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Temporada</label>
            <input type="text" bind:value={temporada} class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea bind:value={descripcion} class="w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Opcional"></textarea>
        </div>
      </div>

      <!-- Plan mensual -->
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-700">📅 Plan Mensual</h4>
          <div class="flex items-center gap-2">
            <button type="button" onclick={monthPrev} class="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-200">← Mes anterior</button>
            <span class="font-medium text-sm text-gray-800 w-24 text-center">{MONTH_LABELS[currentMonth]}</span>
            <button type="button" onclick={monthNext} class="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-200">Mes siguiente →</button>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          {#each FN as name, i}
            <div>
              <label class="block text-xs text-gray-500 mb-1">{name}</label>
              <input type="number" step="1" min="0" max={FERT_MAX}
                bind:value={currentMonthInputs[i]}
                class="w-full border rounded px-2 py-1.5 text-sm" placeholder="0" />
            </div>
          {/each}
        </div>
        <div class="text-xs text-gray-500 mt-2 text-right">
          {monthTotal() > 0 ? `${monthTotal().toFixed(1)} kg este mes` : ''}
        </div>
      </div>

      <div class="flex gap-2 justify-end">
        <button onclick={() => { showModal = false; }} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onclick={saveReceta} class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">💾 Guardar Receta</button>
      </div>
    </div>
  </div>
{/if}
