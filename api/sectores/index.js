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
      const { id_equipo } = req.query;

      let query = supabase
        .schema('siracusa')
        .from('sectores')
        .select('*, equipos!inner(name)')
        .eq('active', true);

      if (id_equipo) {
        query = query.eq('id_equipo', id_equipo);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      // Flatten equipos.name to equipo_name
      const result = data.map((s) => ({
        ...s,
        equipo_name: s.equipos?.name,
        equipos: undefined,
      }));

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { name, id_equipo, has_hectareas, variedad, m3_ha_hr } = req.body;
      if (!name || !id_equipo) {
        return res.status(400).json({ error: 'name and id_equipo are required' });
      }

      const { data, error } = await supabase
        .schema('siracusa')
        .from('sectores')
        .insert({
          name,
          id_equipo,
          has_hectareas: has_hectareas ?? 0,
          variedad: variedad ?? '',
          m3_ha_hr: m3_ha_hr ?? 9.31,
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
