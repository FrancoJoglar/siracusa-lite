import { supabase } from '../lib/supabase.js';

// Map frontend fert_key names to DB fertilizer names for ID lookup
const FERT_KEY_TO_NAME = {
  fert_sulfato_zn: 'Sulfato Zinc',
  fert_nitrato_amo: 'Nitrato Amonio',
  fert_nitrato_ca: 'Nitrato Calcio',
  fert_cloruro_k: 'Cloruro Potasio',
  fert_acido_boro: 'Acido Borico',
  fert_sulfato_mg: 'Sulfato Magnesio',
  fert_fma: 'FMA',
  fert_urea: 'Urea',
};

let fertIdMap = null;
async function getFertIdMap() {
  if (fertIdMap) return fertIdMap;
  const { data } = await supabase.schema('siracusa').from('fertilizantes').select('id, name');
  fertIdMap = {};
  (data || []).forEach(f => { fertIdMap[f.name] = f.id; });
  return fertIdMap;
}

async function resolveFertId(d) {
  // If id_fertilizante is already provided, use it
  if (d.id_fertilizante) return parseInt(d.id_fertilizante);
  // If fert_key is provided, resolve to ID
  if (d.fert_key) {
    const map = await getFertIdMap();
    const name = FERT_KEY_TO_NAME[d.fert_key] || d.fert_name;
    return map[name] || null;
  }
  // If fert_name is provided, resolve to ID
  if (d.fert_name) {
    const map = await getFertIdMap();
    return map[d.fert_name] || null;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { view, id, temporada, id_equipo, id_sector, id_receta } = req.query;

    // ─── CATALOG ────────────────────────────────────────────────────────
    // GET /api/recetas?view=catalog&temporada=X
    if (req.method === 'GET' && view === 'catalog') {
      let query = supabase
        .schema('siracusa')
        .from('recetas')
        .select('*')
        .order('nombre');

      if (temporada) query = query.eq('temporada', temporada);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST /api/recetas?view=catalog
    // Body: { nombre, tipo_cultivo, temporada, descripcion, detalles: [{mes, id_fertilizante, kilos_plan}] }
    if (req.method === 'POST' && view === 'catalog') {
      const { nombre, tipo_cultivo, temporada, descripcion, detalles } = req.body;

      if (!nombre || !temporada || !detalles?.length) {
        return res.status(400).json({ error: 'nombre, temporada, and detalles[] are required' });
      }

      // Insert receta
      const { data: receta, error: recErr } = await supabase
        .schema('siracusa')
        .from('recetas')
        .insert({
          nombre,
          tipo_cultivo: tipo_cultivo ?? '',
          temporada,
          descripcion: descripcion ?? '',
        })
        .select()
        .single();

      if (recErr) throw recErr;

      // Insert all detalles
      const rows = [];
      for (const d of detalles) {
        const fertId = await resolveFertId(d);
        if (fertId) {
          rows.push({ id_receta: receta.id, mes: d.mes, id_fertilizante: fertId, kilos_plan: d.kilos_plan ?? 0 });
        }
      }

      const { error: detErr } = await supabase
        .schema('siracusa')
        .from('receta_detalle')
        .insert(rows);

      if (detErr) throw detErr;

      return res.status(201).json({ ...receta, detalles: rows });
    }

    // PUT /api/recetas?view=catalog&id=X
    // Body: { nombre, tipo_cultivo, temporada, descripcion, detalles: [{mes, id_fertilizante, kilos_plan}] }
    if (req.method === 'PUT' && view === 'catalog' && id) {
      const { nombre, tipo_cultivo, temporada, descripcion, detalles } = req.body;

      if (!detalles?.length) {
        return res.status(400).json({ error: 'detalles[] are required' });
      }

      // Update receta header
      const update = {};
      if (nombre !== undefined) update.nombre = nombre;
      if (tipo_cultivo !== undefined) update.tipo_cultivo = tipo_cultivo;
      if (temporada !== undefined) update.temporada = temporada;
      if (descripcion !== undefined) update.descripcion = descripcion;

      if (Object.keys(update).length > 0) {
        const { error: uErr } = await supabase
          .schema('siracusa')
          .from('recetas')
          .update(update)
          .eq('id', id);
        if (uErr) throw uErr;
      }

      // Delete old detalles
      const { error: delErr } = await supabase
        .schema('siracusa')
        .from('receta_detalle')
        .delete()
        .eq('id_receta', id);
      if (delErr) throw delErr;

      // Insert new detalles
      const rows = [];
      for (const d of detalles) {
        const fertId = await resolveFertId(d);
        if (fertId) {
          rows.push({ id_receta: parseInt(id), mes: d.mes, id_fertilizante: fertId, kilos_plan: d.kilos_plan ?? 0 });
        }
      }

      const { error: insErr } = await supabase
        .schema('siracusa')
        .from('receta_detalle')
        .insert(rows);
      if (insErr) throw insErr;

      return res.status(200).json({ updated: true, detalles: rows });
    }

    // DELETE /api/recetas?view=catalog&id=X
    if (req.method === 'DELETE' && view === 'catalog' && id) {
      const { error } = await supabase
        .schema('siracusa')
        .from('recetas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    // ─── ASIGNACIONES ───────────────────────────────────────────────────
    // GET /api/recetas?view=asignaciones&id_equipo=X
    if (req.method === 'GET' && view === 'asignaciones') {
      if (!id_equipo) {
        return res.status(400).json({ error: 'id_equipo is required' });
      }

      const { data: sectores, error: secErr } = await supabase
        .schema('siracusa')
        .from('sectores')
        .select('id, name')
        .eq('id_equipo', id_equipo)
        .eq('active', true)
        .order('name');

      if (secErr) throw secErr;

      const sectorIds = sectores.map((sec) => sec.id);

      // One query for all active assignments in this equipo
      const { data: assignments, error: asgErr } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .select('id_sector, fecha_asignacion, recetas!inner(id, nombre)')
        .in('id_sector', sectorIds)
        .eq('activo', true);

      if (asgErr) throw asgErr;

      const assignmentBySector = new Map();
      for (const a of assignments || []) assignmentBySector.set(a.id_sector, a);

      const result = sectores.map((sec) => {
        const assignment = assignmentBySector.get(sec.id);
        return {
          sector_id: sec.id,
          sector_name: sec.name,
          receta_id: assignment?.recetas?.id ?? null,
          receta_nombre: assignment?.recetas?.nombre ?? null,
          fecha_asignacion: assignment?.fecha_asignacion ?? null,
        };
      });

      return res.status(200).json(result);
    }

    // ─── ASIGNAR ────────────────────────────────────────────────────────
    // POST /api/recetas?view=asignar
    // Body: { id_sector, id_receta, motivo }
    if (req.method === 'POST' && view === 'asignar') {
      const { id_sector, id_receta, motivo } = req.body;

      if (!id_sector || !id_receta) {
        return res.status(400).json({ error: 'id_sector and id_receta are required' });
      }

      // Fetch new receta name
      const { data: nuevaReceta } = await supabase
        .schema('siracusa')
        .from('recetas')
        .select('nombre')
        .eq('id', id_receta)
        .single();

      // Get current active assignment for the log
      const { data: current } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .select('id_receta')
        .eq('id_sector', id_sector)
        .eq('activo', true)
        .maybeSingle();

      const id_receta_anterior = current?.id_receta ?? null;
      let receta_anterior_nombre = null;
      if (id_receta_anterior) {
        const { data: antRec } = await supabase
          .schema('siracusa')
          .from('recetas')
          .select('nombre')
          .eq('id', id_receta_anterior)
          .single();
        receta_anterior_nombre = antRec?.nombre ?? null;
      }

      // 1. Keep one technical assignment row per sector. Historical changes
      // are stored in receta_change_log.
      const { error: deactErr } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .delete()
        .eq('id_sector', id_sector);
      if (deactErr) throw deactErr;

      // 2. Insert new assignment
      const { data: newAssign, error: insErr } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .insert({
          id_sector,
          id_receta,
          fecha_asignacion: new Date().toISOString(),
          activo: true,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // 3. Log the change
      const { error: logErr } = await supabase
        .schema('siracusa')
        .from('receta_change_log')
        .insert({
          id_sector,
          id_receta_anterior: id_receta_anterior,
          id_receta_nueva: id_receta,
          receta_anterior_nombre: receta_anterior_nombre,
          receta_nueva_nombre: nuevaReceta?.nombre || '',
          fecha_cambio: new Date().toISOString(),
          motivo: motivo ?? '',
        });
      if (logErr) throw logErr;

      return res.status(201).json({ assigned: true, assignment: newAssign });
    }

    // ─── CAMBIAR ────────────────────────────────────────────────────────
    // POST /api/recetas?view=cambiar
    // Body: { id_sector, id_receta_nueva, motivo }
    if (req.method === 'POST' && view === 'cambiar') {
      const { id_sector, id_receta_nueva, motivo } = req.body;

      if (!id_sector || !id_receta_nueva) {
        return res.status(400).json({ error: 'id_sector and id_receta_nueva are required' });
      }

      // Get current active assignment
      const { data: current } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .select('id_receta')
        .eq('id_sector', id_sector)
        .eq('activo', true)
        .maybeSingle();

      const id_receta_anterior = current?.id_receta ?? null;

      // If same receta, nothing to change
      if (id_receta_anterior == id_receta_nueva) {
        return res.status(200).json({ assigned: true, message: 'Receta sin cambios' });
      }

      let receta_anterior_nombre = null;
      if (id_receta_anterior) {
        const { data: antRec } = await supabase
          .schema('siracusa')
          .from('recetas')
          .select('nombre')
          .eq('id', id_receta_anterior)
          .single();
        receta_anterior_nombre = antRec?.nombre ?? null;
      }

      // Get new receta name
      const { data: nuevaReceta } = await supabase
        .schema('siracusa')
        .from('recetas')
        .select('nombre')
        .eq('id', id_receta_nueva)
        .single();

      // 1. Remove technical assignment rows for this sector.
      // The durable history lives in receta_change_log; keeping one active
      // row avoids conflicts with the legacy UNIQUE constraint.
      const { error: deactErr } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .delete()
        .eq('id_sector', id_sector);
      if (deactErr) throw deactErr;

      // 2. Reuse an existing historical row when possible. This avoids
      // conflicts with the UNIQUE(id_sector, id_receta, activo) constraint.
      const { data: historical } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .select('*')
        .eq('id_sector', id_sector)
        .eq('id_receta', id_receta_nueva)
        .eq('activo', false)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      let newAssign;
      let insErr;
      if (historical) {
        const result = await supabase
          .schema('siracusa')
          .from('sector_receta')
          .update({ activo: true, fecha_asignacion: new Date().toISOString() })
          .eq('id', historical.id)
          .select()
          .single();
        newAssign = result.data;
        insErr = result.error;
      } else {
        const result = await supabase
          .schema('siracusa')
          .from('sector_receta')
          .insert({
            id_sector,
            id_receta: id_receta_nueva,
            fecha_asignacion: new Date().toISOString(),
            activo: true,
          })
          .select()
          .single();
        newAssign = result.data;
        insErr = result.error;
      }
      if (insErr) throw insErr;

      // 3. Log the change
      const { error: logErr } = await supabase
        .schema('siracusa')
        .from('receta_change_log')
        .insert({
          id_sector,
          id_receta_anterior,
          id_receta_nueva,
          receta_anterior_nombre,
          receta_nueva_nombre: nuevaReceta?.nombre ?? null,
          fecha_cambio: new Date().toISOString(),
          motivo: motivo ?? '',
        });
      if (logErr) throw logErr;

      return res.status(201).json({ changed: true, assignment: newAssign });
    }

    // ─── LOG ────────────────────────────────────────────────────────────
    // GET /api/recetas?view=log&id_sector=X
    if (req.method === 'GET' && view === 'log') {
      if (!id_sector) {
        return res.status(400).json({ error: 'id_sector is required' });
      }

      const { data, error } = await supabase
        .schema('siracusa')
        .from('receta_change_log')
        .select('*')
        .eq('id_sector', id_sector)
        .order('fecha_cambio', { ascending: false })
        .limit(10);

      if (error) throw error;
      return res.status(200).json(data);
    }

    // ─── DETALLE ────────────────────────────────────────────────────────
    // GET /api/recetas?view=detalle&id_receta=X
    if (req.method === 'GET' && view === 'detalle') {
      if (!id_receta) {
        return res.status(400).json({ error: 'id_receta is required' });
      }

      const { data, error } = await supabase
        .schema('siracusa')
        .from('receta_detalle')
        .select('*, fertilizantes!inner(id, name, N, P2O5, K2O, CaO, MgO, Zn, B2O3, S)')
        .eq('id_receta', id_receta)
        .order('mes');

      if (error) throw error;

      // Flatten
      const result = data.map((d) => ({
        id: d.id,
        id_receta: d.id_receta,
        mes: d.mes,
        id_fertilizante: d.id_fertilizante,
        kilos_plan: d.kilos_plan,
        fert_name: d.fertilizantes?.name,
        N: d.fertilizantes?.N,
        P2O5: d.fertilizantes?.P2O5,
        K2O: d.fertilizantes?.K2O,
        CaO: d.fertilizantes?.CaO,
        MgO: d.fertilizantes?.MgO,
        Zn: d.fertilizantes?.Zn,
        B2O3: d.fertilizantes?.B2O3,
        S: d.fertilizantes?.S,
      }));

      return res.status(200).json(result);
    }

    // ─── RESUMEN ────────────────────────────────────────────────────────
    // GET /api/recetas?view=resumen&id_equipo=X&anio=X
    if (req.method === 'GET' && view === 'resumen') {
      if (!id_equipo || !anio) {
        return res.status(400).json({ error: 'id_equipo and anio are required' });
      }

      // Season: Sept of anio → Apr of anio+1
      const seasonStart = `${anio}-09-01`;
      const seasonEnd = `${parseInt(anio) + 1}-04-30`;

      const { data: sectores, error: secErr } = await supabase
        .schema('siracusa')
        .from('sectores')
        .select('id, name')
        .eq('id_equipo', id_equipo)
        .eq('active', true)
        .order('name');

      if (secErr) throw secErr;

      const sectorIds = (sectores || []).map((sec) => sec.id);
      if (!sectorIds.length) return res.status(200).json([]);

      // 1. Active assignments for all sectors (one query)
      const { data: assignments, error: asgErr } = await supabase
        .schema('siracusa')
        .from('sector_receta')
        .select('id_sector, id_receta, recetas!inner(id, nombre)')
        .in('id_sector', sectorIds)
        .eq('activo', true);
      if (asgErr) throw asgErr;

      const assignmentBySector = new Map();
      const recetaIds = [];
      for (const a of assignments || []) {
        assignmentBySector.set(a.id_sector, a);
        if (a.id_receta) recetaIds.push(a.id_receta);
      }

      // 2. All detalles for assigned recetas (one query)
      const detallesByReceta = new Map();
      if (recetaIds.length) {
        const { data: detalles, error: detErr } = await supabase
          .schema('siracusa')
          .from('receta_detalle')
          .select('id_receta, kilos_plan, fertilizantes!inner(name)')
          .in('id_receta', recetaIds);
        if (detErr) throw detErr;
        for (const d of detalles || []) {
          const list = detallesByReceta.get(d.id_receta) || [];
          list.push(d);
          detallesByReceta.set(d.id_receta, list);
        }
      }

      // 3. Season solicitudes for all sectors (one query)
      const { data: solicitudes, error: solErr } = await supabase
        .schema('siracusa')
        .from('solicitudes_riego')
        .select('id_sector, fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k, fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea')
        .in('id_sector', sectorIds)
        .eq('active', true)
        .gte('fecha_riego', seasonStart)
        .lte('fecha_riego', seasonEnd);
      if (solErr) throw solErr;

      const solsBySector = new Map();
      for (const s of solicitudes || []) {
        const list = solsBySector.get(s.id_sector) || [];
        list.push(s);
        solsBySector.set(s.id_sector, list);
      }

      const FERT_MAP = {
        fert_sulfato_zn: 'Sulfato Zn',
        fert_nitrato_amo: 'Nitrato Amonio',
        fert_nitrato_ca: 'Nitrato Calcio',
        fert_cloruro_k: 'Cloruro K',
        fert_acido_boro: 'Acido Borico',
        fert_sulfato_mg: 'Sulfato Mg',
        fert_fma: 'FMA',
        fert_urea: 'Urea',
      };

      const result = sectores.map((sec) => {
        const assignment = assignmentBySector.get(sec.id);

        // Aggregate receta totals
        const agg = {};
        for (const d of detallesByReceta.get(assignment?.id_receta) || []) {
          const name = d.fertilizantes?.name;
          if (!name) continue;
          if (!agg[name]) agg[name] = 0;
          agg[name] += d.kilos_plan;
        }
        const receta_totals = Object.entries(agg).map(([fert_name, kilos_total]) => ({
          fert_name,
          kilos_total,
        }));

        // Aggregate applied amounts
        const applied_agg = {};
        for (const sol of solsBySector.get(sec.id) || []) {
          for (const [col, name] of Object.entries(FERT_MAP)) {
            const val = parseFloat(sol[col]) || 0;
            if (val > 0) {
              if (!applied_agg[name]) applied_agg[name] = 0;
              applied_agg[name] += val;
            }
          }
        }
        const applied_totals = Object.entries(applied_agg).map(([fert_name, kilos_aplicados]) => ({
          fert_name,
          kilos_aplicados,
        }));

        return {
          sector_id: sec.id,
          sector_name: sec.name,
          receta_id: assignment?.recetas?.id ?? null,
          receta_nombre: assignment?.recetas?.nombre ?? null,
          receta_totals,
          applied_totals,
        };
      });

      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
