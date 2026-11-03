import { useRef } from 'react'
import { caretSignals } from '../lib/sentence-state'

export interface TriggerState {
  lastKey: number
  bursts: number
  sentIdx: number
  fired: { g?: string; c?: string; p?: string }
}

export function useGhostTriggers(slowMs = 350) {
  const ref = useRef<TriggerState>({ lastKey: performance.now(), bursts: 0, sentIdx: 0, fired: {} })
  const thresh = useRef({ slowMs })
  thresh.current = { slowMs }
  function onInput(fullText: string, caret: number) {
    const now = performance.now()
    const s = caretSignals(fullText, caret, caret)
    if (s.sentIdx !== ref.current.sentIdx) {
      ref.current.sentIdx = s.sentIdx
      ref.current.bursts = 1
    } else if (now - ref.current.lastKey >= thresh.current.slowMs) {
      ref.current.bursts++
    } else if (ref.current.bursts === 0) {
      ref.current.bursts = 1
    }
    ref.current.lastKey = now
    ref.current.fired = {}
  }
  function evaluate(fullText: string, caret: number, selEnd: number): { ghost: boolean; connective: boolean; phrase: boolean } {
    const { slowMs: slow } = thresh.current
    const idle = performance.now() - ref.current.lastKey
    const s = caretSignals(fullText, caret, selEnd)
    if (fullText.trim().length <= 8) return { ghost: false, connective: false, phrase: false }
    const key = `${s.sentIdx}|${caret}`
    const out = { ghost: false, connective: false, phrase: false }
    void s.zone
    if (idle >= slow) {
      out.ghost = true
    }
    return out
  }
  function touch() {
    ref.current.lastKey = performance.now()
  }
  return { ref, onInput, evaluate, touch, slowMs }
}

export type UseGhostTriggers = ReturnType<typeof useGhostTriggers>
