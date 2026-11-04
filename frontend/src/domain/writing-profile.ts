import type { ThemeId } from './document'

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
    name: 'Gen Z style',
    tagline: 'Punchy, direct, and conversational',
    description: 'brevity, lowercase aesthetics, and strategic use of abbreviations',
    systemPromptModifier: 'write dynamic rhythm, direct & punchy sentences. Include slang abbreviations (e.g., ngl, fr, iykyk) where natural, and maintain an authentic voice.',
    sampleTone: 'Punchy cadence fr, zero bullshit.',
  },
  buzzword: {
    id: 'buzzword',
    name: 'Corporate Jargon',
    tagline: 'High-level, cross-functional, and hyper-synergistic',
    description: 'dense corporate buzzwords, strategic business jargon, and enterprise-grade fluff',
    systemPromptModifier: 'Leverage hyper-specialized enterprise nomenclature, market-facing buzzwords, and strategic paradigms. Drive alignment across multi-stakeholder ecosystems using dynamic business phrasing.',
    sampleTone: 'Let us circle back to operationalize core synergies, optimize mission-critical bandwidth, and deliver high-leverage paradigms end-to-end.'
  },
  'unhinged-marketer': {
    id: 'unhinged-marketer',
    name: 'Unhinged Marketer',
    tagline: 'Aggressive, breathless, and dangerously enthusiastic',
    description: 'excessive exclamation points, urgency-driven FOMO, and relentless hype train momentum',
    systemPromptModifier: 'Write with absolute, unhinged marketing hype. Treat every feature like a historic miracle, use capital letters for emphasis, and make everything feel like a once-in-a-lifetime urgency.',
    sampleTone: 'STOP EVERYTHING YOU ARE DOING right now because this updates EVERYTHING you thought you knew about productivity!!!',
  },
  'over-dramatic-victorian': {
    id: 'over-dramatic-victorian',
    name: 'Over-Dramatic Victorian',
    tagline: 'Melodramatic, fainting-prone, and severely distressed',
    description: '19th-century gothic panic, archaic vocabulary, and extreme emotional hand-wringing',
    systemPromptModifier: 'Write with Victorian gothic melodrama. Use archaic vocabulary, theatrical distress, fainting spells, and existential anguish over minor details.',
    sampleTone: 'Alas! My fragile heart cannot sustain such harrowing technical debt! I shall retreat to the fainting couch forthwith.',
  },
  'dialogue': {
  id: 'dialogue',
  name: 'Natural Dialogue',
  tagline: 'Conversational, subtextual, and character-driven',
  description: 'realistic speech cadence, unsaid subtext, distinct vocal tones, and natural turn-taking',
  systemPromptModifier: 'Write authentic spoken dialogue. Include subtle interruptions, natural contractions, character-driven vocabulary, and unspoken subtext behind every exchange.',
  sampleTone: '"You were actually going to tell me?" "Eventually. When the timing made sense."'
  },
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English', short: 'EN' },
  { code: 'id-ID', label: 'Bahasa Indonesia', short: 'ID' },
]

/** Abbreviation shown in nav-bar context toggle (EN | ID). */
export const languageShort = (code: string): string => {
  const hit = SUPPORTED_LANGUAGES.find(l => l.code === code)
  if (hit && (hit as { short?: string }).short) return (hit as { short: string }).short
  if (code?.toLowerCase().startsWith('id')) return 'ID'
  return 'EN'
}

/** True for Bahasa Indonesia context (id, id-ID, …). */
export const isIndonesian = (code: string): boolean =>
  (code || '').trim().toLowerCase().startsWith('id')
