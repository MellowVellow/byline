import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TableOfContents from '@tiptap/extension-table-of-contents'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'

import TopNavigation from '../components/TopNavigation'
import ReviewDock from '../components/ReviewDock'
import BootLoader from '../components/BootLoader'
import { useGhostTriggers } from '../hooks/useGhostTriggers'
import { classifyLine, ghostTriggerForState } from '../lib/sentence-state'
import ContextInput from '../components/ContextInput'
import { REVIEW_TEMPLATES } from '../lib/review-templates'
import SuggestionContext from '../components/SuggestionContext'
import ConnectPanel from '../components/ConnectPanel'
import CaretPopup, {
  type GhostLevel, type GhostGroups, type SelGrid,
  GHOST_LEVELS, SEL_COLS, EMPTY_GHOST, EMPTY_GRID,
  ghostOption, visibleCells,
} from '../components/CaretPopup'
import InlineReviewPopup from '../components/InlineReviewPopup'
import SettingsMenu from '../components/SettingsMenu'
import MetricsPopup from '../components/MetricsPopup'
import { recordSuggestionOffered, recordSuggestionAccepted, recordRevisionAccepted, recordGhostFired, recordGhostCacheSaved, recordGhostAborted, recordGhostStaleDropped, recordGhostDebounceSaved, recordGhostReroll } from '../lib/metrics'

import { AnchorDecorations, anchorStore, syncAnchors, syncGhost, syncFlash, flashStore, modeStore, syncPops, popStore, holdStore, syncHolds, connectStore, syncConnect } from '../editor/decorations'
import { TextSelection } from '@tiptap/pm/state'
import { contextService, type SelectionContext } from '../services/context-service'
import { globalAnalysisService } from '../services/analysis-service'
import { harperService } from '../services/harper-service'
import { resolveAnchor, applySafeReplacement, consumeProgrammaticApplyFlag, TEXT_SEP } from '../editor/anchoring'
import type { Finding, Suggestion } from '../domain/finding'
import { buildReaderFindings } from '../domain/finding'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { idbSetDoc, idbGetDoc } from '../lib/storage'
import { api } from '../lib/api'
import { CONNECT_RELATIONS, type ConnectSession, createConnectSession, firstAltOfRel, hasConnectSelection, rerenderConnectSession } from '../lib/connect'
import { hashKey, cacheGet, cacheSet, saveLastGhost, loadLastGhost } from '../lib/ai-cache'
import { cascadePopupRects, type PopupBox, type PopupId } from '../lib/popupLayout'
import { sfxAccept, sfxDismiss, blip } from '../lib/sfx'

export type AssistGranularity = 'Hint' | 'Phrase' | 'Sentence' | 'Question'

export function formatSuggestionText(text: string, level: AssistGranularity): string {
  if (!text) return ''
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^\s*(?:\d+[.)]|\*|-|•)\s*/, '')
  cleaned = cleaned.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()

  if (level === 'Hint') {
    const words = cleaned.split(/\s+/).slice(0, 4)
    cleaned = words.join(' ').replace(/[.,;:!?]+$/, '')
  } else if (level === 'Phrase') {
    cleaned = cleaned.replace(/[.!?]+$/, '')
  } else if (level === 'Sentence') {
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.'
    }
  } else if (level === 'Question') {
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
    if (!cleaned.endsWith('?')) {
      cleaned = cleaned.replace(/[.!,;:]+$/, '') + '?'
    }
  }
  return cleaned
}

