import { describe, it, expect } from 'vitest'
import { CONNECT_PATTERNS } from '../src/domain/pattern'
import { THEME_DEFINITIONS } from '../src/domain/writing-profile'
import { AnalysisService } from '../src/services/analysis-service'
import type { Finding } from '../src/domain/finding'

describe('Domain Models & Connect Patterns', () => {
  it('loads all 12 Connect pattern categories', () => {
    const categories = new Set(CONNECT_PATTERNS.map(p => p.category))
    expect(categories.has('Addition')).toBe(true)
    expect(categories.has('Contrast')).toBe(true)
    expect(categories.has('Cause and effect')).toBe(true)
    expect(categories.has('Evidence')).toBe(true)
    expect(categories.has('Concession')).toBe(true)
    expect(categories.has('Comparison')).toBe(true)
    expect(categories.has('Elaboration')).toBe(true)
    expect(categories.has('Qualification')).toBe(true)
    expect(categories.has('Synthesis')).toBe(true)
    expect(categories.has('Sequence')).toBe(true)
    expect(categories.has('Example')).toBe(true)
    expect(categories.has('Problem and solution')).toBe(true)
  })

  it('defines the 4 required writing themes', () => {
    expect(THEME_DEFINITIONS.neutral).toBeDefined()
    expect(THEME_DEFINITIONS.academic).toBeDefined()
    expect(THEME_DEFINITIONS['gen-z']).toBeDefined()
    expect(THEME_DEFINITIONS.buzzword).toBeDefined()
  })
})

describe('Unified AnalysisService', () => {
  it('manages unified findings across all 4 personas without interference', () => {
    const service = new AnalysisService()
    const mockFindings: Finding[] = [
      {
        id: 'f-1',
        documentId: 'doc-1',
        persona: 'grammar',
        kind: 'language_error',
        anchor: { quotedText: 'Dogs needs', documentRevision: 1 },
        explanation: 'Subject-verb agreement error.',
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
      {
        id: 'f-3',
        documentId: 'doc-1',
        persona: 'supervisor',
        kind: 'supervisor_critique',
        anchor: { quotedText: 'Dogs bark', documentRevision: 1 },
        explanation: 'Abrupt transition; lacks connection to the prior point.',
        suggestions: [
          { id: 's-2', text: 'Furthermore, dogs tend to bark when unattended.' },
          { id: 's-3', text: 'In contrast to quiet cats, dogs vocalize frequently.' },
          { id: 's-4', text: 'Noise is another consideration, as dogs bark.' },
        ],
        status: 'open',
        sourceRevision: 1,
        createdAt: Date.now(),
      },
      {
        id: 'f-4',
        documentId: 'doc-1',
        persona: 'researcher',
        kind: 'research_claim',
        anchor: { quotedText: 'Studies show that dog owners are always happier', documentRevision: 1 },
        explanation: 'Claim of absolute happiness is contradicted by peer-reviewed studies.',
        suggestions: [{ id: 's-5', text: 'Several surveys suggest positive companionship effects' }],
        status: 'open',
        sourceRevision: 1,
        evidence: [
          {
            url: 'https://example.org/study',
            title: 'Companion Animal Study',
            excerpt: 'Results indicate moderated well-being benefits rather than uniform happiness.',
            status: 'contradicted',
          },
        ],
        createdAt: Date.now(),
      },
    ]

    service.setFindings(mockFindings)

    // Verify all 4 are present in the unified collection
    expect(service.getFindings().length).toBe(4)

    // Filter by persona
    expect(service.filterFindings({ persona: 'grammar' }).length).toBe(1)
    expect(service.filterFindings({ persona: 'reader' }).length).toBe(1)
    expect(service.filterFindings({ persona: 'supervisor' }).length).toBe(1)
    expect(service.filterFindings({ persona: 'researcher' }).length).toBe(1)

    // Status transition: resolve grammar finding
    service.updateStatus('f-1', 'resolved')
    expect(service.filterFindings({ status: 'active' }).length).toBe(3)
    expect(service.filterFindings({ status: 'resolved' }).length).toBe(1)

    // Search query
    const searchRes = service.filterFindings({ search: 'transition' })
    expect(searchRes.length).toBe(1)
    expect(searchRes[0].persona).toBe('supervisor')
  })
})
