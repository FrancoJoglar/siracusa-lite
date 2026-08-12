import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/sectores?id_equipo=X → list
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

      const { data, error } = await query.order('id');

      if (error) throw error;

      // Flatten equipos.name to equipo_name
      const result = data.map((s) => ({
        ...s,
        equipo_name: s.equipos?.name,
        equipos: undefined,
      }));

      return res.status(200).json(result);
    }

    // POST /api/sectores → create
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

    const { id } = req.query;

    // PUT /api/sectores?id=X → update
    if (req.method === 'PUT' && id) {
      const { name, has_hectareas, variedad, m3_ha_hr } = req.body;

      const update = {};
      if (name !== undefined) update.name = name;
      if (has_hectareas !== undefined) update.has_hectareas = has_hectareas;
      if (variedad !== undefined) update.variedad = variedad;
      if (m3_ha_hr !== undefined) update.m3_ha_hr = m3_ha_hr;

      const { data, error } = await supabase
        .schema('siracusa')
        .from('sectores')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // DELETE /api/sectores?id=X → soft delete
    if (req.method === 'DELETE' && id) {
      // Check for active solicitudes first
      const { data: sols, error: solErr } = await supabase
        .schema('siracusa')
        .from('solicitudes_riego')
        .select('id')
        .eq('id_sector', id)
        .eq('active', true)
        .limit(1);

      if (solErr) throw solErr;

      if (sols && sols.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar: tiene solicitudes de riego activas',
        });
      }

      const { error } = await supabase
        .schema('siracusa')
        .from('sectores')
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
