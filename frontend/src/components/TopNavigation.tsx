import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { exportService, type ExportFormat } from '../services/export-service'
import { sfxPick, blip } from '../lib/sfx'
import { Logo, ThemeToggle } from './Brand'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import type { ThemeId } from '../domain/document'
import { TRANSITIONS } from '../lib/constants'

export type AssistGranularity = 'Hint' | 'Phrase' | 'Sentence' | 'Question'

export type AppMode = 'explore' | 'drafting' | 'editing'

export interface TopNavigationProps {
  mode: AppMode
  onModeChange: (m: AppMode) => void
  onOpenSetup: () => void
  onOpenSettings: () => void
  onOpenMetrics?: () => void
  onOpenTutorial?: () => void
  editor: Editor | null
  onToggleMobileDrawer?: () => void
  mobileDrawerOpen?: boolean
  findingsCount?: number

  // Assist, Theme, Language
  assistLevel: AssistGranularity
  onAssistLevelChange: (lvl: AssistGranularity) => void
  writingTheme: ThemeId
  onWritingThemeChange: (themeId: ThemeId) => void
  language: string
  onLanguageChange: (langCode: string) => void

  // Connect
  onOpenConnect: () => void
  // Suggest (still callable via keyboard, but button removed from topbar)
  onSuggest: () => void
  draftLoading: boolean
}

