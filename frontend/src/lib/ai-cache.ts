/** FE AI cache: memory + sessionStorage, 5min TTL, no infra. */

const TTL_MS = 5 * 60 * 1000
const PREFIX = 'byline.ai-cache.v1:'
const mem = new Map<string, { exp: number; val: any }>()

export function hashKey(parts: unknown): string {
  const s = JSON.stringify(parts)
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return `${s.length}:${(h >>> 0).toString(36)}`
}

export function cacheGet<T>(key: string): T | null {
  const now = Date.now()
  const m = mem.get(key)
  if (m && m.exp > now) return m.val as T
  if (m) mem.delete(key)
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.exp <= now) {
      sessionStorage.removeItem(PREFIX + key)
      return null
    }
    mem.set(key, { exp: parsed.exp, val: parsed.val })
    return parsed.val as T
  } catch {
    return null
  }
}

export function cacheSet(key: string, val: any, ttlMs = TTL_MS) {
  const exp = Date.now() + ttlMs
  mem.set(key, { exp, val })
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ exp, val }))
  } catch { /* quota — memory still serves */ }
}

const LAST_GHOST_KEY = 'byline.last-ghost.v1'

export interface LastGhost {
  groups: Record<string, string[]>
  lv: string
  idx: number
  savedAt: number
}

export function saveLastGhost(g: Omit<LastGhost, 'savedAt'>) {
  try {
    sessionStorage.setItem(LAST_GHOST_KEY, JSON.stringify({ ...g, savedAt: Date.now() }))
  } catch {}
}

export function loadLastGhost(): LastGhost | null {
  try {
    const raw = sessionStorage.getItem(LAST_GHOST_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p?.groups) return null
    return p as LastGhost
  } catch {
    return null
  }
}
