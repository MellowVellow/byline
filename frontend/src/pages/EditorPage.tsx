import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TableOfContents from '@tiptap/extension-table-of-contents'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'

import TopNavigation from '../components/TopNavigation'
import IntentDock from '../components/IntentDock'
import ReviewDock from '../components/ReviewDock'
import ConnectModal from '../components/ConnectModal'
import ParaphrasePopup from '../components/ParaphrasePopup'
import SuggestionPopup from '../components/SuggestionPopup'
import InlineReviewPopup from '../components/InlineReviewPopup'
import SetupWizard, { type SetupResult } from '../components/SetupWizard'
import SettingsMenu from '../components/SettingsMenu'
import ExpandSectionModal from '../components/ExpandSectionModal'
import MetricsPopup from '../components/MetricsPopup'
import { recordSuggestionOffered, recordSuggestionAccepted, recordRevisionAccepted } from '../lib/metrics'
import { compareOutlineWithDraft } from '../domain/outline'
import { keys } from '../lib/storage'

import { AnchorDecorations, anchorStore, syncAnchors, syncGhost, syncFlash, flashStore, modeStore, syncPops, popStore } from '../editor/decorations'
import { contextService, type SelectionContext } from '../services/context-service'
import { globalAnalysisService } from '../services/analysis-service'
import { harperService } from '../services/harper-service'
import { resolveAnchor, applySafeReplacement } from '../editor/anchoring'
import type { DocumentContext, OutlineNode, ThemeId } from '../domain/document'
import type { Finding, FindingStatus, Suggestion, Persona } from '../domain/finding'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { api } from '../lib/api'
import { GOLDEN_PATH_SAMPLE_DOC, GOLDEN_PATH_SAMPLE_CONTEXT } from '../lib/fallback'
import { sfxAccept, sfxDismiss, sfxPick, blip } from '../lib/sfx'

