import { useRef, useState } from 'react'
import { api } from '../lib/api'
import type { AppliedSettings } from '../lib/types'
import type { TextMap } from '../lib/locate'
import { blip } from '../lib/sfx'

export interface SynonymDeps {
  getEditor: () => any
  plain: () => TextMap
  appliedRef: { current: AppliedSettings }
  editingRef: { current: boolean }
  setLoad: (k: string, v: boolean) => void
}

export interface AltBtn { x: number; y: number; from: number; to: number; text: string }

/**
 * Select (drag over) a fragment -> floating "Alternative" button below it ->
 * 3 alternatives for the whole fragment; click / Tab / 1-3 replaces in place,
 * Esc dismisses. Replaces the old double-click single-word synonym flow.
 */
export function useSynonyms(deps: SynonymDeps) {
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [synPos, setSynPos] = useState({ x: 200, y: 200, h: 400 })
  const [altBtn, setAltBtn] = useState<AltBtn | null>(null)
  const synRef = useRef<string[]>([]); synRef.current = synonyms
  const synRangeRef = useRef<{ from: number; to: number } | null>(null)
  const altRef = useRef<AltBtn | null>(null); altRef.current = altBtn

  /** Selection watcher: show the Alternative button over any short fragment. */
  function onSelection(editor: any) {
    if (!editor) return
    if (synRef.current.length) return // alternatives open: keep their anchor
    const { from, to } = editor.state.selection
    if (from >= to) { if (altRef.current) setAltBtn(null); return }
    const text = editor.state.doc.textBetween(from, to).trim()
    if (text.length < 2 || text.length > 80 || text.includes('\n') || text.split(/\s+/).length > 8) { if (altRef.current) setAltBtn(null); return }
    const c = editor.view.coordsAtPos(from)
    const e = editor.view.coordsAtPos(to)
    const x = Math.max(8, Math.min(c.left, innerWidth - 150)) + scrollX
    const y = e.bottom + 10 + scrollY // below the selection, clear of the BubbleMenu above
    const cur = altRef.current
    if (!cur || cur.from !== from || cur.to !== to) setAltBtn({ x, y, from, to, text })
  }

  async function requestAlternatives() {
    const editor = deps.getEditor(); const alt = altRef.current
    if (!editor || !alt) return
    synRangeRef.current = { from: alt.from, to: alt.to }
    const c = editor.view.coordsAtPos(alt.from); const yy = c.bottom + 8 + scrollY
    setSynPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)) + scrollX, y: yy, h: Math.max(170, innerHeight - (yy - scrollY) - 12) })
    setAltBtn(null)
    const tm = deps.plain()
    const fragIdx = tm.text.indexOf(alt.text)
    const sent = tm.text.split(/(?<=[.!?])\s/).find(s => s.includes(alt.text)) || tm.text.slice(Math.max(0, fragIdx - 120), fragIdx + 160)
    deps.setLoad('synonyms', true)
    const A = deps.appliedRef.current
    const d = await api.synonyms({ context: A.context, level: A.level, word: alt.text, sentence: sent })
    deps.setLoad('synonyms', false)
    if (d?.synonyms) { setSynonyms(d.synonyms.slice(0, 3)); blip('done') }
  }

  function replaceWord(w: string) {
    const editor = deps.getEditor(); if (!editor || !w) return
    const r = synRangeRef.current
    let out = w
    if (r) {
      const orig = editor.state.doc.textBetween(r.from, r.to)
      if (/^[A-Z]/.test(orig) && /^[a-z]/.test(out)) out = out[0].toUpperCase() + out.slice(1)
    }
    if (r) editor.chain().focus().setTextSelection(r).deleteSelection().insertContent(out).run()
    else editor.chain().focus().deleteSelection().insertContent(out).run()
    setSynonyms([]); synRangeRef.current = null
  }

  function clearAlt() { setSynonyms([]); setAltBtn(null); synRangeRef.current = null }

  /** Keyboard handling while alternatives open. Returns true when consumed. */
  function handleSynonymKey(e: KeyboardEvent): boolean {
    if (!synRef.current.length) return false
    if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[0]); return true }
    if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[Number(e.key) - 1]); return true }
    if (e.key === 'Escape') { e.preventDefault(); setSynonyms([]); return true }
    return false
  }

  return { synonyms, synPos, altBtn, onSelection, requestAlternatives, replaceWord, handleSynonymKey, clearAlt }
}
