const BASE = (import.meta as any).env?.VITE_API_URL || ''
async function post(path: string, body: unknown, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    if (!r.ok) return null
    const d = await r.json()
    return d?.ok ? d : null
  } catch { return null }
}
export const api = {
  health: async () => { try { const r = await fetch(`${BASE}/api/health`); return r.ok ? await r.json() : null } catch { return null } },
  complete: (b: unknown, s?: AbortSignal) => post('/api/complete', b, s),
  annotate: (b: unknown, s?: AbortSignal) => post('/api/annotate', b, s),
  reactions: (b: unknown, s?: AbortSignal) => post('/api/reactions', b, s),
  mainIdea: (b: unknown) => post('/api/main-idea', b),
  outline: (b: unknown) => post('/api/outline', b),
  synonyms: (b: unknown) => post('/api/synonyms', b),
  grammar: (b: unknown, s?: AbortSignal) => post('/api/grammar', b, s),
  readings: (b: unknown) => post('/api/readings', b),
  waitlist: (email: string, note = '') => post('/api/waitlist', { email, note }),
}
