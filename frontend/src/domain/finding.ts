export type Persona = 'reader' | 'grammar'

export type FindingKind = 'reader_observation' | 'language_error'

export type FindingStatus = 'open' | 'resolved' | 'dismissed' | 'stale'

export interface TextAnchor {
  blockId?: string
  startOffset?: number
  endOffset?: number
  quotedText: string
  prefix?: string
  suffix?: string
  documentRevision: number
}

export interface Suggestion {
  id: string
  text: string
  rationale?: string
}

export interface Finding {
  id: string
  documentId: string
  persona: Persona
  kind: FindingKind
  category?: string
  ruleId?: string
  anchor: TextAnchor
  explanation: string
  suggestions: Suggestion[]
  status: FindingStatus
  sourceRevision: number
  createdAt: number
}
