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

  const { id_equipo, mes, anio } = req.query;

  if (!id_equipo || !mes || !anio) {
    return res.status(400).json({ error: 'id_equipo, mes, anio required' });
  }

  const monthStr = String(mes).padStart(2, '0');
  const yearStr = String(anio);

  try {
    // 1. Get all sectors for this equipo
    const { data: sectores, error: secErr } = await supabase
      .schema('siracusa')
      .from('sectores')
      .select('*, equipos!inner(name)')
      .eq('id_equipo', id_equipo)
      .eq('active', true)
      .order('name');

    if (secErr) throw secErr;

    // 2. For each sector, get solicitudes and recetas for this month
    const result = await Promise.all(
      sectores.map(async (sec) => {
        const dateFrom = `${yearStr}-${monthStr}-01`;
        const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
        const dateTo = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

        // Solicitudes filtered by date range
        const { data: solicitudes } = await supabase
          .schema('siracusa')
          .from('solicitudes_riego')
          .select('*')
          .eq('id_sector', sec.id)
          .eq('active', true)
          .gte('fecha_riego', dateFrom)
          .lte('fecha_riego', dateTo)
          .order('fecha_riego');

        // Recetas for this sector/month
        const { data: recetasRaw } = await supabase
          .schema('siracusa')
          .from('recetas_sector')
          .select('*, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)')
          .eq('id_sector', sec.id)
          .eq('mes', mes)
          .eq('anio', anio);

        // Flatten recetas fertilizantes join
        const recetas = (recetasRaw || []).map((r) => ({
          ...r,
          fert_name: r.fertilizantes?.name,
          N: r.fertilizantes?.N,
          P2O5: r.fertilizantes?.P2O5,
          K2O: r.fertilizantes?.K2O,
          CaO: r.fertilizantes?.CaO,
          MgO: r.fertilizantes?.MgO,
          Zn: r.fertilizantes?.Zn,
          B2O3: r.fertilizantes?.B2O3,
          S: r.fertilizantes?.S,
          fertilizantes: undefined,
        }));

        return {
          ...sec,
          equipo_name: sec.equipos?.name,
          equipos: undefined,
          solicitudes: solicitudes || [],
          recetas,
        };
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
