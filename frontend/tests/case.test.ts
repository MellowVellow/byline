import { describe, it, expect } from 'vitest'
import { sentenceCase } from '../src/lib/case'

describe('sentenceCase', () => {
  it('capitalizes after period / at start', () => {
    expect(sentenceCase('Cats are quiet.', 'dogs bark')).toBe('Dogs bark')
    expect(sentenceCase('', 'first words')).toBe('First words')
  })
  it('keeps mid-sentence lowercase + acronyms', () => {
    expect(sentenceCase('Cats are', 'quiet animals')).toBe('quiet animals')
    expect(sentenceCase('The model', 'uses VAD scores')).toBe('uses VAD scores')
  })
})
