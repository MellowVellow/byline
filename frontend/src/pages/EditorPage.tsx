import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { AnchorDecorations, anchorStore, redraw, syncAnchors, syncGhost } from '../editor/decorations'
import { api } from '../lib/api'
import { docToText, locateQuote, locateOffset } from '../lib/locate'
import type { Anchor, Issue, Reaction, GrammarMatch, Reading, OutlineItem } from '../lib/types'
import { SAMPLE_DOC, SAMPLE_CONTEXT, FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_SUGGESTIONS } from '../lib/fallback'
import { Logo, ThemeToggle } from '../components/Brand'
import { textFragmentUrl } from '../lib/link'
import { sentenceCase } from '../lib/case'

const LEVELS = ['Slang', 'Simple', 'General', 'Technical', 'Academic', 'Expert', 'Buzzwords']
const VOICES = ['', 'Poetic', 'GenZ']
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
// Tab / stack order, left-to-right as specified: red, yellow, blue, purple
export const LAYER_ORDER: Record<string, number> = { grammar: 0, vocabulary: 1, claim: 2, relevance: 3, reaction: 3 }
export function sortByLayer(anchors: Anchor[]): Anchor[] {
  return [...anchors].sort((a, b) => (LAYER_ORDER[a.kind] ?? 9) - (LAYER_ORDER[b.kind] ?? 9))
}

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('byline.doc.v2') || 'null') } catch { return null } })()
  const [context, setContext] = useState(demo ? SAMPLE_CONTEXT : (saved?.context || ''))
  const [level, setLevel] = useState(saved?.level || 'General')
  const [voice, setVoice] = useState('')
  const [assist, setAssist] = useState('Phrase')
  const [persona, setPersona] = useState(PERSONAS[0])
  // left-dock edits are STAGED until Apply; AI calls always read appliedRef
  const [applied, setApplied] = useState(() => ({ context: demo ? SAMPLE_CONTEXT : (saved?.context || ''), level: saved?.level || 'General', voice: '', assist: 'Phrase', persona: PERSONAS[0] }))
  const appliedRef = useRef(applied); appliedRef.current = applied
  const dirty = applied.context !== context || applied.level !== level || applied.voice !== voice || applied.assist !== assist || applied.persona !== persona
  function applySettings() {
    const next = { context, level, voice, assist, persona }
    appliedRef.current = next; setApplied(next)
    requestComplete(); requestAnnotate(); requestReactions(); refreshMainIdea()
  }
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [ghostIdx, setGhostIdx] = useState(0)
  const [issues, setIssues] = useState<Issue[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [grammar, setGrammar] = useState<GrammarMatch[]>([])
  const [readings, setReadings] = useState<Reading[]>([])
  const [outline, setOutline] = useState<OutlineItem[]>([])
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
  const [metrics, setMetrics] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('byline.metrics.v2') || '{"shown":0,"accepted":0,"ms":0}') } catch { return { shown: 0, accepted: 0, ms: 0 } } })
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [synPos, setSynPos] = useState({ x: 200, y: 200, h: 400 })
  const [synRange, setSynRange] = useState<{ from: number; to: number } | null>(null)
  const [suggHistory, setSuggHistory] = useState<string[]>([])
  const [aiEnabled, setAiEnabled] = useState(() => { const v = localStorage.getItem('byline.aiEnabled') ?? localStorage.getItem('byline.suggEnabled'); return v !== '0' })
  const aiEnabledRef = useRef(true); aiEnabledRef.current = aiEnabled
  function toggleAI() {
    setAiEnabled(v => { const n = !v; localStorage.setItem('byline.aiEnabled', n ? '1' : '0'); if (!n) {
      // stop everything + strip all AI visuals now
      refs.current.abort?.abort(); clearTimeout(refs.current.timers.c); clearTimeout(refs.current.timers.g); clearTimeout(refs.current.timers.s)
      anchorStore.ghost = ''; anchorStore.anchors = []; anchorStore.ranges = new Map(); anchorStore.linkedId = null
      refs.current.sugg = []; setSuggestions([]); setPopupGroup([]); setSelected(null)
      if (editor) { syncGhost(editor); syncAnchors(editor); redraw(editor) }
    } return n })
  }
  const [suggPos, setSuggPos] = useState({ x: 200, y: 300, h: 500 })
  const synRef = useRef<string[]>([]); synRef.current = synonyms
  const synRangeRef = useRef<{ from: number; to: number } | null>(null)
  const [busy, setBusy] = useState('')
  const [leftOpen, setLeftOpen] = useState(localStorage.getItem('byline.leftOpen') !== '0')
  const [rightOpen, setRightOpen] = useState(localStorage.getItem('byline.rightOpen') !== '0')
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
    setGrammar(xs => xs.filter(g => (g.quote || '').toLowerCase() !== w.toLowerCase()))
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

  const record = (patch: any) => setMetrics((m: any) => { const n = { ...m }; for (const k in patch) n[k] = typeof patch[k] === 'function' ? patch[k](m[k] || 0) : patch[k]; localStorage.setItem('byline.metrics.v2', JSON.stringify(n)); return n })

  const editor = useEditor({
    extensions: [StarterKit, AnchorDecorations, Highlight, TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount],
    editorProps: { attributes: { spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' } },
    content: demo ? SAMPLE_DOC : (saved?.html || '<p></p>'),
    onSelectionUpdate: ({ editor }) => { setTick(t => t + 1); const pos = editor.state.selection.from; const movedBack = pos < prevPosRef.current; prevPosRef.current = pos; if (movedBack) (refs.current as any).suppressAuto = true; if (movedBack) { if (groupRef.current.length) refs.current.fns.closePopup?.(); if (anchorStore.ghost) refs.current.fns.clearGhost?.() } else if (anchorStore.ghost && pos !== anchorStore.ghostPos) refs.current.fns.clearGhost?.() },
    onUpdate: ({ editor }) => {
      if (groupRef.current.length) refs.current.fns.closePopup?.()
      try { setCounts({ words: (editor.storage as any).characterCount.words(), chars: (editor.storage as any).characterCount.characters() }) } catch { /* noop */ }
      refs.current.version++; refs.current.abort?.abort(); setStale(true)
      localStorage.setItem('byline.doc.v2', JSON.stringify({ html: editor.getHTML(), context, level }))
      const t = refs.current.timers
      clearTimeout(t.c); clearTimeout(t.g); clearTimeout(t.s)
      t.c = setTimeout(() => refs.current.fns.complete?.(true), 500)
      t.g = setTimeout(() => refs.current.fns.grammar?.(), 900)
      t.s = setTimeout(() => { refs.current.fns.annotate?.(); refs.current.fns.reactions?.() }, 1400)
    },
  })

  const plain = useCallback(() => editor ? docToText(editor) : { text: '', map: [] as number[] }, [editor])

  const rebuildAnchors = useCallback(() => {
    if (!editor) return
    const tm = docToText(editor); const anchors: Anchor[] = []
    grammar.filter(g => !g.stale).forEach((g, i) => anchors.push({ id: `g${i}-${g.from}`, kind: 'grammar', tone: 'grammar', quote: tm.text.slice(g.from, g.to), context: tm.text.slice(Math.max(0, g.from - 30), g.to + 30), title: 'Grammar', detail: g.message, replacement: g.replacements[0] || '' }))
    issues.filter(it => !it.stale).forEach(it => anchors.push({ id: it.id || nid(), kind: it.type === 'vocabulary' ? 'vocabulary' : 'relevance', tone: it.type, quote: it.quote, context: it.context, title: it.type === 'vocabulary' ? 'Word choice' : 'Cohesion', detail: it.reason, replacement: it.replacement }))
    reactions.filter(r => !r.stale).forEach(r => anchors.push({ id: r.id || nid(), kind: 'reaction', tone: r.kind, quote: r.quote, context: r.context, title: `Reader · ${REACTION_STYLE[r.kind]?.label || r.kind}`, detail: r.text }))
    readings.filter(r => !r.stale).forEach((r, i) => { if (r.claim_quote) anchors.push({ id: `c${i}`, kind: 'claim', quote: r.claim_quote, context: r.claim_context, title: `Source · ${r.label}`, detail: `${r.title} — ${r.why}`, url: r.url, excerpt: r.excerpt }) })
    anchorStore.anchors = anchors; anchorStore.ranges = new Map()
    for (const a of anchors) { const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r) }
    syncAnchors(editor)
  }, [editor, grammar, issues, reactions, readings])
  useEffect(() => { if (aiEnabled) rebuildAnchors(); else { anchorStore.anchors = []; anchorStore.ranges = new Map(); if (editor) syncAnchors(editor) } }, [rebuildAnchors, aiEnabled]) // eslint-disable-line

  function showGhost(idx: number) {
    if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from; const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    anchorStore.ghost = (before && !/\s/.test(before) ? ' ' : '') + s; anchorStore.ghostPos = pos; syncGhost(editor)
  }
  function archiveSuggestions(list: string[]) { if (list.length) setSuggHistory(h => [...list.filter(s => !h.includes(s)), ...h].slice(0, 30)) }
  function clearGhost(moveToHistory = true) { if (moveToHistory) archiveSuggestions(refs.current.sugg); anchorStore.ghost = ''; refs.current.sugg = []; setSuggestions([]); if (editor) syncGhost(editor) }
  function acceptGhost(idx: number) {
    if (!editor) return
    const s = refs.current.sugg[idx]; if (!s) return
    const pos = editor.state.selection.from; const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    editor.chain().focus().insertContent((before && !/\s/.test(before) ? ' ' : '') + s).run()
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
  function openGroup(group: Anchor[], x: number, y: number, start = 0, pinned = false) {
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
    if (!aiEnabledRef.current) return // AI off: zero suggestion calls / tokens
    if (!editor || refs.current.version === refs.current.acceptedVersion) return
    if (auto && (refs.current as any).suppressAuto) return // went back to revise: no auto popup until Suggest pressed
    if (!auto) (refs.current as any).suppressAuto = false
    if (auto && !atBlockEnd()) return // mid-sentence / between sentences: only on Suggest press
    const pos = editor.state.selection.from
    const before = editor.state.doc.textBetween(0, pos, '\n\n'); const after = editor.state.doc.textBetween(pos, editor.state.doc.content.size, '\n\n')
    if (!before.trim()) return
    const ctl = new AbortController(); refs.current.abort = ctl; const t0 = performance.now()
    const A = appliedRef.current; const d = await api.complete({ context: A.context, level: A.level, voice: A.voice, assist_level: A.assist, before: before.slice(-1200), after: after.slice(0, 400), version: refs.current.version }, ctl.signal)
    const sugg: string[] = (d?.suggestions?.length ? d.suggestions : (demo ? FALLBACK_SUGGESTIONS : [])).slice(0, 3).map((x: string) => sentenceCase(before, x))
    if (!sugg.length || ctl.signal.aborted) return
    archiveSuggestions(refs.current.sugg.filter(s => !sugg.includes(s)))
    refs.current.sugg = sugg; setSuggestions(sugg); setGhostIdx(0); refs.current.idx = 0
    record({ shown: (v: number) => v + sugg.length, ms: Math.round(performance.now() - t0) })
    const pos2 = editor.state.selection.from; const b2 = editor.state.doc.textBetween(Math.max(0, pos2 - 1), pos2)
    anchorStore.ghost = (b2 && !/\s/.test(b2) ? ' ' : '') + sugg[0]; anchorStore.ghostPos = pos2; syncGhost(editor)
    const c = editor.view.coordsAtPos(pos2); const y = c.bottom + 8; setSuggPos({ x: Math.max(8, Math.min(c.left, innerWidth - 380)), y, h: Math.max(170, innerHeight - y - 12) })
    redraw(editor)
  }
  async function requestGrammar() { if (!aiEnabledRef.current || !editor) return; const tm = plain(); if (!tm.text.trim()) return; const d = await api.grammar({ text: tm.text }); if (d?.matches) { const seen = new Set<string>(); const fresh = d.matches.map((m: GrammarMatch) => ({ ...m, quote: tm.text.slice(m.from, m.to) })).filter((m: GrammarMatch) => { const k = `${m.from}-${m.to}`; if (seen.has(k)) return false; seen.add(k); return true }).filter((m: GrammarMatch) => { const w = (m.quote || '').trim().toLowerCase(); return !dictRef.current.ignore.some(x => x.toLowerCase() === w) && !dictRef.current.spelling.some(x => x.toLowerCase() === w) }); setGrammar(old => [...fresh, ...old.filter(o => !fresh.some((m: GrammarMatch) => m.from === o.from && m.to === o.to)).map(o => ({ ...o, stale: true }))].slice(0, 40)) } }
  async function requestAnnotate() { if (!aiEnabledRef.current || !editor) return; const tm = plain(); if (tm.text.trim().length < 20) return; const d = await api.annotate({ context: appliedRef.current.context, level: appliedRef.current.level, text: tm.text }); const fresh: Issue[] = d?.issues ? d.issues.map((i: Issue) => ({ ...i, id: nid() })) : (demo ? FALLBACK_ISSUES.map(i => ({ ...i, id: nid() })) : []); setIssues(old => [...fresh, ...old.filter(o => !fresh.some(f => f.quote === o.quote && f.type === o.type)).map(o => ({ ...o, stale: true }))].slice(0, 40)); setStale(false) }
  async function requestReactions() { if (!aiEnabledRef.current || !editor) return; const tm = plain(); if (tm.text.trim().length < 20) return; const d = await api.reactions({ context: appliedRef.current.context, level: appliedRef.current.level, text: tm.text, persona: appliedRef.current.persona }); const fresh: Reaction[] = d?.reactions ? d.reactions.map((r: Reaction) => ({ ...r, id: nid() })) : (demo ? FALLBACK_REACTIONS.map(r => ({ ...r, id: nid() })) : []); setReactions(old => [...fresh, ...old.filter(o => !fresh.some(f => f.quote === o.quote && f.kind === o.kind)).map(o => ({ ...o, stale: true }))].slice(0, 40)) }
  async function refreshMainIdea() { if (!aiEnabledRef.current || !editor) return; setBusy('main'); const d = await api.mainIdea({ context: appliedRef.current.context, level: appliedRef.current.level, text: plain().text }); if (d?.main_idea) setMainIdea(d.main_idea); setBusy('') }
  async function refreshReadings() { if (!aiEnabledRef.current || !editor) return; setBusy('read'); const d = await api.readings({ context: appliedRef.current.context, level: appliedRef.current.level, text: plain().text }); if (d?.readings) setReadings(old => [...d.readings, ...old.map(o => ({ ...o, stale: true }))].slice(0, 40)); setBusy('') }
  async function refreshOutline() { if (!aiEnabledRef.current || !editor) return; const d = await api.outline({ text: plain().text }); if (d?.outline) setOutline(d.outline) }
  function rerunAll() { requestComplete(); requestGrammar(); requestAnnotate(); requestReactions(); refreshMainIdea(); refreshOutline() }
  refs.current.fns = { complete: requestComplete, grammar: requestGrammar, annotate: requestAnnotate, reactions: requestReactions, accept: acceptGhost, clearGhost, showGhost, closePopup }

  // capture-phase keyboard + click: survives ProseMirror defaults, no stale closures via refs
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.code === 'Space') { e.preventDefault(); e.stopPropagation(); refs.current.fns.complete?.(); return }
      if (selectedRef.current || groupRef.current.length) {
        if (e.key === 'Escape') { e.preventDefault(); closePopup(); return }
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

  function applyAnchor(a: Anchor) {
    if (!editor) return
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
  function focusAnchor(a: Anchor) { if (!editor) return; const tm = plain(); const r = locateQuote(tm, a.quote, a.context); if (r) anchorStore.ranges.set(a.id, r); const pos = editor.view.coordsAtPos(r?.from || editor.state.selection.from); const group = anchorsAt(a); openGroup(group, pos.left, pos.bottom + 6, Math.max(0, group.findIndex(g => g.id === a.id)), true) }
  async function onDblClick(e: any) {
    if (!editor) return
    const { from, to } = editor.state.selection; const word = editor.state.doc.textBetween(from, to).trim()
    if (!word || word.includes(' ')) return
    const tm = plain(); const sent = tm.text.split(/(?<=[.!?])\s/).find(s => s.includes(word)) || tm.text.slice(0, 200)
    const cc = editor.view.coordsAtPos(from); const yy = cc.bottom + 8; setSynPos({ x: Math.max(8, Math.min(cc.left, innerWidth - 380)), y: yy, h: Math.max(170, innerHeight - yy - 12) })
    setSynRange({ from, to }); synRangeRef.current = { from, to }
    if (!aiEnabledRef.current) return
    const d = await api.synonyms({ context: appliedRef.current.context, level: appliedRef.current.level, word, sentence: sent }); if (d?.synonyms) setSynonyms(d.synonyms.slice(0, 3))
  }
  function replaceWord(w: string) { if (!editor || !w) return; const r = synRangeRef.current; if (r) editor.chain().focus().setTextSelection(r).deleteSelection().insertContent(w).run(); else editor.chain().focus().deleteSelection().insertContent(w).run(); setSynonyms([]); synRangeRef.current = null }
  function toggleDock(side: 'left' | 'right') { if (side === 'left') { setLeftOpen(v => { localStorage.setItem('byline.leftOpen', v ? '0' : '1'); return !v }) } else { setRightOpen(v => { localStorage.setItem('byline.rightOpen', v ? '0' : '1'); return !v }) } }

  if (!editor) return null
  const acc = metrics.shown ? Math.round(100 * metrics.accepted / metrics.shown) : 0
  const cols = `${leftOpen ? '264px' : '52px'} minmax(0,1fr) ${rightOpen ? '348px' : '52px'}`
  return (
    <div>
      <header className="topbar">
        <Logo />{demo && <span className="chip" style={{ background: 'var(--ai)' }}>DEMO</span>}
        <div className="spacer" />
        <span className="metric">{acc}% accepted · {metrics.ms}ms · {status?.model || 'offline'}</span>
        <span className="dot" style={{ background: status?.meta_configured ? '#1E8E3E' : '#D93025' }} />
        <ThemeToggle />
        <a href="/app"><button>App</button></a><a href="/demo"><button>Demo</button></a>
        <button onClick={() => { const b = new Blob([editor.getHTML()], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'byline.html'; a.click() }}>Export</button>
      </header>

      <div className="layout" style={{ gridTemplateColumns: cols }}>
        <aside className="rail">
          {!leftOpen ? <div className="rail-strip"><button onClick={() => toggleDock('left')} title="Expand">›</button><span className="strip-dot" style={{ background: 'var(--ai)' }} /><span className="strip-dot" style={{ background: 'var(--grey)' }} /></div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>Write</strong><button onClick={() => toggleDock('left')} title="Collapse">‹</button></div>
            <div className="dock"><h3>Intent</h3>
              <textarea className="context-box" value={context} onChange={e => { setContext(e.target.value); setStale(true) }} placeholder="What should the finished text be about?" />
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}><button className="primary" disabled={!dirty || !aiEnabled} onClick={applySettings}>Apply{dirty ? ' ●' : ''}</button>{dirty && <span className="meta">unapplied changes</span>}</div>
            </div>
            <div className="dock"><h3>Vocabulary</h3>
              <label>Level</label><select style={{ width: '100%' }} value={level} onChange={e => setLevel(e.target.value)}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select>
              <label>Voice</label><select style={{ width: '100%' }} value={voice} onChange={e => setVoice(e.target.value)}><option value="">None</option>{VOICES.filter(Boolean).map(l => <option key={l}>{l}</option>)}</select>
              <label>Assist</label><select style={{ width: '100%' }} value={assist} onChange={e => setAssist(e.target.value)}>{ASSISTS.map(l => <option key={l}>{l}</option>)}</select>
              <label>Reader</label><select style={{ width: '100%' }} value={persona} onChange={e => setPersona(e.target.value)}>{PERSONAS.map(l => <option key={l}>{l}</option>)}</select>
            </div>
            <div className="dock" style={aiEnabled ? undefined : { opacity: .45, filter: 'grayscale(.7)' }}><h3><span className="swatch" style={{ background: 'var(--ai)' }} />Perceived main idea</h3>
              <div className="quote-serif">{mainIdea || '—'}</div>
              <button disabled={!aiEnabled} style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={refreshMainIdea}>{busy === 'main' ? 'Reading…' : 'Refresh'}</button>
              {outline.map((o, i) => <div key={i} className="dock-item" onClick={() => focusAnchor({ id: `o${i}`, kind: 'reaction', quote: o.quote, context: o.context, title: 'Outline', detail: o.label })}>{o.label}<div className="meta">“{o.quote}”</div></div>)}
              <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={refreshOutline}>Outline</button>
            </div>
          </>}
        </aside>

        <main>
          <div className="toolbar">
            <button title="Undo (Ctrl+Z)" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>↩</button>
            <button title="Redo (Ctrl+Shift+Z)" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>↪</button>
            <span className="tool-sep" />
            <button title="Bold" className={editor.isActive('bold') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
            <button title="Italic" className={editor.isActive('italic') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
            <button title="Underline" className={editor.isActive('underline') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => (editor.chain() as any).focus().toggleUnderline().run()}><u>U</u></button>
            <button title="Strikethrough" className={editor.isActive('strike') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
            <button title="Highlight" className={editor.isActive('highlight') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()}>▮</button>
            <button title="Inline code" className={editor.isActive('code') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleCode().run()}>{'</>'}</button>
            <span className="tool-sep" />
            <button title="Paragraph" className={editor.isActive('paragraph') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setParagraph().run()}>¶</button>
            {[1, 2, 3].map(l => <button key={l} title={`Heading ${l}`} className={editor.isActive('heading', { level: l }) ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: l as any }).run()}>H{l}</button>)}
            <span className="tool-sep" />
            <button title="Bullet list" className={editor.isActive('bulletList') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
            <button title="Numbered list" className={editor.isActive('orderedList') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
            <button title="Quote" className={editor.isActive('blockquote') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
            <button title="Code block" className={editor.isActive('codeBlock') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code block</button>
            <button title="Divider" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</button>
            <span className="tool-sep" />
            {(['left', 'center', 'right'] as const).map(a => <button key={a} title={`Align ${a}`} className={editor.isActive({ textAlign: a }) ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => (editor.chain() as any).focus().setTextAlign(a).run()}>{a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}</button>)}
            <button title="Link" className={editor.isActive('link') ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => { const url = prompt('Link URL'); if (url) (editor.chain() as any).focus().setLink({ href: url }).run(); else (editor.chain() as any).focus().unsetLink().run() }}>Link</button>
            <button title="Clear formatting" onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>Clear</button>
            <span className="tool-sep" />
            <span className="sugg-toggle"><button role="switch" aria-checked={aiEnabled} aria-label="Toggle AI" className={`switch ${aiEnabled ? 'on' : ''}`} onMouseDown={e => e.preventDefault()} onClick={toggleAI}><span className="knob" /></button><span>AI</span></span>
            <button disabled={!aiEnabled} onMouseDown={e => e.preventDefault()} onClick={() => requestComplete()}>Suggest <span className="kbd">Ctrl Space</span></button>
            <span className="metric">{counts.words} words · {counts.chars} chars</span>
          </div>
          <div className="paper" onDoubleClick={onDblClick}><EditorContent editor={editor} /></div>
        </main>

        <aside className={`rail right-rail ${aiEnabled ? '' : 'ai-off'}`}>
          {!rightOpen ? <div className="rail-strip"><button onClick={() => toggleDock('right')} title="Expand">‹</button><span className="strip-dot" style={{ background: 'var(--lt)' }} /><span className="strip-dot" style={{ background: 'var(--yellow)' }} /><span className="strip-dot" style={{ background: 'var(--blue)' }} /><span className="strip-dot" style={{ background: 'var(--ai)' }} /></div> : <>
            <div className="rail-head"><strong style={{ fontSize: 13 }}>Read</strong><button onClick={() => toggleDock('right')} title="Collapse">›</button></div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--lt)' }} />Language</h3>
              <div className="dock-scroll">
              {grammar.map((g, i) => { const a = anchorStore.anchors.find(x => x.id === `g${i}-${g.from}`); const st = LANG_STYLE.grammar; return <div key={`g${i}`} className={`dock-item ${g.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label} · LT</div><span className="quote-serif">{g.quote || ''}</span><div className="reason-text">{g.message}</div>{g.replacements[0] && <div className="replacement-text" style={{ color: st.color }}>→ {g.replacements[0]}</div>}</div> })}
              {issues.map(it => { const a = anchorStore.anchors.find(x => x.id === it.id); const st = LANG_STYLE[it.type]; return <div key={it.id} className={`dock-item ${it.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label} · AI</div><span className="quote-serif">{it.quote}</span><div className="reason-text">{it.reason}</div>{it.replacement && <div className="replacement-text" style={{ color: st.color }}>→ {it.replacement}</div>}</div> })}
              {!grammar.length && !issues.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><span className="meta">Dictionary: {dict.spelling.length} · Ignored: {dict.ignore.length}</span>{dict.spelling.length > 0 && <button style={{ marginLeft: 8 }} onMouseDown={e => e.preventDefault()} onClick={exportAdditions}>Export additions</button>}</div>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--ai)' }} />Reader</h3>
              <div className="dock-scroll">
              {reactions.map(r => { const a = anchorStore.anchors.find(x => x.id === r.id); const st = REACTION_STYLE[r.kind]; return <div key={r.id} className={`dock-item ${r.stale ? 'stale' : ''}`} onMouseDown={e => e.preventDefault()} onMouseEnter={() => a && highlightAnchor(a)} onMouseLeave={() => highlightAnchor(null)} onClick={() => a && focusAnchor(a)}><div className="kind-label" style={{ color: st.color }}>{st.label}</div><span className="quote-serif">{r.quote}</span><div className={`kind-body ${r.kind === 'question' ? 'q' : r.kind === 'critique' ? 'crit' : r.kind === 'comment' ? 'comm' : ''}`} style={r.kind === 'compliment' ? { color: st.color, fontWeight: 600 } : undefined}>“{r.text}”</div></div> })}
              {!reactions.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><button disabled={!aiEnabled} onMouseDown={e => e.preventDefault()} onClick={requestReactions}>Refresh</button></div>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--blue)' }} />Sources</h3>
              <div className="dock-scroll">
              {readings.map((r, i) => <div key={i} className={`dock-item ${r.stale ? 'stale' : ''}`}><div className="kind-label" style={{ color: 'var(--blue)' }}>{r.label}</div><a href={textFragmentUrl(r.url, r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{r.title || r.url}</a><div className="reason-text">vs “{r.claim_quote}” — {r.why}</div><div className="meta" style={{ fontStyle: 'italic' }}>{r.excerpt}</div></div>)}
              {!readings.length && <div className="meta">—</div>}
              </div><div className="dock-foot"><button disabled={!aiEnabled} onMouseDown={e => e.preventDefault()} onClick={refreshReadings}>{busy === 'read' ? 'Searching…' : 'Search'}</button></div>
            </div>
            <div className="dock dock-section"><h3><span className="swatch" style={{ background: 'var(--grey)' }} />Suggestions<span className="spacer" /><button role="switch" aria-checked={aiEnabled} aria-label="Toggle AI" className={`switch ${aiEnabled ? 'on' : ''}`} onMouseDown={e => e.preventDefault()} onClick={toggleAI}><span className="knob" /></button></h3>
              <div className="dock-scroll">
              {suggestions.map((s, i) => <div key={`s${i}`} className={`ghost-row ${i === ghostIdx ? 'sel' : ''}`} onClick={() => acceptGhost(i)}><span className="quote-serif">{s}</span></div>)}
              {suggHistory.map((s, i) => <div key={`h${i}`} className="ghost-row" style={{ opacity: .45 }}>{s}</div>)}
              {!suggestions.length && !suggHistory.length && <div className="meta">—</div>}
              </div>
              {suggestions.length > 0 && <div className="dock-foot"><button onClick={() => clearGhost()}>Dismiss <span className="kbd">Esc</span></button></div>}
            </div>
          </>}
        </aside>
      </div>

      {suggestions.length > 0 && (
        <div className="sugg-popup fade" style={{ left: suggPos.x, top: suggPos.y, maxHeight: suggPos.h, overflowY: 'auto' }} role="listbox" aria-label="Suggestions">
          {suggestions.map((s, i) => <div key={i} className={`sugg-row ${i === ghostIdx ? 'sel' : ''}`} onMouseDown={e => { e.preventDefault(); acceptGhost(i) }} onMouseEnter={() => { setGhostIdx(i); refs.current.idx = i; showGhost(i) }}><span className="num">{i + 1}</span>{s}</div>)}
        </div>
      )}
      {selected && popupGroup.length > 0 && (
        <div className="popup popup-stack fade" ref={popupRef} role="dialog" style={{ left: popupPos.x, top: popupPos.y, maxHeight: popupPos.h }}
          onMouseEnter={() => { popupHoverRef.current = true }} onMouseLeave={() => { popupHoverRef.current = false; if (!pinnedRef.current) closePopup() }}>
          {popupGroup.map((a, i) => {
            const active = i === popupIdx
            const chipColor = a.kind === 'grammar' ? 'var(--lt)' : a.kind === 'claim' ? 'var(--blue)' : a.kind === 'vocabulary' ? 'var(--yellow)' : 'var(--ai)'
            const chipLabel = a.kind === 'grammar' ? 'LT · red' : a.kind === 'vocabulary' ? 'AI · yellow' : a.kind === 'claim' ? 'WEB · blue' : 'AI · purple'
            return (
              <div key={a.id} className={`stack-card ${active ? 'active' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => setActiveIdx(i)}>
                <span className="chip" style={{ background: chipColor }}>{chipLabel}</span>
                <span className="stack-order">{i + 1}/{popupGroup.length}</span>
                <div className="quote-serif" style={{ marginTop: 6 }}>“{a.quote}”</div>
                <div style={{ fontWeight: 600, marginTop: 2, fontSize: 12.5 }}>{a.title}</div>
                {active && <>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{a.title}</div><p style={{ margin: '6px 0' }}>{a.detail}</p>
                  {a.url && <p style={{ margin: '6px 0' }}><a href={textFragmentUrl(a.url, a.excerpt || a.quote)} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontWeight: 600 }}>Open source ↗</a></p>}
                  {a.replacement
                    ? <button className="primary" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); applySelected() }}>Apply “{a.replacement}” <span className="kbd">Tab</span></button>
                    : <button className="primary" onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); tabPopup() }}>Next <span className="kbd">Tab</span></button>}
                  {a.kind === 'grammar' && !a.quote.includes(' ') && <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('ignore', a.quote) }}>Ignore word</button><button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); exceptWord('spelling', a.quote) }}>Add to dictionary</button></div>}
                </>}
              </div>
            )
          })}
          <button style={{ marginTop: 8 }} onMouseDown={e => e.preventDefault()} onClick={closePopup}>Close <span className="kbd">Esc</span></button>
        </div>
      )}
      {synonyms.length > 0 && (
        <div className="sugg-popup fade" style={{ left: synPos.x, top: synPos.y, maxHeight: synPos.h, overflowY: 'auto' }} role="listbox" aria-label="Synonyms">
          {synonyms.map((w, i) => <div key={w} className={`sugg-row ${i === 0 ? 'sel' : ''}`} onMouseDown={e => { e.preventDefault(); replaceWord(w) }}><span className="num">{i + 1}</span>{w}</div>)}
        </div>
      )}
    </div>
  )
}
