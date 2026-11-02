// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import CaretPopup, {
  ghostOption, visibleCells,
  type GhostGroups, type SelGrid,
} from '../src/components/CaretPopup'

const GROUPS: GhostGroups = {
  cue: ['how people use it', 'the process', 'who is using it'],
  question: ['Depends on how, exactly?'],
  fragment: ['the way people use it during the process'],
  sentence: [],
}

const GRID: SelGrid = {
  Synonyms: ['procrastinated', 'dawdled', 'squandered', 'idled', 'stalled'],
  Paraphrase: ['wasted for too long'],
  Tone: [],
}

describe('caret popup helpers', () => {
  it('ghostOption wraps around within a level', () => {
    expect(ghostOption(GROUPS, 'cue', 0)).toBe('how people use it')
    expect(ghostOption(GROUPS, 'cue', 3)).toBe('how people use it')
    expect(ghostOption(GROUPS, 'sentence', 0)).toBe('')
  })

  it('visibleCells pages 3 at a time with wraparound', () => {
    expect(visibleCells(GRID, 0, 0)).toEqual(['procrastinated', 'dawdled', 'squandered'])
    expect(visibleCells(GRID, 0, 1)).toEqual(['idled', 'stalled', 'procrastinated'])
    expect(visibleCells(GRID, 1, 0)).toEqual(['wasted for too long'])
    expect(visibleCells(GRID, 2, 0)).toEqual([])
  })
})

function renderPopup(props: React.ComponentProps<typeof CaretPopup>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<CaretPopup {...props} />)
  })
  return { container, root, cleanup: () => { root.unmount(); container.remove() } }
}

const noop = () => {}

describe('CaretPopup ghost mode', () => {
  it('renders level row, keys row, and keeps Accept enabled for questions', () => {
    const { container, cleanup } = renderPopup({
      mode: 'ghost',
      position: { x: 10, y: 10 },
      ghostGroups: GROUPS,
      ghostLv: 'question',
      ghostIdx: 0,
      onAccept: noop, onReroll: noop, onDismiss: noop,
    })
    for (const lv of ['cue', 'question', 'fragment', 'sentence']) {
      expect(container.textContent).toContain(lv)
    }
    expect(container.textContent).toContain('Depends on how, exactly?')
    expect(container.textContent).toContain('Accept')
    expect(container.textContent).toContain('Reroll')
    const acceptBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Accept'))
    expect(acceptBtn?.disabled).toBe(false)
    cleanup()
  })

  it('shows loading shimmer when loading with no data', () => {
    const { container, cleanup } = renderPopup({
      mode: 'ghost',
      position: { x: 10, y: 10 },
      loading: true,
      onAccept: noop, onReroll: noop, onDismiss: noop,
    })
    expect(container.textContent).toContain('Thinking')
    cleanup()
  })

  it('clicking a level calls onGhostLevel', () => {
    const onGhostLevel = vi.fn()
    const { container, cleanup } = renderPopup({
      mode: 'ghost',
      position: { x: 10, y: 10 },
      ghostGroups: GROUPS,
      ghostLv: 'fragment',
      ghostIdx: 0,
      onGhostLevel,
      onAccept: noop, onReroll: noop, onDismiss: noop,
    })
    const cue = Array.from(container.querySelectorAll('[role="option"]')).find(el => el.textContent === '1cue')
    act(() => { cue?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(onGhostLevel).toHaveBeenCalledWith('cue')
    cleanup()
  })
})

describe('CaretPopup sel mode', () => {
  it('renders 3 columns, highlights the active cell, clicks accept', () => {
    const onSelCell = vi.fn()
    const { container, cleanup } = renderPopup({
      mode: 'sel',
      position: { x: 10, y: 10 },
      selGrid: GRID,
      selCol: 0,
      selRow: 1,
      selPage: 0,
      onSelCell,
      onAccept: noop, onReroll: noop, onDismiss: noop,
    })
    for (const c of ['Synonyms', 'Paraphrase', 'Tone']) {
      expect(container.textContent).toContain(c)
    }
    expect(container.textContent).toContain('dawdled')
    // Global 1-9 numbering across columns, full text shown (no truncation)
    const badges = Array.from(container.querySelectorAll('[role="option"] span')).map(s => s.textContent)
    expect(badges).toContain('1')
    expect(badges).toContain('4')
    const firstCell = Array.from(container.querySelectorAll('[role="option"]')).find(el => el.textContent === '1procrastinated')
    expect(firstCell).toBeDefined()
    expect((firstCell as HTMLElement).style.whiteSpace).not.toBe('nowrap')
    const cell = Array.from(container.querySelectorAll('[role="option"]')).find(el => el.textContent === '2dawdled')
    act(() => { cell?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(onSelCell).toHaveBeenCalledWith(0, 1)
    cleanup()
  })
})
