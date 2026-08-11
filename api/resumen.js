import { supabase } from '../lib/supabase.js';

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

  const { mes, anio } = req.query;

  if (!mes || !anio) {
    return res.status(400).json({ error: 'mes, anio required' });
  }

  const monthStr = String(mes).padStart(2, '0');
  const yearStr = String(anio);

  try {
    // Total summary using RPC would be ideal, but we'll use filters
    // Supabase doesn't support strftime directly, so we filter by date range
    const startDate = `${yearStr}-${monthStr}-01`;
    // Calculate end of month
    const lastDay = new Date(anio, mes, 0).getDate();
    const endDate = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const { data: allSols, error: solErr } = await supabase
      .schema('siracusa')
      .from('solicitudes_riego')
      .select('horas, m3_programados, fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k, fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea, sectores!inner(equipos!inner(name))')
      .eq('active', true)
      .gte('fecha_riego', startDate)
      .lte('fecha_riego', endDate);

    if (solErr) throw solErr;

    // Calculate totals
    let total_solicitudes = allSols.length;
    let total_horas = 0;
    let total_m3 = 0;
    let total_fert_kg = 0;

    const equipoMap = {};

    for (const s of allSols) {
      total_horas += s.horas || 0;
      total_m3 += s.m3_programados || 0;

      const fertSum =
        (s.fert_sulfato_zn || 0) +
        (s.fert_nitrato_amo || 0) +
        (s.fert_nitrato_ca || 0) +
        (s.fert_cloruro_k || 0) +
        (s.fert_acido_boro || 0) +
        (s.fert_sulfato_mg || 0) +
        (s.fert_fma || 0) +
        (s.fert_urea || 0);
      total_fert_kg += fertSum;

      const eqName = s.sectores?.equipos?.name || 'Unknown';
      if (!equipoMap[eqName]) {
        equipoMap[eqName] = { equipo: eqName, solicitudes: 0, horas: 0, m3: 0 };
      }
      equipoMap[eqName].solicitudes += 1;
      equipoMap[eqName].horas += s.horas || 0;
      equipoMap[eqName].m3 += s.m3_programados || 0;
    }

    const porEquipo = Object.values(equipoMap).sort((a, b) =>
      a.equipo.localeCompare(b.equipo)
    );

    return res.status(200).json({
      total: {
        total_solicitudes,
        total_horas,
        total_m3,
        total_fert_kg,
      },
      porEquipo,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
