/** Offline fallback checker — ported from Harper feel test.html (typos + doubles + a/an). */
export interface TypoFix {
  s: number
  e: number
  repl: string
}

const TYPOS: Record<string, string> = {
  teh: 'the', recieve: 'receive', definately: 'definitely', alot: 'a lot', seperate: 'separate',
  wich: 'which', becuase: 'because', adress: 'address', occured: 'occurred', untill: 'until', thier: 'their',
  freind: 'friend', wierd: 'weird', tommorow: 'tomorrow', beleive: 'believe', goverment: 'government',
}
const VOWELISH = 'apple|example|idea|answer|error|issue|interesting|important|easy|hour|email|image|option'

export function fallbackCheck(text: string): TypoFix[] {
  const out: TypoFix[] = []
  let m: RegExpExecArray | null
  const word = /[A-Za-z']+/g
  while ((m = word.exec(text))) {
    const w = m[0]
    const low = w.toLowerCase()
    if (TYPOS[low]) {
      let r = TYPOS[low]
      if (w[0] !== low[0]) r = r[0].toUpperCase() + r.slice(1)
      out.push({ s: m.index, e: m.index + w.length, repl: r })
    } else if (w === 'i') {
      out.push({ s: m.index, e: m.index + 1, repl: 'I' })
    }
  }
  const dbl = /\b([A-Za-z]+) \1\b/gi
  while ((m = dbl.exec(text))) out.push({ s: m.index + m[1].length, e: m.index + m[0].length, repl: '' })
  const art = new RegExp('\\b(a) (?=(?:' + VOWELISH + ')\\b)', 'gi')
  while ((m = art.exec(text))) out.push({ s: m.index, e: m.index + 1, repl: m[1] === 'A' ? 'An' : 'an' })
  return out
}

/** Allowed Harper lint kinds (feel-test filter). */
export const HARPER_ALLOWED = ['Spelling', 'Grammar', 'Capitalization', 'Typo', 'Repetition', 'Agreement']

export const HARPER_HOLD_MS = 550
export const HARPER_FADE_MS = 1800
