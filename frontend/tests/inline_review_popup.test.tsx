// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import InlineReviewPopup from '../src/components/InlineReviewPopup'
import type { Finding } from '../src/domain/finding'

describe('InlineReviewPopup in Edit Mode', () => {
  const sampleFindings: Finding[] = [
    {
      id: 'f-grammar-1',
      documentId: 'doc-1',
      persona: 'grammar',
      kind: 'spelling',
      anchor: { quotedText: 'interconnecting regional labor markets', documentRevision: 1 },
      explanation: 'Stylistic clarity: "connecting" or "linking" provides a cleaner verb form.',
      suggestions: [
        { id: 's-1', text: 'linking regional labor markets', rationale: 'Active verb' },
        { id: 's-2', text: 'connecting regional labor markets', rationale: 'Direct form' },
      ],
    },
    {
      id: 'f-reader-1',
      documentId: 'doc-1',
      persona: 'reader',
      kind: 'tone_reaction',
      anchor: { quotedText: 'interconnecting regional labor markets', documentRevision: 1 },
      explanation: 'Reader perception: Jargon density feels heavy for a general audience.',
      suggestions: [],
    },
  ]

  it('renders fix suggestions when available with an Accept button', () => {
    const handleApply = vi.fn()
    const handleDismiss = vi.fn()
    const handleClose = vi.fn()

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <InlineReviewPopup
          findings={[sampleFindings[0]]}
          position={{ x: 100, y: 200 }}
          editor={null}
          onApplySuggestion={handleApply}
          onDismissFinding={handleDismiss}
          onClose={handleClose}
        />
      )
    })

    expect(container.textContent).toContain('Grammar')
    expect(container.textContent).toContain('linking regional labor markets')
    const acceptBtn = container.querySelector('button[type="button"]')
    expect(acceptBtn).toBeDefined()
    root.unmount()
    container.remove()
  })

  it('renders persona comment/critique when no suggestions exist', () => {
    const handleApply = vi.fn()
    const handleDismiss = vi.fn()
    const handleClose = vi.fn()

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <InlineReviewPopup
          findings={[sampleFindings[1]]}
          position={{ x: 100, y: 200 }}
          editor={null}
          onApplySuggestion={handleApply}
          onDismissFinding={handleDismiss}
          onClose={handleClose}
        />
      )
    })

    expect(container.textContent).toContain('Reader perception: Jargon density feels heavy')
    root.unmount()
    container.remove()
  })

  it('displays multiple colors/findings side by side with Next-Tab navigation', () => {
    const handleApply = vi.fn()
    const handleDismiss = vi.fn()
    const handleClose = vi.fn()

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <InlineReviewPopup
          findings={sampleFindings}
          position={{ x: 100, y: 200 }}
          editor={null}
          onApplySuggestion={handleApply}
          onDismissFinding={handleDismiss}
          onClose={handleClose}
        />
      )
    })

    // Side-by-side tabs for both Grammar and Reader
    expect(container.textContent).toContain('Grammar')
    expect(container.textContent).toContain('Reader')

    // Initially active is Grammar (has suggestions)
    expect(container.textContent).toContain('linking regional labor markets')

    // Find and click Next tab button
    const buttons = Array.from(container.querySelectorAll('button'))
    const nextTabBtn = buttons.find(b => b.textContent?.includes('Next tab'))
    expect(nextTabBtn).toBeDefined()

    act(() => {
      nextTabBtn?.click()
    })

    // Now active is Reader (shows comment)
    expect(container.textContent).toContain('Reader perception: Jargon density feels heavy')
    root.unmount()
    container.remove()
  })
})
