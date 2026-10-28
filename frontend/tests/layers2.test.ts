import { describe, it, expect } from 'vitest'
import { RIGHT_TAB_ORDER, TAB_THEME, capGreyed, capHistory, safeUrl, rankByAccepted, lastTwoSentences } from '../src/lib/layers'
import { FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_READINGS, SAMPLE_DOC } from '../src/lib/fallback'

describe('tab order + colors', () => {
  it('order is language reader sources suggest lint', () => {
    expect(RIGHT_TAB_ORDER).toEqual(['language', 'reader', 'sources', 'suggest', 'lint'])
    expect(TAB_THEME.language.color).toBe('#D93025')
    expect(TAB_THEME.lint.color).toBe('#D99A06')
  })
})
describe('greyed cap', () => {
  it('caps stale at 3, keeps fresh', () => {
    const list = [{ stale: false }, ...Array.from({ length: 6 }, () => ({ stale: true }))]
    expect(capGreyed(list)).toHaveLength(4)
    expect(capHistory(['a', 'b', 'c', 'd'])).toHaveLength(3)
  })
})
describe('safeUrl + ranking + lastTwo', () => {
  it('blocks javascript urls', () => { expect(safeUrl('javascript:alert(1)')).toBe('#'); expect(safeUrl('https://x.dev/a')).toContain('https') })
  it('ranks by accepted overlap', () => {
    expect(rankByAccepted(['generic filler words here', 'daily walks cost care'], ['daily walks and cost of care'])[0]).toContain('daily')
  })
  it('extracts last two sentences', () => { expect(lastTwoSentences('One. Two! Three? Four.')).toBe('Three? Four.') })
})
describe('demo fallback anchors verbatim in SAMPLE_DOC', () => {
  const plain = SAMPLE_DOC.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  it('issues anchored', () => { for (const i of FALLBACK_ISSUES) expect(plain).toContain(i.quote) })
  it('reactions anchored', () => { for (const r of FALLBACK_REACTIONS) expect(plain).toContain(r.quote) })
  it('readings anchored', () => { for (const r of FALLBACK_READINGS) expect(plain).toContain(r.claim_quote) })
})
