// ═══ CALENDARIO ═══
const COLS_COLLAPSED = 3; // Hrs | M³ | 🧪
const COLS_EXPANDED = 11; // Hrs | SZn | NAm | NCa | ClK | Bor | Mg | FMA | Ure | M³ | 🧪

function toggleSector(secId){
  expandedSector = expandedSector===secId ? null : secId;
  renderCalendar();
}

function getCols(sec){return expandedSector===sec.id ? COLS_EXPANDED : COLS_COLLAPSED;}

async function loadCalendar(){
  const eq=document.getElementById('cal-equipo').value,m=document.getElementById('cal-mes').value,y=document.getElementById('cal-anio').value;
  if(!eq){document.getElementById('cal-empty').classList.remove('hidden');document.getElementById('cal-grid').classList.add('hidden');return;}
  gridData=await api(`/api/grid?id_equipo=${eq}&mes=${m}&anio=${y}`);
  expandedSector=null;
  if(!gridData.length){document.getElementById('cal-empty').innerHTML='<p class="text-gray-400">Sin sectores</p>';return;}
  renderCalendar();
}

// ─── Helpers for receta model ───
function findFertInList(list, fertName){
  if(!Array.isArray(list)) return null;
  return list.find(x => x.fert_name === fertName) || null;
}

