export const DOCK_MIN = 240
export const DOCK_MAX = 480
export const DOCK_DEFAULT = 280
export const DOCK_KEY = 'byline.dock.width'

export function clampDockWidth(w: number, viewportW?: number): number {
  const max = viewportW != null
    ? Math.min(DOCK_MAX, Math.max(DOCK_MIN, viewportW - 520))
    : DOCK_MAX
  if (!Number.isFinite(w)) return DOCK_DEFAULT
  return Math.min(max, Math.max(DOCK_MIN, Math.round(w)))
}

export function loadDockWidth(): number {
  try {
    const raw = localStorage.getItem(DOCK_KEY)
    if (!raw) return DOCK_DEFAULT
    return clampDockWidth(Number(raw))
  } catch {
    return DOCK_DEFAULT
  }
}

export function saveDockWidth(w: number) {
  try {
    localStorage.setItem(DOCK_KEY, String(clampDockWidth(w)))
  } catch { /* ignore */ }
}

/** Max popup height so shell never extends past viewport bottom. Floor keeps usability at extreme zoom. */
export function popupMaxHeight(y: number, viewportH: number, cap = 480, margin = 16): number {
  if (!Number.isFinite(y) || !Number.isFinite(viewportH)) return cap
  return Math.max(160, Math.min(cap, viewportH - y - margin, viewportH - 32))
}

export function clampPopupX(x: number, width: number, viewportW: number, margin = 8): number {
  if (!Number.isFinite(x) || !Number.isFinite(viewportW)) return x
  const w = Math.min(width, Math.max(0, viewportW - margin * 2))
  return Math.max(margin, Math.min(x, viewportW - w - margin))
}
