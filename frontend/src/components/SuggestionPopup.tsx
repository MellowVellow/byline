import React, { useEffect } from 'react'

export interface SuggestionPopupProps {
  suggestions: string[]
  assistLevel: string
  position: { x: number; y: number }
  onSelect: (index: number) => void
  onReroll: () => void
  onDismiss: () => void
}

export default function SuggestionPopup({
  suggestions,
  assistLevel,
  position,
  onSelect,
  onReroll,
  onDismiss,
}: SuggestionPopupProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
        return
      }

      if (['1', '2', '3'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const idx = Number(e.key) - 1
        if (suggestions[idx]) {
          e.preventDefault()
          onSelect(idx)
          return
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        if (suggestions[0]) {
          onSelect(0)
          return
        }
      }

      if (e.altKey && (e.key === 'Alt' || e.key === 'r')) {
        e.preventDefault()
        onReroll()
        return
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [suggestions, onSelect, onReroll, onDismiss])

  if (suggestions.length === 0) return null

  return (
    <div
      className="sugg-popup fade"
      style={{
        position: 'fixed',
        top: Math.min(position.y, window.innerHeight - 280),
        left: Math.max(16, Math.min(position.x, window.innerWidth - 456)),
        width: 'min(420px, calc(100vw - 32px))',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-pop)',
        padding: '10px 12px',
        zIndex: 140,
        display: 'grid',
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="kind-label" style={{ color: 'var(--ai)' }}>
            {assistLevel} Suggestions
          </span>
          <span className="meta" style={{ fontSize: 11 }}>
            ({suggestions.length} options)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={onReroll}
            title="Reroll (Alt)"
            style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0, minHeight: 'auto', fontSize: 11 }}
          >
            ↻ Reroll (Alt)
          </button>
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss (Esc)"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, minHeight: 'auto', fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gap: 4 }}>
        {suggestions.map((sug, idx) => (
          <div
            key={idx}
            className="sugg-row"
            onClick={() => onSelect(idx)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
              <span className="num" style={{ color: 'var(--ai)', fontWeight: 700 }}>
                {idx + 1}
              </span>
              <span className="quote-serif" style={{ fontSize: 13.5 }}>{sug}</span>
            </div>
            <span className="meta" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 11 }}>
              Insert
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
        <span>Press <span className="kbd">1–3</span> or <span className="kbd">Tab</span> to insert</span>
        <span><span className="kbd">Esc</span> to dismiss</span>
      </div>
    </div>
  )
}
