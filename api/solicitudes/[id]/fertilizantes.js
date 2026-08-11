import { supabase } from '../../../lib/supabase.js';

const FERT_MAX = 999;
function clampFert(v) {
  return Math.min(Math.max(parseFloat(v) || 0, 0), FERT_MAX);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const {
    fert_sulfato_zn, fert_nitrato_amo, fert_nitrato_ca, fert_cloruro_k,
    fert_acido_boro, fert_sulfato_mg, fert_fma, fert_urea,
  } = req.body;

  try {
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
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
