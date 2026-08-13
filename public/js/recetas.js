// ═══ RECETAS CATALOG & ASSIGNMENTS ═══

// ─── State ───
let recetasList = [];
let recetasEquipoId = null;
let asigEquipoId = null;
let editModal = { id: null }; // null = new, number = edit
let editMonthData = {}; // {9: {fert0: 10, fert1: 5, ...}, 10: {...}, ...}
let editCurrentMonth = 9;

// ─── Month helpers ───
const SEASON_MONTHS = [9,10,11,12,1,2,3,4];
const MONTH_LABELS = {9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo',4:'Abril'};
function monthIdx(m){return SEASON_MONTHS.indexOf(m);}

// ═══════════════════════════════════
//  RECETAS CATALOG VIEW
// ═══════════════════════════════════

async function loadRecetasCatalog(){
  recetasList = await api('/api/recetas?view=catalog');
  renderRecetasCatalog();
}

function renderRecetasCatalog(){
  const el = document.getElementById('rc-list');
  if(!recetasList.length){
    el.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No hay recetas creadas. Hacé click en "Nueva Receta".</td></tr>';
    return;
  }
  el.innerHTML = recetasList.map(r=>`
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-3 text-sm font-medium text-gray-800">${esc(r.nombre)}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${esc(r.tipo_cultivo||'—')}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${esc(r.temporada||'—')}</td>
      <td class="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">${esc(r.descripcion||'')}</td>
      <td class="px-4 py-3 text-sm text-right space-x-2">
        <button onclick="openEditReceta(${r.id})" class="text-blue-600 hover:text-blue-800 font-medium">✏️</button>
        <button onclick="deleteReceta(${r.id},'${esc(r.nombre)}')" class="text-red-500 hover:text-red-700 font-medium">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function deleteReceta(id, nombre){
  if(!confirm(`¿Eliminar la receta "${nombre}"?`)) return;
  await api(`/api/recetas?view=catalog&id=${id}`, {method:'DELETE'});
  toast('✅ Receta eliminada');
  loadRecetasCatalog();
}

// ═══════════════════════════════════
//  NEW / EDIT RECETA MODAL
// ═══════════════════════════════════

function openNewReceta(){
  editModal = {id: null};
  editMonthData = {};
  SEASON_MONTHS.forEach(m => {
    editMonthData[m] = {};
    FK.forEach((_,i) => editMonthData[m]['fert'+i] = 0);
  });
  editCurrentMonth = 9;
  document.getElementById('rm-nombre').value = '';
  document.getElementById('rm-tipo').value = 'olivos';
  document.getElementById('rm-temporada').value = '2026-2027';
  document.getElementById('rm-descripcion').value = '';
  renderEditMonth();
  document.getElementById('modal-receta').classList.remove('hidden');
  document.getElementById('rm-nombre').focus();
}

async function openEditReceta(id){
  const rec = recetasList.find(r => r.id === id);
  if(!rec) return;
  editModal = {id};
  document.getElementById('rm-nombre').value = rec.nombre || '';
  document.getElementById('rm-tipo').value = rec.tipo_cultivo || 'olivos';
  document.getElementById('rm-temporada').value = rec.temporada || '2026-2027';
  document.getElementById('rm-descripcion').value = rec.descripcion || '';
  // Load detalles
  const detalles = await api(`/api/recetas?view=detalle&id_receta=${id}`);
  editMonthData = {};
  SEASON_MONTHS.forEach(m => {
    editMonthData[m] = {};
    FK.forEach((_,i) => editMonthData[m]['fert'+i] = 0);
  });
  (Array.isArray(detalles) ? detalles : []).forEach(d => {
    const mi = monthIdx(d.mes);
    if(mi === -1) return;
    const fertIdx = FK.indexOf(d.fert_key);
    if(fertIdx === -1) return;
    editMonthData[d.mes]['fert'+fertIdx] = d.kilos_plan || 0;
  });
  editCurrentMonth = 9;
  renderEditMonth();
  document.getElementById('modal-receta').classList.remove('hidden');
}

function renderEditMonth(){
  const m = editCurrentMonth;
  document.getElementById('rm-mes-label').textContent = MONTH_LABELS[m];
  const data = editMonthData[m] || {};
  const html = FN.map((n,i) => {
    const val = data['fert'+i] || 0;
    return `<div>
      <label class="block text-xs text-gray-500 mb-1">${n}</label>
      <input type="number" step="1" min="0" max="${FERT_MAX}" data-fert="${i}"
        class="rm-fert w-full border rounded px-2 py-1.5 text-sm"
        value="${val || ''}" placeholder="0"
        oninput="onEditFertInput(this)">
    </div>`;
  }).join('');
  document.getElementById('rm-ferts').innerHTML = html;
  updateEditMonthTotal();
}

function onEditFertInput(el){
  let v = parseFloat(el.value) || 0;
  if(v > FERT_MAX){ el.value = FERT_MAX; v = FERT_MAX; toast('⚠️ Máximo '+FERT_MAX+' kg por fertilizante'); }
  if(v < 0) el.value = 0;
  const fi = parseInt(el.dataset.fert);
  editMonthData[editCurrentMonth]['fert'+fi] = parseFloat(el.value)||0;
  updateEditMonthTotal();
}

function updateEditMonthTotal(){
  const data = editMonthData[editCurrentMonth] || {};
  let total = 0;
  FK.forEach((_,i) => total += (data['fert'+i]||0));
  document.getElementById('rm-mes-total').textContent = total > 0 ? `${total.toFixed(1)} kg este mes` : '';
}

function saveEditFerts(){
  // Save current month inputs to editMonthData
  document.querySelectorAll('.rm-fert').forEach(el => {
    const fi = parseInt(el.dataset.fert);
    editMonthData[editCurrentMonth]['fert'+fi] = parseFloat(el.value)||0;
  });
}

function editMonthPrev(){
  saveEditFerts();
  const idx = monthIdx(editCurrentMonth);
  editCurrentMonth = SEASON_MONTHS[(idx - 1 + SEASON_MONTHS.length) % SEASON_MONTHS.length];
  renderEditMonth();
}

function editMonthNext(){
  saveEditFerts();
  const idx = monthIdx(editCurrentMonth);
  editCurrentMonth = SEASON_MONTHS[(idx + 1) % SEASON_MONTHS.length];
  renderEditMonth();
}

async function saveReceta(){
  saveEditFerts();
  const nombre = document.getElementById('rm-nombre').value.trim();
  if(!nombre){ toast('⚠️ Ingresá un nombre para la receta'); return; }
  const tipo = document.getElementById('rm-tipo').value;
  const temporada = document.getElementById('rm-temporada').value.trim();
  const descripcion = document.getElementById('rm-descripcion').value.trim();
  // Build detalles array
  const detalles = [];
  SEASON_MONTHS.forEach(m => {
    const data = editMonthData[m] || {};
    FK.forEach((fk,fi) => {
      const kilos = data['fert'+fi] || 0;
      if(kilos > 0){
        detalles.push({mes: m, fert_key: fk, fert_name: FN[fi], kilos_plan: kilos});
      }
    });
  });
  const body = {nombre, tipo_cultivo: tipo, temporada, descripcion, detalles};
  if(editModal.id){
    await api(`/api/recetas?view=catalog&id=${editModal.id}`, {method:'PUT', body});
    toast('✅ Receta actualizada');
  } else {
    await api('/api/recetas?view=catalog', {method:'POST', body});
    toast('✅ Receta creada');
  }
  closeModal('modal-receta');
  loadRecetasCatalog();
}

// ═══════════════════════════════════
//  ASSIGNMENTS VIEW
// ═══════════════════════════════════

function onAsigEquipoChange(){
  asigEquipoId = document.getElementById('asig-equipo').value || null;
  if(!asigEquipoId){
    document.getElementById('asig-body').innerHTML =
      '<tr><td colspan="5" class="text-center py-8 text-gray-400">Seleccioná un equipo</td></tr>';
    document.getElementById('asig-log').innerHTML = '';
    return;
  }
  loadAssignments();
  loadChangeLog();
}

async function loadAssignments(){
  if(!asigEquipoId) return;
  const data = await api(`/api/recetas?view=asignaciones&id_equipo=${asigEquipoId}`);
  renderAssignments(Array.isArray(data) ? data : []);
}

function renderAssignments(list){
  const el = document.getElementById('asig-body');
  if(!list.length){
    el.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No hay sectores para este equipo</td></tr>';
    return;
  }
  el.innerHTML = list.map(a => {
    const recetaNombre = a.receta_nombre || null;
    const hasReceta = !!recetaNombre;
    return `<tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-3 text-sm font-medium text-gray-800">${esc(a.sector_name||'Sector')}</td>
      <td class="px-4 py-3 text-sm text-gray-600">${esc(a.variedad||'—')}</td>
      <td class="px-4 py-3 text-sm ${hasReceta?'text-green-700 font-medium':'text-amber-600'}">
        ${hasReceta ? '📋 '+esc(recetaNombre) : '⚠️ Sin receta'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-500">${a.fecha_asignacion ? formatDate(a.fecha_asignacion) : '—'}</td>
      <td class="px-4 py-3 text-sm text-right">
        <button onclick="openCambiarReceta(${a.sector_id},'${esc(a.sector_name||'')}','${esc(a.variedad||'')}',${a.receta_id||0},'${esc(recetaNombre||'')}')"
          class="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 bg-blue-50 rounded hover:bg-blue-100">
          Cambiar
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function loadChangeLog(){
  if(!asigEquipoId) return;
  const data = await api(`/api/recetas?view=log&id_sector=${asigEquipoId}`);
  const el = document.getElementById('asig-log');
  const list = Array.isArray(data) ? data : [];
  if(!list.length){
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <h3 class="text-sm font-semibold text-gray-600 mb-2">📋 Últimos cambios</h3>
    <div class="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1 max-h-48 overflow-y-auto">
      ${list.slice(0,10).map(l => `
        <div>${formatDate(l.fecha)}: Sector ${esc(l.sector_name||'')} cambió de '${esc(l.receta_anterior||'ninguna')}' a '${esc(l.receta_nueva||'ninguna')}' ${l.motivo ? '('+esc(l.motivo)+')' : ''}</div>
      `).join('')}
    </div>`;
}

// ═══════════════════════════════════
//  CHANGE RECETA MODAL
// ═══════════════════════════════════

let changeSectorId = null;
let changeCurrentRecetaId = null;

function openCambiarReceta(sectorId, sectorName, variedad, currentRecetaId, currentRecetaNombre){
  changeSectorId = sectorId;
  changeCurrentRecetaId = currentRecetaId;
  document.getElementById('cr-sector-name').textContent = sectorName + (variedad ? ' ('+variedad+')' : '');
  document.getElementById('cr-current').textContent = currentRecetaNombre || 'Sin receta';
  document.getElementById('cr-motivo').value = '';
  // Load recetas filtered by tipo_cultivo matching variedad (we use tipo_cultivo from catalog)
  loadRecetasForChange(variedad);
  document.getElementById('modal-cambiar').classList.remove('hidden');
}

async function loadRecetasForChange(variedad){
  // Filter recetas by tipo_cultivo if variedad matches
  const tipoMap = {'Olivos':'olivos','Cerezos':'cerezos','Avellanos':'avellanos','Kiwi':'kiwi'};
  const tipo = tipoMap[variedad] || null;
  let filtered = recetasList;
  if(tipo){
    filtered = recetasList.filter(r => r.tipo_cultivo === tipo);
  }
  // If no match by type, show all
  if(!filtered.length) filtered = recetasList;
  const sel = document.getElementById('cr-select');
  sel.innerHTML = '<option value="">Seleccionar receta...</option>' +
    filtered.map(r => `<option value="${r.id}">${esc(r.nombre)} (${esc(r.tipo_cultivo||'')})</option>`).join('');
  sel.value = '';
}

async function confirmarCambio(){
  const newId = document.getElementById('cr-select').value;
  if(!newId){ toast('⚠️ Seleccioná una receta'); return; }
  const motivo = document.getElementById('cr-motivo').value.trim();
  const res = await api('/api/recetas?view=cambiar', {
    method: 'POST',
    body: {id_sector: changeSectorId, id_receta_nueva: parseInt(newId), motivo}
  });
  if(res?.error){ toast('❌ '+res.error); return; }
  closeModal('modal-cambiar');
  toast(res?.message || '✅ Receta cambiada');
  loadAssignments();
  loadChangeLog();
}

// ═══════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatDate(f){
  if(!f) return '—';
  const d = new Date(f+'T12:00:00');
  return d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
}

// ═══════════════════════════════════
//  INIT — bind on app start
// ═══════════════════════════════════

// The init() in api.js calls showView('calendario'). We hook into that.
// Load recetas catalog when the view becomes visible.
const _origShowView = typeof showView === 'function' ? showView : null;
// We patch showView to load data when switching to our views
(function hookShowView(){
  const orig = window.showView;
  window.showView = function(n){
    orig.call(window, n);
    if(n === 'recetas') loadRecetasCatalog();
    if(n === 'asignacion') onAsigEquipoChange();
  };
})();
