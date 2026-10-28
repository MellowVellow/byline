/** Single source: dock tab order + colors, tied to Settings preset vars (applySettings in settings.ts).
 *  Language=red (--lt), Reader=purple (--ai), Sources=blue (--blue), Suggest=grey (--grey), Lint=yellow (--yellow).
 *  Canonical hex below = COLOR_PRESETS.default; UI uses var() so preset changes recolor tabs/buttons/underlines together. */
export const ANNOTATION_COLORS = {
  language: '#D93025', reader: '#7C4DFF', sources: '#1A73E8', suggest: '#9AA0A6', lint: '#D99A06',
} as const
export const TAB_THEME = {
  language: { color: 'var(--lt, #D93025)', label: 'Language' },
  reader: { color: 'var(--ai, #7C4DFF)', label: 'Reader' },
  sources: { color: 'var(--blue, #1A73E8)', label: 'Sources' },
  suggest: { color: 'var(--grey, #9AA0A6)', label: 'Suggest' },
  lint: { color: 'var(--yellow, #D99A06)', label: 'Lint' },
} as const
export type RightTabKey = keyof typeof TAB_THEME
export const RIGHT_TAB_ORDER: RightTabKey[] = ['language', 'reader', 'sources', 'suggest', 'lint']

/** Language sub-types: all preset red (labels distinguish, color does not). */
export const LANG_STYLE2: Record<string, { color: string; label: string }> = {
  grammar: { color: 'var(--lt, #D93025)', label: 'Grammar' },
  vocabulary: { color: 'var(--lt, #D93025)', label: 'Word choice' },
  relevance: { color: 'var(--lt, #D93025)', label: 'Cohesion' },
}

/** Lint categories: all preset yellow (labels distinguish, color does not). */
export const LINT_SHADES: Record<string, string> = {
  amber: 'var(--yellow, #D99A06)', green: 'var(--yellow, #D99A06)', cyan: 'var(--yellow, #D99A06)', rose: 'var(--yellow, #D99A06)', violet: 'var(--yellow, #D99A06)',
}

/** Dock items never auto-grey/delete on refresh. Enabled by default; writer double-clicks to disable (grey + no underline). */
export function anchorKey(kind: string, quote: string, detail = ''): string {
  return `${kind}:${quote.trim().toLowerCase()}:${detail.trim().toLowerCase().slice(0, 80)}`
}
export function toggled(set: ReadonlySet<string>, key: string): Set<string> {
  const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n
}
const COMMON_SHORT = new Set(['a', 'i', 'an', 'in', 'on', 'at', 'to', 'of', 'or', 'by', 'be', 'we', 'he', 'it', 'is', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out'])
/** Text to insert at cursor for suggestion s. Mid-word cursor (before='Cats n', s='need less…') → only remainder 'eed less…', no space. */
export function ghostInsertText(beforeFull: string, s: string): string {
  const m = /([A-Za-z]+)$/.exec(beforeFull || '')
  if (m && m[1].length <= 3 && !COMMON_SHORT.has(m[1].toLowerCase()) && s.toLowerCase().startsWith(m[1].toLowerCase()) && s.length > m[1].length) return s.slice(m[1].length)
  const prev = (beforeFull || '').slice(-1)
  return (prev && !/\s/.test(prev) ? ' ' : '') + s
}
/** Sources grouped by claim (unit = claim, links listed under it, no per-link output text). */
export function groupByClaim<T extends { claim_quote: string }>(list: T[]): { claim: string; items: T[] }[] {
  const out: { claim: string; items: T[] }[] = []; const idx = new Map<string, number>()
  for (const r of list) { const k = (r.claim_quote || '').trim().toLowerCase(); if (!idx.has(k)) { idx.set(k, out.length); out.push({ claim: r.claim_quote, items: [] }) } out[idx.get(k)!].items.push(r) }
  return out
}

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
