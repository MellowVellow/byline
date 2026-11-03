export type AnchorKind = 'grammar' | 'vocabulary' | 'relevance' | 'reaction' | 'claim'
export type Anchor = { id: string; kind: AnchorKind; tone?: string; quote: string; context: string; title: string; detail: string; replacement?: string; alternatives?: { text: string; note: string }[]; url?: string; excerpt?: string }
