/**
 * App.svelte — Root island for Siracusa Astro.
 *
 * Manages:
 *  - Supabase auth (login / logout / session persistence)
 *  - Hash-based view routing
 *  - Global data (equipos, sectores, fertilizantes)
 *  - Toast notifications
 *
 * Svelte 5 runes syntax.
 */
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase, getSession, signIn, signOut } from '$lib/supabase';
  import { api, type Equipo, type Sector, type Fertilizante } from '$lib/api';

  import Calendario from './Calendario.svelte';
  import Solicitudes from './Solicitudes.svelte';
  import ModalFertilizantes from './ModalFertilizantes.svelte';
  import Recetas from './Recetas.svelte';
  import Asignacion from './Asignacion.svelte';
  import Database from './Database.svelte';
  import Exportar from './Exportar.svelte';

  // ─── Auth state ───
  let userEmail = $state('');
  let isLoggedIn = $state(false);
  let authReady = $state(false);

  // ─── Data ───
  let equipos = $state<Equipo[]>([]);
  let sectores = $state<Sector[]>([]);
  let fertilizantes = $state<Fertilizante[]>([]);

  // ─── View routing (hash-based) ───
  let currentView = $state('calendario');
  const VALID_VIEWS = ['calendario', 'solicitudes', 'recetas', 'asignacion', 'database', 'export'];

  function navigateTo(view: string) {
    if (VALID_VIEWS.includes(view)) {
      currentView = view;
      window.location.hash = view;
    }
  }

  function handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'calendario';
    if (VALID_VIEWS.includes(hash)) {
      currentView = hash;
    }
  }

  // ─── Toast ───
  let toastText = $state('');
  let toastVisible = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  export function showToast(msg: string) {
    toastText = msg;
    toastVisible = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastVisible = false; }, 3000);
  }

  // ─── Login form ───
  let loginEmail = $state('');
  let loginPassword = $state('');
  let loginError = $state('');
  let loginLoading = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    loginError = '';
    loginLoading = true;
    try {
      await signIn(loginEmail, loginPassword);
      await afterLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      loginError = msg === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : msg;
    } finally {
      loginLoading = false;
    }
  }

  async function handleLogout() {
    await signOut();
    isLoggedIn = false;
    userEmail = '';
    document.getElementById('app-shell')?.classList.add('hidden');
    document.getElementById('view-login')?.classList.remove('hidden');
  }

  async function afterLogin() {
    const { user } = await getSession();
    if (user) {
      isLoggedIn = true;
      userEmail = user.email ?? '';
      document.getElementById('view-login')?.classList.add('hidden');
      document.getElementById('app-shell')?.classList.remove('hidden');
      await loadData();
    }
  }

  async function loadData() {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    [equipos, sectores, fertilizantes] = await Promise.all([
      api<Equipo[]>('/api/equipos', { token }),
      api<Sector[]>('/api/sectores', { token }),
      api<Fertilizante[]>('/api/fertilizantes', { token }),
    ]);
  }

  // ─── Lifecycle ───
  onMount(async () => {
    // Hash routing
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Auth
    const { user } = await getSession();
    if (user) {
      isLoggedIn = true;
      userEmail = user.email ?? '';
      document.getElementById('view-login')?.classList.add('hidden');
      document.getElementById('app-shell')?.classList.remove('hidden');
      await loadData();
    } else {
      document.getElementById('view-login')?.classList.remove('hidden');
      document.getElementById('app-shell')?.classList.add('hidden');
    }
    authReady = true;

    // Login form binding
    const form = document.getElementById('login-form');
    form?.addEventListener('submit', handleLogin);

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', handleLogout);

    // Nav buttons
    document.querySelectorAll('.nav-btn[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo((btn as HTMLElement).dataset.nav ?? 'calendario');
        updateNavHighlight();
      });
    });
    updateNavHighlight();

    // Auth state listener
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });
  });

  function updateNavHighlight() {
    document.querySelectorAll('.nav-btn').forEach((b) => {
      const el = b as HTMLElement;
      el.classList.toggle('bg-green-100', el.dataset.nav === currentView);
      el.classList.toggle('text-green-700', el.dataset.nav === currentView);
    });
  }

  // Update nav highlight when view changes
  $effect(() => {
    currentView;
    updateNavHighlight();
  });

  // Expose toast and data to child components
  let fertModalOpen = $state(false);
  let fertModalSolId = $state(0);
</script>

{#if authReady}
  {#if currentView === 'calendario'}
    <Calendario
      {equipos}
      {sectores}
      {fertilizantes}
      token={undefined}
      onToast={showToast}
      onOpenFert={(solId: number) => { fertModalSolId = solId; fertModalOpen = true; }}
      {navigateTo}
    />
  {:else if currentView === 'solicitudes'}
    <Solicitudes {equipos} {sectores} {fertilizantes} onToast={showToast} />
  {:else if currentView === 'recetas'}
    <Recetas onToast={showToast} />
  {:else if currentView === 'asignacion'}
    <Asignacion {equipos} {sectores} onToast={showToast} />
  {:else if currentView === 'database'}
    <Database {equipos} onToast={showToast} />
  {:else if currentView === 'export'}
    <Exportar onToast={showToast} />
  {/if}
{/if}

{#if fertModalOpen}
  <ModalFertilizantes
    solId={fertModalSolId}
    onToast={showToast}
    onClose={() => { fertModalOpen = false; }}
  />
{/if}
