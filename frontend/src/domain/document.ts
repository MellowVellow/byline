export type ThemeId = 'neutral' | 'academic' | 'gen-z' | 'buzzword'

export interface WritingProfile {
  language: string
  theme: ThemeId
  customInstructions?: string
}
