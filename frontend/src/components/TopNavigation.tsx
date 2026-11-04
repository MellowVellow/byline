import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Settings as SettingsIcon } from 'lucide-react'
import { exportService, type ExportFormat } from '../services/export-service'
import { blip } from '../lib/sfx'
import { Logo, ThemeToggle } from './Brand'
import { SUPPORTED_LANGUAGES, languageShort } from '../domain/writing-profile'
import { t } from '../i18n'

export interface TopNavigationProps {
  onOpenSettings: () => void
  onOpenMetrics?: () => void
  editor: Editor | null
  onToggleMobileDrawer?: () => void
  mobileDrawerOpen?: boolean
  findingsCount?: number
  language?: string
  onLanguageChange?: (code: string) => void

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
  language = 'en-US',
  onLanguageChange,
  onSuggest,
  draftLoading,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleExport = (format: ExportFormat) => {
    blip('select')
    setExportOpen(false)
    if (editor) void exportService.export(editor, format, 'Byline-Draft')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.topbar-dropdown-container')) {
        setExportOpen(false)
        setMobileMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
            onClick={() => { blip('toggle'); onToggleMobileDrawer?.() }}
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
        <span
          className="desktop-only-btn"
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: 'var(--muted)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Think it. Write it.
        </span>

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

      {/* ── RIGHT: Export, Theme ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Mobile one-tap Suggest (no Ctrl+Space on touch keyboards) */}
        <button
          type="button"
          className="mobile-only-btn"
          onClick={() => { blip('select'); onSuggest() }}
          disabled={draftLoading}
          title="Get writing suggestions"
          style={{ padding: '2px 8px', fontSize: 12.5, minHeight: 28, fontWeight: 700, opacity: draftLoading ? 0.6 : 1 }}
        >
          {draftLoading ? '…' : '✨'}
        </button>

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
          {/* Context language toggle — EN | ID abbreviation */}
          {onLanguageChange && (
            <button
              type="button"
              onClick={() => {
                blip('select')
                const idx = SUPPORTED_LANGUAGES.findIndex(l => l.code === language)
                const next = SUPPORTED_LANGUAGES[(idx + 1 + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length]
                onLanguageChange(next.code)
              }}
              title={t('contextLanguage')}
              aria-label={t('contextLanguage')}
              style={{ ...btnBase, fontWeight: 800, letterSpacing: '0.04em', minWidth: 38, justifyContent: 'center' }}
            >
              {languageShort(language)}
            </button>
          )}
          <button
            type="button"
            onClick={() => { blip('open'); onOpenSettings() }}
            title="Settings"
            aria-label="Open settings"
            className="settings-icon"
            style={{ ...btnBase, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SettingsIcon size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Mobile ⋯ menu */}
        <div className="mobile-only-btn topbar-dropdown-container" style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            onClick={() => { blip('toggle'); setMobileMenuOpen(v => !v) }}
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
                <button type="button" onClick={() => { blip('open'); setMobileMenuOpen(false); onOpenMetrics() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Metrics</button>
              )}
              <button type="button" onClick={() => { blip('select'); setMobileMenuOpen(false); onSuggest() }} disabled={draftLoading} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: draftLoading ? 0.6 : 1 }}>{draftLoading ? 'Suggesting…' : '✨ Suggest'}</button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export</div>
              {(['docx', 'markdown', 'txt'] as ExportFormat[]).map((fmt, i) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleExport(fmt) }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  {['Word (.docx)', 'Markdown (.md)', 'Plain Text (.txt)'][i]}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button type="button" onClick={() => { blip('open'); setMobileMenuOpen(false); onOpenSettings() }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Settings</button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Theme</span>
                <ThemeToggle />
              </div>
              {onLanguageChange && (
                <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t('contextLanguage')}</span>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    {SUPPORTED_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => { blip('select'); setMobileMenuOpen(false); onLanguageChange(l.code) }}
                        style={{
                          padding: '4px 10px', fontSize: 12, fontWeight: l.code === language ? 800 : 500,
                          borderRadius: 99,
                          background: l.code === language ? 'var(--ink)' : 'transparent',
                          color: l.code === language ? 'var(--bg)' : 'var(--muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {languageShort(l.code)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
