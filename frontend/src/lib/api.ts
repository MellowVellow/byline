const BASE = (import.meta as any).env?.VITE_API_URL || ''
async function post(path: string, body: unknown, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    if (!r.ok) return null
    const d = await r.json()
    return d?.ok ? d : null
  } catch { return null }
}
async function postRaw(path: string, body: unknown, signal?: AbortSignal): Promise<any> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
    const d = await r.json().catch(() => null)
    if (d) return d
    return { ok: false, error: `HTTP ${r.status} (no JSON from backend)` }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, aborted: true }
    return { ok: false, error: `Cannot reach backend at ${BASE || 'same origin'} — is :8000 running?` }
  }
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
  lint: (b: unknown, s?: AbortSignal) => postRaw('/api/lint', b, s),
  research: (b: unknown) => postRaw('/api/research', b),
  cite: (b: unknown) => postRaw('/api/cite', b),
  bibliography: (style: string, items: unknown[]) => postRaw('/api/cite/bibliography', { style, items }),
  diagram: (b: unknown) => postRaw('/api/diagram', b),
  outlineGenerate: (b: unknown) => postRaw('/api/outline-generate', b),
  setupAgent: (b: unknown) => postRaw('/api/setup-agent', b),
  setupQuestions: (b: unknown) => postRaw('/api/setup-questions', b),
  dataset: (pairs: unknown[]) => postRaw('/api/dataset', { pairs }),
  waitlist: (email: string, note = '') => post('/api/waitlist', { email, note }),
}

export async function researchUpload(file: File, question: string): Promise<any> {
  try { const fd = new FormData(); fd.append('file', file); const r = await fetch(`${BASE}/api/research/upload?question=${encodeURIComponent(question)}`, { method: 'POST', body: fd }); return await r.json() } catch { return { ok: false, error: 'network' } }
}
