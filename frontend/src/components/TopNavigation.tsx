import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { exportService, type ExportFormat } from '../services/export-service'
import { sfxPick, blip } from '../lib/sfx'
import { Logo } from './Brand'

export interface TopNavigationProps {
  mode: 'drafting' | 'editing'
  onModeChange: (m: 'drafting' | 'editing') => void
  wordCount: number
  charCount: number
  onOpenSetup: () => void
  onOpenSettings: () => void
  editor: Editor | null
  themeName: string
}

export default function TopNavigation({
  mode,
  onModeChange,
  wordCount,
  charCount,
  onOpenSetup,
  onOpenSettings,
  editor,
  themeName,
}: TopNavigationProps) {
  const [exportOpen, setExportOpen] = useState(false)

  const handleExport = (format: ExportFormat) => {
    blip('select')
    setExportOpen(false)
    if (editor) {
      void exportService.export(editor, format, 'Byline-Draft')
    }
  }

  return (
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48 }}>
      {/* Left: Brand & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo height={22} />
          <span style={{ fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 18, fontWeight: 700, color: 'var(--ink-5, #2C2523)' }}>
            Byline
          </span>
        </div>

        {/* Draft vs. Editing Mode Switcher */}
        <div className="mode-toggle" role="group" aria-label="Editor view mode" style={{ display: 'flex', background: 'var(--paper-2)', padding: 2, borderRadius: 6 }}>
          <button
            type="button"
            className={mode === 'drafting' ? 'active' : ''}
            style={{ padding: '4px 12px', fontSize: 13, fontWeight: mode === 'drafting' ? 600 : 400, borderRadius: 4, border: 'none', cursor: 'pointer' }}
            onClick={() => { sfxPick(); onModeChange('drafting') }}
          >
            Draft Mode
          </button>
          <button
            type="button"
            className={mode === 'editing' ? 'active' : ''}
            style={{ padding: '4px 12px', fontSize: 13, fontWeight: mode === 'editing' ? 600 : 400, borderRadius: 4, border: 'none', cursor: 'pointer' }}
            onClick={() => { sfxPick(); onModeChange('editing') }}
          >
            Editing Mode
          </button>
        </div>

        {/* Active Theme Badge */}
        <span
          style={{
            fontSize: 11,
            padding: '3px 8px',
            background: 'var(--paper-2)',
            border: '1px solid var(--ink-2)',
            borderRadius: 12,
            color: 'var(--ink-4)',
            textTransform: 'capitalize',
          }}
        >
          Theme: {themeName}
        </span>
      </div>

      {/* Right: Actions, Counts, Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Word Count */}
        <span style={{ fontSize: 12, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
          {wordCount} words · {charCount} chars
        </span>

        {/* Setup / Document Button */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSetup() }}
          style={{
            padding: '5px 10px',
            background: 'transparent',
            border: '1px solid var(--ink-2)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--ink-5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>✦ Setup & Templates</span>
        </button>

        {/* Export Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setExportOpen(v => !v)}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--ink-2)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--ink-5)',
              cursor: 'pointer',
            }}
          >
            Export ▾
          </button>

          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 32,
                background: 'var(--paper-1, #fff)',
                border: '1px solid var(--ink-2, #D9CEBE)',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: 150,
                padding: '4px 0',
              }}
            >
              <button
                type="button"
                onClick={() => handleExport('docx')}
                style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                Word Document (.docx)
              </button>
              <button
                type="button"
                onClick={() => handleExport('markdown')}
                style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => handleExport('txt')}
                style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                Plain Text (.txt)
              </button>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => { blip('open'); onOpenSettings() }}
          title="Settings (Ctrl + ,)"
          style={{
            padding: '5px 8px',
            background: 'transparent',
            border: '1px solid var(--ink-2)',
            borderRadius: 4,
            fontSize: 13,
            cursor: 'pointer',
            color: 'var(--ink-5)',
          }}
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  )
}
