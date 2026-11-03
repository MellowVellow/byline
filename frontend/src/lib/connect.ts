export const CONNECT_RELATIONS = ['Contrast', 'Cause → effect', 'Add on', 'Example'] as const

export const CONNECT_CONNECTORS = [
  [['Instead,', 'Yet', 'Still,'], ['However,', 'Nevertheless,', 'In contrast,']],
  [['So', "That's why", 'Which means'], ['As a result,', 'Consequently,', 'Therefore,']],
  [['Also,', 'On top of that,', 'Plus,'], ['Moreover,', 'Furthermore,', 'In addition,']],
  [['For example,', 'Take this:', 'Like'], ['For instance,', 'A case in point:', 'Notably,']],
] as const

const LINKED = /^(however|but|yet|so|also|still|instead|moreover|plus)\b/i
const CASUAL = /n['’]t|’s\b|crazy|just|lots|really|gonna/i
const FIGURE = /\b(trillions?|billions?|millions?|\d[\d,.]*\s?(%|percent))/i

export interface ConnectSeam {
  on: boolean
  v: number
  rel: number
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

export function isLinked(sentence: string): boolean {
  return LINKED.test(sentence)
}

export function connectRelationLabel(seam: ConnectSeam): string {
  return CONNECT_RELATIONS[seam.rel] || CONNECT_RELATIONS[0]
}

export function connectVariantLabel(seam: ConnectSeam, casual: boolean): string {
  const reg = casual ? 0 : 1
  const set = CONNECT_CONNECTORS[seam.rel]?.[reg] || CONNECT_CONNECTORS[0][reg]
  return set[seam.v % set.length]
}

export function guessConnectRelation(previous: string, next: string): number {
  if (/\b(not|no|little|never)\b|n['’]t/i.test(previous) || /\b(but|however|although|yet|though)\b/i.test(next)) return 0
  if (/^(for example|such as)/i.test(next)) return 3
  return /\b(build|because|cause|so)\b/i.test(next) ? 1 : 2
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

function segmentsFor(sents: string[], seams: ConnectSeam[], casual: boolean, i: number): Array<[string, string]> {
  const next = sents[i + 1]
  const seam = seams[i]
  if (!seam?.on || LINKED.test(next)) return [['k', next]]

  const connector = connectVariantLabel(seam, casual)
  const lead = next.match(/^(it['’]s just that|the thing is|basically)\s+/i)
  if (lead) return [['d', lead[0].trim()], ['i', connector], ['k', ' ' + next.slice(lead[0].length)]]

  const first = nextWord(next)
  if (/^(I|[A-Z]{2,})\b/.test(first)) return [['i', connector + ' '], ['k', next]]
  return [['d', first], ['i', connector + ' ' + lowerFirst(first)], ['k', next.slice(first.length)]]
}

export function transformConnect(
  orig: string,
  seams: ConnectSeam[],
  casual: boolean,
): { text: string; marks: ConnectMark[]; dels: string[] } {
  const sents = splitSentences(orig)
  if (sents.length < 2) return { text: orig, marks: [], dels: [] }

  let plain = sents[0]
  const marks: ConnectMark[] = []
  const dels: string[] = []

  seams.forEach((_seam, i) => {
    plain += ' '
    let removed = ''
    for (const [kind, value] of segmentsFor(sents, seams, casual, i)) {
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
  const seams = sents.slice(1).map((next, i) => ({
    on: true,
    v: 0,
    rel: guessConnectRelation(sents[i], next),
  }))
  const casual = isCasualRegister(orig)
  const transformed = transformConnect(orig, seams, casual)
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
  }
}

export function rerenderConnectSession(session: ConnectSession): ConnectSession {
  const transformed = transformConnect(session.orig, session.seams, session.casual)
  return {
    ...session,
    text: transformed.text,
    dels: transformed.dels,
    marks: transformed.marks,
  }
}
