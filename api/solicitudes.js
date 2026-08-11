import { supabase } from '../lib/supabase.js';

const FERT_MAX = 999;
function clampFert(v) {
  return Math.min(Math.max(parseFloat(v) || 0, 0), FERT_MAX);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET /api/solicitudes?search=true → buscar by fecha + id_sector
    if (req.method === 'GET' && req.query.search === 'true') {
      const { fecha, id_sector } = req.query;

      if (!fecha || !id_sector) {
        return res.status(200).json(null);
      }

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
    }

    // GET /api/solicitudes → list
    if (req.method === 'GET') {
      const { fecha, fecha_desde, fecha_hasta, id_equipo } = req.query;

      let query = supabase
        .schema('siracusa')
        .from('solicitudes_riego')
        .select('*, sectores!inner(name, id_equipo, has_hectareas, variedad, equipos!inner(name))')
        .eq('active', true);

      if (fecha) {
        query = query.eq('fecha_riego', fecha);
      }
      if (fecha_desde) {
        query = query.gte('fecha_riego', fecha_desde);
      }
      if (fecha_hasta) {
        query = query.lte('fecha_riego', fecha_hasta);
      }
      if (id_equipo) {
        query = query.eq('sectores.id_equipo', id_equipo);
      }

      const { data, error } = await query.order('fecha_riego', { ascending: false });

      if (error) throw error;

      // Flatten joins
      const result = data.map((s) => ({
        ...s,
        sector_name: s.sectores?.name,
        equipo_name: s.sectores?.equipos?.name,
        has_hectareas: s.sectores?.has_hectareas,
        variedad: s.sectores?.variedad,
        sectores: undefined,
      }));

      return res.status(200).json(result);
    }

    // POST /api/solicitudes → create
    if (req.method === 'POST') {
      const {
        id_sector, fecha_riego, horas, hr_reales,
        fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k,
        fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea,
        solicitante, observaciones,
      } = req.body;

      // Get sector info for m3 calculation
      const { data: sector, error: secErr } = await supabase
        .schema('siracusa')
        .from('sectores')
        .select('*')
        .eq('id', id_sector)
        .single();

      if (secErr || !sector) {
        return res.status(400).json({ error: 'Sector not found' });
      }

      const h = parseFloat(horas) || 0;
      const m3_programados = sector.has_hectareas * h * sector.m3_ha_hr;

      const { data, error } = await supabase
        .schema('siracusa')
        .from('solicitudes_riego')
        .insert({
          id_sector,
          fecha_riego,
          horas: h,
          hr_reales: hr_reales ?? 0,
          fert_sulfato_zn: fert_sulfato_zn ?? 0,
          fert_nitrato_amo: fert_nitrato_amo ?? 0,
          fert_nitrato_ca: fert_nitrato_ca ?? 0,
          fert_cloruro_k: fert_cloruro_k ?? 0,
          fert_acido_boro: fert_acido_boro ?? 0,
          fert_sulfato_mg: fert_sulfato_mg ?? 0,
          fert_fma: fert_fma ?? 0,
          fert_urea: fert_urea ?? 0,
          m3_programados,
          solicitante: solicitante ?? '',
          observaciones: observaciones ?? '',
          active: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      return res.status(201).json({ id: data.id, m3_programados });
    }

    const { id, action } = req.query;

    // PUT /api/solicitudes?id=X&action=fertilizantes → update fertilizantes
    if (req.method === 'PUT' && id && action === 'fertilizantes') {
      const {
        fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k,
        fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea,
      } = req.body;

      const { error } = await supabase
        .schema('siracusa')
        .from('solicitudes_riego')
        .update({
          fert_sulfato_zn: clampFert(fert_sulfato_zn),
          fert_nitrato_amo: clampFert(fert_nitrato_amo),
          fert_nitrato_ca: clampFert(fert_nitrato_ca),
          fert_cloruro_k: clampFert(fert_cloruro_k),
          fert_acido_boro: clampFert(fert_acido_boro),
          fert_sulfato_mg: clampFert(fert_sulfato_mg),
          fert_fma: clampFert(fert_fma),
          fert_urea: clampFert(fert_urea),
        })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ updated: true });
    }

    // DELETE /api/solicitudes?id=X → soft delete
    if (req.method === 'DELETE' && id) {
      const { error } = await supabase
        .schema('siracusa')
        .from('solicitudes_riego')
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
