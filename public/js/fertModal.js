// ═══ FERT MODAL ═══
async function openFertModalByDate(fecha,sectorId){
  console.log('🧪 openFertModalByDate called:', fecha, sectorId);
  
  // Fetch directo de la DB - siempre funciona
  const solData = await api(`/api/solicitudes/buscar?fecha=${fecha}&id_sector=${sectorId}`);
  console.log('🧪 solData:', solData);
  
  if(!solData){toast('No hay solicitud para '+fecha);return;}
  
  fertSolId=solData.id;
  const secData=sectores.find(s=>s.id==sectorId);
  console.log('🧪 secData:', secData);
  
  const d=new Date(fecha+'T12:00:00');
  const mes=d.getMonth()+1, anio=d.getFullYear();
  // Load receta
  const recetas=await api(`/api/recetas?id_sector=${sectorId}&mes=${mes}&anio=${anio}`);
  const recetaMap={};
  recetas.forEach(r=>{recetaMap[r.fert_name]={max:r.kilos_maximo};});
  // Calcular usado este mes por OTRAS solicitudes del mismo sector
  const monthStart=fecha.substring(0,7)+'-01';
  const otherSols=await api(`/api/solicitudes?fecha_desde=${monthStart}&fecha_hasta=${fecha}&id_sector=${sectorId}`);
  const used={};
  FN.forEach(n=>used[n]=0);
  otherSols.filter(s=>s.id!==fertSolId).forEach(s=>{
    FN.forEach((n,i)=>{used[n]+=(s[FK[i]]||0);});
  });
  // Header
  document.getElementById('fm-header').innerHTML=`
    <div class="flex items-center gap-3">
      <button onclick="closeModal('modal-fert')" class="text-gray-400 hover:text-gray-600 text-xl">← Volver</button>
      <div>
        <h2 class="text-lg font-bold">🧪 Fertilizantes</h2>
        <p class="text-sm text-gray-500">${fecha} | ${secData?.equipo_name||''} — ${secData?.name||''} | ${secData?.variedad||''} | ${solData.horas} hrs | ${(solData.m3_programados||0).toFixed(0)} m³</p>
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
          <div class="text-[10px] text-gray-400">${max>0?`Máx: ${max.toFixed(0)} kg | Usado: ${alreadyUsed.toFixed(0)} kg`:'Sin receta'}</div>
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
  await api('/api/solicitudes/'+fertSolId+'/fertilizantes',{method:'PUT',body:data});
  closeModal('modal-fert');
  toast('✅ Fertilizantes guardados');
  loadCalendar();
}