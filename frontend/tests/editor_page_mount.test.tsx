// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import EditorPage from '../src/pages/EditorPage'

describe('EditorPage Mount for /app', () => {
  it('renders EditorPage without throwing when demo is false', async () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const root = createRoot(div)

    await act(async () => {
      root.render(<EditorPage demo={false} />)
    })

    expect(div.innerHTML).toContain('byline-app-container')
    root.unmount()
    div.remove()
  })

  it('handles corrupted localStorage without crashing', async () => {
    localStorage.setItem('byline.doc.context', 'undefined')
    localStorage.setItem('byline.doc.outline', '{invalid')
    localStorage.setItem('byline.doc.html', '')

    const div = document.createElement('div')
    document.body.appendChild(div)
    const root = createRoot(div)

    await act(async () => {
      root.render(<EditorPage demo={false} />)
    })

    expect(div.innerHTML).toContain('byline-app-container')
    root.unmount()
    div.remove()
  })
})
