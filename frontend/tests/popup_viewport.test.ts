import { describe, it, expect } from 'vitest'
import { clampDockWidth, popupMaxHeight, clampPopupX } from '../src/lib/popupViewport'

describe('popupViewport', () => {
  it('clamps dock width to range', () => {
    expect(clampDockWidth(100)).toBe(240)
    expect(clampDockWidth(280)).toBe(280)
    expect(clampDockWidth(900)).toBe(480)
  })

  it('shrinks dock max on narrow viewports', () => {
    expect(clampDockWidth(480, 700)).toBeLessThanOrEqual(480)
    expect(clampDockWidth(480, 700)).toBeGreaterThanOrEqual(240)
  })

  it('caps popup height to viewport', () => {
    expect(popupMaxHeight(500, 800, 420)).toBeLessThanOrEqual(800 - 500)
    expect(popupMaxHeight(100, 800, 420)).toBe(420)
    expect(popupMaxHeight(750, 800, 520)).toBeGreaterThanOrEqual(160)
  })

  it('clamps popup x inside viewport', () => {
    expect(clampPopupX(1200, 320, 1280)).toBeLessThanOrEqual(1280 - 320)
    expect(clampPopupX(-20, 320, 1280)).toBeGreaterThanOrEqual(8)
  })
})
