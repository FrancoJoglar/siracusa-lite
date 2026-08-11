import { supabase } from '../../lib/supabase.js';

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

  const { id_sector, mes, anio } = req.query;

  if (!id_sector || !mes || !anio) {
    return res.status(400).json({ error: 'id_sector, mes, anio required' });
  }

  try {
    // Get all recetas for this sector/month
    const { data: recetas, error: recErr } = await supabase
      .schema('siracusa')
      .from('recetas')
      .select('*, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)')
      .eq('id_sector', id_sector)
      .eq('mes', mes)
      .eq('anio', anio);

    if (recErr) throw recErr;

    const result = recetas.map((r) => ({
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

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
