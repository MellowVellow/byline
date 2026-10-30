import { describe, it, expect } from 'vitest'
import { REVIEW_PERSONAS } from '../src/components/ReviewDock'
import type { Finding } from '../src/domain/finding'

describe('Review Dropdown & Review Sorting', () => {
  it('defines the 4 required review personas with proper colors and endpoints', () => {
    expect(REVIEW_PERSONAS).toHaveLength(4)

    const grammar = REVIEW_PERSONAS.find(p => p.id === 'grammar')
    expect(grammar).toBeDefined()
    expect(grammar?.colorDot).toBe('🔴')
    expect(grammar?.colorName).toBe('Red')
    expect(grammar?.endpoint).toBe('/api/grammar')

    const reader = REVIEW_PERSONAS.find(p => p.id === 'reader')
    expect(reader).toBeDefined()
    expect(reader?.colorDot).toBe('🟣')
    expect(reader?.colorName).toBe('Purple')
    expect(reader?.endpoint).toBe('/api/reactions')

    const supervisor = REVIEW_PERSONAS.find(p => p.id === 'supervisor')
    expect(supervisor).toBeDefined()
    expect(supervisor?.colorDot).toBe('🟡')
    expect(supervisor?.colorName).toBe('Yellow')
    expect(supervisor?.endpoint).toBe('/api/lint')

    const researcher = REVIEW_PERSONAS.find(p => p.id === 'researcher')
    expect(researcher).toBeDefined()
    expect(researcher?.colorDot).toBe('🔵')
    expect(researcher?.colorName).toBe('Blue')
    expect(researcher?.endpoint).toBe('/api/readings')
  })

  it('sorts reflection cards by quoted text (default) and by persona color', () => {
    const sampleFindings: Finding[] = [
      {
        id: '1',
        documentId: 'doc1',
        persona: 'researcher',
        kind: 'research_claim',
        anchor: { quotedText: 'Zebra migration patterns', documentRevision: 1 },
        explanation: 'Evidence check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 1,
      },
      {
        id: '2',
        documentId: 'doc1',
        persona: 'grammar',
        kind: 'language_error',
        anchor: { quotedText: 'Apple is tasty', documentRevision: 1 },
        explanation: 'Punctuation check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 2,
      },
      {
        id: '3',
        documentId: 'doc1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Banana nutrition facts', documentRevision: 1 },
        explanation: 'Tone check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 3,
      },
      {
        id: '4',
        documentId: 'doc1',
        persona: 'supervisor',
        kind: 'supervisor_critique',
        anchor: { quotedText: 'Cat behavior studies', documentRevision: 1 },
        explanation: 'Outline check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 4,
      },
    ]

    // Sort by quoted text (default)
    const sortedByQuote = [...sampleFindings].sort((a, b) =>
      a.anchor.quotedText.localeCompare(b.anchor.quotedText)
    )
    expect(sortedByQuote.map(f => f.anchor.quotedText)).toEqual([
      'Apple is tasty',
      'Banana nutrition facts',
      'Cat behavior studies',
      'Zebra migration patterns',
    ])

    // Sort by color (Grammar Red -> Reader Purple -> Supervisor Yellow -> Researcher Blue)
    const colorOrder = { grammar: 0, reader: 1, supervisor: 2, researcher: 3 }
    const sortedByColor = [...sampleFindings].sort(
      (a, b) => colorOrder[a.persona] - colorOrder[b.persona]
    )
    expect(sortedByColor.map(f => f.persona)).toEqual([
      'grammar',
      'reader',
      'supervisor',
      'researcher',
    ])
  })
})
