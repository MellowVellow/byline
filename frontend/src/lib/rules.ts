export interface LinterRule { id: string; name: string; category: string; color: 'amber' | 'green' | 'cyan' | 'rose' | 'violet'; description: string; instruction: string }
const R = (id: string, name: string, category: string, color: LinterRule['color'], description: string, instruction: string): LinterRule => ({ id, name, category, color, description, instruction })
export const LINT_COLORS: Record<string, { label: string; intent: string }> = {
  amber: { label: 'Logic & Structure', intent: 'Missing premises, buried conclusions, invalid assumptions' },
  green: { label: 'Concision & Clarity', intent: 'Fluff, wordiness, passive blame, redundancy' },
  cyan: { label: 'Flow & Transitions', intent: 'Jarring shifts, missing connective tissue, awkward emphasis' },
  rose: { label: 'Evidence & Grounding', intent: 'Unsupported claims, missing definitions/citations' },
  violet: { label: 'Custom Rules', intent: 'User-defined rules typed on the fly' },
}
export const LINT_PRIORITY: Record<string, number> = { violet: 0, amber: 1, rose: 2, green: 3, cyan: 4 }
export const LINTER_RULE_LIBRARY: LinterRule[] = [
  R('R_AMB_01', 'BLUF / Bottom Line Up Front', 'Logic & Structure', 'amber', 'Main takeaway first, not buried behind background.', 'Flag sentences that place extensive background context, premises, or qualifiers before the primary conclusion or action.'),
  R('R_AMB_02', 'Premise Contradiction Check', 'Logic & Structure', 'amber', 'Statements contradicting an earlier premise.', 'Flag claims, recommendations, or data points that violate a core premise, constraint, or fact declared previously in the context.'),
  R('R_AMB_03', 'Unsupported Causal Jump', 'Logic & Structure', 'amber', 'Cause-effect asserted without the intermediate link.', "Flag transitions like 'therefore', 'consequently', or 'as a result' when the preceding sentence does not logically entail the claim."),
  R('R_AMB_04', 'Scope & Claim Scale Alignment', 'Logic & Structure', 'amber', 'Sweeping claims must match data scope.', "Flag absolute generalizations ('always', 'never', 'all users') when the underlying claim is based on limited or specific observations."),
  R('R_AMB_05', 'False Dilemma / Dichotomy', 'Logic & Structure', 'amber', 'Binary framing when alternatives exist.', 'Flag phrasing that forces a choice between two extreme options while ignoring nuanced compromises or alternative solutions.'),
  R('R_GRN_01', 'Nominalization (Zombie Nouns)', 'Concision & Clarity', 'green', 'Verbs buried in noun phrases.', "Flag nominalizations where active verbs are turned into heavy noun phrases ('make an investigation into' -> 'investigate')."),
  R('R_GRN_02', 'Redundant Word Pairs', 'Concision & Clarity', 'green', 'Tautologies and stacked repeats.', "Flag paired words that express identical concepts ('basic fundamentals', 'future plans', 'null and void')."),
  R('R_GRN_03', 'Prepositional Stack Elimination', 'Concision & Clarity', 'green', 'Chains of 3+ prepositional phrases.', 'Flag sequences containing three or more consecutive prepositions (of, in, at, for, on, to, with).'),
  R('R_GRN_04', 'Passive Blame & Obfuscation', 'Concision & Clarity', 'green', 'Passive voice hiding the actor.', "Flag passive voice phrasing where the actor is omitted or buried in a 'by [actor]' clause."),
  R('R_GRN_05', 'Vague Pronoun Reference', 'Concision & Clarity', 'green', 'Ambiguous this/that/it/they.', 'Flag demonstrative or personal pronouns used at sentence start without a clarifying noun; vague pronouns like it with unclear antecedent.'),
  R('R_CYN_01', 'Sentence Opener Monotony', 'Flow & Transitions', 'cyan', 'Consecutive sentences opening identically.', 'Flag three or more consecutive sentences starting with the exact same word, noun phrase, or grammatical structure.'),
  R('R_CYN_02', 'Abrupt Topic Shift', 'Flow & Transitions', 'cyan', 'New concept with no bridge.', 'Flag sentences that pivot to an entirely new concept without a logical bridge, macro-transition, or linking term.'),
  R('R_CYN_03', 'Stress Position Optimization', 'Flow & Transitions', 'cyan', 'Sentences ending on weak filler.', "Flag sentences that end on weak filler words ('etc.', 'in general', 'to some extent') instead of key terms."),
  R('R_CYN_04', 'Parallelism Violation', 'Flow & Transitions', 'cyan', 'Mismatched grammatical forms in series.', 'Flag lists or comparisons where grammatical structures mismatch (mixing gerunds with infinitives).'),
  R('R_RSE_01', 'Unanchored Jargon / Acronym', 'Evidence & Grounding', 'rose', 'Jargon/acronyms undefined on first use.', 'Flag domain-specific jargon, obscure technical acronyms, or internal terms on first occurrence if not defined in context.'),
  R('R_RSE_02', 'Unsubstantiated Empirical Claim', 'Evidence & Grounding', 'rose', 'Quant claims without source/figures.', "Flag phrases like 'studies show', 'data proves', or 'metrics skyrocketed' when no specific number, benchmark, or source is cited."),
  R('R_RSE_03', 'Abstract Principle Without Instance', 'Evidence & Grounding', 'rose', 'Abstractions with no concrete example.', 'Flag paragraphs containing purely high-level abstractions without a concrete example or practical application scenario.'),
  R('R_RSE_04', 'Unqualified Universal Assumption', 'Evidence & Grounding', 'rose', 'No-tradeoff absolute assertions.', 'Flag bold assertions that present a complex technical or operational choice as having no trade-offs or downside risks.'),
  R('R_VIO_01', 'Hedging & Apologetic Tone', 'Style & Tone', 'violet', 'Weak qualifiers eroding authority.', "Flag hedging phrases such as 'I just think that', 'arguably', 'it seems to me', 'sort of', or 'in my humble opinion'."),
  R('R_VIO_02', 'Cliché & Buzzword Saturation', 'Style & Tone', 'violet', 'Buzzwords replacing precise verbs.', "Flag generic buzzwords ('synergy', 'paradigm shift', 'game-changer', 'move the needle', 'leverage') that replace precise verbs."),
  R('R_VIO_03', 'Stacked Adverb Modifier', 'Style & Tone', 'violet', 'Very/really + weak word.', "Flag intensifiers like 'very', 'extremely', 'really', or 'totally' paired with weak verbs/adjectives instead of a single strong word."),
  R('R_VIO_04', 'Forced Enthusiasm', 'Style & Tone', 'violet', 'Exclamation/cheerleading in pro drafts.', 'Flag exclamation marks, rhetorical cheerleading, or overly enthusiastic adjectives in technical or analytical drafts.'),
]
export type LintResult = { rule_id: string; color_category: string; target: string; context: string; message: string; suggestion: string; uid?: string }
