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

    if (req.method === 'DELETE') {
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
