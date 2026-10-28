/** Live call metrics: stored locally only, full prompt expandable in popup. Capped. */
export type CallMeta = {
  endpoint: string; model: string; ms: number
  usage: { in: number; out: number; reasoning: number }
  params: { temperature: number; max_tokens: number; reasoning_effort: string }
  prompt: { system: string; user: string }
}
export type CallEvent = CallMeta & { ts: number; ok: boolean }
const KEY = 'byline.metrics.events.v1'
const MAX_EVENTS = 120

export function recordCall(meta: any, ok = true) {
  if (!meta?.endpoint) return
  try {
    const list: CallEvent[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    list.unshift({ ...meta, ts: Date.now(), ok })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_EVENTS)))
    dispatchEvent(new Event('byline-metrics'))
  } catch { /* full/blocked */ }
}
export function loadCalls(): CallEvent[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function clearCalls() { try { localStorage.removeItem(KEY); dispatchEvent(new Event('byline-metrics')) } catch { /* noop */ } }
