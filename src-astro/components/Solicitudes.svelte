/**
 * Solicitudes.svelte — New solicitud form.
 * Port of public/js/solicitudes.js (form portion).
 */
<script lang="ts">
  import { api, FK, FN, type Equipo, type Sector, type Fertilizante } from '$lib/api';
  import { supabase } from '$lib/supabase';

  interface Props {
    equipos: Equipo[];
    sectores: Sector[];
    fertilizantes: Fertilizante[];
    onToast: (msg: string) => void;
  }

  let { equipos, sectores, fertilizantes, onToast }: Props = $props();

  const now = new Date();
  let fecha = $state(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  let equipoId = $state('');
  let sectorId = $state('');
  let horas = $state('');
  let observaciones = $state('');
  let ferts = $state<number[]>(Array(8).fill(0));
  let secInfo = $state('');
  let recetaWarn = $state('');
  let m3Preview = $state('');
  let submitting = $state(false);

  let solReceta: Record<string, { max: number }> = $state({});

  // Filtered sectors for selected equipo
  const filteredSectores = $derived(sectores.filter(s => s.id_equipo === Number(equipoId)));

  function onEquipoChange() {
    sectorId = '';
    secInfo = '';
    m3Preview = '';
    recetaWarn = '';
  }

  async function onSectorChange() {
    const sec = sectores.find(s => s.id === Number(sectorId));
    if (!sec) { secInfo = ''; return; }
    secInfo = `📍 ${(sec as any).equipo_name ?? ''} — ${sec.name} | 🌿 ${sec.variedad ?? 'N/A'} | 📐 ${(sec as any).has_hectareas ?? 0} has | 💧 ${(sec as any).m3_ha_hr ?? 0} m³/ha/hr`;
    updM3();

    // Load receta for this sector+month
    if (fecha) {
      const d = new Date(fecha + 'T12:00:00');
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      try {
        const r = await api<any[]>(`/api/recetas?id_sector=${sec.id}&mes=${d.getMonth() + 1}&anio=${d.getFullYear()}`, { token });
        solReceta = {};
        for (const x of r) solReceta[x.fert_name] = { max: x.kilos_maximo };
        if (r.length) {
          recetaWarn = '📋 <b>Receta:</b> ' + r.map((x: any) => `${x.fert_name}: máx ${x.kilos_maximo} kg`).join(' | ');
        } else {
          recetaWarn = '';
        }
      } catch { recetaWarn = ''; }
    }
  }

  function updM3() {
    const sec = sectores.find(s => s.id === Number(sectorId));
    const h = parseFloat(horas) || 0;
    if (!sec || !h) { m3Preview = ''; return; }
    const secAny = sec as any;
    m3Preview = `💧 <b>${(secAny.has_hectareas * h * secAny.m3_ha_hr).toFixed(1)} m³</b> (${secAny.has_hectareas} has × ${h} hrs × ${secAny.m3_ha_hr})`;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (!sectorId || !fecha || !horas) { onToast('⚠️ Completá todos los campos'); return; }
    submitting = true;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const user = (await supabase.auth.getSession()).data.session?.user;
      const data: Record<string, any> = {
        id_sector: Number(sectorId),
        fecha_riego: fecha,
        horas: parseFloat(horas),
        solicitante: user?.email ?? user?.user_metadata?.name ?? 'Anónimo',
        observaciones,
      };
      FK.forEach((k, i) => { data[k] = ferts[i] ?? 0; });
      const res = await api<any>('/api/solicitudes', { method: 'POST', body: data, token });
      if (res.id) {
        onToast(`✅ Registrado — ${(res.m3_programados ?? 0).toFixed(1)} m³`);
        horas = '';
        observaciones = '';
        ferts = Array(8).fill(0);
        m3Preview = '';
        secInfo = '';
        recetaWarn = '';
      } else {
        onToast('❌ Error al guardar');
      }
    } catch {
      onToast('❌ Error al guardar');
    } finally {
      submitting = false;
    }
  }
</script>

<h1 class="text-2xl font-bold text-gray-800 mb-6">Nueva Solicitud de Riego</h1>

<form onsubmit={onSubmit} class="bg-white rounded-xl shadow-sm p-6 border">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
      <input type="date" bind:value={fecha} required class="w-full border rounded-lg px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
      <select bind:value={equipoId} onchange={onEquipoChange} required class="w-full border rounded-lg px-3 py-2">
        <option value="">Seleccionar...</option>
        {#each equipos as eq}
          <option value={eq.id}>{eq.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Sector</label>
      <select bind:value={sectorId} onchange={onSectorChange} required class="w-full border rounded-lg px-3 py-2">
        <option value="">Elegí equipo primero</option>
        {#each filteredSectores as sec}
          <option value={sec.id}>{sec.name} ({sec.variedad ?? 'N/A'})</option>
        {/each}
      </select>
    </div>
  </div>

  {#if secInfo}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">{@html secInfo}</div>
  {/if}

  <div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-1">Horas</label>
    <input type="number" step="0.5" min="0" max="24" bind:value={horas} oninput={updM3} required class="w-48 border rounded-lg px-3 py-2 text-lg font-semibold" placeholder="5.0" />
  </div>

  <h3 class="text-sm font-semibold text-gray-700 mb-2">🧪 Fertilizantes (kg)</h3>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
    {#each FN as name, i}
      <div>
        <label class="block text-xs text-gray-500 mb-1">{name}</label>
        <input type="number" step="1" min="0" bind:value={ferts[i]} class="w-full border rounded px-2 py-1.5 text-sm" placeholder="0" />
      </div>
    {/each}
  </div>

  {#if recetaWarn}
    <div class="hidden bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm">{@html recetaWarn}</div>
  {/if}

  {#if m3Preview}
    <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">{@html m3Preview}</div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
      <input type="text" bind:value={observaciones} class="w-full border rounded-lg px-3 py-2" placeholder="Opcional" />
    </div>
  </div>

  <button type="submit" disabled={submitting} class="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50">
    {submitting ? 'Guardando...' : '✅ Registrar'}
  </button>
</form>
