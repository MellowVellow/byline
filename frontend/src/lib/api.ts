import { loadSettings } from './settings'
import { z } from 'zod'
import { recordCall } from './metrics'

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
  const start = performance.now()
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...providerHeaders() }, body: JSON.stringify(body), signal })
    const ms = Math.round(performance.now() - start)
    if (!r.ok) {
      try { recordCall({ endpoint: path, ok: false, ms, model: 'unknown', usage: { in: 0, out: 0 } }) } catch {}
      return null
    }
    const v = Envelope.safeParse(await r.json().catch(() => null))
    if (v.success && v.data.ok) {
      try {
        const meta = (v.data as any)?.meta || {}
        recordCall({ endpoint: path, ok: true, ms, model: meta.model || meta.provider || 'unknown', usage: meta.usage || { in: meta.prompt_tokens || 0, out: meta.completion_tokens || 0, reasoning: meta.reasoning_tokens || 0 } })
      } catch {}
      return v.data
    }
    try { recordCall({ endpoint: path, ok: false, ms, model: 'unknown', usage: { in: 0, out: 0 } }) } catch {}
    return null
  } catch (e: any) {
    const ms = Math.round(performance.now() - start)
    if (e?.name !== 'AbortError') {
      try { recordCall({ endpoint: path, ok: false, ms, model: 'unknown', usage: { in: 0, out: 0 } }) } catch {}
    }
    return null
  }
}
async function postRaw(path: string, body: unknown, signal?: AbortSignal): Promise<any> {
  const start = performance.now()
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...providerHeaders() }, body: JSON.stringify(body), signal })
    const ms = Math.round(performance.now() - start)
    const v = Envelope.safeParse(await r.json().catch(() => null))
    if (v.success && v.data && v.data.ok !== false) {
      try {
        const meta = (v.data as any)?.meta || {}
        recordCall({ endpoint: path, ok: true, ms, model: meta.model || meta.provider || 'unknown', usage: meta.usage || { in: meta.prompt_tokens || 0, out: meta.completion_tokens || 0, reasoning: meta.reasoning_tokens || 0 } })
      } catch {}
      return v.data
    }
    try { recordCall({ endpoint: path, ok: false, ms, model: 'unknown', usage: { in: 0, out: 0 } }) } catch {}
    return { ok: false, error: `HTTP ${r.status} (no JSON from backend)` }
  } catch (e: any) {
    const ms = Math.round(performance.now() - start)
    if (e?.name !== 'AbortError') {
      try { recordCall({ endpoint: path, ok: false, ms, model: 'unknown', usage: { in: 0, out: 0 } }) } catch {}
    }
    if (e?.name === 'AbortError') return { ok: false, aborted: true }
    return { ok: false, error: `Cannot reach backend at ${BASE || 'same origin'} — is :8000 running?` }
  }
}
export const api = {
  health: async () => { try { const r = await fetch(`${BASE}/api/health`); return r.ok ? await r.json() : null } catch { return null } },
  models: async () => { try { const r = await fetch(`${BASE}/api/models`); return r.ok ? await r.json() : null } catch { return null } },
  usage: async () => { try { const r = await fetch(`${BASE}/api/usage`, { headers: providerHeaders() }); return r.ok ? await r.json() : null } catch { return null } },
  metricsUsage: async (adminToken: string, params?: { window_hours?: number; limit_ips?: number; limit_endpoints?: number }) => {
    try {
      const q = new URLSearchParams()
      if (params?.window_hours) q.set('window_hours', String(params.window_hours))
      if (params?.limit_ips) q.set('limit_ips', String(params.limit_ips))
      if (params?.limit_endpoints) q.set('limit_endpoints', String(params.limit_endpoints))
      const qs = q.toString() ? `?${q.toString()}` : ''
      const r = await fetch(`${BASE}/api/metrics/usage${qs}`, { headers: { 'X-Admin-Token': adminToken } })
      return r.ok ? await r.json() : { ok: false, error: `HTTP ${r.status}` }
    } catch { return null }
  },
  complete: (b: unknown, s?: AbortSignal) => post('/api/complete', b, s),
  reactions: (b: unknown, s?: AbortSignal) => post('/api/reactions', b, s),
  synonyms: (b: unknown, s?: AbortSignal) => post('/api/synonyms', b, s),
  waitlist: (email: string, note = '') => postRaw('/api/waitlist', { email, note }),
  libraryFetch: (b: unknown, s?: AbortSignal) => post('/api/library/fetch', b, s),
  libraryParse: (b: unknown, s?: AbortSignal) => post('/api/library/parse', b, s),
  libraryRank: (b: unknown, s?: AbortSignal) => post('/api/library/rank', b, s),
  libraryVision: (b: unknown, s?: AbortSignal) => post('/api/library/vision', b, s),
}

export async function uploadLibraryPdf(file: File): Promise<any> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const h: Record<string, string> = {}
    try {
      const { loadSettings } = await import('./settings')
      const s = loadSettings()
      h['X-Byline-Provider'] = s.metaProvider === 'baseten' || s.metaProvider === 'meta' ? s.metaProvider : 'auto'
      if (s.apiKey) h['X-API-Key'] = s.apiKey
    } catch { h['X-Byline-Provider'] = 'auto' }
    const r = await fetch(`${BASE}/api/library/pdf`, { method: 'POST', headers: h, body: fd })
    return await r.json().catch(() => null)
  } catch {
    return null
  }
}
