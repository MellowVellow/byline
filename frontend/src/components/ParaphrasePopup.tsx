import React, { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { api } from '../lib/api'
import { blip, sfxAccept } from '../lib/sfx'

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
  position: { x: number; y: number }
  onClose: () => void
}

export type ParaphraseMode = 'paraphrase' | 'shorten' | 'tone'

export default function ParaphrasePopup({
  editor,
  selectionContext,
  documentGoal,
  theme,
  position,
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
        if (selectedMode === 'shorten') {
          setOptions([
            sel.split(' ').slice(0, Math.max(1, Math.floor(sel.split(' ').length / 2))).join(' ') || sel,
            'concise phrasing',
            'direct summary',
          ])
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

    const { from, to, selectedText } = selectionContext
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
      className="sugg-popup fade"
      style={{
        position: 'absolute',
        top: position.y,
        left: Math.max(16, Math.min(position.x, window.innerWidth - 400)),
        width: 'min(380px, calc(100vw - 32px))',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-pop)',
        padding: '10px 12px',
        zIndex: 150,
        display: 'grid',
        gap: 8,
      }}
    >
      {/* Header and Modes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="kind-label" style={{ color: 'var(--lt)' }}>
            Alternatives
          </span>
          <span className="meta" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            “{selectionContext.selectedText}”
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, minHeight: 'auto', fontSize: 13 }}
        >
          ✕
        </button>
      </div>

      {/* Mode Buttons */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button
          type="button"
          className={mode === 'paraphrase' ? 'primary' : ''}
          onClick={() => runParaphrase('paraphrase')}
          style={{ padding: '2px 8px', fontSize: 11.5, minHeight: 26 }}
        >
          Paraphrase
        </button>
        <button
          type="button"
          className={mode === 'shorten' ? 'primary' : ''}
          onClick={() => runParaphrase('shorten')}
          style={{ padding: '2px 8px', fontSize: 11.5, minHeight: 26 }}
        >
          Shorten
        </button>
        <button
          type="button"
          className={mode === 'tone' ? 'primary' : ''}
          onClick={() => runParaphrase('tone')}
          style={{ padding: '2px 8px', fontSize: 11.5, minHeight: 26 }}
        >
          {theme}
        </button>
      </div>

      {/* Alternatives list */}
      {loading ? (
        <div className="meta" style={{ padding: '8px 0', textAlign: 'center' }}>
          Generating alternatives via Meta reasoning model…
        </div>
      ) : errorMsg ? (
        <div style={{ fontSize: 12, color: 'var(--lt)' }}>{errorMsg}</div>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="sugg-row"
              onClick={() => handleApplyOption(opt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--paper)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink)' }}>
                <span className="num" style={{ color: 'var(--lt)', fontWeight: 700 }}>
                  {idx + 1}
                </span>
                <span className="quote-serif" style={{ fontSize: 13.5 }}>{opt}</span>
              </div>
              <span className="meta" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 11 }}>
                Accept
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
        <span>Press <span className="kbd">1</span>, <span className="kbd">2</span>, or <span className="kbd">3</span></span>
        <span><span className="kbd">Esc</span> to dismiss</span>
      </div>
    </div>
  )
}
