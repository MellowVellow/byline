import { loadSettings } from './settings'
import { z } from 'zod'

/** Backend envelope: every JSON response carries ok:boolean. Anything else
 *  (proxy error page, truncated body) is treated as a transport failure. */
const Envelope = z.object({ ok: z.boolean() }).passthrough()

const BASE = (import.meta as any).env?.VITE_API_URL || ''
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {}
  try {
    const s = loadSettings()
    const p = s.metaProvider
    h['X-Byline-Provider'] = p === 'baseten' || p === 'meta' ? p : 'auto'
    if (s.apiKey) h['X-API-Key'] = s.apiKey
  } catch {
    h['X-Byline-Provider'] = 'auto'
  }
  return h
}
const providerHeaders = authHeaders
async function post(path: string, body: unknown, signal?: AbortSignal): Promise<any | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...providerHeaders() }, body: JSON.stringify(body), signal })
    if (!r.ok) return null
    const v = Envelope.safeParse(await r.json().catch(() => null))
    return v.success && v.data.ok ? v.data : null
  } catch { return null }
}
async function postRaw(path: string, body: unknown, signal?: AbortSignal): Promise<any> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...providerHeaders() }, body: JSON.stringify(body), signal })
    const v = Envelope.safeParse(await r.json().catch(() => null))
    if (v.success) return v.data
    return { ok: false, error: `HTTP ${r.status} (no JSON from backend)` }
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, aborted: true }
    return { ok: false, error: `Cannot reach backend at ${BASE || 'same origin'} — is :8000 running?` }
  }
}
export const api = {
  health: async () => { try { const r = await fetch(`${BASE}/api/health`); return r.ok ? await r.json() : null } catch { return null } },
  models: async () => { try { const r = await fetch(`${BASE}/api/models`); return r.ok ? await r.json() : null } catch { return null } },
  usage: async () => { try { const r = await fetch(`${BASE}/api/usage`, { headers: providerHeaders() }); return r.ok ? await r.json() : null } catch { return null } },
  complete: (b: unknown, s?: AbortSignal) => post('/api/complete', b, s),
  reactions: (b: unknown, s?: AbortSignal) => post('/api/reactions', b, s),
  connect: (b: unknown, s?: AbortSignal) => postRaw('/api/connect', b, s),
  synonyms: (b: unknown, s?: AbortSignal) => post('/api/synonyms', b, s),
  waitlist: (email: string, note = '') => postRaw('/api/waitlist', { email, note }),
  readings: (b: unknown, s?: AbortSignal) => postRaw('/api/readings', b, s),
  research: (b: unknown, s?: AbortSignal) => postRaw('/api/research', b, s),
  cite: (b: unknown, s?: AbortSignal) => postRaw('/api/cite', b, s),
}
