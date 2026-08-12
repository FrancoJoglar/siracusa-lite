// ═══ FERT MODAL ═══
async function openFertModalByDate(fecha,sectorId){
  const t0=performance.now();
  
  const d=new Date(fecha+'T12:00:00');
  const mes=d.getMonth()+1, anio=d.getFullYear();
  const monthStart=fecha.substring(0,7)+'-01';
  
  // 1. Load solicitud for this date+sector
  const solData = await api(`/api/solicitudes?search=true&fecha=${fecha}&id_sector=${sectorId}`);
  if(!solData){toast('No hay solicitud para '+fecha);return;}
  
  fertSolId=solData.id;
  const secData=sectores.find(s=>s.id==sectorId);
  
  // 2. Load other solicitudes this month (for cumulative calc)
  const otherSols = await api(`/api/solicitudes?fecha_desde=${monthStart}&fecha_hasta=${fecha}&id_sector=${sectorId}`);
  
  // 3. NEW RECETA MODEL: get active assignment + detalles
  let recetaMap = {};
  let recetaNombre = null;
  try {
    // Find the equipo for this sector
    const equipo = equipos.find(e => {
      return sectores.some(s => s.id === sectorId && s.id_equipo === e.id);
    });
    if(equipo){
      const asigData = await api(`/api/recetas?view=asignaciones&id_equipo=${equipo.id}`);
      const asig = (Array.isArray(asigData) ? asigData : []).find(a => a.sector_id === sectorId);
      if(asig && asig.receta_id){
        recetaNombre = asig.receta_nombre;
        const detalles = await api(`/api/recetas?view=detalle&id_receta=${asig.receta_id}`);
        // Group by fert_name, sum kilos_plan across months for season total
        const seasonMap = {};
        (Array.isArray(detalles) ? detalles : []).forEach(det => {
          if(!seasonMap[det.fert_name]) seasonMap[det.fert_name] = 0;
          seasonMap[det.fert_name] += det.kilos_plan || 0;
        });
        // Convert to {fert_name: max} format (season total)
        Object.keys(seasonMap).forEach(fn => {
          recetaMap[fn] = { max: seasonMap[fn] };
        });
      }
    }
  } catch(e){
    console.warn('Could not load receta assignment:', e);
  }
  
  // Calculate used amounts (excluding current solicitud)
  const used={};
  FN.forEach(n=>used[n]=0);
  (Array.isArray(otherSols) ? otherSols : []).filter(s=>s.id!==fertSolId).forEach(s=>{
    FN.forEach((n,i)=>{used[n]+=(s[FK[i]]||0);});
  });

  // Header
  const recetaInfo = recetaNombre ? `<span class="text-green-600">📋 ${recetaNombre}</span>` : '<span class="text-amber-600">⚠️ Sin receta</span>';
  document.getElementById('fm-header').innerHTML=`
    <div class="flex items-center gap-3">
      <button onclick="closeModal('modal-fert')" class="text-gray-400 hover:text-gray-600 text-xl">← Volver</button>
      <div>
        <h2 class="text-lg font-bold">🧪 Fertilizantes</h2>
        <p class="text-sm text-gray-500">${fecha} | ${secData?.equipo_name||''} — ${secData?.name||''} | ${secData?.variedad||''} | ${solData.horas} hrs | ${(solData.m3_programados||0).toFixed(0)} m³</p>
        <p class="text-xs mt-0.5">${recetaInfo}</p>
      </div>
    </div>`;

  // Build rows
  let rows='';
  FN.forEach((n,i)=>{
    const rec=recetaMap[n];
    const max=rec?.max||0;
    const alreadyUsed=used[n];
    const currentVal=solData[FK[i]]||0;
    const afterUse=alreadyUsed+currentVal;
    const remaining=max-afterUse;
    const maxClass=max===0?'text-gray-400':(remaining<0?'text-red-600 font-bold':(remaining<max*0.2?'text-amber-600':'text-green-600'));
    const bgClass=currentVal>0?'border-green-300 bg-green-50/50':'border-gray-200';
    rows+=`
      <div class="flex items-center gap-3 p-3 bg-white rounded-lg border ${bgClass}">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm">${n}</div>
          <div class="text-[10px] text-gray-400">${max>0?`Temporada: ${max.toFixed(0)} kg | Usado: ${alreadyUsed.toFixed(0)} kg`:'Sin receta'}</div>
        </div>
        <div class="w-28 text-center">
          <input type="number" step="1" min="0" max="999" id="fm-${i}" value="${currentVal}" class="w-full border rounded-lg px-2 py-1.5 text-sm text-center font-semibold focus:ring-2 focus:ring-green-500" oninput="clampFertInput(this);updFmTotal()">
          ${max>0?`<div class="text-[10px] mt-0.5 ${maxClass}">${remaining>=0?'Queda: '+remaining.toFixed(0)+' kg':'⚠️ Excedido: '+Math.abs(remaining).toFixed(0)+' kg'}</div>`:''}
        </div>
        <div class="w-16 text-right text-sm font-bold ${currentVal>0?'text-green-700':'text-gray-300'}">${currentVal>0?currentVal+'kg':''}</div>
      </div>`;
  });
  document.getElementById('fm-rows').innerHTML=rows;
  updFmTotal();
  document.getElementById('modal-fert').classList.remove('hidden');
}
function clampFertInput(el){
  let v=parseFloat(el.value)||0;
  if(v>999){el.value=999;toast('⚠️ Máximo 999 kg por fertilizante');}
  if(v<0)el.value=0;
}
function updFmTotal(){
  let total=0;
  FN.forEach((_,i)=>{total+=parseFloat(document.getElementById('fm-'+i)?.value)||0;});
  document.getElementById('fm-total').textContent=total>0?`${total.toFixed(1)} kg total`:'Sin fertilizantes';
}
async function saveFertModal(){
  if(!fertSolId)return;
  const data={};
  FN.forEach((n,i)=>{data[FK[i]]=parseFloat(document.getElementById('fm-'+i)?.value)||0;});
  await api(`/api/solicitudes?id=${fertSolId}&action=fertilizantes`,{method:'PUT',body:data});
  closeModal('modal-fert');
  toast('✅ Fertilizantes guardados');
  loadCalendar();
}
