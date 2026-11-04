export const CONNECT_RELATIONS = ['Contrast', 'Cause → effect', 'Add on', 'Example'] as const

export const CONNECT_CONNECTORS = [
  [['Instead,', 'Yet', 'Still,'], ['However,', 'Nevertheless,', 'In contrast,']],
  [['So', "That's why", 'Which means'], ['As a result,', 'Consequently,', 'Therefore,']],
  [['Also,', 'On top of that,', 'Plus,'], ['Moreover,', 'Furthermore,', 'In addition,']],
  [['For example,', 'Take this:', 'Like'], ['For instance,', 'A case in point:', 'Notably,']],
] as const

const CASUAL = /n['’]t|’s\b|crazy|just|lots|really|gonna/i
const FIGURE = /\b(trillions?|billions?|millions?|\d[\d,.]*\s?(%|percent))/i

export interface ConnectAlt {
  rel: number
  text: string
}

export interface ConnectSeam {
  on: boolean
  v: number
}

export interface ConnectMark {
  s: number
  e: number
}

export interface ConnectSession {
  from: number
  to: number
  orig: string
  text: string
  sents: string[]
  seams: ConnectSeam[]
  casual: boolean
  dels: string[]
  marks: ConnectMark[]
  alts: ConnectAlt[][]
}

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) || [])
    .map(x => x.trim())
    .filter(Boolean)
}

export function sentenceCount(text: string): number {
  return splitSentences((text || '').trim()).length
}

export function hasConnectSelection(text: string): boolean {
  return sentenceCount(text) >= 2
}

export const CONNECT_CHAR_THRESHOLD = 120

export function isLongSelection(text: string): boolean {
  return (text || '').trim().length >= CONNECT_CHAR_THRESHOLD
}

export function guessConnectRelation(previous: string, next: string): number {
  if (/\b(not|no|little|never)\b|n['’]t/i.test(previous) || /\b(but|however|although|yet|though)\b/i.test(next)) return 0
  if (/^(for example|such as)/i.test(next)) return 3
  return /\b(build|because|cause|so)\b/i.test(next) ? 1 : 2
}

export function firstAltOfRel(alts: ConnectAlt[], rel: number): number {
  const i = alts.findIndex(a => a.rel === rel)
  return i >= 0 ? i : 0
}

export function guessConnectConnector(previous: string, next: string, casual: boolean): { rel: number; connector: string } {
  const rel = guessConnectRelation(previous, next)
  const reg = casual ? 0 : 1
  const set = CONNECT_CONNECTORS[rel]?.[reg] || []
  return { rel, connector: set[0] || '' }
}

export function extractConnector(sentence: string): { connector: string; rest: string } | null {
  const all: string[] = []
  for (const rel of CONNECT_CONNECTORS) {
    for (const set of rel) {
      for (const c of set) all.push(c)
    }
  }
  const pattern = all
    .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|')
  const re = new RegExp('^(' + pattern + ')\\s*', 'i')
  const m = sentence.match(re)
  if (!m) return null
  const connector = m[0].trimEnd()
  return { connector, rest: sentence.slice(m[0].length) }
}

export function buildSeamAlts(sentence: string, prev: string, casual: boolean): ConnectAlt[] {
  const alts: ConnectAlt[] = []
  const seen = new Set<string>()
  const reg = casual ? 0 : 1

  const existing = extractConnector(sentence)
  if (existing) {
    const rel = guessConnectRelation(prev, sentence)
    alts.push({ rel, text: existing.connector })
    seen.add(existing.connector.toLowerCase())
  }

  for (let r = 0; r < 4; r++) {
    const set = CONNECT_CONNECTORS[r][reg]
    for (const c of set) {
      if (seen.has(c.toLowerCase())) continue
      alts.push({ rel: r, text: c })
      seen.add(c.toLowerCase())
    }
  }

  return alts
}

export function isCasualRegister(text: string): boolean {
  return CASUAL.test(text)
}

export function unsourcedFigure(text: string): string {
  return (text.match(FIGURE) || [])[0] || ''
}

function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s
}

function nextWord(sentence: string): string {
  return sentence.split(/\s+/)[0] || ''
}

function segmentsFor(sents: string[], seams: ConnectSeam[], alts: ConnectAlt[][], i: number): Array<[string, string]> {
  const next = sents[i + 1]
  const seam = seams[i]

  if (!seam.on) return [['k', next]]

  const alt = alts[i][seam.v] || { rel: seam.v % 4, text: '' }
  const lead = next.match(/^(it['’]s just that|the thing is|basically)\s+/i)

  if (lead) {
    return [['d', lead[0].trim()], ['i', alt.text], ['k', ' ' + next.slice(lead[0].length)]]
  }

  const existing = extractConnector(next)
  if (existing) {
    return [['d', existing.connector], ['i', alt.text], ['k', ' ' + existing.rest]]
  }

  const first = nextWord(next)
  if (/^(I|[A-Z]{2,})\b/.test(first)) {
    return [['i', alt.text + ' '], ['k', next]]
  }

  return [['d', first], ['i', alt.text + ' ' + lowerFirst(first)], ['k', next.slice(first.length)]]
}

export function transformConnect(
  orig: string,
  seams: ConnectSeam[],
  casual: boolean,
  alts: ConnectAlt[][],
): { text: string; marks: ConnectMark[]; dels: string[] } {
  const sents = splitSentences(orig)
  if (sents.length < 2) return { text: orig, marks: [], dels: [] }

  let plain = sents[0]
  const marks: ConnectMark[] = []
  const dels: string[] = []

  seams.forEach((_seam, i) => {
    plain += ' '
    let removed = ''
    for (const [kind, value] of segmentsFor(sents, seams, alts, i)) {
      if (kind === 'd') {
        removed += value
      } else {
        if (kind === 'i') marks.push({ s: plain.length, e: plain.length + value.length })
        plain += value
      }
    }
    dels[i] = removed
  })

  return { text: plain, marks, dels }
}


export function createConnectSession(from: number, raw: string, to?: number): ConnectSession | null {
  const orig = raw.trim()
  const sents = splitSentences(orig)
  if (sents.length < 2) return null

  const casual = isCasualRegister(orig)
  const seams: ConnectSeam[] = []
  const altsPerSeam: ConnectAlt[][] = []

  for (let i = 0; i < sents.length - 1; i++) {
    const alts = buildSeamAlts(sents[i + 1], sents[i], casual)
    const guessed = guessConnectConnector(sents[i], sents[i + 1], casual)
    const v = alts.findIndex(a => a.rel === guessed.rel && a.text === guessed.connector)
    seams.push({ on: true, v: v >= 0 ? v : 0 })
    altsPerSeam.push(alts)
  }

  const transformed = transformConnect(orig, seams, casual, altsPerSeam)
  return {
    from,
    to: to ?? from + orig.length,
    orig,
    text: transformed.text,
    sents,
    seams,
    casual,
    dels: transformed.dels,
    marks: transformed.marks,
    alts: altsPerSeam,
  }
}

export function rerenderConnectSession(session: ConnectSession): ConnectSession {
  const transformed = transformConnect(session.orig, session.seams, session.casual, session.alts)
  return {
    ...session,
    text: transformed.text,
    dels: transformed.dels,
    marks: transformed.marks,
  }
}
