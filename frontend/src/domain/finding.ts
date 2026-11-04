export type Persona = 'reader' | 'grammar' | 'research'

export type FindingKind = 'reader_observation' | 'language_error'

export type FindingStatus = 'open' | 'resolved' | 'dismissed' | 'stale'

export interface TextAnchor {
  blockId?: string
  startOffset?: number
  endOffset?: number
  quotedText: string
  prefix?: string
  suffix?: string
  documentRevision: number
}

export interface Suggestion {
  id: string
  text: string
  rationale?: string
}

export function noteKey(f: { persona: string; explanation: string }): string {
  const norm = (f.explanation || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${f.persona}::${norm}`
}

export interface FindingGroup {
  key: string
  persona: Persona
  explanation: string
  items: Finding[]
}

export function groupFindingsByNote(findings: Finding[]): FindingGroup[] {
  const groups: FindingGroup[] = []
  const byKey = new Map<string, FindingGroup>()
  for (const f of findings) {
    const key = noteKey(f)
    let g = byKey.get(key)
    if (!g) {
      g = { key, persona: f.persona, explanation: f.explanation, items: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    g.items.push(f)
  }
  return groups
}

export interface Finding {
  id: string
  documentId: string
  persona: Persona
  kind: FindingKind
  category?: string
  ruleId?: string
  anchor: TextAnchor
  explanation: string
  suggestions: Suggestion[]
  status: FindingStatus
  sourceRevision: number
  createdAt: number
}

export interface ReaderReaction {
  quote?: string
  context?: string
  text?: string
  options?: unknown[]
}

/**
 * Build reader findings from one /api/reactions payload, deduplicated.
 * The backend can return the same (note, quote) pair multiple times and
 * repeated runs return cached identical payloads — callers replace the
 * reader persona (never append), so each pair yields at most one finding
 * and each finding holds at most one copy of each suggestion.
 */
export function buildReaderFindings(
  reactions: ReaderReaction[],
  opts: { documentRevision: number; sourceRevision: number; makeId?: () => string; now?: () => number },
): Finding[] {
  const makeId = opts.makeId ?? (() => `read-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const now = opts.now ?? (() => Date.now())
  const seen = new Set<string>()
  const out: Finding[] = []
  for (const rx of reactions) {
    const quote = ((rx.quote || rx.context || 'text') as string).trim()
    const explanation = ((rx.text || 'Reader rewrite.') as string).trim()
    const quoteNorm = quote.toLowerCase().replace(/\s+/g, ' ').trim()
    const key = `${noteKey({ persona: 'reader', explanation })}::${quoteNorm}`
    if (seen.has(key)) continue
    seen.add(key)
    const uniq: string[] = []
    const seenOpts = new Set<string>()
    for (const o of Array.isArray(rx.options) ? rx.options : []) {
      if (typeof o !== 'string') continue
      const t = o.trim()
      if (!t) continue
      const k = t.toLowerCase()
      if (seenOpts.has(k)) continue
      seenOpts.add(k)
      uniq.push(t)
      if (uniq.length >= 3) break
    }
    if (uniq.length === 0) continue
    const fid = makeId()
    out.push({
      id: fid,
      documentId: 'active-doc',
      persona: 'reader',
      kind: 'reader_observation',
      anchor: { quotedText: quote, documentRevision: opts.documentRevision },
      explanation,
      suggestions: uniq.map((t, i) => ({ id: `${fid}-sug-${i}`, text: t, rationale: explanation })),
      status: 'open',
      sourceRevision: opts.sourceRevision,
      createdAt: now(),
    })
  }
  return out
}
