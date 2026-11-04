export type CardKind = 'source' | 'ai'
export type CardType =
  | 'fact' | 'stat' | 'quote'
  | 'idea' | 'question' | 'premise' | 'term' | 'visual'
export type CiteType = 'intext' | 'narr' | 'direct' | 'para'

export const CITE_TYPES: CiteType[] = ['intext', 'narr', 'direct', 'para']
export const CITE_LABELS: Record<CiteType, string> = {
  intext: 'In-text citation',
  narr: 'Narrative citation',
  direct: 'Direct quotation citation',
  para: 'Paraphrase citation',
}
export const CITE_SHORT: Record<CiteType, string> = {
  intext: 'In-text',
  narr: 'Narrative',
  direct: 'Direct quotation',
  para: 'Paraphrase',
}

export interface CSLAuthor {
  family?: string
  given?: string
  literal?: string
}

export interface SourceCSL {
  type: string
  title: string
  author: CSLAuthor[]
  'container-title'?: string
  issued: { 'date-parts': number[][] }
  DOI?: string
  URL?: string
  accessed: { 'date-parts': number[][] }
  provenance: { author: 'verified' | 'inferred'; issued: 'verified' | 'inferred' }
  kind?: string
}

export interface LibraryCard {
  id: string
  kind: CardKind
  type: CardType
  finding: string
  passage: string
  why_useful: string
  page: number
  vision: boolean
  sourceId: string
  status: 'found' | 'flagged' | 'derived' | 'vision'
  keywords: string[]
  negPhrases?: string[]
}

export interface LibrarySource extends SourceCSL {
  id: string
}

export type CiteGrid = Record<CiteType, string[]>
export const EMPTY_CITE_GRID: CiteGrid = { intext: [], narr: [], direct: [], para: [] }

export function normalizeText(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/-\s+/g, '')
    .replace(/[^a-z0-9% ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function keywordsOf(finding: string, type: string): string[] {
  const stop = new Set('the,a,an,and,or,of,to,in,on,for,with,is,are,was,were,be,by,as,at,from,that,this,it,its,into,per,about,than,more,less,than'.split(','))
  return normalizeText(`${finding} ${type}`)
    .split(' ')
    .filter(w => w.length > 2 && !stop.has(w))
    .slice(0, 8)
}

/** Relevance 0–3: keyword overlap with whole doc text. */
export function relevanceScore(card: LibraryCard, docText: string): number {
  const t = (docText || '').toLowerCase()
  if (!t.trim()) return 0
  let n = 0
  for (const k of card.keywords) {
    if (k && t.includes(k)) n++
  }
  return Math.min(3, n)
}

export function dots(n: number): string {
  return '●'.repeat(Math.max(0, Math.min(3, n))) + '○'.repeat(3 - Math.max(0, Math.min(3, n)))
}

const UNKNOWN_AUTHOR_TOKENS = new Set(['unknown', 'anon', 'n.a.', 'na', ''])

/** True when no usable author exists (APA: substitute the title instead).
 * An explicit "Anonymous" byline is a real author — kept as-is. */
export function isUnknownAuthor(author?: CSLAuthor[]): boolean {
  if (!author || author.length === 0) return true
  if (author.length !== 1) return false
  const a = author[0]
  if (a.family?.trim()) return false
  const key = (a.literal || '').trim()
  if (!key) return true
  if (key.toLowerCase() === 'anonymous') return false
  return UNKNOWN_AUTHOR_TOKENS.has(key.toLowerCase().replace(/\.+$/, ''))
}

/** First few words of the title for in-text citations (APA). */
export function titleShort(title: string, n = 4): string {
  const words = (title || '').trim().split(/\s+/)
  return words.slice(0, Math.max(1, n)).join(' ').replace(/[,;:]+$/, '') || 'Untitled'
}

export function authorShort(source: SourceCSL): string {
  if (isUnknownAuthor(source.author)) return `"${titleShort(source.title)}"`
  const a = source.author![0]
  if (a.literal) {
    const lit = a.literal.trim()
    if (/\bet al/i.test(lit)) return lit // preserve "et al." in inline cites
    const first = lit.split(/\s+/)[0] || 'Anon'
    if (source.author!.length >= 3) return `${first} et al.`
    if (source.author!.length === 2) {
      const b = source.author![1]
      const raw = (b.literal || b.family || '').trim()
      const second = raw ? raw.split(/\s+/)[0] : ''
      if (second) return `${first} & ${second}`
    }
    return first
  }
  const first = a.family || 'Anon'
  if (source.author!.length >= 3 && !/\bet al/i.test(first)) return `${first} et al.`
  if (source.author!.length === 2) {
    const b = source.author![1]
    const raw = (b.literal || b.family || '').trim()
    const second = raw ? raw.split(/\s+/)[0] : ''
    if (second) return `${first} & ${second}`
  }
  return first
}

export function sourceYear(source: SourceCSL): string {
  try {
    const dp = source.issued?.['date-parts']
    return dp?.[0]?.[0] ? String(dp[0][0]) : 'n.d.'
  } catch {
    return 'n.d.'
  }
}

const LIB_KEY = 'byline.library.v1'
const REFS_KEY = 'byline.refs.html'

export function loadLibrary(): { cards: LibraryCard[]; sources: LibrarySource[] } {
  try {
    const raw = localStorage.getItem(LIB_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p.cards) && Array.isArray(p.sources)) return p
    }
  } catch { /* ignore */ }
  return { cards: [], sources: [] }
}

export function saveLibrary(cards: LibraryCard[], sources: LibrarySource[]) {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify({ cards, sources }))
  } catch { /* quota: keep in memory */ }
}

export function loadRefsHtml(): string {
  try {
    return localStorage.getItem(REFS_KEY) || ''
  } catch {
    return ''
  }
}

export function saveRefsHtml(html: string) {
  try {
    localStorage.setItem(REFS_KEY, html)
  } catch { /* ignore */ }
}

export const SOURCE_TEXT_CAP = 25000

/** Persist a source's full fetched text (IndexedDB, localStorage fallback). */
export async function saveSourceText(id: string, text: string): Promise<void> {
  const { idbSetSourceText } = await import('../lib/storage')
  await idbSetSourceText(id, (text || '').slice(0, SOURCE_TEXT_CAP))
}

export async function loadSourceText(id: string): Promise<string | null> {
  const { idbGetSourceText } = await import('../lib/storage')
  return idbGetSourceText(id)
}

/** Synthesized suggestion: sentence grounded in one card+passage. */
export interface SynthSuggestion {
  sentence: string
  sourceId: string
  card: { type: string; finding: string; passage: string; why_useful: string; page: number }
}
