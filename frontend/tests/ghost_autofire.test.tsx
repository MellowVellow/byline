// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useGhostTriggers, type UseGhostTriggers } from '../src/hooks/useGhostTriggers'

// Regression test for the auto-fire deadlock: the poller's 150ms armed-confirm
// needs 2+ consecutive evaluate()==ghost:true ticks. A one-shot fired.* dedup
// inside evaluate turned the 2nd tick false, so auto-ghost could NEVER fire and
// only manual Ctrl+Space worked.
describe('ghost auto-fire (pause-anywhere)', () => {
  let now = 0
  const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now)

  function probe(slowMs = 350, longMs = 2500) {
    let api: UseGhostTriggers | null = null
    function Probe() {
      api = useGhostTriggers(slowMs, longMs)
      return null
    }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(<Probe />)
    })
    return {
      get: () => api as unknown as UseGhostTriggers,
      cleanup: () => {
        root.unmount()
        container.remove()
      },
    }
  }

  afterEach(() => {
    now = 0
  })

  it('stays ghost:true across consecutive idle ticks (arm window can complete)', () => {
    const p = probe()
    const full = 'Strategic electrification delivers higher long-term yields mid-sentence here'
    const caret = 30 // mid-sentence, mid-word even
    act(() => {
      p.get().onInput(full, caret) // keystroke at t=0
    })
    now = 400 // slowMs (350) elapsed
    const tick1 = p.get().evaluate(full, caret, caret)
    now = 550 // +150ms arm window
    const tick2 = p.get().evaluate(full, caret, caret)
    expect(tick1.ghost).toBe(true)
    expect(tick2.ghost).toBe(true) // old code: false (fired dedup) → never fired
    p.cleanup()
  })

  it('fires mid-word, not just at sentence ends', () => {
    const p = probe()
    const full = 'the quick brown fox jumps over the lazy dog near the river bank side'
    const caret = 20 // mid-word/mid-sentence
    act(() => {
      p.get().onInput(full, caret)
    })
    now = 1000
    expect(p.get().evaluate(full, caret, caret).ghost).toBe(true)
    p.cleanup()
  })

  it('still suppresses near-empty docs and respects fresh keystrokes', () => {
    const p = probe()
    act(() => {
      p.get().onInput('hi', 2)
    })
    now = 5000
    expect(p.get().evaluate('hi', 2, 2).ghost).toBe(false)
    // fresh keystroke resets the idle clock
    const full = 'Strategic electrification delivers higher long-term yields today'
    act(() => {
      p.get().onInput(full, 10)
    })
    expect(p.get().evaluate(full, 10, 10).ghost).toBe(false)
    now = 6000
    expect(p.get().evaluate(full, 10, 10).ghost).toBe(true)
    p.cleanup()
  })
})
