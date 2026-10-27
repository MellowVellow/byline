import type { Issue, Reaction } from './types'
/** Canned demo data when backend unreachable (Vercel static demo). Anchored by exact quotes from sample. */
export const SAMPLE_DOC = `<p>Cats are independent, as I said. Dogs needs daily walks. A plethora of reasons exist for choosing a cat.</p><p>Cats are quiet. Dogs bark. Cats live longer than dogs. Finally, cats are just cute.</p>`
export const SAMPLE_CONTEXT = 'Argue which animal is better, cats or dogs, with at least 2 arguments. Audience: undecided first-time pet owners.'
export const FALLBACK_ISSUES: Issue[] = [
  { quote: 'plethora', context: 'A plethora of reasons exist', type: 'vocabulary', reason: 'Word above General level.', replacement: 'many' },
  { quote: 'as I said', context: 'Cats are independent, as I said.', type: 'relevance', reason: 'Refers back to something not yet said.', replacement: '' },
]
export const FALLBACK_REACTIONS: Reaction[] = [
  { quote: 'as I said', context: 'Cats are independent, as I said.', kind: 'question', text: 'You already mentioned this — where?' },
  { quote: 'Finally, cats are just cute.', context: 'Finally, cats are just cute.', kind: 'critique', text: 'This lands as feeling, not an argument. A reader may not be convinced.' },
]
export const FALLBACK_SUGGESTIONS = ['cost of care', 'Dogs, by comparison, need daily attention', 'A cat can be left alone for a weekend.']
