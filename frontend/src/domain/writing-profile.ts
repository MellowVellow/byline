import type { ThemeId, WritingProfile } from './document'

export interface ThemeDefinition {
  id: ThemeId
  name: string
  tagline: string
  description: string
  systemPromptModifier: string
  sampleTone: string
}

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    tagline: 'Clear, balanced, and objective',
    description: 'Avoids rhetorical extremes. Focuses on clarity, crisp sentences, and direct communication.',
    systemPromptModifier: 'Maintain a clear, measured, and objective tone. Prioritize precision and direct expression.',
    sampleTone: 'Careful balance, clean syntax, accessible vocabulary.',
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    tagline: 'Scholarly, analytical, and rigorous',
    description: 'Employs disciplined domain terminology, nuanced qualifiers, subordinated clauses, and analytical transitions.',
    systemPromptModifier: 'Adopt a rigorous academic register. Use analytical qualifiers, precise diction, and subordinated clause structures.',
    sampleTone: 'Theoretical rigor, precise qualifiers, formal argumentation.',
  },
  'gen-z': {
    id: 'gen-z',
    name: 'Gen Z',
    tagline: 'Punchy, direct, and conversational',
    description: 'Fast-paced, authentic, concise, and engaging without bureaucratic pretense.',
    systemPromptModifier: 'Write with fresh, punchy energy. Keep rhythm dynamic, eliminate corporate fluff, and maintain an authentic voice.',
    sampleTone: 'Punchy cadence, engaging hooks, zero fluff.',
  },
  buzzword: {
    id: 'buzzword',
    name: 'Buzzword-Heavy',
    tagline: 'Strategic, synergistic, and enterprise-grade',
    description: 'Leverages high-density executive rhetoric, paradigm frameworks, strategic alignments, and forward-looking momentum.',
    systemPromptModifier: 'Employ strategic executive diction. Weave in high-impact frameworks, synergy, alignment, and value-multiplier phrasing.',
    sampleTone: 'Executive-ready, synergistic framing, transformative impact.',
  },
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'en-AU', label: 'English (Australia)' },
]

export const DEFAULT_WRITING_PROFILE: WritingProfile = {
  language: 'en-US',
  theme: 'neutral',
}
