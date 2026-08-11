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

    if (req.method === 'DELETE') {
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
