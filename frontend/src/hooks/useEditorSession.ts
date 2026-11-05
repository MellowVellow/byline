import { useState } from 'react'

export interface EditorSessionState {
  docRevision: number
  counts: { words: number; chars: number }
}

export function useEditorSession(initial: Partial<EditorSessionState> = {}) {
  const [docRevision, setDocRevision] = useState(initial.docRevision ?? 1)
  const [counts, setCounts] = useState(initial.counts ?? { words: 0, chars: 0 })
  return { docRevision, setDocRevision, counts, setCounts }
}
