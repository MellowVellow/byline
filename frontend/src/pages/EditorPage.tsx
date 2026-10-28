import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { AnchorDecorations, anchorStore, redraw, syncAnchors, syncGhost, modeStore, lintStore, syncLint } from '../editor/decorations'
import { api } from '../lib/api'
import { docToText, locateQuote, locateOffset } from '../lib/locate'
import type { Anchor, Issue, Reaction, GrammarMatch, Reading, OutlineItem, OutlineDraft, DocSection } from '../lib/types'
import { SAMPLE_DOC, SAMPLE_CONTEXT, FALLBACK_READINGS } from '../lib/fallback'
import { Logo } from '../components/Brand'
import SettingsMenu from '../components/SettingsMenu'
import EditorMenus from '../components/EditorMenus'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { textFragmentUrl } from '../lib/link'
import { DICTIONS, TONES, VOICE_PRESETS, RHYTHMS, TRANSITIONS, ASSISTS, ASSIST_DESCRIPTIONS, PERSONAS, matchText, digitFor, REACTION_STYLE, LANG_STYLE, LAYER_ORDER } from '../lib/constants'
import { buildStyle } from '../lib/buildStyle'
import { useLint, lintKeyOf } from '../hooks/useLint'
import { useSynonyms } from '../hooks/useSynonyms'
import { useGhost } from '../hooks/useGhost'
import { usePanels } from '../hooks/usePanels'
import { keys as storageKeys, getJSON, setJSON, getStr, setStr, removeKey } from '../lib/storage'
export { matchText, digitFor, REACTION_STYLE, LANG_STYLE, LAYER_ORDER } from '../lib/constants'
import { LINTER_RULE_LIBRARY, LINT_COLORS, type LintResult } from '../lib/rules'
import Diagram, { type DiagramNode } from '../components/Diagram'
import SetupWizard, { type SetupPayload } from '../components/SetupWizard'
import SourcesLibrary from '../components/SourcesLibrary'
import { sfxSuccess } from '../lib/sfx'
import { TableOfContents, getHierarchicalIndexes, type TableOfContentData } from '@tiptap/extension-table-of-contents'
import { PageBreak, Footnote, collectFootnotes } from '../editor/extensions'
import { exportDocx } from '../lib/docx-export'
import { researchUpload } from '../lib/api'
import type { Fact } from '../lib/types'
import { formatInline, insertCitationText } from '../lib/citations'
import { TAB_THEME, RIGHT_TAB_ORDER, anchorKey, toggled, groupByClaim, safeUrl } from '../lib/layers'
import MetricsPopup from '../components/MetricsPopup'
import { blip, sfxEnabled, setSfxEnabled, sfxActivate, sfxDeactivate } from '../lib/sfx'

let uid = 0
const nid = () => `a${++uid}`
export function Spinner() { return <span className="spinner" aria-label="Loading" /> }
export function LoadingDots() { return <span className="load-dots" aria-label="Loading"><span /><span /><span /></span> }
export function sortByLayer(anchors: Anchor[]): Anchor[] {
  return [...anchors].sort((a, b) => (LAYER_ORDER[a.kind] ?? 9) - (LAYER_ORDER[b.kind] ?? 9))
}

