/** Shared writing-config constants. Mirror: backend/app/constants.py — keep in sync. */
export const DICTIONS = ['Formal', 'Casual', 'Slang', 'Simple', 'General', 'Academic', 'Technical', 'Buzzwords', 'Bullshitting']
export const ASSISTS = ['Hint', 'Phrase', 'Sentence', 'Block', 'Question']
export const ASSIST_DESCRIPTIONS: Record<string, string> = {
  Hint: '1–3 word idea cues only.',
  Phrase: 'Finish current clause, ≤8 words.',
  Sentence: 'One fully developed sentence: picks up last thread, adds new evidence/cause/example, varied syntax, concrete ending, sets up next sentence.',
  Block: 'Whole paragraph sequence: 3–5 flowing sentences — claim → support/example → implication/contrast → closing transition. One complete idea, ready to insert.',
  Question: 'One question prompting next idea.',
}
export const PERSONAS = ['Skeptical reader', 'Ordinary reader', 'Expert reader', 'Supportive friend']

export const TRANSITIONS: Record<string, string[]> = {
  'Introduction / framing': ['To begin with, []', 'Regarding [], ', 'In this context, []', 'This essay argues that []', 'Recent studies suggest that []'],
  'Addition / similarity': ['Furthermore, []', 'Moreover, []', 'Similarly, []', 'Likewise, []', 'In addition, []'],
  'Example / clarification': ['For example, []', 'Specifically, []', 'In other words, []', 'For instance, []', 'Evidence suggests that []'],
  'Emphasis': ['Indeed, []', 'Notably, []', 'Above all, []', 'One key point is []', 'In fact, []'],
  'Cause / effect': ['Therefore, []', 'Consequently, []', 'As a result, []', 'As a consequence, []', 'Due to [], '],
  'Conclusion / summary': ['In conclusion, []', 'Overall, []', 'In summary, []', 'To sum up, []', 'Ultimately, []'],
  'Sequencing / progression': ['First, []', 'Next, []', 'Subsequently, []', 'Finally, []', 'First of all, []', 'In the meantime, []'],
  'Contrast / concession': ['However, []', 'Whereas []', 'Nevertheless, []', 'Although [], ', 'On the contrary, []', 'Despite this, []', 'Conversely, []'],
  'Condition / qualification': ['If [], ', 'Unless [], ', 'Provided that [], ', 'To some extent, []'],
  'Purpose / means': ['To achieve this, []', 'For this purpose, []', 'By doing so, []', 'In order to [], '],
}

export function matchText(query: string, text: string): boolean {
  const q = query.trim().toLowerCase(); if (!q) return true
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  return q.split(/\s+/).every(qw => t.split(/[^a-z]+/).some(tw => tw.startsWith(qw)))
}
export const digitFor = (i: number) => String((i + 1) % 10)

/** Reader kinds: all preset purple (--ai); labels distinguish, color does not. */
export const REACTION_STYLE: Record<string, { color: string; label: string }> = {
  question: { color: 'var(--ai, #6D3BE0)', label: 'Question' },
  critique: { color: 'var(--ai, #6D3BE0)', label: 'Critique' },
  comment: { color: 'var(--ai, #6D3BE0)', label: 'Comment' },
  compliment: { color: 'var(--ai, #6D3BE0)', label: 'Compliment' },
}
/** Language kinds: all preset red (--lt); labels distinguish, color does not. */
export const LANG_STYLE: Record<string, { color: string; label: string }> = {
  grammar: { color: 'var(--lt, #C0281F)', label: 'Grammar' },
  vocabulary: { color: 'var(--lt, #C0281F)', label: 'Word choice' },
  relevance: { color: 'var(--lt, #C0281F)', label: 'Cohesion' },
}
/** Tab/stack order: red, yellow, blue, purple. */
export const LAYER_ORDER: Record<string, number> = { grammar: 0, vocabulary: 1, claim: 2, relevance: 3, reaction: 3 }
