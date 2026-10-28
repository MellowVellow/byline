import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { buildStyle, type AppliedSettings } from '../lib/buildStyle'
import type { TextMap } from '../lib/locate'
import { blip } from '../lib/sfx'

export interface SynonymDeps {
  getEditor: () => any
  plain: () => TextMap
  appliedRef: { current: AppliedSettings }
  editingRef: { current: boolean }
  setLoad: (k: string, v: boolean) => void
}

/** Double-click word → synonyms popup; Tab/1-3 replace, Esc dismiss. Editing mode only. */
export function useSynonyms(deps: SynonymDeps) {
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [synPos, setSynPos] = useState({ x: 200, y: 200, h: 400 })
  const [, setSynRange] = useState<{ from: number; to: number } | null>(null)
  const synRef = useRef<string[]>([]); synRef.current = synonyms
  const synRangeRef = useRef<{ from: number; to: number } | null>(null)

  async function onDblClick() {
    const editor = deps.getEditor(); if (!editor) return
    const { from, to } = editor.state.selection; const word = editor.state.doc.textBetween(from, to).trim()
    if (!word || word.includes(' ')) return
    const tm = deps.plain(); const sent = tm.text.split(/(?<=[.!?])\s/).find(s => s.includes(word)) || tm.text.slice(0, 200)
    const cc = editor.view.coordsAtPos(from); const yy = cc.bottom + 8; setSynPos({ x: Math.max(8, Math.min(cc.left, innerWidth - 380)), y: yy, h: Math.max(170, innerHeight - yy - 12) })
    setSynRange({ from, to }); synRangeRef.current = { from, to }
    if (!deps.editingRef.current) return
    deps.setLoad('synonyms', true)
    const A = deps.appliedRef.current
    const d = await api.synonyms({ context: A.context, level: A.level, word, sentence: sent, style: buildStyle(A) })
    deps.setLoad('synonyms', false); if (d?.synonyms) { setSynonyms(d.synonyms.slice(0, 3)); blip('done') }
  }

  function replaceWord(w: string) {
    const editor = deps.getEditor(); if (!editor || !w) return
    const r = synRangeRef.current
    if (r) editor.chain().focus().setTextSelection(r).deleteSelection().insertContent(w).run()
    else editor.chain().focus().deleteSelection().insertContent(w).run()
    setSynonyms([]); synRangeRef.current = null
  }

  /** Keyboard handling while synonyms open. Returns true when consumed. */
  function handleSynonymKey(e: KeyboardEvent): boolean {
    if (!synRef.current.length) return false
    if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[0]); return true }
    if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[Number(e.key) - 1]); return true }
    if (e.key === 'Escape') { e.preventDefault(); setSynonyms([]); return true }
    return false
  }

  return { synonyms, synPos, onDblClick, replaceWord, handleSynonymKey }
}
