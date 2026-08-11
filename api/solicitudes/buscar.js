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

  const { fecha, id_sector } = req.query;

  if (!fecha || !id_sector) {
    return res.status(200).json(null);
  }

  try {
    const { data, error } = await supabase
      .schema('siracusa')
      .from('solicitudes_riego')
      .select('*, sectores!inner(name, id_equipo, has_hectareas, variedad, equipos!inner(name))')
      .eq('fecha_riego', fecha)
      .eq('id_sector', id_sector)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(200).json(null);
    }

    const result = {
      ...data,
      sector_name: data.sectores?.name,
      equipo_name: data.sectores?.equipos?.name,
      has_hectareas: data.sectores?.has_hectareas,
      variedad: data.sectores?.variedad,
      sectores: undefined,
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