function renderCalendar(){
  const m=document.getElementById('cal-mes').value,y=document.getElementById('cal-anio').value;
  document.getElementById('cal-empty').classList.add('hidden');
  document.getElementById('cal-grid').classList.remove('hidden');
  document.getElementById('cal-stats').classList.remove('hidden');
  const dim=new Date(y,m,0).getDate(),today=new Date(),isCur=today.getMonth()+1==m&&today.getFullYear()==y;

  const solMap={};let tH=0,tM3=0;
  gridData.forEach(sec=>sec.solicitudes.forEach(s=>{const d=parseInt(s.fecha_riego.split('-')[2],10);const k=`${sec.id}-${d}`;if(!solMap[k])solMap[k]=[];solMap[k].push(s);tH+=s.horas||0;tM3+=s.m3_programados||0;}));
  document.getElementById('cal-dias').textContent=new Set(Object.keys(solMap).map(k=>k.split('-')[1])).size;
  document.getElementById('cal-hrs').textContent=tH.toFixed(1);
  document.getElementById('cal-m3').textContent=tM3.toFixed(0);

  const ns='border px-1 py-0.5 text-center';

  // ═══ HEADER 1: Sector names (with receta) ═══
  let h='<thead>';
  h+='<tr><th class="sticky left-0 z-10 bg-gray-100 border px-2 py-1 text-left text-xs" style="min-width:55px"></th>';
  gridData.forEach((sec,si)=>{
    const cols=getCols(sec);
    const isExp=expandedSector===sec.id;
    const arrow=isExp?'▾':'▸';
    const bg=isExp?SEC_COLORS[si%8]+'dd':SEC_COLORS[si%8];
    // New receta model: sec.receta is {id, nombre} or null
    const recetaNombre = sec.receta?.nombre || null;
    const secLabel = recetaNombre
      ? `${arrow} ${sec.name} | ${recetaNombre} | ${sec.variedad||''} ${sec.has_hectareas||0}ha`
      : `${arrow} ${sec.name} | ⚠️ Sin receta | ${sec.variedad||''} ${sec.has_hectareas||0}ha`;
    h+=`<th colspan="${cols}" class="${ns} text-xs font-bold text-white py-1.5 cursor-pointer hover:opacity-90 select-none" style="background:${bg}" onclick="toggleSector(${sec.id})">${escH(secLabel)}</th>`;
  });
  h+='</tr>';

  // ═══ HEADER 2: Column labels ═══
  h+='<tr><th class="sticky left-0 z-10 bg-gray-100 border px-2 py-1 text-xs text-gray-500">Día</th>';
  gridData.forEach(sec=>{
    const isExp=expandedSector===sec.id;
    h+=`<th class="${ns} text-[10px] bg-gray-50 font-medium">Hrs</th>`;
    if(isExp){
      FN.forEach(n=>{h+=`<th class="${ns} text-[8px] bg-gray-50 font-medium text-orange-700" title="${n}">${n.substring(0,3)}</th>`;});
    }
    h+=`<th class="${ns} text-[10px] bg-gray-50 font-medium">M³</th>`;
    h+=`<th class="${ns} text-[10px] bg-gray-50 font-medium w-8">🧪</th>`;
  });
  h+='</tr></thead><tbody>';

  // ═══ DAY ROWS ═══
  for(let d=1;d<=dim;d++){
    const dt=new Date(y,m-1,d),dow=dt.getDay(),we=dow===0||dow===6,isT=isCur&&today.getDate()===d;
    const fechas=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    h+=`<tr class="${we?'bg-gray-50/70':''}">`;
    h+=`<td class="sticky left-0 z-10 bg-${we?'gray-50':'white'} border px-2 py-0.5 text-xs whitespace-nowrap ${isT?'text-blue-600 font-bold':'text-gray-600'}">${d} ${DOW[dow]}</td>`;

    gridData.forEach((sec,si)=>{
      const k=`${sec.id}-${d}`,sols=solMap[k]||[];
      const hrs=sols.reduce((s,r)=>s+(r.horas||0),0);
      const m3=sols.reduce((s,r)=>s+(r.m3_programados||0),0);
      const has=sols.length>0;
      const isExp=expandedSector===sec.id;

      if(has){
        // Hrs cell
        h+=`<td class="${ns} text-xs font-semibold cell-click ${isT?'cell-today':''}" onclick="viewS('${fechas}',${sec.id})">${hrs.toFixed(1)}</td>`;
        // Fertilizer cells (only if expanded)
        if(isExp){
          FK.forEach((fk,fi)=>{
            const val=sols.reduce((s,r)=>s+(r[fk]||0),0);
            h+=`<td class="${ns} text-[9px] ${val>0?'text-orange-700 font-medium':'text-gray-300'}">${val>0?val.toFixed(0):''}</td>`;
          });
        }
        // M³ cell
        h+=`<td class="${ns} text-[10px] text-blue-600 font-medium">${m3>0?m3.toFixed(0):''}</td>`;
        // 🧪 button
        const hasFert=solData_has_fert(sols);
        const dotColor=hasFert?'bg-orange-500':'bg-gray-300';
        h+=`<td class="${ns} cursor-pointer hover:bg-green-50" onclick="openFertModalByDate('${fechas}',${sec.id})"><span class="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 text-xs">🧪<span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor}"></span></span></td>`;
      }else{
        const cols=isExp?COLS_EXPANDED:COLS_COLLAPSED;
        h+=`<td colspan="${cols}" class="${ns} cell-click ${isT?'cell-today':''} hover:bg-blue-50" style="min-width:60px" onclick="openAdd('${fechas}',${sec.id},'${sec.name}')"></td>`;
      }
    });
    h+='</tr>';
  }

  // ═══ TOTAL MES ═══
  h+='<tr class="bg-gray-100 font-bold text-xs"><td class="sticky left-0 z-10 bg-gray-100 border px-2 py-1">TOTAL</td>';
  gridData.forEach(sec=>{
    const isExp=expandedSector===sec.id;
    const tHr=sec.solicitudes.reduce((s,r)=>s+(r.horas||0),0);
    const tM=sec.solicitudes.reduce((s,r)=>s+(r.m3_programados||0),0);
    h+=`<td class="${ns}">${tHr>0?tHr.toFixed(1):''}</td>`;
    if(isExp){
      FK.forEach((fk,fi)=>{
        const val=sec.solicitudes.reduce((s,r)=>s+(r[fk]||0),0);
        h+=`<td class="${ns} text-[9px] font-bold ${val>0?'text-orange-700':'text-gray-300'}">${val>0?val.toFixed(0):''}</td>`;
      });
    }
    h+=`<td class="${ns} text-blue-600">${tM>0?tM.toFixed(0):''}</td>`;
    h+=`<td class="${ns}"></td>`;
  });
  h+='</tr>';

  // ═══ MÁX MES (kilos_plan from receta_mes) ═══
  h+='<tr class="bg-amber-50 text-xs"><td class="sticky left-0 z-10 bg-amber-50 border px-2 py-1 font-medium text-amber-700">MÁX MES</td>';
  gridData.forEach(sec=>{
    const isExp=expandedSector===sec.id;
    h+=`<td class="${ns}"></td>`;
    if(isExp){
      FK.forEach((fk,fi)=>{
        const fertName=FN[fi];
        const entry = findFertInList(sec.receta_mes, fertName);
        const val = entry ? (entry.kilos_plan||0) : 0;
        h+=`<td class="${ns} text-[9px] font-bold text-amber-700">${val>0?val.toFixed(1):''}</td>`;
      });
    }
    h+=`<td class="${ns}"></td><td class="${ns}"></td>`;
  });
  h+='</tr>';

  // ═══ MÁX TEMP (kilos_total from receta_temporada) ═══
  h+='<tr class="bg-orange-50 text-xs"><td class="sticky left-0 z-10 bg-orange-50 border px-2 py-1 font-medium text-orange-700">MÁX TEMP</td>';
  gridData.forEach(sec=>{
    const isExp=expandedSector===sec.id;
    h+=`<td class="${ns}"></td>`;
    if(isExp){
      FK.forEach((fk,fi)=>{
        const fertName=FN[fi];
        const entry = findFertInList(sec.receta_temporada, fertName);
        const val = entry ? (entry.kilos_total||0) : 0;
        h+=`<td class="${ns} text-[9px] font-bold text-orange-700">${val>0?val.toFixed(0):''}</td>`;
      });
    }
    h+=`<td class="${ns}"></td><td class="${ns}"></td>`;
  });
  h+='</tr>';

  // ═══ SALDO TEMP (saldo from saldo_temporada) ═══
  h+='<tr class="bg-blue-50 text-xs"><td class="sticky left-0 z-10 bg-blue-50 border px-2 py-1 font-medium text-blue-700">SALDO</td>';
  gridData.forEach(sec=>{
    const isExp=expandedSector===sec.id;
    h+=`<td class="${ns}"></td>`;
    if(isExp){
      FK.forEach((fk,fi)=>{
        const fertName=FN[fi];
        const entry = findFertInList(sec.saldo_temporada, fertName);
        const saldo = entry ? (entry.saldo||0) : 0;
        // Also get max for color calc
        const maxEntry = findFertInList(sec.receta_temporada, fertName);
        const max = maxEntry ? (maxEntry.kilos_total||0) : 0;
        const cls = max===0 ? 'text-gray-300' : (saldo<0 ? 'saldo-over' : (saldo<max*0.2 ? 'saldo-warn' : 'saldo-ok'));
        h+=`<td class="${ns} text-[9px] font-bold ${cls}">${max>0?saldo.toFixed(0):''}</td>`;
      });
    }
    h+=`<td class="${ns}"></td><td class="${ns}"></td>`;
  });
  h+='</tr>';

  // ═══ U.N / U.P₂O₅ / U.K₂O — nutrient units from applied ═══
  const nutrientLabels = ['U.N','U.P₂O₅','U.K₂O'];
  const nutrientKeys = ['N','P2O5','K2O'];
  nutrientLabels.forEach((label, ni)=>{
    h+=`<tr class="bg-purple-50 text-xs"><td class="sticky left-0 z-10 bg-purple-50 border px-2 py-1 font-medium text-purple-700">${label}</td>`;
    gridData.forEach(sec=>{
      const isExp=expandedSector===sec.id;
      h+=`<td class="${ns}"></td>`;
      if(isExp){
        FK.forEach((fk,fi)=>{
          const fertName=FN[fi];
          const fertDef = fertilizantes.find(f=>f.name===fertName);
          const coeff = fertDef ? (fertDef[nutrientKeys[ni]]||0) : 0;
          const totalApplied = sec.solicitudes.reduce((s,r)=>s+(r[fk]||0),0);
          const units = totalApplied * coeff;
          h+=`<td class="${ns} text-[9px] font-medium text-purple-700">${units>0?units.toFixed(1):''}</td>`;
        });
      }
      h+=`<td class="${ns}"></td><td class="${ns}"></td>`;
    });
    h+='</tr>';
  });

  h+='</tbody>';
  document.getElementById('cal-table').innerHTML=h;
}

// HTML escape for header content
function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