export default function EditorPage() {
  const [booted, setBooted] = useState(() => {
  try {
      if (sessionStorage.getItem('byline.booted') === '1') return true
      if (sessionStorage.getItem('byline.noboot') === '1') return true
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') return true
    } catch { /* ignore */ }
    return false
  })
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const notify = (msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }
  const lastHarperErrorRef = useRef<string | null>(null)
  const notifyHarperError = (msg: string) => {
    if (lastHarperErrorRef.current === msg) return
    lastHarperErrorRef.current = msg
    notify(`Grammar check unavailable: ${msg}`)
  }
  const [connectSession, setConnectSession] = useState<ConnectSession | null>(null)
  const [connectPos, setConnectPos] = useState({ x: 16, y: 80, w: 320 })
  const connectSessionRef = useRef<ConnectSession | null>(null)
  const connectApplyingRef = useRef(false)
  const connectTimerRef = useRef<number | null>(null)
  const keepConnectRef = useRef<(() => void) | null>(null)
  const clearGhostOnNavRef = useRef<() => void>(() => {})
  const [contextNote, setContextNote] = useState(() => {
    try { return localStorage.getItem('byline.doc.contextNote') || '' } catch { return '' }
  })
  const [suggestionNote, setSuggestionNote] = useState(() => {
    try { return localStorage.getItem('byline.doc.suggestionNote') || '' } catch { return '' }
  })

  const [leftOpen, setLeftOpen] = useState(true)

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const rerollCountRef = useRef(0)
  const lastGhostRef = useRef<{ groups: GhostGroups; lv: GhostLevel; idx: number } | null>(null)
  const pendingGhostBias = useRef<GhostLevel | null>(null)
  const ghostReqId = useRef(0)
  const ghostAbort = useRef<AbortController | null>(null)
  const ghostAutoAllowedRef = useRef(false)
  const selReqId = useRef(0)
  const selAbort = useRef<AbortController | null>(null)
  const selManualRef = useRef(false)
  const ghostArmed = useRef<{ key: string; at: number } | null>(null)
  const lastPoll = useRef({ rev: -1, from: -1, full: '', textCaret: 0 })
  const GHOST_ARM_MS = 150
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setIsMobile(w <= 768)
      if (w > 768 && w <= 1120) {
        setLeftOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const elapsed = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    if (Math.abs(deltaY) < 75 && elapsed < 600) {
      if (deltaX > 45 && !mobileDrawerOpen) {
        blip('open')
        setMobileDrawerOpen(true)
      } else if (deltaX < -45 && mobileDrawerOpen) {
        blip('toggle')
        setMobileDrawerOpen(false)
      }
    }
  }

  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null)
  const [reviewPersona, setReviewPersona] = useState<'all' | 'reader' | 'grammar'>('all')

  const [docRevision, setDocRevision] = useState(1)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })

  const [findings, setFindings] = useState<Finding[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [grammarAbort, setGrammarAbort] = useState<AbortController | null>(null)

  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number; w?: number }>({ x: 200, y: 300 })
  const popupRefs = useRef<Record<PopupId, HTMLDivElement | null>>({
    ghost: null,
    selection: null,
    review: null,
    connect: null,
  })
  const [popupPush, setPopupPush] = useState<Record<PopupId, number>>({
    ghost: 0,
    selection: 0,
    review: 0,
    connect: 0,
  })
  const setPopupRef = useCallback(
    (id: PopupId) => (node: HTMLDivElement | null) => {
      popupRefs.current[id] = node
    },
    [],
  )

  const [inlineReviewState, setInlineReviewState] = useState<{
    findings: Finding[]
    position: { x: number; y: number; w?: number }
  } | null>(null)

  const [ghostGroups, setGhostGroups] = useState<GhostGroups>(EMPTY_GHOST)
  const [ghostLv, setGhostLv] = useState<GhostLevel>('fragment')
  const lastGhostLevel = useRef<GhostLevel>('fragment')
  const [ghostIdx, setGhostIdx] = useState(0)
  const [selGrid, setSelGrid] = useState<SelGrid>(EMPTY_GRID)
  const [selCol, setSelCol] = useState(1)
  const [selRow, setSelRow] = useState(0)
  const [selPage, setSelPage] = useState(0)
  const [selLoading, setSelLoading] = useState(false)
  const [selError, setSelError] = useState<string | null>(null)
  const [suggestPopupPos, setSuggestPopupPos] = useState<{ x: number; y: number; w?: number } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const ghostTriggers = useGhostTriggers(appSettings.slowMs)

  const editorScrollRef = useRef<HTMLDivElement>(null)
  const leftRailRef = useRef<HTMLElement>(null)

  const placePopupBesideEditor = useCallback(
    (view: any, pos: number, popupW = 440, popupH = 280, minW = popupW) => {
      if (!view) return { x: 16, y: 80, w: Math.min(popupW, window.innerWidth - 24) }
      const coords = view.coordsAtPos(pos)
      const rect = view.dom.getBoundingClientRect()
      const margin = 12
      const gap = 12
      const spaceRight = window.innerWidth - rect.right - gap - margin
      const spaceLeft = rect.left - gap - margin
      let width = popupW
      let x: number
      if (spaceRight >= minW) {
        width = Math.min(popupW, spaceRight)
        x = rect.right + gap
      } else if (spaceLeft >= minW) {
        width = Math.min(popupW, spaceLeft)
        x = rect.left - gap - width
      } else {
        width = Math.min(popupW, window.innerWidth - margin * 2)
        x = Math.max(margin, window.innerWidth - width - margin)
      }
      const y = Math.max(56, Math.min(coords.top - 4, window.innerHeight - popupH - 16))
      return { x, y, w: width }
    },
    []
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
      AnchorDecorations,
      TableOfContents,
    ],
    content: (() => {
      try {
        const saved = localStorage.getItem('byline.doc.html')
        if (saved && saved.trim() && saved !== '<p></p>' && saved !== '<p></p>\n') return saved
      } catch {}
      return ''
    })(),
    editorProps: {
      attributes: {
        spellcheck: appSettings.spellcheck ? 'true' : 'false',
        class: 'byline-paper-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      ghostAutoAllowedRef.current = !consumeProgrammaticApplyFlag()
      if (connectSessionRef.current && !connectApplyingRef.current) keepConnectRef.current?.()
      setDocRevision(r => r + 1)
      if (anchorStore.ghost) {
        anchorStore.ghost = ''
        syncGhost(editor)
      }
      setGhostGroups(EMPTY_GHOST)
      setSuggestPopupPos(null)
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        try {
          const html = editor.getHTML()
          localStorage.setItem('byline.doc.html', html)
          void idbSetDoc(html)
        } catch { /* quota full: keep in-memory doc */ }
      }, 1500)
      globalAnalysisService.validateAnchors(editor)
      syncEditorDecorations(editor)
    },
    onSelectionUpdate: ({ editor, transaction }) => {
      if (connectApplyingRef.current) return
      if (!transaction.docChanged) ghostAutoAllowedRef.current = false
      clearGhostOnNavRef.current()
      const selCtx = contextService.getSelectionContext(editor)
      const at = editor.state.selection.from
      const to = editor.state.selection.to

      if (connectSessionRef.current) {
        const session = connectSessionRef.current
        const inside = at >= session.from && to <= session.to
        if (!inside) keepConnectRef.current?.()
      }

      setInlineReviewState(null)

      setSelectionContext(selCtx)
      if (selCtx && editor.view) {
        setPopupPos(placePopupBesideEditor(editor.view, selCtx.to, 400, 300, 220))
      }
    },
    onCreate: ({ editor }) => {
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
    },
  })

  const setConnect = (session: ConnectSession | null) => {
    connectSessionRef.current = session
    setConnectSession(session)
  }

  const clearConnectTimer = () => {
    if (connectTimerRef.current != null) {
      window.clearTimeout(connectTimerRef.current)
      connectTimerRef.current = null
    }
  }

  const placeConnectPopup = (pos: number) => {
    if (!editor?.view) return
    setConnectPos(placePopupBesideEditor(editor.view, pos, 320, 360, 220))
  }

  const applyConnectText = (session: ConnectSession) => {
    if (!editor || !editor.view) return
    connectApplyingRef.current = true
    try {
      const tr = editor.state.tr.insertText(session.text, session.from, session.to)
      tr.setSelection(TextSelection.create(tr.doc, session.from, session.from + session.text.length))
      editor.view.dispatch(tr)
      connectStore.ranges = session.marks.map(m => ({ from: session.from + m.s, to: session.from + m.e }))
      syncConnect(editor)
      setConnect({ ...session, to: session.from + session.text.length })
      placeConnectPopup(session.from + session.text.length)
    } finally {
      connectApplyingRef.current = false
    }
  }

  const updateConnect = (mutate: (session: ConnectSession) => void) => {
    const session = connectSessionRef.current
    if (!session) return
    const next: ConnectSession = { ...session, seams: session.seams.map(s => ({ ...s })) }
    mutate(next)
    applyConnectText(rerenderConnectSession(next))
  }

  const [connectFocus, setConnectFocus] = useState(0)

  const startConnect = (ctx: SelectionContext) => {
    const raw = ctx.selectedText
    const orig = raw.trim()
    if (!orig) return
    setConnectFocus(0)
    const lead = Math.max(0, raw.indexOf(orig))
    const session = createConnectSession(ctx.from + lead, orig, ctx.to)
    if (!session) return
    clearConnectTimer()
    if (connectSessionRef.current) keepConnect()
    applyConnectText(session)
    blip('done')
  }

  const keepConnect = () => {
    clearConnectTimer()
    if (connectSessionRef.current && editor) {
      connectStore.ranges = []
      syncConnect(editor)
    }
    setConnect(null)
  }

  keepConnectRef.current = keepConnect

  const undoConnect = () => {
    const session = connectSessionRef.current
    if (!editor || !editor.view || !session) return
    clearConnectTimer()
    connectApplyingRef.current = true
    try {
      const tr = editor.state.tr.insertText(session.orig, session.from, session.to)
      tr.setSelection(TextSelection.create(tr.doc, session.from, session.from + session.orig.length))
      editor.view.dispatch(tr)
      connectStore.ranges = []
      syncConnect(editor)
    } finally {
      connectApplyingRef.current = false
    }
    setConnect(null)
    editor.chain().focus().run()
  }

  const toggleConnectSeam = (index: number) => {
    blip('select')
    updateConnect(session => {
      if (session.seams[index]) session.seams[index].on = !session.seams[index].on
    })
  }

  const cycleConnectAlt = (seamIndex: number, dir: 1 | -1) => {
    blip('select')
    updateConnect(session => {
      const seam = session.seams[seamIndex]
      const alts = session.alts[seamIndex] || []
      if (!seam || alts.length === 0) return
      seam.v = (seam.v + dir + alts.length) % alts.length
    })
  }

  const cycleConnectRelation = (seamIndex: number) => {
    blip('select')
    updateConnect(session => {
      const seam = session.seams[seamIndex]
      const alts = session.alts[seamIndex] || []
      if (!seam || alts.length === 0) return
      const curRel = alts[seam.v]?.rel ?? 0
      const nextRel = (curRel + 1) % CONNECT_RELATIONS.length
      seam.v = firstAltOfRel(alts, nextRel)
    })
  }

  const rerollConnect = () => {
    blip('select')
    updateConnect(session => {
      session.seams.forEach((seam, i) => {
        const alts = session.alts[i] || []
        if (alts.length > 0) seam.v = (seam.v + 1) % alts.length
      })
    })
  }

  const syncEditorDecorations = useCallback((ed: typeof editor) => {
    if (!ed || !ed.view) return

    modeStore.mode = leftOpen || isMobile ? 'editing' : 'drafting'

    const anchors: any[] = []
    const ranges = new Map<string, { from: number; to: number }>()

    for (const f of findings) {
      if (f.status === 'resolved' || f.status === 'dismissed') continue
      if (reviewPersona !== 'all' && f.persona !== reviewPersona) continue
      const resolved = resolveAnchor(ed, f.anchor)
      if (resolved) {
        anchors.push({
          id: f.id,
          kind: f.persona === 'grammar' ? 'grammar' : 'reaction',
          from: resolved.from,
          to: resolved.to,
        })
        ranges.set(f.id, { from: resolved.from, to: resolved.to })
      }
    }

    anchorStore.anchors = anchors
    anchorStore.ranges = ranges
    syncAnchors(ed)
  }, [findings, leftOpen, isMobile, reviewPersona])

  useEffect(() => {
    return () => {
      connectStore.ranges = []
      connectSessionRef.current = null
      void harperService.dispose()
    }
  }, [])

  useEffect(() => {
    if (!editor || !editor.view) return
    const dom = editor.view.dom
    const onClick = (e: MouseEvent) => {
      if (!leftOpen && !isMobile) return
      const target = (e.target as HTMLElement).closest('[data-anchor-id], [data-anchor-ids]')
      const anchorId = target?.getAttribute('data-anchor-id')
      const anchorIds = target?.getAttribute('data-anchor-ids')

      if (anchorId || anchorIds) {
        const ids = anchorId ? [anchorId] : (anchorIds?.split(',') || [])
        const matched = findings.filter(f => ids.includes(f.id) && f.status !== 'resolved' && f.status !== 'dismissed')
        if (matched.length > 0) {
          setInlineReviewState({
            findings: matched,
            position: placePopupBesideEditor(editor.view, editor.state.selection.from, 320, 220, 220),
          })
          setSelectionContext(null)
          setHighlightedFindingId(matched[0].id)
          blip('select')
        }
      }
    }
    dom.addEventListener('click', onClick)
    // Touch devices fire click on tap, but ProseMirror caret handling can
    // swallow it — touchend is the reliable tap signal for underlines.
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
      const target = el?.closest?.('[data-anchor-id], [data-anchor-ids]')
      if (!target) return
      if (!leftOpen && !isMobile) return
      const anchorId = target.getAttribute('data-anchor-id')
      const anchorIds = target.getAttribute('data-anchor-ids')
      if (anchorId || anchorIds) {
        const ids = anchorId ? [anchorId] : (anchorIds?.split(',') || [])
        const matched = findings.filter(f => ids.includes(f.id) && f.status !== 'resolved' && f.status !== 'dismissed')
        if (matched.length > 0) {
          setInlineReviewState({
            findings: matched,
            position: placePopupBesideEditor(editor.view, editor.state.selection.from, 320, 220, 220),
          })
          setSelectionContext(null)
          setHighlightedFindingId(matched[0].id)
          blip('select')
        }
      }
    }
    dom.addEventListener('touchend', onTouchEnd)
    return () => {
      dom.removeEventListener('click', onClick)
      dom.removeEventListener('touchend', onTouchEnd)
    }
  }, [editor, leftOpen, isMobile, findings, placePopupBesideEditor])

  useEffect(() => {
    modeStore.mode = leftOpen || isMobile ? 'editing' : 'drafting'
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [leftOpen, isMobile, editor, syncEditorDecorations])

  useEffect(() => {
    return globalAnalysisService.subscribe(newFindings => {
      setFindings(newFindings)
    })
  }, [])

  useEffect(() => {
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [findings, editor, syncEditorDecorations])

  const assistForLevel = (lv: GhostLevel): AssistGranularity =>
    lv === 'cue' ? 'Hint' : lv === 'question' ? 'Question' : lv === 'sentence' ? 'Sentence' : 'Phrase'

  const showInlineGhost = (groups: GhostGroups, lv: GhostLevel, idx: number) => {
    if (!editor || !editor.view) return
    const g = ghostOption(groups, lv, idx)
    if (!g) return
    const afterPos = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, afterPos - 1), afterPos)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''
    anchorStore.ghost = prefix + g
    anchorStore.ghostPos = afterPos
    syncGhost(editor)
  }

  const parseGhostGroups = (res: any): GhostGroups => {
    if (res?.levels && typeof res.levels === 'object') {
      const fmt: Array<[GhostLevel, AssistGranularity]> = [['cue', 'Hint'], ['question', 'Question'], ['fragment', 'Phrase'], ['sentence', 'Sentence']]
      const out = { ...EMPTY_GHOST } as GhostGroups
      for (const [lv, ag] of fmt) {
        const list = Array.isArray(res.levels[lv]) ? res.levels[lv] : []
        out[lv] = list.map((s: string) => formatSuggestionText(s, ag)).filter(Boolean).slice(0, 6)
      }
      if (GHOST_LEVELS.some(l => out[l].length > 0)) return out
    }
    if (Array.isArray(res?.suggestions) && res.suggestions.length > 0) {
      const out = { ...EMPTY_GHOST } as GhostGroups
      const lv = lastGhostLevel.current
      const ag = assistForLevel(lv)
      out[lv] = res.suggestions.slice(0, 3).map((s: string) => formatSuggestionText(s, ag)).filter(Boolean)
      if (out[lv].length > 0) return out
    }
    return EMPTY_GHOST
  }

  const handleRequestGhost = async (opts?: { isAuto?: boolean; isReroll?: boolean }) => {
    if (!editor || !editor.view) return
    if (opts?.isReroll) {
      const cur = ghostGroups[ghostLv] || []
      if (cur.length > 1) {
        const next = (ghostIdx + 1) % cur.length
        setGhostIdx(next)
        lastGhostRef.current = { groups: ghostGroups, lv: ghostLv, idx: next }
        saveLastGhost({ groups: ghostGroups, lv: ghostLv, idx: next })
        showInlineGhost(ghostGroups, ghostLv, next)
        blip('select')
        return
      }
    }
    const myId = ++ghostReqId.current
    ghostAbort.current?.abort()
    const ctl = new AbortController()
    ghostAbort.current = ctl
    const reqVersion = docRevision
    recordGhostFired()
    setDraftLoading(true)
    setSelGrid(EMPTY_GRID)
    if (!opts?.isAuto) blip('select')

    const cursorCtx = contextService.getCursorContext(editor, 400)

    const cursorPos = editor.state.selection.from
    const selectionAtRequest = { from: editor.state.selection.from, to: editor.state.selection.to }
    setSuggestPopupPos(placePopupBesideEditor(editor.view, cursorPos, 440, 260, 220))

    try {
      const avoid = opts?.isReroll ? GHOST_LEVELS.flatMap(l => ghostGroups[l]).slice(0, 24) : undefined
      const cacheKey = opts?.isReroll
        ? null
        : 'ghost:' + hashKey([suggestionNote, appSettings.writingTheme, cursorCtx.before.slice(-400), cursorCtx.after.slice(0, 200)])
      const cached = cacheKey ? cacheGet<any>(cacheKey) : null
      if (cached) recordGhostCacheSaved()
      const res = cached ?? await api.complete({
        context: suggestionNote,
        level: appSettings.writingTheme || 'General',
        before: cursorCtx.before,
        after: cursorCtx.after,
        assist_level: 'All',
        avoid,
        version: docRevision,
      }, ctl.signal)
      if (ctl.signal.aborted || ghostReqId.current !== myId) {
        recordGhostAborted()
        return
      }
      const sel = editor.state.selection
      if (reqVersion !== docRevisionRef.current ||
          sel.from !== selectionAtRequest.from || sel.to !== selectionAtRequest.to) {
        recordGhostStaleDropped()
        return
      }
      if (cacheKey && !cached && res) cacheSet(cacheKey, res)

      const groups = parseGhostGroups(res)
      const biased = pendingGhostBias.current
      pendingGhostBias.current = null
      let lv = lastGhostLevel.current
      if (opts?.isReroll && (groups[ghostLv] || []).length > 0) lv = ghostLv
      else if (biased && (groups[biased] || []).length > 0) lv = biased
      setGhostGroups(groups)
      setGhostLv(lv)
      setGhostIdx(0)
      lastGhostRef.current = { groups, lv, idx: 0 }
      saveLastGhost({ groups, lv, idx: 0 })
      recordSuggestionOffered(GHOST_LEVELS.reduce((n, l) => n + groups[l].length, 0))
      showInlineGhost(groups, lv, 0)

      setSuggestPopupPos(placePopupBesideEditor(editor.view, cursorPos, 440, 260, 220))

      if (!opts?.isAuto) blip('done')
    } catch {
      if (ctl.signal.aborted || ghostReqId.current !== myId) {
        recordGhostAborted()
        return
      }
      const groups = EMPTY_GHOST
      const biased = pendingGhostBias.current
      pendingGhostBias.current = null
      let lv = lastGhostLevel.current
      if (opts?.isReroll && (groups[ghostLv] || []).length > 0) lv = ghostLv
      else if (biased && (groups[biased] || []).length > 0) lv = biased
      setGhostGroups(groups)
      setGhostLv(lv)
      setGhostIdx(0)
      showInlineGhost(groups, lv, 0)

      setSuggestPopupPos(placePopupBesideEditor(editor.view, editor.state.selection.from, 440, 260, 220))
    } finally {
      if (ghostAbort.current === ctl) ghostAbort.current = null
      if (ghostReqId.current === myId) setDraftLoading(false)
    }
  }

  const handleGhostReroll = (dir: 1 | -1) => {
    recordGhostReroll()
    const cur = ghostGroups[ghostLv] || []
    if (cur.length > 1) {
      const next = (ghostIdx + dir + cur.length) % cur.length
      setGhostIdx(next)
      lastGhostRef.current = { groups: ghostGroups, lv: ghostLv, idx: next }
      saveLastGhost({ groups: ghostGroups, lv: ghostLv, idx: next })
      showInlineGhost(ghostGroups, ghostLv, next)
      blip('select')
      return
    }
    void handleRequestGhost({ isReroll: true })
  }

  const stepGhostOption = (dir: 1 | -1) => {
    const cur = ghostGroups[ghostLv] || []
    if (cur.length <= 1) return
    const next = (ghostIdx + dir + cur.length) % cur.length
    setGhostIdx(next)
    lastGhostRef.current = { groups: ghostGroups, lv: ghostLv, idx: next }
    saveLastGhost({ groups: ghostGroups, lv: ghostLv, idx: next })
    showInlineGhost(ghostGroups, ghostLv, next)
    blip('select')
  }

  const handleGhostRefetch = () => {
    recordGhostReroll()
    void handleRequestGhost({ isReroll: true })
  }

  const handleGhostLevel = (lv: GhostLevel) => {
    lastGhostLevel.current = lv
    setGhostLv(lv)
    setGhostIdx(0)
    showInlineGhost(ghostGroups, lv, 0)
    blip('select')
  }

  const handleShowLastSuggestion = () => {
    if (!editor || !editor.view) return
    if (!lastGhostRef.current) {
      const restored = loadLastGhost()
      if (restored && GHOST_LEVELS.some(l => (restored.groups[l] || []).length > 0)) {
        lastGhostRef.current = { groups: restored.groups as GhostGroups, lv: restored.lv as GhostLevel, idx: restored.idx }
      }
    }
    if (!lastGhostRef.current) return
    const { groups, lv, idx } = lastGhostRef.current
    if (!GHOST_LEVELS.some(l => (groups[l] || []).length > 0)) return
    blip('select')
    setGhostGroups(groups)
    lastGhostLevel.current = lv
    setGhostLv(lv)
    setGhostIdx(idx)
    setSelGrid(EMPTY_GRID)
    showInlineGhost(groups, lv, idx)
    const pos = editor.state.selection.from
    setSuggestPopupPos(placePopupBesideEditor(editor.view, pos, 440, 260, 220))
  }

  useEffect(() => {
    if (ghostAbort.current) {
      ghostAbort.current.abort()
      ghostAbort.current = null
    }
    if (ghostArmed.current) {
      ghostArmed.current = null
      recordGhostDebounceSaved()
    }
    if (editor) {
      try {
        const full = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
        const textCaret = editor.state.doc.textBetween(0, editor.state.selection.from, '\n\n').length
        ghostTriggers.onInput(full, Math.min(textCaret, full.length))
      } catch {}
    } else {
      ghostTriggers.touch()
    }
  }, [docRevision]) // eslint-disable-line react-hooks/exhaustive-deps

  const ghostGroupsRef = useRef(ghostGroups)
  ghostGroupsRef.current = ghostGroups
  const docRevisionRef = useRef(docRevision)
  docRevisionRef.current = docRevision
  const draftLoadingRef = useRef(draftLoading)
  draftLoadingRef.current = draftLoading
  const handleRequestGhostRef = useRef(handleRequestGhost)
  handleRequestGhostRef.current = handleRequestGhost

  useEffect(() => {
    if (!editor) return
    const id = setInterval(() => {
      try {
        if (!editor || !editor.isFocused) return
        if (document.hidden) return
        if (draftLoadingRef.current) return
        const { empty, from } = editor.state.selection as { empty: boolean; from: number; to: number }
        if (!empty) return
        const lp = lastPoll.current
        const rev = docRevisionRef.current
        if (lp.rev !== rev) {
          lp.full = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
          lp.rev = rev
          lp.from = -1
        }
        if (lp.from !== from) {
          lp.textCaret = Math.min(editor.state.doc.textBetween(0, from, '\n\n').length, lp.full.length)
          lp.from = from
        }
        const groups = ghostGroupsRef.current
        const ghostEmpty = GHOST_LEVELS.every(l => groups[l].length === 0)
        if (!ghostEmpty || anchorStore.ghost) return
        const full = lp.full
        const textCaret = lp.textCaret
        const lineStart = full.lastIndexOf('\n', Math.max(0, textCaret - 1)) + 1
        const caretLine = full.slice(lineStart, textCaret)
        const prevLineStart = full.lastIndexOf('\n', Math.max(0, lineStart - 2)) + 1
        const prevLine = full.slice(prevLineStart, Math.max(0, lineStart - 1))
        const inFence = (full.slice(0, lineStart).match(/^\s*```/gm) || []).length % 2 === 1
        const cls = classifyLine(caretLine, 'doc', prevLine, inFence)
        const gate = cls.state === 'Empty'
          ? { suppress: full.trim().length <= 8, bias: null as null }
          : ghostTriggerForState(cls.state)
        const t = ghostTriggers.evaluate(full, textCaret, textCaret)
        if (t.ghost && !gate.suppress && ghostAutoAllowedRef.current) {
          const before = editor.state.doc.textBetween(Math.max(0, from - 200), from)
          if (before.trim().length >= 2) {
            const key = `${textCaret}|${before.slice(-24)}`
            const now = performance.now()
            const armed = ghostArmed.current
            if (!armed || armed.key !== key) {
              ghostArmed.current = { key, at: now }
            } else if (now - armed.at >= GHOST_ARM_MS) {
              ghostArmed.current = null
              pendingGhostBias.current = gate.bias
              void handleRequestGhostRef.current({ isAuto: true })
            }
          } else {
            ghostArmed.current = null
          }
        }
      } catch { /* poller never throws */ }
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const timer = setTimeout(() => {
      void handleRunGrammar()
    }, 800)
    return () => clearTimeout(timer)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    void handleRunGrammar()
    void handleRunReader()
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const timer = setTimeout(() => {
      void handleRunGrammar()
    }, 200)
    return () => clearTimeout(timer)
  }, [docRevision, editor]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectSuggestion = (index: number) => {
    if (!editor) return
    const textToInsert = ghostOption(ghostGroups, ghostLv, index)
    if (!textToInsert) return
    const pos = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''

    editor.chain().focus().insertContentAt(pos, prefix + textToInsert.trim() + ' ').run()

    anchorStore.ghost = ''
    syncGhost(editor)
    setGhostGroups(EMPTY_GHOST)
    setSuggestPopupPos(null)
    recordSuggestionAccepted()
    sfxAccept()
  }

  const abortGhostRequest = () => {
    ghostAbort.current?.abort()
    ghostAbort.current = null
    ghostReqId.current++
    setDraftLoading(false)
  }

  const clearGhostOnNavigate = () => {
    if (ghostAbort.current) {
      ghostAbort.current.abort()
      ghostAbort.current = null
      ghostReqId.current++
    }
    if (anchorStore.ghost) {
      anchorStore.ghost = ''
      if (editor) syncGhost(editor)
    }
    setDraftLoading(false)
    setGhostGroups(EMPTY_GHOST)
    setSuggestPopupPos(null)
  }
  clearGhostOnNavRef.current = clearGhostOnNavigate

  const handleDismissSuggestions = () => {
    blip('dismiss')
    ghostAutoAllowedRef.current = false
    abortGhostRequest()
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setGhostGroups(EMPTY_GHOST)
    setSuggestPopupPos(null)
    ghostArmed.current = null
    try {
      ghostTriggers.ref.current.fired = {}
      ghostTriggers.touch()
    } catch { /* ignore */ }
  }

  const selTimerRef = useRef<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null }
      try {
        if (editor) {
          const html = editor.getHTML()
          localStorage.setItem('byline.doc.html', html)
          void idbSetDoc(html)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('pagehide', flush);
    if (editor) {
      let empty = true
      try { empty = !localStorage.getItem('byline.doc.html') } catch { empty = false }
      if (empty) {
        void idbGetDoc().then(html => {
          if (html && html.trim() && editor && !editor.isDestroyed) editor.commands.setContent(html)
        })
      }
    }
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [editor])

  const parseSelGrid = (res: any): SelGrid => {
    if (res?.grid && typeof res.grid === 'object') {
      const out = { ...EMPTY_GRID } as SelGrid
      let any = false
      for (const c of SEL_COLS) {
        const list = Array.isArray(res.grid[c]) ? res.grid[c] : []
        out[c] = list.filter((s: string) => typeof s === 'string' && s.trim()).map((s: string) => s.trim()).slice(0, 6)
        if (out[c].length > 0) any = true
      }
      if (any) return out
    }
    if (Array.isArray(res?.synonyms) && res.synonyms.length > 0) {
      const flat = res.synonyms.filter((s: string) => typeof s === 'string' && s.trim()).map((s: string) => s.trim())
      const out = { ...EMPTY_GRID } as SelGrid
      flat.forEach((s: string, i: number) => { out[SEL_COLS[i % 3]].push(s) })
      return out
    }
    return EMPTY_GRID
  }

  const requestSelGrid = async (ctxArg?: SelectionContext) => {
    const ctx = ctxArg ?? selectionContext
    if (!editor || !ctx) return
    const { selectedText, from } = ctx
    if (selectedText.trim().length < 2) return
    if (selTimerRef.current) {
      window.clearTimeout(selTimerRef.current)
      selTimerRef.current = null
    }
    const myId = ++selReqId.current
    selAbort.current?.abort()
    const ctl = new AbortController()
    selAbort.current = ctl
    setSelLoading(true)
    setSelError(null)
    try {
      const before = editor.state.doc.textBetween(Math.max(0, from - 300), from, '\n')
      const selKey = 'sel:' + hashKey([suggestionNote, appSettings.writingTheme, selectedText.trim().toLowerCase(), before.slice(-300)])
      const cachedSel = cacheGet<any>(selKey)
      const res = cachedSel ?? await api.synonyms({
        context: suggestionNote,
        level: appSettings.writingTheme || 'General',
        word: selectedText.trim().slice(0, 500),
        sentence: before,
      }, ctl.signal)
      if (ctl.signal.aborted || selReqId.current !== myId) return
      const live = editor.state.selection
      if (live.from !== ctx.from || live.to !== ctx.to) return
      if (!cachedSel && res) cacheSet(selKey, res)
      const grid = parseSelGrid(res)
      const any = SEL_COLS.some(c => (grid[c] ?? []).length > 0)
      setSelGrid(grid)
      setSelError(any ? null : (res ? 'No alternatives found.' : 'Could not load alternatives.'))
      setSelCol(1)
      setSelRow(0)
      setSelPage(0)
      blip('done')
    } catch {
      if (ctl.signal.aborted || selReqId.current !== myId) return
      setSelGrid(EMPTY_GRID)
      setSelError('Could not load alternatives.')
      setSelCol(1)
      setSelRow(0)
      setSelPage(0)
    } finally {
      if (selAbort.current === ctl) selAbort.current = null
      if (selReqId.current === myId) setSelLoading(false)
    }
  }

  const abortSelRequest = () => {
    selAbort.current?.abort()
    selAbort.current = null
    selReqId.current++
    if (selTimerRef.current) {
      window.clearTimeout(selTimerRef.current)
      selTimerRef.current = null
    }
    setSelLoading(false)
  }

  const handleAcceptSelCell = (col: number, row: number) => {
    if (!editor || !selectionContext) return
    const opt = visibleCells(selGrid, col, selPage)[row]
    if (opt == null) return
    const { from, to, selectedText } = selectionContext
    const currentSlice = editor.state.doc.textBetween(from, to)
    if (currentSlice.trim() !== selectedText.trim()) {
      notify('Selected text was modified during request. Edit aborted safely.')
      setSelectionContext(null)
      setSelGrid(EMPTY_GRID)
      return
    }
    try {
      editor.chain().focus().insertContentAt({ from, to }, opt).run()
      sfxAccept()
      setSelectionContext(null)
      setSelGrid(EMPTY_GRID)
    } catch {
      notify('Failed to insert replacement.')
    }
  }

  const handleDismissSel = () => {
    blip('dismiss')
    abortSelRequest()
    setSelectionContext(null)
    setSelGrid(EMPTY_GRID)
  }

  const handleSelRefetch = () => {
    recordGhostReroll()
    void requestSelGrid()
  }

  const canExpandConnect =
    !!selectionContext &&
    !connectSession &&
    hasConnectSelection(selectionContext.selectedText)

  const handleExpandConnect = () => {
    if (connectSessionRef.current) return
    const live = editor ? contextService.getSelectionContext(editor) : selectionContext
    if (!live || !hasConnectSelection(live.selectedText)) {
      notify('Select two or more sentences to expand Connect.')
      return
    }
    setSelectionContext(live)
    startConnect(live)
  }

  const shiftSelPage = (dir: 1 | -1) => {
    recordGhostReroll()
    const pages = Math.max(1, ...SEL_COLS.map(c => Math.ceil((selGrid[c]?.length || 0) / 3)))
    setSelPage(p => (p + dir + pages) % pages)
    setSelRow(0)
    blip('select')
  }

  useEffect(() => {
    if (selTimerRef.current) window.clearTimeout(selTimerRef.current)
    clearConnectTimer()
    if (!selectionContext || selectionContext.selectedText.trim().length < 2) {
      setSelGrid(EMPTY_GRID)
      setSelLoading(false)
      setSelError(null)
      return
    }
    abortGhostRequest()
    setGhostGroups(EMPTY_GHOST)
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setSuggestPopupPos(null)
    setSelError(null)

    if (selManualRef.current) {
      selManualRef.current = false
      return
    }
    setSelLoading(true)
    const pauseMs = Math.max(100, appSettings.slowMs)
    selTimerRef.current = window.setTimeout(() => { void requestSelGrid() }, pauseMs)
    return () => {
      if (selTimerRef.current) {
        window.clearTimeout(selTimerRef.current)
        selTimerRef.current = null
      }
    }
  }, [selectionContext]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyInlineSuggestion = (finding: Finding, suggestion: Suggestion) => {
    if (!editor) return
    const res = applySafeReplacement(editor, finding.anchor, suggestion.text)
    if (res.success) {
      void handleRunGrammar()
      recordRevisionAccepted()
      sfxAccept()
      globalAnalysisService.updateStatus(finding.id, 'resolved')
      setInlineReviewState(prev => {
        if (!prev) return null
        const remaining = prev.findings.filter(f => f.id !== finding.id)
        return remaining.length > 0 ? { ...prev, findings: remaining } : null
      })
    } else {
      notify(res.error || 'Failed to apply replacement.')
    }
  }

  const handleDismissInlineFinding = (findingId: string) => {
    sfxDismiss()
    globalAnalysisService.updateStatus(findingId, 'dismissed')
    setInlineReviewState(prev => {
      if (!prev) return null
      const remaining = prev.findings.filter(f => f.id !== findingId)
      return remaining.length > 0 ? { ...prev, findings: remaining } : null
    })
  }

  const handleContinueReview = () => {
    if (!editor) return
    const currentIds = new Set(inlineReviewState?.findings.map(f => f.id) ?? [])
    const positioned: Array<{ f: Finding; from: number }> = []
    for (const f of findings) {
      if (f.status === 'resolved' || f.status === 'dismissed') continue
      if (reviewPersona !== 'all' && f.persona !== reviewPersona) continue
      if (currentIds.has(f.id)) continue
      try {
        const r = resolveAnchor(editor, f.anchor)
        if (r) positioned.push({ f, from: r.from })
      } catch { /* stale anchor: skip */ }
    }
    if (positioned.length === 0) {
      notify('No more comments.')
      return
    }
    positioned.sort((a, b) => a.from - b.from)
    const caret = editor.state.selection.from
    const next = positioned.find(p => p.from > caret) ?? positioned[0]
    editor.chain().setTextSelection({ from: next.from, to: next.from }).scrollIntoView().run()
    const atAnchor = positioned.filter(p => p.from === next.from).map(p => p.f)
    setInlineReviewState({
      findings: atAnchor,
      position: placePopupBesideEditor(editor.view, next.from, 320, 220, 220),
    })
    setSelectionContext(null)
    setHighlightedFindingId(atAnchor[0].id)
    blip('select')
  }

  const [repromptingId, setRepromptingId] = useState<string | null>(null)

  const handleRepromptReader = async (finding: Finding) => {
    if (!editor || repromptingId || finding.persona !== 'reader') return
    setRepromptingId(finding.id)
    blip('select')
    try {
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
      const avoid = finding.suggestions.map(s => s.text)
      const res = await api.reactions({
        context: contextNote,
        level: appSettings.writingTheme,
        text,
        persona: 'Critical Reader',
        avoid,
      })
      const seen = new Set(avoid.map(t => t.trim().toLowerCase()))
      const fresh: string[] = []
      if (res?.ok && Array.isArray(res.reactions)) {
        for (const rx of res.reactions) {
          if ((rx.quote || '') !== finding.anchor.quotedText) continue
          for (const o of (Array.isArray(rx.options) ? rx.options : [])) {
            const t = typeof o === 'string' ? o.trim() : ''
            if (t && !seen.has(t.toLowerCase())) {
              seen.add(t.toLowerCase())
              fresh.push(t)
            }
          }
        }
      }
      if (fresh.length === 0) {
        notify('No new options — the reader stands by its suggestions.')
        return
      }
      const merged = [
        ...fresh.map((t, i) => ({
          id: `${finding.id}-re-${Date.now()}-${i}`,
          text: t,
          rationale: 'Reader rewrite (reprompt)',
        })),
        ...finding.suggestions,
      ].slice(0, 6)
      globalAnalysisService.updateSuggestions(finding.id, merged)
      setInlineReviewState(prev =>
        prev ? { ...prev, findings: prev.findings.map(f => (f.id === finding.id ? { ...f, suggestions: merged } : f)) } : prev
      )
      blip('done')
    } catch {
      notify('Reprompt failed. Try again.')
    } finally {
      setRepromptingId(null)
    }
  }

  const ghostOpen = suggestPopupPos != null && GHOST_LEVELS.some(l => ghostGroups[l].length > 0)
  const selOpen = selectionContext != null && SEL_COLS.some(c => selGrid[c].length > 0)
  const ghostActive = !!suggestPopupPos && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState
  const reviewActive = !!(leftOpen || isMobile) && !!inlineReviewState && inlineReviewState.findings.length > 0
  const selectionActive =
    !!selectionContext && !inlineReviewState && (selOpen || selLoading || !!selError)
  const connectActive = !!connectSession
  const ghostVisible = !isMobile && ghostActive
  const reviewVisible = !isMobile && reviewActive
  const selectionVisible = !isMobile && selectionActive
  const connectVisible = !isMobile && connectActive
  const ghostRenderPos = ghostVisible && suggestPopupPos
    ? { ...suggestPopupPos, y: suggestPopupPos.y + popupPush.ghost }
    : null
  const selectionRenderPos = selectionVisible
    ? { ...popupPos, y: popupPos.y + popupPush.selection }
    : null
  const reviewRenderPos = reviewVisible && inlineReviewState
    ? { ...inlineReviewState.position, y: inlineReviewState.position.y + popupPush.review }
    : null
  const connectRenderTop = connectVisible ? connectPos.y + popupPush.connect : null

  const samePos = (a: { x: number; y: number } | null, b: { x: number; y: number }) =>
    a != null && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1
  useEffect(() => {
    if (!editor || !editor.view) return
    try {
      if (selectionContext && (selOpen || selLoading)) {
        const next = placePopupBesideEditor(editor.view, editor.state.selection.to, 400, 300, 220)
        setPopupPos(prev => (samePos(prev, next) ? prev : next))
      } else if (suggestPopupPos && (ghostOpen || draftLoading)) {
        const next = placePopupBesideEditor(editor.view, editor.state.selection.from, 440, 260, 220)
        setSuggestPopupPos(prev => (samePos(prev, next) ? prev : next))
      } else if (inlineReviewState && inlineReviewState.findings.length > 0) {
        const next = placePopupBesideEditor(editor.view, editor.state.selection.from, 320, 220, 220)
        setInlineReviewState(prev =>
          prev && samePos(prev.position, next) ? prev : prev ? { ...prev, position: next } : prev
        )
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docRevision, selectionContext, selOpen, selLoading, ghostOpen, draftLoading, inlineReviewState, placePopupBesideEditor])

  useLayoutEffect(() => {
    if (isMobile) return
    const boxes: PopupBox[] = []
    const collect = (
      id: PopupId,
      node: HTMLDivElement | null,
      base: { x: number; y: number; w?: number } | null,
      visible: boolean,
    ) => {
      if (!visible || !node || !base) return
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      boxes.push({ id, x: rect.left, y: base.y, width: rect.width, height: rect.height })
    }
    collect('ghost', popupRefs.current.ghost, suggestPopupPos, ghostVisible)
    collect('selection', popupRefs.current.selection, popupPos, selectionVisible)
    collect('review', popupRefs.current.review, inlineReviewState?.position ?? null, reviewVisible)
    collect('connect', popupRefs.current.connect, connectPos, connectVisible)

    if (boxes.length < 2) {
      setPopupPush(prev =>
        prev.ghost === 0 && prev.selection === 0 && prev.review === 0 && prev.connect === 0
          ? prev
          : { ghost: 0, selection: 0, review: 0, connect: 0 },
      )
      return
    }

    const next = cascadePopupRects(boxes, window.innerHeight)
    setPopupPush(prev =>
      prev.ghost === next.ghost &&
      prev.selection === next.selection &&
      prev.review === next.review &&
      prev.connect === next.connect
        ? prev
        : next,
    )
  }, [
    isMobile,
    ghostVisible,
    selectionVisible,
    reviewVisible,
    connectVisible,
    suggestPopupPos,
    popupPos,
    inlineReviewState,
    connectPos,
    ghostGroups,
    ghostLv,
    ghostIdx,
    draftLoading,
    selGrid,
    selCol,
    selRow,
    selPage,
    selLoading,
    selError,
    selectionContext,
    connectSession,
    docRevision,
  ])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (connectSessionRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault()
          undoConnect()
          return
        }
        if ((e.key === 'Tab' || e.key === 'Enter') && !e.shiftKey) {
          e.preventDefault()
          keepConnect()
          return
        }
        if (e.altKey && e.code === 'KeyR') {
          e.preventDefault()
          if (!e.repeat) rerollConnect()
          return
        }
        if (e.code === 'Backquote' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (e.repeat) return
          if (e.shiftKey && !e.altKey) { undoConnect(); return }
          const n = connectSessionRef.current?.seams.length ?? 0
          if (n <= 0) return
          const f = ((connectFocus % n) + n) % n
          if (e.altKey && !e.shiftKey) { cycleConnectAlt(f, -1); return }
          if (!e.altKey && !e.shiftKey) { cycleConnectAlt(f, 1); return }
        }
        if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          if (e.repeat) return
          const n = connectSessionRef.current?.seams.length ?? 0
          if (n > 0) {
            setConnectFocus(f => (f + 1) % n)
            blip('select')
          }
          return
        }
        if (e.altKey && (e.code === 'Digit0' || e.key === '0') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault()
          if (!e.repeat) rerollConnect()
          return
        }
      }

      if (e.key === 'Tab' && !e.shiftKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (selOpen) {
          const cells = visibleCells(selGrid, selCol, selPage)
          if (cells[selRow] != null) handleAcceptSelCell(selCol, selRow)
        } else {
          handleSelectSuggestion(ghostIdx)
        }
        return
      }

      if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (selOpen) { shiftSelPage(1); return }
        const i = GHOST_LEVELS.indexOf(ghostLv)
        handleGhostLevel(GHOST_LEVELS[(i + 1) % GHOST_LEVELS.length])
        return
      }

      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && (ghostOpen || selOpen) && !inlineReviewState) {
        const n = Number(e.key)
        if (selOpen) {
          const col = Math.floor((n - 1) / 3)
          const row = (n - 1) % 3
          if (col < SEL_COLS.length && visibleCells(selGrid, col, selPage)[row] != null) {
            e.preventDefault()
            setSelCol(col)
            setSelRow(row)
            blip('select')
          }
          return
        }
        if (n <= GHOST_LEVELS.length) {
          e.preventDefault()
          handleGhostLevel(GHOST_LEVELS[n - 1])
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === ']') && (ghostOpen || selOpen)) {
        e.preventDefault()
        if (e.repeat) return
        const dir: 1 | -1 = e.key === ']' ? 1 : -1
        if (ghostOpen) handleGhostReroll(dir)
        else shiftSelPage(dir)
        return
      }

      if (e.code === 'Backquote' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (!e.repeat) {
          handleDismissSuggestions()
          handleDismissSel()
        }
        return
      }

      if (e.code === 'Backquote' && !e.shiftKey && !e.ctrlKey && !e.metaKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (ghostOpen) {
          if (e.altKey) { stepGhostOption(-1); return }
          stepGhostOption(1)
          return
        }
        if (e.altKey) { shiftSelPage(-1); return }
        shiftSelPage(1)
        return
      }

      if (e.altKey && (e.code === 'Digit0' || e.key === '0') && !e.ctrlKey && !e.metaKey && !e.shiftKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (ghostOpen) handleGhostRefetch()
        else handleSelRefetch()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault()
        handleShowLastSuggestion()
        return
      }

      if (ghostOpen && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        const i = GHOST_LEVELS.indexOf(ghostLv)
        handleGhostLevel(GHOST_LEVELS[(i + (e.key === 'ArrowDown' ? 1 : GHOST_LEVELS.length - 1)) % GHOST_LEVELS.length])
        return
      }
      if (selOpen && /^Arrow/.test(e.key)) {
        e.preventDefault()
        if (e.key === 'ArrowLeft') setSelCol(c => (c + SEL_COLS.length - 1) % SEL_COLS.length)
        if (e.key === 'ArrowRight') setSelCol(c => (c + 1) % SEL_COLS.length)
        const n = Math.max(1, visibleCells(selGrid, selCol, selPage).length)
        if (e.key === 'ArrowUp') setSelRow(r => (r + n - 1) % n)
        if (e.key === 'ArrowDown') setSelRow(r => (r + 1) % n)
        return
      }

      if (e.key === 'Escape' && (ghostOpen || selOpen || draftLoading || selLoading)) {
        e.preventDefault()
        handleDismissSuggestions()
        handleDismissSel()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        const liveSel = editor ? contextService.getSelectionContext(editor) : null
        if (liveSel) {
          selManualRef.current = true
          setSelectionContext(liveSel)
          void requestSelGrid(liveSel)
        } else {
          void handleRequestGhost()
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Slash') {
        e.preventDefault()
        const liveSel = editor ? contextService.getSelectionContext(editor) : null
        if (liveSel && hasConnectSelection(liveSel.selectedText)) startConnect(liveSel)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(v => !v)
        return
      }
    }

    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') e.preventDefault() }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [editor, ghostGroups, ghostLv, ghostIdx, selGrid, selCol, selRow, selPage, selectionContext, docRevision, draftLoading, selLoading, inlineReviewState, connectFocus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRunReader = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')

    try {
      const readerKey = 'reader:' + hashKey([contextNote, appSettings.writingTheme, text.slice(0, 8000)])
      const cachedReader = cacheGet<any>(readerKey)
      const readRes = cachedReader ?? await api.reactions({
        context: contextNote,
        level: appSettings.writingTheme,
        text,
        persona: 'Critical Reader',
      })
      if (!cachedReader && readRes?.ok) cacheSet(readerKey, readRes)

      const readerFindings: Finding[] = buildReaderFindings(
        readRes?.ok && Array.isArray(readRes.reactions) ? readRes.reactions : [],
        { documentRevision: docRevision, sourceRevision: docRevision },
      )

      // Replace, never append: reruns (often served from cache with identical
      // reactions) must refresh the list, not stack another copy of each note.
      globalAnalysisService.replacePersona('reader', readerFindings)
      blip('done')
    } catch {
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRunFullAnalysis = async () => {
    await handleRunGrammar()
    await handleRunReader()
  }

  const applyGrammarAutoFixes = (list: Finding[], opts?: { silent?: boolean }): Set<string> => {
    const applied = new Set<string>()
    if (!editor) return applied
    const candidates = list
      .filter(f => f.suggestions[0]?.text)
      .sort((a, b) => (b.anchor.startOffset ?? 0) - (a.anchor.startOffset ?? 0))
    let tr = editor.state.tr
    let touched = false

    for (const f of candidates) {
      const replacement = f.suggestions[0].text
      const resolved = resolveAnchor(editor, f.anchor)
      if (!resolved) continue
      if (replacement === resolved.matchedText) continue
      try {
        tr = tr.replaceWith(
          resolved.from,
          resolved.to,
          editor.schema.text(replacement)
        )
        touched = true
        applied.add(f.id)
        popStore.pops.push({
          id: f.id,
          from: resolved.from,
          to: resolved.from + replacement.length,
          expireAt: Date.now() + 1600,
        })
      } catch {
      }
    }

    if (touched) editor.view.dispatch(tr)

    if (applied.size > 0) {
      syncPops(editor)
      setTimeout(() => { if (editor) syncPops(editor) }, 1700)
      if (!opts?.silent) blip('done')
    }
    return applied
  }

  const handleRunGrammar = async () => {
    if (!editor || grammarAbort) return
    setAnalyzing(true)
    holdStore.holds = []
    syncHolds(editor)

    const ctl = new AbortController()
    setGrammarAbort(ctl)

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, TEXT_SEP)
    try {
      const timeout = setTimeout(() => ctl.abort(), 15000)

      const { findings: harperFindings, error: harperError } = await harperService.lint(
        text,
        appSettings.language,
        docRevision
      )

      clearTimeout(timeout)
      if (ctl.signal.aborted) return
      if (harperError) {
        notifyHarperError(harperError)
        globalAnalysisService.replacePersona('grammar', [])
        return
      }
      lastHarperErrorRef.current = null

      const caretNow = editor.state.doc.textBetween(0, editor.state.selection.from, TEXT_SEP).length
      const grammarFindings: Finding[] = harperFindings.filter(f => {
        if (!f.anchor.quotedText.trim()) return false
        const s = f.anchor.startOffset
        const e = f.anchor.endOffset
        if (s != null && e != null && s <= caretNow && caretNow <= e) return false
        return true
      })

      globalAnalysisService.replacePersona('grammar', grammarFindings)
      blip('done')
    } catch {
    } finally {
      holdStore.holds = []
      if (editor) syncHolds(editor)
      setAnalyzing(false)
      setGrammarAbort(null)
    }
  }

  const handleContextNote = (v: string) => {
    setContextNote(v)
    try { localStorage.setItem('byline.doc.contextNote', v) } catch {}
  }

  const handleSuggestionNote = (v: string) => {
    setSuggestionNote(v)
    try { localStorage.setItem('byline.doc.suggestionNote', v) } catch {}
  }

  if (!booted) {
    return (
      <BootLoader
        onDone={() => {
          setBooted(true)
          try { sessionStorage.setItem('byline.booted', '1') } catch {}
        }}
      />
    )
  }

  const mobileSheetOpen = isMobile && (
    (suggestPopupPos != null && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState) ||
    (selectionContext != null && !inlineReviewState && (selOpen || selLoading || !!selError)) ||
    (inlineReviewState != null && inlineReviewState.findings.length > 0) ||
    !!connectSession
  )

  return (
    <div
      className={`byline-app-container${mobileSheetOpen ? ' mobile-sheet-open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}
    >
      {notice && (
        <div
          role="alert"
          onClick={() => setNotice(null)}
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--bg)', fontSize: 13, fontWeight: 600,
            padding: '8px 16px', borderRadius: 6, zIndex: 999, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)', maxWidth: '90vw',
          }}
        >
          {notice}
        </div>
      )}
      {/* 1. Top Navigation Bar */}
      <TopNavigation
        onOpenSettings={() => { blip('open'); setSettingsOpen(true) }}
        onOpenMetrics={() => setMetricsOpen(true)}
        editor={editor}
        onToggleMobileDrawer={() => setMobileDrawerOpen(v => !v)}
        mobileDrawerOpen={mobileDrawerOpen}
        findingsCount={findings.filter(f => f.status === 'open' || f.status === 'stale').length}
        onSuggest={() => void handleRequestGhost()}
        draftLoading={draftLoading}
      />

      {/* 2. Workspace Layout: single left dock + center paper */}
      <div
        className="layout"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : `${leftOpen ? 'minmax(240px, 280px)' : '44px'} minmax(0, 1fr)`,
          flex: 1,
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
          padding: isMobile ? '4px 6px' : '6px 8px',
          gap: isMobile ? 0 : 8,
        }}
      >
        {/* Left Dock: Reader Review (the only review persona). Desktop only */}
        {!isMobile && (
          <aside
            ref={leftRailRef}
            className="rail"
            style={{
              height: '100%',
              overflow: 'hidden',
              background: 'var(--dock)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {leftOpen ? (
              <ReviewDock
                findings={findings}
                onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
                onRunAnalysis={handleRunFullAnalysis}
                analyzing={analyzing}
                editor={editor}
                highlightedFindingId={highlightedFindingId}
                onToggleCollapse={() => setLeftOpen(false)}
                onApplied={() => { void handleRunGrammar() }}
                personaFilter={reviewPersona}
                onPersonaFilterChange={setReviewPersona}
              />
            ) : (
              <div className="rail-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <button
                  type="button"
                  onClick={() => { blip('open'); setLeftOpen(true) }}
                  title="Expand dock — shows underlines"
                  style={{
                    width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                    textDecoration: 'underline', textDecorationColor: 'var(--ai)',
                    textDecorationThickness: 2, textUnderlineOffset: 3,
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Center: Expression (Paper Editor) */}
        <main
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Floating Word & Character Count Badge (Bottom Right) */}
          {appSettings.showWordCount && editor && (
            <div
              className="word-count-pill fade"
              style={{
                position: 'fixed',
                bottom: 16,
                right: 20,
                zIndex: 40,
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--muted)',
                background: 'var(--paper)',
                padding: '4px 10px',
                borderRadius: 99,
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-pop)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                pointerEvents: 'none',
                transition: 'right 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              title="Document Word & Character Count"
            >
              <span><strong>{counts.words}</strong> words</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{counts.chars} chars</span>
            </div>
          )}

          {/* Center: Expression (Paper Editor) */}
          <div ref={editorScrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 280px', minWidth: 220 }}>
                <ContextInput value={contextNote} onChange={handleContextNote} templates={REVIEW_TEMPLATES} />
              </div>
              <SuggestionContext value={suggestionNote} onChange={handleSuggestionNote} />
            </div>
            {/* Paper Editor Container */}
            <div
              ref={editorScrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px 80px',
                minHeight: 0,
              }}
            >
              <div
                className="paper"
                style={{
                  width: '100%',
                  maxWidth:
                    appSettings.paperWidth === 'narrow'
                      ? '58ch'
                      : appSettings.paperWidth === 'wide'
                      ? '92ch'
                      : appSettings.paperWidth === 'full'
                      ? '100%'
                      : '72ch',
                  margin: '0 auto',
                  boxSizing: 'border-box',
                }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Unified caret popup (feel-test): ghost levels at caret, selection grid on range */}
            {ghostRenderPos && (
              <CaretPopup
                containerRef={setPopupRef('ghost')}
                mode="ghost"
                position={ghostRenderPos}
                maxWidth={ghostRenderPos.w}
                loading={draftLoading}
                ghostGroups={ghostGroups}
                ghostLv={ghostLv}
                ghostIdx={ghostIdx}
                onGhostLevel={handleGhostLevel}
                onAccept={() => handleSelectSuggestion(ghostIdx)}
                onNext={() => stepGhostOption(1)}
                onPrev={() => stepGhostOption(-1)}
                onReroll={handleGhostRefetch}
                onDismiss={handleDismissSuggestions}
              />
            )}

            {/* Inline Review Popup directly below cursor/underlined text when left dock is open */}
            {reviewRenderPos && inlineReviewState && (
              <InlineReviewPopup
                containerRef={setPopupRef('review')}
                findings={inlineReviewState.findings}
                position={reviewRenderPos}
                editor={editor}
                onApplySuggestion={handleApplyInlineSuggestion}
                onDismissFinding={handleDismissInlineFinding}
                onClose={() => setInlineReviewState(null)}
                onContinue={handleContinueReview}
                onReprompt={handleRepromptReader}
                repromptingId={repromptingId}
              />
            )}

            {/* Selection grid positioned below the range */}
            {selectionRenderPos && (
              <CaretPopup
                containerRef={setPopupRef('selection')}
                mode="sel"
                position={selectionRenderPos}
                maxWidth={selectionRenderPos.w}
                loading={selLoading}
                message={selError || undefined}
                showConnect={canExpandConnect}
                onConnect={handleExpandConnect}
                selGrid={selGrid}
                selCol={selCol}
                selRow={selRow}
                selPage={selPage}
                onSelCell={handleAcceptSelCell}
                onAccept={() => handleAcceptSelCell(selCol, selRow)}
                onNext={() => shiftSelPage(1)}
                onPrev={() => shiftSelPage(-1)}
                onReroll={handleSelRefetch}
                onDismiss={handleDismissSel}
              />
            )}
          </div>
        </main>

      </div>

      {/* Mobile: left dock becomes a slide-over drawer */}
      {isMobile && mobileDrawerOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            background: 'rgba(20,20,25,.45)',
          }}
          onClick={() => setMobileDrawerOpen(false)}
        >
          <aside
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 48, bottom: 0, left: 0,
              width: 'min(320px, 88vw)',
              background: 'var(--dock)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <ReviewDock
              findings={findings}
              onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
              onRunAnalysis={handleRunFullAnalysis}
              analyzing={analyzing}
              editor={editor}
              highlightedFindingId={highlightedFindingId}
              onApplied={() => { void handleRunGrammar() }}
              personaFilter={reviewPersona}
              onPersonaFilterChange={setReviewPersona}
            />
          </aside>
        </div>
      )}

      {/* Mobile: one-tap ghost trigger (no keyboard shortcut on touch) */}
      {isMobile && !mobileSheetOpen && !mobileDrawerOpen && (
        <button
          type="button"
          className="mobile-only-btn mobile-suggest-fab"
          onClick={() => void handleRequestGhost()}
          disabled={draftLoading}
          title="Get writing suggestions"
          style={{
            position: 'fixed',
            right: 12,
            bottom: 'calc(64px + env(safe-area-inset-bottom))',
            zIndex: 90,
            minHeight: 44,
            minWidth: 44,
            padding: '10px 14px',
            borderRadius: 99,
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: '1px solid var(--ink)',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            opacity: draftLoading ? 0.6 : 1,
          }}
        >
          {draftLoading ? '…' : '✨ Suggest'}
        </button>
      )}

      {/* Mobile: bottom area hosts suggestions / paraphrase / comment UI */}
      {isMobile && ((suggestPopupPos && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState) ||
        (selectionContext && !inlineReviewState && (selOpen || selLoading || !!selError)) ||
        (inlineReviewState && inlineReviewState.findings.length > 0) ||
        connectSession) && (
        <div className="mobile-bottom-area">
          {suggestPopupPos && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState && (
            <CaretPopup
              sheet
              containerRef={setPopupRef('ghost')}
              mode="ghost"
              position={suggestPopupPos}
              maxWidth={suggestPopupPos.w}
              loading={draftLoading}
              ghostGroups={ghostGroups}
              ghostLv={ghostLv}
              ghostIdx={ghostIdx}
              onGhostLevel={handleGhostLevel}
              onAccept={() => handleSelectSuggestion(ghostIdx)}
              onNext={() => stepGhostOption(1)}
              onPrev={() => stepGhostOption(-1)}
              onReroll={handleGhostRefetch}
              onDismiss={handleDismissSuggestions}
            />
          )}
          {selectionContext && !inlineReviewState && (selOpen || selLoading || !!selError) && (
            <CaretPopup
              sheet
              containerRef={setPopupRef('selection')}
              mode="sel"
              position={popupPos}
              maxWidth={popupPos.w}
              loading={selLoading}
              message={selError || undefined}
              showConnect={canExpandConnect}
              onConnect={handleExpandConnect}
              selGrid={selGrid}
              selCol={selCol}
              selRow={selRow}
              selPage={selPage}
              onSelCell={handleAcceptSelCell}
              onAccept={() => handleAcceptSelCell(selCol, selRow)}
              onNext={() => shiftSelPage(1)}
              onPrev={() => shiftSelPage(-1)}
              onReroll={handleSelRefetch}
              onDismiss={handleDismissSel}
            />
          )}
          {inlineReviewState && inlineReviewState.findings.length > 0 && (
            <InlineReviewPopup
              sheet
              containerRef={setPopupRef('review')}
              findings={inlineReviewState.findings}
              position={inlineReviewState.position}
              editor={editor}
              onApplySuggestion={handleApplyInlineSuggestion}
              onDismissFinding={handleDismissInlineFinding}
              onClose={() => setInlineReviewState(null)}
              onContinue={handleContinueReview}
              onReprompt={handleRepromptReader}
              repromptingId={repromptingId}
            />
          )}
          {connectSession && (
            <div className="connect-pop" style={{ position: 'static', width: '100%' }}>
              <ConnectPanel
                session={connectSession}
                onToggleSeam={toggleConnectSeam}
                onCycleAlt={cycleConnectAlt}
                onCycleRelation={cycleConnectRelation}
                focus={connectFocus}
              />
            </div>
          )}
        </div>
      )}

      {!isMobile && connectSession && connectRenderTop != null && (
        <div ref={setPopupRef('connect')} className="connect-pop" style={{ position: 'fixed', left: Math.min(connectPos.x, Math.max(8, window.innerWidth - connectPos.w - 8)), top: connectRenderTop, width: Math.min(connectPos.w, window.innerWidth - 16), maxHeight: Math.max(160, window.innerHeight - (connectRenderTop ?? 80) - 16), overflow: 'auto', zIndex: 170 }}>
          <ConnectPanel
            session={connectSession}
            onToggleSeam={toggleConnectSeam}
            onCycleAlt={cycleConnectAlt}
            onCycleRelation={cycleConnectRelation}
            focus={connectFocus}
          />
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsMenu
          settings={appSettings}
          onChange={s => {
            setAppSettings(s)
            saveSettings(s)
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Benchmark & Telemetry Metrics Modal (DEMO) */}
      {metricsOpen && (
        <MetricsPopup
          onClose={() => setMetricsOpen(false)}
        />
      )}
    </div>
  )
}
