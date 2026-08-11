import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const { name, formula, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S } = req.body;

      const update = {};
      if (name !== undefined) update.name = name;
      if (formula !== undefined) update.formula = formula;
      if (N !== undefined) update.N = N;
      if (P2O5 !== undefined) update.P2O5 = P2O5;
      if (K2O !== undefined) update.K2O = K2O;
      if (CaO !== undefined) update.CaO = CaO;
      if (MgO !== undefined) update.MgO = MgO;
      if (Zn !== undefined) update.Zn = Zn;
      if (B2O3 !== undefined) update.B2O3 = B2O3;
      if (S !== undefined) update.S = S;

      const { data, error } = await supabase
        .schema('siracusa')
        .from('fertilizantes')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .schema('siracusa')
        .from('fertilizantes')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
