import { describe, expect, it } from 'vitest'
import { citationRanges, insideCitation } from '../src/lib/citation-spans'

describe('citationRanges', () => {
  it('detects APA parenthetical citations', () => {
    const text = 'Water use is high (Octaberlina, 2024, p. 1). Cooling matters (Alvarez, 2025).'
    const rs = citationRanges(text)
    expect(rs.length).toBe(2)
    // "Octaberlina" sits inside the first range.
    const i = text.indexOf('Octaberlina')
    expect(insideCitation(i, i + 'Octaberlina'.length, rs)).toBe(true)
  })
  it('detects bare year parens', () => {
    const rs = citationRanges('As shown (2024), demand rose.')
    expect(rs.length).toBe(1)
  })
  it('leaves prose spans alone', () => {
    const text = 'Cooling is the main reason (Alvarez, 2025).'
    const rs = citationRanges(text)
    const i = text.indexOf('Cooling')
    expect(insideCitation(i, i + 'Cooling'.length, rs)).toBe(false)
    // Spanning from prose into a cite is not "inside".
    expect(insideCitation(0, text.length, rs)).toBe(false)
  })
  it('ignores parens without years', () => {
    expect(citationRanges('Use less (but not zero) water.')).toEqual([])
  })
})
