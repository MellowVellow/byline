import { describe, it, expect } from 'vitest'
import { SEL_COLS, EMPTY_GRID, visibleCells, type SelGrid } from '../src/components/CaretPopup'

function fullGrid(): SelGrid {
  return {
    Synonyms: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
    Paraphrase: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
    Tone: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
  }
}

describe('synonym grid paging (6 per col, 3 per page)', () => {
  it('shows 3 rows per page across 2 pages', () => {
    const g = fullGrid()
    expect(visibleCells(g, 0, 0)).toEqual(['a1', 'a2', 'a3'])
    expect(visibleCells(g, 0, 1)).toEqual(['a4', 'a5', 'a6'])
    expect(visibleCells(g, 2, 1)).toEqual(['c4', 'c5', 'c6'])
  })

  it('page count math matches shiftSelPage', () => {
    const g = fullGrid()
    const pages = Math.max(1, ...SEL_COLS.map(c => Math.ceil((g[c]?.length || 0) / 3)))
    expect(pages).toBe(2)
    expect(Math.ceil((EMPTY_GRID.Synonyms.length || 0) / 3)).toBe(0)
  })

  it('short columns show a single partial page', () => {
    const g = { ...EMPTY_GRID, Tone: ['x', 'y'] } as SelGrid
    expect(visibleCells(g, 2, 0)).toEqual(['x', 'y'])
  })
})
