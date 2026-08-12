// ═══ SOLICITUD FORM & RECETAS ═══
// ═══ MODAL ADD (solo horas + solicitante) ═══
function openAdd(fecha,secId,secName){
  document.getElementById('ma-fecha').value=fecha;
  document.getElementById('ma-sector').value=secId;
  document.getElementById('ma-ctx').textContent=`${fecha} — ${secName}`;
  document.getElementById('ma-horas').value='';
  document.getElementById('modal-add').classList.remove('hidden');
  document.getElementById('ma-horas').focus();
}
async function onSubmitModal(e){
  e.preventDefault();
  const data={id_sector:document.getElementById('ma-sector').value,fecha_riego:document.getElementById('ma-fecha').value,horas:document.getElementById('ma-horas').value,solicitante:currentUser?.email||currentUser?.user_metadata?.name||'Anónimo'};
  const res=await api('/api/solicitudes',{method:'POST',body:data});
  if(res.id){
    closeModal('modal-add');
    toast('✅ Registrado — '+(res.m3_programados||0).toFixed(1)+' m³');
    await loadCalendar();
    console.log('📅 Calendar refreshed after create');
  }else{
    console.log('❌ Create failed:', res);
    toast('❌ Error al guardar');
  }
}
// ═══ MODAL VIEW ═══
async function viewS(fecha,secId){
  const sols=await api(`/api/solicitudes?fecha=${fecha}`);
  const sol=sols.find(s=>s.id_sector===secId);
  if(!sol)return;
  viewSolId=sol.id;
  const ft=FK.reduce((s,k,i)=>s+(sol[k]||0),0);
  let h=`<div class="flex justify-between"><span class="text-gray-500">Fecha</span><span class="font-medium">${sol.fecha_riego}</span></div>
    <div class="flex justify-between"><span class="text-gray-500">Equipo</span><span>${sol.equipo_name}</span></div>
    <div class="flex justify-between"><span class="text-gray-500">Sector</span><span>${sol.sector_name}</span></div>
    <div class="flex justify-between"><span class="text-gray-500">Horas</span><span class="font-bold text-lg">${sol.horas} hrs</span></div>
    <div class="flex justify-between"><span class="text-gray-500">M³</span><span class="font-bold text-blue-600">${(sol.m3_programados||0).toFixed(1)} m³</span></div><hr>`;
  if(ft>0){h+=`<div class="text-xs text-gray-500 mt-2">Fertilizantes (${ft.toFixed(1)} kg):</div>`;FK.forEach((k,i)=>{if(sol[k])h+=`<div class="flex justify-between text-xs"><span>${FN[i]}</span><span>${sol[k]} kg</span></div>`;});}
  h+=`<div class="text-xs text-gray-500 mt-2">Solicitante: ${sol.solicitante}</div>`;
  if(sol.observaciones)h+=`<div class="text-xs text-gray-400">📝 ${sol.observaciones}</div>`;
  document.getElementById('mv-content').innerHTML=h;
  document.getElementById('modal-view').classList.remove('hidden');
}
async function onDeleteView(){if(!viewSolId)return;await api('/api/solicitudes?id='+viewSolId,{method:'DELETE'});closeModal('modal-view');toast('✅ Eliminado');loadCalendar();}
// ═══ SOLICITUD FORM ═══
let solReceta={};
function onSecEquipo(){const eq=document.getElementById('s-equipo').value,sel=document.getElementById('s-sector');if(!eq){sel.innerHTML='<option value="">Elegí equipo</option>';return;}sel.innerHTML='<option value="">Seleccionar...</option>'+sectores.filter(s=>s.id_equipo==eq).map(s=>`<option value="${s.id}">${s.name} (${s.variedad||'N/A'})</option>`).join('');}
function onSecChange(){const sec=sectores.find(s=>s.id==document.getElementById('s-sector').value);const el=document.getElementById('s-sec-info');if(!sec){el.classList.add('hidden');return;}el.innerHTML=`📍 ${sec.equipo_name} — ${sec.name} | 🌿 ${sec.variedad||'N/A'} | 📐 ${sec.has_hectareas||0} has | 💧 ${sec.m3_ha_hr} m³/ha/hr`;el.classList.remove('hidden');updM3();
  const f=document.getElementById('s-fecha').value;if(f){const d=new Date(f);api(`/api/recetas?id_sector=${sec.id}&mes=${d.getMonth()+1}&anio=${d.getFullYear()}`).then(r=>{solReceta={};r.forEach(x=>{solReceta[x.fert_name]={max:x.kilos_maximo};});const w=document.getElementById('s-receta-warn');if(r.length){w.innerHTML='📋 <b>Receta:</b> '+r.map(x=>`${x.fert_name}: máx ${x.kilos_maximo} kg`).join(' | ');w.classList.remove('hidden');}else w.classList.add('hidden');});}}
function updM3(){const sec=sectores.find(s=>s.id==document.getElementById('s-sector').value);const h=parseFloat(document.getElementById('s-horas').value)||0;const el=document.getElementById('s-m3');if(!sec||!h){el.classList.add('hidden');return;}el.innerHTML=`💧 <b>${(sec.has_hectareas*h*sec.m3_ha_hr).toFixed(1)} m³</b> (${sec.has_hectareas} has × ${h} hrs × ${sec.m3_ha_hr})`;el.classList.remove('hidden');}
async function onSubmitSol(e){e.preventDefault();const data={id_sector:document.getElementById('s-sector').value,fecha_riego:document.getElementById('s-fecha').value,horas:document.getElementById('s-horas').value,solicitante:currentUser?.email||currentUser?.user_metadata?.name||'Anónimo',observaciones:document.getElementById('s-obs').value};for(let i=0;i<8;i++)data[FK[i]]=parseFloat(document.getElementById('sf-'+i).value)||0;const res=await api('/api/solicitudes',{method:'POST',body:data});if(res.id){toast('✅ Registrado — '+(res.m3_programados||0).toFixed(1)+' m³');e.target.reset();document.getElementById('s-fecha').valueAsDate=new Date();document.getElementById('s-m3').classList.add('hidden');document.getElementById('s-sec-info').classList.add('hidden');document.getElementById('s-receta-warn').classList.add('hidden');}}
// ═══ RECETAS (legacy — removed, now in recetas.js) ═══