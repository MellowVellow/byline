import { describe, expect, it } from 'vitest'
import { dedupeCardsBySource, keywordsOf, normalizeLibrary, normalizeSourceTitles, normalizeText, normalizeUrl, relevanceScore, type LibraryCard } from '../src/domain/library'
import { claimScore, rankSources, stripCitationNoise, traceProvenance } from '../src/lib/provenance'
import { apaInline, apaReference, fallbackSentence, quickCite } from '../src/lib/cite'
import type { LibrarySource } from '../src/domain/library'

const src = (): LibrarySource => ({
  id: 's1',
  type: 'article-journal',
  title: 'Water Use',
  author: [{ family: 'Alvarez', given: 'Rosa' }],
  issued: { 'date-parts': [[2025]] },
  DOI: '',
  URL: '',
  accessed: { 'date-parts': [[2026, 11, 4]] },
  provenance: { author: 'verified', issued: 'verified' },
  kind: 'PDF',
})

const card = (): LibraryCard => ({
  id: 'n1', kind: 'source', type: 'stat',
  finding: 'A mid-size data center uses about 1.5 million liters per day.',
  passage: 'A typical mid-size facility consumes roughly 1.5 million liters daily.',
  why_useful: 'x', page: 14, vision: false, sourceId: 's1',
  status: 'found', keywords: ['water', 'liters', 'data', 'center'],
})