const keyAct = (fn: () => void) => ({ tabIndex: 0, role: 'button' as const, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } } })

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  const docKey = storageKeys.doc(demo)
  const saved = demo ? null : getJSON<any>(docKey, null)
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
  const [diagram, setDiagram] = useState<{ mermaid: string; caption: string; nodes: DiagramNode[] }>({ mermaid: '', caption: '', nodes: [] })
  const [diagramKind, setDiagramKind] = useState<'mindmap' | 'flowchart'>('mindmap')
  const [facts, setFacts] = useState<Fact[]>(() => getJSON(storageKeys.facts(demo), [] as Fact[]))
  const [researchUrl, setResearchUrl] = useState('')
  const [researchQ, setResearchQ] = useState('')
  const [citeStyle, setCiteStyle] = useState<'apa' | 'mla' | 'chicago'>(() => (getStr(storageKeys.citeStyle) as any) || 'apa')
  const [citeTemplate, setCiteTemplate] = useState<'' | 'support' | 'contrast' | 'stat' | 'define'>('')
  const [researchAuto, setResearchAuto] = useState(getStr(storageKeys.researchAuto) !== '0')
  const researchAutoRef = useRef(true); researchAutoRef.current = researchAuto
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardTab, setWizardTab] = useState<'survey' | 'outline'>('survey')
  const [outlineDraft, setOutlineDraft] = useState<OutlineDraft[]>([])
  const [activeConfig, setActiveConfig] = useState<SetupPayload | null>(() => getJSON(storageKeys.configActive, null))
  function applySetupPayload(p: SetupPayload) {
    const d = p.dimensions || {} as any
    if (d.diction && DICTIONS.includes(d.diction)) setLevel(d.diction)
    if (d.voice) setVoice(d.voice)
    if (d.tone) { const ts = String(d.tone).split(/[,;]/).map((s: string) => s.trim()).filter((t: string) => TONES.includes(t)); if (ts.length) setTones(Object.fromEntries(ts.map(t => [t, 'allow']))) }
    const st = (d.style || '').toLowerCase()
    if (st.includes('staccato')) setRhythm(1); else if (st.includes('flow')) setRhythm(3)
    if (st.includes('zero passive') || st.includes('strictly active')) setGramVoice('active' as any)
    if (st.includes('simple')) setClause('Simple'); else if (st.includes('coordinat')) setClause('Coordinated')
    if (p.active_preset_rules?.length) setEnabledRules(new Set(p.active_preset_rules))
    if (p.custom_rules?.length) { const n = p.custom_rules.map(c => c.rule); setCustomRules(n); setJSON(storageKeys.customRules, n) }
    setJSON(storageKeys.configActive, p)
    setActiveConfig(p); setContext((c: string) => c || `Goal config ${p.configuration_id}: ${d.tone || ''} ${d.voice || ''}`.slice(0, 240))
    const next = { ...draftObj(), level: d.diction && DICTIONS.includes(d.diction) ? d.diction : level, voice: d.voice || voice,
      style: `${buildStyle(appliedRef.current)}\nAllowed transitions: ${(p.ghost_text_filters?.allowed_transitions || []).join(', ')}\nStarter focus: ${(p.ghost_text_filters?.starter_categories || []).join(', ')}` }
    appliedRef.current = next as any; setApplied(next as any); sfxSuccess()
  }
  const [sfxOn, setSfxOn] = useState(sfxEnabled())
  const [answers, setAnswers] = useState({ goal: '', doc_type: 'essay', audience: '', audience_level: 3, key_points: '', voice_note: '' })
  const answersRef = useRef(answers); answersRef.current = answers
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  function updateSettings(s: AppSettings) { setAppSettings(s); saveSettings(s) }
  useEffect(() => { saveSettings(loadSettings()) }, []) // apply persisted prefs on mount
  useEffect(() => { const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setShowSettings(v => !v) } }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [])
  const [transMenu, setTransMenu] = useState<{ x: number; y: number; h: number; cat: string | null; query: string } | null>(null)
  const [notice, setNotice] = useState('')
  const transRef = useRef<typeof transMenu>(null); transRef.current = transMenu
  const [assist, setAssist] = useState('Phrase')
  const [persona, setPersona] = useState(PERSONAS[0])
  // left-dock edits are STAGED until Apply; AI calls always read appliedRef
  const [applied, setApplied] = useState(() => ({ context: demo ? SAMPLE_CONTEXT : (saved?.context || ''), level: saved?.level || 'General', voice: '', assist: 'Phrase', persona: PERSONAS[0], tones: {} as Record<string, 'allow' | 'ban'>, rhythm: 2, gramVoice: 'passive' as string, clause: 'Subordinated', density: 2, audLevel: 3, audText: '' }))
  const appliedRef = useRef(applied); appliedRef.current = applied
  const draftObj = () => ({ context, level, voice, assist, persona, tones, rhythm, gramVoice, clause, density, audLevel, audText })
  const dirty = JSON.stringify(applied) !== JSON.stringify(draftObj())
  function applySettings() { blip('accept')
    const next = draftObj()
    appliedRef.current = next; setApplied(next)
    requestComplete(); requestAnnotate(); requestReactions(); refreshMainIdea(); if (researchAutoRef.current) refreshReadings(); lint.runLint()
  }
  function cycleTone(t: string) { setTones(prev => { const n = { ...prev }; if (!n[t]) n[t] = 'allow'; else if (n[t] === 'allow') n[t] = 'ban'; else delete n[t]; return n }) }
  const [issues, setIssues] = useState<Issue[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [grammar, setGrammar] = useState<GrammarMatch[]>([])
  const factsKey = storageKeys.facts(demo)
  const readingsKey = storageKeys.readings(demo)
  const [readings, setReadings] = useState<Reading[]>(() => getJSON(storageKeys.readings(demo), [] as Reading[]))
  const [showSources, setShowSources] = useState(false)
  useEffect(() => { setJSON(factsKey, facts) }, [facts, factsKey])
  useEffect(() => { setJSON(readingsKey, readings.slice(0, 40)) }, [readings, readingsKey])
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeOutlineIdx, setActiveOutlineIdx] = useState(-1)
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
    const y = c.bottom + 8 + scrollY
    return { x: Math.max(8, Math.min(c.left, innerWidth - 380)) + scrollX, y, h: Math.max(170, innerHeight - (y - scrollY) - 12) }
  }
  const [stale, setStale] = useState(false)
  // TAB buttons: all enabled initially; double-click TAB greys TAB + disables ALL its underlines. Refresh never greys/deletes items.
  const [disabledTabs, setDisabledTabs] = useState<Set<string>>(new Set())
  const disabledTabsRef = useRef<ReadonlySet<string>>(disabledTabs); disabledTabsRef.current = disabledTabs
  const [dockSel, setDockSel] = useState<{ tab: string; key: string } | null>(null)
  function toggleTabDisabled(tab: string) {
    const off = !disabledTabsRef.current.has(tab)
    setDisabledTabs(prev => { const n = toggled(prev, tab); disabledTabsRef.current = n; return n })
    if (tab === 'lint') lint.setLintLayerDisabled(off)
    if (tab === 'suggest' && off) clearGhost(false)
    closePopup(); setTimeout(() => { rebuildAnchors(); if (editor) syncLint(editor) }, 0)
  }
  const [status, setStatus] = useState<any>(null)
  const [showMetrics, setShowMetrics] = useState(false)
  const [metrics, setMetrics] = useState<any>(() => getJSON(storageKeys.metrics, { offered: 0, accepted: 0, dismissed: 0, msTotal: 0, msCount: 0 }))
  type Mode = 'drafting' | 'editing'
  const [mode, setMode] = useState<Mode>('drafting') // entry always drafting, never restore editing
  useEffect(() => { modeStore.mode = mode }, [mode])
  const editing = mode === 'editing'
  const editingRef = useRef(true); editingRef.current = editing
  function switchMode(m: Mode) { if (m === 'editing') sfxActivate(); else sfxDeactivate()
    setMode(m); modeStore.mode = m
    if (m === 'drafting') setRightTab('suggest')
    if (m !== 'editing') lint.abortLint()
    if (m === 'drafting') {
      // ghost only: kill editing-AI timers/popups/underlines, keep suggestions alive
      refs.current.abort?.abort(); clearTimeout(refs.current.timers.g); clearTimeout(refs.current.timers.s)
      anchorStore.anchors = []; anchorStore.ranges = new Map(); anchorStore.linkedId = null
      setPopupGroup([]); setSelected(null)
      if (editor) { syncAnchors(editor); redraw(editor) }
    } else {
      // editing: restore anchors + fresh checks (sources + lint auto-run too)
      setTimeout(() => { rebuildAnchors(); requestGrammar(); requestAnnotate(); requestReactions(); if (researchAutoRef.current) refreshReadings(); lint.runLint() }, 50)
    }
    setTimeout(() => { if (refs.current.sugg.length) showGhost(refs.current.idx || 0) }, 80)
  }
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const setLoad = (k: string, v: boolean) => setLoading(prev => ({ ...prev, [k]: v }))
  const anyLoading = Object.values(loading).some(Boolean)
  const prevLoadingRef = useRef(false)
  useEffect(() => { if (prevLoadingRef.current && !anyLoading) blip('done'); prevLoadingRef.current = anyLoading }, [anyLoading])
  const [leftOpen, setLeftOpen] = useState(getStr(storageKeys.leftOpen) === '1')
  const [rightOpen, setRightOpen] = useState(getStr(storageKeys.rightOpen) === '1')
  type LeftTab = 'write' | 'style' | 'outline'
  type RightTab = 'language' | 'lint' | 'reader' | 'sources' | 'suggest'
  const [leftTab, setLeftTab] = useState<LeftTab>('write')
  const [rightTab, setRightTab] = useState<RightTab>('language')
  function openRightTab(t: RightTab) { setRightTab(t); if (!rightOpen) { setRightOpen(true); setStr(storageKeys.rightOpen, '1') } }
  const popupRef = useRef<HTMLDivElement>(null)
  const writerPosRef = useRef(0)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })
  // user dictionary exceptions (LT manual: spelling.txt vs ignore.txt), persisted locally
  const [dict, setDict] = useState<{ spelling: string[]; ignore: string[] }>(() => getJSON(storageKeys.dict, { spelling: [] as string[], ignore: [] as string[] }))
  const dictRef = useRef(dict); dictRef.current = dict
  function saveDict(n: { spelling: string[]; ignore: string[] }) { dictRef.current = n; setDict(n); setJSON(storageKeys.dict, n) }
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

  const record = (patch: any) => setMetrics((m: any) => { const n = { ...m }; for (const k in patch) n[k] = typeof patch[k] === 'function' ? patch[k](m[k] || 0) : patch[k]; setJSON(storageKeys.metrics, n); return n })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      AnchorDecorations, Highlight, TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount,
      PageBreak, Footnote,
      TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: (data) => setToc([...data]) }),
    ],
    editorProps: { attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' } },
    onCreate: ({ editor }) => { try { setCounts({ words: (editor.storage as any).characterCount.words(), chars: (editor.storage as any).characterCount.characters() }) } catch { /* noop */ } },
    content: demo ? SAMPLE_DOC : (saved?.html || '<p></p>'),
    onSelectionUpdate: ({ editor }) => { setTick(t => t + 1); try { const secs = docSections(); const pos = editor.state.selection.from; const idx = secs.findIndex((s, k) => pos >= s.from && pos < s.to); if (idx >= 0) setActiveOutlineIdx(idx) } catch { /* noop */ } const pos = editor.state.selection.from; const movedBack = pos < prevPosRef.current; prevPosRef.current = pos; if (movedBack) (refs.current as any).suppressAuto = true; if (movedBack) { if (groupRef.current.length) refs.current.fns.closePopup?.(); if (anchorStore.ghost) refs.current.fns.clearGhost?.() } else if (anchorStore.ghost && pos !== anchorStore.ghostPos) refs.current.fns.clearGhost?.() },
    onUpdate: ({ editor }) => {
      if (groupRef.current.length) refs.current.fns.closePopup?.()
      try { setCounts({ words: (editor.storage as any).characterCount.words(), chars: (editor.storage as any).characterCount.characters() }) } catch { /* noop */ }
      refs.current.version++; refs.current.abort?.abort(); setStale(true)
      setJSON(docKey, { html: editor.getHTML(), context, level })
      const t = refs.current.timers
      clearTimeout(t.c); clearTimeout(t.g); clearTimeout(t.s); clearTimeout(t.r); clearTimeout(t.l)
      t.c = setTimeout(() => refs.current.fns.complete?.(true), 500)
      t.g = setTimeout(() => refs.current.fns.grammar?.(), 900)
      t.s = setTimeout(() => { refs.current.fns.annotate?.(); refs.current.fns.reactions?.() }, 1400)
      // sources: auto claim-check, debounced (perception → query → verify → blue underline), throttled inside
      t.r = setTimeout(() => refs.current.fns.researchAuto?.(), 2500)
      // lint: auto-run debounced when enabled (Run lint button = manual re-run)
      t.l = setTimeout(() => refs.current.fns.lintAuto?.(), 1800)
    },
  })

  const outlineKey = storageKeys.outline(demo)
  const outlineEditor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } })],
    editorProps: { attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' } },
    content: getStr(outlineKey) || '<p></p>',
    onUpdate: ({ editor }) => {
      setStr(outlineKey, editor.getHTML())
      const draft: OutlineDraft[] = []
      for (const n of (editor.getJSON().content || []) as any[]) {
        const text = (n.content || []).map((c: any) => c.text || '').join('').trim()
        if (n.type === 'heading') draft.push({ heading: text || 'Untitled', purpose: '', points: [], state: 'pending' })
        else if (text && draft.length) { const cur = draft[draft.length - 1]; if (!cur.purpose) cur.purpose = text; else cur.points.push(text) }
      }
      if (draft.length) setOutlineDraft(draft)
    },
  })

  const plain = useCallback(() => editor ? docToText(editor) : { text: '', map: [] as number[] }, [editor])
  const lint = useLint({ getEditor: () => editor, plain, appliedRef, setLoad, openRightTab: (tab) => openRightTab(tab), setPopupPos, writerPosRef, onSelect: (r) => setDockSel({ tab: 'lint', key: lintKeyOf(r) }) })
  const { enabledRules, setEnabledRules, customRules, setCustomRules, customInput, setCustomInput, lintResults, lintGroup, lintIdx, lintGroupRef, lintIdxRef, showLibrary, setShowLibrary, lintStatus } = lint
  const { runLint, toggleRule, openLintGroup, lintSelUid } = lint
  const syn = useSynonyms({ getEditor: () => editor, plain, appliedRef, editingRef, setLoad })
  const { synonyms, synPos, onDblClick, replaceWord } = syn
  const factsRef = useRef(facts); factsRef.current = facts
  const ghost = useGhost({ getEditor: () => editor, editorReady: !!editor, appliedRef, refs, setLoad, record, demo, getFacts: () => factsRef.current, isMenuOpen: () => !!transRef.current, isSuggestDisabled: () => disabledTabsRef.current.has('suggest') })
  const { suggestions, ghostIdx, setGhostIdx, suggHistory, suggPos, showGhost, clearGhost, acceptGhost, requestComplete } = ghost
  const panels = usePanels({ getEditor: () => editor, plain, appliedRef, editingRef, versionRef: refs, setLoad, demo, nid, dictRef, researchAutoRef, setGrammar, setIssues, setReactions, setReadings, setMainIdea, setStale })
  const { requestGrammar, requestAnnotate, requestReactions, refreshMainIdea, refreshReadings, researchAutoRun } = panels

  const rebuildAnchors = useCallback(() => {
    if (!editor) return
    const tm = docToText(editor); const anchors: Anchor[] = []
    grammar.filter(g => !g.stale).forEach((g, i) => anchors.push({ id: `g${i}-${g.from}`, kind: 'grammar', tone: 'grammar', quote: tm.text.slice(g.from, g.to), context: tm.text.slice(Math.max(0, g.from - 30), g.to + 30), title: 'Grammar', detail: g.message, replacement: g.replacements[0] || '' }))
    issues.filter(it => !it.stale).forEach(it => anchors.push({ id: it.id || nid(), kind: it.type === 'vocabulary' ? 'vocabulary' : 'relevance', tone: it.type, quote: it.quote, context: it.context, title: it.type === 'vocabulary' ? 'Word choice' : 'Cohesion', detail: it.reason, replacement: it.replacement, alternatives: it.alternatives }))
    reactions.filter(r => !r.stale).forEach(r => anchors.push({ id: r.id || nid(), kind: 'reaction', tone: r.kind, quote: r.quote, context: r.context, title: REACTION_STYLE[r.kind]?.label || r.kind, detail: r.text }))
    readings.filter(r => !r.stale).forEach((r, i) => { if (r.claim_quote) anchors.push({ id: `c${i}`, kind: 'claim', quote: r.claim_quote, context: r.claim_context, title: `Source · ${r.label}`, detail: `${r.title} — ${r.why}`, url: r.url, excerpt: r.excerpt }) })
    const TAB_OF_KIND: Record<string, string> = { grammar: 'language', vocabulary: 'language', relevance: 'language', reaction: 'reader', claim: 'sources' }
    const enabled = anchors.filter(a => !disabledTabsRef.current.has(TAB_OF_KIND[a.kind] || ''))
    anchorStore.anchors = enabled; anchorStore.ranges = new Map()
    anchors.length = 0; anchors.push(...enabled)
    for (const a of anchors) { const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r) }
    syncAnchors(editor)
  }, [editor, grammar, issues, reactions, readings])
  useEffect(() => { if (editing) rebuildAnchors(); else { anchorStore.anchors = []; anchorStore.ranges = new Map(); if (editor) syncAnchors(editor) } }, [rebuildAnchors, editing]) // eslint-disable-line
  useEffect(() => {
    const h = (e: MouseEvent) => { const t = e.target as HTMLElement; if (t.closest('.sugg-popup,.popup')) return; if (groupRef.current.length) closePopup(); if (lintGroupRef.current?.length) lint.closeLintGroup(); if (transRef.current) { transRef.current = null; setTransMenu(null) } }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [editor])
  useEffect(() => { if (!showLibrary) return; const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLibrary(false) }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [showLibrary])

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
  /** Underline selected → right dock: switch tab, bolden item, move item to top (same as Suggestions selected row). */
  function highlightDockForAnchor(a: Anchor) {
    const tab = a.kind === 'reaction' ? 'reader' : a.kind === 'claim' ? 'sources' : 'language'
    const key = a.kind === 'claim' ? anchorKey('claim', a.quote) : anchorKey(a.kind, a.quote, a.detail)
    setDockSel({ tab, key }); openRightTab(tab as RightTab)
    if (a.kind === 'grammar') setGrammar(prev => { const i = prev.findIndex(g => anchorKey('grammar', g.quote || '', g.message) === key); return i > 0 ? [prev[i], ...prev.filter((_, k) => k !== i)] : prev })
    else if (a.kind === 'vocabulary' || a.kind === 'relevance') setIssues(prev => { const i = prev.findIndex(x => x.id === a.id); return i > 0 ? [prev[i], ...prev.filter((_, k) => k !== i)] : prev })
    else if (a.kind === 'reaction') setReactions(prev => { const i = prev.findIndex(x => x.id === a.id); return i > 0 ? [prev[i], ...prev.filter((_, k) => k !== i)] : prev })
    else if (a.kind === 'claim') setReadings(prev => [...prev.filter(r => r.claim_quote === a.quote), ...prev.filter(r => r.claim_quote !== a.quote)])
  }
  function openAnchor(a: Anchor, x: number, y: number) { highlightDockForAnchor(a); openGroup(anchorsAt(a), x, y, 0, true) }
  function setActiveIdx(idx: number) {
    const g = groupRef.current; if (!g[idx]) return
    setPopupIdx(idx); idxRef.current = idx; setSelected(g[idx]); anchorStore.linkedId = g[idx].id; highlightDockForAnchor(g[idx]); if (editor) redraw(editor)
  }
  // Tab: advance only — language/reader/sources are advisory, never apply a fix. Only Suggestions insert text.
  function tabPopup(): boolean {
    const g = groupRef.current; if (!g.length) return false
    if (!g[idxRef.current]) return false
    if (idxRef.current + 1 < g.length) { setActiveIdx(idxRef.current + 1); return true }
    closePopup(); return true
  }
  function highlightAnchor(a: Anchor | null) { anchorStore.linkedId = a?.id || null; if (editor) redraw(editor) }

  async function copyBibliography() {
    const d = await api.bibliography(citeStyle, [...facts.map(f => ({ source_title: f.source_title, url: f.url, locator: f.locator })), ...readings.map(r => ({ source_title: r.title, url: r.url, locator: '' }))])
    const entries: string[] = d?.entries || [...facts.map(f => formatInline(f, citeStyle))]
    try { await navigator.clipboard.writeText(entries.join('\n')) } catch { /* clipboard blocked */ }
  }
  function insertFact(f: Fact) { editor?.chain().focus().insertContent(insertCitationText(f, citeStyle, citeTemplate)).run() }
  async function refreshOutline() { if (!editingRef.current || !editor) return; setLoad('outline', true); const d = await api.outline({ text: plain().text }); if (d?.outline) setOutline(d.outline); setLoad('outline', false) }
  function rerunAll() { requestComplete(); requestGrammar(); requestAnnotate(); requestReactions(); refreshMainIdea(); refreshOutline(); if (researchAutoRef.current) refreshReadings(); lint.runLint() }
  refs.current.fns = { complete: requestComplete, grammar: requestGrammar, annotate: requestAnnotate, reactions: requestReactions, accept: acceptGhost, clearGhost, showGhost, closePopup, researchAuto: researchAutoRun, lintAuto: () => lint.runLint() }

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
      if (lint.handleLintKey(e)) return
      if (selectedRef.current || groupRef.current.length) {
        if (e.key === 'Escape') { e.preventDefault(); closePopup(); return }
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); tabPopup(); return }
      }
      if (syn.handleSynonymKey(e)) return
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
      if (a) { const r = t.getBoundingClientRect(); openAnchor(a, r.left + scrollX, r.bottom + 8 + scrollY) }
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
  useEffect(() => { api.health().then(setStatus); if (demo) setTimeout(() => { requestAnnotate(); requestReactions(); requestGrammar(); setReadings(old => old.length ? old : FALLBACK_READINGS) }, 600) }, [editor]) // eslint-disable-line

  // Advisory panels never mutate text — applyAnchor/applySelected removed by design. Only Suggestions (acceptGhost) insert.
  function focusAnchor(a: Anchor) { if (!editor) return; highlightDockForAnchor(a); const tm = plain(); const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r); const pos = editor.view.coordsAtPos(r?.from || editor.state.selection.from); const group = anchorsAt(a); openGroup(group, pos.left + scrollX, pos.bottom + 6 + scrollY, Math.max(0, group.findIndex(g => g.id === a.id)), true) }
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
    catch (e) { setNotice(`DOCX export failed: ${e instanceof Error ? e.message : e}`) }
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
    const c = editor.view.coordsAtPos(editor.state.selection.from); const y = c.bottom + 8 + scrollY
    const m = { x: Math.max(8, Math.min(c.left, innerWidth - 380)) + scrollX, y, h: Math.max(170, innerHeight - (y - scrollY) - 12), cat: null as string | null, query: '' }
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
    else if (d?.error) setNotice(`Research failed: ${d.error}`)
    setLoad('research', false)
  }
  function outlineSectionHtml(o: OutlineDraft, h: number) {
    return `<h${h}>${o.heading}</h${h}><p><em>${o.purpose || ''}</em></p>${(o.points || []).map(pt => `<p>${pt}</p>`).join('')}`
  }
  // Headings in the current draft with doc ranges, for side-by-side outline comparison.
  function docSections(): DocSection[] {
    if (!editor) return []
    const secs: { heading: string; pos: number }[] = []
    editor.state.doc.descendants((n: any, pos: number) => { if (n.type.name === 'heading') secs.push({ heading: n.textContent.trim(), pos }) })
    const end = editor.state.doc.content.size
    return secs.map((s, k) => {
      const from = s.pos, to = k + 1 < secs.length ? secs[k + 1].pos : end
      const preview = editor.state.doc.textBetween(Math.min(from + 1, to), to, '\n\n').trim().slice(0, 160)
      return { heading: s.heading, preview, from, to }
    })
  }
  function matchDocSection(heading: string, secs: DocSection[]): DocSection | null {
    const h = heading.trim().toLowerCase()
    if (!h) return null
    return secs.find(s => { const d = s.heading.toLowerCase(); return d === h || (d && (d.includes(h) || h.includes(d))) }) || null
  }
  function updateOutlineDraft(i: number, patch: Partial<OutlineDraft>) { setOutlineDraft(old => old.map((x, k) => k === i ? { ...x, ...patch } : x)) }
  function insertOutlineSection(i: number, mode: 'append' | 'replace') {
    if (!editor) return
    const o = outlineDraft[i]; if (!o || o.state === 'inserted') return
    const html = outlineSectionHtml(o, 2)
    let done = false
    if (mode === 'replace') {
      const m = matchDocSection(o.heading, docSections())
      if (m) done = editor.chain().focus().deleteRange({ from: m.from, to: m.to }).insertContentAt(m.from, html).run()
    }
    if (!done) { const end = editor.state.doc.content.size; done = editor.chain().focus().insertContentAt(end, html).run() }
    if (done) { setOutlineDraft(old => old.map((x, k) => k === i ? { ...x, state: 'inserted' } : x)); sfxSuccess() }
  }
  function insertAllPendingOutline() { outlineDraft.forEach((o, i) => { if (o.state === 'pending') insertOutlineSection(i, 'append') }) }
  async function generateFromSurvey(override?: any) {
    const answers = override || answersRef.current
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
    const choiceDiction = (answers as any).choices?.diction; if (choiceDiction && DICTIONS.includes(choiceDiction)) next0.level = choiceDiction
    setContext(summary); setLevel(next0.level); setVoice(next0.voice); setTones(tonesNext); setRhythm(next0.rhythm); setGramVoice(next0.gramVoice as any); setClause(next0.clause); setDensity(next0.density); setAudText(next0.audText); setAudLevel(next0.audLevel)
    // Stage outline in its OWN editor; exit wizard; main editor untouched.
    const draft: OutlineDraft[] = ((d.outline || []) as any[]).map(o => ({ heading: String(o.heading || 'Untitled'), purpose: String(o.purpose || ''), points: ((o.points || []) as any[]).map(String), state: 'pending' as const }))
    setOutlineDraft(draft)
    if (outlineEditor && draft.length) outlineEditor.commands.setContent(draft.map((o, i) => outlineSectionHtml(o, i === 0 ? 1 : 2)).join(''))
    setLeftTab('outline'); if (!leftOpen) { setLeftOpen(true); setStr(storageKeys.leftOpen, '1') }
    const next = { ...draftObj(), context: summary, ...next0 }
    appliedRef.current = next as any; setApplied(next as any); setWizardOpen(false)
    setTimeout(() => { requestComplete(); requestAnnotate(); requestReactions(); refreshMainIdea() }, 80); sfxSuccess(); return true
  }
  async function exportDataset() {
    const pairs: any[] = getJSON(storageKeys.dataset, [] as any[])
    if (!pairs.length) { setNotice('No accepted suggestions captured yet. Accept ghost suggestions (Tab) first.'); return }
    const d = await api.dataset(pairs)
    const blob = new Blob([pairs.map(x => JSON.stringify(x)).join('\n')], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'byline_dataset.jsonl'; a.click()
    setNotice(d?.ok ? `Dataset: ${pairs.length} pairs downloaded, server total ${d.total}. Next LoRA step: see lora/README.md` : 'Dataset downloaded locally; backend save failed.')
  }
  function toggleDock(side: 'left' | 'right') { if (side === 'left') { setLeftOpen(v => { setStr(storageKeys.leftOpen, v ? '0' : '1'); return !v }) } else { setRightOpen(v => { setStr(storageKeys.rightOpen, v ? '0' : '1'); return !v }) } }

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
  const cols = `${leftOpen ? (leftTab === 'outline' ? '430px' : '264px') : '52px'} minmax(0,1fr) ${rightOpen ? '348px' : '52px'}`
  return (
    <div>
      <header className="topbar editor-topbar">
        <div className="top-left"><Logo />{demo && <span className="chip" style={{ background: 'var(--ai)' }}>DEMO</span>}</div>
        <div className={`mode-toggle mode-switch ${mode}`} role="tablist" aria-label="Mode">
          <span className="mode-thumb" aria-hidden="true" />
          <button role="tab" aria-selected={mode === 'drafting'} className={mode === 'drafting' ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => switchMode('drafting')}>Drafting</button>
          <button role="tab" aria-selected={mode === 'editing'} className={mode === 'editing' ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => switchMode('editing')}>Editing</button>
        </div>
        <div className="top-right">
        {anyLoading && <span className="ai-loading"><Spinner /> AI working</span>}
        {appSettings.showMetrics && <button className="metric" style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => setShowMetrics(true)} title="Open metrics & benchmarks">Ghost taken {acc}% ({metrics.accepted}/{metrics.offered}) · {avgMs}ms avg · {status?.model || 'offline'}</button>}
        <span className="dot" role="img" aria-label={status?.meta_configured ? 'Backend connected' : 'Backend offline'} style={{ background: status?.meta_configured ? 'var(--success)' : 'var(--lt)' }} title={status?.meta_configured ? 'Backend connected' : 'Backend offline'} /><span className="meta status-text">{status?.meta_configured ? 'Connected' : 'Offline'}</span>
        <a className={`nav-btn ${location.pathname.startsWith('/app') ? 'active' : ''}`} href="/app">App</a>
        <a className={`nav-btn ${location.pathname.startsWith('/demo') ? 'active' : ''}`} href="/demo">Demo</a>
        <button className="icon-btn settings-icon" onClick={() => { blip('open'); setShowSettings(true) }} title="Settings (Ctrl+,)" aria-label="Settings"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        </div>
      </header>

      <div className="layout" style={{ gridTemplateColumns: cols }}>
        <aside className="rail" onClickCapture={e => { if ((e.target as HTMLElement).closest('button')) blip('select') }}>
          {!leftOpen ? <div className="rail-strip"><button onClick={() => toggleDock('left')} title="Expand">›</button>{(['write','style','outline'] as LeftTab[]).map(ic => <button key={ic} title={ic} aria-label={ic} onClick={() => { setLeftTab(ic); toggleDock('left') }}>{ic[0].toUpperCase()}</button>)}</div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>{leftTab === 'write' ? 'Write' : leftTab === 'style' ? 'Style' : 'Outline'}</strong><button onClick={() => toggleDock('left')} title="Collapse">‹</button></div>
            <div className="dock-tabs" role="tablist" aria-label="Write settings">
              {(['write', 'style', 'outline'] as LeftTab[]).map(t => <button key={t} role="tab" aria-selected={leftTab === t} className={leftTab === t ? 'active' : ''} onClick={() => setLeftTab(t)}>{t === 'write' ? 'Write' : t === 'style' ? 'Style' : 'Outline'}{tabDirty[t] && <span className="tab-dot" title="Unapplied changes" />}</button>)}
            </div>
            <div className="rail-scroll">
            {leftTab === 'write' && <>
            <div className="dock"><h3>Context</h3>
              <textarea className="context-box" value={context} onChange={e => { setContext(e.target.value); setStale(true) }} placeholder="What should the finished text be about?" aria-label="Context" />
            </div>
            <div className="dock"><h3>Diction</h3>
              <select style={{ width: '100%' }} value={level} onChange={e => setLevel(e.target.value)} aria-label="Diction">{DICTIONS.map(l => <option key={l}>{l}</option>)}</select>
              <label>Assist</label><select style={{ width: '100%' }} value={assist} onChange={e => setAssist(e.target.value)}>{ASSISTS.map(l => <option key={l}>{l}</option>)}</select>
              <div className="meta">{ASSIST_DESCRIPTIONS[assist] || ''}</div>
              <label>Reader persona</label><select style={{ width: '100%' }} value={persona} onChange={e => setPersona(e.target.value)}>{PERSONAS.map(l => <option key={l}>{l}</option>)}</select>
            </div>
            </>}
            {leftTab === 'style' && <>
            <div className="dock"><h3>Tone</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{TONES.map(t => { const st = tones[t]; return <button key={t} className={`tone-tag ${st || ''}`} title={`${t}: ${st === 'allow' ? 'allowed' : st === 'ban' ? 'not allowed' : 'off'} — click to cycle`} aria-label={`${t}, ${st === 'allow' ? 'allowed' : st === 'ban' ? 'not allowed' : 'off'}`} onClick={() => cycleTone(t)}>{t}</button> })}</div>
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
            <div className="dock outline-dock"><h3>Outline editor</h3>
              <div className="meta" style={{ marginBottom: 8 }}>Edit outline here · main editor stays separate · saves automatically.</div>
              <div className="outline-dock-editor">{outlineEditor ? <EditorContent editor={outlineEditor} /> : <div className="meta">No outline yet — run Setup.</div>}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setWizardOpen(true)}>Regenerate…</button>
              </div>
            </div>
            </>}
            </div>
            <div className="rail-foot"><button className="primary" disabled={!dirty} onClick={applySettings} style={{ width: '100%' }}>Apply settings{dirty ? ' ●' : ''}</button></div>
          </>}
        </aside>

        <main>
          {notice && <div className="notice-bar" role="alert"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button></div>}
          {!demo && counts.words === 0 && <div className="notice-bar"><span>Start writing — suggestions appear as you type.</span><button className="primary" onClick={() => setWizardOpen(true)}>Run Setup for an outline</button></div>}
          {demo && <div className="demo-steps"><strong>Demo flow:</strong><span>{metrics.accepted > 0 ? 'Done —' : 'Todo —'} 1 Drafting — accept a suggestion (Tab)</span><span>{mode === 'editing' ? 'Done —' : 'Todo —'} 2 Editing — switch mode, click a red underline</span><span>{readings.length ? 'Done —' : 'Todo —'} 3 Sources — check evidence verdicts</span><span>{lintResults.length ? 'Done —' : 'Todo —'} 4 Lint — auto yellow checks</span></div>}
          <EditorMenus editor={editor} counts={counts} showWordCount={appSettings.showWordCount} onSuggest={() => requestComplete()} onSentenceStarter={openTransMenu} onWizard={() => setWizardOpen(true)} onExportDocx={doExportDocx} onExportHtml={doExportHtml} onExportDataset={exportDataset} exportingDocx={!!loading.docx} />
          <div className="editor-pane-label">Main editor</div>
          <div className="paper" onDoubleClick={onDblClick}>
            <EditorContent editor={editor} />
            {collectFootnotes(editor.getJSON()).length > 0 && <div className="footnotes"><hr />{collectFootnotes(editor.getJSON()).map(n => <div key={n.id} className="footnote-item"><sup>{n.label}</sup> {n.content}</div>)}</div>}
          </div>
          <div className="status-strip"><span>{counts.words} words · {counts.chars} chars</span><span>{mode}</span>{demo && <span>demo</span>}</div>
        </main>

        <aside className={`rail right-rail ${mode === 'drafting' ? 'ai-off' : ''}`} onClickCapture={e => { if ((e.target as HTMLElement).closest('button')) blip('select') }}>
          {!rightOpen ? <div className="rail-strip"><button onClick={() => toggleDock('right')} title="Expand">‹</button>{RIGHT_TAB_ORDER.map(ic => <button key={ic} title={TAB_THEME[ic].label} aria-label={TAB_THEME[ic].label} className={disabledTabs.has(ic) ? 'tab-disabled' : ''} style={{ borderColor: TAB_THEME[ic].color, color: TAB_THEME[ic].color }} onClick={() => { openRightTab(ic as RightTab); if (!editing && ic !== 'suggest') switchMode('editing') }} onDoubleClick={e => { e.preventDefault(); e.stopPropagation(); toggleTabDisabled(ic) }}>{({ language: 'La', reader: 'Rd', sources: 'So', suggest: 'Su', lint: 'Li' } as Record<string, string>)[ic]}</button>)}</div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>{TAB_THEME[rightTab]?.label || 'Suggest'}</strong><button onClick={() => toggleDock('right')} title="Collapse">›</button></div>
            <div className="dock-tabs" role="tablist" aria-label="Read panels">
              {RIGHT_TAB_ORDER.map(k => {
                if (k !== 'suggest' && !editing) return null
                const count = k === 'language' ? grammar.length + issues.length : k === 'lint' ? lintResults.length : k === 'reader' ? reactions.length : k === 'sources' ? readings.length : suggestions.length
                const busy = k === 'language' ? (loading.grammar || loading.annotate) : k === 'lint' ? loading.lint : k === 'reader' ? (loading.reactions || loading.main) : k === 'sources' ? loading.readings : loading.complete
                const activeTab = k === 'suggest' ? (rightTab === 'suggest' || !editing) : rightTab === k
                const tabOff = disabledTabs.has(k)
                return <button key={k} role="tab" aria-selected={activeTab} data-disabled={tabOff || undefined} className={`${activeTab ? 'active' : ''} ${tabOff ? 'tab-disabled' : ''}`} title={tabOff ? `${TAB_THEME[k].label} disabled — double-click to re-enable` : `Double-click to disable all ${TAB_THEME[k].label} underlines`} style={{ borderColor: TAB_THEME[k].color, boxShadow: activeTab ? `inset 0 -3px 0 ${TAB_THEME[k].color}` : undefined }} onClick={() => setRightTab(k as RightTab)} onDoubleClick={e => { e.preventDefault(); e.stopPropagation(); toggleTabDisabled(k) }}>{TAB_THEME[k].label}{count > 0 && <span className="tab-badge">{count}</span>}{busy ? <Spinner /> : null}</button>
              })}
            </div>
            <div className="rail-scroll">
            {editing && rightTab === 'language' && <><div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--lt)' }} />Language{(loading.grammar || loading.annotate) && <Spinner />}</h3>
              <div className="dock-scroll">
              <div className="meta">Double-click Language tab → disable all language underlines.</div>
              {grammar.map((g, i) => { const key = anchorKey('grammar', g.quote || '', g.message); const sel = dockSel?.tab === 'language' && dockSel.key === key; const a = anchorStore.anchors.find(x => x.id === `g${i}-${g.from}`); const st = LANG_STYLE.grammar; return <div key={`g${i}`} {...keyAct(() => a && focusAnchor(a))} className={`dock-item ${sel ? 'dock-selected' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label}</div><span className="quote-serif">{g.quote || ''}</span><div className="reason-text">{g.message}</div></div> })}
              {issues.map(it => { const key = anchorKey(it.type === 'vocabulary' ? 'vocabulary' : 'relevance', it.quote, it.reason); const sel = dockSel?.tab === 'language' && dockSel.key === key; const a = anchorStore.anchors.find(x => x.id === it.id); const st = LANG_STYLE[it.type]; return <div key={it.id} {...keyAct(() => a && focusAnchor(a))} className={`dock-item ${sel ? 'dock-selected' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label}</div><span className="quote-serif">{it.quote}</span><div className="reason-text">{it.reason}</div></div> })}
              {!grammar.length && !issues.length && <div className="meta">No language checks yet — they appear in Editing mode.</div>}
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
              {outline.map((o, i) => <div key={i} {...keyAct(() => focusAnchor({ id: `o${i}`, kind: 'reaction', quote: o.quote, context: o.context, title: 'Outline', detail: o.label }))} className="dock-item" onClick={() => focusAnchor({ id: `o${i}`, kind: 'reaction', quote: o.quote, context: o.context, title: 'Outline', detail: o.label })}>{o.label}<div className="meta">“{o.quote}”</div></div>)}
              <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={refreshOutline}>Outline</button>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--ai)' }} />Reader{loading.reactions && <Spinner />}</h3>
              <div className="dock-scroll">
              <div className="meta">Double-click Reader tab → disable all reader underlines.</div>
              {reactions.map(r => { const key = anchorKey('reaction', r.quote, r.text); const sel = dockSel?.tab === 'reader' && dockSel.key === key; const a = anchorStore.anchors.find(x => x.id === r.id); const st = REACTION_STYLE[r.kind]; return <div key={r.id} {...keyAct(() => a && focusAnchor(a))} className={`dock-item ${sel ? 'dock-selected' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label}</div><span className="quote-serif">{r.quote}</span><div className={`kind-body ${r.kind === 'question' ? 'q' : r.kind === 'critique' ? 'crit' : r.kind === 'comment' ? 'comm' : ''}`} style={r.kind === 'compliment' ? { color: st.color, fontWeight: 600 } : undefined}>“{r.text}”</div></div> })}
              {!reactions.length && <div className="meta">No reader reactions yet.</div>}
              </div><div className="dock-foot"><button disabled={!editing} onMouseDown={e => e.preventDefault()} onClick={requestReactions}>Refresh</button></div>
            </div>
            </>}
            {editing && rightTab === 'sources' && <>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--blue)' }} />Active config</h3>
              {activeConfig ? <><div className="meta">{activeConfig.configuration_id} · {activeConfig.dimensions.diction} · {activeConfig.dimensions.tone}</div>
                <div className="meta">Rules: {activeConfig.active_preset_rules.join(', ')}{activeConfig.custom_rules.length ? ` +${activeConfig.custom_rules.length} custom` : ''}</div>
                <div className="meta">Ghost: {activeConfig.ghost_text_filters.allowed_transitions.join(' · ')}</div></>
                : <div className="meta">No config yet — open Setup.</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><button onMouseDown={e => e.preventDefault()} onClick={() => setWizardOpen(true)}>Setup</button>
              {activeConfig && <button onMouseDown={e => e.preventDefault()} onClick={() => { removeKey(storageKeys.configActive); setActiveConfig(null) }}>Clear</button>}</div>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--blue)' }} />Sources{loading.readings && <Spinner />}</h3>
              <div className="dock-scroll">
              <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                <div className="meta">Blue highlight = claim in your draft. Blue squiggle = related source found.</div>
                <input value={researchUrl} onChange={e => setResearchUrl(e.target.value)} placeholder="Search other: paste URL, text, or a question…" aria-label="Search other sources" />
                <input value={researchQ} onChange={e => setResearchQ(e.target.value)} placeholder="Focus question (optional)" aria-label="Focus question" />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="primary" disabled={!!loading.research} onMouseDown={e => e.preventDefault()} onClick={() => { if (/^https?:\/\//i.test(researchUrl.trim())) runResearch(); else refreshReadings() }}>{loading.research ? 'Searching…' : 'Search other'}</button>
                  <label className="nav-btn" style={{ cursor: 'pointer' }}>Upload file / image<input type="file" hidden accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx,.csv,.xlsx,.tsv" onChange={e => { const f = e.target.files?.[0]; if (f) runResearch(f); e.target.value = '' }} /></label>
                </div>
              </div>
              {facts.map((f, i) => <div key={i} className="source-card"><span className="source-badge">Fact{f.locator ? ` · ${f.locator}` : ''}</span><div className="source-why">{f.fact}</div><div className="source-excerpt"><a href={safeUrl(f.url || '#')} target="_blank" rel="noreferrer">{f.source_title || f.url}</a>{f.excerpt ? ` — “${f.excerpt}”` : ''}</div><button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={() => insertFact(f)}>Insert citation</button></div>)}
              <div className="meta">Grouped by claim · double-click Sources tab → disable all source highlights.</div>
              {groupByClaim(readings).map((grp, gi) => { const key = anchorKey('claim', grp.claim); const sel = dockSel?.tab === 'sources' && dockSel.key === key; return <div key={gi} className={`source-card claim-group ${sel ? 'dock-selected' : ''}`}><span className="source-badge">Claim · {grp.items.length} source{grp.items.length === 1 ? '' : 's'}</span><div className="source-why">“{grp.claim}”</div><div className="claim-links">{grp.items.map((r, i) => <div key={i} className="claim-link"><span className={`source-badge verdict-${(r as any).verdict || r.label}`}>{(r as any).verdict || r.label}</span> <a href={textFragmentUrl(safeUrl(r.url), r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a>{(r as any).domain && <span className="meta"> · {(r as any).domain}</span>}</div>)}</div></div> })}
              {!readings.length && !facts.length && <div className="meta">No sources yet — search a claim above.</div>}
              </div><div className="dock-foot"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button className="primary" disabled={!editing} onMouseDown={e => e.preventDefault()} onClick={refreshReadings}>{loading.readings ? 'Searching claims…' : 'Search blue highlights'}</button><button onMouseDown={e => e.preventDefault()} onClick={() => setShowSources(true)}>Library ({facts.length + readings.length})</button></div></div>
            </div>
            </>}
            {(rightTab === 'suggest' || !editing) && <div className="dock dock-section suggest-dock"><h3><span className="swatch" style={{ background: 'var(--grey)' }} />Suggestions{loading.complete && <Spinner />}</h3>
              <div className="dock-scroll">
              {suggestions.map((s, i) => <div key={`s${i}`} {...keyAct(() => acceptGhost(i))} className={`ghost-row ${i === ghostIdx ? 'sel' : ''}`} onClick={() => acceptGhost(i)}><span className="quote-serif">{s}</span></div>)}
              {suggHistory.map((s, i) => <div key={`h${i}`} className="ghost-row">{s}</div>)}
              {loading.complete && !suggestions.length && <div className="meta"><LoadingDots /></div>}{!suggestions.length && !suggHistory.length && !loading.complete && <div className="meta">No suggestions yet — keep writing, or press Ctrl+Space.</div>}
              </div>
              {suggestions.length > 0 && <div className="dock-foot"><button onClick={() => clearGhost()}>Dismiss <span className="kbd">Esc</span></button></div>}
            </div>}
            {editing && rightTab === 'lint' && <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--yellow)' }} />Lint {loading.lint && <Spinner />}</h3>
              <div className="dock-scroll">
              <div className="meta">Double-click Lint tab → disable all lint underlines. Advisory only — no fix/apply.</div>
              {lintResults.map(r => { const rule = LINTER_RULE_LIBRARY.find(x => x.id === r.rule_id); const sel = r.uid === lintSelUid || (dockSel?.tab === 'lint' && dockSel.key === lintKeyOf(r)); return <div key={r.uid} {...keyAct(() => openLintGroup(r))} className={`dock-item ${sel ? 'dock-selected' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => openLintGroup(r)}><div className="kind-label" style={{ color: 'var(--yellow)' }}>{LINT_COLORS[r.color_category]?.label || r.color_category} · {rule?.name || r.rule_id}</div><span className="quote-serif">{r.target}</span><div className="reason-text">{r.message}</div></div> })}
              {!lintResults.length && !loading.lint && <div className="meta">No results.</div>}
              {loading.lint && !lintResults.length && <div className="meta"><LoadingDots /></div>}
              </div><div className="dock-foot"><div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><button className="primary" onMouseDown={e => e.preventDefault()} onClick={runLint}>{loading.lint ? 'Linting…' : 'Re-run lint'}</button><button onMouseDown={e => e.preventDefault()} onClick={() => setShowLibrary(true)}>Rule library</button></div>{lintStatus && <div className="meta" style={{ marginTop: 6 }}>{lintStatus}</div>}</div>
            </div>}
            </div>
          </>}
        </aside>
      </div>

      {showSettings && <SettingsMenu settings={appSettings} onChange={updateSettings} onClose={() => setShowSettings(false)} />}
      {showMetrics && <MetricsPopup summary={`Ghost taken ${acc}% (${metrics.accepted}/${metrics.offered}) · ${avgMs}ms avg · ${status?.model || 'offline'}`} onClose={() => setShowMetrics(false)} />}
      {showLibrary && (
        <div className="library-backdrop" onMouseDown={() => setShowLibrary(false)}>
          <div className="library-modal fade" role="dialog" aria-label="Rule library" onMouseDown={e => e.stopPropagation()}>
            <div className="library-head"><strong>Rule library</strong><span className="meta">{enabledRules.size + customRules.length} active</span><span className="spacer" /><button onClick={() => setShowLibrary(false)}>Close <span className="kbd">Esc</span></button></div>
            <div className="library-scroll">
              {Object.entries(LINT_COLORS).map(([color, meta]) => <div key={color} style={{ marginBottom: 18 }}>
                <div className="kind-label" style={{ color: 'var(--yellow)', fontSize: 12 }}>{meta.label} · {meta.intent}</div>
                {LINTER_RULE_LIBRARY.filter(r => r.color === color).map(r => <div key={r.id} className="library-rule">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><button className={`tone-tag ${enabledRules.has(r.id) ? 'allow' : ''}`} onClick={() => toggleRule(r.id)}>{enabledRules.has(r.id) ? 'Enabled' : 'Enable'}</button><strong>{r.name}</strong><span className="meta">{r.id}</span></div>
                  <p>{r.description}</p>
                  <p className="meta"><strong>Rule:</strong> {r.instruction}</p>
                  {r.example_violation && <div className="library-example"><div><span className="kind-label" style={{ color: 'var(--lt)' }}>Violation</span> <span className="quote-serif">“{r.example_violation}”</span></div><div><span className="kind-label" style={{ color: 'var(--yellow)' }}>Fix</span> <span className="quote-serif">“{r.example_fix}”</span></div></div>}
                </div>)}
              </div>)}
              <div className="kind-label" style={{ color: 'var(--yellow)', fontSize: 12 }}>Custom rules · yellow</div>
              {customRules.map((t, i) => <div key={i} className="library-rule"><span className="tone-tag allow">Enabled</span> <strong>CUSTOM_{String(i + 1).padStart(2, '0')}</strong><button style={{ float: 'right' }} aria-label="Delete custom rule" onClick={() => { const n = customRules.filter((_, j) => j !== i); setCustomRules(n); setJSON(storageKeys.customRules, n) }}>Delete</button><p>{t}</p></div>)}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}><input style={{ flex: 1 }} value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Add custom rule — e.g. no passive voice in headers" onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { const n = [...customRules, customInput.trim()]; setCustomRules(n); setJSON(storageKeys.customRules, n); setCustomInput('') } }} /><button className="primary" onClick={() => { if (!customInput.trim()) return; const n = [...customRules, customInput.trim()]; setCustomRules(n); setJSON(storageKeys.customRules, n); setCustomInput('') }}>Add rule</button></div>
            </div>
          </div>
        </div>
      )}
      {showSources && <SourcesLibrary citeStyle={citeStyle} setCiteStyle={(v: any) => { setCiteStyle(v); setStr(storageKeys.citeStyle, v) }} citeTemplate={citeTemplate} setCiteTemplate={setCiteTemplate} researchAuto={researchAuto} setResearchAuto={(v: boolean) => { setResearchAuto(v); setStr(storageKeys.researchAuto, v ? '1' : '0') }} onCopyBibliography={copyBibliography} formatFact={(f: Fact) => formatInline(f, citeStyle)} facts={facts} readings={readings} onClose={() => setShowSources(false)} onDeleteFact={f => setFacts(old => old.filter(x => !(x.fact === f.fact && x.url === f.url)))} onDeleteReading={r => setReadings(old => old.filter(x => !(x.url === r.url && x.claim_quote === r.claim_quote)))} onClear={() => { setFacts([]); setReadings([]) }} onInsertFact={f => { insertFact(f); setShowSources(false) }} />}
      {wizardOpen && <SetupWizard answers={answers} setAnswers={f => setAnswers(f as any)} onClose={() => setWizardOpen(false)} onGenerate={generateFromSurvey} generating={!!loading.outlinegen} tab={wizardTab} setTab={setWizardTab}
        outline={{ draft: outlineDraft, sections: docSections(), onInsert: insertOutlineSection, onInsertAll: insertAllPendingOutline, onSkip: (i) => setOutlineDraft(old => old.map((x, k) => k === i ? { ...x, state: 'skipped' } : x)), onRegenerate: () => generateFromSurvey(), generating: !!loading.outlinegen, onUpdate: updateOutlineDraft }} />}
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
            <div key={r.uid} {...keyAct(() => lint.selectLintIdx(i))} className={`stack-card ${active ? 'active' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => lint.selectLintIdx(i)}>
              <span className="chip" style={{ background: 'var(--yellow)' }}>{LINT_COLORS[r.color_category]?.label || r.color_category}</span><span className="stack-order">{i + 1}/{lintGroup.length}</span>
              <div className="quote-serif" style={{ marginTop: 6 }}>“{r.target}”</div>
              <div style={{ fontWeight: 600, marginTop: 2, fontSize: 12.5 }}>{rule?.name || r.rule_id}</div>
              {active && <><p style={{ margin: '6px 0' }}>{r.message}</p><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); lint.handleLintKey({ key: 'Tab', preventDefault() {}, stopPropagation() {} } as any) }}>Next <span className="kbd">Tab</span></button></>}
            </div>) })}
          <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={() => lint.closeLintGroup()}>Close <span className="kbd">Esc</span></button>
        </div>
      )}
      {selected && popupGroup.length > 0 && (
        <div className="popup popup-stack fade" ref={popupRef} role="dialog" style={{ left: popupPos.x, top: popupPos.y, maxHeight: popupPos.h }}
          onMouseEnter={() => { popupHoverRef.current = true }} onMouseLeave={() => { popupHoverRef.current = false; if (!pinnedRef.current) closePopup() }}>
          {popupGroup.map((a, i) => {
            const active = i === popupIdx
            const chipColor = a.kind === 'grammar' ? 'var(--lt)' : a.kind === 'claim' ? 'var(--blue)' : a.kind === 'vocabulary' || a.kind === 'relevance' ? 'var(--lt)' : 'var(--ai)'
            const chipLabel = a.kind === 'grammar' ? 'Grammar' : a.kind === 'vocabulary' ? 'Word choice' : a.kind === 'relevance' ? 'Cohesion' : a.kind === 'claim' ? 'Source' : REACTION_STYLE[a.tone || '']?.label || a.tone || 'Reader'
            return (
              <div key={a.id} {...keyAct(() => setActiveIdx(i))} className={`stack-card ${active ? 'active' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => setActiveIdx(i)}>
                <span className="chip" style={{ background: chipColor }}>{chipLabel}</span>
                <span className="stack-order">{i + 1}/{popupGroup.length}</span>
                <div className="quote-serif" style={{ marginTop: 6 }}>“{a.quote}”</div>
                {active && <>
                  <p style={{ margin: '6px 0' }}>{a.detail}</p>
                  {a.url && <p style={{ margin: '6px 0' }}><a href={textFragmentUrl(safeUrl(a.url), a.excerpt || a.quote)} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontWeight: 600 }}>Open source ↗</a></p>}
                  <button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); tabPopup() }}>Next <span className="kbd">Tab</span></button>
                  {(a.kind === 'grammar' || a.kind === 'vocabulary') && !a.quote.includes(' ') && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('ignore', a.quote) }}>Ignore word</button><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('spelling', a.quote) }}>Add to dictionary</button></div>}
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
