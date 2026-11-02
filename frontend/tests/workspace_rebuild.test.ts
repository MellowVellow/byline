import { describe, it, expect } from 'vitest'
import { CONNECT_PATTERNS } from '../src/domain/pattern'
import { THEME_DEFINITIONS } from '../src/domain/writing-profile'
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

  it('unified findings collection supports reader comments without collision', () => {
    const service = new AnalysisService()
    const findings: Finding[] = [
      {
        id: 'f-read-1',
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
        id: 'f-read-2',
        documentId: 'd1',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: { quotedText: 'Dogs needs', documentRevision: 1 },
        explanation: 'A second reader notes the overbroad claim',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: 102,
      },
    ]

    service.setFindings(findings)
    expect(service.getFindings().length).toBe(2)

    // Overlapping findings on the exact same quote coexist independently
    const overlapping = service.getFindings().filter(f => f.anchor.quotedText === 'Dogs needs')
    expect(overlapping.length).toBe(2)

    // Resolving one finding deletes it and leaves the other intact
    service.updateStatus('f-read-1', 'resolved')
    expect(service.getFindings().find(f => f.id === 'f-read-1')).toBeUndefined()
    expect(service.getFindings().find(f => f.id === 'f-read-2')?.status).toBe('open')
  })
})