describe('library helpers', () => {
  it('normalizes and de-hyphenates', () => {
    expect(normalizeText('mid-\nsize DATA!')).toBe('midsize data')
  })
  it('scores relevance 0-3 by keyword overlap', () => {
    expect(relevanceScore(card(), 'unrelated text here')).toBe(0)
    expect(relevanceScore(card(), 'water liters data center cooling')).toBe(3)
  })
  it('dedupes cards only within the same page url', () => {
    const a = { ...card(), id: 'a', finding: 'The US has about 179 million AI users.', sourceId: 's1' }
    const b = { ...card(), id: 'b', finding: 'the us has about 179 million ai users', sourceId: 's1' }
    const c = { ...card(), id: 'c', finding: 'The US has about 179 million AI users.', sourceId: 's2' }
    const sources: LibrarySource[] = [
      { ...src(), id: 's1', URL: 'https://example.com/report' },
      { ...src(), id: 's2', URL: 'https://other.example.org/report' },
    ]
    expect(dedupeCardsBySource([a, b, c], sources).map(x => x.id)).toEqual(['a', 'c'])
  })
  it('folds url variants into one page key', () => {
    expect(normalizeUrl('https://www.example.com/a/?utm=x#top')).toBe('example.com/a')
    expect(normalizeUrl('http://example.com/a')).toBe('example.com/a')
  })
  it('reuses the page title across duplicate sources', () => {
    const good: LibrarySource = { ...src(), id: 's1', URL: 'https://example.com/a', title: 'AI Usage Statistics 2026' }
    const raw: LibrarySource = { ...src(), id: 's2', URL: 'https://www.example.com/a?utm=x', title: 'https://example.com/a' }
    const out = normalizeSourceTitles([raw, good])
    expect(out.find(s => s.id === 's2')?.title).toBe('AI Usage Statistics 2026')
  })
  it('normalizes a loaded library within each page', () => {
    const a = { ...card(), id: 'a', finding: 'Same stat.', sourceId: 's1' }
    const b = { ...card(), id: 'b', finding: 'same stat', sourceId: 's2' }
    const sources: LibrarySource[] = [
      { ...src(), id: 's1', URL: 'https://example.com/a', title: 'Real Title' },
      { ...src(), id: 's2', URL: 'https://example.com/a', title: 'https://example.com/a' },
    ]
    const out = normalizeLibrary([a, b], sources)
    expect(out.cards.map(x => x.id)).toEqual(['a'])
    expect(out.sources.find(s => s.id === 's2')?.title).toBe('Real Title')
  })
  it('extracts keywords', () => {
    expect(keywordsOf('Water usage effectiveness is liters per kWh', 'term').length).toBeGreaterThan(2)
  })
  it('formats APA inline per type', () => {
    expect(apaInline(src(), 'narr', 14)).toBe('Alvarez (2025)')
    expect(apaInline(src(), 'paren', 14)).toBe('(Alvarez, 2025, p. 14)')
  })
  it('formats APA reference', () => {
    expect(apaReference(src())).toContain('Alvarez, R. (2025).')
  })
  it('unknown author uses title words, never Unknown/Anon', () => {
    const u = (): LibrarySource => ({
      ...src(), author: [{ literal: 'Unknown' }],
      title: 'Exploring the impact of AI threats on originality',
    })
    expect(apaInline(u(), 'paren', 3)).toBe('("Exploring the impact of", 2025, p. 3)')
    expect(apaInline(u(), 'narr')).toBe('"Exploring the impact of" (2025)')
    const ref = apaReference(u())
    expect(ref.startsWith('Exploring the impact of AI threats on originality. (2025).')).toBe(true)
    expect(ref).not.toContain('Unknown')
    expect(ref).not.toContain('Anon')
    expect(fallbackSentence(card(), u(), 'narr').startsWith('"Exploring the impact of" (2025)')).toBe(true)
  })
  it('unknown author and date uses n.d.', () => {
    const u = (): LibrarySource => ({
      ...src(), author: [], title: 'Cooling towers at scale',
      issued: { 'date-parts': [[]] },
    })
    expect(apaInline(u(), 'paren')).toBe('("Cooling towers at scale", n.d.)')
    expect(apaReference(u())).toContain('Cooling towers at scale. (n.d.).')
  })
  it('explicit Anonymous stays the author', () => {
    const u = (): LibrarySource => ({ ...src(), author: [{ literal: 'Anonymous' }] })
    expect(apaInline(u(), 'narr')).toBe('Anonymous (2025)')
    expect(apaReference(u())).toContain('Anonymous (2025).')
  })
  it('quick cite direct uses exact passage', () => {
    expect(quickCite(card(), src(), 'direct')).toContain('A typical mid-size facility')
  })
  it('fallback sentence per type', () => {
    expect(fallbackSentence(card(), src(), 'narr').startsWith('Alvarez (2025)')).toBe(true)
  })
  it('traces a sentence to its source text', () => {
    const texts = {
      s1: 'Water usage effectiveness is liters of water per kWh of computing energy.',
      s2: 'Completely unrelated text about medieval poetry and rhyme schemes.',
    }
    const hits = traceProvenance('Water usage effectiveness is liters of water per kWh', texts)
    expect(hits[0]?.sourceId).toBe('s1')
    expect(hits[0]?.score).toBeGreaterThanOrEqual(2)
  })
  it('uses et al for three or more authors', () => {
    const s: LibrarySource = {
      ...src(),
      author: [
        { family: 'Zhumagaliyeva', given: 'Guldana' },
        { family: 'Tleshova', given: 'Zhibek' },
        { family: 'Amanzhol', given: 'Moldir' },
        { family: 'Smagulova', given: 'Moldir' },
      ],
    }
    expect(apaInline(s, 'paren')).toBe('(Zhumagaliyeva et al., 2025)')
    expect(apaInline(s, 'narr')).toBe('Zhumagaliyeva et al. (2025)')
  })
  it('joins two authors with &', () => {
    const s: LibrarySource = {
      ...src(),
      author: [
        { family: 'Alvarez', given: 'Rosa' },
        { family: 'Reyes', given: 'Mara' },
      ],
    }
    expect(apaInline(s, 'paren')).toBe('(Alvarez & Reyes, 2025)')
  })
  it('preserves a literal et al author', () => {
    const s: LibrarySource = { ...src(), author: [{ literal: 'Octaberlina et al.' }] }
    expect(apaInline(s, 'paren')).toBe('(Octaberlina et al., 2025)')
    expect(apaInline(s, 'narr')).toBe('Octaberlina et al. (2025)')
  })
  it('strips citation noise before matching', () => {
    expect(stripCitationNoise('AI threatens thinking (Octaberlina, 2024, p. 1). ● card:nmw1zpyq4'))
      .toBe('AI threatens thinking .')
  })
  it('scores paraphrase overlap high, unrelated low', () => {
    const high = claimScore(
      'AI threatens the development of critical thinking by reducing active engagement',
      'AI can threaten critical thinking as dependency reduces active engagement',
      'dependency on this technology reduces active engagement in thinking',
    )
    const low = claimScore(
      'Edelweiss Applied Science and Technology ISSN Vol Publisher',
      'AI can threaten critical thinking as dependency reduces active engagement',
      'dependency reduces active engagement',
    )
    expect(high).toBeGreaterThan(0.3)
    expect(low).toBeLessThan(0.3)
    expect(claimScore('Too short', 'finding text here', 'passage here')).toBe(0)
  })
  it('ranks sources by keyword overlap', () => {
    const order = rankSources('data center water liters', {
      s1: ['water', 'liters'],
      s2: ['poetry'],
    })
    expect(order[0]).toBe('s1')
  })
})
