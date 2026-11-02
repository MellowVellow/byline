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
export interface ExploreFinding {
  id: number; type: string; text: string; source_title?: string; url?: string;
  locator?: string; excerpt?: string; verdict?: string; why?: string;
}
export interface ExploreResponse {
  ok: boolean; query?: string; findings?: ExploreFinding[]; angles?: ExploreFinding[];
  summary?: string; model?: string; mock?: boolean; offline?: boolean; error?: string; aborted?: boolean;
}
export const api = {
  health: async () => { try { const r = await fetch(`${BASE}/api/health`); return r.ok ? await r.json() : null } catch { return null } },
  complete: (b: unknown, s?: AbortSignal) => post('/api/complete', b, s),
  reactions: (b: unknown, s?: AbortSignal) => post('/api/reactions', b, s),
  connect: (b: unknown, s?: AbortSignal) => postRaw('/api/connect', b, s),
  synonyms: (b: unknown) => post('/api/synonyms', b),
  waitlist: (email: string, note = '') => post('/api/waitlist', { email, note }),
  // Fixed: full-fidelity (no silent null) research path for Explore flow.
  explore: (b: { query: string; context?: string; count?: number }, s?: AbortSignal): Promise<ExploreResponse> =>
    postRaw('/api/explore', b, s),
  exploreStream: (
    b: { query: string; context?: string; count?: number },
    onEvent: (event: string, data: any) => void,
    signal?: AbortSignal,
  ): Promise<ExploreResponse> => {
    const params = new URLSearchParams({ query: b.query, context: b.context ?? '', count: String(b.count ?? 8) })
    return (async () => {
      const collected: ExploreFinding[] = []
      let summary = ''
      let offline = false
      try {
        const r = await fetch(`${BASE}/api/explore/stream?${params}`, { signal })
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`)
        const reader = r.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let ev = ''
        const flush = (chunk: string) => {
          buf += chunk
          let idx: number
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx)
            buf = buf.slice(idx + 2)
            let data = ''
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) ev = line.slice(6).trim()
              else if (line.startsWith('data:')) data += line.slice(5).trim()
            }
            if (!ev || !data || data === ': ping') { ev = ''; continue }
            try {
              const d = JSON.parse(data)
              onEvent(ev, d)
              if (ev === 'finding') collected.push(d)
              else if (ev === 'done' && Array.isArray(d.findings)) {
                return { done: true, d }
              } else if (ev === 'offline') offline = true
            } catch { /* keep streaming */ }
            ev = ''
          }
          return null
        }
        let final: any = null
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const hit = flush(dec.decode(value, { stream: true }))
          if (hit) { final = (hit as any).d; break }
        }
        if (final) return { ok: true, findings: final.findings ?? collected, angles: final.angles ?? [], summary: final.summary ?? summary, mock: final.mock, offline: final.offline ?? offline }
        // Fallback: single POST when stream yields nothing (offline/mock)
        if (!collected.length) return postRaw('/api/explore', b, signal)
        summary = collected.slice(0, 3).map(f => f.text).join('; ').slice(0, 800)
        return { ok: true, findings: collected, angles: [], summary, offline }
      } catch (e: any) {
        if (e?.name === 'AbortError') return { ok: false, aborted: true }
        return postRaw('/api/explore', b, signal)
      }
    })()
  },
  readings: (b: unknown, s?: AbortSignal) => postRaw('/api/readings', b, s),
  research: (b: unknown, s?: AbortSignal) => postRaw('/api/research', b, s),
  cite: (b: unknown, s?: AbortSignal) => postRaw('/api/cite', b, s),
}
