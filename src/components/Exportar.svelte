/**
 * Exportar.svelte — Export to CSV for Agronic.
 * Port of public/js/export.js.
 */
<script lang="ts">
  import { api, FK } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    onToast: (msg: string) => void;
  }

  let { onToast }: Props = $props();

  const now = new Date();
  let fecha = $state(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  let previewData: any[] = $state([]);
  let showPreview = $state(false);

  async function doExport() {
    if (!fecha) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const data = await api<any[]>(`/api/solicitudes?fecha=${fecha}`, { token });
    previewData = data;
    showPreview = true;
    if (!data.length) {
      onToast('Sin datos para esta fecha');
      return;
    }
    // Trigger CSV download
    window.location.href = `/api/export?fecha=${fecha}`;
  }
</script>

<h1 class="text-2xl font-bold text-gray-800 mb-6">📥 Exportar para Agronic</h1>

<div class="bg-white rounded-xl shadow-sm p-6 border max-w-lg">
  <p class="text-gray-600 mb-4">Seleccioná la fecha para descargar el listado CSV.</p>
  <div class="flex gap-3 items-end mb-4">
    <div class="flex-1">
      <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
      <input type="date" bind:value={fecha} class="w-full border rounded-lg px-3 py-2" />
    </div>
    <button onclick={doExport} class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium">📥 CSV</button>
  </div>

  {#if showPreview}
    <div>
      <div class="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-auto">
        <table class="w-full">
          <tr class="text-gray-500">
            <th class="text-left pr-4">Eq</th>
            <th class="text-left pr-4">Sec</th>
            <th class="text-right pr-4">Hrs</th>
            <th class="text-right pr-4">M³</th>
            <th class="text-right">Fert</th>
          </tr>
          {#each previewData as r}
            {@const ft = FK.reduce((a, k) => a + (r[k] ?? 0), 0)}
            <tr>
              <td class="pr-4">{r.equipo_name}</td>
              <td class="pr-4">{r.sector_name}</td>
              <td class="text-right pr-4 font-semibold">{r.horas}</td>
              <td class="text-right pr-4 text-blue-600">{(r.m3_programados ?? 0).toFixed(1)}</td>
              <td class="text-right">{ft.toFixed(1)}</td>
            </tr>
          {/each}
        </table>
      </div>
      <p class="text-sm text-gray-500 mt-2">{previewData.length} solicitudes</p>
    </div>
  {/if}
</div>
