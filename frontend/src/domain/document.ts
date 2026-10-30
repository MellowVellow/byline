export interface DocumentContext {
  topic?: string
  purpose?: string
  audience?: string
  background?: string
  keyIdeas?: string[]
  constraints?: string[]
}

export type ThemeId = 'neutral' | 'academic' | 'gen-z' | 'buzzword'

export interface WritingProfile {
  language: string
  theme: ThemeId
  customInstructions?: string
}

export interface OutlineNode {
  id: string
  title: string
  description?: string
  notes?: string
  parentId?: string
  sectionId?: string
  order: number
}

export interface OutlineBlockLink {
  outlineNodeId: string
  blockId: string
  source: 'manual' | 'template' | 'suggested'
}

export interface DocumentState {
  id: string
  title: string
  html: string
  context: DocumentContext
  outline: OutlineNode[]
  links: OutlineBlockLink[]
  profile: WritingProfile
  revision: number
  createdAt: string
  updatedAt: string
}
