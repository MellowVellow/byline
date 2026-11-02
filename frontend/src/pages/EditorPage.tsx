import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TableOfContents from '@tiptap/extension-table-of-contents'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'

import TopNavigation, { type AppMode } from '../components/TopNavigation'
import ReviewDock from '../components/ReviewDock'
import BootLoader from '../components/BootLoader'
import Library from '../components/Library'
import ExploreView from '../modes/explore/ExploreView'
import { loadLibrary, saveLibrary, loadConversations, saveConversations, type LibraryEntry, type ExploreConversation, type ExploreSnapshot } from '../data/mockLibrary'
import type { ResearchRow } from '../data/mockResearch'
import { useGhostTriggers, findConnectives, connectiveAlternatives } from '../hooks/useGhostTriggers'
import { classifyLine, ghostTriggerForState } from '../lib/sentence-state'
import { HARPER_HOLD_MS } from '../lib/harper-fallback'
import ContextInput from '../components/ContextInput'
import SetupWizard from '../components/SetupWizard'
import ConnectModal from '../components/ConnectModal'
import CaretPopup, {
  type GhostLevel, type GhostGroups, type SelGrid,
  GHOST_LEVELS, SEL_COLS, EMPTY_GHOST, EMPTY_GRID,
  ghostOption, visibleCells,
} from '../components/CaretPopup'
import InlineReviewPopup from '../components/InlineReviewPopup'
import SettingsMenu from '../components/SettingsMenu'
import MetricsPopup from '../components/MetricsPopup'
import TutorialOverlay, { isTourSeen, markTourSeen } from '../components/TutorialOverlay'
import { recordSuggestionOffered, recordSuggestionAccepted, recordRevisionAccepted, recordGhostFired, recordGhostCacheSaved, recordGhostAborted, recordGhostStaleDropped, recordGhostDebounceSaved } from '../lib/metrics'

import { AnchorDecorations, anchorStore, syncAnchors, syncGhost, syncFlash, flashStore, modeStore, syncPops, popStore, holdStore, syncHolds } from '../editor/decorations'
import { contextService, type SelectionContext } from '../services/context-service'
import { globalAnalysisService } from '../services/analysis-service'
import { harperService } from '../services/harper-service'
import { resolveAnchor, applySafeReplacement, TEXT_SEP } from '../editor/anchoring'
import type { ThemeId } from '../domain/document'
import type { Finding, Suggestion } from '../domain/finding'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { idbSetDoc, idbGetDoc } from '../lib/storage'
import { api } from '../lib/api'
import { hashKey, cacheGet, cacheSet, saveLastGhost, loadLastGhost } from '../lib/ai-cache'
import { GOLDEN_PATH_SAMPLE_DOC } from '../lib/fallback'
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

