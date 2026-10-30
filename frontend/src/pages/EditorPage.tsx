import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'

import TopNavigation from '../components/TopNavigation'
import IntentDock from '../components/IntentDock'
import ReflectionDock from '../components/ReflectionDock'
import ConnectModal from '../components/ConnectModal'
import ParaphrasePopup from '../components/ParaphrasePopup'
import SetupWizard, { type SetupResult } from '../components/SetupWizard'
import SettingsMenu from '../components/SettingsMenu'

import { contextService, type SelectionContext } from '../services/context-service'
import { globalAnalysisService } from '../services/analysis-service'
import { SuggestionService } from '../services/suggestion-service'
import { resolveAnchor, applySafeReplacement } from '../editor/anchoring'
import type { DocumentContext, OutlineNode, ThemeId } from '../domain/document'
import type { Finding, FindingStatus, Suggestion, EvidenceRecord } from '../domain/finding'
import { THEME_DEFINITIONS } from '../domain/writing-profile'
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings'
import { api } from '../lib/api'
import { GOLDEN_PATH_SAMPLE_DOC, GOLDEN_PATH_SAMPLE_CONTEXT, FALLBACK_ISSUES, FALLBACK_REACTIONS, FALLBACK_READINGS } from '../lib/fallback'
import { sfxAccept, sfxDismiss, sfxPick, blip } from '../lib/sfx'

export type AssistGranularity = 'Hint' | 'Phrase' | 'Sentence' | 'Paragraph'

