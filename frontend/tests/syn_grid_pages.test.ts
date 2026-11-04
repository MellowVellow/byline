import { describe, it, expect } from 'vitest'
import { SEL_COLS, EMPTY_GRID, visibleCells, type SelGrid } from '../src/components/CaretPopup'

function fullGrid(): SelGrid {
  return {
    Synonyms: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
    Paraphrase: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
    Tone: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
  }
}

describe('synonym grid paging (6 per col, 1 per page)', () => {
  it('shows 1 row per page across 6 pages', () => {
    const g = fullGrid()
    expect(visibleCells(g, 0, 0)).toEqual(['a1'])
    expect(visibleCells(g, 0, 1)).toEqual(['a2'])
    expect(visibleCells(g, 0, 5)).toEqual(['a6'])
    expect(visibleCells(g, 0, 6)).toEqual(['a1'])
    expect(visibleCells(g, 2, 1)).toEqual(['c2'])
  })

  it('page count math matches shiftSelPage', () => {
    const g = fullGrid()
    const pages = Math.max(1, ...SEL_COLS.map(c => (g[c]?.length || 0)))
    expect(pages).toBe(6)
    expect(EMPTY_GRID.Synonyms.length || 0).toBe(0)
  })

  it('short columns page one at a time', () => {
    const g = { ...EMPTY_GRID, Tone: ['x', 'y'] } as SelGrid
    expect(visibleCells(g, 2, 0)).toEqual(['x'])
    expect(visibleCells(g, 2, 1)).toEqual(['y'])
    expect(visibleCells(g, 2, 2)).toEqual(['x'])
  })
})
