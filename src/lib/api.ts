export const FK = ['fert_sulfato_zn', 'fert_nitrato_amo', 'fert_nitrato_ca', 'fert_cloruro_k', 'fert_acido_boro', 'fert_sulfato_mg', 'fert_fma', 'fert_urea'] as const;
export const FN = ['Sulfato Zn', 'Nitrato Amonio', 'Nitrato Calcio', 'Cloruro K', 'Acido Borico', 'Sulfato Mg', 'FMA', 'Urea'] as const;

export async function api(u: string, o: RequestInit & { signal?: AbortSignal } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(o.headers as Record<string, string> || {}) };
  const opts: RequestInit = { ...o, headers, body: o.body ? JSON.stringify(o.body) : undefined };
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
