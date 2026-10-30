export type Persona = 'grammar' | 'reader' | 'supervisor' | 'researcher'

export type FindingKind =
  | 'language_error'
  | 'reader_observation'
  | 'supervisor_critique'
  | 'research_claim'

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

export interface EvidenceRecord {
  url: string
  title: string
  excerpt: string
  status: 'supported' | 'contradicted' | 'unverified'
}

export interface Finding {
  id: string
  documentId: string
  persona: Persona
  kind: FindingKind
  anchor: TextAnchor
  explanation: string
  suggestions: Suggestion[]
  status: FindingStatus
  sourceRevision: number
  evidence?: EvidenceRecord[]
  createdAt: number
}
