/** Sentence completion-state classifier — ported from Completion state test.html.
 * States: Complete | Open | Unsure | Empty | NA (code blocks: ghost off).
 * Modes: doc (markdown-aware) | prompt (plain).
 */
export type SentenceState = 'Complete' | 'Open' | 'Unsure' | 'Empty' | 'NA'
export type ClassifyMode = 'doc' | 'prompt'

const FUNC = new Set(
  'the a an and but or nor of to in on at by for with from as that which who whom whose if when while because although than is are was were be been am do does did has have had will would can could should may might must not very into onto about over under between through during before after without within their his her its our your my'.split(' ')
)
const MARK = /^\s*(?:(#{1,6})\s+|(\d+[.)]|[-*+\u2022]|[a-zA-Z]\))\s+(?:\[[ xX]\]\s+)?|(>)\s+)/
const TERM = /[.!?\u2026\u3002\uFF01\uFF1F]+["'\u201D\u2019)\]]*$/
const OPENABBR = /\b(e\.g|i\.e|cf|vs|Dr|Mr|Mrs|Ms|Prof|Fig|No)\.$/i

export interface ClassifyResult {
  block: string
  marker: string
  text: string
  state: SentenceState
  why: string
}

export function classifyLine(raw: string, md: ClassifyMode = 'doc', prev = '', inFence = false): ClassifyResult {
  if (md === 'doc' && (inFence || /^( {4}|\t)/.test(raw)))
    return { block: 'code', text: raw, marker: '', state: 'NA', why: 'Code: ghost text off' }
  let block = 'prose'
  let text = raw
  let marker = ''
  if (md === 'prompt') {
    block = 'prompt'
    text = raw
  } else {
    const m = raw.match(MARK)
    if (m) {
      marker = m[0]
      text = raw.slice(m[0].length)
      block = m[1] ? 'heading' : m[2] ? 'list item' : 'quote'
    } else if (/^\s*(#{1,6}|\d+[.)]|[-*+\u2022]|>)\s*$/.test(raw)) {
      marker = raw
      text = ''
      block = 'list item'
    }
  }
  text = text.replace(/\s+$/, '')
  const seg = text.split(/(?<=[.!?\u2026])\s+/).pop() || ''
  const last = (seg.split(/\s+/).pop() || '').toLowerCase().replace(/[^a-z'.]/g, '').replace(/\.$/, '')
  const r = (state: SentenceState, why: string): ClassifyResult => ({ block, marker, text, state, why })
  if (!text) return r('Empty', prev && /:\s*$/.test(prev) ? 'Marker only, after a colon: list items expected' : 'Marker only: nothing to complete yet')
  if (block === 'heading') return r('Complete', 'Heading: no punctuation expected')
  if (/[,;:\u2014\u2013-]$/.test(text))
    return r('Open', `Ends on a joiner (${text.slice(-1)})${text.slice(-1) === ':' ? ': list or explanation follows' : ''}`)
  if (OPENABBR.test(text)) return r('Open', 'The final period belongs to an abbreviation')
  if (/\betc\.$/i.test(text)) return r('Unsure', '"etc." can end a sentence or not')
  const q =
    (seg.match(/"/g) || []).length % 2 === 1 ||
    (seg.match(/\u201C/g) || []).length > (seg.match(/\u201D/g) || []).length ||
    (seg.match(/\(/g) || []).length > (seg.match(/\)/g) || []).length
  if (TERM.test(text) && !q) return r('Complete', 'Ends with sentence-ending punctuation')
  if (q) return r('Open', 'Unclosed quote or bracket')
  if (FUNC.has(last)) return r('Open', `Ends on a function word ("${last}")`)
  if (block === 'list item') return r('Complete', 'List item: items usually have no final punctuation')
  return r('Unsure', 'No punctuation, ends on a content word. Wait for a pause, then offer both a continuation and a next sentence')
}

/** Punctuation-only baseline (for tests / comparison). */
export function naiveState(line: string): 'Complete' | 'Open' {
  return /[.!?]$/.test(line.trim()) ? 'Complete' : 'Open'
}

export type GhostBias = 'sentence' | 'fragment' | null

/** Auto-suggest gating for a caret-line completion state:
 * NA/Empty suppress the trigger; Complete biases to next-sentence,
 * Open biases to continuation; Unsure uses the assist default. */
export function ghostTriggerForState(state: SentenceState): { suppress: boolean; bias: GhostBias } {
  if (state === 'NA' || state === 'Empty') return { suppress: true, bias: null }
  if (state === 'Complete') return { suppress: false, bias: 'sentence' }
  if (state === 'Open') return { suppress: false, bias: 'fragment' }
  return { suppress: false, bias: null }
}

/** Caret-zone signals for ghost triggers (ported from Ghost text feel test.html). */
export type CaretZone = 'end' | 'between' | 'mid'
export interface CaretSignals {
  zone: CaretZone
  complete: boolean
  dangling: boolean
  sentIdx: number
}

const DANGLING = new Set('the a an and but or of to in on because that which with for is are as so if when while'.split(' '))

export function caretSignals(fullText: string, caret: number, selEnd: number): CaretSignals {
  const before = fullText.slice(0, caret)
  const atEnd = caret === fullText.length && selEnd === caret
  const complete = /[.!?…]["')\]]*\s*$/.test(before) || /\n\s*$/.test(before)
  const between = !atEnd && complete && fullText.slice(caret).trim().length > 0
  const zone: CaretZone = atEnd ? 'end' : between ? 'between' : 'mid'
  const sentIdx = (before.match(/[.!?…]+["')\]]*(\s|$)/g) || []).length
  const last = (before.trim().split(/\s+/).pop() || '').toLowerCase().replace(/[^a-z']/g, '')
  return { zone, complete, dangling: !complete && DANGLING.has(last), sentIdx }
}
