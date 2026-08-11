import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id_sector, mes, anio, fertilizantes } = req.body;

  if (!id_sector || !mes || !anio || !fertilizantes?.length) {
    return res.status(400).json({ error: 'id_sector, mes, anio, and fertilizantes are required' });
  }

  try {
    // Build rows for bulk upsert
    const rows = fertilizantes.map((f) => ({
      id_sector,
      id_fertilizante: f.id,
      mes,
      anio,
      kilos_maximo: f.kilos_maximo ?? 0,
    }));

    const { data, error } = await supabase
      .schema('siracusa')
      .from('recetas')
      .upsert(rows, {
        onConflict: 'id_sector,id_fertilizante,mes,anio',
        ignoreDuplicates: false,
      });

    if (error) throw error;
    return res.status(200).json({ saved: fertilizantes.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
