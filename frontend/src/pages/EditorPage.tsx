import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
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
import { useGhostTriggers, findConnectives, connectiveAlternatives } from '../hooks/useGhostTriggers'
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
      // Vitest/jsdom mounts expect the app container immediately
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') return true
    } catch { /* ignore */ }
    return false
  })
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Non-blocking error toast (replaces alert()).
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const notify = (msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }
  // Dedupe repeated Harper failure toasts (lint runs on every keystroke).
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
  // Private context note (display-only scratch above the draft; never sent to AI)
  const [contextNote, setContextNote] = useState(() => {
    try { return localStorage.getItem('byline.doc.contextNote') || '' } catch { return '' }
  })
  // Suggestion context (tone/audience constraints) sent with ghost + paraphrase requests
  const [suggestionNote, setSuggestionNote] = useState(() => {
    try { return localStorage.getItem('byline.doc.suggestionNote') || '' } catch { return '' }
  })

  // Single left dock (draggable). Reader underlines are on when dock is open.
  const [leftOpen, setLeftOpen] = useState(true)

  // Mobile & Tablet Responsiveness
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const rerollCountRef = useRef(0)
  // Last ghost suggestion (reopenable via Ctrl+. even after dismiss)
  const lastGhostRef = useRef<{ groups: GhostGroups; lv: GhostLevel; idx: number } | null>(null)
  // Completion-state level bias for the next auto trigger (consumed once)
  const pendingGhostBias = useRef<GhostLevel | null>(null)
  // Ghost request identity + abort controller (boundary-pause call saving)
  const ghostReqId = useRef(0)
  const ghostAbort = useRef<AbortController | null>(null)
  // Auto ghost is armed only by actual typing. Clicking or arrow-moving the
  // caret must not call the ghost prompt.
  const ghostAutoAllowedRef = useRef(false)
  // Selection-grid request identity + abort controller (Esc cancels the call)
  const selReqId = useRef(0)
  const selAbort = useRef<AbortController | null>(null)
  // Manual Ctrl+Space already fetched this selection; skip the pause timer.
  const selManualRef = useRef(false)
  // Armed-delay state: trigger held 350ms to confirm a real pause before firing
  const ghostArmed = useRef<{ key: string; at: number } | null>(null)
  // Idle-poll memo: cache the expensive textBetween snapshots (full text per
  // revision, caret offset per caret move) — the time-based trigger logic
  // below must still run on EVERY tick, since pause thresholds elapse while
  // nothing moves.
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

    // Predominantly horizontal swipe within 600ms
    if (Math.abs(deltaY) < 75 && elapsed < 600) {
      if (deltaX > 45 && !mobileDrawerOpen) {
        // Swipe to right to open merged drawer
        blip('open')
        setMobileDrawerOpen(true)
      } else if (deltaX < -45 && mobileDrawerOpen) {
        // Swipe to left to close merged drawer
        blip('toggle')
        setMobileDrawerOpen(false)
      }
    }
  }

  // Highlighted Finding Card
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null)

  const [docRevision, setDocRevision] = useState(1)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })

  // Reader findings state (the only review persona)
  const [findings, setFindings] = useState<Finding[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [grammarAbort, setGrammarAbort] = useState<AbortController | null>(null)

  // Selection & Paraphrase state (positioned below cursor)
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

  // Inline Review Popup state for clicked underlined text or selection in Edit mode
  const [inlineReviewState, setInlineReviewState] = useState<{
    findings: Finding[]
    position: { x: number; y: number; w?: number }
  } | null>(null)

  // Draft Assistance state (Ghost text & Suggestion popup below cursor)
  // Grouped ghost levels (one /api/complete call, app parses) + active level/index
  const [ghostGroups, setGhostGroups] = useState<GhostGroups>(EMPTY_GHOST)
  const [ghostLv, setGhostLv] = useState<GhostLevel>('fragment')
  // Most recently user-selected ghost level; new requests start here.
  const lastGhostLevel = useRef<GhostLevel>('fragment')
  const [ghostIdx, setGhostIdx] = useState(0)
  // Selection grid (one /api/synonyms call, app parses) + active cell/page
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

  // Ref to the editor scroll container so popups can scroll it into view
  const editorScrollRef = useRef<HTMLDivElement>(null)
  const leftRailRef = useRef<HTMLElement>(null)

  /**
   * Position every writing popup beside the editor, vertically aligned with the
   * cursor. Prefers the right side of the paper, falls back left, then clamps to
   * the viewport. Returns a width so the popup can shrink instead of overflowing.
   */
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

  // Initialize TipTap Editor with AnchorDecorations
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
      // A review apply dispatches a doc change that is not typing: don't let
      // the ghost poller treat the accept like fresh typing at the caret.
      ghostAutoAllowedRef.current = !consumeProgrammaticApplyFlag()
      if (connectSessionRef.current && !connectApplyingRef.current) keepConnectRef.current?.()
      setDocRevision(r => r + 1)
      // A keystroke invalidates the shown ghost/popup: clear it so the next
      // pause can trigger fresh text (previously the stale ghost kept the
      // auto-trigger poller blocked forever).
      if (anchorStore.ghost) {
        anchorStore.ghost = ''
        syncGhost(editor)
      }
      setGhostGroups(EMPTY_GHOST)
      setSuggestPopupPos(null)
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
      // Debounced persist: serializing the full doc on every keystroke
      // blocks the main thread; flush happens 1.5s after typing stops
      // (plus a pagehide flush below so no window is lost).
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        try {
          const html = editor.getHTML()
          localStorage.setItem('byline.doc.html', html)
          // Async durable backup (IndexedDB quota >> localStorage).
          void idbSetDoc(html)
        } catch { /* quota full: keep in-memory doc */ }
      }, 1500)
      globalAnalysisService.validateAnchors(editor)
      syncEditorDecorations(editor)
    },
    onSelectionUpdate: ({ editor, transaction }) => {
      if (connectApplyingRef.current) return
      // A pure caret move (click/arrow) is not typing: keep auto ghost off
      // until the next document-changing keystroke.
      if (!transaction.docChanged) ghostAutoAllowedRef.current = false
      // Caret/selection moves are user navigation, not typing: drop any ghost
      // text and popup instead of letting a pending call follow the new caret.
      clearGhostOnNavRef.current()
      const selCtx = contextService.getSelectionContext(editor)
      const at = editor.state.selection.from
      const to = editor.state.selection.to

      if (connectSessionRef.current) {
        const session = connectSessionRef.current
        const inside = at >= session.from && to <= session.to
        if (!inside) keepConnectRef.current?.()
      }

      // A new selection always dismisses a stale inline review. Reader review
      // opens from clicking an underline (see handleEditorClick), never from
      // drag-selecting across a finding.
      setInlineReviewState(null)

      // Selection and Connect are shown together for 2+ sentences. Connect is
      // an explicit expansion from the selection grid, never an automatic
      // replacement for synonyms / paraphrase / tone.
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
      // Keep the user's 2+ sentence drag selection: auto-connect must not
      // collapse the caret or unselect text unless the user explicitly types.
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

  const keepConnectFromPanel = () => {
    keepConnect()
    editor?.chain().focus().run()
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

  // Synchronize ProseMirror decorations (Underlines in Editing Mode)
  const syncEditorDecorations = useCallback((ed: typeof editor) => {
    if (!ed || !ed.view) return

    modeStore.mode = leftOpen ? 'editing' : 'drafting'

    // Locate active Reader findings (the only underline persona)
    const anchors: any[] = []
    const ranges = new Map<string, { from: number; to: number }>()

    for (const f of findings) {
      if (f.status === 'resolved' || f.status === 'dismissed') continue
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
  }, [findings, leftOpen])

  // Dispose the Harper worker and clear transient Connect marks on unmount
  useEffect(() => {
    return () => {
      connectStore.ranges = []
      connectSessionRef.current = null
      void harperService.dispose()
    }
  }, [])

  // Click on underlined text opens suggestions/comments popup below cursor (when left dock is open)
  useEffect(() => {
    if (!editor || !editor.view) return
    const dom = editor.view.dom
    const onClick = (e: MouseEvent) => {
      if (!leftOpen) return
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
    return () => dom.removeEventListener('click', onClick)
  }, [editor, leftOpen, findings, placePopupBesideEditor])

  // Sync reader underline state (on when left dock open) to decorations
  useEffect(() => {
    modeStore.mode = leftOpen ? 'editing' : 'drafting'
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [leftOpen, editor, syncEditorDecorations])

  // Subscribe to Reader findings
  useEffect(() => {
    return globalAnalysisService.subscribe(newFindings => {
      setFindings(newFindings)
    })
  }, [])

  // Re-sync editor decorations when findings change
  useEffect(() => {
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [findings, editor, syncEditorDecorations])

  // --- DRAFT ASSISTANCE & GHOST TEXT FOR BOTH MODES ---
  // Ghost level → backend assist granularity id (legacy flat-response formatting).
  const assistForLevel = (lv: GhostLevel): AssistGranularity =>
    lv === 'cue' ? 'Hint' : lv === 'question' ? 'Question' : lv === 'sentence' ? 'Sentence' : 'Phrase'

  /** Sync the inline ghost widget to the active (level, index). All levels,
   * including question, render as inline ghost text. */
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

  /** Parse one /api/complete response into grouped levels (new shape, flat fallback). */
  const parseGhostGroups = (res: any): GhostGroups => {
    if (res?.levels && typeof res.levels === 'object') {
      const fmt: Array<[GhostLevel, AssistGranularity]> = [['cue', 'Hint'], ['question', 'Question'], ['fragment', 'Phrase'], ['sentence', 'Sentence']]
      const out = { ...EMPTY_GHOST } as GhostGroups
      for (const [lv, ag] of fmt) {
        const list = Array.isArray(res.levels[lv]) ? res.levels[lv] : []
        // Backend prefetches LEVELS_N per level (shown + instant reroll alts)
        out[lv] = list.map((s: string) => formatSuggestionText(s, ag)).filter(Boolean).slice(0, 6)
      }
      if (GHOST_LEVELS.some(l => out[l].length > 0)) return out
    }
    if (Array.isArray(res?.suggestions) && res.suggestions.length > 0) {
      // Legacy flat shape: all options land under the current assist level
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
      // No prefetched alternatives to cycle: fall through to a fresh request.
    }
    // Request identity + abort: a newer keystroke/request cancels the in-flight
    // one so boundary pauses (type right at the threshold) don't burn full calls
    const myId = ++ghostReqId.current
    ghostAbort.current?.abort()
    const ctl = new AbortController()
    ghostAbort.current = ctl
    const reqVersion = docRevision
    recordGhostFired()
    setDraftLoading(true)
    // A fresh ghost request clears any open selection grid
    setSelGrid(EMPTY_GRID)
    if (!opts?.isAuto) blip('select')

    const cursorCtx = contextService.getCursorContext(editor, 400)

    // Position the popup beside the editor so loading shimmer is visible at caret height
    const cursorPos = editor.state.selection.from
    const selectionAtRequest = { from: editor.state.selection.from, to: editor.state.selection.to }
    setSuggestPopupPos(placePopupBesideEditor(editor.view, cursorPos, 440, 260, 220))

    try {
      // Text-only prompt, one call: backend returns all four levels, app parses.
      // Rerolls bypass cache via `avoid`; fresh/auto requests reuse 5min cache.
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
      // Aborted en route (newer keystroke won) — apply nothing, count it
      if (ctl.signal.aborted || ghostReqId.current !== myId) {
        recordGhostAborted()
        return
      }
      // Stale response (doc or caret moved on while fetching) — drop, count it.
      // A caret move without typing must not let ghost text attach elsewhere.
      const sel = editor.state.selection
      if (reqVersion !== docRevisionRef.current ||
          sel.from !== selectionAtRequest.from || sel.to !== selectionAtRequest.to) {
        recordGhostStaleDropped()
        return
      }
      if (cacheKey && !cached && res) cacheSet(cacheKey, res)

      const groups = parseGhostGroups(res)
      // Auto triggers may carry a completion-state bias; manual triggers use the assist default.
      // Rerolls stay on the currently selected level when it has fresh options.
      // Fall back to the default when the biased level came back empty.
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

      // Reposition popup beside the editor at the verified request caret
      setSuggestPopupPos(placePopupBesideEditor(editor.view, cursorPos, 440, 260, 220))

      if (!opts?.isAuto) blip('done')
    } catch {
      // Aborted by a caret move / newer request: never reopen the popup.
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

  /** Cycle prefetched alternatives in either direction; fetch when only one exists. */
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

  /** Step cached ghost alternatives only (` / alt+``) — never fetches. */
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

  /** Fresh ghost alternatives (redo). */
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

  /** Reopen the last ghost suggestion at the caret (Ctrl+.), even after dismiss/refresh. */
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

  // V4 dual-threshold ghost triggers: slow ~350ms pause-anywhere ghost
  // (+150ms arm ≈ 500ms total), long 2500ms between-sentence connective
  // + burst phrase. 100ms tick.
  useEffect(() => {
    // Feed keystroke into burst/sentence tracking (feel-test input handler).
    // NOTE: ProseMirror offsets include node overhead, so convert to a text-space
    // caret via the length of the text before the cursor.
    // A keystroke also aborts any in-flight auto ghost — the newer text wins.
    // (Counted once, at drop time inside the request handler.)
    if (ghostAbort.current) {
      ghostAbort.current.abort()
      ghostAbort.current = null
    }
    // A keystroke during the 350ms arm window cancels the pending fire (saved call)
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

  // Latest-state refs so the 100ms poller stays mounted across keystrokes
  // (previously docRevision/ghostGroups in deps recreated the interval on every
  // keystroke, so the pause timer never elapsed and auto-suggest never fired)
  const ghostGroupsRef = useRef(ghostGroups)
  ghostGroupsRef.current = ghostGroups
  const docRevisionRef = useRef(docRevision)
  docRevisionRef.current = docRevision
  const draftLoadingRef = useRef(draftLoading)
  draftLoadingRef.current = draftLoading
  const handleRequestGhostRef = useRef(handleRequestGhost)
  handleRequestGhostRef.current = handleRequestGhost

  useEffect(() => {
    if (!editor || isMobile) return
    const id = setInterval(() => {
      try {
        if (!editor || !editor.isFocused) return
        if (document.hidden) return
        if (draftLoadingRef.current) return
        const { empty, from } = editor.state.selection as { empty: boolean; from: number; to: number }
        if (!empty) return
        // Snapshot cache: full text is O(doc) so refresh it only when the
        // revision changed; the caret slice only on caret moves. Trigger
        // evaluation keeps running every tick regardless.
        const lp = lastPoll.current
        const rev = docRevisionRef.current
        if (lp.rev !== rev) {
          lp.full = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
          lp.rev = rev
          lp.from = -1
        }
        if (lp.from !== from) {
          // Convert PM offset → text offset (see note above)
          lp.textCaret = Math.min(editor.state.doc.textBetween(0, from, '\n\n').length, lp.full.length)
          lp.from = from
        }
        // Skip while a ghost popup or inline ghost is already visible
        const groups = ghostGroupsRef.current
        const ghostEmpty = GHOST_LEVELS.every(l => groups[l].length === 0)
        if (!ghostEmpty || anchorStore.ghost) return
        const full = lp.full
        const textCaret = lp.textCaret
        // Completion-state gate: pause-anywhere means an Empty caret line (blank
        // paragraph) still fires when the doc has content elsewhere — only code
        // fences (NA) and a near-empty doc suppress. Complete/Open bias level.
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
            // 150ms armed delay: confirm a real pause before firing. A keystroke
            // inside the window disarms (counted as a debounce-saved call).
            const key = `${textCaret}|${before.slice(-24)}`
            const now = performance.now()
            const armed = ghostArmed.current
            if (!armed || armed.key !== key) {
              ghostArmed.current = { key, at: now }
            } else if (now - armed.at >= GHOST_ARM_MS) {
              ghostArmed.current = null
              // Bias the preselected level: Complete → next sentence, Open → continuation
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
  }, [editor, isMobile])

  // Auto-run grammar on initial mount
  useEffect(() => {
    if (!editor) return
    const timer = setTimeout(() => {
      void handleRunGrammar()
    }, 800)
    return () => clearTimeout(timer)
  }, [editor])

  // Auto-run Reader review on mount
  useEffect(() => {
    if (!editor) return
    void handleRunGrammar()
    void handleRunReader()
  }, [editor])

  // Debounced grammar refresh when typing (Harper WASM, 200ms): underline refresh.
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

  /** Caret/selection moved without typing: cancel and hide ghost text. */
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
    // Esc-dismissed ghost stays gone until the next keystroke: a pause with
    // an unmoved caret must not reopen it on its own.
    ghostAutoAllowedRef.current = false
    abortGhostRequest()
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setGhostGroups(EMPTY_GHOST)
    setSuggestPopupPos(null)
    // Require a fresh pause before the next auto-fire (no instant loop),
    // but allow refire without typing — dismiss + pause again suggests again.
    ghostArmed.current = null
    try {
      ghostTriggers.ref.current.fired = {}
      ghostTriggers.touch()
    } catch { /* ignore */ }
  }

  // --- SELECTION GRID (Synonyms / Paraphrase / Tone, one call, app parses) ---
  const selTimerRef = useRef<number | null>(null)
  // Debounced doc persistence (see onUpdate) + flush-on-hide so the last
  // 1.5s window is never lost when the tab closes.
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
    // Recovery: localStorage empty but an IndexedDB backup exists (e.g. quota
    // eviction) — restore it instead of starting blank.
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
      // Legacy flat shape: round-robin across the three columns
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
    // Any length: drag-select of any size triggers paraphrase/synonyms.
    // Backend payload truncated to 500 chars; full text kept for replacement.
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
      // Drop a response whose selection has since moved on.
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

  /** Step the selection-grid cell forward/backward across visible cells. */
  const stepSelCell = (dir: 1 | -1) => {
    const cells: Array<[number, number]> = []
    SEL_COLS.forEach((_c, ci) => {
      visibleCells(selGrid, ci, selPage).forEach((_, ri) => cells.push([ci, ri]))
    })
    if (cells.length === 0) return
    const cur = cells.findIndex(([c, r]) => c === selCol && r === selRow)
    const at = cur < 0 ? (dir > 0 ? 0 : cells.length - 1) : (cur + dir + cells.length) % cells.length
    const [nc, nr] = cells[at]
    setSelCol(nc)
    setSelRow(nr)
    blip('select')
  }

  /** Refetch the selection grid (redo). */
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

  /** Page the selection grid forward/backward, wrapping at the ends. */
  const shiftSelPage = (dir: 1 | -1) => {
    recordGhostReroll()
    const pages = Math.max(1, ...SEL_COLS.map(c => Math.ceil((selGrid[c]?.length || 0) / 3)))
    setSelPage(p => (p + dir + pages) % pages)
    setSelRow(0)
    blip('select')
  }

  // Selection pause: fetch the paraphrase grid only after the selection has
  // settled for the configured pause. Manual Ctrl+Space flushes immediately.
  // Double-click and drag selection both flow through selectionContext.
  useEffect(() => {
    if (selTimerRef.current) window.clearTimeout(selTimerRef.current)
    clearConnectTimer()
    if (!selectionContext || selectionContext.selectedText.trim().length < 2) {
      setSelGrid(EMPTY_GRID)
      setSelLoading(false)
      setSelError(null)
      return
    }
    // A fresh selection clears any open ghost state (and cancels its call)
    abortGhostRequest()
    setGhostGroups(EMPTY_GHOST)
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setSuggestPopupPos(null)
    setSelError(null)

    // Every qualifying selection requests the synonym grid, including 2+
    // sentence selections. The Connect button/keyboard shortcut expands the
    // separate Connect panel.
    // Manual invoke already started the request; do not schedule a second one.
    if (selManualRef.current) {
      selManualRef.current = false
      return
    }
    // Immediate shimmer: popup renders in loading state during the pause
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

  // Handle inline review popup actions (Edit mode)
  const handleApplyInlineSuggestion = (finding: Finding, suggestion: Suggestion) => {
    if (!editor) return
    const res = applySafeReplacement(editor, finding.anchor, suggestion.text)
    if (res.success) {
      // Reactivate grammar immediately so red underlines return without typing.
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

  /** Continue: jump caret to the next open comment/underline after the caret. */
  const handleContinueReview = () => {
    if (!editor) return
    const currentIds = new Set(inlineReviewState?.findings.map(f => f.id) ?? [])
    const positioned: Array<{ f: Finding; from: number }> = []
    for (const f of findings) {
      if (f.status === 'resolved' || f.status === 'dismissed') continue
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

  /** Reprompt reader for one finding: prepend fresh options, old ones move back. */
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

  // Single keyboard router for the caret popup (feel-test keys + legacy 1-3 / Ctrl+[ ]).
  // Ghost mode and selection-grid mode are mutually exclusive.
  const ghostOpen = suggestPopupPos != null && GHOST_LEVELS.some(l => ghostGroups[l].length > 0)
  const selOpen = selectionContext != null && SEL_COLS.some(c => selGrid[c].length > 0)
  const ghostActive = !!suggestPopupPos && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState
  const reviewActive = !!leftOpen && !!inlineReviewState && inlineReviewState.findings.length > 0
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

  // Keep popups glued below the live caret/selection while open: recompute on
  // every doc change so each popup follows the caret as you type. Scrolling
  // never repositions (the popup stays fixed on screen) and never scrolls the
  // container — scroll-locking trapped the user at the popup area.
  // NOTE: sets are equality-guarded (same rounded coords → same state) so this
  // effect can never ping-pong into a render loop.
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

  // Downward-only cascade for floating popups. Base anchors stay aligned with
  // the caret/selection; measured overlaps push lower popups down without ever
  // moving an upper popup upward.
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
        if (e.altKey && /^Digit[1-9]$/.test(e.code)) {
          e.preventDefault()
          if (!e.repeat) toggleConnectSeam(Number(e.code.slice(5)) - 1)
          return
        }
        // Backquote family on the focused seam: ` next alt, alt+` prev, shift+` undo.
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
        // Shift+Tab moves seam focus; Alt+0 rerolls connectors.
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

      // Tab accepts the active option (not while the review popup owns Tab)
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

      // Shift+Tab continue: ghost next level, sel next page.
      if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (selOpen) { shiftSelPage(1); return }
        const i = GHOST_LEVELS.indexOf(ghostLv)
        handleGhostLevel(GHOST_LEVELS[(i + 1) % GHOST_LEVELS.length])
        return
      }

      // Digits select only (never accept): ghost 1-4 switches level,
      // sel 1-9 moves the active cell (Synonyms 1-3, Paraphrase 4-6, Tone 7-9).
      // Skipped while the review popup owns digits.
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

      // Reroll: Ctrl+] next alternative, Ctrl+[ previous alternative.
      if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === ']') && (ghostOpen || selOpen)) {
        e.preventDefault()
        if (e.repeat) return
        const dir: 1 | -1 = e.key === ']' ? 1 : -1
        if (ghostOpen) handleGhostReroll(dir)
        else shiftSelPage(dir)
        return
      }

      // Shift+` dismisses the open suggestion (Esc still closes too).
      if (e.code === 'Backquote' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (!e.repeat) {
          handleDismissSuggestions()
          handleDismissSel()
        }
        return
      }

      // Backquote family: ` next option, alt+` previous option.
      if (e.code === 'Backquote' && !e.shiftKey && !e.ctrlKey && !e.metaKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (ghostOpen) {
          if (e.altKey) { stepGhostOption(-1); return }
          stepGhostOption(1)
          return
        }
        if (e.altKey) { stepSelCell(-1); return }
        stepSelCell(1)
        return
      }

      // Alt+0 redo: fresh ghost alternatives / refetch selection grid.
      if (e.altKey && (e.code === 'Digit0' || e.key === '0') && !e.ctrlKey && !e.metaKey && !e.shiftKey && (ghostOpen || selOpen) && !inlineReviewState) {
        e.preventDefault()
        if (e.repeat) return
        if (ghostOpen) handleGhostRefetch()
        else handleSelRefetch()
        return
      }

      // Ctrl+. reopens the last ghost suggestion at the caret
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault()
        handleShowLastSuggestion()
        return
      }

      // Arrows: ghost switches level; sel moves across the grid
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

      // Escape dismisses the popup AND cancels any in-flight request
      if (e.key === 'Escape' && (ghostOpen || selOpen || draftLoading || selLoading)) {
        e.preventDefault()
        handleDismissSuggestions()
        handleDismissSel()
        return
      }

      // Ctrl/Cmd + Space activates the synonym grid for any selection and
      // ghost suggestion at a caret. Connect is expanded separately with its
      // button or Ctrl/Cmd+Shift+/.
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

      // Ctrl/Cmd + Shift + / expands Connect for the current 2+ sentence selection.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Slash') {
        e.preventDefault()
        const liveSel = editor ? contextService.getSelectionContext(editor) : null
        if (liveSel && hasConnectSelection(liveSel.selectedText)) startConnect(liveSel)
        return
      }

      // Ctrl/Cmd + , for Settings
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

  // --- READER (the only review persona) ---
  const handleRunReader = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')

    try {
      // Text-only prompt: no document context, outline, or intent is ever sent.
      // 5min cache keyed on text hash so re-entering Edit mode is instant.
      const readerKey = 'reader:' + hashKey([contextNote, appSettings.writingTheme, text.slice(0, 8000)])
      const cachedReader = cacheGet<any>(readerKey)
      const readRes = cachedReader ?? await api.reactions({
        context: contextNote,
        level: appSettings.writingTheme,
        text,
        persona: 'Critical Reader',
      })
      if (!cachedReader && readRes?.ok) cacheSet(readerKey, readRes)

      const readerFindings: Finding[] = []

      if (readRes?.ok && Array.isArray(readRes.reactions) && readRes.reactions.length > 0) {
        for (const rx of readRes.reactions) {
          // Prompt contract: only fixable passages come back, each with up to
          // 3 pre-fetched replacement options. Skip stragglers with no options.
          const options = (Array.isArray(rx.options) ? rx.options : [])
            .filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 0)
            .slice(0, 3)
          if (options.length === 0) continue
          const fid = `read-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          readerFindings.push({
            id: fid,
            documentId: 'active-doc',
            persona: 'reader',
            kind: 'reader_observation',
            anchor: {
              quotedText: rx.quote || rx.context || 'text',
              documentRevision: docRevision,
            },
            explanation: rx.text || 'Reader rewrite.',
            suggestions: options.map((t: string, i: number) => ({
              id: `${fid}-sug-${i}`,
              text: t,
              rationale: rx.text || 'Reader rewrite',
            })),
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          })
        }
      }

      globalAnalysisService.addFindings(readerFindings)
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
        // Batched: accumulate into one transaction (descending offsets stay
        // valid), single dispatch below instead of one tx per finding.
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
        // skip unsafe replacement
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

  // Grammar: underline-only review cards (no auto-fix). Red wavy underlines
  // on findings; writer fixes each manually via the inline review popup.
  const handleRunGrammar = async () => {
    if (!editor || grammarAbort) return
    setAnalyzing(true)
    // Clear any stale hold marks from a previous run
    holdStore.holds = []
    syncHolds(editor)

    const ctl = new AbortController()
    setGrammarAbort(ctl)

    // Canonical separator matches buildEditorTextMap so Harper span offsets map exactly
    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, TEXT_SEP)
    try {
      // Timeout safeguard: abort if grammar check takes too long
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

      // Caret guard — skip only the lint under the caret (still typing this word).
      // Harper offsets are text-space: convert the PM caret the same way.
      const caretNow = editor.state.doc.textBetween(0, editor.state.selection.from, TEXT_SEP).length
      const grammarFindings: Finding[] = harperFindings.filter(f => {
        if (!f.anchor.quotedText.trim()) return false
        // Skip only the lint under the caret (the word being typed/edited).
        // The old check dropped every lint at/after the caret, so accepting
        // one fix wiped all later underlines until the next keystroke.
        const s = f.anchor.startOffset
        const e = f.anchor.endOffset
        if (s != null && e != null && s <= caretNow && caretNow <= e) return false
        return true
      })

      globalAnalysisService.replacePersona('grammar', grammarFindings)
      blip('done')
    } catch {
      // silent
    } finally {
      holdStore.holds = []
      if (editor) syncHolds(editor)
      // Always release the gate — previously a timeout left grammarAbort set
      // forever, so later keystrokes never re-linted ("bit by bit" then stop)
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
    (selectionContext != null && !inlineReviewState && (selOpen || selLoading)) ||
    (inlineReviewState != null && inlineReviewState.findings.length > 0)
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
              />
            ) : (
              <div className="rail-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <button
                  type="button"
                  onClick={() => { blip('open'); setLeftOpen(true) }}
                  title="Expand Review Dock"
                  style={{ width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => { blip('open'); setLeftOpen(true) }}
                  title="Review"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--ai)' }}
                >
                  R
                </button>
                <button
                  type="button"
                  onClick={() => { blip('open'); setSettingsOpen(true) }}
                  title="Settings"
                  aria-label="Open settings"
                  style={{ width: 30, height: 30, padding: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}
                >
                  <SettingsIcon size={15} strokeWidth={1.8} />
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
                onNext={() => stepSelCell(1)}
                onPrev={() => stepSelCell(-1)}
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
            />
          </aside>
        </div>
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
              onNext={() => stepSelCell(1)}
              onPrev={() => stepSelCell(-1)}
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
                onReroll={rerollConnect}
                onKeep={keepConnectFromPanel}
                onUndo={undoConnect}
                focus={connectFocus}
              />
            </div>
          )}
        </div>
      )}

      {!isMobile && connectSession && connectRenderTop != null && (
        <div ref={setPopupRef('connect')} className="connect-pop" style={{ position: 'fixed', left: connectPos.x, top: connectRenderTop, width: connectPos.w, zIndex: 170 }}>
          <ConnectPanel
            session={connectSession}
            onToggleSeam={toggleConnectSeam}
            onCycleAlt={cycleConnectAlt}
            onCycleRelation={cycleConnectRelation}
            onReroll={rerollConnect}
            onKeep={keepConnectFromPanel}
            onUndo={undoConnect}
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
