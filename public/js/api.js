// ═══ API Helper & Global State ═══
let equipos=[],sectores=[],fertilizantes=[],viewSolId=null;
let currentUser=null;
const FK=['fert_sulfato_zn','fert_nitrato_amo','fert_nitrato_ca','fert_cloruro_k','fert_acido_boro','fert_sulfato_mg','fert_fma','fert_urea'];
const FN=['Sulfato Zn','Nitrato Amonio','Nitrato Calcio','Cloruro K','Acido Borico','Sulfato Mg','FMA','Urea'];
const DOW=['dom','lun','mar','mié','jue','vie','sáb'];
const SEC_COLORS=['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#65a30d','#be185d'];
const FERT_MAX = 999;

// ═══ Supabase Auth ═══
const SUPABASE_URL = 'https://kqbegxcepoyfdxolocea.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxYmVneGNlcG95ZmR4b2xvY2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzU4NTIsImV4cCI6MjEwMjA1MTg1Mn0.obyalkzjstnfBXT1ubUZwCsfasxH0pmtfXoMzqy4V20';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    showApp();
  } else {
    showLogin();
  }
  // Bind login form ALWAYS (even before login)
  document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
  };
}

function showLogin() {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

function showApp() {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-email').textContent = currentUser?.email || '';
  showView('calendario');
}

async function login(email, password) {
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = 'Iniciar Sesión';
  if (error) {
    errEl.textContent = error.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos'
      : error.message;
    return;
  }
  currentUser = data.user;
  showApp();
  await init(); // Reload data now that we're authenticated
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showLogin();
}

// Listen for session expiration
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    showLogin();
  }
});

async function api(u,o={}){
  const headers={'Content-Type':'application/json',...(o.headers||{})};
  if(currentUser?.access_token) headers['Authorization']='Bearer '+currentUser.access_token;
  const opts={...o,headers,body:o.body?JSON.stringify(o.body):undefined};
  if(o.signal) opts.signal=o.signal;
  const r=await fetch(u,opts);
  const type=r.headers.get('content-type')||'';
  const payload=type.includes('application/json')?await r.json():await r.text();
  if(!r.ok){const err=new Error((payload&&payload.error)||('Request failed ('+r.status+')'));err.status=r.status;err.payload=payload;throw err;}
  return payload;
}
function isAbortError(e){return e&&e.name==='AbortError';}
function apiErrorMessage(e,fallback){return isAbortError(e)?'':(e?.message||fallback);}

function showView(n){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));document.getElementById('view-'+n).classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('bg-green-100',b.dataset.view===n);b.classList.toggle('text-green-700',b.dataset.view===n)});if(n==='database')loadDatabase();if(n==='calendario'&&document.getElementById('cal-equipo').value)loadCalendar();}
function closeModal(id){document.getElementById(id).classList.add('hidden');}
function toast(t){const e=document.getElementById('toast');document.getElementById('toast-t').textContent=t;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),3000);}

// Calendar grid globals (used by calendario.js)
let gridData=[];
let expandedSector=null;

// Fertilizer modal globals (used by fertModal.js)
let fertSolId=null;

function solData_has_fert(sols){return sols.some(s=>FK.some(k=>(s[k]||0)>0));}

async function init(){
  // Auth check first — if not logged in, show login and stop
  await checkAuth();
  if (!currentUser) return;

  [equipos,sectores,fertilizantes]=await Promise.all([api('/api/equipos'),api('/api/sectores'),api('/api/fertilizantes')]);
  const eqOpts=equipos.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  ['cal-equipo','s-equipo','f-equipo','asig-equipo'].forEach(id=>{
    const el=document.getElementById(id);
    if(id==='f-equipo') el.innerHTML='<option value="">Todos</option>'+eqOpts;
    else el.innerHTML='<option value="">Seleccionar...</option>'+eqOpts;
  });
  document.getElementById('s-ferts').innerHTML=FN.map((n,i)=>`<div><label class="block text-xs text-gray-500 mb-1">${n}</label><input type="number" step="1" min="0" id="sf-${i}" class="w-full border rounded px-2 py-1.5 text-sm" placeholder="0"></div>`).join('');
  const now=new Date();
  const safeSet = (id, prop, val) => { const el = document.getElementById(id); if(el) el[prop] = val; };
  safeSet('cal-mes', 'value', now.getMonth()+1);
  safeSet('cal-anio', 'value', now.getFullYear());
  const sf = document.getElementById('s-fecha'); if(sf) sf.valueAsDate = now;
  const fd = document.getElementById('f-desde'); if(fd) fd.value = '';
  const fh = document.getElementById('f-hasta'); if(fh) fh.value = '';
  const se = document.getElementById('s-equipo'); if(se) se.onchange = onSecEquipo;
  const ss = document.getElementById('s-sector'); if(ss) ss.onchange = onSecChange;
  const sh = document.getElementById('s-horas'); if(sh) sh.oninput = updM3;
  const fs = document.getElementById('form-sol'); if(fs) fs.onsubmit = onSubmitSol;
  const mf = document.getElementById('ma-form'); if(mf) mf.onsubmit = onSubmitModal;
  const md = document.getElementById('mv-del'); if(md) md.onclick = onDeleteView;
  showView('calendario');
}
