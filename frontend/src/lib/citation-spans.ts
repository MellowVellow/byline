export interface SpanRange {
  from: number
  to: number
}

/**
 * APA parenthetical citation ranges: (Author, 2025), (Octaberlina, 2024, p. 1),
 * bare years (2024). Findings fully inside these ranges are citation text,
 * not prose — Harper must not lint them.
 */
const CITE_RE = /\([^()\n]{0,80}\b(?:19|20)\d{2}[a-z]?\b[^()\n]{0,60}\)/g

export function citationRanges(text: string): SpanRange[] {
  const out: SpanRange[] = []
  if (!text) return out
  CITE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CITE_RE.exec(text)) !== null) {
    out.push({ from: m.index, to: m.index + m[0].length })
    if (m[0].length === 0) CITE_RE.lastIndex++
  }
  return out
}

/** True when [start, end) sits fully inside any citation range. */
export function insideCitation(start: number, end: number, ranges: SpanRange[]): boolean {
  return ranges.some(r => r.from <= start && end <= r.to)
}
