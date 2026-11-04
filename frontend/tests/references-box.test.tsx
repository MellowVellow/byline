// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReferencesBox, { appendReference } from '../src/components/ReferencesBox'

function render(el: React.ReactElement) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(el)
  })
  return { container, root, cleanup: () => { root.unmount(); container.remove() } }
}

beforeEach(() => localStorage.clear())
afterEach(() => { document.body.innerHTML = '' })

describe('ReferencesBox visibility', () => {
  it('renders nothing when there is no content', () => {
    const { container, cleanup } = render(<ReferencesBox />)
    expect(container.textContent?.trim()).toBe('')
    expect(document.getElementById('byline-refs')).toBeNull()
    cleanup()
  })

  it('renders saved content on mount', () => {
    localStorage.setItem('byline.refs.html', '<p>Alvarez (2025)</p>')
    const { container, cleanup } = render(<ReferencesBox />)
    expect(container.textContent).toContain('References (editable)')
    expect(document.getElementById('byline-refs')?.textContent).toContain('Alvarez')
    cleanup()
  })

  it('appears when a reference is appended while hidden', () => {
    const { cleanup } = render(<ReferencesBox />)
    expect(document.getElementById('byline-refs')).toBeNull()
    act(() => {
      appendReference('<p>Alvarez (2025)</p>')
    })
    expect(document.getElementById('byline-refs')?.textContent).toContain('Alvarez')
    cleanup()
  })

  it('hides again when all content is cleared', () => {
    localStorage.setItem('byline.refs.html', '<p>Alvarez (2025)</p>')
    const { cleanup } = render(<ReferencesBox />)
    const box = document.getElementById('byline-refs')!
    expect(box).not.toBeNull()
    act(() => {
      box.innerHTML = ''
      box.dispatchEvent(new InputEvent('input', { bubbles: true }))
    })
    expect(document.getElementById('byline-refs')).toBeNull()
    cleanup()
  })
})
