import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { exportService, type ExportFormat } from '../services/export-service'
import { sfxPick, blip } from '../lib/sfx'
import { Logo, getTheme } from './Brand'

export interface TopNavigationProps {
  mode: 'drafting' | 'editing'
  onModeChange: (m: 'drafting' | 'editing') => void
  onOpenSetup: () => void
  onOpenSettings: () => void
  onOpenMetrics?: () => void
  editor: Editor | null
  onToggleMobileDrawer?: () => void
  mobileDrawerOpen?: boolean
  findingsCount?: number
}

export default function TopNavigation({
  mode,
  onModeChange,
  onOpenSetup,
  onOpenSettings,
  onOpenMetrics,
  editor,
  onToggleMobileDrawer,
  mobileDrawerOpen,
  findingsCount,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(getTheme)

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('byline.theme', next)
    setTheme(next)
    blip('toggle')
    try { dispatchEvent(new Event('byline-theme')) } catch { }
  }

  const handleExport = (format: ExportFormat) => {
    blip('select')
    setExportOpen(false)
    if (editor) {
      void exportService.export(editor, format, 'Byline-Draft')
    }
  }

  return (
    <header
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        height: 48,
        minHeight: 48,
        maxHeight: 48,
        gap: 6,
        overflow: 'visible',
        flexWrap: 'nowrap',
      }}
    >
      {/* Left — mobile drawer toggle & logo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {onToggleMobileDrawer && (
          <button
            type="button"
            className="mobile-only-btn"
            onClick={onToggleMobileDrawer}
            title="Toggle Outline & Review Drawer (or swipe right to open)"
            aria-label="Toggle Outline & Review Drawer"
            style={{
              padding: '3px 8px',
              fontSize: 16,
              minHeight: 28,
              borderRadius: 'var(--radius)',
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ☰
            {findingsCount && findingsCount > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--ai)',
                  border: '1px solid var(--paper)',
                }}
              />
            ) : null}
          </button>
        )}
        <Logo height={24} />
      </div>

      {/* Center — mode toggle */}
      <div
        role="group"
        aria-label="Editor mode"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 2,
          borderRadius: 20,
          border: '1px solid var(--border)',
          background: 'var(--dock)',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-pressed={mode === 'drafting'}
          onClick={() => { sfxPick(); onModeChange('drafting') }}
          style={{
            padding: '3px 14px',
            height: 26,
            minHeight: 26,
            borderRadius: 14,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
            background: mode === 'drafting' ? 'var(--ink)' : 'transparent',
            color: mode === 'drafting' ? 'var(--bg)' : 'var(--ink-3)',
            boxShadow: mode === 'drafting' ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            transform: 'none',
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
            height: 26,
            minHeight: 26,
            borderRadius: 14,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
            background: mode === 'editing' ? 'var(--blue)' : 'transparent',
            color: mode === 'editing' ? '#ffffff' : 'var(--ink-3)',
            boxShadow: mode === 'editing'
              ? '0 0 14px color-mix(in srgb, var(--blue) 50%, transparent), 0 1px 4px rgba(0,0,0,0.25)'
              : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            transform: 'none',
          }}
        >
          Edit
        </button>
      </div>

      {/* Right — actions, strictly non-wrapping */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 0, flexShrink: 0 }}>
        {/* Benchmark & Metrics Demo */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenMetrics?.() }}
          title="Demo — Benchmark & System Telemetry (Acceptance Rates, Usage & Model Output Errors)"
          style={{
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            minHeight: 28,
            background: 'color-mix(in srgb, var(--ai) 12%, var(--paper))',
            color: 'var(--ai)',
            border: '1px solid color-mix(in srgb, var(--ai) 35%, transparent)',
            borderRadius: 'var(--radius, 4px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ai)' }} />
          DEMO
        </button>

        {/* Desktop-only action buttons */}
        <div className="desktop-only-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {/* Setup */}
          <button
            type="button"
            onClick={() => { blip('open'); onOpenSetup() }}
            title="Open Setup Questionnaire & Templates"
            style={{ padding: '2px 8px', fontSize: 11.5, minHeight: 28 }}
          >
            ✦ Setup
          </button>

          {/* Export */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setExportOpen(v => !v)}
              style={{ padding: '2px 8px', fontSize: 11.5, minHeight: 28 }}
            >
              Export ▾
            </button>

            {exportOpen && (
              <div
                className="fade"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-pop)',
                  zIndex: 110,
                  minWidth: 160,
                  padding: '4px 0',
                }}
              >
                {(['docx', 'markdown', 'txt'] as ExportFormat[]).map((fmt, i) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    style={{ width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 'auto' }}
                  >
                    {['Word (.docx)', 'Markdown (.md)', 'Plain Text (.txt)'][i]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle — icon */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              padding: '4px',
              minHeight: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--paper)',
            }}
          >
            <img
              src={theme === 'dark' ? '/icon-dark.png' : '/icon-light.png'}
              alt=""
              style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 4, display: 'block' }}
            />
          </button>
        </div>

        {/* Mobile-only More menu (Setup, Export, Theme dropdown) */}
        <div className="mobile-only-btn" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            title="More Options"
            aria-label="More Options"
            style={{ padding: '2px 7px', fontSize: 13, minHeight: 28 }}
          >
            ⋯
          </button>

          {mobileMenuOpen && (
            <div
              className="fade"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-pop)',
                zIndex: 120,
                minWidth: 170,
                padding: '4px 0',
              }}
            >
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenSetup() }}
                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                ✦ Setup Wizard
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <div style={{ padding: '4px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Export Document</div>
              {(['docx', 'markdown', 'txt'] as ExportFormat[]).map((fmt, i) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleExport(fmt) }}
                  style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5 }}
                >
                  {['Word (.docx)', 'Markdown (.md)', 'Plain Text (.txt)'][i]}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); toggleTheme() }}
                style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>{theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Settings — accessible on both mobile and desktop */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSettings() }}
          title="Settings (Ctrl + ,)"
          aria-label="Settings"
          style={{ padding: '2px 7px', fontSize: 13, minHeight: 28, flexShrink: 0 }}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
