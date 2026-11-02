import { describe, it, expect } from 'vitest'
import { AnalysisService } from '../src/services/analysis-service'
import { accentFor, GRAMMAR_ACCENT, READER_ACCENT } from '../src/components/ReviewDock'
import { PERSONA_STYLES } from '../src/components/InlineReviewPopup'
import type { Finding } from '../src/domain/finding'

const grammarFinding = (id: string, quote: string, status: Finding['status'] = 'open'): Finding => ({
  id,
  documentId: 'd1',
  persona: 'grammar',
  kind: 'language_error',
  anchor: { quotedText: quote, documentRevision: 1 },
  explanation: 'Subject-verb agreement.',
  suggestions: [{ id: `${id}-s`, text: 'Dogs need' }],
  status,
  sourceRevision: 1,
  createdAt: Date.now(),
})

const readerFinding = (id: string): Finding => ({
  id,
  documentId: 'd1',
  persona: 'reader',
  kind: 'reader_observation',
  anchor: { quotedText: 'Some passage', documentRevision: 1 },
  explanation: 'A reader wonders why.',
  suggestions: [],
  status: 'open',
  sourceRevision: 1,
  createdAt: Date.now(),
})

describe('edit-mode grammar findings', () => {
  it('replacePersona swaps grammar cards without touching reader cards', () => {
    const service = new AnalysisService([readerFinding('r1'), grammarFinding('g-old', 'Dogs needs')])
    service.replacePersona('grammar', [grammarFinding('g-new', 'Cats is')])
    const all = service.getFindings()
    expect(all.map(f => f.id).sort()).toEqual(['g-new', 'r1'])
  })

  it('replacePersona preserves dismissed verdicts by quoted text', () => {
    const service = new AnalysisService([grammarFinding('g-old', 'Dogs needs', 'dismissed')])
    service.replacePersona('grammar', [grammarFinding('g-new', 'Dogs needs')])
    expect(service.getFindings()).toHaveLength(1)
    expect(service.getFindings()[0].status).toBe('dismissed')
  })

  it('accents split red grammar vs purple reader', () => {
    expect(accentFor({ persona: 'grammar' })).toBe(GRAMMAR_ACCENT)
    expect(accentFor({ persona: 'reader' })).toBe(READER_ACCENT)
    expect(GRAMMAR_ACCENT.label).toBe('Grammar')
    expect(READER_ACCENT.label).toBe('Reader')
  })

  it('inline popup styles grammar findings red', () => {
    expect(PERSONA_STYLES.grammar.label).toBe('Grammar')
    expect(PERSONA_STYLES.grammar.color).toBe('var(--lt)')
    expect(PERSONA_STYLES.reader.label).toBe('Reader')
  })
})
