import { describe, it, expect } from 'vitest'
import { textFragmentUrl } from '../src/lib/link'

describe('textFragmentUrl', () => {
  it('appends encoded text fragment, capped at 10 words', () => {
    const u = textFragmentUrl('https://example.com/a#old', 'Cats generally live longer than dogs, reaching 12 to 18 years on average today.')
    expect(u.startsWith('https://example.com/a#:~:text=')).toBe(true)
    expect(u).toContain('Cats%20generally%20live%20longer')
    expect(u).not.toContain('average')
  })
  it('returns url unchanged without text', () => {
    expect(textFragmentUrl('https://example.com', '')).toBe('https://example.com')
  })
})
