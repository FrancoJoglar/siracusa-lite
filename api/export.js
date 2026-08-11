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

  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'fecha required' });
  }

  try {
    const { data: rows, error } = await supabase
      .schema('siracusa')
      .from('solicitudes_riego')
      .select('fecha_riego, horas, fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k, fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea, m3_programados, solicitante, observaciones, sectores!inner(name, equipos!inner(name))')
      .eq('active', true)
      .eq('fecha_riego', fecha)
      .order('fecha_riego');

    if (error) throw error;

    // Build CSV
    let csv =
      'Fecha,Equipo,Sector,Horas,S.Zn,N.Amo,N.Ca,Cl.K,B.Boro,S.Mg,FMA,Urea,M3,Solicitante,Observaciones\n';

    for (const r of rows) {
      const equipo = r.sectores?.equipos?.name || '';
      const sector = r.sectores?.name || '';
      const m3 = r.m3_programados != null ? r.m3_programados.toFixed(1) : '';
      const obs = (r.observaciones || '').replace(/"/g, '""');

      csv +=
        [
          r.fecha_riego,
          equipo,
          sector,
          r.horas,
          r.fert_sulfato_zn,
          r.fert_nitrato_amo,
          r.fert_nitrato_ca,
          r.fert_cloruro_k,
          r.fert_acido_boro,
          r.fert_sulfato_mg,
          r.fert_fma,
          r.fert_urea,
          m3,
          r.solicitante,
          `"${obs}"`,
        ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=riegos-${fecha}.csv`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
