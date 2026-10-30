import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { api } from '../lib/api'
import { applySafeReplacement, type ResolvedRange } from '../editor/anchoring'
import { blip, sfxAccept, sfxPick } from '../lib/sfx'

export interface ParaphrasePopupProps {
  editor: Editor | null
  selectionContext: {
    selectedText: string
    from: number
    to: number
    surroundingParagraph: string
  } | null
  documentGoal: string
  theme: string
  onClose: () => void
}

export type ParaphraseMode = 'paraphrase' | 'shorten' | 'tone'

export default function ParaphrasePopup({
  editor,
  selectionContext,
  documentGoal,
  theme,
  onClose,
}: ParaphrasePopupProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ParaphraseMode>('paraphrase')
  const [options, setOptions] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (selectionContext?.selectedText) {
      void runParaphrase('paraphrase')
    }
  }, [selectionContext?.selectedText])

  if (!selectionContext || !selectionContext.selectedText.trim()) return null

  async function runParaphrase(selectedMode: ParaphraseMode) {
    if (!editor || !selectionContext) return
    setMode(selectedMode)
    setLoading(true)
    setErrorMsg('')
    blip('select')

    const sel = selectionContext.selectedText.trim()
    const sentence = selectionContext.surroundingParagraph || sel

    try {
      const res = await api.synonyms({
        context: `${documentGoal || 'Writing piece'} (Theme: ${theme}, Operation: ${selectedMode})`,
        level: selectedMode === 'shorten' ? 'Concise' : (selectedMode === 'tone' ? theme : 'General'),
        word: sel,
        sentence: sentence,
      })

      if (res?.ok && Array.isArray(res.synonyms) && res.synonyms.length > 0) {
        setOptions(res.synonyms.slice(0, 3))
      } else {
        // Fallback contextual alternatives
        if (selectedMode === 'shorten') {
          setOptions([sel.split(' ').slice(0, Math.max(1, Math.floor(sel.split(' ').length / 2))).join(' ') || sel, 'concise phrasing', 'direct summary'])
        } else {
          setOptions([
            `distinctly ${sel}`,
            `clearly ${sel}`,
            `compellingly expressed ${sel}`,
          ])
        }
      }
      blip('done')
    } catch (e: any) {
      setErrorMsg(e?.message || 'Inference error')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyOption = (text: string) => {
    if (!editor || !selectionContext) return

    // Apply safe transaction to the selected range
    const { from, to, selectedText } = selectionContext

    // Verify current text
    const currentSlice = editor.state.doc.textBetween(from, to)
    if (currentSlice.trim() !== selectedText.trim()) {
      alert('Selected text was modified during request. Edit aborted safely.')
      onClose()
      return
    }

    try {
      editor.chain().focus().insertContentAt({ from, to }, text).run()
      sfxAccept()
      onClose()
    } catch {
      alert('Failed to insert replacement.')
    }
  }

  // Keyboard shortcut listener for 1, 2, 3 and Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (['1', '2', '3'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const idx = Number(e.key) - 1
        if (options[idx]) {
          e.preventDefault()
          handleApplyOption(options[idx])
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [options, selectionContext])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--paper-1, #fff)',
        border: '1px solid var(--ink-2, #D9CEBE)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        padding: '12px 16px',
        zIndex: 100,
        maxWidth: 520,
        width: '90%',
        display: 'grid',
        gap: 10,
      }}
    >
      {/* Header and Modes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#A93226' }}>
            Selection Alternatives
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            “{selectionContext.selectedText}”
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 14 }}
        >
          ✕
        </button>
      </div>

      {/* Mode Buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className={`wz-pill ${mode === 'paraphrase' ? 'active' : ''}`}
          onClick={() => runParaphrase('paraphrase')}
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          Paraphrase
        </button>
        <button
          type="button"
          className={`wz-pill ${mode === 'shorten' ? 'active' : ''}`}
          onClick={() => runParaphrase('shorten')}
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          Shorten
        </button>
        <button
          type="button"
          className={`wz-pill ${mode === 'tone' ? 'active' : ''}`}
          onClick={() => runParaphrase('tone')}
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          Adapt Tone ({theme})
        </button>
      </div>

      {/* Alternatives */}
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '10px 0', textAlign: 'center' }}>
          Generating alternatives via Meta reasoning model…
        </div>
      ) : errorMsg ? (
        <div style={{ fontSize: 12, color: '#C0281F' }}>{errorMsg}</div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => handleApplyOption(opt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 4,
                border: '1px solid var(--ink-2)',
                background: 'var(--paper-2)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-5)' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: '#A93226',
                    color: '#fff',
                    borderRadius: 3,
                    padding: '1px 5px',
                  }}
                >
                  {idx + 1}
                </span>
                <span>{opt}</span>
              </div>
              <span style={{ fontSize: 11, color: '#1765CC', fontWeight: 600 }}>Accept</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
        <span>Press <kbd style={{ padding: '1px 4px', border: '1px solid var(--ink-2)', borderRadius: 2 }}>1</kbd>, <kbd style={{ padding: '1px 4px', border: '1px solid var(--ink-2)', borderRadius: 2 }}>2</kbd>, or <kbd style={{ padding: '1px 4px', border: '1px solid var(--ink-2)', borderRadius: 2 }}>3</kbd> to accept</span>
        <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--ink-2)', borderRadius: 2 }}>Esc</kbd> to cancel</span>
      </div>
    </div>
  )
}
