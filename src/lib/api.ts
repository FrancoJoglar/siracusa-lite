export const FK = ['fert_sulfato_zn', 'fert_nitrato_amo', 'fert_nitrato_ca', 'fert_cloruro_k', 'fert_acido_boro', 'fert_sulfato_mg', 'fert_fma', 'fert_urea', 'fert_nitrato_k', 'fert_sulfato_k', 'fert_novatec'] as const;
export const FN = ['Sulfato Zn', 'Nitrato Amonio', 'Nitrato Calcio', 'Cloruro K', 'Acido Borico', 'Sulfato Mg', 'FMA', 'Urea', 'Nitrato Potasio', 'Sulfato Potasio', 'Novatec'] as const;
export const DOW = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
export const SEC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export interface Equipo { id: number; name: string; }
export interface Sector { id: number; name: string; id_equipo: number; variedad?: string; has_hectareas?: number; m3_ha_hr?: number; equipo_name?: string; }
export interface Fertilizante { id: number; name: string; N?: number; P2O5?: number; K2O?: number; CaO?: number; MgO?: number; Zn?: number; B2O3?: number; S?: number; }

export async function api<T = any>(u: string, o: RequestInit & { signal?: AbortSignal; token?: string; body?: any } = {}): Promise<T> {
  const { token, ...init } = o;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts: RequestInit = { ...init, headers, body: init.body ? JSON.stringify(init.body) : undefined };
  if (o.signal) opts.signal = o.signal;
  const r = await fetch(u, opts);
  const type = r.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await r.json() : await r.text();
  if (!r.ok) {
    const err = new Error((payload && typeof payload === 'object' && payload.error) || `Request failed (${r.status})`);
    (err as any).status = r.status;
    (err as any).payload = payload;
    throw err;
  }
  return payload;
}

export function isAbortError(e: any): boolean {
  return e?.name === 'AbortError';
}

export function apiErrorMessage(e: any, fallback: string): string {
  return isAbortError(e) ? '' : (e?.message || fallback);
}