export type AssistGranularity = 'Hint' | 'Phrase' | 'Sentence' | 'Question'

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  // App & View mode
  const [mode, setMode] = useState<'drafting' | 'editing'>('drafting')
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

  // Expandable/Collapsible Docks (starts collapsed in draft mode for focus)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(false)
  const [triggerReviewCounter, setTriggerReviewCounter] = useState(0)

  // Mobile Responsiveness & Merged Drawer (swipe right to open)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768
  })
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'outline' | 'review'>('outline')
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
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

  // Active Outline Node & Highlighted Finding Card
  const [activeOutlineNodeId, setActiveOutlineNodeId] = useState<string | null>(null)
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null)

  // Document state
  const [context, setContext] = useState<DocumentContext>(() => {
    if (demo) {
      return {
        topic: 'Intercity Rail Infrastructure vs. Highway Expansion',
        purpose: 'Argue that strategic rail electrification delivers higher economic yields than highway expansion.',
        audience: 'Urban policy makers and undecided regional voters',
        background: 'Regional air corridors and highway networks face worsening congestion and carbon debt.',
        keyIdeas: [
          'Airport runway saturation compounds productivity losses.',
          'High upfront capital expenditure can be amortized via land-value capture.',
          'Core-to-core rail connectivity accelerates regional labor market mobility.',
        ],
        constraints: ['Ground arguments in economic and transit data', 'Directly address municipal debt risks'],
      }
    }
    const saved = localStorage.getItem('byline.doc.context')
    return saved ? JSON.parse(saved) : { topic: '', purpose: '', audience: '', keyIdeas: [] }
  })

  const [outline, setOutline] = useState<OutlineNode[]>(() => {
    if (demo) {
      return [
        { id: 'sec-1', title: '1. The Congestion Dilemma', description: 'Introduce runway and highway saturation.', order: 1, sectionId: 'sec-1' },
        { id: 'sec-2', title: '2. The Capital Cost Critique', description: 'Examine debt loads and suburban density limits.', order: 2, sectionId: 'sec-2' },
        { id: 'sec-3', title: '3. Comparative Economic Yields', description: 'Analyze travel predictability and carbon savings.', order: 3, sectionId: 'sec-3' },
        { id: 'sec-4', title: '4. Dialectical Synthesis', description: 'Frame investment as a balanced infrastructure portfolio.', order: 4, sectionId: 'sec-4' },
      ]
    }
    const saved = localStorage.getItem('byline.doc.outline') || localStorage.getItem(keys.outline(false))
    return saved ? JSON.parse(saved) : [
      { id: 'sec-1', title: '1. Introduction', description: 'Establish the core thesis.', order: 1, sectionId: 'sec-1' },
      { id: 'sec-2', title: '2. Argument & Evidence', description: 'Develop key points.', order: 2, sectionId: 'sec-2' },
      { id: 'sec-3', title: '3. Conclusion', description: 'Synthesize conclusions.', order: 3, sectionId: 'sec-3' },
    ]
  })

  // State for explicit section expansion modal
  const [expandingSection, setExpandingSection] = useState<OutlineNode | null>(null)

  // Persist outline independently to localStorage
  useEffect(() => {
    if (!demo) {
      localStorage.setItem('byline.doc.outline', JSON.stringify(outline))
      localStorage.setItem(keys.outline(false), JSON.stringify(outline))
    }
  }, [outline, demo])

  // Persist context independently to localStorage
  useEffect(() => {
    if (!demo) {
      localStorage.setItem('byline.doc.context', JSON.stringify(context))
    }
  }, [context, demo])

  const [docRevision, setDocRevision] = useState(1)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })

  // Unified Findings state
  const [findings, setFindings] = useState<Finding[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [grammarNotice, setGrammarNotice] = useState<string | null>(null)
  const [grammarAbort, setGrammarAbort] = useState<AbortController | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<Persona | 'all'>('all')
  const [visiblePersonas, setVisiblePersonas] = useState<Record<Persona, boolean>>({
    grammar: true,
    reader: true,
    supervisor: true,
    researcher: true,
  })

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
  const [draftSuggestions, setDraftSuggestions] = useState<string[]>([])
  const [suggestPopupPos, setSuggestPopupPos] = useState<{ x: number; y: number } | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)

  // Ref to the editor scroll container so popups can scroll it into view
  const editorScrollRef = useRef<HTMLDivElement>(null)
  // Ref to the right rail aside element so we can measure its actual rendered width
  const rightRailRef = useRef<HTMLElement>(null)

  /**
   * Convert a raw viewport coordinate from TipTap / getBoundingClientRect into a
   * safe { x, y } for position:fixed popups, accounting for:
   *   - right dock width (measured from DOM, clamp x to not overlap it)
   *   - viewport bottom (if popup would overflow, scroll editor container up)
   */
  const safePosFixed = useCallback(
    (viewportLeft: number, viewportBottom: number, popupW = 440, popupH = 300) => {
      // Measure the right rail's actual left edge from the DOM for accurate clamping
      const rightRailLeft = rightRailRef.current
        ? rightRailRef.current.getBoundingClientRect().left
        : window.innerWidth - (rightOpen ? 318 : 52)
      const maxRight = rightRailLeft - 16
      const x = Math.max(16, Math.min(viewportLeft, maxRight - popupW))
      const yNatural = viewportBottom + 8

      // If the popup would overflow the viewport bottom, scroll the editor scroll
      // container enough to bring it into view instead of clamping (which hides it)
      const overflow = yNatural + popupH - window.innerHeight
      if (overflow > 0 && editorScrollRef.current) {
        editorScrollRef.current.scrollTop += overflow + 16
      }

      return { x, y: yNatural }
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
    content: demo ? GOLDEN_PATH_SAMPLE_DOC : (localStorage.getItem('byline.doc.html') || '<h1>Untitled Document</h1><p>Start writing here…</p>'),
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
        localStorage.setItem('byline.doc.html', editor.getHTML())
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
            position: safePosFixed(coords.left, coords.bottom, 440, 300),
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

    modeStore.mode = mode

    // Locate active findings (filtered by selected persona tab AND visible personas)
    const anchors: any[] = []
    const ranges = new Map<string, { from: number; to: number }>()

    for (const f of findings) {
      if (f.status === 'resolved' || f.status === 'dismissed') continue
      if (selectedPersona !== 'all' && f.persona !== selectedPersona) continue
      if (!visiblePersonas[f.persona]) continue
      const resolved = resolveAnchor(ed, f.anchor)
      if (resolved) {
        const kindMap: Record<string, string> = {
          grammar: 'grammar',
          reader: 'reaction',
          supervisor: 'vocabulary',
          researcher: 'claim',
        }
        anchors.push({
          id: f.id,
          kind: kindMap[f.persona] || 'grammar',
          from: resolved.from,
          to: resolved.to,
        })
        ranges.set(f.id, { from: resolved.from, to: resolved.to })
      }
    }

    anchorStore.anchors = anchors
    anchorStore.ranges = ranges
    syncAnchors(ed)
  }, [findings, mode, selectedPersona, visiblePersonas])

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
            position: safePosFixed(rect.left, rect.bottom, 440, 300),
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
    modeStore.mode = mode
    if (editor) {
      syncEditorDecorations(editor)
    }
  }, [mode, editor, syncEditorDecorations])

  // --- EXPLICIT ACTIONS BETWEEN OUTLINE AND DRAFT ---
  // 1. Explicitly insert an outline section title at the current editor cursor
  const handleInsertTitleAtCursor = (title: string) => {
    if (!editor) return
    blip('select')
    editor.chain().focus().insertContent(`<h2>${title}</h2>\n`).run()
  }

  // 2. Explicitly copy outline content (title + notes/description) into the draft
  const handleCopyOutlineContent = (node: OutlineNode) => {
    if (!editor) return
    blip('select')
    const noteText = node.description || node.notes || ''
    const content = noteText
      ? `<h2>${node.title}</h2>\n<p>${noteText}</p>\n`
      : `<h2>${node.title}</h2>\n`
    editor.chain().focus().insertContent(content).run()
  }

  // 3. Explicitly expand an outline section into proposed draft section (with preview)
  const handleOpenExpandSection = (node: OutlineNode) => {
    blip('select')
    setExpandingSection(node)
  }

  const handleConfirmExpand = (contentToInsert: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(contentToInsert + '\n').run()
    setExpandingSection(null)
  }

  // Close theme & language dropdown on Escape or clicking outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeMenuOpen(false)
        setLangMenuOpen(false)
      }
    }
    const handleClick = (e: MouseEvent) => {
      if ((themeMenuOpen || langMenuOpen) && document.querySelector('.editor-bar') && !document.querySelector('.editor-bar')?.contains(e.target as Node)) {
        setThemeMenuOpen(false)
        setLangMenuOpen(false)
      }
    }
    addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [themeMenuOpen, langMenuOpen])

  // Subscribe to unified findings
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

  // Populate sample findings in demo mode
  useEffect(() => {
    if (demo && findings.length === 0) {
      const demoFindings: Finding[] = [
        {
          id: 'f-demo-1',
          documentId: 'demo-doc',
          persona: 'supervisor',
          kind: 'supervisor_critique',
          anchor: {
            quotedText: 'astronomical upfront capital expenditure',
            documentRevision: 1,
            prefix: 'point to ',
            suffix: ' and persistent debt loads',
          },
          explanation: 'Rhetorical critique: “astronomical” is emotive. Frame the fiscal challenge with measured analytical terminology.',
          suggestions: [
            { id: 's-1', text: 'substantial upfront capital outlays', rationale: 'Analytical and measured register' },
            { id: 's-2', text: 'capital-intensive infrastructure debt', rationale: 'Direct financial framing' },
            { id: 's-3', text: 'significant upfront capital allocations', rationale: 'Objective policy tone' },
          ],
          status: 'open',
          sourceRevision: 1,
          createdAt: Date.now(),
        },
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
        {
          id: 'f-demo-3',
          documentId: 'demo-doc',
          persona: 'researcher',
          kind: 'research_claim',
          anchor: {
            quotedText: 'Intercity air travel corridors face worsening ground delays',
            documentRevision: 1,
          },
          explanation: 'Empirically supported claim: Federal Aviation Administration reports ground delays have grown thirty percent across major mid-distance corridors.',
          suggestions: [
            { id: 's-4', text: 'Major mid-distance air corridors face compounding ground delays' },
          ],
          evidence: [
            {
              url: 'https://example.org/faa-corridor-report',
              title: 'FAA Intercity Aviation Bottlenecks Report',
              excerpt: 'Runway throughput constraints on routes under 400 miles generate over $12B annually in lost business travel hours.',
              status: 'supported',
            },
          ],
          status: 'open',
          sourceRevision: 1,
          createdAt: Date.now(),
        },
        {
          id: 'f-demo-4',
          documentId: 'demo-doc',
          persona: 'grammar',
          kind: 'language_error',
          anchor: {
            quotedText: 'interconnecting regional labor markets',
            documentRevision: 1,
          },
          explanation: 'Stylistic clarity: “connecting” or “linking” provides a cleaner verb form than “interconnecting”.',
          suggestions: [
            { id: 's-5', text: 'linking regional labor markets' },
          ],
          status: 'open',
          sourceRevision: 1,
          createdAt: Date.now(),
        },
      ]
      globalAnalysisService.setFindings(demoFindings)
    }
  }, [demo])

  // Setup Wizard completion
  const handleSetupComplete = (res: SetupResult) => {
    setContext(res.context)
    setOutline(res.outline)
    if (res.theme || res.settings) {
      setAppSettings(prev => {
        const next = { ...prev, ...(res.settings || {}), ...(res.theme ? { writingTheme: res.theme } : {}) }
        saveSettings(next)
        return next
      })
    }
    if (res.initialHtml && editor) {
      editor.commands.setContent(res.initialHtml)
    }
  }

  // --- DRAFT ASSISTANCE & GHOST TEXT FOR BOTH MODES ---
  const handleRequestGhost = async () => {
    if (!editor || !editor.view) return
    setDraftLoading(true)
    blip('select')

    const cursorCtx = contextService.getCursorContext(editor, 400)
    try {
      const res = await api.complete({
        context: context.topic || context.purpose || 'General writing',
        level: appSettings.writingTheme || 'General',
        before: cursorCtx.before,
        after: cursorCtx.after,
        assist_level: assistLevel,
        version: docRevision,
      })

      const list = (res?.suggestions || []).slice(0, 3)
      const fallbackQuestions = [
        'How will regional transit authorities balance upfront capital outlays?',
        'What policy incentives accelerate private-sector transit investment?',
        'Which corridors offer the highest passenger density returns?',
      ]
      const defaultOptions = [
        'demonstrating long-term return on infrastructure capital.',
        'which significantly mitigates municipal debt exposure.',
        'yielding higher compounding returns across metropolitan regions.',
      ]
      const options = list.length > 0 ? list : (assistLevel === 'Question' ? fallbackQuestions : defaultOptions)

      setDraftSuggestions(options)
      recordSuggestionOffered(options.length)

      // Set inline ghost text for option 1
      const pos = editor.state.selection.from
      const prev = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
      const prefix = prev && !/\s/.test(prev) ? ' ' : ''
      anchorStore.ghost = prefix + options[0]
      anchorStore.ghostPos = pos
      syncGhost(editor)

      // Calculate popup position directly below cursor
      const coords = editor.view.coordsAtPos(pos)
      setSuggestPopupPos(safePosFixed(coords.left, coords.bottom, 440, 240))

      blip('done')
    } catch {
      const fallbackOptions = assistLevel === 'Question' ? [
        'How will regional transit authorities balance upfront capital outlays?',
        'What policy incentives accelerate private-sector transit investment?',
      ] : [
        'yielding higher compounding returns across metropolitan regions.',
        'which significantly mitigates municipal debt exposure.',
      ]
      setDraftSuggestions(fallbackOptions)
      const pos = editor.state.selection.from
      anchorStore.ghost = ' ' + fallbackOptions[0]
      anchorStore.ghostPos = pos
      syncGhost(editor)

      const coords = editor.view.coordsAtPos(pos)
      setSuggestPopupPos(safePosFixed(coords.left, coords.bottom, 440, 240))
    } finally {
      setDraftLoading(false)
    }
  }

  const handleSelectSuggestion = (index: number) => {
    if (!editor || !draftSuggestions[index]) return
    const textToInsert = draftSuggestions[index]
    const pos = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, pos - 1), pos)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''

    editor.chain().focus().insertContentAt(pos, prefix + textToInsert.trim() + ' ').run()

    anchorStore.ghost = ''
    syncGhost(editor)
    setDraftSuggestions([])
    setSuggestPopupPos(null)
    recordSuggestionAccepted()
    sfxAccept()
  }

  const handleDismissSuggestions = () => {
    anchorStore.ghost = ''
    if (editor) syncGhost(editor)
    setDraftSuggestions([])
    setSuggestPopupPos(null)
  }

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
      alert(res.error || 'Failed to apply replacement.')
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

  // Keyboard shortcut listener: Tab for ghost text, Escape to dismiss, Ctrl+Space
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Tab to accept ghost text when popup is open
      if (e.key === 'Tab' && (anchorStore.ghost || draftSuggestions.length > 0)) {
        e.preventDefault()
        handleSelectSuggestion(0)
        return
      }

      // Escape to dismiss
      if (e.key === 'Escape' && (anchorStore.ghost || draftSuggestions.length > 0)) {
        e.preventDefault()
        handleDismissSuggestions()
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

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, draftSuggestions, assistLevel, docRevision])

  // --- REFLECTION PERSONA TRIGGERS ---
  const handleRunSupervisor = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const fullCtx = contextService.getFullContext(editor, context, outline, {
      language: appSettings.language,
      theme: appSettings.writingTheme,
    })

    try {
      const outlineSummary = outline.length > 0
        ? `\nOutline Plan:\n` + outline.map((n, i) => `${i + 1}. ${n.title}${n.description ? ` (${n.description})` : ''}`).join('\n')
        : ''

      const supRes = await api.annotate({
        context: `${fullCtx.context.topic || ''}. Purpose: ${fullCtx.context.purpose || ''}. Audience: ${fullCtx.context.audience || ''}${outlineSummary}`,
        level: appSettings.writingTheme,
        text: fullCtx.fullText,
      })
      const lintRes = await api.lint({ text: fullCtx.fullText, rules: ['active'] })

      const newFindings: Finding[] = []

      // Semantic comparison: compare outline plan against actual draft content without requiring block-level links
      if (outline.length > 0 && fullCtx.fullText.trim().length > 0) {
        const { missingSections } = compareOutlineWithDraft(outline, fullCtx.fullText)
        const firstDocNode = editor.state.doc.firstChild
        const anchorText = firstDocNode?.textContent?.trim().slice(0, 50) || fullCtx.fullText.trim().slice(0, 40)

        if (anchorText) {
          for (const missing of missingSections.slice(0, 2)) {
            newFindings.push({
              id: `sup-outline-${missing.id}-${Date.now()}`,
              documentId: 'active-doc',
              persona: 'supervisor',
              kind: 'supervisor_critique',
              anchor: {
                quotedText: anchorText,
                documentRevision: docRevision,
              },
              explanation: `Planned outline section "${missing.title}" is missing or undeveloped in the draft compared to the outline.`,
              suggestions: [
                {
                  id: `sug-${missing.id}`,
                  text: `Draft content for: ${missing.title}`,
                  rationale: missing.description || 'Fulfill planned outline structure',
                },
              ],
              status: 'open',
              sourceRevision: docRevision,
              createdAt: Date.now(),
            })
          }
        }
      }

      if (supRes?.ok && Array.isArray(supRes.issues) && supRes.issues.length > 0) {
        for (const iss of supRes.issues) {
          newFindings.push({
            id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            documentId: 'active-doc',
            persona: 'supervisor',
            kind: 'supervisor_critique',
            anchor: {
              quotedText: iss.quote || iss.context || 'text',
              prefix: iss.context?.split(iss.quote)[0] || '',
              suffix: iss.context?.split(iss.quote)[1] || '',
              documentRevision: docRevision,
            },
            explanation: iss.reason || 'Structural or reasoning critique.',
            suggestions: (iss.alternatives || [iss.replacement]).filter(Boolean).map((alt: any, i: number) => ({
              id: `alt-${i}`,
              text: typeof alt === 'string' ? alt : alt.text,
              rationale: typeof alt === 'object' ? alt.note : undefined,
            })),
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          })
        }
      }

      if (lintRes?.ok && Array.isArray(lintRes.lints) && lintRes.lints.length > 0) {
        for (const l of lintRes.lints) {
          newFindings.push({
            id: `lint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            documentId: 'active-doc',
            persona: 'supervisor',
            kind: 'supervisor_critique',
            anchor: {
              quotedText: l.quote || 'text',
              documentRevision: docRevision,
            },
            explanation: l.message || 'Style or structure guideline notice.',
            suggestions: l.fix ? [{ id: 'fix-1', text: l.fix }] : [],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          })
        }
      }

      // Offline / demo fallback if empty
      if (newFindings.length === 0) {
        newFindings.push(
          {
            id: `demo-sup-1`,
            documentId: 'active-doc',
            persona: 'supervisor',
            kind: 'supervisor_critique',
            anchor: {
              quotedText: 'plethora',
              documentRevision: docRevision,
            },
            explanation: 'Vocabulary tone register check: word above General level.',
            suggestions: [{ id: 's1', text: 'many' }, { id: 's2', text: 'wide range' }],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          },
          {
            id: `demo-sup-2`,
            documentId: 'active-doc',
            persona: 'supervisor',
            kind: 'supervisor_critique',
            anchor: {
              quotedText: 'Cats live longer than dogs, so they are clearly the better long-term choice.',
              documentRevision: docRevision,
            },
            explanation: 'Non-sequitur / logic jump: lifespan alone does not establish overall superiority.',
            suggestions: [{ id: 's3', text: 'Cats often live longer than dogs, making them a durable companion.' }],
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          }
        )
      }

      globalAnalysisService.addFindings(newFindings)
      blip('done')
    } catch {
      // offline fallback
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRunReader = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const fullCtx = contextService.getFullContext(editor, context, outline, {
      language: appSettings.language,
      theme: appSettings.writingTheme,
    })

    try {
      const readRes = await api.reactions({
        context: fullCtx.context.topic || 'General essay',
        level: appSettings.writingTheme,
        text: fullCtx.fullText,
        persona: 'Critical Reader',
      })

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

      // Offline / demo fallback if empty
      if (readerFindings.length === 0) {
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
    await Promise.allSettled([handleRunSupervisor(), handleRunReader()])
  }

  const applyGrammarAutoFixes = (list: Finding[]): Set<string> => {
    const applied = new Set<string>()
    if (!editor) return applied
    const candidates = list
      .filter(f => f.suggestions[0]?.text)
      .sort((a, b) => (b.anchor.startOffset ?? 0) - (a.anchor.startOffset ?? 0))

    for (const f of candidates) {
      const replacement = f.suggestions[0].text
      const resolved = resolveAnchor(editor, f.anchor)
      if (!resolved) continue
      if (replacement === resolved.matchedText) continue
      try {
        const tr = editor.state.tr.replaceWith(
          resolved.from,
          resolved.to,
          editor.schema.text(replacement)
        )
        editor.view.dispatch(tr)
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

    if (applied.size > 0) {
      syncPops(editor)
      setTimeout(() => { if (editor) syncPops(editor) }, 1700)
    }
    return applied
  }

  const handleRunGrammar = async () => {
    if (!editor || grammarAbort) return
    setAnalyzing(true)
    setGrammarNotice(null)
    blip('select')

    const ctl = new AbortController()
    setGrammarAbort(ctl)

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
    try {
      // Timeout safeguard: abort if grammar check takes too long
      const timeout = setTimeout(() => ctl.abort(), 15000)

      const { findings: harperFindings, unsupportedLanguage, error } = await harperService.lint(
        text,
        appSettings.language,
        docRevision
      )

      clearTimeout(timeout)
      if (ctl.signal.aborted) return

      if (unsupportedLanguage) {
        setGrammarNotice(error || 'Grammar checking is unavailable for the selected document language.')
        return
      }
      if (error) {
        setGrammarNotice(error)
      }

      const grammarFindings: Finding[] = harperFindings.filter(f => f.anchor.quotedText.trim())

      if (grammarFindings.length === 0) {
        setGrammarNotice('No grammar or spelling issues found.')
        blip('done')
        return
      }

      const applied = appSettings.autoApplyGrammar && mode === 'editing'
        ? applyGrammarAutoFixes(grammarFindings)
        : new Set<string>()

      const withStatus = grammarFindings.map(f =>
        applied.has(f.id) ? { ...f, status: 'resolved' as const } : f
      )

      globalAnalysisService.addFindings(withStatus)
      setGrammarNotice(
        applied.size > 0
          ? `Auto-applied ${applied.size} grammar fix${applied.size === 1 ? '' : 'es'}.`
          : null
      )
      blip('done')
    } catch {
      if (!ctl.signal.aborted) {
        setGrammarNotice('Grammar checking failed to run.')
      }
    } finally {
      if (!ctl.signal.aborted) {
        setAnalyzing(false)
        setGrammarAbort(null)
      }
    }
  }

  const handleRunResearch = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
    try {
      const res = await api.readings({ text })
      const readings = res?.readings || []
      const researchFindings: Finding[] = []

      for (const r of readings) {
        researchFindings.push({
          id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          documentId: 'active-doc',
          persona: 'researcher',
          kind: 'research_claim',
          anchor: {
            quotedText: r.claim_quote || r.title,
            documentRevision: docRevision,
          },
          explanation: r.why || r.summary || `Claim verified against source: ${r.title}`,
          suggestions: [
            { id: `res-sug-1`, text: `${r.claim_quote} (${r.title})` },
          ],
          evidence: [
            {
              url: r.url || 'https://example.org',
              title: r.title || 'Source Citation',
              excerpt: r.excerpt || r.summary || '',
              status: r.verdict === 'supports' ? 'supported' : (r.verdict === 'contradicts' ? 'contradicted' : 'unverified'),
            },
          ],
          status: 'open',
          sourceRevision: docRevision,
          createdAt: Date.now(),
        })
      }

      // Offline / demo fallback if empty
      if (researchFindings.length === 0) {
        researchFindings.push({
          id: `demo-res-1`,
          documentId: 'active-doc',
          persona: 'researcher',
          kind: 'research_claim',
          anchor: {
            quotedText: 'Dogs needs daily walks.',
            documentRevision: docRevision,
          },
          explanation: 'Verified claim: Veterinary consensus confirms healthy canines require daily exercise.',
          suggestions: [{ id: 'res-sug-1', text: 'Dogs need daily walks (Vital Pet Club)' }],
          evidence: [
            {
              url: 'https://www.vitalpetclub.co.uk',
              title: 'Vital Pet Club — Daily Canine Exercise',
              excerpt: 'Healthy dogs of all breeds should have at least one walk a day, preferably two.',
              status: 'supported',
            },
          ],
          status: 'open',
          sourceRevision: docRevision,
          createdAt: Date.now(),
        })
      }

      globalAnalysisService.addFindings(researchFindings)
      blip('done')
    } catch {
      // safe fallback
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRunPersona = async (p: Persona) => {
    switch (p) {
      case 'grammar':
        return handleRunGrammar()
      case 'reader':
        return handleRunReader()
      case 'supervisor':
        return handleRunSupervisor()
      case 'researcher':
        return handleRunResearch()
    }
  }

  const handleModeChange = (newMode: 'drafting' | 'editing') => {
    setMode(newMode)
    if (newMode === 'editing') {
      setRightOpen(true)
      setMobileTab('review')
      setTriggerReviewCounter(c => c + 1)
    } else {
      setMobileTab('outline')
    }
  }

  const handleRerollFinding = async (finding: Finding) => {
    if (!editor) return
    try {
      const res = await api.synonyms({
        context: context.topic || 'Revision',
        level: appSettings.writingTheme,
        word: finding.anchor.quotedText,
        sentence: finding.explanation,
      })

      if (res?.ok && Array.isArray(res.synonyms)) {
        const freshSuggestions: Suggestion[] = res.synonyms.slice(0, 3).map((w: string, i: number) => ({
          id: `sug-reroll-${i}`,
          text: w,
        }))
        globalAnalysisService.updateSuggestions(finding.id, freshSuggestions)
      }
    } catch {
      // noop
    }
  }

  return (
    <div
      className="byline-app-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}
    >
      {/* 1. Top Navigation Bar (Centered Mode, Exposable Theme, Light/Dark) */}
      <TopNavigation
        mode={mode}
        onModeChange={handleModeChange}
        onOpenSetup={() => setSetupOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMetrics={() => setMetricsOpen(true)}
        editor={editor}
        onToggleMobileDrawer={() => setMobileDrawerOpen(v => !v)}
        mobileDrawerOpen={mobileDrawerOpen}
        findingsCount={findings.filter(f => f.status === 'open' || f.status === 'stale').length}
      />

      {/* 2. Three-Part Workspace Layout with Expandable Rails (Desktop) or Full Paper (Mobile) */}
      <div
        className="layout"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : `${leftOpen ? '300px' : '44px'} minmax(0, 1fr) ${rightOpen ? '300px' : '44px'}`,
          flex: 1,
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
          padding: isMobile ? '4px 6px' : 8,
          gap: isMobile ? 0 : 10,
        }}
      >
        {/* Left Rail: Intent (Context & Outline) — Desktop only */}
        {!isMobile && (
          <aside
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
              <IntentDock
                context={context}
                onContextChange={setContext}
                outline={outline}
                onOutlineChange={setOutline}
                editor={editor}
                onInsertTitleAtCursor={handleInsertTitleAtCursor}
                onCopyOutlineContent={handleCopyOutlineContent}
                onExpandSection={handleOpenExpandSection}
                onToggleCollapse={() => setLeftOpen(false)}
              />
            ) : (
              <div className="rail-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  title="Expand Intent Dock"
                  style={{ width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  title="Outline"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}
                >
                  O
                </button>
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  title="Context"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}
                >
                  C
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
          {/* Sticky Editor Bar */}
          <div
            className="editor-bar"
            style={{
              position: 'sticky',
              top: isMobile ? 0 : 8,
              zIndex: 10,
              padding: isMobile ? '4px 6px' : '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--dock)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
              gap: 8,
              margin: '0 0 8px 0',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              flexShrink: 0,
            }}
          >
            {/* Formatting Actions */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor?.isActive('heading', { level: 1 }) ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor?.isActive('heading', { level: 2 }) ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={editor?.isActive('bold') ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={editor?.isActive('italic') ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28, fontStyle: 'italic' }}
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={editor?.isActive('bulletList') ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                className={editor?.isActive('blockquote') ? 'primary' : ''}
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                “ Quote
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().undo().run()}
                title="Undo (Ctrl+Z)"
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().redo().run()}
                title="Redo (Ctrl+Y)"
                style={{ padding: '2px 7px', fontSize: 12, minHeight: 28 }}
              >
                ↷
              </button>
            </div>

            {/* Drafting Tools: Assist Granularity, Suggest & Connect */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Granularity Selector */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span className="meta" style={{ fontSize: 11 }}>Assist:</span>
                {(['Hint', 'Phrase', 'Sentence', 'Question'] as AssistGranularity[]).map(gran => (
                  <button
                    key={gran}
                    type="button"
                    className={assistLevel === gran ? 'primary' : ''}
                    onClick={() => { setAssistLevel(gran); sfxPick() }}
                    style={{ fontSize: 11, padding: '2px 6px', minHeight: 26 }}
                  >
                    {gran}
                  </button>
                ))}
              </div>

              {/* Theme dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setThemeMenuOpen(v => !v)
                    setLangMenuOpen(false)
                  }}
                  title="Writing theme"
                  style={{ padding: '2px 10px', fontSize: 12, minHeight: 28 }}
                >
                  Theme: {THEME_DEFINITIONS[appSettings.writingTheme]?.name || 'Neutral'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
                {themeMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-pop)',
                      zIndex: 110,
                      minWidth: 200,
                      padding: '6px 0',
                      marginTop: 4,
                    }}
                  >
                    {Object.values(THEME_DEFINITIONS).map(th => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setAppSettings(s => { const next = { ...s, writingTheme: th.id }; saveSettings(next); return next })
                          setThemeMenuOpen(false)
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', textAlign: 'left', background: appSettings.writingTheme === th.id ? 'var(--hover)' : 'transparent',
                          border: 'none', cursor: 'pointer', minHeight: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
                        }}
                      >
                        <div style={{ fontWeight: appSettings.writingTheme === th.id ? 700 : 500, fontSize: 13, color: 'var(--ink)' }}>{th.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{th.tagline}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Document Language dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLangMenuOpen(v => !v)
                    setThemeMenuOpen(false)
                  }}
                  title="Document language"
                  style={{ padding: '2px 10px', fontSize: 12, minHeight: 28 }}
                >
                  Lang: {SUPPORTED_LANGUAGES.find(l => l.code === (appSettings.language || 'en-US'))?.label.split(' ')[0] || 'English'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
                {langMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-pop)',
                      zIndex: 110,
                      minWidth: 190,
                      padding: '6px 0',
                      marginTop: 4,
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setAppSettings(s => { const next = { ...s, language: lang.code }; saveSettings(next); return next })
                          setContext(c => ({ ...c, language: lang.code }))
                          setLangMenuOpen(false)
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', textAlign: 'left', background: appSettings.language === lang.code ? 'var(--hover)' : 'transparent',
                          border: 'none', cursor: 'pointer', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: appSettings.language === lang.code ? 700 : 500, fontSize: 13, color: 'var(--ink)' }}>{lang.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{lang.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Word & Character Count Badge (when enabled in settings) */}
              {appSettings.showWordCount && editor && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--muted)',
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 8px',
                    height: 28,
                    background: 'var(--hover)',
                    borderRadius: 'var(--radius, 4px)',
                    border: '1px solid var(--border)',
                  }}
                  title="Document Word & Character Count"
                >
                  <span><strong>{editor.storage.characterCount?.words?.() ?? 0}</strong> words</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{editor.storage.characterCount?.characters?.() ?? 0} chars</span>
                </div>
              )}

              {/* Suggest Button */}
              <button
                type="button"
                disabled={draftLoading}
                className="bar-ai"
                onClick={handleRequestGhost}
                style={{
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  minHeight: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  borderColor: 'var(--ai)',
                  color: 'var(--ai)',
                }}
              >
                <span>{draftLoading ? 'Generating…' : '✦ Suggest'}</span>
                <span className="kbd" style={{ fontSize: 10 }}>Ctrl Space</span>
              </button>

              {/* Connect Button */}
              <button
                type="button"
                onClick={() => { blip('open'); setConnectOpen(true) }}
                style={{
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  minHeight: 28,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>⇌ Connect</span>
                <span className="kbd" style={{ fontSize: 10 }}>Ctrl /</span>
              </button>
            </div>
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

          {/* Suggestion Options Popup directly below cursor (replaces top banner) */}
          {suggestPopupPos && draftSuggestions.length > 0 && (
            <SuggestionPopup
              suggestions={draftSuggestions}
              assistLevel={assistLevel}
              position={suggestPopupPos}
              onSelect={handleSelectSuggestion}
              onReroll={() => void handleRequestGhost()}
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

          {/* Alternatives Popup positioned directly below cursor/selection */}
          {selectionContext && !inlineReviewState && (
            <ParaphrasePopup
              editor={editor}
              selectionContext={selectionContext}
              documentGoal={context.topic || context.purpose || ''}
              theme={appSettings.writingTheme}
              position={popupPos}
              onClose={() => setSelectionContext(null)}
            />
          )}
        </main>

        {/* Right Rail: Reflection (Unified Findings across 4 Personas) */}
        {/* Right Rail: Desktop only */}
        {!isMobile && (
          <aside
            ref={rightRailRef}
            className="rail right-rail"
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
            {rightOpen ? (
              <ReviewDock
                findings={findings}
                onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
                onRerollFinding={handleRerollFinding}
                onRunAnalysis={handleRunFullAnalysis}
                onRunGrammar={handleRunGrammar}
                onRunResearch={handleRunResearch}
                onRunPersona={handleRunPersona}
                analyzing={analyzing}
                editor={editor}
                highlightedFindingId={highlightedFindingId}
                onToggleCollapse={() => setRightOpen(false)}
                triggerReviewCounter={triggerReviewCounter}
                grammarNotice={grammarNotice}
                selectedPersona={selectedPersona}
                onPersonaChange={setSelectedPersona}
                visiblePersonas={visiblePersonas}
                onVisibilityChange={setVisiblePersonas}
              />
            ) : (
              <div className="rail-strip" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  title="Expand Review Dock"
                  style={{ width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  title="Grammar"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--lt)' }}
                >
                  Gr
                </button>
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  title="Reader"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--ai)' }}
                >
                  Re
                </button>
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  title="Supervisor"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--yellow)' }}
                >
                  Su
                </button>
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  title="Researcher"
                  style={{ width: 30, height: 30, padding: 0, fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}
                >
                  Rs
                </button>
              </div>
            )}
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

            {/* Segmented Tab Controls: Context & Outline vs Review */}
            <div
              role="tablist"
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                background: 'var(--dock)',
                padding: '6px 8px 0',
                gap: 4,
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'outline'}
                onClick={() => { blip('select'); setMobileTab('outline') }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: mobileTab === 'outline' ? 700 : 500,
                  background: mobileTab === 'outline' ? 'var(--paper)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderBottom: mobileTab === 'outline' ? '1px solid var(--paper)' : '1px solid var(--border)',
                  borderTopLeftRadius: 'var(--radius, 4px)',
                  borderTopRightRadius: 'var(--radius, 4px)',
                  cursor: 'pointer',
                  color: mobileTab === 'outline' ? 'var(--ink)' : 'var(--muted)',
                  marginBottom: -1,
                }}
              >
                📑 Outline & Notes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'review'}
                onClick={() => { blip('select'); setMobileTab('review') }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: mobileTab === 'review' ? 700 : 500,
                  background: mobileTab === 'review' ? 'var(--paper)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderBottom: mobileTab === 'review' ? '1px solid var(--paper)' : '1px solid var(--border)',
                  borderTopLeftRadius: 'var(--radius, 4px)',
                  borderTopRightRadius: 'var(--radius, 4px)',
                  cursor: 'pointer',
                  color: mobileTab === 'review' ? 'var(--ink)' : 'var(--muted)',
                  marginBottom: -1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>🔍 Review</span>
                {findings.filter(f => f.status === 'open' || f.status === 'stale').length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 10,
                      background: 'var(--ai)',
                      color: '#fff',
                    }}
                  >
                    {findings.filter(f => f.status === 'open' || f.status === 'stale').length}
                  </span>
                )}
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {mobileTab === 'outline' ? (
                <IntentDock
                  context={context}
                  onContextChange={setContext}
                  outline={outline}
                  onOutlineChange={setOutline}
                  editor={editor}
                  onInsertTitleAtCursor={handleInsertTitleAtCursor}
                  onCopyOutlineContent={handleCopyOutlineContent}
                  onExpandSection={handleOpenExpandSection}
                  onToggleCollapse={() => setMobileDrawerOpen(false)}
                />
              ) : (
                <ReviewDock
                  findings={findings}
                  onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
                  onRerollFinding={handleRerollFinding}
                  onRunAnalysis={handleRunFullAnalysis}
                  onRunGrammar={handleRunGrammar}
                  onRunResearch={handleRunResearch}
                  onRunPersona={handleRunPersona}
                  analyzing={analyzing}
                  editor={editor}
                  highlightedFindingId={highlightedFindingId}
                  onToggleCollapse={() => setMobileDrawerOpen(false)}
                  triggerReviewCounter={triggerReviewCounter}
                  grammarNotice={grammarNotice}
                  selectedPersona={selectedPersona}
                  onPersonaChange={setSelectedPersona}
                  visiblePersonas={visiblePersonas}
                  onVisibilityChange={setVisiblePersonas}
                />
              )}
            </div>
          </aside>
        </>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        editor={editor}
        documentGoal={context.topic || context.purpose || ''}
      />

      {/* Fullscreen Step-by-Step Setup Wizard */}
      <SetupWizard
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onComplete={handleSetupComplete}
        initialSettings={appSettings}
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

      {/* Explicit Outline Section Expansion Preview Modal */}
      {expandingSection && (
        <ExpandSectionModal
          section={expandingSection}
          contextTopic={context.topic}
          onConfirm={handleConfirmExpand}
          onClose={() => setExpandingSection(null)}
        />
      )}
    </div>
  )
}
