import React, { useState, useEffect, useRef } from 'react'
import { popupMaxHeight } from '../lib/popupViewport'
import type { Finding, Suggestion } from '../domain/finding'
import { noteKey } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { blip } from '../lib/sfx'

export interface InlineReviewPopupProps {
  findings: Finding[]
  position: { x: number; y: number; w?: number }
  editor: Editor | null
  onApplySuggestion: (finding: Finding, suggestion: Suggestion) => void
  onDismissFinding: (findingId: string) => void
  onClose: () => void
  /** Continue: next tab here, else the host jumps the caret to the next underline. */
  onContinue?: () => void
  /** Reprompt the reader for more options on one finding. */
  onReprompt?: (finding: Finding) => void
  /** Finding id currently being reprompted (disables its button). */
  repromptingId?: string | null
  sheet?: boolean
  containerRef?: (node: HTMLDivElement | null) => void
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

export default function InlineReviewPopup({
  findings,
  position,
  editor: _editor,
  onApplySuggestion,
  onDismissFinding,
  onClose,
  onContinue,
  onReprompt,
  repromptingId,
  sheet,
  containerRef,
}: InlineReviewPopupProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [sugSel, setSugSel] = useState<Record<string, number>>({})
  const popupRef = useRef<HTMLDivElement>(null)

  // Bound index safely
  const currentIdx = Math.max(0, Math.min(activeIdx, findings.length - 1))
  const activeFinding = findings[currentIdx]

  const sugCount = activeFinding?.suggestions?.length ?? 0
  const dupNote = !!activeFinding && findings.slice(0, currentIdx).some(o => noteKey(o) === noteKey(activeFinding))
  const sugIdx = activeFinding ? Math.min(sugSel[activeFinding.id] ?? 0, Math.max(0, sugCount - 1)) : 0
  const currentSug = sugCount > 0 ? activeFinding.suggestions[sugIdx] : undefined
  const canReprompt = !!activeFinding && activeFinding.persona === 'reader' && !!onReprompt
  const reprompting = !!activeFinding && repromptingId === activeFinding.id

  // A fresh suggestions array (reprompt prepend) lands on the new options first.
  const sugIdentity = activeFinding?.suggestions
  const prevSugRef = useRef<unknown>(null)
  useEffect(() => {
    if (prevSugRef.current !== sugIdentity) {
      prevSugRef.current = sugIdentity
      if (activeFinding) setSugSel(m => ({ ...m, [activeFinding.id]: 0 }))
    }
  })

  const chooseOption = (i: number) => {
    if (!activeFinding || i < 0 || i >= sugCount) return
    blip('select')
    setSugSel(m => ({ ...m, [activeFinding.id]: i }))
  }

  const stepOption = (dir: 1 | -1) => {
    if (!activeFinding || sugCount <= 1) return
    blip('select')
    const id = activeFinding.id
    setSugSel(m => {
      const cur = Math.min(m[id] ?? 0, sugCount - 1)
      return { ...m, [id]: (cur + dir + sugCount) % sugCount }
    })
  }

  const continueReview = () => {
    // More tabs on this underline: advance here. Otherwise the host jumps
    // the caret to the next underline.
    if (currentIdx < findings.length - 1) {
      blip('select')
      setActiveIdx(prev => prev + 1)
      return
    }
    onContinue?.()
  }

  const repromptActive = () => {
    if (!canReprompt || reprompting || !activeFinding) return
    onReprompt(activeFinding)
  }

  const dismissActive = () => {
    if (!activeFinding) return
    onDismissFinding(activeFinding.id)
    if (findings.length > 1) {
      setActiveIdx(prev => Math.min(prev, findings.length - 2))
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        onClose()
        return
      }

      // Shift+Tab continues to the next comment (next tab, else caret jump).
      if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        continueReview()
        return
      }

      // Tab applies the shown option in-text (same accept sound as click).
      if (e.key === 'Tab' && currentSug && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        onApplySuggestion(activeFinding, currentSug)
        return
      }

      // Backquote family (layout-robust via e.code):
      // ` forward option, alt+` backward option, shift+` dismiss.
      if (e.code === 'Backquote' && !e.ctrlKey && !e.metaKey) {
        if (e.shiftKey && !e.altKey) {
          e.preventDefault()
          dismissActive()
          return
        }
        if (e.altKey && !e.shiftKey) {
          e.preventDefault()
          stepOption(-1)
          return
        }
        if (!e.altKey && !e.shiftKey) {
          e.preventDefault()
          stepOption(1)
          return
        }
      }

      // Alt+0 reprompts the reader for more options on this finding.
      if ((e.code === 'Digit0' || e.key === '0') && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault()
        repromptActive()
        return
      }

      // "|" is a legacy alias for continue.
      if (e.key === '|' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        continueReview()
        return
      }

      // 1–9 chooses option n (select only, never auto-applies).
      if (/^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && sugCount > 0) {
        const i = Number(e.key) - 1
        if (i < sugCount) {
          e.preventDefault()
          chooseOption(i)
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
  }, [findings, activeFinding, currentSug, sugCount, onClose, onApplySuggestion, onDismissFinding, onContinue, onReprompt])

  if (!activeFinding) return null

  const activeMeta = PERSONA_STYLES[activeFinding.persona] || {
    label: activeFinding.persona,
    color: 'var(--blue)',
    border: 'var(--border)',
    bg: 'var(--paper)',
  }
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const shellMaxH = sheet ? undefined : popupMaxHeight(position.y, vh, 400)

  return (
    <div
      ref={node => {
        popupRef.current = node
        containerRef?.(node)
      }}
      data-popup="review"
      role="listbox"
      aria-label="Fixes"
      className="caret-pop fade popup-shell"
      onMouseDown={e => e.preventDefault()}
      style={sheet ? {
        position: 'static',
        width: '100%',
        background: 'var(--paper)',
        border: `1px solid ${activeMeta.color}`,
        borderRadius: 8,
        padding: '4px 6px',
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
        boxSizing: 'border-box',
      } : {
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: position.w ? `${position.w}px` : 'min(320px, calc(100vw - 32px))',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: shellMaxH,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        background: 'var(--paper)',
        border: `1px solid ${activeMeta.color}`,
        borderRadius: 8,
        padding: '4px 6px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
        zIndex: 130,
        boxSizing: 'border-box',
      }}
    >
      {currentSug ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!dupNote ? (
            <div style={{ padding: '1px 4px', color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
              {activeFinding.explanation}
            </div>
          ) : activeFinding.anchor?.quotedText ? (
            <div style={{ padding: '1px 4px', color: 'var(--muted)', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              “{activeFinding.anchor.quotedText}”
            </div>
          ) : null}
          <div
            role="option"
            aria-selected={true}
            onClick={() => onApplySuggestion(activeFinding, currentSug)}
            title="Click or Tab to apply · 1-9 chooses · ` next · alt+` prev"
            style={{
              padding: '1px 4px',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--ink)',
              fontSize: 13,
              overflowWrap: 'anywhere',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--ai) 20%, transparent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            {currentSug.text}
            {sugCount > 1 && (
              <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6, whiteSpace: 'nowrap' }}>
                {sugIdx + 1} of {sugCount}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: '1px 4px', color: 'var(--ink)', fontSize: 13 }}>
          {!dupNote || !activeFinding.anchor?.quotedText
            ? activeFinding.explanation
            : `“${activeFinding.anchor.quotedText}”`}
        </div>
      )}
      <div className="popup-foot" style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 3, padding: '2px 4px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {sugCount > 1 && (
            <button
              type="button"
              onClick={() => stepOption(1)}
              title="Next option"
              style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              Next<kbd style={{ fontFamily: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>`</kbd>
            </button>
          )}
          {sugCount > 1 && (
            <button
              type="button"
              onClick={() => stepOption(-1)}
              title="Previous option"
              style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              Prev<kbd style={{ fontFamily: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+`</kbd>
            </button>
          )}
          {canReprompt && (
            <button
              type="button"
              onClick={repromptActive}
              disabled={reprompting}
              title="Ask the reader for more options"
              style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: reprompting ? 'wait' : 'pointer', opacity: reprompting ? 0.6 : 1 }}
            >
              {reprompting ? 'Redo…' : 'Redo'}<kbd style={{ fontFamily: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+0</kbd>
            </button>
          )}
          <button
            type="button"
            onClick={dismissActive}
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Dismiss<kbd style={{ fontFamily: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>shift+`</kbd>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={continueReview}
            title="Next comment (jumps caret when nothing is left here)"
            style={{ font: 'inherit', color: 'var(--ink)', fontWeight: 600, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Next review<kbd style={{ fontFamily: 'inherit', fontWeight: 400, fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>shift+tab</kbd>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Close<kbd style={{ fontFamily: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>esc</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}
