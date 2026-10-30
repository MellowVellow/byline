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
      style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, gap: 0 }}
    >
      {/* Left — logo, takes flex:1 so it pushes center to true middle */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Logo height={24} />
      </div>

      {/* Center — mode toggle, natural width, always truly centered */}
      <div
        role="group"
        aria-label="Editor mode"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: 3,
          borderRadius: 20,
          border: '1px solid var(--border)',
          background: 'var(--dock)',
          gap: 2,
        }}
      >
        <button
          type="button"
          aria-pressed={mode === 'drafting'}
          onClick={() => { sfxPick(); onModeChange('drafting') }}
          style={{
            padding: '4px 20px',
            height: 28,
            minHeight: 28,
            borderRadius: 16,
            border: 'none',
            fontSize: 12.5,
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
            padding: '4px 20px',
            height: 28,
            minHeight: 28,
            borderRadius: 16,
            border: 'none',
            fontSize: 12.5,
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

      {/* Right — actions, takes flex:1 and aligns to the right edge */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        {/* Setup */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSetup() }}
          title="Open Setup Questionnaire & Templates"
          style={{ padding: '2px 10px', fontSize: 12, minHeight: 28 }}
        >
          ✦ Setup
        </button>

        {/* Export */}
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

        {/* Theme toggle — icon, same as home page */}
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
            style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, display: 'block' }}
          />
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSettings() }}
          title="Settings (Ctrl + ,)"
          aria-label="Settings"
          style={{ padding: '2px 8px', fontSize: 13, minHeight: 28 }}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
