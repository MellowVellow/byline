// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import InlineReviewPopup from '../src/components/InlineReviewPopup'
import type { Finding } from '../src/domain/finding'

describe('InlineReviewPopup in Edit Mode', () => {
  const sampleFindings: Finding[] = [
    {
      id: 'f-reader-1',
      documentId: 'doc-1',
      persona: 'reader',
      kind: 'reader_observation',
      anchor: { quotedText: 'interconnecting regional labor markets', documentRevision: 1 },
      explanation: 'Stylistic clarity: "connecting" or "linking" provides a cleaner verb form.',
      suggestions: [
        { id: 's-1', text: 'linking regional labor markets', rationale: 'Active verb' },
        { id: 's-2', text: 'connecting regional labor markets', rationale: 'Direct form' },
      ],
      status: 'open',
      sourceRevision: 1,
      createdAt: 1,
    },
    {
      id: 'f-reader-2',
      documentId: 'doc-1',
      persona: 'reader',
      kind: 'reader_observation',
      anchor: { quotedText: 'interconnecting regional labor markets', documentRevision: 1 },
      explanation: 'Reader perception: Jargon density feels heavy for a general audience.',
      suggestions: [],
      status: 'open',
      sourceRevision: 1,
      createdAt: 2,
    },
  ]

  it('renders fix suggestions feel-test compact with keybind hints', () => {
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

    // Fixes only — no persona label, color border carries the type
    expect(container.textContent).not.toContain('Reader')
    expect(container.textContent).toContain('linking regional labor markets')
    // Keybind footer: dismiss esc only (no accept-number hint)
    expect(container.textContent).toContain('Dismiss')
    expect(container.textContent).toContain('esc')
    expect(container.textContent).not.toContain('1–2')
    // Clicking a fix row applies it
    const row = container.querySelector('[role="option"]')
    expect(row).not.toBeNull()
    act(() => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(handleApply).toHaveBeenCalledTimes(1)
    root.unmount()
    container.remove()
  })

  it('renders reader comment when no suggestions exist', () => {
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

  it('Delete dismisses (marks handled), Backspace does not, Esc only closes', () => {
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

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })
    expect(handleDismiss).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    })
    expect(handleDismiss).toHaveBeenCalledWith('f-reader-1')
    // Single finding: dismissing also closes the popup.
    const closesAfterDismiss = handleClose.mock.calls.length

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(handleClose.mock.calls.length).toBe(closesAfterDismiss + 1)

    root.unmount()
    container.remove()
  })

  it('cycles multiple findings with the | key', () => {
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

    // Initially active is the first finding (has suggestions), | hint shown
    expect(container.textContent).toContain('linking regional labor markets')
    expect(container.textContent).toContain('|')

    // | cycles to the second finding (shows comment)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '|', bubbles: true }))
    })

    // Now active is the second finding (shows comment)
    expect(container.textContent).toContain('Reader perception: Jargon density feels heavy')
    root.unmount()
    container.remove()
  })
})
