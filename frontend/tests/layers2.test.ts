import { describe, it, expect } from 'vitest'
import { RIGHT_TAB_ORDER, TAB_THEME, ANNOTATION_COLORS, anchorKey, toggled, groupByClaim, ghostInsertText, safeUrl, rankByAccepted, lastTwoSentences } from '../src/lib/layers'
import { FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_READINGS, SAMPLE_DOC } from '../src/lib/fallback'

describe('tab order + colors', () => {
  it('order is language reader sources suggest lint', () => {
    expect(RIGHT_TAB_ORDER).toEqual(['language', 'reader', 'sources', 'suggest', 'lint'])
    expect(ANNOTATION_COLORS).toEqual({ language: '#D93025', reader: '#7C4DFF', sources: '#1A73E8', suggest: '#9AA0A6', lint: '#D99A06' })
    expect(TAB_THEME.language.color).toBe('var(--lt, #D93025)')
    expect(TAB_THEME.reader.color).toBe('var(--ai, #7C4DFF)')
    expect(TAB_THEME.sources.color).toBe('var(--blue, #1A73E8)')
    expect(TAB_THEME.suggest.color).toBe('var(--grey, #9AA0A6)')
    expect(TAB_THEME.lint.color).toBe('var(--yellow, #D99A06)')
  })
})
describe('manual disable toggle', () => {
  it('toggles key in/out, no auto cap', () => {
    const k = anchorKey('grammar', 'Dogs needs', 'msg')
    const on = toggled(new Set<string>(), k); expect(on.has(k)).toBe(true)
    expect(toggled(on, k).has(k)).toBe(false)
    expect(anchorKey('claim', 'Cats live longer')).toBe('claim:cats live longer:')
  })
  it('groups sources by claim', () => {
    const g = groupByClaim([{ claim_quote: 'A claim', url: 'u1' }, { claim_quote: 'a claim', url: 'u2' }, { claim_quote: 'Other', url: 'u3' }] as any)
    expect(g).toHaveLength(2); expect(g[0].items).toHaveLength(2); expect(g[0].claim).toBe('A claim')
  })
})
describe('ghostInsertText mid-word', () => {
  it('inserts only remainder after partial word', () => {
    expect(ghostInsertText('Cats n', 'need less care')).toBe('eed less care')
    expect(ghostInsertText('Pets. N', 'Need no walks')).toBe('eed no walks')
    expect(ghostInsertText('Cats', 'are calmer')).toBe(' are calmer')
    expect(ghostInsertText('Cats ', 'are calmer')).toBe('are calmer')
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
