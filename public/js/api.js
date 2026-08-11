// ═══ API Helper & Global State ═══
let equipos=[],sectores=[],fertilizantes=[],viewSolId=null;
const FK=['fert_sulfato_zn','fert_nitrato_amo','fert_nitrato_ca','fert_cloruro_k','fert_acido_boro','fert_sulfato_mg','fert_fma','fert_urea'];
const FN=['Sulfato Zn','Nitrato Amonio','Nitrato Calcio','Cloruro K','Acido Borico','Sulfato Mg','FMA','Urea'];
const DOW=['dom','lun','mar','mié','jue','vie','sáb'];
const SEC_COLORS=['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#65a30d','#be185d'];
const FERT_MAX = 999;

async function api(u,o={}){const r=await fetch(u,{headers:{'Content-Type':'application/json'},...o,body:o.body?JSON.stringify(o.body):undefined});return r.json();}

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
  [equipos,sectores,fertilizantes]=await Promise.all([api('/api/equipos'),api('/api/sectores'),api('/api/fertilizantes')]);
  const eqOpts=equipos.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  ['cal-equipo','s-equipo','f-equipo','r-equipo'].forEach(id=>{
    const el=document.getElementById(id);
    if(id==='f-equipo') el.innerHTML='<option value="">Todos</option>'+eqOpts;
    else el.innerHTML='<option value="">Seleccionar...</option>'+eqOpts;
  });
  document.getElementById('s-ferts').innerHTML=FN.map((n,i)=>`<div><label class="block text-xs text-gray-500 mb-1">${n}</label><input type="number" step="1" min="0" id="sf-${i}" class="w-full border rounded px-2 py-1.5 text-sm" placeholder="0"></div>`).join('');
  const now=new Date();
  document.getElementById('cal-mes').value=now.getMonth()+1;
  document.getElementById('cal-anio').value=now.getFullYear();
  document.getElementById('s-fecha').valueAsDate=now;
  document.getElementById('f-desde').valueAsDate=new Date(now.getFullYear(),now.getMonth(),1);
  document.getElementById('f-hasta').valueAsDate=now;
  document.getElementById('r-mes').value=now.getMonth()+1;
  document.getElementById('s-equipo').onchange=onSecEquipo;
  document.getElementById('s-sector').onchange=onSecChange;
  document.getElementById('s-horas').oninput=updM3;
  document.getElementById('form-sol').onsubmit=onSubmitSol;
  document.getElementById('ma-form').onsubmit=onSubmitModal;
  document.getElementById('mv-del').onclick=onDeleteView;
  showView('calendario');
}
