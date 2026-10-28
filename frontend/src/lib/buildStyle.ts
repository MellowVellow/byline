import { RHYTHMS } from './constants'

export interface AppliedSettings {
  context: string; level: string; voice: string; assist: string; persona: string
  tones: Record<string, 'allow' | 'ban'>; rhythm: number; gramVoice: string; clause: string
  density: number; audLevel: number; audText: string
}

export function buildStyle(A: AppliedSettings): string {
  const allow = Object.keys(A.tones).filter(k => A.tones[k] === 'allow'); const ban = Object.keys(A.tones).filter(k => A.tones[k] === 'ban')
  return [
    A.voice ? `Voice: ${A.voice}` : '',
    allow.length ? `Tone ALLOWED: ${allow.join(', ')}` : '', ban.length ? `Tone NOT ALLOWED: ${ban.join(', ')}` : '',
    `Sentence rhythm: ${RHYTHMS[A.rhythm]}`,
    A.gramVoice === 'active' ? 'Grammatical voice: strictly ACTIVE (subject performs action)' : 'Grammatical voice: passive permitted',
    `Clause complexity: ${A.clause}`,
    `Information density: ${A.density === 1 ? 'Sparse — one concept per sentence, frequent breaks' : A.density === 3 ? 'Dense — appositives, modifiers, nested details' : 'Balanced'}`,
    `Target audience: ${A.audText || '(unspecified)'}; knowledge level ${A.audLevel}/5. ${A.audLevel <= 2 ? 'Flag undefined jargon, acronyms, assumed technical context.' : A.audLevel >= 4 ? 'Do not explain basic industry concepts.' : 'Briefly ground specialized terms.'}`,
  ].filter(Boolean).join('\n')
}
