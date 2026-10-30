import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { exportService, type ExportFormat } from '../services/export-service'
import { sfxPick, blip } from '../lib/sfx'
import { Logo } from './Brand'

export interface TopNavigationProps {
  mode: 'drafting' | 'editing'
  onModeChange: (m: 'drafting' | 'editing') => void
  onOpenSetup: () => void
  onOpenSettings: () => void
  editor: Editor | null
}

export default function TopNavigation({
  mode,
  onModeChange,
  onOpenSetup,
  onOpenSettings,
  editor,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark')

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('byline.theme', next)
    setIsDark(!isDark)
    blip('toggle')
    // Notify Logo and other theme listeners
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
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: '0 16px', height: 48 }}>
      {/* 1. Left: Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo height={24} />
      </div>

      {/* 2. Center: Mode Switcher — true center of screen */}
      <div
        style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', justifyContent: 'center', width: 'auto',
          pointerEvents: 'auto',
        }}
      >
        <div className="mode-switch" role="group" aria-label="Editor view mode" style={{
          position: 'relative',
          width: 210,
          height: 40,
          borderRadius: 20,
          border: '1px solid var(--border)',
          background: 'var(--dock)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}>
          {/* Sliding thumb */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: mode === 'drafting' ? 3 : 107,
              width: 100,
              height: 34,
              borderRadius: 16,
              background: mode === 'drafting' ? 'var(--ink)' : 'var(--blue)',
              boxShadow: mode === 'editing'
                ? '0 0 14px color-mix(in srgb, var(--blue) 45%, transparent), 0 4px 8px rgba(0,0,0,0.15)'
                : '0 0 14px color-mix(in srgb, var(--ink) 25%, transparent)',
              transition: 'left 0.35s cubic-bezier(0.23, 1, 0.32, 1), background 0.25s ease, box-shadow 0.25s ease',
              zIndex: 1,
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* Labels */}
          <button
            type="button"
            className={`mode-btn ${mode === 'drafting' ? 'active' : ''}`}
            style={{
              width: '50%',
              padding: '0',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 0,
              border: 'none',
              background: 'transparent',
              color: mode === 'drafting' ? 'var(--bg)' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
            onClick={() => { sfxPick(); onModeChange('drafting') }}
          >
            Draft
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'editing' ? 'active' : ''}`}
            style={{
              width: '50%',
              padding: '0',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 0,
              border: 'none',
              background: 'transparent',
              color: mode === 'editing' ? 'var(--bg)' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'color 0.25s ease',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
            onClick={() => { sfxPick(); onModeChange('editing') }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* 3. Right: Actions — pinned to right edge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginLeft: 'auto', zIndex: 10 }}>
        {/* Setup Wizard */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSetup() }}
          title="Open Setup Questionnaire & Templates"
          style={{ padding: '2px 10px', fontSize: 12, minHeight: 28 }}
        >
          ✦ Setup
        </button>

        {/* Export popup menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setExportOpen(v => !v)}
            style={{ padding: '2px 10px', fontSize: 12, minHeight: 28 }}
          >
            Export ▾
          </button>

          {exportOpen && (
            <div
              className="fade"
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-pop)',
                zIndex: 110,
                minWidth: 160,
                padding: '4px 0',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => handleExport('docx')}
                style={{ width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 'auto' }}
              >
                Word (.docx)
              </button>
              <button
                type="button"
                onClick={() => handleExport('markdown')}
                style={{ width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 'auto' }}
              >
                Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => handleExport('txt')}
                style={{ width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 'auto' }}
              >
                Plain Text (.txt)
              </button>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle — icon matches home page Brand.tsx */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ padding: '2px 4px', minHeight: 28, display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--paper)' }}
        >
          <img
            src={isDark ? '/icon-dark.png' : '/icon-light.png'}
            alt=""
            style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, display: 'block' }}
          />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSettings() }}
          title="Settings (Ctrl + ,)"
          aria-label="Settings"
          style={{ padding: '2px 8px', fontSize: 12.5, minHeight: 28 }}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
