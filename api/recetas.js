import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/recetas?view=grid → grid view (id_equipo required)
    if (req.method === 'GET' && req.query.view === 'grid') {
      const { id_equipo, mes, anio } = req.query;

      if (!id_equipo || !mes || !anio) {
        return res.status(400).json({ error: 'id_equipo, mes, anio required for grid view' });
      }

      const { data: recetas, error: recErr } = await supabase
        .schema('siracusa')
        .from('recetas')
        .select('*, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)')
        .eq('id_sector', id_equipo)
        .eq('mes', mes)
        .eq('anio', anio);

      if (recErr) throw recErr;

      const result = recetas.map((r) => ({
        ...r,
        fert_name: r.fertilizantes?.name,
        N: r.fertilizantes?.N,
        P2O5: r.fertilizantes?.P2O5,
        K2O: r.fertilizantes?.K2O,
        CaO: r.fertilizantes?.CaO,
        MgO: r.fertilizantes?.MgO,
        Zn: r.fertilizantes?.Zn,
        B2O3: r.fertilizantes?.B2O3,
        S: r.fertilizantes?.S,
        fertilizantes: undefined,
      }));

      return res.status(200).json(result);
    }

    // GET /api/recetas?id_sector=X&mes=X&anio=X → list
    if (req.method === 'GET') {
      const { id_sector, mes, anio } = req.query;

      let query = supabase
        .schema('siracusa')
        .from('recetas')
        .select('*, fertilizantes!inner(name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)');

      if (id_sector) query = query.eq('id_sector', id_sector);
      if (mes) query = query.eq('mes', mes);
      if (anio) query = query.eq('anio', anio);

      const { data, error } = await query;

      if (error) throw error;

      // Flatten fertilizantes join
      const result = data.map((r) => ({
        ...r,
        fert_name: r.fertilizantes?.name,
        N: r.fertilizantes?.N,
        P2O5: r.fertilizantes?.P2O5,
        K2O: r.fertilizantes?.K2O,
        CaO: r.fertilizantes?.CaO,
        MgO: r.fertilizantes?.MgO,
        Zn: r.fertilizantes?.Zn,
        B2O3: r.fertilizantes?.B2O3,
        S: r.fertilizantes?.S,
        fertilizantes: undefined,
      }));

      return res.status(200).json(result);
    }

    // POST /api/recetas?bulk=true → bulk upsert
    if (req.method === 'POST' && req.query.bulk === 'true') {
      const { id_sector, mes, anio, fertilizantes } = req.body;

      if (!id_sector || !mes || !anio || !fertilizantes?.length) {
        return res.status(400).json({ error: 'id_sector, mes, anio, and fertilizantes are required' });
      }

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
    }

    // POST /api/recetas → create (upsert single)
    if (req.method === 'POST') {
      const { id_sector, id_fertilizante, mes, anio, kilos_maximo } = req.body;

      // Try insert first
      const { error: insertErr } = await supabase
        .schema('siracusa')
        .from('recetas')
        .insert({
          id_sector,
          id_fertilizante,
          mes,
          anio,
          kilos_maximo: kilos_maximo ?? 0,
        });

      if (insertErr) {
        // UNIQUE conflict → update
        if (insertErr.code === '23505') {
          const { error: updateErr } = await supabase
            .schema('siracusa')
            .from('recetas')
            .update({ kilos_maximo })
            .eq('id_sector', id_sector)
            .eq('id_fertilizante', id_fertilizante)
            .eq('mes', mes)
            .eq('anio', anio);

          if (updateErr) throw updateErr;
          return res.status(200).json({ updated: true });
        }
        throw insertErr;
      }

      return res.status(201).json({ created: true });
    }

    const { id } = req.query;

    // PUT /api/recetas?id=X → update (not in original but useful)
    if (req.method === 'PUT' && id) {
      const { kilos_maximo } = req.body;

      const { data, error } = await supabase
        .schema('siracusa')
        .from('recetas')
        .update({ kilos_maximo })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    // DELETE /api/recetas?id=X → delete
    if (req.method === 'DELETE' && id) {
      const { error } = await supabase
        .schema('siracusa')
        .from('recetas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
