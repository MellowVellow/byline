import { useRef } from 'react'
import { api } from '../lib/api'
import { buildStyle, type AppliedSettings } from '../lib/buildStyle'
import { FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_READINGS } from '../lib/fallback'
import { keys as storageKeys, getJSON } from '../lib/storage'
import { recordCall } from '../lib/metrics'
import type { TextMap } from '../lib/locate'
import type { GrammarMatch, Issue, Reaction, Reading } from '../lib/types'

export interface PanelDeps {
  getEditor: () => any
  plain: () => TextMap
  appliedRef: { current: AppliedSettings }
  editingRef: { current: boolean }
  versionRef: { current: any }
  setLoad: (k: string, v: boolean) => void
  demo: boolean
  nid: () => string
  dictRef: { current: { spelling: string[]; ignore: string[] } }
  researchAutoRef: { current: boolean }
  setGrammar: (v: GrammarMatch[] | ((p: GrammarMatch[]) => GrammarMatch[])) => void
  setIssues: (v: Issue[]) => void
  setReactions: (v: Reaction[]) => void
  setReadings: (v: Reading[] | ((p: Reading[]) => Reading[])) => void
  setMainIdea: (v: string) => void
  setStale: (v: boolean) => void
}

/** Editing panels: grammar/annotate/reactions/main-idea/readings. Each request aborts prior + drops stale-version responses. */
export function usePanels(deps: PanelDeps) {
  const aborts = useRef<Record<string, AbortController>>({})
  const lastResearchRef = useRef(0)
  const readingsBusy = useRef(false)

  function begin(key: string) {
    aborts.current[key]?.abort()
    const ctl = new AbortController(); aborts.current[key] = ctl
    return { ctl, version: deps.versionRef.current.version }
  }
  const fresh = (key: string, ctl: AbortController, version: number) => !ctl.signal.aborted && aborts.current[key] === ctl && deps.versionRef.current.version === version

  async function requestGrammar() {
    if (!deps.editingRef.current || !deps.getEditor()) return
    const tm = deps.plain(); if (!tm.text.trim()) return
    const { ctl, version } = begin('grammar'); deps.setLoad('grammar', true)
    const d = await api.grammar({ text: tm.text }, ctl.signal); recordCall(d?.meta)
    if (!fresh('grammar', ctl, version)) { if (aborts.current['grammar'] === ctl) deps.setLoad('grammar', false); return }
    deps.setLoad('grammar', false)
    if (d?.matches) { const seen = new Set<string>(); const out = d.matches.map((m: GrammarMatch) => ({ ...m, quote: tm.text.slice(m.from, m.to) })).filter((m: GrammarMatch) => { const k = `${m.from}-${m.to}`; if (seen.has(k)) return false; seen.add(k); return true }).filter((m: GrammarMatch) => { const w = (m.quote || '').trim().toLowerCase(); return !deps.dictRef.current.ignore.some(x => x.toLowerCase() === w) && !deps.dictRef.current.spelling.some(x => x.toLowerCase() === w) }); deps.setGrammar(out.slice(0, 40)) }
  }
  async function requestAnnotate() {
    if (!deps.editingRef.current || !deps.getEditor()) return
    const tm = deps.plain(); if (tm.text.trim().length < 20) return
    const { ctl, version } = begin('annotate'); deps.setLoad('annotate', true)
    const d = await api.annotate({ context: deps.appliedRef.current.context, level: deps.appliedRef.current.level, text: tm.text, style: buildStyle(deps.appliedRef.current) }, ctl.signal); recordCall(d?.meta)
    if (!fresh('annotate', ctl, version)) { if (aborts.current['annotate'] === ctl) deps.setLoad('annotate', false); return }
    deps.setLoad('annotate', false)
    let out: Issue[] = d?.issues ? d.issues.map((i: Issue) => ({ ...i, id: deps.nid() })) : (deps.demo ? FALLBACK_ISSUES.map(i => ({ ...i, id: deps.nid() })) : [])
    try {
      const appliedPairs: any[] = getJSON(storageKeys.vocabApplied, [])
      const pref: Record<string, string> = getJSON(storageKeys.preferred, {})
      out = out.filter(i2 => { const q = i2.quote.trim().toLowerCase(); if (!q.includes(' ') && (deps.dictRef.current.ignore.some(x => x.toLowerCase() === q) || deps.dictRef.current.spelling.some(x => x.toLowerCase() === q))) return false; if (appliedPairs.some(ap => ap.to === q && (i2.replacement || '').toLowerCase() === ap.from)) return false; return true })
      out = out.map(i2 => { const pword = pref[i2.quote.trim().toLowerCase()]; if (pword && i2.alternatives?.length) { const idx = i2.alternatives.findIndex(a => a.text.toLowerCase() === pword); if (idx > 0) { const alts = [...i2.alternatives]; const [x] = alts.splice(idx, 1); alts.unshift(x); return { ...i2, alternatives: alts, replacement: alts[0].text } } } return i2 })
    } catch { /* noop */ }
    deps.setIssues(out.slice(0, 40)); deps.setStale(false)
  }
  async function requestReactions() {
    if (!deps.editingRef.current || !deps.getEditor()) return
    const tm = deps.plain(); if (tm.text.trim().length < 20) return
    const { ctl, version } = begin('reactions'); deps.setLoad('reactions', true)
    const d = await api.reactions({ context: deps.appliedRef.current.context, level: deps.appliedRef.current.level, text: tm.text, persona: deps.appliedRef.current.persona, style: buildStyle(deps.appliedRef.current) }, ctl.signal); recordCall(d?.meta)
    if (!fresh('reactions', ctl, version)) { if (aborts.current['reactions'] === ctl) deps.setLoad('reactions', false); return }
    deps.setLoad('reactions', false)
    const out: Reaction[] = d?.reactions ? d.reactions.map((r: Reaction) => ({ ...r, id: deps.nid() })) : (deps.demo ? FALLBACK_REACTIONS.map(r => ({ ...r, id: deps.nid() })) : [])
    deps.setReactions(out.slice(0, 40))
  }
  async function refreshMainIdea() {
    if (!deps.editingRef.current || !deps.getEditor()) return
    const { ctl, version } = begin('main'); deps.setLoad('main', true)
    const d = await api.mainIdea({ context: deps.appliedRef.current.context, level: deps.appliedRef.current.level, text: deps.plain().text, style: buildStyle(deps.appliedRef.current) }, ctl.signal); recordCall(d?.meta)
    if (!fresh('main', ctl, version)) { if (aborts.current['main'] === ctl) deps.setLoad('main', false); return }
    if (d?.main_idea) deps.setMainIdea(d.main_idea)
    deps.setLoad('main', false)
  }
  async function refreshReadings() {
    if (!deps.editingRef.current || !deps.getEditor()) return
    readingsBusy.current = true
    const { ctl, version } = begin('readings'); deps.setLoad('readings', true)
    const d = await api.readings({ context: deps.appliedRef.current.context, level: deps.appliedRef.current.level, text: deps.plain().text }, ctl.signal); recordCall(d?.meta)
    readingsBusy.current = false
    if (!fresh('readings', ctl, version)) { if (aborts.current['readings'] === ctl) deps.setLoad('readings', false); return }
    if (d?.readings?.length) deps.setReadings(d.readings.slice(0, 40)); else if (deps.demo) deps.setReadings(old => old.length ? old : FALLBACK_READINGS)
    deps.setLoad('readings', false); lastResearchRef.current = Date.now()
  }
  async function researchAutoRun() {
    if (!deps.researchAutoRef.current || !deps.editingRef.current || !deps.getEditor() || readingsBusy.current) return
    const txt = deps.plain().text
    if (txt.trim().length < 40 || Date.now() - lastResearchRef.current < 20000) return
    await refreshReadings()
  }
  return { requestGrammar, requestAnnotate, requestReactions, refreshMainIdea, refreshReadings, researchAutoRun }
}
export type UsePanels = ReturnType<typeof usePanels>