export default function TopNavigation({
  mode,
  onModeChange,
  onOpenSetup,
  onOpenSettings,
  onOpenMetrics,
  onOpenTutorial,
  editor,
  onToggleMobileDrawer,
  mobileDrawerOpen,
  findingsCount,
  assistLevel,
  onAssistLevelChange,
  writingTheme,
  onWritingThemeChange,
  language,
  onLanguageChange,
  onOpenConnect,
  onSuggest,
  draftLoading,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [connectDropdownOpen, setConnectDropdownOpen] = useState(false)
  const [connectSearch, setConnectSearch] = useState('')

  const handleExport = (format: ExportFormat) => {
    blip('select')
    setExportOpen(false)
    if (editor) void exportService.export(editor, format, 'Byline-Draft')
  }

  // Close all dropdowns on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.topbar-dropdown-container')) {
        setContextMenuOpen(false)
        setConnectDropdownOpen(false)
        setExportOpen(false)
        setMobileMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuOpen(false)
        setConnectDropdownOpen(false)
        setExportOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Filtered transitions for Connect quick-select
  const filteredTransitions = Object.entries(TRANSITIONS).flatMap(([category, phrases]) =>
    phrases
      .filter(p => {
        if (!connectSearch.trim()) return true
        const q = connectSearch.toLowerCase()
        return p.toLowerCase().includes(q) || category.toLowerCase().includes(q)
      })
      .map(p => ({ category, phrase: p }))
  )

  const handleInsertTransition = (phrase: string) => {
    if (!editor) return
    blip('select')
    const clean = phrase.replace('[]', '').trim() + ' '
    editor.chain().focus().insertContent(clean).run()
    setConnectDropdownOpen(false)
  }

  const btnBase: React.CSSProperties = {
    padding: '2px 8px',
    fontSize: 11.5,
    minHeight: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  }

  return (
    <header
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        height: 48,
        minHeight: 48,
        maxHeight: 48,
        gap: 6,
        position: 'relative',
        zIndex: 50,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        overflow: 'visible',
      }}
    >
      {/* ── LEFT: Mobile drawer, Logo, Undo/Redo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {onToggleMobileDrawer && (
          <button
            type="button"
            className="mobile-only-btn"
            onClick={onToggleMobileDrawer}
            title="Toggle Drawer"
            style={{ padding: '3px 8px', fontSize: 16, minHeight: 28, borderRadius: 'var(--radius)', position: 'relative' }}
          >
            ☰
            {findingsCount && findingsCount > 0 ? (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: 'var(--ai)', border: '1px solid var(--paper)' }} />
            ) : null}
          </button>
        )}

        <Logo height={24} />

        {/* Undo / Redo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1, marginLeft: 2 }}>
          <button
            type="button"
            onClick={() => { editor?.chain().focus().undo().run(); blip('select') }}
            disabled={!editor?.can().undo()}
            title="Undo (Ctrl+Z)"
            style={{ padding: '2px 6px', fontSize: 13, minHeight: 26, lineHeight: 1, opacity: !editor?.can().undo() ? 0.35 : 1 }}
          >↶</button>
          <button
            type="button"
            onClick={() => { editor?.chain().focus().redo().run(); blip('select') }}
            disabled={!editor?.can().redo()}
            title="Redo (Ctrl+Y)"
            style={{ padding: '2px 6px', fontSize: 13, minHeight: 26, lineHeight: 1, opacity: !editor?.can().redo() ? 0.35 : 1 }}
          >↷</button>
        </div>
      </div>

      {/* ── CENTER: Explore / Draft / Edit mode switch ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <div
          role="group"
          aria-label="App mode"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 2,
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--dock)',
            gap: 2,
          }}
        >
          <button
            type="button"
            aria-pressed={mode === 'explore'}
            onClick={() => { sfxPick(); onModeChange('explore') }}
            style={{
              padding: '3px 14px',
              height: 24,
              minHeight: 24,
              borderRadius: 12,
              border: 'none',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'explore' ? 'var(--ink)' : 'transparent',
              color: mode === 'explore' ? 'var(--bg)' : 'var(--muted)',
              lineHeight: 1,
            }}
          >
            Explore
          </button>
          <button
            type="button"
            aria-pressed={mode === 'drafting'}
            onClick={() => { sfxPick(); onModeChange('drafting') }}
            style={{
              padding: '3px 14px',
              height: 24,
              minHeight: 24,
              borderRadius: 12,
              border: 'none',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'drafting' ? 'var(--ink)' : 'transparent',
              color: mode === 'drafting' ? 'var(--bg)' : 'var(--muted)',
              lineHeight: 1,
            }}
          >
            Draft
          </button>
          <button
            type="button"
            aria-pressed={mode === 'editing'}
            onClick={() => { sfxPick(); onModeChange('editing') }}
            style={{
              padding: '3px 14px',
              height: 24,
              minHeight: 24,
              borderRadius: 12,
              border: 'none',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'editing' ? 'var(--blue)' : 'transparent',
              color: mode === 'editing' ? '#ffffff' : 'var(--muted)',
              boxShadow: mode === 'editing' ? '0 0 10px color-mix(in srgb, var(--blue) 40%, transparent)' : 'none',
              lineHeight: 1,
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* ── RIGHT: Context (Assist/Theme/Lang), Connect, Tour, Setup, Export, Theme, Settings ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* Context dropdown — Assist level, Writing Theme, Language */}
        <div className="topbar-dropdown-container desktop-only-btn" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => { setContextMenuOpen(v => !v); setConnectDropdownOpen(false); blip('toggle') }}
            title="Context: completion level, theme, language"
            style={{
              ...btnBase,
              gap: 4,
              background: contextMenuOpen ? 'var(--hover)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 10.5 }}>Context</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>▾</span>
          </button>

          {contextMenuOpen && (
            <div
              className="fade"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                zIndex: 200,
                width: 260,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Assist Level */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                  Completion Level
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['Hint', 'Phrase', 'Sentence', 'Question'] as AssistGranularity[]).map(gran => (
                    <button
                      key={gran}
                      type="button"
                      onClick={() => { onAssistLevelChange(gran); sfxPick() }}
                      style={{
                        flex: 1,
                        fontSize: 11,
                        padding: '3px 0',
                        minHeight: 24,
                        height: 24,
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        fontWeight: assistLevel === gran ? 700 : 500,
                        background: assistLevel === gran ? 'var(--ink)' : 'transparent',
                        color: assistLevel === gran ? 'var(--bg)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {gran}
                    </button>
                  ))}
                </div>
              </div>

              {/* Writing Theme */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                  Writing Theme
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.values(THEME_DEFINITIONS).map(th => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => { onWritingThemeChange(th.id); sfxPick() }}
                      style={{
                        padding: '6px 8px',
                        textAlign: 'left',
                        background: writingTheme === th.id ? 'var(--hover)' : 'transparent',
                        border: '1px solid ' + (writingTheme === th.id ? 'var(--border)' : 'transparent'),
                        borderRadius: 4,
                        cursor: 'pointer',
                        minHeight: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <div style={{ fontWeight: writingTheme === th.id ? 700 : 500, fontSize: 12, color: 'var(--ink)' }}>{th.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{th.tagline}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                  Language
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 140, overflowY: 'auto' }}>
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => { onLanguageChange(l.code); sfxPick() }}
                      style={{
                        padding: '5px 8px',
                        textAlign: 'left',
                        background: language === l.code ? 'var(--hover)' : 'transparent',
                        border: '1px solid ' + (language === l.code ? 'var(--border)' : 'transparent'),
                        borderRadius: 4,
                        cursor: 'pointer',
                        minHeight: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: language === l.code ? 700 : 500, color: 'var(--ink)' }}>{l.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{l.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connect quick-select dropdown */}
        <div className="topbar-dropdown-container desktop-only-btn" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => { setConnectDropdownOpen(v => !v); setContextMenuOpen(false); blip('toggle') }}
            title="Connect: insert links (Ctrl+/)"
            style={{
              ...btnBase,
              background: connectDropdownOpen ? 'var(--hover)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 10.5 }}>⇌</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>▾</span>
          </button>

          {connectDropdownOpen && (
            <div
              className="fade"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                zIndex: 220,
                width: 300,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                Links & Connectors
              </div>
              <input
                type="text"
                placeholder="Filter (contrast, cause)…"
                value={connectSearch}
                onChange={e => setConnectSearch(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', fontSize: 11.5, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--dock)', color: 'var(--ink)', boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredTransitions.slice(0, 14).map(({ category, phrase }, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleInsertTransition(phrase)}
                    style={{
                      width: '100%', padding: '6px 8px', textAlign: 'left',
                      background: 'transparent', border: '1px solid transparent',
                      borderRadius: 4, cursor: 'pointer', fontSize: 12.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 'auto',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
                  >
                    <span className="quote-serif" style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 12.5 }}>{phrase.replace('[]', '…')}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{category.split('/')[0].trim()}</span>
                  </button>
                ))}
                {filteredTransitions.length === 0 && (
                  <div style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No matches</div>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => { setConnectDropdownOpen(false); onOpenConnect() }}
                  style={{ width: '100%', padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 4 }}
                >
                  Open Connect Studio →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop right buttons */}
        <div className="desktop-only-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {/* Metrics */}
          {onOpenMetrics && (
            <button
              type="button"
              onClick={() => { blip('open'); onOpenMetrics() }}
              title="Metrics & usage"
              style={btnBase}
            >
              Metrics
            </button>
          )}

          {/* Tour */}
          <button
            type="button"
            onClick={() => { blip('open'); onOpenTutorial?.() }}
            title="Tour"
            style={{
              ...btnBase,
              fontSize: 11,
              fontWeight: 700,
              background: 'color-mix(in srgb, var(--ai) 10%, var(--paper))',
              color: 'var(--ai)',
              border: '1px solid color-mix(in srgb, var(--ai) 30%, transparent)',
              borderRadius: 4,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ai)', flexShrink: 0 }} />
            TOUR
          </button>

          {/* Setup */}
          <button
            type="button"
            onClick={() => { blip('open'); onOpenSetup() }}
            title="Setup"
            style={{ ...btnBase }}
          >
            Setup
          </button>

          {/* Export */}
          <div className="topbar-dropdown-container" style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              type="button"
              onClick={() => { setExportOpen(v => !v); blip('toggle') }}
              style={{ ...btnBase }}
            >
              Export ▾
            </button>
            {exportOpen && (
              <div
                className="fade"
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                  background: 'var(--paper)', border: '1px solid var(--border)',
                  borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 200, minWidth: 160, padding: '4px 0',
                }}
              >
                {(['docx', 'markdown', 'txt'] as ExportFormat[]).map((fmt, i) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    style={{ width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, minHeight: 'auto' }}
                  >
                    {['Word (.docx)', 'Markdown (.md)', 'Plain Text (.txt)'][i]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light mode toggle — Byline brand icons */}
          <ThemeToggle />
        </div>

        {/* Mobile ⋯ menu */}
        <div className="mobile-only-btn topbar-dropdown-container" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{ padding: '2px 7px', fontSize: 13, minHeight: 28 }}
          >
            ⋯
          </button>
          {mobileMenuOpen && (
            <div
              className="fade"
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'var(--paper)', border: '1px solid var(--border)',
                borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 220, minWidth: 180, padding: '6px 0',
              }}
            >
              <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenSetup() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Setup</button>
              {onOpenMetrics && (
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenMetrics() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Metrics</button>
              )}
              <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenTutorial?.() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Tour</button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Theme</span>
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
