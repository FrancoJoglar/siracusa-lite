import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { view, id_equipo, variedad, semana_numero, semana_inicio, semana_fin, id } = req.query;

    // GET /api/consumo?view=equipos_variedades → list equipos with variedades
    if (req.method === 'GET' && view === 'equipos_variedades') {
      const { data, error } = await supabase
        .schema('siracusa')
        .rpc('get_equipos_con_variedades');

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // GET /api/consumo?view=sectores&id_equipo=X&variedad=Y → sectors by equipo-variedad
    if (req.method === 'GET' && view === 'sectores' && id_equipo && variedad) {
      const { data, error } = await supabase
        .schema('siracusa')
        .rpc('get_sectores_by_equipo_variedad', { 
          equipo_id: parseInt(id_equipo), 
          variedad_name: variedad 
        });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // GET /api/consumo?view=solicitudes&id_equipo=X&variedad=Y&semana_inicio=Z&semana_fin=W
    if (req.method === 'GET' && view === 'solicitudes' && id_equipo && variedad && semana_inicio && semana_fin) {
      const { data, error } = await supabase
        .schema('siracusa')
        .rpc('get_solicitudes_by_equipo_variedad_semana', {
          equipo_id: parseInt(id_equipo),
          variedad_name: variedad,
          fecha_inicio: semana_inicio,
          fecha_fin: semana_fin,
        });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // GET /api/consumo?view=consumo&id_equipo=X&variedad=Y&semana_numero=Z
    if (req.method === 'GET' && view === 'consumo' && id_equipo && variedad && semana_numero) {
      const { data: consumos, error } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .select('*, fertilizantes!inner(name)')
        .eq('id_equipo', parseInt(id_equipo))
        .eq('variedad', variedad)
        .eq('semana_numero', parseInt(semana_numero));

      if (error) throw error;

      // Get distribution for each consumption
      const consumosWithDist = [];
      for (const c of consumos || []) {
        const { data: dist } = await supabase
          .schema('siracusa')
          .from('consumo_distribucion')
          .select('*, sectores!inner(name)')
          .eq('id_consumo', c.id);

        consumosWithDist.push({
          ...c,
          fertilizante_name: c.fertilizantes?.name,
          distribucion: dist || [],
        });
      }

      return res.status(200).json(consumosWithDist);
    }

    // GET /api/consumo?view=historial&id_equipo=X&variedad=Y → consumption history
    if (req.method === 'GET' && view === 'historial' && id_equipo && variedad) {
      const { data, error } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .select('*, fertilizantes!inner(name)')
        .eq('id_equipo', parseInt(id_equipo))
        .eq('variedad', variedad)
        .order('semana_inicio', { ascending: false })
        .limit(52);

      if (error) throw error;

      const result = (data || []).map(c => ({
        ...c,
        fertilizante_name: c.fertilizantes?.name,
      }));

      return res.status(200).json(result);
    }

    // GET /api/consumo?view=log&id=X → get log for consumption
    if (req.method === 'GET' && view === 'log' && id) {
      const { data, error } = await supabase
        .schema('siracusa')
        .from('consumo_log')
        .select('*')
        .eq('id_consumo', parseInt(id))
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // POST /api/consumo → create consumption
    if (req.method === 'POST') {
      const { id_equipo, variedad, semana_numero, semana_inicio, semana_fin, id_fertilizante, kilos_consumidos } = req.body;

      if (!id_equipo || !variedad || !semana_numero || !semana_inicio || !semana_fin || !id_fertilizante || kilos_consumidos === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get user
      const authHeader = req.headers.authorization;
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Upsert consumption
      const { data: consumo, error: consErr } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .upsert({
          id_equipo: parseInt(id_equipo),
          variedad,
          semana_numero: parseInt(semana_numero),
          semana_inicio,
          semana_fin,
          id_fertilizante: parseInt(id_fertilizante),
          kilos_consumidos,
          created_by: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id_equipo,variedad,semana_numero,id_fertilizante' })
        .select()
        .single();

      if (consErr) throw consErr;

      // Calculate distribution
      await calculateDistribution(consumo, parseInt(id_equipo), variedad, semana_inicio, semana_fin);

      // Log the creation
      await supabase
        .schema('siracusa')
        .from('consumo_log')
        .insert({
          id_consumo: consumo.id,
          accion: 'create',
          datos_nuevos: { id_equipo, variedad, semana_numero, semana_inicio, semana_fin, id_fertilizante, kilos_consumidos },
          changed_by: userId,
        });

      return res.status(201).json(consumo);
    }

    // PUT /api/consumo?id=X → update consumption
    if (req.method === 'PUT' && id) {
      const { kilos_consumidos } = req.body;

      // Get current data for log
      const { data: current } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      // Get user
      const authHeader = req.headers.authorization;
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Update
      const { data: updated, error: updErr } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .update({
          kilos_consumidos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parseInt(id))
        .select()
        .single();

      if (updErr) throw updErr;

      // Recalculate distribution
      await calculateDistribution(updated, current.id_equipo, current.variedad, current.semana_inicio, current.semana_fin);

      // Log the update
      await supabase
        .schema('siracusa')
        .from('consumo_log')
        .insert({
          id_consumo: parseInt(id),
          accion: 'update',
          datos_anteriores: current,
          datos_nuevos: updated,
          changed_by: userId,
        });

      return res.status(200).json(updated);
    }

    // DELETE /api/consumo?id=X → delete consumption
    if (req.method === 'DELETE' && id) {
      // Get current data for log
      const { data: current } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      // Get user
      const authHeader = req.headers.authorization;
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Delete distribution first
      await supabase
        .schema('siracusa')
        .from('consumo_distribucion')
        .delete()
        .eq('id_consumo', parseInt(id));

      // Delete consumption
      const { error: delErr } = await supabase
        .schema('siracusa')
        .from('consumo_fertilizante')
        .delete()
        .eq('id', parseInt(id));

      if (delErr) throw delErr;

      // Log the deletion
      await supabase
        .schema('siracusa')
        .from('consumo_log')
        .insert({
          id_consumo: parseInt(id),
          accion: 'delete',
          datos_anteriores: current,
          changed_by: userId,
        });

      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in consumo API:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Helper: Calculate distribution among sectors
async function calculateDistribution(consumo, id_equipo, variedad, semana_inicio, semana_fin) {
  // Get fertilizante name
  const { data: fert } = await supabase
    .schema('siracusa')
    .from('fertilizantes')
    .select('name')
    .eq('id', consumo.id_fertilizante)
    .single();

  if (!fert) return;

  // Get solicitudes for this equipo-variedad-week
  const { data: solicitudes } = await supabase
    .schema('siracusa')
    .rpc('get_solicitudes_by_equipo_variedad_semana', {
      equipo_id: id_equipo,
      variedad_name: variedad,
      fecha_inicio: semana_inicio,
      fecha_fin: semana_fin,
    });

  // Filter for this fertilizante
  const solsForFert = (solicitudes || []).filter(s => s.fertilizante_name === fert.name);

  // Delete existing distribution
  await supabase
    .schema('siracusa')
    .from('consumo_distribucion')
    .delete()
    .eq('id_consumo', consumo.id);

  if (solsForFert.length === 0) return;

  // Calculate total requested
  const totalSolicitado = solsForFert.reduce((sum, s) => sum + (parseFloat(s.kilos_solicitados) || 0), 0);

  if (totalSolicitado === 0) return;

  // Distribute proportionally
  const distribucion = solsForFert.map(s => {
    const solicitado = parseFloat(s.kilos_solicitados) || 0;
    const proporcion = solicitado / totalSolicitado;
    const asignados = parseFloat(consumo.kilos_consumidos) * proporcion;

    return {
      id_consumo: consumo.id,
      id_sector: s.sector_id,
      kilos_asignados: Math.round(asignados * 100) / 100,
      kilos_solicitados: solicitado,
    };
  });

  // Insert distribution
  if (distribucion.length > 0) {
    await supabase
      .schema('siracusa')
      .from('consumo_distribucion')
      .insert(distribucion);
  }
}
