import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { exportService, type ExportFormat } from '../services/export-service'
import { blip } from '../lib/sfx'
import { Logo, ThemeToggle } from './Brand'
import { TRANSITIONS } from '../lib/constants'

export interface TopNavigationProps {
  onOpenSettings: () => void
  onOpenMetrics?: () => void
  editor: Editor | null
  onToggleMobileDrawer?: () => void
  mobileDrawerOpen?: boolean
  findingsCount?: number

  // Connect
  onOpenConnect: () => void
  // Suggest (still callable via keyboard, but button removed from topbar)
  onSuggest: () => void
  draftLoading: boolean
}

export default function TopNavigation({
  onOpenSettings,
  onOpenMetrics,
  editor,
  onToggleMobileDrawer,
  mobileDrawerOpen,
  findingsCount,
  onOpenConnect,
  onSuggest,
  draftLoading,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
        setConnectDropdownOpen(false)
        setExportOpen(false)
        setMobileMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

      {/* ── RIGHT: Connect, Export, Theme ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

        {/* Connect quick-select dropdown */}
        <div className="topbar-dropdown-container desktop-only-btn" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => { setConnectDropdownOpen(v => !v); blip('toggle') }}
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
              {onOpenMetrics && (
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenMetrics() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Metrics</button>
              )}
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
