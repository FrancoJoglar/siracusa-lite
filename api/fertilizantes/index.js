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
      const { data, error } = await supabase
        .schema('siracusa')
        .from('fertilizantes')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, formula, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const { data, error } = await supabase
        .schema('siracusa')
        .from('fertilizantes')
        .insert({
          name,
          formula: formula ?? '',
          N: N ?? 0,
          P2O5: P2O5 ?? 0,
          K2O: K2O ?? 0,
          CaO: CaO ?? 0,
          MgO: MgO ?? 0,
          Zn: Zn ?? 0,
          B2O3: B2O3 ?? 0,
          S: S ?? 0,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
