/**
 * Asignacion.svelte — Assign recipes to sectors + change recipe modal.
 * Port of public/js/recetas.js (assignments portion).
 */
<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type Equipo, type Sector } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    equipos: Equipo[];
    sectores: Sector[];
    onToast: (msg: string) => void;
  }

  let { equipos, onToast }: Props = $props();

  let equipoId = $state('');
  let assignments: any[] = $state([]);
  let changeLog: any[] = $state([]);
  let showCambiarModal = $state(false);
  let changeSectorId = $state(0);
  let changeSectorName = $state('');
  let changeVariedad = $state('');
  let changeCurrentNombre = $state('');
  let changeNewRecetaId = $state('');
  let changeMotivo = $state('');
  let recetasList: any[] = $state([]);

  async function loadAssignments() {
    if (!equipoId) { assignments = []; changeLog = []; return; }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const [data, log] = await Promise.all([
      api<any[]>(`/api/recetas?view=asignaciones&id_equipo=${equipoId}`, { token }),
      api<any[]>(`/api/recetas?view=log&id_sector=${equipoId}`, { token }).catch(() => []),
    ]);
    assignments = Array.isArray(data) ? data : [];
    changeLog = Array.isArray(log) ? log : [];
  }

  onMount(() => { loadAssignments(); });

  function onEquipoChange() { loadAssignments(); }

  function esc(s: string) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function formatDate(f: string) { return f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'; }

  async function openCambiar(sectorId: number, sectorName: string, variedad: string, currentRecetaId: number, currentNombre: string) {
    changeSectorId = sectorId;
    changeSectorName = sectorName + (variedad ? ` (${variedad})` : '');
    changeVariedad = variedad;
    changeCurrentNombre = currentNombre || 'Sin receta';
    changeNewRecetaId = '';
    changeMotivo = '';
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    recetasList = await api<any[]>('/api/recetas?view=catalog', { token });
    showCambiarModal = true;
  }

  async function confirmarCambio() {
    if (!changeNewRecetaId) { onToast('⚠️ Seleccioná una receta'); return; }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await api<any>('/api/recetas?view=cambiar', {
      method: 'POST',
      body: { id_sector: changeSectorId, id_receta_nueva: parseInt(changeNewRecetaId), motivo: changeMotivo },
      token,
    });
    if (res?.error) { onToast('❌ ' + res.error); return; }
    showCambiarModal = false;
    onToast(res?.message ?? '✅ Receta cambiada');
    await loadAssignments();
  }

  const filteredRecetas = $derived(() => {
    const tipoMap: Record<string, string> = { Olivos: 'olivos', Cerezos: 'cerezos', Avellanos: 'avellanos', Kiwi: 'kiwi' };
    const tipo = tipoMap[changeVariedad];
    let filtered = tipo ? recetasList.filter(r => r.tipo_cultivo === tipo) : recetasList;
    return filtered.length ? filtered : recetasList;
  });
</script>

<h1 class="text-2xl font-bold text-gray-800 mb-6">📋 Asignar Recetas a Sectores</h1>

<div class="bg-white rounded-xl shadow-sm p-6 border mb-6">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
      <select bind:value={equipoId} onchange={onEquipoChange} class="w-full border rounded-lg px-3 py-2">
        <option value="">Seleccionar equipo...</option>
        {#each equipos as eq}
          <option value={eq.id}>{eq.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-gray-600">
        <tr>
          <th class="px-4 py-3 text-left">Sector</th>
          <th class="px-4 py-3 text-left">Variedad</th>
          <th class="px-4 py-3 text-left">Receta Actual</th>
          <th class="px-4 py-3 text-left">Fecha</th>
          <th class="px-4 py-3 text-right">Acción</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        {#if assignments.length === 0}
          <tr><td colspan="5" class="text-center py-8 text-gray-400">{equipoId ? 'No hay sectores para este equipo' : 'Seleccioná un equipo'}</td></tr>
        {:else}
          {#each assignments as a}
            <tr class="border-b hover:bg-gray-50">
              <td class="px-4 py-3 text-sm font-medium text-gray-800">{esc(a.sector_name ?? 'Sector')}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{esc(a.variedad ?? '—')}</td>
              <td class="px-4 py-3 text-sm {a.receta_nombre ? 'text-green-700 font-medium' : 'text-amber-600'}">
                {a.receta_nombre ? `📋 ${esc(a.receta_nombre)}` : '⚠️ Sin receta'}
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">{formatDate(a.fecha_asignacion)}</td>
              <td class="px-4 py-3 text-sm text-right">
                <button
                  onclick={() => openCambiar(a.sector_id, a.sector_name ?? '', a.variedad ?? '', a.receta_id ?? 0, a.receta_nombre ?? '')}
                  class="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded hover:bg-blue-100"
                >
                  Cambiar
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if changeLog.length > 0}
    <div class="mt-4">
      <h3 class="text-sm font-semibold text-gray-600 mb-2">📋 Últimos cambios</h3>
      <div class="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1 max-h-48 overflow-y-auto">
        {#each changeLog.slice(0, 10) as l}
          <div>{formatDate(l.fecha)}: Sector {esc(l.sector_name ?? '')} cambió de '{esc(l.receta_anterior ?? 'ninguna')}' a '{esc(l.receta_nueva ?? 'ninguna')}' {l.motivo ? `(${esc(l.motivo)})` : ''}</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Cambiar Receta Modal -->
{#if showCambiarModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl w-full">
      <h3 class="text-lg font-semibold mb-4">🔄 Cambiar Receta</h3>
      <div class="space-y-3 mb-4">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-sm text-gray-500">Sector</p>
          <p class="font-medium">{changeSectorName}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-sm text-gray-500">Receta actual</p>
          <p class="font-medium">{changeCurrentNombre}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nueva receta</label>
          <select bind:value={changeNewRecetaId} class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar receta...</option>
            {#each filteredRecetas() as r}
              <option value={r.id}>{esc(r.nombre)} ({esc(r.tipo_cultivo ?? '')})</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
          <input type="text" bind:value={changeMotivo} class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ Los kilos aplicados antes se conservan. El saldo se recalcula con la nueva receta.
        </div>
      </div>
      <div class="flex gap-2 justify-end">
        <button onclick={() => { showCambiarModal = false; }} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onclick={confirmarCambio} class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">✅ Confirmar Cambio</button>
      </div>
    </div>
  </div>
{/if}
