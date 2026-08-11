import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { id_sector, mes, anio } = req.query;

      let query = supabase
        .schema('siracusa')
        .from('recetas')
        .select('*, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)');

      if (id_sector) query = query.eq('id_sector', id_sector);
      if (mes) query = query.eq('mes', mes);
      if (anio) query = query.eq('anio', anio);

      const { data, error } = await query;

      if (error) throw error;

      // Flatten fertilizantes join
      const result = data.map((r) => ({
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
    }

    if (req.method === 'POST') {
      const { id_sector, id_fertilizante, mes, anio, kilos_maximo } = req.body;

      // Try insert first
      const { error: insertErr } = await supabase
        .schema('siracusa')
        .from('recetas')
        .insert({
          id_sector,
          id_fertilizante,
          mes,
          anio,
          kilos_maximo: kilos_maximo ?? 0,
        });

      if (insertErr) {
        // UNIQUE conflict → update
        if (insertErr.code === '23505') {
          const { error: updateErr } = await supabase
            .schema('siracusa')
            .from('recetas')
            .update({ kilos_maximo })
            .eq('id_sector', id_sector)
            .eq('id_fertilizante', id_fertilizante)
            .eq('mes', mes)
            .eq('anio', anio);

          if (updateErr) throw updateErr;
          return res.status(200).json({ updated: true });
        }
        throw insertErr;
      }

      return res.status(201).json({ created: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
