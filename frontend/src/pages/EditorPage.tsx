import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { AnchorDecorations, anchorStore, redraw, syncAnchors, syncGhost, modeStore, lintStore, syncLint } from '../editor/decorations'
import { api } from '../lib/api'
import { docToText, locateQuote, locateOffset } from '../lib/locate'
import type { Anchor, Issue, Reaction, GrammarMatch, Reading, OutlineItem } from '../lib/types'
import { SAMPLE_DOC, SAMPLE_CONTEXT, FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_SUGGESTIONS } from '../lib/fallback'
import { Logo } from '../components/Brand'
import SettingsMenu from '../components/SettingsMenu'
import EditorMenus from '../components/EditorMenus'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { textFragmentUrl } from '../lib/link'
import { sentenceCase } from '../lib/case'
import { LINTER_RULE_LIBRARY, LINT_COLORS, LINT_PRIORITY, type LintResult } from '../lib/rules'
import Diagram, { type DiagramNode } from '../components/Diagram'
import Outline from '../components/Outline'
import SetupWizard from '../components/SetupWizard'
import SourcesLibrary from '../components/SourcesLibrary'
import { sfxSuccess } from '../lib/sfx'
import { TableOfContents, getHierarchicalIndexes, type TableOfContentData } from '@tiptap/extension-table-of-contents'
import { PageBreak, Footnote, collectFootnotes } from '../editor/extensions'
import { exportDocx } from '../lib/docx-export'
import { researchUpload } from '../lib/api'
import type { Fact } from '../lib/types'
import { blip, sfxEnabled, setSfxEnabled } from '../lib/sfx'

