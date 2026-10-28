export type Anchored = { quote: string; context: string }
export type Issue = Anchored & { type: 'vocabulary' | 'relevance'; reason: string; replacement: string; alternatives?: { text: string; note: string }[]; id?: string; stale?: boolean }
export type Reaction = Anchored & { kind: 'question' | 'comment' | 'compliment' | 'critique'; text: string; id?: string; stale?: boolean }
export type GrammarMatch = { from: number; to: number; message: string; replacements: string[]; rule: string; stale?: boolean; quote?: string }
export type Reading = { title: string; url: string; label: string; why: string; excerpt: string; claim_quote: string; claim_context: string; stale?: boolean; verdict?: string; summary?: string; domain?: string }
export type OutlineItem = Anchored & { label: string }
export type AnchorKind = 'grammar' | 'vocabulary' | 'relevance' | 'reaction' | 'claim'
export type Anchor = { id: string; kind: AnchorKind; tone?: string; quote: string; context: string; title: string; detail: string; replacement?: string; alternatives?: { text: string; note: string }[]; url?: string; excerpt?: string }

export type Fact = { fact: string; source_title: string; url: string; locator: string; excerpt: string }
export type OutlineDraft = { heading: string; purpose: string; points: string[]; state: 'pending' | 'inserted' | 'skipped' }
export type DocSection = { heading: string; preview: string; from: number; to: number }
