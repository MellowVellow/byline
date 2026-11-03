// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReviewDock, { truncateQuote } from '../src/components/ReviewDock'
import InlineReviewPopup from '../src/components/InlineReviewPopup'
import { noteKey, groupFindingsByNote, buildReaderFindings } from '../src/domain/finding'
import type { Finding } from '../src/domain/finding'

const NOTE = 'Typo merges word and stray characters.'

function finding(id: string, quote: string, explanation = NOTE): Finding {
  return {
    id,
    documentId: 'doc-1',
    persona: 'reader',
    kind: 'reader_observation',
    anchor: { quotedText: quote, documentRevision: 1 },
    explanation,
    suggestions: [{ id: `${id}-s`, text: `${quote} fixed` }],
    status: 'open',
    sourceRevision: 1,
    createdAt: 1,
  }
}

function render(el: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(el)
  })
  return { container, root, cleanup: () => { root.unmount(); container.remove() } }
}

describe('noteKey', () => {
  it('ignores case and surrounding whitespace, separates personas', () => {
    expect(noteKey({ persona: 'reader', explanation: '  Typo HERE. ' })).toBe(
      noteKey({ persona: 'reader', explanation: 'typo here.' })
    )
    expect(noteKey({ persona: 'reader', explanation: 'typo here.' })).not.toBe(
      noteKey({ persona: 'grammar', explanation: 'typo here.' })
    )
  })

  it('fuzzy-matches punctuation and spacing variants', () => {
    expect(noteKey({ persona: 'reader', explanation: NOTE })).toBe(
      noteKey({ persona: 'reader', explanation: 'Typo  merges word—and stray characters!' })
    )
  })
})

describe('groupFindingsByNote', () => {
  it('collapses same-note findings preserving first-seen order', () => {
    const findings = [
      finding('r1', 'representing'),
      finding('r2', 'other', 'Different note.'),
      finding('r3', 'covering', 'Typo  merges word—and stray characters!'),
    ]
    const groups = groupFindingsByNote(findings)
    expect(groups.length).toBe(2)
    expect(groups[0].items.map(f => f.id)).toEqual(['r1', 'r3'])
    expect(groups[1].items.map(f => f.id)).toEqual(['r2'])
  })
})

describe('ReviewDock duplicate notes', () => {
  it('collapses to one card: note once, every quote kept, click-to-apply rows', () => {
    const findings = [finding('r1', 'representing'), finding('r2', 'representing as'), finding('r3', 'covering')]
    const { container, cleanup } = render(
      <ReviewDock
        findings={findings}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
      />
    )
    const matches = container.textContent?.split(NOTE).length ?? 0
    expect(matches - 1).toBe(1)
    expect(container.textContent).toContain('×3')
    for (const q of ['representing', 'representing as', 'covering']) {
      expect(container.textContent).toContain(q)
    }
    // Compact popup-style rows: no Accept buttons, no numeric prefixes —
    // every suggestion is a click-to-apply row.
    expect(container.textContent).not.toContain('Accept')
    expect(container.textContent).not.toContain('1.')
    const rows = container.querySelectorAll('[role="button"]')
    expect(rows.length).toBe(3)
    for (const q of ['representing fixed', 'representing as fixed', 'covering fixed']) {
      expect(container.textContent).toContain(q)
    }
    cleanup()
  })

  it('wraps short quotes instead of truncating (truncate only over 20 words)', () => {
    const { container, cleanup } = render(
      <ReviewDock
        findings={[finding('r1', 'remains significant')]}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
      />
    )
    // Short quote renders in full — no ellipsis truncation.
    expect(container.textContent).toContain('remains significant')
    expect(container.textContent).not.toContain('remains s...')
    cleanup()
  })

  it('still shows distinct explanations', () => {
    const findings = [finding('r1', 'alpha', 'First note.'), finding('r2', 'beta', 'Second note.')]
    const { container, cleanup } = render(
      <ReviewDock
        findings={findings}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
      />
    )
    expect(container.textContent).toContain('First note.')
    expect(container.textContent).toContain('Second note.')
    cleanup()
  })
})

describe('buildReaderFindings', () => {
  const base = { documentRevision: 1, sourceRevision: 1, makeId: (() => { let n = 0; return () => `id-${++n}` })(), now: () => 7 }
  const rx = (quote: string, text: string, options: unknown[]) => ({ quote, text, options })

  it('collapses identical (note, quote) pairs from one payload', () => {
    const out = buildReaderFindings([
      rx('remains significant', 'This phrasing feels incomplete.', ['remains a significant challenge.', 'remains challenging.']),
      rx('remains significant', 'This phrasing feels incomplete.', ['remains a significant challenge.']),
      rx('remains significant', 'This phrasing feels incomplete.', ['remains difficult to capture.']),
    ], base)
    expect(out.length).toBe(1)
    expect(out[0].suggestions.map(s => s.text)).toEqual([
      'remains a significant challenge.',
      'remains challenging.',
    ])
  })

  it('keeps distinct quotes with the same note', () => {
    const out = buildReaderFindings([
      rx('alpha passage', NOTE, ['alpha fixed']),
      rx('beta passage', NOTE, ['beta fixed']),
    ], base)
    expect(out.length).toBe(2)
  })

  it('dedupes repeated options within a finding and skips empty ones', () => {
    const out = buildReaderFindings([
      rx('some quote', NOTE, ['Same fix.', 'same fix. ', '', '  ', 'Other fix.']),
    ], base)
    expect(out.length).toBe(1)
    expect(out[0].suggestions.map(s => s.text)).toEqual(['Same fix.', 'Other fix.'])
  })

  it('drops reactions with no usable options', () => {
    const out = buildReaderFindings([rx('some quote', NOTE, []), rx('other', NOTE, ['', '  '])], base)
    expect(out.length).toBe(0)
  })
})

