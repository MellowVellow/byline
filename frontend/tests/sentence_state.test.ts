import { describe, it, expect } from 'vitest'
import { classifyLine, ghostTriggerForState } from '../src/lib/sentence-state'

// 20-case suite from Completion state test.html (punctuation-only vs rules)
const CASES: Array<[string, 'doc' | 'prompt', string]> = [
  ['The cat sat on the mat.', 'doc', 'Complete'],
  ['The cat sat on the', 'doc', 'Open'],
  ['However,', 'doc', 'Open'],
  ['- buy milk', 'doc', 'Complete'],
  ['- buy milk and', 'doc', 'Open'],
  ['1. Install the package', 'doc', 'Complete'],
  ['2) Then restart the', 'doc', 'Open'],
  ['## Results', 'doc', 'Complete'],
  ['Ingredients:', 'doc', 'Open'],
  ['See e.g.', 'doc', 'Open'],
  ['He paid 3.5', 'doc', 'Unsure'],
  ['She said "we should go', 'doc', 'Open'],
  ['write a poem about cats', 'prompt', 'Unsure'],
  ['write a poem about', 'prompt', 'Open'],
  ['Summarize this article in 3 bullets.', 'prompt', 'Complete'],
  ['Is this right?', 'doc', 'Complete'],
  ['    const x = 5;', 'doc', 'NA'],
  ['Wait...', 'doc', 'Complete'],
  ['I think that it works well', 'doc', 'Unsure'],
  ['3.', 'doc', 'Empty'],
]

describe('sentence-state classifier (V4 feel-test port)', () => {
  it('classifies the 20-case suite', () => {
    for (const [txt, md, exp] of CASES) {
      expect(classifyLine(txt, md, '', false).state).toBe(exp)
    }
  })
})

describe('ghost trigger gating matrix', () => {
  it('suppresses NA and Empty, biases Complete/Open, defaults Unsure', () => {
    expect(ghostTriggerForState('NA')).toEqual({ suppress: true, bias: null })
    expect(ghostTriggerForState('Empty')).toEqual({ suppress: true, bias: null })
    expect(ghostTriggerForState('Complete')).toEqual({ suppress: false, bias: 'sentence' })
    expect(ghostTriggerForState('Open')).toEqual({ suppress: false, bias: 'fragment' })
    expect(ghostTriggerForState('Unsure')).toEqual({ suppress: false, bias: null })
  })

  it('end-to-end: code fence suppresses, finished sentence biases sentence', () => {
    const fenced = classifyLine('const x = 5;', 'doc', '', true)
    expect(fenced.state).toBe('NA')
    expect(ghostTriggerForState(fenced.state).suppress).toBe(true)
    const done = classifyLine('The cat sat on the mat.', 'doc', '', false)
    expect(ghostTriggerForState(done.state)).toEqual({ suppress: false, bias: 'sentence' })
    const open = classifyLine('However,', 'doc', '', false)
    expect(ghostTriggerForState(open.state)).toEqual({ suppress: false, bias: 'fragment' })
  })
})
