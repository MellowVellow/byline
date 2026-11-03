import React, { useState, useEffect, useRef } from 'react'
import type { Finding, Suggestion } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { blip } from '../lib/sfx'

export interface InlineReviewPopupProps {
  findings: Finding[]
  position: { x: number; y: number; w?: number }
  editor: Editor | null
  onApplySuggestion: (finding: Finding, suggestion: Suggestion) => void
  onDismissFinding: (findingId: string) => void
  onClose: () => void
}

// Review personas: purple Reader observations, red Harper grammar fixes.
// Color indicates type; no emoji dots.
export const PERSONA_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  reader: {
    label: 'Reader',
    color: 'var(--ai)',
    border: 'color-mix(in srgb, var(--ai) 45%, transparent)',
    bg: 'color-mix(in srgb, var(--ai) 10%, var(--paper))',
  },
  grammar: {
    label: 'Grammar',
    color: 'var(--lt)',
    border: 'color-mix(in srgb, var(--lt) 45%, transparent)',
    bg: 'color-mix(in srgb, var(--lt) 10%, var(--paper))',
  },
}

/**
 * Inline Review Popup below the cursor in Edit Mode.
 * Shows suggestions for fixes, or the comment from the specific color/persona.
 * If multiple colors on the same text, renders them side by side with Next-| navigation.
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

      // "|" advances to the next comment in the same sentence/area.
      if (e.key === '|' && findings.length > 1) {
        e.preventDefault()
        blip('select')
        setActiveIdx(prev => (prev + 1) % findings.length)
        return
      }

      // 1–9 accepts fix n (feel-test keys)
      if (/^[1-9]$/.test(e.key) && activeFinding.suggestions && activeFinding.suggestions.length > 0) {
        const i = Number(e.key) - 1
        const sug = activeFinding.suggestions?.[i]
        if (sug) {
          e.preventDefault()
          onApplySuggestion(activeFinding, sug)
        }
        return
      }

      // Delete marks the finding dismissed (stays listed like a stale anchor).
      // Esc only closes the popup; Backspace stays available for editing.
      if (e.key === 'Delete') {
        e.preventDefault()
        onDismissFinding(activeFinding.id)
        if (findings.length > 1) {
          setActiveIdx(prev => Math.min(prev, findings.length - 2))
        } else {
          onClose()
        }
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
  }, [findings, activeFinding, onClose, onApplySuggestion, onDismissFinding])

  if (!activeFinding) return null

  const activeMeta = PERSONA_STYLES[activeFinding.persona] || {
    label: activeFinding.persona,
    color: 'var(--blue)',
    border: 'var(--border)',
    bg: 'var(--paper)',
  }

  const hasSuggestions = activeFinding.suggestions && activeFinding.suggestions.length > 0

  return (
    <div
      ref={popupRef}
      role="listbox"
      aria-label="Fixes"
      className="caret-pop fade"
      onMouseDown={e => e.preventDefault()}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: position.w ? `${position.w}px` : 'min(320px, calc(100vw - 32px))',
        background: 'var(--paper)',
        border: `1px solid ${activeMeta.color}`,
        borderRadius: 8,
        padding: '6px 8px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
        zIndex: 130,
        boxSizing: 'border-box',
      }}
    >
      {hasSuggestions ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activeFinding.suggestions?.map((sug, i) => (
            <div
              key={sug.id || i}
              role="option"
              aria-selected={false}
              onClick={() => onApplySuggestion(activeFinding, sug)}
              style={{
                padding: '0 6px',
                borderRadius: 4,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--muted)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--ai) 20%, transparent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              {sug.text}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '2px 6px', color: 'var(--ink)', fontSize: 13 }}>
          {activeFinding.explanation}
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 6, padding: '3px 6px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13 }}>
        {findings.length > 1 && <span>Next<kbd style={{ fontFamily: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>|</kbd></span>}
        <span>Dismiss<kbd style={{ fontFamily: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>del</kbd></span>
        <span>Close<kbd style={{ fontFamily: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>esc</kbd></span>
      </div>
    </div>
  )
}