describe('ReviewDock persona filter', () => {
  const grammarFinding = (id: string, quote: string): Finding => ({
    id,
    documentId: 'doc-1',
    persona: 'grammar',
    kind: 'language_error',
    anchor: { quotedText: quote, documentRevision: 1 },
    explanation: 'Grammar fix: verb agreement.',
    suggestions: [{ id: `${id}-s`, text: `${quote} fixed` }],
    status: 'open',
    sourceRevision: 1,
    createdAt: 2,
  })

  it('shows both personas by default', () => {
    const { container, cleanup } = render(
      <ReviewDock
        findings={[finding('r1', 'reader passage'), grammarFinding('g1', 'grammar passage')]}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
      />
    )
    expect(container.textContent).toContain('reader passage')
    expect(container.textContent).toContain('grammar passage')
    cleanup()
  })

  it('filters to one persona via the Persona menu', () => {
    const { container, cleanup } = render(
      <ReviewDock
        findings={[finding('r1', 'reader passage'), grammarFinding('g1', 'grammar passage')]}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
      />
    )
    const personaBtn = [...container.querySelectorAll('button')].find(b => b.title === 'Filter by persona (also toggles underlines)')
    expect(personaBtn).toBeDefined()
    act(() => {
      personaBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const grammarOpt = [...container.querySelectorAll('button')].find(b => b.textContent === 'Grammar')
    expect(grammarOpt).toBeDefined()
    act(() => {
      grammarOpt?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).toContain('grammar passage')
    expect(container.textContent).not.toContain('reader passage')
    cleanup()
  })

  it('reports selection through the controlled callback', () => {
    const onPersonaFilterChange = vi.fn()
    const { container, cleanup } = render(
      <ReviewDock
        findings={[finding('r1', 'reader passage')]}
        onStatusChange={() => {}}
        onRunAnalysis={async () => {}}
        analyzing={false}
        editor={null}
        personaFilter="all"
        onPersonaFilterChange={onPersonaFilterChange}
      />
    )
    const personaBtn = [...container.querySelectorAll('button')].find(b => b.title === 'Filter by persona (also toggles underlines)')
    act(() => {
      personaBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const readerOpt = [...container.querySelectorAll('button')].find(b => b.textContent === 'Reader')
    act(() => {
      readerOpt?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onPersonaFilterChange).toHaveBeenCalledWith('reader')
    cleanup()
  })
})

describe('truncateQuote', () => {
  it('leaves short quotes untouched', () => {
    expect(truncateQuote('remains significant')).toBe('remains significant')
  })

  it('truncates only quotes over 20 words', () => {
    const words = Array.from({ length: 25 }, (_, i) => `w${i + 1}`)
    const q = words.join(' ')
    expect(truncateQuote(q)).toBe(words.slice(0, 20).join(' ') + '...')
    expect(truncateQuote(words.slice(0, 20).join(' '))).toBe(words.slice(0, 20).join(' '))
  })
})

describe('InlineReviewPopup duplicate notes', () => {
  it('hides the repeated explanation on Next review but keeps the fix', () => {
    const findings = [finding('r1', 'representing'), finding('r2', 'covering')]
    const { container, cleanup } = render(
      <InlineReviewPopup
        findings={findings}
        position={{ x: 100, y: 200 }}
        editor={null}
        onApplySuggestion={() => {}}
        onDismissFinding={() => {}}
        onClose={() => {}}
      />
    )
    expect(container.textContent).toContain(NOTE)
    const nextBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Next review'))
    expect(nextBtn).toBeDefined()
    act(() => {
      nextBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).not.toContain(NOTE)
    expect(container.textContent).toContain('covering fixed')
    expect(container.textContent).toContain('covering')
    cleanup()
  })

  it('shows the quote instead of a repeated note when there are no suggestions', () => {
    const bare = (id: string, quote: string): Finding => ({ ...finding(id, quote), suggestions: [] })
    const findings = [bare('r1', 'representing'), bare('r2', 'covering')]
    const { container, cleanup } = render(
      <InlineReviewPopup
        findings={findings}
        position={{ x: 100, y: 200 }}
        editor={null}
        onApplySuggestion={() => {}}
        onDismissFinding={() => {}}
        onClose={() => {}}
      />
    )
    expect(container.textContent).toContain(NOTE)
    const nextBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Next review'))
    act(() => {
      nextBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).not.toContain(NOTE)
    expect(container.textContent).toContain('covering')
    cleanup()
  })
})
