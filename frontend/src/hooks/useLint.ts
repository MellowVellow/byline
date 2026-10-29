import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { locateQuote, type TextMap } from '../lib/locate'
import { LINTER_RULE_LIBRARY, LINT_PRIORITY, type LintResult } from '../lib/rules'
import { lintStore, modeStore, syncLint } from '../editor/decorations'
import type { AppliedSettings } from '../lib/types'
import { keys as storageKeys, setStr } from '../lib/storage'
import { recordCall } from '../lib/metrics'

export interface LintDeps {
  getEditor: () => any
  plain: () => TextMap
  appliedRef: { current: AppliedSettings }
  setLoad: (k: string, v: boolean) => void
  openRightTab: (t: 'lint') => void
  setPopupPos: (p: { x: number; y: number; h: number }) => void
  writerPosRef: { current: number }
  onSelect?: (r: LintResult) => void
}

/** Stable key for manual disable (uid random per run). */
export const lintKeyOf = (r: LintResult) => `lint:${(r.target || '').trim().toLowerCase()}:${(r.rule_id || '').trim().toLowerCase()}`
/** Lint feature: enable toggle, auto-run debounced by caller + manual re-run (single-flight), grouped popup. Advisory only — no apply/fix; only Suggestions insert text. */
export function useLint(deps: LintDeps) {
  const [enabledRules, setEnabledRules] = useState<Set<string>>(() => new Set(LINTER_RULE_LIBRARY.map(r => r.id)))
  const [customRules, setCustomRules] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(storageKeys.customRules) || '[]') } catch { return [] } })
  const [customInput, setCustomInput] = useState('')
  const [lintResults, setLintResults] = useState<LintResult[]>([])
  const [lintGroup, setLintGroup] = useState<LintResult[]>([])
  const [lintIdx, setLintIdx] = useState(0)
  const lintGroupRef = useRef<LintResult[]>([]); lintGroupRef.current = lintGroup
  const [showLibrary, setShowLibrary] = useState(false)
  const [lintStatus, setLintStatus] = useState('')
  const lintAbortRef = useRef<AbortController | null>(null)
  const lintBusyRef = useRef(false)
  const lintIdxRef = useRef(0); lintIdxRef.current = lintIdx
  // TAB-level disable: double-click Lint TAB toggles ALL lint underlines (no per-item disable).
  const [lintLayerDisabled, setLintLayerDisabledState] = useState(false)
  const lintLayerDisabledRef = useRef(false)
  const [lintSelUid, setLintSelUid] = useState('')
  function syncLintStore(results: LintResult[], editor: any, tm: TextMap) {
    const enabled = lintLayerDisabledRef.current ? [] : results
    lintStore.results = enabled; lintStore.ranges = new Map()
    for (const r of enabled) { const loc = locateQuote(tm, r.target, r.context); if (loc) lintStore.ranges.set(r.uid!, loc) }
    if (editor) syncLint(editor)
  }
  function setLintLayerDisabled(off: boolean) {
    lintLayerDisabledRef.current = off; setLintLayerDisabledState(off)
    const editor = deps.getEditor(); if (editor) syncLintStore(lintResultsRef.current, editor, deps.plain())
  }
  const lintResultsRef = useRef<LintResult[]>([])

  async function runLint() {
    if (lintBusyRef.current) return
    const editor = deps.getEditor()
    if (!editor || modeStore.mode !== 'editing') return
    const tm = deps.plain(); if (tm.text.trim().length < 20) { setLintStatus('Write at least a sentence — lint auto-runs.'); return }
    const active = [
      ...LINTER_RULE_LIBRARY.filter(r => enabledRules.has(r.id)).map(r => ({ id: r.id, category: r.color, rule: `${r.name}: ${r.instruction}` })),
      ...customRules.map((t, i) => ({ id: `CUSTOM_${String(i + 1).padStart(2, '0')}`, category: 'violet', rule: t })),
    ]
    lintBusyRef.current = true
    const ctl = new AbortController(); lintAbortRef.current = ctl
    deps.setLoad('lint', true); setLintStatus('Linting…')
    const d = await api.lint({ context: deps.appliedRef.current.context, text: tm.text, active_rules: active }, ctl.signal); recordCall(d?.meta)
    lintBusyRef.current = false; deps.setLoad('lint', false)
    if (ctl.signal.aborted) return
    if (!d?.ok) { setLintStatus(`Lint failed — ${String(d?.error || 'unknown backend error').slice(0, 140)}`); return }
    const results: LintResult[] = (d?.lint_results || []).map((r: LintResult) => ({ ...r, uid: `${r.rule_id}:${r.target}:${Math.random().toString(36).slice(2, 7)}` }))
    setLintStatus(`${results.length} violation${results.length === 1 ? '' : 's'} · ${active.length} rules active`)
    setLintResults(results); lintResultsRef.current = results
    syncLintStore(results, editor, tm)
  }

  function toggleRule(id: string) { setEnabledRules(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }

  function openLintGroup(clicked: LintResult) {
    const editor = deps.getEditor(); if (!editor) return
    deps.openRightTab('lint'); deps.onSelect?.(clicked); setLintSelUid(clicked.uid || '')
    // selected underline's item goes on top of dock list
    setLintResults(prev => { const n = [clicked, ...prev.filter(x => x.uid !== clicked.uid)]; lintResultsRef.current = n; return n })
    const cr = lintStore.ranges.get(clicked.uid!)
    const group = cr ? lintStore.results.filter((x: LintResult) => { const q = lintStore.ranges.get(x.uid!); return q && q.from < cr.to && cr.from < q.to }) : [clicked]
    const sorted = [...group].sort((a, b) => (LINT_PRIORITY[a.color_category] ?? 9) - (LINT_PRIORITY[b.color_category] ?? 9))
    setLintGroup(sorted); lintGroupRef.current = sorted; setLintIdx(0); lintIdxRef.current = 0
    lintStore.activeUid = sorted[0]?.uid || null; syncLint(editor)
    const c = editor.view.coordsAtPos(editor.state.selection.from); const y = c.bottom + 8 + scrollY
    deps.setPopupPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) })
  }

  /** Keyboard handling for lint popup. Advisory only: Tab/Enter advance, never apply. */
  function handleLintKey(e: KeyboardEvent): boolean {
    const editor = deps.getEditor(); if (!editor || !lintGroupRef.current.length) return false
    if (e.key === 'Escape') { e.preventDefault(); setLintGroup([]); lintStore.activeUid = null; syncLint(editor); return true }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation()
      const g = lintGroupRef.current
      if (lintIdxRef.current + 1 < g.length) { const n = lintIdxRef.current + 1; setLintIdx(n); lintIdxRef.current = n; lintStore.activeUid = g[n].uid!; setLintSelUid(g[n].uid || ''); deps.onSelect?.(g[n]); syncLint(editor) }
      else { setLintGroup([]); lintStore.activeUid = null; syncLint(editor) }
      return true
    }
    return false
  }

  function selectLintIdx(i: number) {
    const editor = deps.getEditor()
    setLintIdx(i); lintIdxRef.current = i
    const r = lintGroupRef.current[i]; if (r) { lintStore.activeUid = r.uid!; setLintSelUid(r.uid || ''); deps.onSelect?.(r) }
    if (editor) syncLint(editor)
  }

  function closeLintGroup() {
    const editor = deps.getEditor()
    setLintGroup([]); lintStore.activeUid = null; if (editor) syncLint(editor)
  }

  function abortLint() { lintAbortRef.current?.abort() }

  return {
    enabledRules, setEnabledRules, customRules, setCustomRules, customInput, setCustomInput,
    lintResults, setLintResults, lintGroup, setLintGroup, lintIdx, setLintIdx, lintGroupRef, lintIdxRef,
    showLibrary, setShowLibrary, lintStatus, setLintStatus,
    runLint, toggleRule, openLintGroup, handleLintKey, selectLintIdx, closeLintGroup, abortLint,
    lintLayerDisabled, setLintLayerDisabled, lintSelUid, setLintSelUid, lintKeyOf,
  }
}
export type UseLint = ReturnType<typeof useLint>
