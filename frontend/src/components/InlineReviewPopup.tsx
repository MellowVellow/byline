import React, { useState, useEffect, useRef } from 'react'
import type { Finding, Suggestion } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { blip } from '../lib/sfx'

export interface InlineReviewPopupProps {
  findings: Finding[]
  position: { x: number; y: number }
  editor: Editor | null
  onApplySuggestion: (finding: Finding, suggestion: Suggestion) => void
  onDismissFinding: (findingId: string) => void
  onClose: () => void
}

export const PERSONA_STYLES: Record<string, { label: string; color: string; border: string; bg: string; dot: string }> = {
  grammar: { label: 'Grammar', color: '#C0281F', border: '#F87171', bg: '#FEF2F2', dot: '🔴' },
  reader: { label: 'Reader', color: '#6D3BE0', border: '#C084FC', bg: '#FAF5FF', dot: '🟣' },
  supervisor: { label: 'Supervisor', color: '#8A5F00', border: '#FBBF24', bg: '#FEFCE8', dot: '🟡' },
  researcher: { label: 'Researcher', color: '#1765CC', border: '#60A5FA', bg: '#EFF6FF', dot: '🔵' },
}

/**
 * Inline Review Popup below the cursor in Edit Mode.
 * Shows suggestions for fixes, or the comment from the specific color/persona.
 * If multiple colors on the same text, renders them side by side with Next-Tab navigation.
 */
export default function InlineReviewPopup({
  findings,
  position,
  editor: _editor,
  onApplySuggestion,
  onDismissFinding,
  onClose,
}: InlineReviewPopupProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const popupRef = useRef<HTMLDivElement>(null)

  // Bound index safely
  const currentIdx = Math.max(0, Math.min(activeIdx, findings.length - 1))
  const activeFinding = findings[currentIdx]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && findings.length > 1) {
        e.preventDefault()
        blip('select')
        setActiveIdx(prev => (prev + 1) % findings.length)
        return
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [findings.length, onClose])

  if (!activeFinding) return null

  const activeMeta = PERSONA_STYLES[activeFinding.persona] || {
    label: activeFinding.persona,
    color: '#1765CC',
    border: 'var(--border)',
    bg: 'var(--paper)',
    dot: '●',
  }

  const hasSuggestions = activeFinding.suggestions && activeFinding.suggestions.length > 0

  return (
    <div
      ref={popupRef}
      className="fade"
      style={{
        position: 'absolute',
        top: position.y,
        left: Math.max(16, Math.min(position.x, window.innerWidth - 440)),
        width: 'min(420px, calc(100vw - 32px))',
        background: 'var(--paper, #fff)',
        border: `1px solid ${activeMeta.border}`,
        borderRadius: 'var(--radius-lg, 8px)',
        boxShadow: '0 14px 34px -4px rgba(0,0,0,0.28), 0 6px 14px -4px rgba(0,0,0,0.15)',
        zIndex: 130,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 14px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header with Persona Tag or Side-by-Side Tabs for Multiple Colors */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        {findings.length > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', minWidth: 0 }}>
            {findings.map((f, i) => {
              const meta = PERSONA_STYLES[f.persona] || PERSONA_STYLES.grammar
              const isSelected = i === currentIdx
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setActiveIdx(i); blip('select') }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: 9999,
                    border: `1px solid ${isSelected ? meta.color : 'var(--border)'}`,
                    background: isSelected ? meta.bg : 'transparent',
                    color: isSelected ? meta.color : 'var(--ink)',
                    cursor: 'pointer',
                    minHeight: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{meta.dot}</span>
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: activeMeta.bg,
                color: activeMeta.color,
                border: `1px solid ${activeMeta.border}`,
              }}
            >
              {activeMeta.dot} {activeMeta.label}
            </span>
            <span className="meta" style={{ fontSize: 11 }}>
              {activeFinding.kind}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {findings.length > 1 && (
            <button
              type="button"
              onClick={() => { setActiveIdx((currentIdx + 1) % findings.length); blip('select') }}
              title="Next color / finding (Tab)"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue, #2563EB)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 4px',
                minHeight: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              Next tab ›
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 13,
              padding: '1px 4px',
              minHeight: 'auto',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Quoted text excerpt */}
      <div
        style={{
          fontSize: 12,
          fontStyle: 'italic',
          color: 'var(--ink)',
          background: 'var(--dock, #f8f9fa)',
          padding: '6px 10px',
          borderRadius: 4,
          borderLeft: `3px solid ${activeMeta.color}`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        “{activeFinding.anchor.quotedText}”
      </div>

      {/* 3. Main Body: Fix Suggestions OR Persona Comment */}
      {hasSuggestions ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
            Suggested Fixes ({activeFinding.suggestions?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {activeFinding.suggestions?.map((sug, i) => (
              <div
                key={sug.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 8px',
                  background: 'var(--bg, #f4f4f5)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {sug.text}
                  </div>
                  {sug.rationale && (
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                      {sug.rationale}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onApplySuggestion(activeFinding, sug)}
                  style={{
                    padding: '3px 10px',
                    background: activeMeta.color,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: 'auto',
                    flexShrink: 0,
                  }}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: activeMeta.color }}>
            {activeMeta.label} Comment
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)', padding: '2px 0' }}>
            {activeFinding.explanation}
          </div>
        </div>
      )}

      {/* 4. Bottom action strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => {
            onDismissFinding(activeFinding.id)
            if (findings.length > 1) {
              setActiveIdx(prev => Math.min(prev, findings.length - 2))
            } else {
              onClose()
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: 11,
            padding: 0,
            minHeight: 'auto',
          }}
        >
          Dismiss
        </button>

        {findings.length > 1 && (
          <span className="meta" style={{ fontSize: 10.5 }}>
            {currentIdx + 1} of {findings.length} findings on this text
          </span>
        )}
      </div>
    </div>
  )
}
