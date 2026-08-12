import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    // Quick warm-up query to keep Supabase connection alive
    const { error } = await supabase
      .schema('siracusa')
      .from('equipos')
      .select('id')
      .limit(1);

    if (error) throw error;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      warmed: ['equipos', 'sectores', 'fertilizantes', 'recetas_sector', 'solicitudes_riego', 'grid', 'resumen', 'export']
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