export default function EditorPage({ demo = false }: { demo?: boolean }) {
  // App & View settings
  const [mode, setMode] = useState<'drafting' | 'editing'>('drafting')
  const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)

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
        { id: 'sec-1', title: '1. The Congestion Dilemma', description: 'Introduce runway and highway saturation.', order: 1 },
        { id: 'sec-2', title: '2. The Capital Cost Critique', description: 'Examine debt loads and suburban density limits.', order: 2 },
        { id: 'sec-3', title: '3. Comparative Economic Yields', description: 'Analyze travel predictability and carbon savings.', order: 3 },
        { id: 'sec-4', title: '4. Dialectical Synthesis', description: 'Frame investment as a balanced infrastructure portfolio.', order: 4 },
      ]
    }
    const saved = localStorage.getItem('byline.doc.outline')
    return saved ? JSON.parse(saved) : [
      { id: 'sec-1', title: '1. Introduction', description: 'Establish the core thesis.', order: 1 },
      { id: 'sec-2', title: '2. Argument & Evidence', description: 'Develop key points.', order: 2 },
      { id: 'sec-3', title: '3. Conclusion', description: 'Summarize implications.', order: 3 },
    ]
  })

  const [docRevision, setDocRevision] = useState(1)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })

  // Unified Findings state
  const [findings, setFindings] = useState<Finding[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  // Selection & Paraphrase state
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)

  // Draft Assistance state
  const [assistLevel, setAssistLevel] = useState<AssistGranularity>('Phrase')
  const [draftSuggestions, setDraftSuggestions] = useState<string[]>([])
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftIndex, setDraftIndex] = useState(0)

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
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
      // Re-validate finding anchors
      globalAnalysisService.validateAnchors(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      const selCtx = contextService.getSelectionContext(editor)
      setSelectionContext(selCtx)
    },
    onCreate: ({ editor }) => {
      const words = (editor.storage as any).characterCount?.words() || 0
      const chars = (editor.storage as any).characterCount?.characters() || 0
      setCounts({ words, chars })
    },
  })

  // Save context & outline changes
  useEffect(() => {
    if (!demo) {
      localStorage.setItem('byline.doc.context', JSON.stringify(context))
    }
  }, [context, demo])

  useEffect(() => {
    if (!demo) {
      localStorage.setItem('byline.doc.outline', JSON.stringify(outline))
    }
  }, [outline, demo])

  // Sync findings with global analysis service
  useEffect(() => {
    return globalAnalysisService.subscribe(newFindings => {
      setFindings(newFindings)
    })
  }, [])

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
    if (res.theme) {
      setAppSettings(prev => {
        const next = { ...prev, writingTheme: res.theme || 'neutral' }
        saveSettings(next)
        return next
      })
    }
    if (res.initialHtml && editor) {
      editor.commands.setContent(res.initialHtml)
    }
  }

  // --- DRAFT ASSISTANCE (Ghost completions) ---
  const handleRequestDraftAssistance = async () => {
    if (!editor) return
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

      if (res?.ok && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
        setDraftSuggestions(res.suggestions.slice(0, 3))
        setDraftIndex(0)
      } else {
        // Fallback contextual options
        setDraftSuggestions([
          'demonstrating long-term return on infrastructure capital.',
          'which significantly mitigates municipal debt exposure.',
          'yielding higher compounding returns across metropolitan regions.',
        ])
        setDraftIndex(0)
      }
      blip('done')
    } catch {
      // offline fallback
      setDraftSuggestions([
        'demonstrating long-term return on infrastructure capital.',
        'which significantly mitigates municipal debt exposure.',
      ])
      setDraftIndex(0)
    } finally {
      setDraftLoading(false)
    }
  }

  const handleAcceptDraftSuggestion = (index: number) => {
    if (!editor || !draftSuggestions[index]) return
    const text = draftSuggestions[index]
    const at = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, at - 1), at)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''

    editor.chain().focus().insertContent(prefix + text.trim() + ' ').run()
    sfxAccept()
    setDraftSuggestions([])
  }

  // --- REFLECTION PERSONA TRIGGERS ---
  const handleRunFullAnalysis = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const fullCtx = contextService.getFullContext(editor, context, outline, {
      language: appSettings.language,
      theme: appSettings.writingTheme,
    })

    try {
      // 1. Run Supervisor (Structure & Reasoning)
      const supRes = await api.annotate({
        context: `${fullCtx.context.topic || ''}. Purpose: ${fullCtx.context.purpose || ''}. Audience: ${fullCtx.context.audience || ''}`,
        level: appSettings.writingTheme,
        text: fullCtx.fullText,
      })

      // 2. Run Reader (Clarity & Misunderstanding)
      const readRes = await api.reactions({
        context: fullCtx.context.topic || 'General essay',
        level: appSettings.writingTheme,
        text: fullCtx.fullText,
        persona: 'Critical Reader',
      })

      const newFindings: Finding[] = []

      if (supRes?.ok && Array.isArray(supRes.issues)) {
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

      if (readRes?.ok && Array.isArray(readRes.reactions)) {
        for (const rx of readRes.reactions) {
          newFindings.push({
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

      if (newFindings.length > 0) {
        globalAnalysisService.addFindings(newFindings)
      }
      blip('done')
    } catch {
      // offline error handling
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRunGrammar = async () => {
    if (!editor) return
    setAnalyzing(true)
    blip('select')

    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
    try {
      const res = await api.grammar({ text })
      const matches = res?.matches || []
      const grammarFindings: Finding[] = []

      for (const m of matches) {
        const quote = text.slice(m.from, m.to)
        if (quote.trim()) {
          grammarFindings.push({
            id: `gram-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            documentId: 'active-doc',
            persona: 'grammar',
            kind: 'language_error',
            anchor: {
              quotedText: quote,
              startOffset: m.from,
              endOffset: m.to,
              documentRevision: docRevision,
            },
            explanation: m.message || 'Grammar or spelling issue.',
            suggestions: (m.replacements || []).slice(0, 1).map((rep: string, i: number) => ({
              id: `rep-${i}`,
              text: rep,
            })),
            status: 'open',
            sourceRevision: docRevision,
            createdAt: Date.now(),
          })
        }
      }

      if (grammarFindings.length > 0) {
        globalAnalysisService.addFindings(grammarFindings)
      }
      blip('done')
    } catch {
      // safe fallback
    } finally {
      setAnalyzing(false)
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

      if (researchFindings.length > 0) {
        globalAnalysisService.addFindings(researchFindings)
      }
      blip('done')
    } catch {
      // safe fallback
    } finally {
      setAnalyzing(false)
    }
  }

  // Reroll single finding alternatives
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

  // Keyboard shortcut listener for active draft suggestions
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Handle active draft overlay
      if (draftSuggestions.length > 0) {
        const handled = SuggestionService.handleKeyDown(
          e,
          {
            options: draftSuggestions,
            selectedIndex: draftIndex,
            isVisible: true,
            source: 'draft',
          },
          {
            onSelect: idx => handleAcceptDraftSuggestion(idx),
            onReroll: () => void handleRequestDraftAssistance(),
            onDismiss: () => setDraftSuggestions([]),
          }
        )
        if (handled) return
      }

      // Hotkey to trigger draft assistance: Ctrl/Cmd + Space
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        void handleRequestDraftAssistance()
      }

      // Hotkey to open Connect modal: Ctrl/Cmd + /
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setConnectOpen(true)
      }

      // Hotkey for Settings: Ctrl/Cmd + ,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(v => !v)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draftSuggestions, draftIndex, assistLevel, docRevision])

  return (
    <div className="byline-app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--paper-0, #F4EEE5)' }}>
      {/* 1. Top Navigation */}
      <TopNavigation
        mode={mode}
        onModeChange={setMode}
        wordCount={counts.words}
        charCount={counts.chars}
        onOpenSetup={() => setSetupOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        editor={editor}
        themeName={THEME_DEFINITIONS[appSettings.writingTheme]?.name || 'Neutral'}
      />

      {/* 2. Three-Part Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
        {/* Left Dock: Intent (Context & Outline) */}
        <div style={{ width: 320, minWidth: 260, borderRight: '1px solid var(--ink-2, #D9CEBE)', background: 'var(--paper-1, #FCF8F2)' }}>
          <IntentDock
            context={context}
            onContextChange={setContext}
            outline={outline}
            onOutlineChange={setOutline}
            editor={editor}
          />
        </div>

        {/* Center: Expression (Paper Editor) */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--paper-0, #F4EEE5)',
            position: 'relative',
          }}
        >
          {/* Formatting & Drafting Toolbar */}
          <div
            style={{
              padding: '6px 20px',
              borderBottom: '1px solid var(--ink-2)',
              background: 'var(--paper-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {/* Formatting Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`wz-btn-icon ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
                style={{ padding: '3px 7px', fontSize: 12, fontWeight: 700, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`wz-btn-icon ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                style={{ padding: '3px 7px', fontSize: 12, fontWeight: 700, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                style={{ padding: '3px 7px', fontSize: 12, fontWeight: editor?.isActive('bold') ? 700 : 400, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                style={{ padding: '3px 7px', fontSize: 12, fontStyle: 'italic', borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                style={{ padding: '3px 7px', fontSize: 12, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                style={{ padding: '3px 7px', fontSize: 12, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                “ Quote
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().undo().run()}
                title="Undo (Ctrl+Z)"
                style={{ padding: '3px 7px', fontSize: 12, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().redo().run()}
                title="Redo (Ctrl+Y)"
                style={{ padding: '3px 7px', fontSize: 12, borderRadius: 3, border: '1px solid var(--ink-2)', background: 'transparent', cursor: 'pointer' }}
              >
                ↷
              </button>
            </div>

            {/* Drafting Tools: Assist & Connect */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Granularity Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase' }}>Assist:</span>
                {(['Hint', 'Phrase', 'Sentence', 'Paragraph'] as AssistGranularity[]).map(gran => (
                  <button
                    key={gran}
                    type="button"
                    className={`wz-pill ${assistLevel === gran ? 'active' : ''}`}
                    onClick={() => { setAssistLevel(gran); sfxPick() }}
                    style={{ fontSize: 11, padding: '2px 7px' }}
                  >
                    {gran}
                  </button>
                ))}
              </div>

              {/* Suggest Button */}
              <button
                type="button"
                disabled={draftLoading}
                onClick={handleRequestDraftAssistance}
                style={{
                  padding: '4px 10px',
                  background: '#A93226',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: draftLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{draftLoading ? 'Generating…' : '✦ Suggest'}</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>(Ctrl+Space)</span>
              </button>

              {/* Connect Assistant Button */}
              <button
                type="button"
                onClick={() => { blip('open'); setConnectOpen(true) }}
                style={{
                  padding: '4px 10px',
                  background: 'var(--paper-2)',
                  border: '1px solid var(--ink-2)',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink-5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>⇌ Connect</span>
                <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>(Ctrl+/)</span>
              </button>
            </div>
          </div>

          {/* Active Draft Suggestion Banner / Overlay */}
          {draftSuggestions.length > 0 && (
            <div
              style={{
                background: 'var(--paper-1)',
                borderBottom: '2px solid #A93226',
                padding: '10px 24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'grid',
                gap: 8,
                zIndex: 50,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#A93226' }}>
                  {assistLevel} Suggestions ({draftSuggestions.length}) · Press <kbd>1–3</kbd> or <kbd>Tab</kbd> to accept
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => void handleRequestDraftAssistance()}
                    style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 11 }}
                  >
                    ↻ Reroll (Alt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftSuggestions([])}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 11 }}
                  >
                    ✕ Dismiss (Esc)
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {draftSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    onClick={() => handleAcceptDraftSuggestion(i)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 4,
                      background: 'var(--paper-2)',
                      border: '1px solid var(--ink-2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: '#A93226', fontSize: 11 }}>{i + 1}</span>
                      <span style={{ fontStyle: 'italic', fontFamily: '"Source Serif 4", serif' }}>“{sug}”</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#1765CC', fontWeight: 600 }}>Insert</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paper Editor Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '40px 24px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              className="paper"
              style={{
                width: '100%',
                maxWidth: appSettings.paperWidth === 'narrow' ? '58ch' : (appSettings.paperWidth === 'wide' ? '88ch' : '72ch'),
                minHeight: '80vh',
                background: 'var(--paper-1, #FCF8F2)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                padding: '48px 56px',
                borderRadius: 4,
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Selection Paraphrase Popup */}
          {selectionContext && (
            <ParaphrasePopup
              editor={editor}
              selectionContext={selectionContext}
              documentGoal={context.topic || context.purpose || ''}
              theme={appSettings.writingTheme}
              onClose={() => setSelectionContext(null)}
            />
          )}
        </main>

        {/* Right Dock: Reflection (Unified Findings across 4 Personas) */}
        <div style={{ width: 340, minWidth: 280, borderLeft: '1px solid var(--ink-2, #D9CEBE)', background: 'var(--paper-1, #FCF8F2)' }}>
          <ReflectionDock
            findings={findings}
            onStatusChange={(id, st) => globalAnalysisService.updateStatus(id, st)}
            onRerollFinding={handleRerollFinding}
            onRunAnalysis={handleRunFullAnalysis}
            onRunGrammar={handleRunGrammar}
            onRunResearch={handleRunResearch}
            analyzing={analyzing}
            editor={editor}
          />
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        editor={editor}
        documentGoal={context.topic || context.purpose || ''}
      />

      {/* Setup Wizard */}
      <SetupWizard
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onComplete={handleSetupComplete}
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
    </div>
  )
}
