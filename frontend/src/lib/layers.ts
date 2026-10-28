/** Single source: dock tab order + colors. Language=red, Reader=purple, Sources=blue, Suggest=grey, Lint=yellow. */
export const TAB_THEME = {
  language: { color: '#D93025', label: 'Language' },
  reader: { color: '#7C4DFF', label: 'Reader' },
  sources: { color: '#1A73E8', label: 'Sources' },
  suggest: { color: '#9AA0A6', label: 'Suggest' },
  lint: { color: '#D99A06', label: 'Lint' },
} as const
export type RightTabKey = keyof typeof TAB_THEME
export const RIGHT_TAB_ORDER: RightTabKey[] = ['language', 'reader', 'sources', 'suggest', 'lint']

/** Language sub-types: shades of red only (no orange). */
export const LANG_STYLE2: Record<string, { color: string; label: string }> = {
  grammar: { color: '#B3261E', label: 'Grammar' },
  vocabulary: { color: '#D93025', label: 'Word choice' },
  relevance: { color: '#E35D6A', label: 'Cohesion' },
}

/** Lint categories: shades of yellow only. */
export const LINT_SHADES: Record<string, string> = {
  amber: '#B8860B', green: '#D99A06', cyan: '#E6B93D', rose: '#C49002', violet: '#F0C75E',
}

/** Show all fresh items + at most `cap` greyed (stale/history) per list/type. */
export function capGreyed<T extends { stale?: boolean }>(list: T[], cap = 3): T[] {
  let grey = 0
  return list.filter(x => !x.stale || ++grey <= cap)
}
export function capHistory(list: string[], cap = 3): string[] { return list.slice(0, cap) }

export function safeUrl(url: string): string {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:' ? url : '#' } catch { return '#' }
}

/** Rank options by overlap with writer's own previously accepted suggestions. */
export function rankByAccepted(options: string[], accepted: string[]): string[] {
  if (!accepted.length) return options
  const corpus = new Map<string, number>()
  for (const a of accepted) for (const w of a.toLowerCase().split(/[^a-z]+/)) if (w.length > 2) corpus.set(w, (corpus.get(w) || 0) + 1)
  const score = (s: string) => s.toLowerCase().split(/[^a-z]+/).reduce((n, w) => n + (corpus.get(w) || 0), 0) - Math.abs(s.split(/\s+/).length - 6) * 0.1
  return [...options].sort((a, b) => score(b) - score(a))
}
export function lastTwoSentences(before: string): string {
  const parts = (before || '').split(/(?<=[.!?])\s+/).filter(s => s.trim())
  return parts.slice(-2).join(' ')
}
