import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { anchorStore, syncGhost, redraw } from '../editor/decorations'
import { buildStyle, type AppliedSettings } from '../lib/buildStyle'
import { FALLBACK_SUGGESTIONS } from '../lib/fallback'
import { sentenceCase } from '../lib/case'
import { ghostInsertText, rankByAccepted, lastTwoSentences } from '../lib/layers'
import { keys as storageKeys, getJSON, setJSON } from '../lib/storage'
import { recordCall } from '../lib/metrics'
import { blip } from '../lib/sfx'
import type { Fact } from '../lib/types'

export interface GhostDeps {
  getEditor: () => any
  editorReady: boolean
  appliedRef: { current: AppliedSettings }
  refs: { current: any }
  setLoad: (k: string, v: boolean) => void
  record: (patch: any) => void
  demo: boolean
  getFacts: () => Fact[]
  isMenuOpen: () => boolean
  isSuggestDisabled: () => boolean
}

/** Ghost suggestions: fetch (abort + version-guarded), display, accept/dismiss, history. */
export function useGhost(deps: GhostDeps) {
  const suggKey = storageKeys.sugg(deps.demo)
  const savedSugg = getJSON<any>(suggKey, null)
  const [suggestions, setSuggestions] = useState<string[]>(savedSugg?.current || [])
  const [ghostIdx, setGhostIdx] = useState(savedSugg?.idx || 0)
  const [suggHistory, setSuggHistory] = useState<string[]>(savedSugg?.history || [])
  const [suggPos, setSuggPos] = useState({ x: 200, y: 300, h: 500 })
  const { refs } = deps
  useEffect(() => { refs.current.sugg = suggestions }, [suggestions]) // eslint-disable-line
  useEffect(() => { refs.current.idx = ghostIdx }, [ghostIdx]) // eslint-disable-line
  useEffect(() => { setJSON(suggKey, { current: suggestions, history: suggHistory, idx: ghostIdx }) }, [suggestions, suggHistory, ghostIdx, suggKey])
  useEffect(() => { if (savedSugg?.current?.length && deps.getEditor()) { refs.current.sugg = savedSugg.current; setTimeout(() => showGhost(savedSugg.idx || 0), 300) } }, [deps.editorReady]) // eslint-disable-line

  function archiveSuggestions(list: string[]) { if (list.length) setSuggHistory(h => [...list.filter(s => !h.includes(s)), ...h].slice(0, 30)) }
  function showGhost(idx: number) {
    const editor = deps.getEditor(); if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from
    anchorStore.ghost = ghostInsertText(editor.state.doc.textBetween(0, pos), s); anchorStore.ghostPos = pos; syncGhost(editor)
  }
  function clearGhost(moveToHistory = true) { if (moveToHistory && refs.current.sugg.length) { deps.record({ dismissed: (v: number) => v + 1 }); archiveSuggestions(refs.current.sugg) } anchorStore.ghost = ''; refs.current.sugg = []; setSuggestions([]); const editor = deps.getEditor(); if (editor) syncGhost(editor) }
  function acceptGhost(idx: number) { blip('accept')
    const editor = deps.getEditor(); if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from
    editor.chain().focus().insertContent(ghostInsertText(editor.state.doc.textBetween(0, pos), s)).run()
    try { const ds = getJSON<any[]>(storageKeys.dataset, []); ds.push({ context: deps.appliedRef.current.context, before: editor.state.doc.textBetween(Math.max(0, pos - 400), pos, '\n\n'), accepted: s, assist: deps.appliedRef.current.assist, ts: Date.now() }); setJSON(storageKeys.dataset, ds.slice(-1000)) } catch { /* noop */ }
    refs.current.acceptedVersion = -1
    deps.record({ accepted: (v: number) => v + 1 }); archiveSuggestions(refs.current.sugg.filter((x: string) => x !== s)); clearGhost(false)
    setTimeout(() => requestComplete(true), 650)
  }
  function atBlockEnd(): boolean {
    const editor = deps.getEditor(); if (!editor) return false
    const { $from } = editor.state.selection
    const end = $from.end($from.depth)
    return !editor.state.doc.textBetween(editor.state.selection.from, end).trim()
  }
  async function requestComplete(auto = false) {
    if (deps.isSuggestDisabled()) return
    if (deps.isMenuOpen()) return
    const editor = deps.getEditor()
    if (!editor || (auto && refs.current.version === refs.current.acceptedVersion)) return
    if (auto && refs.current.suppressAuto) return
    if (!auto) refs.current.suppressAuto = false
    if (auto && !atBlockEnd()) return
    const pos = editor.state.selection.from
    const before = editor.state.doc.textBetween(0, pos, '\n\n'); const after = editor.state.doc.textBetween(pos, editor.state.doc.content.size, '\n\n')
    if (!before.trim()) return
    const ctl = new AbortController(); refs.current.abort = ctl; const t0 = performance.now(); deps.setLoad('complete', true)
    const A = deps.appliedRef.current; const topFacts = deps.getFacts().slice(0, 3).map(f => f.fact)
    const d = await api.complete({ context: A.context, level: A.level, voice: A.voice, style: buildStyle(A), assist_level: A.assist, before: before.slice(-1200), after: after.slice(0, 400), version: refs.current.version, facts: topFacts, last_two: lastTwoSentences(before) }, ctl.signal); recordCall(d?.meta)
    let acceptedHist: string[] = []; try { acceptedHist = getJSON<any[]>(storageKeys.dataset, []).map((x: any) => x.accepted).filter(Boolean) } catch { /* noop */ }
    const fromApi = d?.suggestions?.length ? d.suggestions : null
    const sugg: string[] = rankByAccepted((fromApi || (deps.demo ? FALLBACK_SUGGESTIONS : [])).slice(0, 3).map((x: string) => fromApi ? x : sentenceCase(before, x)), acceptedHist)
    deps.setLoad('complete', false)
    if (!sugg.length || ctl.signal.aborted) return
    archiveSuggestions(refs.current.sugg.filter((s: string) => !sugg.includes(s)))
    refs.current.sugg = sugg; setSuggestions(sugg); setGhostIdx(0); refs.current.idx = 0; blip('done')
    deps.record({ offered: (v: number) => v + 1, msTotal: (v: number) => v + Math.round(performance.now() - t0), msCount: (v: number) => v + 1 })
    const pos2 = editor.state.selection.from
    anchorStore.ghost = ghostInsertText(editor.state.doc.textBetween(0, pos2), sugg[0]); anchorStore.ghostPos = pos2; syncGhost(editor)
    const c = editor.view.coordsAtPos(pos2); const y = c.bottom + 8; setSuggPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) })
    redraw(editor)
  }
  return { suggestions, ghostIdx, setGhostIdx, suggHistory, suggPos, showGhost, clearGhost, acceptGhost, requestComplete }
}
export type UseGhost = ReturnType<typeof useGhost>
