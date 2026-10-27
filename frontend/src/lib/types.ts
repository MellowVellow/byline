export type Anchored = { quote: string; context: string }
export type Issue = Anchored & { type: 'vocabulary' | 'relevance'; reason: string; replacement: string; id?: string; stale?: boolean }
export type Reaction = Anchored & { kind: 'question' | 'comment' | 'compliment' | 'critique'; text: string; id?: string; stale?: boolean }
export type GrammarMatch = { from: number; to: number; message: string; replacements: string[]; rule: string; stale?: boolean; quote?: string }
export type Reading = { title: string; url: string; label: string; why: string; excerpt: string; claim_quote: string; claim_context: string; stale?: boolean }
export type OutlineItem = Anchored & { label: string }
export type AnchorKind = 'grammar' | 'vocabulary' | 'relevance' | 'reaction' | 'claim'
export type Anchor = { id: string; kind: AnchorKind; tone?: string; quote: string; context: string; title: string; detail: string; replacement?: string; url?: string; excerpt?: string }
