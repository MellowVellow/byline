export type ThemeId = 'neutral' | 'academic' | 'gen-z' | 'buzzword' | 'unhinged-marketer' | 'over-dramatic-victorian' | 'dialogue'

export interface WritingProfile {
  language: string
  theme: ThemeId
  customInstructions?: string
}
