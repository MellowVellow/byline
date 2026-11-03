/**
 * Live call metrics & telemetry:
 * - Stored locally in localStorage (events & acceptance telemetry)
 * - Tracks acceptance rates, user usage, and model error rates
 */

export interface CallMeta {
  endpoint: string
  model: string
  ms: number
  usage: { in: number; out: number; reasoning: number }
  params: { temperature: number; max_tokens: number; reasoning_effort: string }
  errorReason?: string
}

export type CallEvent = CallMeta & { ts: number; ok: boolean }

export interface UsageTelemetry {
  suggestionsOffered: number
  suggestionsAccepted: number
  revisionsOffered: number
  revisionsAccepted: number
  totalSessions: number
  lastActive: number
  /** Call-saving telemetry (ghost autos): fired, cache-saved, aborted, stale-dropped, debounce-saved */
  ghostFired: number
  ghostCacheSaved: number
  ghostAborted: number
  ghostStaleDropped: number
  ghostDebounceSaved: number
  /** Manual rerolls across ghost + selection grids */
  ghostRerolls: number
}

const EVENTS_KEY = 'byline.metrics.events.v1'
const USAGE_KEY = 'byline.metrics.usage.v1'
const MAX_EVENTS = 120

const DEFAULT_USAGE: UsageTelemetry = {
  suggestionsOffered: 0,
  suggestionsAccepted: 0,
  revisionsOffered: 0,
  revisionsAccepted: 0,
  totalSessions: 0,
  lastActive: 0,
  ghostFired: 0,
  ghostCacheSaved: 0,
  ghostAborted: 0,
  ghostStaleDropped: 0,
  ghostDebounceSaved: 0,
  ghostRerolls: 0,
}

export function loadUsageStats(): UsageTelemetry {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (raw) return { ...DEFAULT_USAGE, ...JSON.parse(raw) }
  } catch { /* noop */ }
  return { ...DEFAULT_USAGE }
}

function saveUsageStats(stats: UsageTelemetry) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats))
    dispatchEvent(new Event('byline-metrics'))
  } catch { /* noop */ }
}

export function recordSuggestionOffered(count = 1) {
  const stats = loadUsageStats()
  stats.suggestionsOffered += count
  stats.lastActive = Date.now()
  saveUsageStats(stats)
}

export function recordSuggestionAccepted() {
  const stats = loadUsageStats()
  stats.suggestionsAccepted += 1
  stats.lastActive = Date.now()
  saveUsageStats(stats)
}

export function recordRevisionOffered(count = 1) {
  const stats = loadUsageStats()
  stats.revisionsOffered += count
  stats.lastActive = Date.now()
  saveUsageStats(stats)
}

export function recordRevisionAccepted() {
  const stats = loadUsageStats()
  stats.revisionsAccepted += 1
  stats.lastActive = Date.now()
  saveUsageStats(stats)
}

function bumpGhost(field: 'ghostFired' | 'ghostCacheSaved' | 'ghostAborted' | 'ghostStaleDropped' | 'ghostDebounceSaved' | 'ghostRerolls') {
  try {
    const stats = loadUsageStats()
    stats[field] += 1
    stats.lastActive = Date.now()
    saveUsageStats(stats)
  } catch { /* noop */ }
}

/** Ghost autos measurement: fired, cache-saved, aborted, stale-dropped, debounce-saved */
export const recordGhostFired = () => bumpGhost('ghostFired')
export const recordGhostCacheSaved = () => bumpGhost('ghostCacheSaved')
export const recordGhostAborted = () => bumpGhost('ghostAborted')
export const recordGhostStaleDropped = () => bumpGhost('ghostStaleDropped')
export const recordGhostDebounceSaved = () => bumpGhost('ghostDebounceSaved')
export const recordGhostReroll = () => bumpGhost('ghostRerolls')

export function recordCall(meta: any, ok = true, errorReason?: string) {
  if (!meta?.endpoint) return
  try {
    const list: CallEvent[] = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]')
    const safe = { ...(meta || {}) }
    delete safe.prompt
    list.unshift({
      ...safe,
      ts: Date.now(),
      ok,
      errorReason: errorReason || (!ok ? 'Inference validation timeout or schema mismatch' : undefined),
    })
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(0, MAX_EVENTS)))
    dispatchEvent(new Event('byline-metrics'))
  } catch { /* full/blocked */ }
}

export function loadCalls(): CallEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (raw) {
      const list: any[] = JSON.parse(raw)
      for (const item of list) delete item.prompt
      return list
    }
  } catch { /* noop */ }

  return []
}

export function clearCalls() {
  try {
    localStorage.removeItem(EVENTS_KEY)
    localStorage.removeItem(USAGE_KEY)
    dispatchEvent(new Event('byline-metrics'))
  } catch { /* noop */ }
}
