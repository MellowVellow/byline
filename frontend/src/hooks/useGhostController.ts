import { useState, useRef } from 'react'
import type { GhostGroups, GhostLevel } from '../components/CaretPopup'

export const EMPTY_GHOST: GhostGroups = { cue: [], question: [], fragment: [], sentence: [] }

export function useGhostController() {
  const [ghostGroups, setGhostGroups] = useState<GhostGroups>(EMPTY_GHOST)
  const [ghostLv, setGhostLv] = useState<GhostLevel>('fragment')
  const [ghostIdx, setGhostIdx] = useState(0)
  const lastGhostLevel = useRef<GhostLevel>('fragment')
  const pendingGhostBias = useRef<GhostLevel | null>(null)
  const ghostReqId = useRef(0)
  const ghostAbort = useRef<AbortController | null>(null)
  const ghostAutoAllowedRef = useRef(false)
  return {
    ghostGroups, setGhostGroups,
    ghostLv, setGhostLv,
    ghostIdx, setGhostIdx,
    lastGhostLevel,
    pendingGhostBias,
    ghostReqId,
    ghostAbort,
    ghostAutoAllowedRef,
  }
}
