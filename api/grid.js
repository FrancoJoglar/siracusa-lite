import { supabase } from '../lib/supabase.js';

// Maps solicitudes_riego column names to human-readable fertilizer names
const FERT_COL_MAP = {
  fert_sulfato_zn: 'Sulfato Zn',
  fert_nitrato_amo: 'Nitrato Amonio',
  fert_nitrato_ca: 'Nitrato Calcio',
  fert_cloruro_k: 'Cloruro K',
  fert_acido_boro: 'Acido Borico',
  fert_sulfato_mg: 'Sulfato Mg',
  fert_fma: 'FMA',
  fert_urea: 'Urea',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id_equipo, mes, anio } = req.query;

  if (!id_equipo || !mes || !anio) {
    return res.status(400).json({ error: 'id_equipo, mes, anio required' });
  }

  const monthStr = String(mes).padStart(2, '0');
  const yearStr = String(anio);

  // Season bounds: Sept of anio → Apr of anio+1
  const seasonStart = `${yearStr}-09-01`;
  const seasonEnd = `${parseInt(yearStr) + 1}-04-30`;

  // Month date range
  const dateFrom = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
  const dateTo = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  try {
    // 1. Get all active sectors for this equipo
    const { data: sectores, error: secErr } = await supabase
      .schema('siracusa')
      .from('sectores')
      .select('*, equipos!inner(name)')
      .eq('id_equipo', id_equipo)
      .eq('active', true)
      .order('name');

    if (secErr) throw secErr;

    // 2. For each sector, build the full grid row
    const result = await Promise.all(
      sectores.map(async (sec) => {
        // ── Solicitudes for this month ──────────────────────────────
        const { data: solicitudes } = await supabase
          .schema('siracusa')
          .from('solicitudes_riego')
          .select('*')
          .eq('id_sector', sec.id)
          .eq('active', true)
          .gte('fecha_riego', dateFrom)
          .lte('fecha_riego', dateTo)
          .order('fecha_riego');

        // ── Active receta assignment ────────────────────────────────
        const { data: assignment } = await supabase
          .schema('siracusa')
          .from('sector_receta')
          .select('id_receta, recetas!inner(id, nombre, tipo_cultivo)')
          .eq('id_sector', sec.id)
          .eq('activo', true)
          .maybeSingle();

        const recetaInfo = assignment?.recetas ?? null;
        const recetaId = assignment?.id_receta ?? null;

        // ── ALL receta_detalle for assigned receta (season totals) ──
        let recetaTemporada = [];
        let recetaMes = [];
        if (recetaId) {
          const { data: allDetalles } = await supabase
            .schema('siracusa')
            .from('receta_detalle')
            .select('mes, kilos_plan, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)')
            .eq('id_receta', recetaId);

          // Receta temporada: aggregate all months by fertilizer
          const tempAgg = {};
          for (const d of allDetalles || []) {
            const name = d.fertilizantes?.name;
            if (!name) continue;
            if (!tempAgg[name]) {
              tempAgg[name] = {
                fert_name: name,
                kilos_total: 0,
                N: d.fertilizantes?.N ?? 0,
                P2O5: d.fertilizantes?.P2O5 ?? 0,
                K2O: d.fertilizantes?.K2O ?? 0,
                CaO: d.fertilizantes?.CaO ?? 0,
                MgO: d.fertilizantes?.MgO ?? 0,
                Zn: d.fertilizantes?.Zn ?? 0,
                B2O3: d.fertilizantes?.B2O3 ?? 0,
                S: d.fertilizantes?.S ?? 0,
              };
            }
            tempAgg[name].kilos_total += d.kilos_plan;
          }
          recetaTemporada = Object.values(tempAgg);

          // Receta mes: only current month
          const mesNum = parseInt(mes);
          recetaMes = (allDetalles || [])
            .filter((d) => d.mes === mesNum)
            .map((d) => ({
              fert_name: d.fertilizantes?.name,
              kilos_plan: d.kilos_plan,
              N: d.fertilizantes?.N ?? 0,
              P2O5: d.fertilizantes?.P2O5 ?? 0,
              K2O: d.fertilizantes?.K2O ?? 0,
              CaO: d.fertilizantes?.CaO ?? 0,
              MgO: d.fertilizantes?.MgO ?? 0,
              Zn: d.fertilizantes?.Zn ?? 0,
              B2O3: d.fertilizantes?.B2O3 ?? 0,
              S: d.fertilizantes?.S ?? 0,
            }));
        }

        // ── Applied amounts this season ─────────────────────────────
        const { data: solsSeason } = await supabase
          .schema('siracusa')
          .from('solicitudes_riego')
          .select(Object.keys(FERT_COL_MAP).join(', '))
          .eq('id_sector', sec.id)
          .eq('active', true)
          .gte('fecha_riego', seasonStart)
          .lte('fecha_riego', seasonEnd);

        const appliedAgg = {};
        for (const sol of solsSeason || []) {
          for (const [col, name] of Object.entries(FERT_COL_MAP)) {
            const val = parseFloat(sol[col]) || 0;
            if (val > 0) {
              if (!appliedAgg[name]) appliedAgg[name] = 0;
              appliedAgg[name] += val;
            }
          }
        }
        const aplicadoTemporada = Object.entries(appliedAgg).map(([fert_name, kilos_aplicados]) => ({
          fert_name,
          kilos_aplicados,
        }));

        // ── Saldo: MÁX TEMP - applied ──────────────────────────────
        const saldoMap = {};
        for (const r of recetaTemporada) {
          saldoMap[r.fert_name] = r.kilos_total;
        }
        for (const a of aplicadoTemporada) {
          if (!saldoMap[a.fert_name]) saldoMap[a.fert_name] = 0;
          saldoMap[a.fert_name] -= a.kilos_aplicados;
        }
        // Include applied fertilizers that don't have a receta entry
        for (const a of aplicadoTemporada) {
          if (!(a.fert_name in saldoMap)) {
            saldoMap[a.fert_name] = -a.kilos_aplicados;
          }
        }
        const saldoTemporada = Object.entries(saldoMap)
          .map(([fert_name, saldo]) => ({ fert_name, saldo }))
          .filter((s) => {
            // Only include fertilizers with data in receta OR applied
            return recetaTemporada.some((r) => r.fert_name === s.fert_name) ||
              appliedAgg[s.fert_name] > 0;
          });

        // Filter recetaTemporada and aplicadoTemporada to only relevant fertilizers
        const relevantFerts = new Set([
          ...recetaTemporada.map((r) => r.fert_name),
          ...Object.keys(appliedAgg).filter((n) => appliedAgg[n] > 0),
        ]);

        const filteredRecetaTemporada = recetaTemporada.filter((r) => relevantFerts.has(r.fert_name));
        const filteredAplicadoTemporada = aplicadoTemporada.filter((a) => relevantFerts.has(a.fert_name));

        return {
          id: sec.id,
          name: sec.name,
          equipo_name: sec.equipos?.name,
          has_hectareas: sec.has_hectareas,
          variedad: sec.variedad,
          receta: recetaInfo ? { id: recetaInfo.id, nombre: recetaInfo.nombre, tipo_cultivo: recetaInfo.tipo_cultivo } : null,
          receta_mes: recetaMes,
          receta_temporada: filteredRecetaTemporada,
          aplicado_temporada: filteredAplicadoTemporada,
          saldo_temporada: saldoTemporada,
          solicitudes: solicitudes || [],
        };
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
