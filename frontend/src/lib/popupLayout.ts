export type PopupId = 'ghost' | 'selection' | 'review' | 'connect'

export interface PopupBox {
  id: PopupId
  x: number
  y: number
  width: number
  height: number
}

export const POPUP_GAP = 12

const DISPLAY_ORDER: PopupId[] = ['selection', 'ghost', 'review', 'connect']

/**
 * Resolve downward-only offsets for floating popups.
 *
 * Boxes are considered in top-to-bottom screen order, with a stable kind
 * order used only to break exact ties. The highest popup keeps its anchor.
 * Every lower popup moves down far enough to clear all previously placed
 * boxes. Horizontal separation is enough to leave a popup untouched.
 */
export function cascadePopupRects(
  rects: PopupBox[],
  viewportHeight: number,
  gap: number = POPUP_GAP,
): Record<PopupId, number> {
  const offsets: Record<PopupId, number> = {
    ghost: 0,
    selection: 0,
    review: 0,
    connect: 0,
  }
  const ordered = [...rects].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    if (a.x !== b.x) return a.x - b.x
    return DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id)
  })
  const placed: Array<{ left: number; right: number; top: number; bottom: number }> = []

  for (const rect of ordered) {
    let top = rect.y
    for (const other of placed) {
      const horizontal = rect.x < other.right + gap && other.left < rect.x + rect.width + gap
      const vertical = top < other.bottom + gap && top + rect.height > other.top - gap
      if (horizontal && vertical) {
        top = other.bottom + gap
      }
    }
    const maxTop = Math.max(0, viewportHeight - rect.height - 8)
    if (top > maxTop) top = maxTop
    offsets[rect.id] = Math.round(Math.max(0, top - rect.y))
    placed.push({
      left: rect.x,
      right: rect.x + rect.width,
      top,
      bottom: top + rect.height,
    })
  }

  return offsets
}
