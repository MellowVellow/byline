import { normalizeText } from '../domain/library'

export interface ProvenanceHit {
  sourceId: string
  score: number
  excerpt: string
}

/**
 * Check a sentence against saved source full texts.
 * Normalized fuzzy match (full passage, then 12-word head) per source.
 * Returns hits ranked by score — "highlight where it's from".
 */
export function traceProvenance(
  sentence: string,
  texts: Record<string, string>,
): ProvenanceHit[] {
  const q = normalizeText(sentence)
  if (!q) return []
  const heads = [q, q.split(' ').slice(0, 12).join(' ')]
  const out: ProvenanceHit[] = []
  for (const [id, raw] of Object.entries(texts)) {
    const t = normalizeText(raw || '')
    if (!t) continue
    let score = 0
    let excerpt = ''
    for (const h of heads) {
      if (h.length > 10 && t.includes(h)) {
        score = h === q ? 3 : 2
        const i = t.indexOf(h)
        excerpt = t.slice(Math.max(0, i - 60), i + h.length + 60)
        break
      }
    }
    if (!score) {
      // Keyword overlap fallback.
      const words = q.split(' ').filter(w => w.length > 3)
      const n = words.filter(w => t.includes(w)).length
      if (n >= 3) {
        score = 1
        const anchor = words.find(w => t.includes(w)) || ''
        const i = t.indexOf(anchor)
        excerpt = t.slice(Math.max(0, i - 60), i + 120)
      }
    }
    if (score) out.push({ sourceId: id, score, excerpt })
  }
  return out.sort((a, b) => b.score - a.score)
}

const CLAIM_STOP = new Set(
  'the,a,an,and,or,of,to,in,on,for,with,is,are,was,were,be,by,as,at,from,that,this,it,its,into,per,about,can,has,have,had,more,most,other,than,then,also,may,such,between,under,over,after,before,their,there,they,them,he,she,we,you,his,her,our,your,which,who,what,when,where,all,any,each,own,same,too,very,just,only,not,but,because,while,however,furthermore,moreover,therefore,hence,thus,first,second,third,one,two,three,et,al'.split(','),
)

function contentTokens(t: string): string[] {
  return normalizeText(t).split(' ').filter(w => w.length > 3 && !CLAIM_STOP.has(w))
}

/** Remove citation spans, source dots, and stray drag payloads before claim matching. */
export function stripCitationNoise(text: string): string {
  return (text || '')
    .replace(/\([^()\n]{0,80}\b(?:19|20)\d{2}[a-z]?\b[^()\n]{0,60}\)/g, ' ')
    .replace(/●/g, ' ')
    .replace(/\bcard:[a-z0-9]+\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Token-F1 similarity (0–1) between a doc sentence and a card.
 * Replaces raw keyword counting: requires real phrasal overlap, so
 * header-garbage and vague sentences no longer match everything.
 */
export function claimScore(sentence: string, finding: string, passage: string): number {
  const s = new Set(contentTokens(sentence))
  if (s.size < 3) return 0
  const c = new Set([...contentTokens(finding), ...contentTokens(passage)])
  if (!c.size) return 0
  let inter = 0
  s.forEach(w => { if (c.has(w)) inter++ })
  if (!inter) return 0
  const prec = inter / s.size
  const rec = inter / Math.min(c.size, 24)
  if (prec + rec === 0) return 0
  return (2 * prec * rec) / (prec + rec)
}

/** Rank source ids by keyword overlap with a paragraph (top-N for synthesis). */
export function rankSources(paragraph: string, keywordsBySource: Record<string, string[]>): string[] {
  const t = (paragraph || '').toLowerCase()
  return Object.entries(keywordsBySource)
    .map(([id, kws]) => ({ id, n: kws.filter(k => k && t.includes(k)).length }))
    .sort((a, b) => b.n - a.n)
    .map(x => x.id)
}
