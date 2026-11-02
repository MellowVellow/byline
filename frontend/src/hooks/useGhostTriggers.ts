import { useRef } from 'react'
import { caretSignals } from '../lib/sentence-state'

/** Connective categories — ported from Ghost text feel test.html. */
export const CONN: Record<string, string[]> = {
  contrast: ['however', 'but', 'yet', 'still', 'nevertheless', 'on the other hand', 'although', 'whereas'],
  addition: ['also', 'moreover', 'furthermore', 'in addition', 'besides', 'likewise'],
  cause: ['therefore', 'thus', 'consequently', 'as a result', 'so', 'because', 'since'],
  sequence: ['then', 'next', 'afterwards', 'finally', 'first', 'second', 'meanwhile'],
  example: ['for example', 'for instance', 'in particular', 'such as'],
}
const ALL: Array<{ w: string; r: string }> = []
for (const r in CONN) CONN[r].forEach(w => ALL.push({ w, r }))
ALL.sort((a, b) => b.w.length - a.w.length)
const CONN_RE = new RegExp('\\b(' + ALL.map(c => c.w.replace(/ /g, '\\s+')).join('|') + ')\\b', 'gi')

export interface ConnMatch {
  s: number
  e: number
}

function sentences(t: string): Array<{ s: number; e: number }> {
  const out: Array<{ s: number; e: number }> = []
  const re = /[^.!?…\n]+[.!?…]*["')\]]*\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) out.push({ s: m.index, e: m.index + m[0].length })
  return out
}

/** Find connective matches in sentences adjacent to the caret. */
export function findConnectives(text: string, caret: number): ConnMatch[] {
  const ss = sentences(text)
  const near = ss
    .filter(x => x.e === caret || x.s === caret || (x.s < caret && x.e > caret) || x.e <= caret)
    .slice(-1)
    .concat(ss.filter(x => x.s >= caret).slice(0, 1))
  const found: ConnMatch[] = []
  for (const sen of near) {
    const seg = text.slice(sen.s, sen.e)
    CONN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = CONN_RE.exec(seg))) found.push({ s: sen.s + m.index, e: sen.s + m.index + m[0].length })
  }
  return found
}

/** Alternatives for a connective word (same rhetorical family). */
export function connectiveAlternatives(word: string): { why: string; opts: string[] } {
  const key = word.toLowerCase().replace(/\s+/g, ' ')
  const rel = ALL.find(x => x.w === key)
  const opts = (rel ? CONN[rel.r] : []).filter(w => w !== key).slice(0, 5)
  return { why: `Swap "${word}"`, opts }
}

export interface TriggerState {
  lastKey: number
  bursts: number
  sentIdx: number
  fired: { g?: string; c?: string; p?: string }
}

/** Dual-threshold trigger evaluator: slow 700ms end-zone ghost, long 2500ms between-sentence connective. */
export function useGhostTriggers(slowMs = 700, longMs = 2500) {
  const ref = useRef<TriggerState>({ lastKey: performance.now(), bursts: 0, sentIdx: 0, fired: {} })
  const thresh = useRef({ slowMs, longMs })
  thresh.current = { slowMs, longMs }
  function onInput(fullText: string, caret: number) {
    const now = performance.now()
    const s = caretSignals(fullText, caret, caret)
    if (s.sentIdx !== ref.current.sentIdx) {
      ref.current.sentIdx = s.sentIdx
      ref.current.bursts = 1
    } else if (now - ref.current.lastKey >= thresh.current.slowMs) {
      ref.current.bursts++
    } else if (ref.current.bursts === 0) {
      ref.current.bursts = 1
    }
    ref.current.lastKey = now
    ref.current.fired = {}
  }
  function evaluate(fullText: string, caret: number, selEnd: number): { ghost: boolean; connective: boolean; phrase: boolean } {
    const { slowMs: slow, longMs: long } = thresh.current
    const idle = performance.now() - ref.current.lastKey
    const s = caretSignals(fullText, caret, selEnd)
    if (fullText.trim().length <= 8) return { ghost: false, connective: false, phrase: false }
    const key = `${s.sentIdx}|${caret}`
    const out = { ghost: false, connective: false, phrase: false }
    // Pause-anywhere: end of doc OR end of sentence/block (complete before caret,
    // newline or sentence boundary after). Previously zone==='end' only fired at
    // the very last character, so mid-doc pauses never suggested.
    const afterSlice = fullText.slice(caret, caret + 4)
    const atSoftEnd =
      s.zone === 'end' ||
      s.complete ||
      afterSlice.startsWith('\n') ||
      afterSlice.trim().length === 0
    if (idle >= slow && atSoftEnd && !ref.current.fired.g) {
      ref.current.fired.g = key
      out.ghost = true
    }
    if (idle >= long && s.zone === 'between' && !ref.current.fired.c) {
      ref.current.fired.c = key
      out.connective = true
    }
    if (idle >= long && s.zone === 'end' && !s.complete && ref.current.bursts >= 3 && !ref.current.fired.p) {
      ref.current.fired.p = key
      out.phrase = true
    }
    return out
  }
  function touch() {
    ref.current.lastKey = performance.now()
  }
  return { ref, onInput, evaluate, touch, slowMs, longMs }
}

export type UseGhostTriggers = ReturnType<typeof useGhostTriggers>
