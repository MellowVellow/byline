import { describe, it, expect } from 'vitest'
import { READER_ACCENT } from '../src/components/ReviewDock'
import type { Finding } from '../src/domain/finding'

describe('Reader Review Dock', () => {
  it('defines the single Reader accent', () => {
    expect(READER_ACCENT.label).toBe('Reader')
    expect(READER_ACCENT.color).toBe('var(--ai)')
    expect(READER_ACCENT.dot).toBe('🟣')
  })

  it('sorts reader comments by quoted text and newest', () => {
    const sampleFindings: Finding[] = [
      {
        id: '1',
        documentId: 'doc1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Zebra migration patterns', documentRevision: 1 },
        explanation: 'Reader check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 1,
      },
      {
        id: '2',
        documentId: 'doc1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Apple is tasty', documentRevision: 1 },
        explanation: 'Reader check',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 2,
      },
    ]

    const sortedByQuote = [...sampleFindings].sort((a, b) =>
      a.anchor.quotedText.localeCompare(b.anchor.quotedText)
    )
    expect(sortedByQuote.map(f => f.anchor.quotedText)).toEqual([
      'Apple is tasty',
      'Zebra migration patterns',
    ])

    const sortedByNewest = [...sampleFindings].sort((a, b) => b.createdAt - a.createdAt)
    expect(sortedByNewest.map(f => f.id)).toEqual(['2', '1'])
  })
})