const SUGGESTION_POOLS: Record<AssistGranularity, string[][]> = {
  Hint: [
    ['economic yield', 'capital expenditure', 'transit mobility'],
    ['regional connectivity', 'productivity dividends', 'debt amortization'],
    ['corridor throughput', 'infrastructure capital', 'intercity networks'],
    ['carbon reduction', 'densified development', 'regional access'],
  ],
  Phrase: [
    ['yielding higher compounding returns across metropolitan regions.', 'which significantly mitigates municipal debt exposure.', 'demonstrating long-term return on infrastructure capital.'],
    ['accelerating regional labor mobility between dense cores.', 'providing a sustainable fiscal foundation for municipal bonds.', 'establishing durable connectivity across mid-distance corridors.'],
    ['substantially reducing carbon debt compared to highway expansions.', 'optimizing travel predictability for regional commuters.', 'balancing capital-intensive outlays with direct revenue capture.'],
  ],
  Sentence: [
    ['Core-to-core rail connectivity accelerates regional labor market mobility while reducing highway congestion.', 'Strategic electrification delivers higher long-term economic yields than road widening projects.', 'High upfront capital outlays are amortized through municipal land-value capture mechanisms.'],
    ['Investment in dedicated transit corridors creates durable productivity gains that highway expansions cannot match.', 'Metropolitan regions with electrified intercity links demonstrate resilient employment growth.', 'Addressing transit bottlenecks directly reduces multi-billion dollar losses from air corridor ground delays.'],
  ],
  Question: [
    ['How will regional transit authorities balance upfront capital outlays?', 'What policy incentives accelerate private-sector transit investment?', 'Which corridors offer the highest passenger density returns?'],
    ['Can land-value capture mechanisms sufficiently offset municipal bond liabilities?', 'How does rail predictability influence corporate location decisions?', 'What environmental dividends justify the initial construction disruption?'],
  ],
}

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  // App & View mode (V4: explore | drafting | editing)
  const [mode, setMode] = useState<AppMode>('drafting')
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
  const [connectOpen, setConnectOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  // Private context note (display-only scratch above the draft; never sent to AI)
  const [contextNote, setContextNote] = useState(() => {
    try { return localStorage.getItem('byline.doc.contextNote') || '' } catch { return '' }
  })

  // Expandable/Collapsible Docks (starts collapsed in draft mode for focus)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)

  // Mobile & Tablet Responsiveness
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const rerollCountRef = useRef(0)
  // Last ghost suggestion (reopenable via Ctrl+. even after dismiss)
  const lastGhostRef = useRef<{ groups: GhostGroups; lv: GhostLevel; idx: number } | null>(null)
  // Completion-state level bias for the next auto trigger (consumed once)
  const pendingGhostBias = useRef<GhostLevel | null>(null)
  // Ghost request identity + abort controller (boundary-pause call saving)
  const ghostReqId = useRef(0)
  const ghostAbort = useRef<AbortController | null>(null)
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
        setRightOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-launch interactive tour for first-timers (once per browser + once per session)
  useEffect(() => {
    try {
      if ((import.meta as any).env?.MODE === 'test') return
    } catch {}
    try {
      if (isTourSeen()) return
      if (sessionStorage.getItem('byline.tour_opened') === '1' && !demo) return
      if (!demo && isTourSeen()) return
      const timer = setTimeout(() => {
        setTutorialOpen(true)
        try { sessionStorage.setItem('byline.tour_opened', '1') } catch {}
      }, 700)
      return () => clearTimeout(timer)
    } catch {}
  }, [demo])

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
  const [popupPos, setPopupPos] = useState({ x: 200, y: 300 })

  // Inline Review Popup state for clicked underlined text or selection in Edit mode
  const [inlineReviewState, setInlineReviewState] = useState<{
    findings: Finding[]
    position: { x: number; y: number }
  } | null>(null)

  // Draft Assistance state (Ghost text & Suggestion popup below cursor)
  const [assistLevel, setAssistLevel] = useState<AssistGranularity>('Phrase')
  // Grouped ghost levels (one /api/complete call, app parses) + active level/index
  const [ghostGroups, setGhostGroups] = useState<GhostGroups>(EMPTY_GHOST)
  const [ghostLv, setGhostLv] = useState<GhostLevel>('fragment')
  const [ghostIdx, setGhostIdx] = useState(0)
  // Selection grid (one /api/synonyms call, app parses) + active cell/page
  const [selGrid, setSelGrid] = useState<SelGrid>(EMPTY_GRID)
  const [selCol, setSelCol] = useState(1)
  const [selRow, setSelRow] = useState(0)
  const [selPage, setSelPage] = useState(0)
  const [selLoading, setSelLoading] = useState(false)
  const [suggestPopupPos, setSuggestPopupPos] = useState<{ x: number; y: number } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)
  // V4: library, explore saves, connective bar
  const [library, setLibrary] = useState<LibraryEntry[]>(() => loadLibrary())
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ExploreConversation[]>(() => loadConversations())
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [exploreKey, setExploreKey] = useState(0)
  const [savedResearchIds, setSavedResearchIds] = useState<Set<number>>(new Set())
  const [connBar, setConnBar] = useState<{ why: string; opts: Array<{ label: string; apply: () => void }> } | null>(null)
  const [slowMs, setSlowMs] = useState(350)
  const [longMs, setLongMs] = useState(2500)
  const ghostTriggers = useGhostTriggers(slowMs, longMs)

  // Ref to the editor scroll container so popups can scroll it into view
  const editorScrollRef = useRef<HTMLDivElement>(null)
  // Ref to the right rail aside element so we can measure its actual rendered width
  const rightRailRef = useRef<HTMLElement>(null)
  const leftRailRef = useRef<HTMLElement>(null)

  /**
   * Convert a raw viewport coordinate from TipTap / getBoundingClientRect into a
   * safe { x, y } for position:fixed popups, accounting for:
   *   - right dock width (measured from DOM, clamp x to not overlap it)
   *   - viewport bottom (if popup would overflow, scroll editor container up)
   */
  const safePosFixed = useCallback(
    (viewportLeft: number, viewportBottom: number, popupW = 440, popupH = 300) => {
      // Measure both rails' actual edges from the DOM for accurate clamping.
      // Pure clamp — never scrolls the container (scroll-locking the viewport while
      // a popup is open trapped the user at the popup area).
      const rightRailLeft = rightRailRef.current
        ? rightRailRef.current.getBoundingClientRect().left
        : window.innerWidth - (rightOpen ? 318 : 52)
      const leftRailRight = leftRailRef.current
        ? leftRailRef.current.getBoundingClientRect().right
        : 16
      const maxRight = rightRailLeft - 16
      const minLeft = leftRailRight + 16
      const x = Math.max(minLeft, Math.min(viewportLeft, maxRight - popupW))
      return { x, y: viewportBottom + 8 }
    },
    [rightOpen]
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
      if (demo) return GOLDEN_PATH_SAMPLE_DOC
      try {
        const saved = localStorage.getItem('byline.doc.html')
        if (saved && saved.trim() && saved !== '<p></p>' && saved !== '<p></p>\n') return saved
      } catch {}
      return GOLDEN_PATH_SAMPLE_DOC
    })(),
    editorProps: {
      attributes: {
        spellcheck: appSettings.spellcheck ? 'true' : 'false',
        class: 'byline-paper-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setDocRevision(r => r + 1)
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
      if (!demo) {
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
      }
      globalAnalysisService.validateAnchors(editor)
      syncEditorDecorations(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      const selCtx = contextService.getSelectionContext(editor)
      const at = editor.state.selection.from
      const to = editor.state.selection.to

      // In Edit mode: check if selection overlaps any finding or cursor is on underlined text
      if (mode === 'editing') {
        const matchingFindings = findings.filter(f => {
          if (f.status === 'resolved' || f.status === 'dismissed') return false
          const rng = anchorStore.ranges.get(f.id)
          if (!rng) return false
          if (at === to) {
            return at >= rng.from && at <= rng.to
          }
          return Math.max(at, rng.from) < Math.min(to, rng.to)
        })

        if (matchingFindings.length > 0 && editor.view) {
          const coords = editor.view.coordsAtPos(to)
          setInlineReviewState({
            findings: matchingFindings,
            position: safePosFixed(coords.left, coords.bottom, 320, 200),
          })
          setSelectionContext(null)
          setHighlightedFindingId(matchingFindings[0].id)
          return
        }
      }

      // If no findings matched, standard selectionContext (Paraphrase popup below cursor)
      setSelectionContext(selCtx)
      if (selCtx && editor.view) {
        const coords = editor.view.coordsAtPos(selCtx.to)
        setPopupPos(safePosFixed(coords.left, coords.bottom, 400, 260))
      }
    },
    onCreate: ({ editor }) => {
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
    },
  })

  // Synchronize ProseMirror decorations (Underlines in Editing Mode)
  const syncEditorDecorations = useCallback((ed: typeof editor) => {
    if (!ed || !ed.view) return

    modeStore.mode = mode === 'explore' ? 'drafting' : mode

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
  }, [findings, mode])

  // Dispose the Harper worker when the editor page unmounts
  useEffect(() => {
    return () => { void harperService.dispose() }
  }, [])

  // Click on underlined text opens suggestions/comments popup below cursor (in Editing mode)
  useEffect(() => {
    if (!editor || !editor.view) return
    const dom = editor.view.dom
    const onClick = (e: MouseEvent) => {
      if (mode !== 'editing') return
      const target = (e.target as HTMLElement).closest('[data-anchor-id], [data-anchor-ids]')
      const anchorId = target?.getAttribute('data-anchor-id')
      const anchorIds = target?.getAttribute('data-anchor-ids')

      if (anchorId || anchorIds) {
        const ids = anchorId ? [anchorId] : (anchorIds?.split(',') || [])
        const matched = findings.filter(f => ids.includes(f.id) && f.status !== 'resolved' && f.status !== 'dismissed')
        if (matched.length > 0) {
          const rect = target!.getBoundingClientRect()
          setInlineReviewState({
            findings: matched,
            position: safePosFixed(rect.left, rect.bottom, 320, 200),
          })
          setSelectionContext(null)
          setHighlightedFindingId(matched[0].id)
    blip('select')
  }
      }
    }
    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, mode, findings, safePosFixed])

  // Sync mode changes to decorations
  useEffect(() => {
    modeStore.mode = mode === 'explore' ? 'drafting' : mode
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [mode, editor, syncEditorDecorations])

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

  // Populate a sample Reader finding in demo mode only — never inject
  // phantom findings into real documents.
  useEffect(() => {
    if (!demo || findings.length !== 0) {
      return
    }
    const demoFindings: Finding[] = [
      {
        id: 'f-demo-2',
        documentId: 'demo-doc',
        persona: 'reader',
        kind: 'reader_observation',
        anchor: {
          quotedText: 'low population density often lengthens the payback horizon',
          documentRevision: 1,
        },
        explanation: 'Reader perspective: A skeptical reader may ask how dense corridors can justify transit if suburban periphery remains sparse.',
        suggestions: [],
        status: 'open',
        sourceRevision: 1,
        createdAt: Date.now(),
      },
    ]
    globalAnalysisService.setFindings(demoFindings)
  }, [demo])

  // --- DRAFT ASSISTANCE & GHOST TEXT FOR BOTH MODES ---
  // Topbar assist setting → default ghost level in the popup
  const defaultGhostLv = (a: AssistGranularity): GhostLevel =>
    a === 'Hint' ? 'cue' : a === 'Question' ? 'question' : a === 'Sentence' ? 'sentence' : 'fragment'

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

  /** Map offline pools to grouped ghost levels. */
  const poolGroups = (): GhostGroups => ({
    cue: (SUGGESTION_POOLS.Hint[rerollCountRef.current % SUGGESTION_POOLS.Hint.length] || []).map(s => formatSuggestionText(s, 'Hint')),
    question: (SUGGESTION_POOLS.Question[rerollCountRef.current % SUGGESTION_POOLS.Question.length] || []).map(s => formatSuggestionText(s, 'Question')),
    fragment: (SUGGESTION_POOLS.Phrase[rerollCountRef.current % SUGGESTION_POOLS.Phrase.length] || []).map(s => formatSuggestionText(s, 'Phrase')),
    sentence: (SUGGESTION_POOLS.Sentence[rerollCountRef.current % SUGGESTION_POOLS.Sentence.length] || []).map(s => formatSuggestionText(s, 'Sentence')),
  })

  /** Parse one /api/complete response into grouped levels (new shape, flat fallback, offline pools). */
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
      const lv = defaultGhostLv(assistLevel)
      out[lv] = res.suggestions.slice(0, 3).map((s: string) => formatSuggestionText(s, assistLevel)).filter(Boolean)
      if (out[lv].length > 0) return out
    }
    return poolGroups()
  }

  const handleRequestGhost = async (opts?: { isAuto?: boolean; isReroll?: boolean }) => {
    if (!editor || !editor.view) return
    if (opts?.isReroll) {
      // Instant reroll: the first call prefetched alternates per level, so just
      // advance to the next prefetched option — zero network. Only when the
      // prefetched pool wraps do we fall through to a network refetch (avoid).
      const cur = ghostGroups[ghostLv] || []
      if (cur.length > 1) {
        const next = (ghostIdx + 1) % cur.length
        if (next !== 0) {
          setGhostIdx(next)
          lastGhostRef.current = { groups: ghostGroups, lv: ghostLv, idx: next }
          saveLastGhost({ groups: ghostGroups, lv: ghostLv, idx: next })
          showInlineGhost(ghostGroups, ghostLv, next)
          blip('select')
          return
        }
      }
      rerollCountRef.current += 1
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

    // Position the popup immediately below cursor so loading shimmer is visible
    const cursorPos = editor.state.selection.from
    const coordsEarly = editor.view.coordsAtPos(cursorPos)
    setSuggestPopupPos(safePosFixed(coordsEarly.left, coordsEarly.bottom, 440, 220))

    try {
      // Text-only prompt, one call: backend returns all four levels, app parses.
      // Rerolls bypass cache via `avoid`; fresh/auto requests reuse 5min cache.
      const avoid = opts?.isReroll ? GHOST_LEVELS.flatMap(l => ghostGroups[l]).slice(0, 24) : undefined
      const cacheKey = opts?.isReroll
        ? null
        : 'ghost:' + hashKey([appSettings.writingTheme, cursorCtx.before.slice(-400), cursorCtx.after.slice(0, 200)])
      const cached = cacheKey ? cacheGet<any>(cacheKey) : null
      if (cached) recordGhostCacheSaved()
      const res = cached ?? await api.complete({
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
      // Stale response (doc moved on while fetching) — drop, count it
      if (reqVersion !== docRevisionRef.current) {
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
      let lv = defaultGhostLv(assistLevel)
      if (opts?.isReroll && (groups[ghostLv] || []).length > 0) lv = ghostLv
      else if (biased && (groups[biased] || []).length > 0) lv = biased
      setGhostGroups(groups)
      setGhostLv(lv)
      setGhostIdx(0)
      lastGhostRef.current = { groups, lv, idx: 0 }
      saveLastGhost({ groups, lv, idx: 0 })
      recordSuggestionOffered(GHOST_LEVELS.reduce((n, l) => n + groups[l].length, 0))
      showInlineGhost(groups, lv, 0)

      // Reposition popup below current cursor
      const coords = editor.view.coordsAtPos(editor.state.selection.from)
      setSuggestPopupPos(safePosFixed(coords.left, coords.bottom, 440, 220))

      if (!opts?.isAuto) blip('done')
    } catch {
      const groups = poolGroups()
      const biased = pendingGhostBias.current
      pendingGhostBias.current = null
      let lv = defaultGhostLv(assistLevel)
      if (opts?.isReroll && (groups[ghostLv] || []).length > 0) lv = ghostLv
      else if (biased && (groups[biased] || []).length > 0) lv = biased
      setGhostGroups(groups)
      setGhostLv(lv)
      setGhostIdx(0)
      showInlineGhost(groups, lv, 0)

      const coords = editor.view.coordsAtPos(editor.state.selection.from)
      setSuggestPopupPos(safePosFixed(coords.left, coords.bottom, 440, 220))
    } finally {
      if (ghostAbort.current === ctl) ghostAbort.current = null
      if (ghostReqId.current === myId) setDraftLoading(false)
    }
  }

  const handleGhostLevel = (lv: GhostLevel) => {
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
    setGhostLv(lv)
    setGhostIdx(idx)
    setSelGrid(EMPTY_GRID)
    showInlineGhost(groups, lv, idx)
    const pos = editor.state.selection.from
    const coords = editor.view.coordsAtPos(pos)
    setSuggestPopupPos(safePosFixed(coords.left, coords.bottom, 440, 220))
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
  const connBarRef = useRef(connBar)
  connBarRef.current = connBar
  const docRevisionRef = useRef(docRevision)
  docRevisionRef.current = docRevision
  const draftLoadingRef = useRef(draftLoading)
  draftLoadingRef.current = draftLoading
  const handleRequestGhostRef = useRef(handleRequestGhost)
  handleRequestGhostRef.current = handleRequestGhost

  useEffect(() => {
    if (mode !== 'drafting' || !editor || isMobile) return
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
        if (t.ghost && !gate.suppress) {
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
        } else if (t.connective && !connBarRef.current) {
          ghostArmed.current = null
          const found = findConnectives(full, textCaret)
          if (found.length) {
            const pick = found.find(f => f.s >= from) || found[found.length - 1]
            const word = full.slice(pick.s, pick.e)
            const { why, opts } = connectiveAlternatives(word)
            if (opts.length) {
              setConnBar({
                why,
                opts: opts.map(o => ({
                  label: o,
                  apply: () => {
                    const cap = /^[A-Z]/.test(word) ? o[0].toUpperCase() + o.slice(1) : o
                    // Map plain-text offsets to editor via quoted-text anchor replace
                    const anchor = { quotedText: word, documentRevision: docRevisionRef.current }
                    const res = applySafeReplacement(editor, anchor, cap)
                    if (!res.success) {
                      // Fallback: insert at caret
                      editor.chain().focus().insertContentAt(from, ' ' + cap).run()
                    }
                    setConnBar(null)
                  },
                })),
              })
            }
          }
        }
      } catch { /* poller never throws */ }
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editor, isMobile])

  // Auto-run grammar on initial mount
  useEffect(() => {
    if (!editor) return
    const timer = setTimeout(() => {
      void handleRunGrammar()
    }, 800)
    return () => clearTimeout(timer)
  }, [editor])

  // Auto-run Reader review on switching to editing mode
  useEffect(() => {
    if (mode === 'editing' && editor) {
      void handleRunGrammar()
      void handleRunReader()
    }
  }, [mode, editor])

  // Debounced grammar refresh when typing (Harper WASM, 200ms): auto-fix in Draft, underline refresh in Edit.
  // `mode` is a dep so the run always uses the current mode's behavior.
  useEffect(() => {
    if (!editor) return
    const timer = setTimeout(() => {
      void handleRunGrammar()
    }, 200)
    return () => clearTimeout(timer)
  }, [docRevision, editor, mode]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDismissSuggestions = () => {
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
        if (editor && !demo) {
          const html = editor.getHTML()
          localStorage.setItem('byline.doc.html', html)
          void idbSetDoc(html)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('pagehide', flush);
    // Recovery: localStorage empty but an IndexedDB backup exists (e.g. quota
    // eviction) — restore it instead of starting blank.
    if (editor && !demo) {
      let empty = true
      try { empty = !localStorage.getItem('byline.doc.html') } catch { empty = false }
      if (empty) {
        void idbGetDoc().then(html => {
          if (html && html.trim() && editor && !editor.isDestroyed) editor.commands.setContent(html)
        })
      }
    }
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [editor, demo])

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
    return stubSelGrid(selectionContext?.selectedText || '')
  }

  const stubSelGrid = (sel: string): SelGrid => {
    // Cap offline-fallback cells so long drag-selections don't blow up the popup.
    const cap = (s: string, n = 120) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s)
    const w = cap((sel || 'word').trim() || 'word')
    const words = w.split(/\s+/)
    const half = cap(words.slice(0, Math.max(1, Math.floor(words.length / 2))).join(' ') || w)
    return {
      Synonyms: [w],
      Paraphrase: [half, `in other words, ${half.toLowerCase()}`, `${half} — put plainly`],
      Tone: [`distinctly ${w}`, `clearly ${w}`, `compellingly expressed ${w}`],
    }
  }

  const requestSelGrid = async () => {
    if (!editor || !selectionContext) return
    const { selectedText, from } = selectionContext
    // Any length: drag-select of any size triggers paraphrase/synonyms.
    // Backend payload truncated to 500 chars; full text kept for replacement.
    if (selectedText.trim().length < 2) return
    setSelLoading(true)
    try {
      const before = editor.state.doc.textBetween(Math.max(0, from - 300), from, '\n')
      const selKey = 'sel:' + hashKey([appSettings.writingTheme, selectedText.trim().toLowerCase(), before.slice(-300)])
      const cachedSel = cacheGet<any>(selKey)
      const res = cachedSel ?? await api.synonyms({
        level: appSettings.writingTheme || 'General',
        word: selectedText.trim().slice(0, 500),
        sentence: before,
      })
      if (!cachedSel && res) cacheSet(selKey, res)
      const grid = parseSelGrid(res)
      setSelGrid(grid)
      setSelCol(1)
      setSelRow(0)
      setSelPage(0)
      blip('done')
    } catch {
      setSelGrid(stubSelGrid(selectedText))
      setSelCol(1)
      setSelRow(0)
      setSelPage(0)
    } finally {
      setSelLoading(false)
    }
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
    setSelectionContext(null)
    setSelGrid(EMPTY_GRID)
  }

  // Debounced selection-grid fetch: any drag-select (any length >= 2 chars)
  // triggers paraphrase/synonyms. Loading shows immediately so drags feel
  // instant; fetch fires 150ms after selection settles. Mouseup flushes
  // pending debounces so release → popup without waiting.
  useEffect(() => {
    if (selTimerRef.current) window.clearTimeout(selTimerRef.current)
    if (!selectionContext || selectionContext.selectedText.trim().length < 2) {
      setSelGrid(EMPTY_GRID)
      setSelLoading(false)
      return
    }
    // A fresh selection clears any open ghost state
    setGhostGroups(EMPTY_GHOST)
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setSuggestPopupPos(null)
    // Immediate shimmer: popup renders in loading state during debounce/fetch
    setSelLoading(true)
    selTimerRef.current = window.setTimeout(() => { void requestSelGrid() }, 150)
    const flushOnMouseUp = () => {
      if (selTimerRef.current) {
        window.clearTimeout(selTimerRef.current)
        selTimerRef.current = null
        void requestSelGrid()
      }
    }
    window.addEventListener('mouseup', flushOnMouseUp)
    return () => {
      if (selTimerRef.current) window.clearTimeout(selTimerRef.current)
      window.removeEventListener('mouseup', flushOnMouseUp)
    }
  }, [selectionContext]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle inline review popup actions (Edit mode)
  const handleApplyInlineSuggestion = (finding: Finding, suggestion: Suggestion) => {
    if (!editor) return
    const res = applySafeReplacement(editor, finding.anchor, suggestion.text)
    if (res.success) {
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

  // Single keyboard router for the caret popup (feel-test keys + legacy 1-3 / Alt+R).
  // Ghost mode and selection-grid mode are mutually exclusive.
  const ghostOpen = suggestPopupPos != null && GHOST_LEVELS.some(l => ghostGroups[l].length > 0)
  const selOpen = selectionContext != null && SEL_COLS.some(c => selGrid[c].length > 0)

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
        const coords = editor.view.coordsAtPos(editor.state.selection.to)
        const next = safePosFixed(coords.left, coords.bottom, 400, 260)
        setPopupPos(prev => (samePos(prev, next) ? prev : next))
      } else if (suggestPopupPos && (ghostOpen || draftLoading)) {
        const coords = editor.view.coordsAtPos(editor.state.selection.from)
        const next = safePosFixed(coords.left, coords.bottom, 440, 220)
        setSuggestPopupPos(prev => (samePos(prev, next) ? prev : next))
      } else if (inlineReviewState && inlineReviewState.findings.length > 0) {
        const coords = editor.view.coordsAtPos(editor.state.selection.from)
        const next = safePosFixed(coords.left, coords.bottom, 320, 200)
        setInlineReviewState(prev =>
          prev && samePos(prev.position, next) ? prev : prev ? { ...prev, position: next } : prev
        )
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docRevision, selectionContext, selOpen, selLoading, ghostOpen, draftLoading, inlineReviewState, safePosFixed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Bare Alt rerolls (feel-test); Alt+R legacy reroll
      if (e.key === 'Alt' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (selOpen || ghostOpen) {
          e.preventDefault()
          if (selOpen) { setSelPage(p => p + 1); setSelRow(0); }
          else void handleRequestGhost({ isReroll: true })
          return
        }
      }
      if (e.altKey && (e.code === 'KeyR' || e.key === 'r') && (selOpen || ghostOpen)) {
        e.preventDefault()
        if (selOpen) { setSelPage(p => p + 1); setSelRow(0); }
        else void handleRequestGhost({ isReroll: true })
        return
      }

      // Tab accepts the active option
      if (e.key === 'Tab' && (ghostOpen || selOpen)) {
        e.preventDefault()
        if (selOpen) {
          const cells = visibleCells(selGrid, selCol, selPage)
          if (cells[selRow] != null) handleAcceptSelCell(selCol, selRow)
        } else {
          handleSelectSuggestion(ghostIdx)
        }
        return
      }

      // Digits: ghost 1-4 switches level (cue/question/fragment/sentence),
      // sel 1-9 accepts the global cell (Synonyms 1-3, Paraphrase 4-6, Tone 7-9)
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && (ghostOpen || selOpen)) {
        const n = Number(e.key)
        if (selOpen) {
          const col = Math.floor((n - 1) / 3)
          const row = (n - 1) % 3
          if (col < SEL_COLS.length && visibleCells(selGrid, col, selPage)[row] != null) {
            e.preventDefault()
            handleAcceptSelCell(col, row)
          }
          return
        }
        if (n <= GHOST_LEVELS.length) {
          e.preventDefault()
          handleGhostLevel(GHOST_LEVELS[n - 1])
        }
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

      // Alt+1..5 picks a connective alternative (feel-test)
      if (e.altKey && /^Digit[1-5]$/.test(e.code) && connBar) {
        e.preventDefault()
        connBar.opts[+e.code.slice(5) - 1]?.apply()
        return
      }

      // Escape dismisses everything
      if (e.key === 'Escape' && (ghostOpen || selOpen || connBar)) {
        e.preventDefault()
        setConnBar(null)
        handleDismissSuggestions()
        handleDismissSel()
        return
      }

      // Ctrl/Cmd + Space to request suggestions at caret
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        void handleRequestGhost()
        return
      }

      // Ctrl/Cmd + / to open Connect modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setConnectOpen(true)
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
  }, [editor, ghostGroups, ghostLv, ghostIdx, selGrid, selCol, selRow, selPage, selectionContext, assistLevel, docRevision, connBar]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- READER (the only review persona) ---
  const handleRunReader = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')

    try {
      // Text-only prompt: no document context, outline, or intent is ever sent.
      // 5min cache keyed on text hash so re-entering Edit mode is instant.
      const readerKey = 'reader:' + hashKey([appSettings.writingTheme, text.slice(0, 8000)])
      const cachedReader = cacheGet<any>(readerKey)
      const readRes = cachedReader ?? await api.reactions({
        level: appSettings.writingTheme,
        text,
        persona: 'Critical Reader',
      })
      if (!cachedReader && readRes?.ok) cacheSet(readerKey, readRes)

      const readerFindings: Finding[] = []

      if (readRes?.ok && Array.isArray(readRes.reactions) && readRes.reactions.length > 0) {
        for (const rx of readRes.reactions) {
          readerFindings.push({
            id: `read-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            documentId: 'active-doc',
            persona: 'reader',
            kind: 'reader_observation',
            anchor: {
              quotedText: rx.quote || rx.context || 'text',
              documentRevision: docRevision,
            },
            explanation: rx.text || 'Potential ambiguity or reader interpretation note.',
            suggestions: [],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          })
        }
      }

      // Demo-only fallback: sample findings when the backend is unreachable.
      // Real documents get an honest empty result, never phantom findings.
      if (demo && readerFindings.length === 0) {
        readerFindings.push(
          {
            id: `demo-read-1`,
            documentId: 'active-doc',
            persona: 'reader',
            kind: 'reader_observation',
            anchor: {
              quotedText: 'Cats are independent, as I said.',
              documentRevision: docRevision,
            },
            explanation: 'Reader confusion: refers back to something not yet established earlier.',
            suggestions: [],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          },
          {
            id: `demo-read-2`,
            documentId: 'active-doc',
            persona: 'reader',
            kind: 'reader_observation',
            anchor: {
              quotedText: 'Studies show that dog owners are always happier than cat owners.',
              documentRevision: docRevision,
            },
            explanation: 'Overbroad claim: "always happier" sounds absolute and invites skepticism without citation.',
            suggestions: [],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          }
        )
      }

      globalAnalysisService.addFindings(readerFindings)
      blip('done')
    } catch {
      // offline fallback
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRunFullAnalysis = async () => {
    // In Edit mode refresh grammar underlines too (manual-fix, never auto-fixed there)
    if (mode === 'editing') await handleRunGrammar()
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

  // Mode-aware grammar:
  // - Drafting: silent auto-fix (red hold underline → fix + green pop).
  // - Editing: red wavy underlines as review cards, fixed manually, never auto-fixed.
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

      const { findings: harperFindings } = await harperService.lint(
        text,
        appSettings.language,
        docRevision
      )

      clearTimeout(timeout)
      if (ctl.signal.aborted) return

      // Caret guard — skip lints at/behind the caret (still typing this word).
      // Harper offsets are text-space: convert the PM caret the same way.
      const caretNow = editor.state.doc.textBetween(0, editor.state.selection.from, TEXT_SEP).length
      const grammarFindings: Finding[] = harperFindings.filter(f => {
        if (!f.anchor.quotedText.trim()) return false
        // Offset-based lints (harper-service) can be guarded; quote-anchored fall back to include
        if (f.anchor.endOffset != null && caretNow <= f.anchor.endOffset) return false
        return true
      })

      // Drafting auto-fix runs silently — completion sounds only for manual
      // Edit-mode review. Draft writing space stays quiet.
      const audible = mode === 'editing'

      if (grammarFindings.length === 0) {
        if (mode === 'editing') globalAnalysisService.replacePersona('grammar', [])
        if (audible) blip('done')
        return
      }

      if (mode === 'editing') {
        // Review cards with red underlines; the writer fixes each manually.
        globalAnalysisService.replacePersona('grammar', grammarFindings)
        blip('done')
        return
      }

      // Show red wavy underlines on exactly the text about to be fixed…
      holdStore.holds = []
      for (const f of grammarFindings) {
        const resolved = resolveAnchor(editor, f.anchor)
        if (resolved) holdStore.holds.push({ id: f.id, from: resolved.from, to: resolved.to })
      }
      if (holdStore.holds.length > 0) syncHolds(editor)

      // …HOLD 550ms so the writer sees them, then fix + green fade
      await new Promise(r => setTimeout(r, HARPER_HOLD_MS))
      holdStore.holds = []
      if (editor) syncHolds(editor)
      if (ctl.signal.aborted) return
      applyGrammarAutoFixes(grammarFindings, { silent: true })
      // Fixed passages invalidate old edit-session cards via validateAnchors on update.
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

  const handleExploreComplete = (query: string, snapshot?: ExploreSnapshot) => {
    const q = query.trim() || 'Untitled question'
    setConversations(prev => {
      if (prev.some(c => c.query === q)) {
        const existing = prev.find(c => c.query === q)!
        setActiveConversationId(existing.id)
        if (snapshot) {
          const next = prev.map(c => c.id === existing.id ? { ...c, snapshot } : c)
          saveConversations(next)
          return next
        }
        return prev
      }
      const entry: ExploreConversation = { id: `conv-${Date.now()}`, query: q, createdAt: Date.now(), snapshot }
      const next = [entry, ...prev].slice(0, 30)
      saveConversations(next)
      setActiveConversationId(entry.id)
      return next
    })
    blip('done')
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setExploreKey(k => k + 1)
    if (mode !== 'explore') handleModeChange('explore')
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setExploreKey(k => k + 1)
    if (mode !== 'explore') handleModeChange('explore')
  }

  const handleSaveResearch = (row: ResearchRow, source?: { t: string; u: string }) => {
    setSavedResearchIds(prev => {
      const n = new Set(prev)
      if (n.has(row.id)) n.delete(row.id)
      else {
        n.add(row.id)
        const entry: LibraryEntry = {
          id: `lib-res-${row.id}-${Date.now()}`,
          title: (source?.t || row.text).slice(0, 80),
          kind: row.type === 'Idea' ? 'idea' : 'source',
          detail: row.type,
          createdAt: Date.now(),
          url: source?.u,
          claim: row.text,
          excerpt: row.psg || undefined,
          why: row.why || undefined,
        }
        setLibrary(lib => {
          const next = [entry, ...lib].slice(0, 50)
          saveLibrary(next)
          return next
        })
      }
      return n
    })
    blip('select')
  }

  const handleRemoveLibraryEntry = (id: string) => {
    setLibrary(lib => {
      const next = lib.filter(e => e.id !== id)
      saveLibrary(next)
      return next
    })
    if (activeLibraryId === id) setActiveLibraryId(null)
  }

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode)
    if (newMode === 'editing') {
      setRightOpen(true)
    }
  }

  // Open setup after the loading screen — but only once the tour is done.
  // First-timers/demo see the tour first; returning users go straight to setup.
  const setupAutoOpened = useRef(false)
  const tourOpenedRef = useRef(false)
  useEffect(() => {
    if (tutorialOpen) tourOpenedRef.current = true
  }, [tutorialOpen])
  useEffect(() => {
    if (!booted || setupAutoOpened.current || tutorialOpen) return
    try {
      if ((import.meta as any).env?.MODE === 'test') return
    } catch { /* ignore */ }
    let tourNeeded = demo
    try {
      tourNeeded = demo || !isTourSeen()
    } catch { /* ignore */ }
    if (tourNeeded && !tourOpenedRef.current) return // wait for tour to show + close
    setupAutoOpened.current = true
    setSetupOpen(true)
  }, [booted, tutorialOpen, demo])

  const handleContextNote = (v: string) => {
    setContextNote(v)
    try { localStorage.setItem('byline.doc.contextNote', v) } catch {}
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

  return (
    <div
      className="byline-app-container"
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
      {/* 1. Top Navigation Bar (Centered Mode, Exposable Theme, Light/Dark) */}
      <TopNavigation
        mode={mode}
        onModeChange={handleModeChange}
        onOpenSetup={() => setSetupOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMetrics={() => setMetricsOpen(true)}
        onOpenTutorial={() => setTutorialOpen(true)}
        editor={editor}
        onToggleMobileDrawer={() => setMobileDrawerOpen(v => !v)}
        mobileDrawerOpen={mobileDrawerOpen}
        findingsCount={findings.filter(f => f.status === 'open' || f.status === 'stale').length}
        assistLevel={assistLevel}
        onAssistLevelChange={setAssistLevel}
        writingTheme={(appSettings.writingTheme || 'neutral') as ThemeId}
        onWritingThemeChange={(th: ThemeId) => {
          setAppSettings(s => { const next = { ...s, writingTheme: th }; saveSettings(next); return next })
        }}
        language={appSettings.language || 'en-US'}
        onLanguageChange={lng => {
          setAppSettings(s => { const next = { ...s, language: lng }; saveSettings(next); return next })
        }}
        onSuggest={() => void handleRequestGhost()}
        draftLoading={draftLoading}
        onOpenConnect={() => setConnectOpen(true)}
      />

      {/* 2. Three-Part Workspace Layout with Expandable Rails (Desktop) or Full Paper (Mobile) */}
      <div
        className="layout"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : `${leftOpen ? 'minmax(240px, 280px)' : '44px'} minmax(0, 1fr) ${rightOpen ? 'minmax(240px, 280px)' : '0px'}`,          flex: 1,
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
          padding: isMobile ? '4px 6px' : '6px 8px',
          gap: isMobile ? 0 : 8,
        }}
      >
        {/* Left Rail: Library — persistent across all modes. Desktop only */}
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
              <Library
                entries={library}
                activeId={activeLibraryId}
                onSelect={id => { setActiveLibraryId(id); if (mode !== 'explore') handleModeChange('explore') }}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onToggleCollapse={() => setLeftOpen(false)}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenHelp={() => setTutorialOpen(true)}
                onRemoveEntry={handleRemoveLibraryEntry}
              />
            ) : (
              <div className="rail-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  title="Expand Library"
                  style={{ width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  title="Library"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--ai)' }}
                >
                  L
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
                right: rightOpen && !isMobile ? 310 : 20,
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

          {/* Analyzing indicator — floats top-right of paper */}
          {analyzing && (
            <div
              style={{
                position: 'fixed',
                top: 56,
                right: rightOpen && !isMobile ? 310 : 16,
                zIndex: 45,
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--ai)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-pop)',
                transition: 'right 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'none',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--ai)',
                display: 'inline-block',
                animation: 'sugg-pulse 1.1s ease-in-out infinite',
              }} />
              Analyzing…
            </div>
          )}

          {/* Floating "open review dock" pill — only when right rail is closed and not mobile */}
          {!rightOpen && !isMobile && (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              title="Open Review Dock"
              style={{
                position: 'fixed',
                bottom: 54,
                right: 16,
                zIndex: 40,
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: 'var(--shadow-pop)',
                cursor: 'pointer',
              }}
            >
              {findings.filter(f => f.status === 'open' || f.status === 'stale').length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 99, background: 'var(--ai)', color: '#fff',
                }}>
                  {findings.filter(f => f.status === 'open' || f.status === 'stale').length}
                </span>
              )}
              Review ‹
            </button>
          )}

          {/* Explore stays mounted when inactive so an in-flight run (prompt,
              loading steps, SSE stream) survives mode switches. */}
          <div ref={editorScrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: mode === 'explore' ? undefined : 'none' }}>
            <ExploreView
              key={`${activeConversationId ?? 'new'}-${exploreKey}`}
              onSaveToLibrary={handleSaveResearch}
              savedIds={savedResearchIds}
              initialQuery={conversations.find(c => c.id === activeConversationId)?.query}
              startAtResults={activeConversationId != null}
              initialSnapshot={conversations.find(c => c.id === activeConversationId)?.snapshot}
              onExploreComplete={handleExploreComplete}
            />
          </div>
          {mode !== 'explore' && (
          <>
          {mode === 'drafting' && (
            <div style={{ padding: '12px 24px 0' }}>
              <ContextInput value={contextNote} onChange={handleContextNote} />
              <details style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <summary style={{ cursor: 'pointer' }}>Typing state: </summary>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Pause <input type="range" min={300} max={1500} step={50} value={slowMs} onChange={e => setSlowMs(+e.target.value)} style={{ width: 110 }} /> <b style={{ color: 'var(--ink)' }}>{(slowMs / 1000).toFixed(2)}s</b>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Long pause <input type="range" min={1200} max={5000} step={100} value={longMs} onChange={e => setLongMs(+e.target.value)} style={{ width: 110 }} /> <b style={{ color: 'var(--ink)' }}>{(longMs / 1000).toFixed(1)}s</b>
                  </label>
                </div>
              </details>
            </div>
          )}
          {connBar && (
            <div role="toolbar" aria-label="Connective alternatives" className="caret-pop fade" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '8px 24px 0', padding: '6px 8px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 13, fontFamily: '"Source Serif 4", Georgia, serif' }}>
              <span style={{ color: 'var(--muted)', padding: '0 6px' }}>{connBar.why}</span>
              {connBar.opts.map((o, i) => (
                <button key={i} type="button" onClick={o.apply} title={`Alt+${i + 1}`} style={{ font: 'inherit', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '0 6px', cursor: 'pointer', color: 'var(--ink)' }}>
                  {o.label}<kbd style={{ font: 'inherit', fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>Alt+{i + 1}</kbd>
                </button>
              ))}
              <button type="button" onClick={() => setConnBar(null)} title="Dismiss (Esc)" style={{ font: 'inherit', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </div>
          )}
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
          {suggestPopupPos && (ghostOpen || draftLoading) && !selOpen && !inlineReviewState && (
            <CaretPopup
              mode="ghost"
              position={suggestPopupPos}
              loading={draftLoading}
              ghostGroups={ghostGroups}
              ghostLv={ghostLv}
              ghostIdx={ghostIdx}
              onGhostLevel={handleGhostLevel}
              onAccept={() => handleSelectSuggestion(ghostIdx)}
              onReroll={() => void handleRequestGhost({ isReroll: true })}
              onDismiss={handleDismissSuggestions}
            />
          )}

          {/* Inline Review Popup directly below cursor/underlined text in Edit Mode */}
          {mode === 'editing' && inlineReviewState && inlineReviewState.findings.length > 0 && (
            <InlineReviewPopup
              findings={inlineReviewState.findings}
              position={inlineReviewState.position}
              editor={editor}
              onApplySuggestion={handleApplyInlineSuggestion}
              onDismissFinding={handleDismissInlineFinding}
              onClose={() => setInlineReviewState(null)}
            />
          )}

          {/* Selection grid positioned below the range */}
          {selectionContext && !inlineReviewState && (selOpen || selLoading) && (
            <CaretPopup
              mode="sel"
              position={popupPos}
              loading={selLoading}
              selGrid={selGrid}
              selCol={selCol}
              selRow={selRow}
              selPage={selPage}
              onSelCell={handleAcceptSelCell}
              onAccept={() => handleAcceptSelCell(selCol, selRow)}
              onReroll={() => { setSelPage(p => p + 1); setSelRow(0) }}
              onDismiss={handleDismissSel}
            />
          )}
          </>
          )}
        </main>

        {/* Right Rail: Reader review (the only review persona). Desktop only */}
        {!isMobile && (
          <aside
            ref={rightRailRef}
            className="rail right-rail"
            data-closed={rightOpen ? undefined : 'true'}
            style={{
              height: '100%',
              overflow: 'hidden',
              background: 'var(--dock)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              display: rightOpen ? 'flex' : 'none',
              flexDirection: 'column',
            }}
          >
            <ReviewDock
              findings={findings}
              onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
              onRunAnalysis={handleRunFullAnalysis}
              analyzing={analyzing}
              editor={editor}
              highlightedFindingId={highlightedFindingId}
              onToggleCollapse={() => setRightOpen(false)}
            />
          </aside>
        )}
      </div>

      {/* Mobile Merged Drawer (Swipe right anywhere to open) */}
      {isMobile && (
        <>
          {mobileDrawerOpen && (
            <div
              role="presentation"
              onClick={() => setMobileDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(2px)',
                zIndex: 199,
              }}
            />
          )}

          <aside
            className="mobile-merged-drawer"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(360px, 88vw)',
              background: 'var(--dock)',
              borderRight: '1px solid var(--border)',
              boxShadow: mobileDrawerOpen ? '0 10px 40px rgba(0,0,0,0.45)' : 'none',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: mobileDrawerOpen ? 'auto' : 'none',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Workspace Navigation</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                title="Close Drawer"
                style={{ padding: '2px 8px', minHeight: 26, fontSize: 13, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Body: Reader review only */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <ReviewDock
                findings={findings}
                onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
                onRunAnalysis={handleRunFullAnalysis}
                analyzing={analyzing}
                editor={editor}
                highlightedFindingId={highlightedFindingId}
                onToggleCollapse={() => setMobileDrawerOpen(false)}
              />
            </div>
          </aside>
        </>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        editor={editor}
      />

      {/* Slim setup wizard (opens after boot; ✦ Setup reopens it) */}
      <SetupWizard
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onComplete={handleContextNote}
        initial={contextNote}
      />

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

      {/* Interactive Feature Tutorial Overlay */}
      <TutorialOverlay
        isOpen={tutorialOpen}
        onClose={() => { markTourSeen(); setTutorialOpen(false) }}
      />
    </div>
  )
}
