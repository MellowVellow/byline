export interface ReviewTemplate {
  id: string
  label: string
  text: string
}

const LINT_RULES = [
  'R_AMB_01 BLUF: main takeaway first',
  'R_AMB_02 Premise Contradiction: no contradicting premises',
  'R_AMB_03 Unsupported Causal Jump: no therefore without entailment',
  'R_AMB_04 Scope Alignment: no absolute generalizations',
  'R_AMB_05 False Dilemma: no forced binary',
  'R_GRN_01 Nominalization: active verbs over zombie nouns',
  'R_GRN_02 Redundant Pairs: no tautologies',
  'R_GRN_03 Prepositional Stack: max 2 prepositional phrases',
  'R_GRN_04 Passive Blame: no actor-hiding passive',
  'R_GRN_05 Vague Pronoun: no ambiguous this/it',
  'R_CYN_01 Opener Monotony: vary openers',
  'R_CYN_02 Abrupt Shift: bridge topic shifts',
  'R_CYN_03 Stress Position: end on key terms',
  'R_CYN_04 Parallelism: parallel list forms',
  'R_RSE_01 Unanchored Jargon: define jargon first use',
  'R_RSE_02 Unsubstantiated Claim: numbers and source for empirical claims',
  'R_RSE_03 Abstract Without Instance: concrete example per abstraction',
  'R_RSE_04 No-tradeoff Absolute: state trade-offs',
  'R_VIO_01 Hedging: no weak qualifiers',
  'R_VIO_02 Buzzword Saturation: no generic buzzwords',
  'R_VIO_03 Stacked Adverbs: strong word over very+weak',
  'R_VIO_04 Forced Enthusiasm: no exclamation or cheerleading',
]

export const REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    id: 'supervisor',
    label: 'Supervisor',
    text:
      'Supervisor: review argument structure, consistency, thesis alignment, and reasoning. ' +
      'Flag thesis drift, missing warrant, contradiction, repetition, weak flow, and unsupported claims. ' +
      'Each issue must include a grammatical replacement plus up to two alternatives. ' +
      'Never flag grammar or spelling (handled elsewhere).',
  },
  {
    id: 'researcher',
    label: 'Researcher',
    text:
      'Researcher: find sentences that make checkable factual claims. For each claim, say what it asserts, ' +
      'whether it needs a source, and whether the text actually supports it. ' +
      'Flag unsupported, outdated, overgeneralized, and uncited empirical claims. ' +
      'Propose a grammatical rewrite that adds a citation cue or an honest hedge. ' +
      'Never flag grammar or spelling (handled elsewhere).',
  },
  {
    id: 'linter',
    label: 'Linter',
    text:
      'Strict linter: flag only violations covered by these rules. ' +
      LINT_RULES.map(r => `${r}.`).join(' ') +
      ' For each violation, quote the exact words and propose a grammatical replacement.',
  },
]
