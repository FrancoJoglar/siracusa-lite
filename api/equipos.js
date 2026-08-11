import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/equipos → list
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .schema('siracusa')
        .from('equipos')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST /api/equipos → create
    if (req.method === 'POST') {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const { data, error } = await supabase
        .schema('siracusa')
        .from('equipos')
        .insert({ name, active: true })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    const { id } = req.query;

    // PUT /api/equipos?id=X → update
    if (req.method === 'PUT' && id) {
      const { name } = req.body;

      const { data, error } = await supabase
        .schema('siracusa')
        .from('equipos')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // DELETE /api/equipos?id=X → soft delete
    if (req.method === 'DELETE' && id) {
      // Check for active sectors first
      const { data: sectors, error: secErr } = await supabase
        .schema('siracusa')
        .from('sectores')
        .select('id')
        .eq('id_equipo', id)
        .eq('active', true)
        .limit(1);

      if (secErr) throw secErr;

      if (sectors && sectors.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar: tiene sectores activos asociados',
        });
      }

      const { error } = await supabase
        .schema('siracusa')
        .from('equipos')
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
