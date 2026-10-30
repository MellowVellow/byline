import { describe, it, expect } from 'vitest'
import { CONNECT_PATTERNS } from '../src/domain/pattern'
import { THEME_DEFINITIONS } from '../src/domain/writing-profile'
import { SuggestionService } from '../src/services/suggestion-service'
import { exportService } from '../src/services/export-service'
import { AnalysisService } from '../src/services/analysis-service'
import type { Finding } from '../src/domain/finding'

describe('Workspace Rebuild & Domain Features', () => {
  it('connect pattern library contains all required rhetorical categories and examples', () => {
    const requiredCategories = [
      'Addition',
      'Contrast',
      'Cause and effect',
      'Evidence',
      'Concession',
      'Comparison',
      'Elaboration',
      'Qualification',
      'Synthesis',
      'Sequence',
      'Example',
      'Problem and solution',
    ]

    for (const cat of requiredCategories) {
      const match = CONNECT_PATTERNS.find(p => p.category === cat)
      expect(match).toBeDefined()
      expect(match?.template).toContain('[')
      expect(match?.placeholders.length).toBeGreaterThan(0)
      expect(match?.example.length).toBeGreaterThan(10)
    }
  })

  it('writing themes modify tone, diction, and register predictably', () => {
    expect(THEME_DEFINITIONS.neutral.systemPromptModifier).toContain('clear')
    expect(THEME_DEFINITIONS.academic.systemPromptModifier).toContain('academic')
    expect(THEME_DEFINITIONS['gen-z'].systemPromptModifier).toContain('punchy')
    expect(THEME_DEFINITIONS.buzzword.systemPromptModifier).toContain('executive')
  })

  it('export service converts HTML structure cleanly to Markdown', () => {
    const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p><blockquote>Quote</blockquote>'
    const md = exportService.htmlToMarkdown(html)
    expect(md).toContain('# Title')
    expect(md).toContain('Paragraph with **bold** and *italic*.')
    expect(md).toContain('> Quote')
  })

  it('suggestion service handles keyboard shortcuts 1, 2, 3, Tab, and Alt', () => {
    let acceptedIdx = -1
    let rerolled = false
    let dismissed = false

    const actions = {
      onSelect: (idx: number) => { acceptedIdx = idx },
      onReroll: () => { rerolled = true },
      onDismiss: () => { dismissed = true },
    }

    const state = {
      options: ['Option 1', 'Option 2', 'Option 3'],
      selectedIndex: 0,
      isVisible: true,
      source: 'draft' as const,
    }

    const createEvt = (key: string, altKey = false) => ({
      key,
      altKey,
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => {},
      stopPropagation: () => {},
    })

    // Key '1'
    let handled = SuggestionService.handleKeyDown(createEvt('1') as any, state, actions)
    expect(handled).toBe(true)
    expect(acceptedIdx).toBe(0)

    // Key '3'
    handled = SuggestionService.handleKeyDown(createEvt('3') as any, state, actions)
    expect(handled).toBe(true)
    expect(acceptedIdx).toBe(2)

    // Key 'Tab'
    handled = SuggestionService.handleKeyDown(createEvt('Tab') as any, state, actions)
    expect(handled).toBe(true)
    expect(acceptedIdx).toBe(0)

    // Key 'Alt'
    handled = SuggestionService.handleKeyDown(createEvt('Alt', true) as any, state, actions)
    expect(handled).toBe(true)
    expect(rerolled).toBe(true)

    // Key 'Escape'
    handled = SuggestionService.handleKeyDown(createEvt('Escape') as any, state, actions)
    expect(handled).toBe(true)
    expect(dismissed).toBe(true)
  })

  it('unified findings collection supports all 4 personas without collision', () => {
    const service = new AnalysisService()
    const findings: Finding[] = [
      {
        id: 'f-gram',
        documentId: 'd1',
        persona: 'grammar',
        kind: 'language_error',
        anchor: { quotedText: 'Dogs needs', documentRevision: 1 },
        explanation: 'Agreement error',
        suggestions: [{ id: 's1', text: 'Dogs need' }],
        status: 'open',
        sourceRevision: 1,
        createdAt: 100,
      },
      {
        id: 'f-read',
        documentId: 'd1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Dogs needs', documentRevision: 1 },
        explanation: 'Reader sees ambiguity in requirements',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 101,
      },
      {
        id: 'f-sup',
        documentId: 'd1',
        persona: 'supervisor',
        kind: 'supervisor_critique',
        anchor: { quotedText: 'A plethora of reasons', documentRevision: 1 },
        explanation: 'Excessive inflation',
        suggestions: [{ id: 's2', text: 'Many reasons' }, { id: 's3', text: 'Several key factors' }],
        status: 'open',
        sourceRevision: 1,
        createdAt: 102,
      },
      {
        id: 'f-res',
        documentId: 'd1',
        persona: 'researcher',
        kind: 'research_claim',
        anchor: { quotedText: 'Cats live longer than dogs', documentRevision: 1 },
        explanation: 'Evidence qualifies average lifespans',
        suggestions: [],
        evidence: [{ url: 'https://vet.org', title: 'Vet Study', excerpt: 'Indoor felines live 12-15 yrs', status: 'supported' }],
        status: 'open',
        sourceRevision: 1,
        createdAt: 103,
      },
    ]

    service.setFindings(findings)
    expect(service.getFindings().length).toBe(4)

    // Overlapping findings on the exact same quote 'Dogs needs' coexist independently
    const overlapping = service.getFindings().filter(f => f.anchor.quotedText === 'Dogs needs')
    expect(overlapping.length).toBe(2)
    expect(overlapping.map(f => f.persona)).toEqual(['grammar', 'reader'])

    // Resolving grammar finding leaves reader finding intact
    service.updateStatus('f-gram', 'resolved')
    expect(service.getFindings().find(f => f.id === 'f-gram')?.status).toBe('resolved')
    expect(service.getFindings().find(f => f.id === 'f-read')?.status).toBe('open')
  })
})