const DICTIONS = ['Formal', 'Casual', 'Slang', 'Simple', 'General', 'Academic', 'Technical', 'Buzzwords', 'Bullshitting']
const TONES = ['Serious', 'Humorous', 'Sarcastic', 'Bleak and oppressive', 'Objective', 'Subjective', 'Logical', 'Emotional', 'Intimate', 'Distant', 'Journal', 'Formal conference speech']
const VOICE_PRESETS = ["Ernest Hemingway — minimalist, direct prose, short declarative sentences, no adornment", "F. Scott Fitzgerald (The Great Gatsby) — lyrical, rich with symbolic imagery, long musical sentences", "Gen Z style — emotionally expressive, internet-native, casual, still readable", "Poem / Poetic — exaggerated, lyrical imagery, sometimes meta, rhythm over exposition"]
const RHYTHMS = ['', 'Staccato', 'Varied', 'Flowing']
const TRANSITIONS: Record<string, string[]> = {
  'Introduction / framing': ['To begin with, []', 'Regarding [], ', 'In this context, []', 'This essay argues that []', 'Recent studies suggest that []'],
  'Addition / similarity': ['Furthermore, []', 'Moreover, []', 'Similarly, []', 'Likewise, []', 'In addition, []'],
  'Example / clarification': ['For example, []', 'Specifically, []', 'In other words, []', 'For instance, []', 'Evidence suggests that []'],
  'Emphasis': ['Indeed, []', 'Notably, []', 'Above all, []', 'One key point is []', 'In fact, []'],
  'Cause / effect': ['Therefore, []', 'Consequently, []', 'As a result, []', 'As a consequence, []', 'Due to [], '],
  'Conclusion / summary': ['In conclusion, []', 'Overall, []', 'In summary, []', 'To sum up, []', 'Ultimately, []'],
  'Sequencing / progression': ['First, []', 'Next, []', 'Subsequently, []', 'Finally, []', 'First of all, []', 'In the meantime, []'],
  'Contrast / concession': ['However, []', 'Whereas []', 'Nevertheless, []', 'Although [], ', 'On the contrary, []', 'Despite this, []', 'Conversely, []'],
  'Condition / qualification': ['If [], ', 'Unless [], ', 'Provided that [], ', 'To some extent, []'],
  'Purpose / means': ['To achieve this, []', 'For this purpose, []', 'By doing so, []', 'In order to [], '],
}
export function matchText(query: string, text: string): boolean {
  const q = query.trim().toLowerCase(); if (!q) return true
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  // word-prefix match: every query word prefixes some word in text
  return q.split(/\s+/).every(qw => t.split(/[^a-z]+/).some(tw => tw.startsWith(qw)))
}
export const digitFor = (i: number) => String((i + 1) % 10) // 1..9,0 for 10th
const ASSISTS = ['Hint', 'Phrase', 'Sentence', 'Question']
const PERSONAS = ['Skeptical reader', 'Ordinary reader', 'Expert reader', 'Supportive friend']
export const REACTION_STYLE: Record<string, { color: string; label: string }> = {
  question: { color: '#7C4DFF', label: 'Question' },
  critique: { color: '#E11D63', label: 'Critique' },
  comment: { color: '#0F766E', label: 'Comment' },
  compliment: { color: '#15803D', label: 'Compliment' },
}
export const LANG_STYLE: Record<string, { color: string; label: string }> = {
  grammar: { color: '#D93025', label: 'Grammar' },
  vocabulary: { color: '#B45309', label: 'Word choice' },
  relevance: { color: '#EA580C', label: 'Cohesion' },
}
let uid = 0
const nid = () => `a${++uid}`
export function Spinner() { return <span className="spinner" aria-label="Loading" /> }
export function LoadingDots() { return <span className="load-dots" aria-label="Loading"><span /><span /><span /></span> }
// Tab / stack order, left-to-right as specified: red, yellow, blue, purple
export const LAYER_ORDER: Record<string, number> = { grammar: 0, vocabulary: 1, claim: 2, relevance: 3, reaction: 3 }
export function sortByLayer(anchors: Anchor[]): Anchor[] {
  return [...anchors].sort((a, b) => (LAYER_ORDER[a.kind] ?? 9) - (LAYER_ORDER[b.kind] ?? 9))
}

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  const docKey = demo ? 'byline.doc.demo' : 'byline.doc.app'
  const saved = demo ? null : (() => { try { return JSON.parse(localStorage.getItem(docKey) || 'null') } catch { return null } })()
  const [context, setContext] = useState(demo ? SAMPLE_CONTEXT : (saved?.context || ''))
  const [level, setLevel] = useState(saved?.level || 'General')
  const [voice, setVoice] = useState('')
  const [tones, setTones] = useState<Record<string, 'allow' | 'ban'>>({})
  const [rhythm, setRhythm] = useState(2)
  const [gramVoice, setGramVoice] = useState<'active' | 'passive'>('passive')
  const [clause, setClause] = useState('Subordinated')
  const [density, setDensity] = useState(2)
  const [audLevel, setAudLevel] = useState(3)
  const [audText, setAudText] = useState('')
  const [enabledRules, setEnabledRules] = useState<Set<string>>(() => new Set(LINTER_RULE_LIBRARY.map(r => r.id)))
  const [customRules, setCustomRules] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('byline.customRules') || '[]') } catch { return [] } })
  const [customInput, setCustomInput] = useState('')
  const [lintResults, setLintResults] = useState<LintResult[]>([])
  const [lintGroup, setLintGroup] = useState<LintResult[]>([])
  const [lintIdx, setLintIdx] = useState(0)
  const lintGroupRef = useRef<LintResult[]>([]); lintGroupRef.current = lintGroup
  const [showLibrary, setShowLibrary] = useState(false)
  const [diagram, setDiagram] = useState<{ mermaid: string; caption: string; nodes: DiagramNode[] }>({ mermaid: '', caption: '', nodes: [] })
  const [diagramKind, setDiagramKind] = useState<'mindmap' | 'flowchart'>('mindmap')
  const [facts, setFacts] = useState<Fact[]>(() => { try { return JSON.parse(localStorage.getItem(demo ? 'byline.facts.demo' : 'byline.facts.app') || '[]') } catch { return [] } })
  const [researchUrl, setResearchUrl] = useState('')
  const [researchQ, setResearchQ] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [sfxOn, setSfxOn] = useState(sfxEnabled())
  const [answers, setAnswers] = useState({ goal: '', doc_type: 'essay', audience: '', audience_level: 3, key_points: '', voice_note: '' })
  const [lintEnabled, setLintEnabled] = useState(localStorage.getItem('byline.lintEnabled') === '1')
  const lintEnabledRef = useRef(false); lintEnabledRef.current = lintEnabled
  function toggleLint() {
    setLintEnabled(v => { const n = !v; localStorage.setItem('byline.lintEnabled', n ? '1' : '0'); lintEnabledRef.current = n
      if (!n) { lintAbortRef.current?.abort(); lintStore.results = []; lintStore.ranges = new Map(); lintStore.activeUid = null; setLintGroup([]); if (editor) syncLint(editor) }
      else setLintStatus('Lint on — press Run lint to check.')
      return n })
  }
  const [lintStatus, setLintStatus] = useState('')
  const lintRunRef = useRef<() => void>(() => {})
  const lintAbortRef = useRef<AbortController | null>(null)
  const lintBusyRef = useRef(false)
  const lintIdxRef = useRef(0); lintIdxRef.current = lintIdx
  async function runLint() {
    if (!lintEnabledRef.current) return // lint off by default until toggled on
    if (lintBusyRef.current) return // single-flight: one manual run at a time, never queue auto rerun
    if (!editor || modeStore.mode !== 'editing') return
    const tm = plain(); if (tm.text.trim().length < 20) { setLintStatus('Write at least a sentence, then Run lint.'); return }
    const active = [
      ...LINTER_RULE_LIBRARY.filter(r => enabledRules.has(r.id)).map(r => ({ id: r.id, category: r.color, rule: `${r.name}: ${r.instruction}` })),
      ...customRules.map((t, i) => ({ id: `CUSTOM_${String(i + 1).padStart(2, '0')}`, category: 'violet', rule: t })),
    ]
    lintBusyRef.current = true
    const ctl = new AbortController(); lintAbortRef.current = ctl
    setLoad('lint', true); setLintStatus('Linting…')
    const d = await api.lint({ context: appliedRef.current.context, style: buildStyle(appliedRef.current), text: tm.text, active_rules: active }, ctl.signal)
    lintBusyRef.current = false; setLoad('lint', false)
    if (ctl.signal.aborted) return
    if (!d?.ok) { setLintStatus(`Lint failed — ${String(d?.error || 'unknown backend error').slice(0, 140)}`); return }
    const results: LintResult[] = (d?.lint_results || []).map((r: LintResult) => ({ ...r, uid: `${r.rule_id}:${r.target}:${Math.random().toString(36).slice(2, 7)}` }))
    if (d) setLintStatus(`${results.length} violation${results.length === 1 ? '' : 's'} · ${active.length} rules active`)
    setLintResults(results)
    lintStore.results = results; lintStore.ranges = new Map()
    for (const r of results) { const loc = locateQuote(tm, r.target, r.context); if (loc) lintStore.ranges.set(r.uid!, loc) }
    syncLint(editor)
  }
  lintRunRef.current = runLint
  function toggleRule(id: string) { setEnabledRules(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  function openLintGroup(clicked: LintResult) {
    if (!editor) return
    openRightTab('lint')
    const cr = lintStore.ranges.get(clicked.uid!)
    const group = cr ? lintStore.results.filter((x: LintResult) => { const q = lintStore.ranges.get(x.uid!); return q && q.from < cr.to && cr.from < q.to }) : [clicked]
    const sorted = [...group].sort((a, b) => (LINT_PRIORITY[a.color_category] ?? 9) - (LINT_PRIORITY[b.color_category] ?? 9))
    setLintGroup(sorted); lintGroupRef.current = sorted; setLintIdx(0); lintIdxRef.current = 0
    lintStore.activeUid = sorted[0]?.uid || null; syncLint(editor)
    const c = editor.view.coordsAtPos(editor.state.selection.from); const y = c.bottom + 8
    setPopupPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) })
  }
  function applyLint(r: LintResult) {
    if (!editor) return
    const tm = plain(); const loc = locateQuote(tm, r.target, r.context); if (!loc) return
    editor.chain().setTextSelection(loc).deleteSelection().insertContent(r.suggestion).run()
    const rest = lintStore.results.filter((x: LintResult) => x.uid !== r.uid)
    setLintResults(rest); lintStore.results = rest; syncLint(editor)
    const g = lintGroupRef.current.filter(x => x.uid !== r.uid)
    setLintGroup(g); lintGroupRef.current = g
    if (!g.length) { lintStore.activeUid = null; syncLint(editor) } else { const i = Math.min(lintIdxRef.current, g.length - 1); setLintIdx(i); lintIdxRef.current = i; lintStore.activeUid = g[i].uid!; syncLint(editor) }
    const back = Math.min(writerPosRef.current || editor.state.selection.from, editor.state.doc.content.size); editor.chain().focus().setTextSelection(back).run()
    setLintStatus('Applied — press Run lint to re-check.')
  }
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  function updateSettings(s: AppSettings) { setAppSettings(s); saveSettings(s) }
  useEffect(() => { saveSettings(loadSettings()) }, []) // apply persisted prefs on mount
  useEffect(() => { const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setShowSettings(v => !v) } }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [])
  const [transMenu, setTransMenu] = useState<{ x: number; y: number; h: number; cat: string | null; query: string } | null>(null)
  const transRef = useRef<typeof transMenu>(null); transRef.current = transMenu
  const [assist, setAssist] = useState('Phrase')
  const [persona, setPersona] = useState(PERSONAS[0])
  // left-dock edits are STAGED until Apply; AI calls always read appliedRef
  const [applied, setApplied] = useState(() => ({ context: demo ? SAMPLE_CONTEXT : (saved?.context || ''), level: saved?.level || 'General', voice: '', assist: 'Phrase', persona: PERSONAS[0], tones: {} as Record<string, 'allow' | 'ban'>, rhythm: 2, gramVoice: 'passive' as string, clause: 'Subordinated', density: 2, audLevel: 3, audText: '' }))
  const appliedRef = useRef(applied); appliedRef.current = applied
  const draftObj = () => ({ context, level, voice, assist, persona, tones, rhythm, gramVoice, clause, density, audLevel, audText })
  const dirty = JSON.stringify(applied) !== JSON.stringify(draftObj())
  function buildStyle(A: typeof applied): string {
    const allow = Object.keys(A.tones).filter(k => A.tones[k] === 'allow'); const ban = Object.keys(A.tones).filter(k => A.tones[k] === 'ban')
    return [
      A.voice ? `Voice: ${A.voice}` : '',
      allow.length ? `Tone ALLOWED: ${allow.join(', ')}` : '', ban.length ? `Tone NOT ALLOWED: ${ban.join(', ')}` : '',
      `Sentence rhythm: ${RHYTHMS[A.rhythm]}`,
      A.gramVoice === 'active' ? 'Grammatical voice: strictly ACTIVE (subject performs action)' : 'Grammatical voice: passive permitted',
      `Clause complexity: ${A.clause}`,
      `Information density: ${A.density === 1 ? 'Sparse — one concept per sentence, frequent breaks' : A.density === 3 ? 'Dense — appositives, modifiers, nested details' : 'Balanced'}`,
      `Target audience: ${A.audText || '(unspecified)'}; knowledge level ${A.audLevel}/5. ${A.audLevel <= 2 ? 'Flag undefined jargon, acronyms, assumed technical context.' : A.audLevel >= 4 ? 'Do not explain basic industry concepts.' : 'Briefly ground specialized terms.'}`,
    ].filter(Boolean).join('\n')
  }
  function applySettings() { blip('accept')
    const next = draftObj()
    appliedRef.current = next; setApplied(next)
    requestComplete(); requestAnnotate(); requestReactions(); refreshMainIdea()
  }
  function cycleTone(t: string) { setTones(prev => { const n = { ...prev }; if (!n[t]) n[t] = 'allow'; else if (n[t] === 'allow') n[t] = 'ban'; else delete n[t]; return n }) }
  const suggKey = demo ? 'byline.sugg.demo' : 'byline.sugg.app'
  const savedSugg = (() => { try { return JSON.parse(localStorage.getItem(suggKey) || 'null') } catch { return null } })()
  const [suggestions, setSuggestions] = useState<string[]>(savedSugg?.current || [])
  const [ghostIdx, setGhostIdx] = useState(savedSugg?.idx || 0)
  const [issues, setIssues] = useState<Issue[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [grammar, setGrammar] = useState<GrammarMatch[]>([])
  const factsKey = demo ? 'byline.facts.demo' : 'byline.facts.app'
  const readingsKey = demo ? 'byline.readings.demo' : 'byline.readings.app'
  const [readings, setReadings] = useState<Reading[]>(() => { try { return JSON.parse(localStorage.getItem(demo ? 'byline.readings.demo' : 'byline.readings.app') || '[]') } catch { return [] } })
  const [showSources, setShowSources] = useState(false)
  useEffect(() => { try { localStorage.setItem(factsKey, JSON.stringify(facts)) } catch { /* full/blocked */ } }, [facts, factsKey])
  useEffect(() => { try { localStorage.setItem(readingsKey, JSON.stringify(readings.slice(0, 40))) } catch { /* full/blocked */ } }, [readings, readingsKey])
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [toc, setToc] = useState<TableOfContentData>([])
  const [mainIdea, setMainIdea] = useState('')
  const [selected, setSelected] = useState<Anchor | null>(null)
  const [popupGroup, setPopupGroup] = useState<Anchor[]>([])
  const [popupIdx, setPopupIdx] = useState(0)
  const groupRef = useRef<Anchor[]>([]); groupRef.current = popupGroup
  const idxRef = useRef(0); idxRef.current = popupIdx
  const pinnedRef = useRef(false)
  const prevPosRef = useRef(0)
  const popupHoverRef = useRef(false)
  const [popupPos, setPopupPos] = useState({ x: 200, y: 200, h: 600 })
  // ALWAYS below current cursor (writer caret), never above / at mouse / at dock
  function belowCursor() {
    if (!editor) return { x: 200, y: 200, h: 600 }
    const c = editor.view.coordsAtPos(editor.state.selection.from)
    const y = c.bottom + 8
    return { x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) }
  }
  const [stale, setStale] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('byline.metrics.v3') || '{"offered":0,"accepted":0,"dismissed":0,"msTotal":0,"msCount":0}') } catch { return { offered: 0, accepted: 0, dismissed: 0, msTotal: 0, msCount: 0 } } })
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [synPos, setSynPos] = useState({ x: 200, y: 200, h: 400 })
  const [synRange, setSynRange] = useState<{ from: number; to: number } | null>(null)
  const [suggHistory, setSuggHistory] = useState<string[]>(savedSugg?.history || [])
  useEffect(() => { localStorage.setItem(suggKey, JSON.stringify({ current: suggestions, history: suggHistory, idx: ghostIdx })) }, [suggestions, suggHistory, ghostIdx, suggKey])
  type Mode = 'drafting' | 'editing'
  const [mode, setMode] = useState<Mode>(() => { const v = localStorage.getItem('byline.mode'); return v === 'editing' ? 'editing' : 'drafting' })
  modeStore.mode = mode
  const editing = mode === 'editing'
  const editingRef = useRef(true); editingRef.current = editing
  function switchMode(m: Mode) { blip('mode')
    setMode(m); modeStore.mode = m; localStorage.setItem('byline.mode', m)
    if (m === 'drafting') setRightTab('suggest')
    if (m !== 'editing') lintAbortRef.current?.abort()
    if (m === 'drafting') {
      // ghost only: kill editing-AI timers/popups/underlines, keep suggestions alive
      refs.current.abort?.abort(); clearTimeout(refs.current.timers.g); clearTimeout(refs.current.timers.s)
      anchorStore.anchors = []; anchorStore.ranges = new Map(); anchorStore.linkedId = null
      setPopupGroup([]); setSelected(null)
      if (editor) { syncAnchors(editor); redraw(editor) }
    } else {
      // editing: restore anchors + fresh checks
      setTimeout(() => { rebuildAnchors(); requestGrammar(); requestAnnotate(); requestReactions() }, 50)
    }
    setTimeout(() => { if (refs.current.sugg.length) showGhost(refs.current.idx || 0) }, 80)
  }
  const [suggPos, setSuggPos] = useState({ x: 200, y: 300, h: 500 })
  const synRef = useRef<string[]>([]); synRef.current = synonyms
  const synRangeRef = useRef<{ from: number; to: number } | null>(null)
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const setLoad = (k: string, v: boolean) => setLoading(prev => ({ ...prev, [k]: v }))
  const anyLoading = Object.values(loading).some(Boolean)
  const prevLoadingRef = useRef(false)
  useEffect(() => { if (prevLoadingRef.current && !anyLoading) blip('done'); prevLoadingRef.current = anyLoading }, [anyLoading])
  const [leftOpen, setLeftOpen] = useState(localStorage.getItem('byline.leftOpen') === '1')
  const [rightOpen, setRightOpen] = useState(localStorage.getItem('byline.rightOpen') === '1')
  type LeftTab = 'write' | 'style' | 'outline'
  type RightTab = 'language' | 'lint' | 'reader' | 'sources' | 'suggest'
  const [leftTab, setLeftTab] = useState<LeftTab>('write')
  const [rightTab, setRightTab] = useState<RightTab>('language')
  function openRightTab(t: RightTab) { setRightTab(t); if (!rightOpen) { setRightOpen(true); localStorage.setItem('byline.rightOpen', '1') } }
  const popupRef = useRef<HTMLDivElement>(null)
  const writerPosRef = useRef(0)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })
  // user dictionary exceptions (LT manual: spelling.txt vs ignore.txt), persisted locally
  const [dict, setDict] = useState<{ spelling: string[]; ignore: string[] }>(() => { try { return JSON.parse(localStorage.getItem('byline.dict.v1') || '{"spelling":[],"ignore":[]}') } catch { return { spelling: [], ignore: [] } } })
  const dictRef = useRef(dict); dictRef.current = dict
  function saveDict(n: { spelling: string[]; ignore: string[] }) { dictRef.current = n; setDict(n); localStorage.setItem('byline.dict.v1', JSON.stringify(n)) }
  function exceptWord(list: 'spelling' | 'ignore', word: string) {
    const w = word.trim(); if (!w || w.includes(' ')) return
    const n = { spelling: [...dictRef.current.spelling], ignore: [...dictRef.current.ignore] }
    if (!n[list].some(x => x.toLowerCase() === w.toLowerCase())) n[list].push(w)
    saveDict(n)
    setGrammar(xs => xs.filter(g => (g.quote || '').toLowerCase() !== w.toLowerCase())); setIssues(xs => xs.filter(i => i.quote.trim().toLowerCase() !== w.toLowerCase()))
    closePopup()
  }
  function exportAdditions() {
    const text = dictRef.current.spelling.join('\n') + (dictRef.current.spelling.length ? '\n' : '')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'en_spelling_additions.txt'; a.click()
  }
  const [, setTick] = useState(0)
  const selectedRef = useRef<Anchor | null>(null); selectedRef.current = selected

  const refs = useRef({ version: 0, abort: null as AbortController | null, sugg: [] as string[], idx: 0, acceptedVersion: -1, timers: {} as any, fns: {} as any })
  useEffect(() => { refs.current.sugg = suggestions }, [suggestions])
  useEffect(() => { refs.current.idx = ghostIdx }, [ghostIdx])

  const record = (patch: any) => setMetrics((m: any) => { const n = { ...m }; for (const k in patch) n[k] = typeof patch[k] === 'function' ? patch[k](m[k] || 0) : patch[k]; localStorage.setItem('byline.metrics.v3', JSON.stringify(n)); return n })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      AnchorDecorations, Highlight, TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount,
      PageBreak, Footnote,
      TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: (data) => setToc([...data]) }),
    ],
    editorProps: { attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' } },
    content: demo ? SAMPLE_DOC : (saved?.html || '<p></p>'),
    onSelectionUpdate: ({ editor }) => { setTick(t => t + 1); const pos = editor.state.selection.from; const movedBack = pos < prevPosRef.current; prevPosRef.current = pos; if (movedBack) (refs.current as any).suppressAuto = true; if (movedBack) { if (groupRef.current.length) refs.current.fns.closePopup?.(); if (anchorStore.ghost) refs.current.fns.clearGhost?.() } else if (anchorStore.ghost && pos !== anchorStore.ghostPos) refs.current.fns.clearGhost?.() },
    onUpdate: ({ editor }) => {
      if (groupRef.current.length) refs.current.fns.closePopup?.()
      try { setCounts({ words: (editor.storage as any).characterCount.words(), chars: (editor.storage as any).characterCount.characters() }) } catch { /* noop */ }
      refs.current.version++; refs.current.abort?.abort(); setStale(true)
      localStorage.setItem(docKey, JSON.stringify({ html: editor.getHTML(), context, level }))
      const t = refs.current.timers
      clearTimeout(t.c); clearTimeout(t.g); clearTimeout(t.s)
      t.c = setTimeout(() => refs.current.fns.complete?.(true), 500)
      t.g = setTimeout(() => refs.current.fns.grammar?.(), 900)
      t.s = setTimeout(() => { refs.current.fns.annotate?.(); refs.current.fns.reactions?.() }, 1400)
      // lint: manual only — Run lint button press, never on edit/mode/toggle
    },
  })

  const plain = useCallback(() => editor ? docToText(editor) : { text: '', map: [] as number[] }, [editor])

  const rebuildAnchors = useCallback(() => {
    if (!editor) return
    const tm = docToText(editor); const anchors: Anchor[] = []
    grammar.filter(g => !g.stale).forEach((g, i) => anchors.push({ id: `g${i}-${g.from}`, kind: 'grammar', tone: 'grammar', quote: tm.text.slice(g.from, g.to), context: tm.text.slice(Math.max(0, g.from - 30), g.to + 30), title: 'Grammar', detail: g.message, replacement: g.replacements[0] || '' }))
    issues.filter(it => !it.stale).forEach(it => anchors.push({ id: it.id || nid(), kind: it.type === 'vocabulary' ? 'vocabulary' : 'relevance', tone: it.type, quote: it.quote, context: it.context, title: it.type === 'vocabulary' ? 'Word choice' : 'Cohesion', detail: it.reason, replacement: it.replacement, alternatives: it.alternatives }))
    reactions.filter(r => !r.stale).forEach(r => anchors.push({ id: r.id || nid(), kind: 'reaction', tone: r.kind, quote: r.quote, context: r.context, title: `Reader · ${REACTION_STYLE[r.kind]?.label || r.kind}`, detail: r.text }))
    readings.filter(r => !r.stale).forEach((r, i) => { if (r.claim_quote) anchors.push({ id: `c${i}`, kind: 'claim', quote: r.claim_quote, context: r.claim_context, title: `Source · ${r.label}`, detail: `${r.title} — ${r.why}`, url: r.url, excerpt: r.excerpt }) })
    anchorStore.anchors = anchors; anchorStore.ranges = new Map()
    for (const a of anchors) { const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r) }
    syncAnchors(editor)
  }, [editor, grammar, issues, reactions, readings])
  useEffect(() => { if (savedSugg?.current?.length && editor) { refs.current.sugg = savedSugg.current; setTimeout(() => showGhost(savedSugg.idx || 0), 300) } }, [editor]) // eslint-disable-line
  useEffect(() => { if (editing) rebuildAnchors(); else { anchorStore.anchors = []; anchorStore.ranges = new Map(); if (editor) syncAnchors(editor) } }, [rebuildAnchors, editing]) // eslint-disable-line
  useEffect(() => { if (!showLibrary) return; const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLibrary(false) }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [showLibrary])

  function showGhost(idx: number) {
    if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from; const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    anchorStore.ghost = (before && !/\s/.test(before) ? ' ' : '') + s; anchorStore.ghostPos = pos; syncGhost(editor)
  }
  function archiveSuggestions(list: string[]) { if (list.length) setSuggHistory(h => [...list.filter(s => !h.includes(s)), ...h].slice(0, 30)) }
  function clearGhost(moveToHistory = true) { if (moveToHistory && refs.current.sugg.length) { record({ dismissed: (v: number) => v + 1 }); archiveSuggestions(refs.current.sugg) } anchorStore.ghost = ''; refs.current.sugg = []; setSuggestions([]); if (editor) syncGhost(editor) }
  function acceptGhost(idx: number) { blip('accept')
    if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from; const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    editor.chain().focus().insertContent((before && !/\s/.test(before) ? ' ' : '') + s).run()
    try { const ds = JSON.parse(localStorage.getItem('byline.dataset') || '[]'); ds.push({ context: appliedRef.current.context, before: editor.state.doc.textBetween(Math.max(0, pos - 400), pos, '\n\n'), accepted: s, assist: appliedRef.current.assist, ts: Date.now() }); localStorage.setItem('byline.dataset', JSON.stringify(ds.slice(-1000))) } catch { /* noop */ }
    refs.current.acceptedVersion = refs.current.version // after insert transaction
    record({ accepted: (v: number) => v + 1 }); archiveSuggestions(refs.current.sugg.filter(x => x !== s)); clearGhost(false)
  }
  function closePopup() { setSelected(null); setPopupGroup([]); setPopupIdx(0); groupRef.current = []; pinnedRef.current = false; anchorStore.linkedId = null; if (editor) redraw(editor) }
  function anchorsAt(a: Anchor): Anchor[] {
    const r = anchorStore.ranges.get(a.id)
    if (!r) return [a]
    const hit = anchorStore.anchors.filter(x => { const q = anchorStore.ranges.get(x.id); return q && q.from < r.to && r.from < q.to })
    return sortByLayer(hit.length ? hit : [a])
  }
  function openGroup(group: Anchor[], x: number, y: number, start = 0, pinned = false) { blip('open')
    if (!group.length) return
    if (editor) writerPosRef.current = editor.state.selection.from
    const idx = Math.min(start, group.length - 1); const active = group[idx]
    pinnedRef.current = pinned
    setPopupGroup(group); groupRef.current = group; setPopupIdx(idx); idxRef.current = idx
    setSelected(active); anchorStore.linkedId = active.id
    setPopupPos(belowCursor())
    if (editor) redraw(editor)
  }
  function openAnchor(a: Anchor, x: number, y: number) { openGroup(anchorsAt(a), x, y, 0, true) }
  function setActiveIdx(idx: number) {
    const g = groupRef.current; if (!g[idx]) return
    setPopupIdx(idx); idxRef.current = idx; setSelected(g[idx]); anchorStore.linkedId = g[idx].id; if (editor) redraw(editor)
  }
  // Tab: apply active layer if fixable (in red>yellow>blue>purple order), else advance to next layer.
  function tabPopup(): boolean {
    const g = groupRef.current; if (!g.length) return false
    const active = g[idxRef.current]; if (!active) return false
    if (active.replacement) { applyAnchor(active); return true }
    if (idxRef.current + 1 < g.length) { setActiveIdx(idxRef.current + 1); return true }
    closePopup(); return true
  }
  function highlightAnchor(a: Anchor | null) { anchorStore.linkedId = a?.id || null; if (editor) redraw(editor) }

  function atBlockEnd(): boolean {
    if (!editor) return false
    const { $from } = editor.state.selection
    const end = $from.end($from.depth)
    return !editor.state.doc.textBetween(editor.state.selection.from, end).trim()
  }
  async function requestComplete(auto = false) {
    if (transRef.current) return // menu overrides ghost
    if (!editor || refs.current.version === refs.current.acceptedVersion) return
    if (auto && (refs.current as any).suppressAuto) return // went back to revise: no auto popup until Suggest pressed
    if (!auto) (refs.current as any).suppressAuto = false
    if (auto && !atBlockEnd()) return // mid-sentence / between sentences: only on Suggest press
    const pos = editor.state.selection.from
    const before = editor.state.doc.textBetween(0, pos, '\n\n'); const after = editor.state.doc.textBetween(pos, editor.state.doc.content.size, '\n\n')
    if (!before.trim()) return
    const ctl = new AbortController(); refs.current.abort = ctl; const t0 = performance.now(); setLoad('complete', true)
    const A = appliedRef.current; const d = await api.complete({ context: A.context, level: A.level, voice: A.voice, style: buildStyle(A), assist_level: A.assist, before: before.slice(-1200), after: after.slice(0, 400), version: refs.current.version }, ctl.signal)
    const sugg: string[] = (d?.suggestions?.length ? d.suggestions : (demo ? FALLBACK_SUGGESTIONS : [])).slice(0, 3).map((x: string) => sentenceCase(before, x)); setLoad('complete', false)
    if (!sugg.length || ctl.signal.aborted) return
    archiveSuggestions(refs.current.sugg.filter(s => !sugg.includes(s)))
    refs.current.sugg = sugg; setSuggestions(sugg); setGhostIdx(0); refs.current.idx = 0; blip('done')
    record({ offered: (v: number) => v + 1, msTotal: (v: number) => v + Math.round(performance.now() - t0), msCount: (v: number) => v + 1 })
    const pos2 = editor.state.selection.from; const b2 = editor.state.doc.textBetween(Math.max(0, pos2 - 1), pos2)
    anchorStore.ghost = (b2 && !/\s/.test(b2) ? ' ' : '') + sugg[0]; anchorStore.ghostPos = pos2; syncGhost(editor)
    const c = editor.view.coordsAtPos(pos2); const y = c.bottom + 8; setSuggPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) })
    redraw(editor)
  }
  async function requestGrammar() { if (!editingRef.current || !editor) return; const tm = plain(); if (!tm.text.trim()) return; setLoad('grammar', true); const d = await api.grammar({ text: tm.text }); setLoad('grammar', false); if (d?.matches) { const seen = new Set<string>(); const fresh = d.matches.map((m: GrammarMatch) => ({ ...m, quote: tm.text.slice(m.from, m.to) })).filter((m: GrammarMatch) => { const k = `${m.from}-${m.to}`; if (seen.has(k)) return false; seen.add(k); return true }).filter((m: GrammarMatch) => { const w = (m.quote || '').trim().toLowerCase(); return !dictRef.current.ignore.some(x => x.toLowerCase() === w) && !dictRef.current.spelling.some(x => x.toLowerCase() === w) }); setGrammar(old => [...fresh, ...old.filter(o => !fresh.some((m: GrammarMatch) => m.from === o.from && m.to === o.to)).map(o => ({ ...o, stale: true }))].slice(0, 40)) } }
  async function requestAnnotate() { if (!editingRef.current || !editor) return; const tm = plain(); if (tm.text.trim().length < 20) return; setLoad('annotate', true); const d = await api.annotate({ context: appliedRef.current.context, level: appliedRef.current.level, text: tm.text, style: buildStyle(appliedRef.current) }); setLoad('annotate', false); let fresh: Issue[] = d?.issues ? d.issues.map((i: Issue) => ({ ...i, id: nid() })) : (demo ? FALLBACK_ISSUES.map(i => ({ ...i, id: nid() })) : []);
    try {
      const appliedPairs: any[] = JSON.parse(localStorage.getItem('byline.vocabApplied') || '[]')
      const pref: Record<string, string> = JSON.parse(localStorage.getItem('byline.preferred') || '{}')
      fresh = fresh.filter(i2 => { const q = i2.quote.trim().toLowerCase(); if (!q.includes(' ') && (dictRef.current.ignore.some(x => x.toLowerCase() === q) || dictRef.current.spelling.some(x => x.toLowerCase() === q))) return false; if (appliedPairs.some(ap => ap.to === q && (i2.replacement || '').toLowerCase() === ap.from)) return false; return true })
      fresh = fresh.map(i2 => { const pword = pref[i2.quote.trim().toLowerCase()]; if (pword && i2.alternatives?.length) { const idx = i2.alternatives.findIndex(a => a.text.toLowerCase() === pword); if (idx > 0) { const alts = [...i2.alternatives]; const [x] = alts.splice(idx, 1); alts.unshift(x); return { ...i2, alternatives: alts, replacement: alts[0].text } } } return i2 })
    } catch { /* noop */ } setIssues(old => [...fresh, ...old.filter(o => !fresh.some(f => f.quote === o.quote && f.type === o.type)).map(o => ({ ...o, stale: true }))].slice(0, 40)); setStale(false) }
  async function requestReactions() { if (!editingRef.current || !editor) return; const tm = plain(); if (tm.text.trim().length < 20) return; setLoad('reactions', true); const d = await api.reactions({ context: appliedRef.current.context, level: appliedRef.current.level, text: tm.text, persona: appliedRef.current.persona, style: buildStyle(appliedRef.current) }); setLoad('reactions', false); const fresh: Reaction[] = d?.reactions ? d.reactions.map((r: Reaction) => ({ ...r, id: nid() })) : (demo ? FALLBACK_REACTIONS.map(r => ({ ...r, id: nid() })) : []); setReactions(old => [...fresh, ...old.filter(o => !fresh.some(f => f.quote === o.quote && f.kind === o.kind)).map(o => ({ ...o, stale: true }))].slice(0, 40)) }
  async function refreshMainIdea() { if (!editingRef.current || !editor) return; setLoad('main', true); const d = await api.mainIdea({ context: appliedRef.current.context, level: appliedRef.current.level, text: plain().text, style: buildStyle(appliedRef.current) }); if (d?.main_idea) setMainIdea(d.main_idea); setLoad('main', false) }
  async function refreshReadings() { if (!editingRef.current || !editor) return; setLoad('readings', true); const d = await api.readings({ context: appliedRef.current.context, level: appliedRef.current.level, text: plain().text }); if (d?.readings) setReadings(old => [...d.readings, ...old.map(o => ({ ...o, stale: true }))].slice(0, 40)); setLoad('readings', false) }
  async function refreshOutline() { if (!editingRef.current || !editor) return; setLoad('outline', true); const d = await api.outline({ text: plain().text }); if (d?.outline) setOutline(d.outline); setLoad('outline', false) }
  function rerunAll() { requestComplete(); requestGrammar(); requestAnnotate(); requestReactions(); refreshMainIdea(); refreshOutline() }
  refs.current.fns = { complete: requestComplete, grammar: requestGrammar, annotate: requestAnnotate, reactions: requestReactions, accept: acceptGhost, clearGhost, showGhost, closePopup }

  // capture-phase keyboard + click: survives ProseMirror defaults, no stale closures via refs
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.code === 'Space') { e.preventDefault(); e.stopPropagation(); refs.current.fns.complete?.(); return }
      if (mod && e.key === '/') { e.preventDefault(); e.stopPropagation(); openTransMenu(); return }
      if (transRef.current) {
        const m = transRef.current
        const cats = Object.keys(TRANSITIONS).filter(c => matchText(m.query, c) || TRANSITIONS[c].some(t => matchText(m.query, t)))
        const tpls = m.cat ? TRANSITIONS[m.cat].filter(t => matchText(m.query, t)) : []
        const pickCat = (c: string) => { blip('select'); const n = { ...m, cat: c, query: '' }; transRef.current = n; setTransMenu(n) }
        const pickTpl = (t: string) => { transRef.current = null; setTransMenu(null); insertTransition(t) }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); transRef.current = null; setTransMenu(null); return }
        if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); const n = { ...m, query: m.query.slice(0, -1) }; transRef.current = n; setTransMenu(n); return }
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (m.cat) { if (tpls[0]) pickTpl(tpls[0]) } else if (cats[0]) pickCat(cats[0]); return }
        if (/^[0-9]$/.test(e.key) && !mod) { e.preventDefault(); e.stopPropagation(); const idx = e.key === '0' ? 9 : Number(e.key) - 1; if (m.cat) { if (tpls[idx]) pickTpl(tpls[idx]) } else if (cats[idx]) pickCat(cats[idx]); return }
        if (e.key.length === 1 && !mod) { e.preventDefault(); e.stopPropagation(); const n = { ...m, query: m.query + e.key }; transRef.current = n; setTransMenu(n); return }
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); return }
        return
      }
      if (lintGroupRef.current.length) {
        if (e.key === 'Escape') { e.preventDefault(); setLintGroup([]); lintStore.activeUid = null; syncLint(editor); return }
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const g = lintGroupRef.current; const a = g[lintIdxRef.current]; if (a?.suggestion) applyLint(a); else if (lintIdxRef.current + 1 < g.length) { const n = lintIdxRef.current + 1; setLintIdx(n); lintIdxRef.current = n; lintStore.activeUid = g[n].uid!; syncLint(editor) } return }
      }
      if (selectedRef.current || groupRef.current.length) {
        if (e.key === 'Escape') { e.preventDefault(); closePopup(); return }
        if (/^[1-9]$/.test(e.key) && selectedRef.current?.alternatives?.length) { const alt = selectedRef.current.alternatives[Number(e.key) - 1]; if (alt) { e.preventDefault(); e.stopPropagation(); applyAnchor(selectedRef.current, alt.text); return } }
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); tabPopup(); return }
      }
      if (synRef.current.length) {
        if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[0]); return }
        if (['1', '2', '3'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); replaceWord(synRef.current[Number(e.key) - 1]); return }
        if (e.key === 'Escape') { e.preventDefault(); setSynonyms([]); return }
      }
      const sugg = refs.current.sugg
      if (sugg.length) {
        if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); acceptGhost(refs.current.idx); return }
        if (['1', '2', '3'].includes(e.key) && !mod) { e.preventDefault(); e.stopPropagation(); acceptGhost(Number(e.key) - 1); return }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const n = (refs.current.idx + (e.key === 'ArrowDown' ? 1 : sugg.length - 1)) % sugg.length; refs.current.idx = n; setGhostIdx(n); showGhost(n); return }
        if (e.key === 'Escape') { e.preventDefault(); clearGhost(); return }
        if (e.key.length === 1 && !mod) clearGhost()
      } else if (e.key === 'Escape' && selectedRef.current) { closePopup() }
    }
    const onClick = (e: MouseEvent) => {
      const lt = (e.target as HTMLElement).closest?.('[data-lint-uid]') as HTMLElement | null
      if (lt) { const r = lintStore.results.find((x: LintResult) => x.uid === lt.dataset.lintUid); if (r) { if (editor) writerPosRef.current = editor.state.selection.from; openLintGroup(r) } return }
      const t = (e.target as HTMLElement).closest?.('[data-anchor-id]') as HTMLElement | null
      if (!t) return
      const a = anchorStore.anchors.find(x => x.id === t.dataset.anchorId)
      if (a) { const r = t.getBoundingClientRect(); openAnchor(a, r.left, r.bottom + 8) }
    }
    const onOver = (e: MouseEvent) => {
      // hover = soft highlight ONLY; popups open on explicit click, never while writing
      const t = (e.target as HTMLElement).closest?.('[data-anchor-id]') as HTMLElement | null
      if (!t) return
      const a = anchorStore.anchors.find(x => x.id === t.dataset.anchorId); if (!a) return
      if (!groupRef.current.length) highlightAnchor(a)
    }
    const onLeave = () => { if (!groupRef.current.length) highlightAnchor(null) }
    const onDocDown = (e: MouseEvent) => { if (selectedRef.current && popupRef.current && !popupRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-anchor-id]')) closePopup() }
    dom.addEventListener('keydown', onKey, true)
    dom.addEventListener('click', onClick, true)
    dom.addEventListener('mouseover', onOver, true)
    dom.addEventListener('mouseleave', onLeave)
    document.addEventListener('mousedown', onDocDown)
    return () => { dom.removeEventListener('keydown', onKey, true); dom.removeEventListener('click', onClick, true); dom.removeEventListener('mouseover', onOver, true); dom.removeEventListener('mouseleave', onLeave); document.removeEventListener('mousedown', onDocDown) }
  }, [editor]) // eslint-disable-line
  useEffect(() => { api.health().then(setStatus); if (demo) setTimeout(() => { requestAnnotate(); requestReactions(); requestGrammar() }, 600) }, [editor]) // eslint-disable-line

  function applyAnchor(a: Anchor, override?: string) {
    if (!editor) return
    if (override) a = { ...a, replacement: override }
    if (a.kind === 'vocabulary' && a.replacement) {
      try { const pairs = JSON.parse(localStorage.getItem('byline.vocabApplied') || '[]'); pairs.push({ from: a.quote.trim().toLowerCase(), to: a.replacement.trim().toLowerCase(), ts: Date.now() }); localStorage.setItem('byline.vocabApplied', JSON.stringify(pairs.slice(-200)))
        const pref = JSON.parse(localStorage.getItem('byline.preferred') || '{}'); pref[a.quote.trim().toLowerCase()] = a.replacement.trim().toLowerCase(); localStorage.setItem('byline.preferred', JSON.stringify(pref)) } catch { /* noop */ }
      blip('accept')
    }
    const rep = a.replacement || ''; if (!rep) { tabAdvanceOnly(); return }
    const tm = plain(); const r = locateQuote(tm, a.quote, a.context); if (!r) { removeFromGroup(a); return }
    editor.chain().setTextSelection(r).deleteSelection().insertContent(rep).run()
    setIssues(xs => xs.filter(i => !(i.quote === a.quote && !i.stale))); setGrammar(xs => xs.filter(g => tm.text.slice(g.from, g.to) !== a.quote))
    removeFromGroup(a)
    // return caret to where writer was typing
    const back = Math.min(writerPosRef.current || editor.state.selection.from, editor.state.doc.content.size)
    editor.chain().focus().setTextSelection(back).run()
  }
  function tabAdvanceOnly() { if (idxRef.current + 1 < groupRef.current.length) setActiveIdx(idxRef.current + 1); else closePopup() }
  function removeFromGroup(a: Anchor) {
    const g = groupRef.current.filter(x => x.id !== a.id)
    if (!g.length) { closePopup(); return }
    const idx = Math.min(idxRef.current, g.length - 1)
    setPopupGroup(g); groupRef.current = g; setPopupIdx(idx); idxRef.current = idx; setSelected(g[idx]); anchorStore.linkedId = g[idx].id; if (editor) redraw(editor)
  }
  function applySelected() { const a = selectedRef.current; if (a) applyAnchor(a) }
  function focusAnchor(a: Anchor) { if (!editor) return; openRightTab(a.kind === 'reaction' ? 'reader' : a.kind === 'claim' ? 'sources' : 'language'); const tm = plain(); const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r); const pos = editor.view.coordsAtPos(r?.from || editor.state.selection.from); const group = anchorsAt(a); openGroup(group, pos.left, pos.bottom + 6, Math.max(0, group.findIndex(g => g.id === a.id)), true) }
  async function onDblClick(e: any) {
    if (!editor) return
    const { from, to } = editor.state.selection; const word = editor.state.doc.textBetween(from, to).trim()
    if (!word || word.includes(' ')) return
    const tm = plain(); const sent = tm.text.split(/(?<=[.!?])\s/).find(s => s.includes(word)) || tm.text.slice(0, 200)
    const cc = editor.view.coordsAtPos(from); const yy = cc.bottom + 8; setSynPos({ x: Math.max(8, Math.min(cc.left, innerWidth - 380)), y: yy, h: Math.max(170, innerHeight - yy - 12) })
    setSynRange({ from, to }); synRangeRef.current = { from, to }
    if (!editingRef.current) return
    setLoad('synonyms', true); const d = await api.synonyms({ context: appliedRef.current.context, level: appliedRef.current.level, word, sentence: sent, style: buildStyle(appliedRef.current) }); setLoad('synonyms', false); if (d?.synonyms) { setSynonyms(d.synonyms.slice(0, 3)); blip('done') }
  }
  function replaceWord(w: string) { if (!editor || !w) return; const r = synRangeRef.current; if (r) editor.chain().focus().setTextSelection(r).deleteSelection().insertContent(w).run(); else editor.chain().focus().deleteSelection().insertContent(w).run(); setSynonyms([]); synRangeRef.current = null }
  function tocItems(): { level: number; text: string; child: number }[] {
    if (!editor) return []
    const out: { level: number; text: string; child: number }[] = []
    editor.state.doc.forEach((node, _off, i) => { if (node.type.name === 'heading') out.push({ level: node.attrs.level || 1, text: node.textContent, child: i }) })
    return out
  }
  function moveSection(srcSeg: number, dstSeg: number) {
    if (!editor || srcSeg === dstSeg) return
    const json: any = editor.getJSON(); const content: any[] = json.content || []
    const heads = tocItems(); if (!heads[srcSeg] || !heads[dstSeg]) return
    const starts = heads.map(h => h.child); const preface = content.slice(0, starts[0])
    const segs = starts.map((st, i) => content.slice(st, starts[i + 1] ?? content.length))
    const [moved] = segs.splice(srcSeg, 1); segs.splice(dstSeg, 0, moved)
    editor.commands.setContent({ ...json, content: [...preface, ...segs.flat()] })
  }
  async function doExportDocx() {
    if (!editor) return
    setLoad('docx', true)
    try { await exportDocx(editor.getJSON(), { title: 'Untitled document', header: '', footer: '', pageNumbers: false }) }
    catch (e) { alert(`DOCX export failed: ${e instanceof Error ? e.message : e}`) }
    setLoad('docx', false)
  }
  function doExportHtml() {
    if (!editor) return
    const b = new Blob([editor.getHTML()], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'byline.html'; a.click()
  }
  function openTransMenu() {
    if (!editor) return
    if (transRef.current) { transRef.current = null; setTransMenu(null); return }
    clearGhost(false)
    const c = editor.view.coordsAtPos(editor.state.selection.from); const y = c.bottom + 8
    const m = { x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12), cat: null as string | null, query: '' }
    transRef.current = m; setTransMenu(m)
  }
  function insertTransition(tpl: string) { blip('accept')
    if (!editor) return
    const at = editor.state.selection.from; const blank = tpl.indexOf('[]')
    const prev = editor.state.doc.textBetween(Math.max(0, at - 1), at); const prefix = prev && !/\s/.test(prev) ? ' ' : ''
    editor.chain().focus().insertContent(prefix + tpl.replace('[]', '')).run()
    if (blank >= 0) editor.chain().setTextSelection(at + prefix.length + blank).run()
    setTransMenu(null)
  }
  async function refreshDiagram() {
    if (!editor) return; setLoad('diagram', true)
    const d = await api.diagram({ context: appliedRef.current.context, text: plain().text, kind: diagramKind })
    if (d?.ok) { setDiagram({ mermaid: d.mermaid, caption: d.caption, nodes: d.nodes || [] }); if (d.caption) setMainIdea(d.caption) }
    setLoad('diagram', false)
  }
  async function runResearch(file?: File) {
    setLoad('research', true)
    const d = file ? await researchUpload(file, researchQ || 'Extract key facts for my writing') : await api.research({ url: researchUrl, question: researchQ || 'Extract the key facts relevant to my writing, with sources.' })
    if (d?.ok && d.facts?.length) { setFacts(old => [...d.facts, ...old].filter((f, i, a) => a.findIndex(x => x.fact === f.fact && x.url === f.url) === i).slice(0, 40)) }
    else if (d?.error) alert(`Research failed: ${d.error}`)
    setLoad('research', false)
  }
  async function generateFromSurvey() {
    setLoad('outlinegen', true)
    const d = await api.outlineGenerate({ answers })
    setLoad('outlinegen', false)
    if (!d?.ok) return false
    const summary = d.context_summary || answers.goal
    const tonesNext: Record<string, 'allow' | 'ban'> = Array.isArray(d.tones) ? Object.fromEntries(d.tones.filter((t: string) => TONES.includes(t)).map((t: string) => [t, 'allow' as const])) : tones
    const next0 = {
      level: DICTIONS.includes(d.diction) ? d.diction : level, voice: typeof d.voice === 'string' && d.voice ? d.voice : voice, tones: tonesNext,
      rhythm: [1, 2, 3].includes(d.rhythm) ? d.rhythm : rhythm, gramVoice: d.gram_voice === 'active' ? 'active' as const : d.gram_voice === 'passive' ? 'passive' as const : gramVoice,
      clause: ['Simple', 'Coordinated', 'Subordinated'].includes(d.clause) ? d.clause : clause, density: [1, 2, 3].includes(d.density) ? d.density : density,
      audText: d.audience_text || audText, audLevel: d.audience_level || audLevel,
    }
    setContext(summary); setLevel(next0.level); setVoice(next0.voice); setTones(tonesNext); setRhythm(next0.rhythm); setGramVoice(next0.gramVoice as any); setClause(next0.clause); setDensity(next0.density); setAudText(next0.audText); setAudLevel(next0.audLevel)
    const html = (d.outline || []).map((o: any, i: number) => `<h${i === 0 ? 1 : 2}>${o.heading}</h${i === 0 ? 1 : 2}><p><em>${o.purpose || ''}</em></p>${(o.points || []).map((pt: string) => `<p>${pt}</p>`).join('')}`).join('')
    if (editor) { const empty = plain().text.trim().length < 3; if (empty) editor.commands.setContent(html || '<p></p>'); else editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent(html).run() }
    const next = { ...draftObj(), context: summary, ...next0 }
    appliedRef.current = next as any; setApplied(next as any); setWizardOpen(false)
    setTimeout(() => { requestComplete(); requestAnnotate(); requestReactions(); refreshMainIdea() }, 80); sfxSuccess(); return true
  }
  async function exportDataset() {
    let pairs: any[] = []; try { pairs = JSON.parse(localStorage.getItem('byline.dataset') || '[]') } catch { /* noop */ }
    if (!pairs.length) { alert('No accepted suggestions captured yet. Accept ghost suggestions (Tab) first.'); return }
    const d = await api.dataset(pairs)
    const blob = new Blob([pairs.map(x => JSON.stringify(x)).join('\n')], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'byline_dataset.jsonl'; a.click()
    alert(d?.ok ? `Dataset: ${pairs.length} pairs downloaded, server total ${d.total}. Next LoRA step: see lora/README.md` : 'Dataset downloaded locally; backend save failed.')
  }
  function toggleDock(side: 'left' | 'right') { if (side === 'left') { setLeftOpen(v => { localStorage.setItem('byline.leftOpen', v ? '0' : '1'); return !v }) } else { setRightOpen(v => { localStorage.setItem('byline.rightOpen', v ? '0' : '1'); return !v }) } }

  useEffect(() => { editor?.view.dom.setAttribute('spellcheck', appSettings.spellcheck ? 'true' : 'false') }, [editor, appSettings.spellcheck])
  if (!editor) return null
  const acc = metrics.offered ? Math.round(100 * metrics.accepted / metrics.offered) : 0
  const avgMs = metrics.msCount ? Math.round(metrics.msTotal / metrics.msCount) : 0
  const draftNow = draftObj()
  const tabDirty = {
    write: JSON.stringify({ context: applied.context, level: applied.level, assist: applied.assist, persona: applied.persona }) !== JSON.stringify({ context: draftNow.context, level: draftNow.level, assist: draftNow.assist, persona: draftNow.persona }),
    style: JSON.stringify({ tones: applied.tones, voice: applied.voice, rhythm: applied.rhythm, gramVoice: applied.gramVoice, clause: applied.clause, density: applied.density, audLevel: applied.audLevel, audText: applied.audText }) !== JSON.stringify({ tones: draftNow.tones, voice: draftNow.voice, rhythm: draftNow.rhythm, gramVoice: draftNow.gramVoice, clause: draftNow.clause, density: draftNow.density, audLevel: draftNow.audLevel, audText: draftNow.audText }),
    outline: false,
  }
  const cols = `${leftOpen ? '264px' : '52px'} minmax(0,1fr) ${rightOpen ? '348px' : '52px'}`
  return (
    <div>
      <header className="topbar editor-topbar">
        <div className="top-left"><Logo />{demo && <span className="chip" style={{ background: 'var(--ai)' }}>DEMO</span>}</div>
        <div className="mode-toggle" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === 'drafting'} className={mode === 'drafting' ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => switchMode('drafting')}>Drafting</button>
          <button role="tab" aria-selected={mode === 'editing'} className={mode === 'editing' ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => switchMode('editing')}>Editing</button>
        </div>
        <div className="top-right">
        {anyLoading && <span className="ai-loading"><Spinner /> AI working</span>}
        {appSettings.showMetrics && <span className="metric" title={`Ghost acceptance: ${metrics.accepted} accepted / ${metrics.offered} batches offered · ${metrics.dismissed} dismissed · avg latency ${avgMs}ms`}>Ghost taken {acc}% ({metrics.accepted}/{metrics.offered}) · {avgMs}ms avg · {status?.model || 'offline'}</span>}
        <span className="dot" style={{ background: status?.meta_configured ? '#1E8E3E' : '#D93025' }} title={status?.meta_configured ? 'Backend connected' : 'Backend offline'} />
        <a className={`nav-btn ${location.pathname.startsWith('/app') ? 'active' : ''}`} href="/app">App</a>
        <a className={`nav-btn ${location.pathname.startsWith('/demo') ? 'active' : ''}`} href="/demo">Demo</a>
        <button className="icon-btn settings-icon" onClick={() => { blip('open'); setShowSettings(true) }} title="Settings (Ctrl+,)" aria-label="Settings"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/></svg></button>
        </div>
      </header>

      <div className="layout" style={{ gridTemplateColumns: cols }}>
        <aside className="rail" onClickCapture={e => { if ((e.target as HTMLElement).closest('button')) blip('select') }}>
          {!leftOpen ? <div className="rail-strip"><button onClick={() => toggleDock('left')} title="Expand">›</button><span className="strip-dot" style={{ background: 'var(--ai)' }} /><span className="strip-dot" style={{ background: 'var(--grey)' }} /></div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>Write</strong><button onClick={() => toggleDock('left')} title="Collapse">‹</button></div>
            <div className="dock-tabs" role="tablist" aria-label="Write settings">
              {(['write', 'style', 'outline'] as LeftTab[]).map(t => <button key={t} role="tab" aria-selected={leftTab === t} className={leftTab === t ? 'active' : ''} onClick={() => setLeftTab(t)}>{t === 'write' ? 'Write' : t === 'style' ? 'Syntax' : 'Outline'}{tabDirty[t] && <span className="tab-dot" title="Unapplied changes" />}</button>)}
            </div>
            <div className="rail-scroll">
            {leftTab === 'write' && <>
            <div className="dock"><h3>Context</h3>
              <textarea className="context-box" value={context} onChange={e => { setContext(e.target.value); setStale(true) }} placeholder="What should the finished text be about?" aria-label="Context" />
            </div>
            <div className="dock"><h3>Diction</h3>
              <select style={{ width: '100%' }} value={level} onChange={e => setLevel(e.target.value)} aria-label="Diction">{DICTIONS.map(l => <option key={l}>{l}</option>)}</select>
              <label>Assist</label><select style={{ width: '100%' }} value={assist} onChange={e => setAssist(e.target.value)}>{ASSISTS.map(l => <option key={l}>{l}</option>)}</select>
              <label>Reader persona</label><select style={{ width: '100%' }} value={persona} onChange={e => setPersona(e.target.value)}>{PERSONAS.map(l => <option key={l}>{l}</option>)}</select>
            </div>
            </>}
            {leftTab === 'style' && <>
            <div className="dock"><h3>Tone</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{TONES.map(t => { const st = tones[t]; return <button key={t} className={`tone-tag ${st || ''}`} title={`${t}: ${st === 'allow' ? 'allowed' : st === 'ban' ? 'not allowed' : 'off'} — click to cycle`} aria-label={`${t}, ${st === 'allow' ? 'allowed' : st === 'ban' ? 'not allowed' : 'off'}`} onClick={() => cycleTone(t)}>{st === 'ban' ? '✕ ' : st === 'allow' ? '✓ ' : ''}{t}</button> })}</div>
            </div>
            <div className="dock"><h3>Voice</h3>
              <input style={{ width: '100%' }} list="voice-presets" value={voice} onChange={e => setVoice(e.target.value)} placeholder="Describe a voice, or pick an example…" />
              <datalist id="voice-presets">{VOICE_PRESETS.map(v => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="dock"><h3>Syntax</h3>
              <label>Sentence rhythm · Short ↔ Long</label>
              <input type="range" min={1} max={3} step={1} value={rhythm} onChange={e => setRhythm(Number(e.target.value))} style={{ width: '100%' }} />
              <div className="meta">{RHYTHMS[rhythm]}</div>
              <label>Grammatical voice</label>
              <div className="mode-toggle" style={{ display: 'flex' }}><button className={gramVoice === 'active' ? 'active' : ''} onClick={() => setGramVoice('active')} style={{ flex: 1 }}>Strictly active</button><button className={gramVoice === 'passive' ? 'active' : ''} onClick={() => setGramVoice('passive')} style={{ flex: 1 }}>Passive permitted</button></div>
              <label>Clause complexity</label>
              <select style={{ width: '100%' }} value={clause} onChange={e => setClause(e.target.value)}><option>Simple</option><option>Coordinated</option><option>Subordinated</option></select>
              <label>Information density · Sparse ↔ Dense</label>
              <input type="range" min={1} max={3} step={1} value={density} onChange={e => setDensity(Number(e.target.value))} style={{ width: '100%' }} />
              <div className="meta">{density === 1 ? 'Sparse' : density === 3 ? 'Dense' : 'Balanced'}</div>
            </div>
            <div className="dock"><h3>Audience</h3>
              <label>Who is reading this?</label>
              <input style={{ width: '100%' }} value={audText} onChange={e => setAudText(e.target.value)} placeholder="Stakeholders, undergraduates…" />
              <label>Knowledge · 1 Beginner ↔ 5 Expert</label>
              <input type="range" min={1} max={5} step={1} value={audLevel} onChange={e => setAudLevel(Number(e.target.value))} style={{ width: '100%' }} />
              <div className="meta">{audLevel}/5</div>
            </div>
            </>}
            {leftTab === 'outline' && <>
            <div className="dock"><h3>Outline</h3>
              <Outline editor={editor} data={toc} onMove={moveSection} />
            </div>
            </>}
            </div>
            <div className="rail-foot"><button className="primary" disabled={!dirty} onClick={applySettings} style={{ width: '100%' }}>Apply settings{dirty ? ' ●' : ''}</button></div>
          </>}
        </aside>

        <main>
          <EditorMenus editor={editor} counts={counts} showWordCount={appSettings.showWordCount} onSuggest={() => requestComplete()} onSentenceStarter={openTransMenu} onWizard={() => setWizardOpen(true)} onExportDocx={doExportDocx} onExportHtml={doExportHtml} onExportDataset={exportDataset} exportingDocx={!!loading.docx} />
          <div className="paper" onDoubleClick={onDblClick}>
            <EditorContent editor={editor} />
            {collectFootnotes(editor.getJSON()).length > 0 && <div className="footnotes"><hr />{collectFootnotes(editor.getJSON()).map(n => <div key={n.id} className="footnote-item"><sup>{n.label}</sup> {n.content}</div>)}</div>}
          </div>
        </main>

        <aside className={`rail right-rail ${mode === 'drafting' ? 'ai-off' : ''}`} onClickCapture={e => { if ((e.target as HTMLElement).closest('button')) blip('select') }}>
          {!rightOpen ? <div className="rail-strip"><button onClick={() => toggleDock('right')} title="Expand">‹</button><span className="strip-dot" style={{ background: 'var(--lt)' }} /><span className="strip-dot" style={{ background: 'var(--yellow)' }} /><span className="strip-dot" style={{ background: 'var(--blue)' }} /><span className="strip-dot" style={{ background: 'var(--ai)' }} /></div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>Read</strong><button onClick={() => toggleDock('right')} title="Collapse">›</button></div>
            <div className="dock-tabs" role="tablist" aria-label="Read panels">
              {editing && <button role="tab" aria-selected={rightTab === 'language'} className={rightTab === 'language' ? 'active' : ''} onClick={() => setRightTab('language')}>Language{(grammar.length + issues.length) > 0 && <span className="tab-badge">{grammar.length + issues.length}</span>}{loading.grammar || loading.annotate ? <Spinner /> : null}</button>}
              {editing && <button role="tab" aria-selected={rightTab === 'lint'} className={rightTab === 'lint' ? 'active' : ''} onClick={() => setRightTab('lint')}>Lint{lintResults.length > 0 && <span className="tab-badge">{lintResults.length}</span>}{loading.lint ? <Spinner /> : null}</button>}
              {editing && <button role="tab" aria-selected={rightTab === 'reader'} className={rightTab === 'reader' ? 'active' : ''} onClick={() => setRightTab('reader')}>Reader{reactions.length > 0 && <span className="tab-badge">{reactions.length}</span>}{loading.reactions || loading.main ? <Spinner /> : null}</button>}
              {editing && <button role="tab" aria-selected={rightTab === 'sources'} className={rightTab === 'sources' ? 'active' : ''} onClick={() => setRightTab('sources')}>Sources{readings.length > 0 && <span className="tab-badge">{readings.length}</span>}{loading.readings ? <Spinner /> : null}</button>}
              <button role="tab" aria-selected={rightTab === 'suggest' || !editing} className={rightTab === 'suggest' || !editing ? 'active' : ''} onClick={() => setRightTab('suggest')}>Suggest{suggestions.length > 0 && <span className="tab-badge">{suggestions.length}</span>}{loading.complete ? <Spinner /> : null}</button>
            </div>
            <div className="rail-scroll">
            {editing && rightTab === 'language' && <><div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--lt)' }} />Language{(loading.grammar || loading.annotate) && <Spinner />}</h3>
              <div className="dock-scroll">
              {grammar.map((g, i) => { const a = anchorStore.anchors.find(x => x.id === `g${i}-${g.from}`); const st = LANG_STYLE.grammar; return <div key={`g${i}`} className={`dock-item ${g.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label} · LT</div><span className="quote-serif">{g.quote || ''}</span><div className="reason-text">{g.message}</div>{g.replacements[0] && <div className="replacement-text" style={{ color: st.color }}>→ {g.replacements[0]}</div>}</div> })}
              {issues.map(it => { const a = anchorStore.anchors.find(x => x.id === it.id); const st = LANG_STYLE[it.type]; return <div key={it.id} className={`dock-item ${it.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label} · AI</div><span className="quote-serif">{it.quote}</span><div className="reason-text">{it.reason}</div>{it.replacement && <div className="replacement-text" style={{ color: st.color }}>→ {it.replacement}</div>}</div> })}
              {!grammar.length && !issues.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><span className="meta">Dictionary: {dict.spelling.length} · Ignored: {dict.ignore.length}</span>{dict.spelling.length > 0 && <button style={{ marginLeft: 8 }} onMouseDown={e => e.preventDefault()} onClick={exportAdditions}>Export additions</button>}</div>
            </div>
            </>}
            {editing && rightTab === 'reader' && <>
            <div className="dock"><h3><span className="swatch" style={{ background: 'var(--ai)' }} />Perceived main idea{(loading.main || loading.outline) && <Spinner />}</h3>
              <div className="quote-serif">{mainIdea || diagram.caption || '—'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><button disabled={!editing} onMouseDown={e => e.preventDefault()} onClick={refreshMainIdea}>{loading.main ? 'Reading…' : 'Main idea'}</button>
              <select value={diagramKind} onChange={e => setDiagramKind(e.target.value as any)}><option value="mindmap">Mindmap</option><option value="flowchart">Flowchart</option></select>
              <button disabled={!editing} onClick={refreshDiagram}>{loading.diagram ? 'Drawing…' : 'Draw diagram'}</button></div>
              <Diagram source={diagram.mermaid} caption="" nodes={diagram.nodes} onNode={n => focusAnchor({ id: `dg:${n.label}`, kind: 'reaction', quote: n.quote, context: n.context, title: n.label, detail: n.quote })} />
              {outline.map((o, i) => <div key={i} className="dock-item" onClick={() => focusAnchor({ id: `o${i}`, kind: 'reaction', quote: o.quote, context: o.context, title: 'Outline', detail: o.label })}>{o.label}<div className="meta">“{o.quote}”</div></div>)}
              <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={refreshOutline}>Outline</button>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--ai)' }} />Reader{loading.reactions && <Spinner />}</h3>
              <div className="dock-scroll">
              {reactions.map(r => { const a = anchorStore.anchors.find(x => x.id === r.id); const st = REACTION_STYLE[r.kind]; return <div key={r.id} className={`dock-item ${r.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label}</div><span className="quote-serif">{r.quote}</span><div className={`kind-body ${r.kind === 'question' ? 'q' : r.kind === 'critique' ? 'crit' : r.kind === 'comment' ? 'comm' : ''}`} style={r.kind === 'compliment' ? { color: st.color, fontWeight: 600 } : undefined}>“{r.text}”</div></div> })}
              {!reactions.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><button disabled={!editing} onMouseDown={e => e.preventDefault()} onClick={requestReactions}>Refresh</button></div>
            </div>
            </>}
            {editing && rightTab === 'sources' && <>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--blue)' }} />Sources{loading.readings && <Spinner />}</h3>
              <div className="dock-scroll">
              <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                <input value={researchUrl} onChange={e => setResearchUrl(e.target.value)} placeholder="Research URL — web page or PDF" />
                <input value={researchQ} onChange={e => setResearchQ(e.target.value)} placeholder="Question (optional)" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button className="primary" disabled={!researchUrl || !!loading.research} onMouseDown={e => e.preventDefault()} onClick={() => runResearch()}>{loading.research ? 'Researching…' : 'Research URL'}</button>
                <label className="nav-btn" style={{ cursor: 'pointer' }}>Upload file<input type="file" hidden accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) runResearch(f); e.target.value = '' }} /></label></div>
              </div>
              {facts.map((f, i) => <div key={i} className="source-card"><span className="source-badge">Fact{f.locator ? ` · ${f.locator}` : ''}</span><div className="source-why">{f.fact}</div><div className="source-excerpt"><a href={f.url || '#'} target="_blank" rel="noreferrer">{f.source_title || f.url}</a>{f.excerpt ? ` — “${f.excerpt}”` : ''}</div><button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().insertContent(` (${f.source_title || 'source'}${f.locator ? `, ${f.locator}` : ''}: ${f.url})`).run()}>Insert citation</button></div>)}
              {readings.map((r, i) => <div key={i} className={`source-card ${r.stale ? 'stale' : ''}`} style={r.stale ? { opacity: .6 } : undefined}><span className="source-badge">{r.label}</span><a className="source-title" href={textFragmentUrl(r.url, r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a><div className="source-why">vs “{r.claim_quote}” — {r.why}</div>{r.excerpt && r.excerpt !== r.why && <div className="source-excerpt">“{r.excerpt}”</div>}</div>)}
              {!readings.length && !facts.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><div style={{ display: 'flex', gap: 6 }}><button className="primary" disabled={!editing} onMouseDown={e => e.preventDefault()} onClick={refreshReadings}>{loading.readings ? 'Searching…' : 'Search'}</button><button onMouseDown={e => e.preventDefault()} onClick={() => setShowSources(true)}>Library ({facts.length + readings.length})</button></div></div>
            </div>
            </>}
            {(rightTab === 'suggest' || !editing) && <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--grey)' }} />Suggestions{loading.complete && <Spinner />}</h3>
              <div className="dock-scroll">
              {suggestions.map((s, i) => <div key={`s${i}`} className={`ghost-row ${i === ghostIdx ? 'sel' : ''}`} onClick={() => acceptGhost(i)}><span className="quote-serif">{s}</span></div>)}
              {suggHistory.map((s, i) => <div key={`h${i}`} className="ghost-row" style={{ opacity: .45 }}>{s}</div>)}
              {loading.complete && !suggestions.length && <div className="meta"><LoadingDots /></div>}{!suggestions.length && !suggHistory.length && !loading.complete && <div className="meta">—</div>}
              </div>
              {suggestions.length > 0 && <div className="dock-foot"><button onClick={() => clearGhost()}>Dismiss <span className="kbd">Esc</span></button></div>}
            </div>}
            {editing && rightTab === 'lint' && <div className="dock dock-section" style={lintEnabled ? undefined : { opacity: .55 }}><h3>Lint {loading.lint && <Spinner />}<span className="spacer" /><button role="switch" aria-checked={lintEnabled} aria-label="Toggle lint" className={`switch ${lintEnabled ? 'on' : ''}`} onMouseDown={e => e.preventDefault()} onClick={toggleLint}><span className="knob" /></button></h3>
              <div className="dock-scroll">
              {[...lintResults].sort((a, b) => (LINT_PRIORITY[a.color_category] ?? 9) - (LINT_PRIORITY[b.color_category] ?? 9)).map(r => { const rule = LINTER_RULE_LIBRARY.find(x => x.id === r.rule_id); return <div key={r.uid} className="dock-item" onMouseDown={e => e.preventDefault()} onClick={() => openLintGroup(r)}><div className="kind-label" style={{ color: `var(--lint-${r.color_category})` }}>{LINT_COLORS[r.color_category]?.label || r.color_category} · {rule?.name || r.rule_id}</div><span className="quote-serif">{r.target}</span><div className="reason-text">{r.message}</div>{r.suggestion && <div className="replacement-text">→ {r.suggestion}</div>}</div> })}
              {!lintResults.length && !loading.lint && <div className="meta">{lintEnabled ? 'No results.' : 'Lint off.'}</div>}
              {loading.lint && !lintResults.length && <div className="meta"><LoadingDots /></div>}
              </div><div className="dock-foot"><div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><button className="primary" disabled={!lintEnabled} onMouseDown={e => e.preventDefault()} onClick={runLint}>{loading.lint ? 'Linting…' : 'Run lint'}</button><button onMouseDown={e => e.preventDefault()} onClick={() => setShowLibrary(true)}>Rule library</button></div>{lintStatus && <div className="meta" style={{ marginTop: 6 }}>{lintStatus}</div>}</div>
            </div>}
            </div>
          </>}
        </aside>
      </div>

      {showSettings && <SettingsMenu settings={appSettings} onChange={updateSettings} onClose={() => setShowSettings(false)} />}
      {showLibrary && (
        <div className="library-backdrop" onMouseDown={() => setShowLibrary(false)}>
          <div className="library-modal fade" role="dialog" aria-label="Rule library" onMouseDown={e => e.stopPropagation()}>
            <div className="library-head"><strong>Rule library</strong><span className="meta">{enabledRules.size + customRules.length} active</span><span className="spacer" /><button onClick={() => setShowLibrary(false)}>Close <span className="kbd">Esc</span></button></div>
            <div className="library-scroll">
              {Object.entries(LINT_COLORS).map(([color, meta]) => <div key={color} style={{ marginBottom: 18 }}>
                <div className="kind-label" style={{ color: `var(--lint-${color})`, fontSize: 12 }}>{meta.label} · {meta.intent}</div>
                {LINTER_RULE_LIBRARY.filter(r => r.color === color).map(r => <div key={r.id} className="library-rule">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><button className={`tone-tag ${enabledRules.has(r.id) ? 'allow' : ''}`} onClick={() => toggleRule(r.id)}>{enabledRules.has(r.id) ? '✓ Enabled' : 'Enable'}</button><strong>{r.name}</strong><span className="meta">{r.id}</span></div>
                  <p>{r.description}</p>
                  <p className="meta"><strong>Rule:</strong> {r.instruction}</p>
                  {r.example_violation && <div className="library-example"><div><span className="kind-label" style={{ color: 'var(--lt)' }}>Violation</span> <span className="quote-serif">“{r.example_violation}”</span></div><div><span className="kind-label" style={{ color: 'var(--lint-green)' }}>Fix</span> <span className="quote-serif">“{r.example_fix}”</span></div></div>}
                </div>)}
              </div>)}
              <div className="kind-label" style={{ color: 'var(--lint-violet)', fontSize: 12 }}>Custom rules · violet</div>
              {customRules.map((t, i) => <div key={i} className="library-rule"><span className="tone-tag allow">✓ Enabled</span> <strong>CUSTOM_{String(i + 1).padStart(2, '0')}</strong><button style={{ float: 'right' }} onClick={() => { const n = customRules.filter((_, j) => j !== i); setCustomRules(n); localStorage.setItem('byline.customRules', JSON.stringify(n)) }}>✕</button><p>{t}</p></div>)}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}><input style={{ flex: 1 }} value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Add custom rule — e.g. no passive voice in headers" onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { const n = [...customRules, customInput.trim()]; setCustomRules(n); localStorage.setItem('byline.customRules', JSON.stringify(n)); setCustomInput('') } }} /><button className="primary" onClick={() => { if (!customInput.trim()) return; const n = [...customRules, customInput.trim()]; setCustomRules(n); localStorage.setItem('byline.customRules', JSON.stringify(n)); setCustomInput('') }}>Add rule</button></div>
            </div>
          </div>
        </div>
      )}
      {showSources && <SourcesLibrary facts={facts} readings={readings} onClose={() => setShowSources(false)} onDeleteFact={f => setFacts(old => old.filter(x => !(x.fact === f.fact && x.url === f.url)))} onDeleteReading={r => setReadings(old => old.filter(x => !(x.url === r.url && x.claim_quote === r.claim_quote)))} onClear={() => { setFacts([]); setReadings([]) }} onInsertFact={f => { editor.chain().focus().insertContent(` (${f.source_title || 'source'}${f.locator ? `, ${f.locator}` : ''}: ${f.url})`).run(); setShowSources(false) }} />}
      {wizardOpen && <SetupWizard answers={answers} setAnswers={f => setAnswers(f as any)} onClose={() => setWizardOpen(false)} onGenerate={generateFromSurvey} generating={!!loading.outlinegen} />}
      {transMenu && (
        <div className="sugg-popup fade" style={{ left: transMenu.x, top: transMenu.y, maxHeight: transMenu.h, overflowY: 'auto' }} role="menu" aria-label="Transitions">
          <div className="trans-query">{transMenu.cat ? `${transMenu.cat} — ` : ''}Type to filter{transMenu.query ? `: ${transMenu.query}` : ''}<span className="trans-caret">▌</span></div>
          {!transMenu.cat
            ? Object.keys(TRANSITIONS).filter(c => matchText(transMenu.query, c) || TRANSITIONS[c].some(t => matchText(transMenu.query, t))).map((c, i) => <div key={c} className="sugg-row" onMouseDown={e => { e.preventDefault(); blip('select'); const n = { ...transMenu, cat: c, query: '' }; transRef.current = n; setTransMenu(n) }}><span className="num">{digitFor(i)}</span>{c}</div>)
            : <><div className="sugg-row" onMouseDown={e => { e.preventDefault(); const n = { ...transMenu, cat: null, query: '' }; transRef.current = n; setTransMenu(n) }}>← Categories</div>{TRANSITIONS[transMenu.cat].filter(t => matchText(transMenu.query, t)).map((t, i) => <div key={t} className="sugg-row" onMouseDown={e => { e.preventDefault(); transRef.current = null; setTransMenu(null); insertTransition(t) }}><span className="num">{digitFor(i)}</span>{t.replace('[]', '…')}</div>)}</>}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="sugg-popup fade" style={{ left: suggPos.x, top: suggPos.y, maxHeight: suggPos.h, overflowY: 'auto' }} role="listbox" aria-label="Suggestions">
          {suggestions.map((s, i) => <div key={i} className={`sugg-row ${i === ghostIdx ? 'sel' : ''}`} onMouseDown={e => { e.preventDefault(); acceptGhost(i) }} onMouseEnter={() => { setGhostIdx(i); refs.current.idx = i; showGhost(i) }}><span className="num">{i + 1}</span>{s}</div>)}
        </div>
      )}
      {lintGroup.length > 0 && (
        <div className="popup popup-stack fade" role="dialog" style={{ left: popupPos.x, top: popupPos.y, maxHeight: popupPos.h }}>
          {lintGroup.map((r, i) => { const rule = LINTER_RULE_LIBRARY.find(x => x.id === r.rule_id); const active = i === lintIdx; return (
            <div key={r.uid} className={`stack-card ${active ? 'active' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => { setLintIdx(i); lintIdxRef.current = i; lintStore.activeUid = r.uid!; syncLint(editor) }}>
              <span className="chip" style={{ background: `var(--lint-${r.color_category})` }}>{LINT_COLORS[r.color_category]?.label || r.color_category}</span><span className="stack-order">{i + 1}/{lintGroup.length}</span>
              <div className="quote-serif" style={{ marginTop: 6 }}>“{r.target}”</div>
              <div style={{ fontWeight: 600, marginTop: 2, fontSize: 12.5 }}>{rule?.name || r.rule_id}</div>
              {active && <><p style={{ margin: '6px 0' }}>{r.message}</p>{r.suggestion && <button className="primary" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); applyLint(r) }}>Apply “{r.suggestion}” <span className="kbd">Tab</span></button>}</>}
            </div>) })}
          <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={() => { setLintGroup([]); lintStore.activeUid = null; syncLint(editor) }}>Close <span className="kbd">Esc</span></button>
        </div>
      )}
      {selected && popupGroup.length > 0 && (
        <div className="popup popup-stack fade" ref={popupRef} role="dialog" style={{ left: popupPos.x, top: popupPos.y, maxHeight: popupPos.h }}
          onMouseEnter={() => { popupHoverRef.current = true }} onMouseLeave={() => { popupHoverRef.current = false; if (!pinnedRef.current) closePopup() }}>
          {popupGroup.map((a, i) => {
            const active = i === popupIdx
            const chipColor = a.kind === 'grammar' ? 'var(--lt)' : a.kind === 'claim' ? 'var(--blue)' : a.kind === 'vocabulary' ? 'var(--yellow)' : 'var(--ai)'
            const chipLabel = a.kind === 'grammar' ? 'Language · Grammar' : a.kind === 'vocabulary' ? 'Word choice' : a.kind === 'relevance' ? 'Cohesion' : a.kind === 'claim' ? 'Source' : `Reader · ${REACTION_STYLE[a.tone || '']?.label || a.tone || 'Reader'}`
            return (
              <div key={a.id} className={`stack-card ${active ? 'active' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => setActiveIdx(i)}>
                <span className="chip" style={{ background: chipColor }}>{chipLabel}</span>
                <span className="stack-order">{i + 1}/{popupGroup.length}</span>
                <div className="quote-serif" style={{ marginTop: 6 }}>“{a.quote}”</div>
                {active && <>
                  <p style={{ margin: '6px 0' }}>{a.detail}</p>
                  {a.url && <p style={{ margin: '6px 0' }}><a href={textFragmentUrl(a.url, a.excerpt || a.quote)} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontWeight: 600 }}>Open source ↗</a></p>}
                  {a.replacement
                    ? <button className="primary" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); applySelected() }}>Apply “{a.replacement}” <span className="kbd">Tab</span></button>
                    : <button className="primary" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); tabPopup() }}>Next <span className="kbd">Tab</span></button>}
                  {(a.kind === 'grammar' || a.kind === 'vocabulary') && !a.quote.includes(' ') && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('ignore', a.quote) }}>Ignore word</button><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('spelling', a.quote) }}>Add to dictionary</button></div>}
                  {active && a.alternatives && a.alternatives.length > 1 && <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>{a.alternatives.map((alt, ai) => <button key={alt.text} className="alt-row" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); applyAnchor(a, alt.text) }}><span className="num">{ai + 1}</span><strong>{alt.text}</strong>{alt.note && <span className="meta"> — {alt.note}</span>}</button>)}</div>}
                </>}
              </div>
            )
          })}
          <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={closePopup}>Close <span className="kbd">Esc</span></button>
        </div>
      )}
      {loading.synonyms && synonyms.length === 0 && (
        <div className="sugg-popup fade" style={{ left: synPos.x, top: synPos.y }}><div className="sugg-row"><Spinner /> Finding synonyms</div></div>
      )}
      {synonyms.length > 0 && (
        <div className="sugg-popup fade" style={{ left: synPos.x, top: synPos.y, maxHeight: synPos.h, overflowY: 'auto' }} role="listbox" aria-label="Synonyms">
          {synonyms.map((w, i) => <div key={w} className={`sugg-row ${i === 0 ? 'sel' : ''}`} onMouseDown={e => { e.preventDefault(); replaceWord(w) }}><span className="num">{i + 1}</span>{w}</div>)}
        </div>
      )}
    </div>
  )
}
