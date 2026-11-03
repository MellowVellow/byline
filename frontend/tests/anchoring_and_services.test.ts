import { describe, it, expect } from 'vitest'
import { THEME_DEFINITIONS } from '../src/domain/writing-profile'
import { AnalysisService } from '../src/services/analysis-service'
import type { Finding } from '../src/domain/finding'

describe('Domain Models', () => {

  it('defines the 4 required writing themes', () => {
    expect(THEME_DEFINITIONS.neutral).toBeDefined()
    expect(THEME_DEFINITIONS.academic).toBeDefined()
    expect(THEME_DEFINITIONS['gen-z']).toBeDefined()
    expect(THEME_DEFINITIONS.buzzword).toBeDefined()
  })
})

describe('Unified AnalysisService', () => {
  it('manages reader findings without interference', () => {
    const service = new AnalysisService()
    const mockFindings: Finding[] = [
      {
        id: 'f-1',
        documentId: 'doc-1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Dogs needs', documentRevision: 1 },
        explanation: 'A reader may question the abrupt claim.',
        suggestions: [{ id: 's-1', text: 'Dogs need' }],
        status: 'open',
        sourceRevision: 1,
        createdAt: Date.now(),
      },
      {
        id: 'f-2',
        documentId: 'doc-1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Dogs needs daily walks', documentRevision: 1 },
        explanation: 'A reader may question what duration of walk is required.',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: Date.now(),
      },
    ]

    service.setFindings(mockFindings)

    expect(service.getFindings().length).toBe(2)

    // Filter by persona
    expect(service.filterFindings({ persona: 'reader' }).length).toBe(2)

    // Status transition: resolving deletes the finding
    service.updateStatus('f-1', 'resolved')
    expect(service.filterFindings({ status: 'active' }).length).toBe(1)
    expect(service.filterFindings({ status: 'resolved' }).length).toBe(0)
    expect(service.getFindings().length).toBe(1)

    // Search query
    const searchRes = service.filterFindings({ search: 'duration' })
    expect(searchRes.length).toBe(1)
    expect(searchRes[0].id).toBe('f-2')
  })
})
