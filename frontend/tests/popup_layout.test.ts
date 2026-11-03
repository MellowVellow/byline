import { describe, it, expect } from 'vitest'
import { cascadePopupRects } from '../src/lib/popupLayout'

describe('cascadePopupRects', () => {
  it('leaves non-overlapping popups untouched', () => {
    expect(
      cascadePopupRects(
        [
          { id: 'selection', x: 100, y: 100, width: 200, height: 120 },
          { id: 'connect', x: 400, y: 120, width: 200, height: 180 },
        ],
        800,
      ),
    ).toEqual({ ghost: 0, selection: 0, review: 0, connect: 0 })
  })

  it('moves an overlapping lower popup below the upper popup', () => {
    expect(
      cascadePopupRects(
        [
          { id: 'selection', x: 100, y: 100, width: 240, height: 150 },
          { id: 'connect', x: 120, y: 180, width: 220, height: 160 },
        ],
        800,
      ),
    ).toEqual({ ghost: 0, selection: 0, review: 0, connect: 82 })
  })

  it('cascades a chain without moving popups upward', () => {
    const offsets = cascadePopupRects(
      [
        { id: 'selection', x: 100, y: 100, width: 240, height: 100 },
        { id: 'review', x: 110, y: 140, width: 220, height: 90 },
        { id: 'connect', x: 120, y: 160, width: 220, height: 120 },
      ],
      800,
    )

    expect(offsets.selection).toBe(0)
    expect(offsets.review).toBe(72)
    expect(offsets.connect).toBe(154)
  })

  it('uses a stable kind order when anchors are identical', () => {
    const offsets = cascadePopupRects(
      [
        { id: 'connect', x: 100, y: 100, width: 220, height: 120 },
        { id: 'selection', x: 100, y: 100, width: 240, height: 150 },
      ],
      800,
    )

    expect(offsets.selection).toBe(0)
    expect(offsets.connect).toBe(162)
  })
})
