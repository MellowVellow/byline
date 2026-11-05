import React from 'react'
import { popupMaxHeight } from '../lib/popupViewport'

export type GhostLevel = 'cue' | 'question' | 'fragment' | 'sentence'
export const GHOST_LEVELS: GhostLevel[] = ['cue', 'question', 'fragment', 'sentence']
export const GHOST_LABELS: Record<GhostLevel, string> = {
  cue: 'cue',
  question: 'question',
  fragment: 'fragment',
  sentence: 'sentence',
}
export type SelCol = 'Synonyms' | 'Paraphrase' | 'Tone'
export const SEL_COLS: SelCol[] = ['Synonyms', 'Paraphrase', 'Tone']

export type GhostGroups = Record<GhostLevel, string[]>
export type SelGrid = Record<SelCol, string[]>

export const EMPTY_GHOST: GhostGroups = { cue: [], question: [], fragment: [], sentence: [] }
export const EMPTY_GRID: SelGrid = { Synonyms: [], Paraphrase: [], Tone: [] }

export function ghostOption(groups: GhostGroups, lv: GhostLevel, idx: number): string {
  const a = groups[lv] || []
  return a.length ? a[idx % a.length] : ''
}

export function visibleCells(grid: SelGrid, col: number, page: number): string[] {
  const a = grid[SEL_COLS[col]] || []
  if (!a.length) return []
  return [a[((page % a.length) + a.length) % a.length]]
}

const SEL_LABELS: Record<SelCol, string> = {
  Synonyms: 'synonym',
  Paraphrase: 'paraphrase',
  Tone: 'tone',
}

export interface CaretPopupProps {
  mode: 'ghost' | 'sel'
  position: { x: number; y: number; w?: number }
  maxWidth?: number
  loading?: boolean
  // ghost mode
  ghostGroups?: GhostGroups
  ghostLv?: GhostLevel
  ghostIdx?: number
  onGhostLevel?: (lv: GhostLevel) => void
  // sel mode
  selGrid?: SelGrid
  selCol?: number
  selRow?: number
  selPage?: number
  onSelCell?: (col: number, row: number) => void
  message?: string
  showConnect?: boolean
  onConnect?: () => void
  containerRef?: (node: HTMLDivElement | null) => void
  onAccept: () => void
  onNext?: () => void
  onPrev?: () => void
  onReroll: () => void
  onDismiss: () => void
  onReference?: () => void
  sheet?: boolean
}

export default function CaretPopup({
  mode,
  position,
  maxWidth,
  loading,
  ghostGroups = EMPTY_GHOST,
  ghostLv = 'fragment',
  ghostIdx = 0,
  onGhostLevel,
  selGrid = EMPTY_GRID,
  selCol = 1,
  selRow = 0,
  selPage = 0,
  onSelCell,
  message,
  showConnect,
  onConnect,
  containerRef,
  onAccept,
  onNext,
  onPrev,
  onReroll,
  onDismiss,
  onReference,
  sheet,
}: CaretPopupProps) {
  const hasGhost = GHOST_LEVELS.some(l => (ghostGroups[l] || []).length > 0)
  const hasSel = SEL_COLS.some(c => (selGrid[c] || []).length > 0)
  const showEmpty = mode === 'sel' && !hasSel && !!message
  if (!loading && ((mode === 'ghost' && !hasGhost) || (mode === 'sel' && !hasSel && !message))) return null

  const q = mode === 'ghost' && ghostLv === 'question'
  const qText = q ? ghostOption(ghostGroups, 'question', ghostIdx) : ''
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const shellMaxH = sheet ? undefined : popupMaxHeight(position.y, vh, 420)

  return (
    <div
      ref={containerRef}
      data-popup={mode === 'ghost' ? 'ghost' : 'selection'}
      role="listbox"
      aria-label="Suggestions"
      className="caret-pop fade popup-shell"
      onMouseDown={e => e.preventDefault()}
      style={sheet ? {
        position: 'static',
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box',
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 6px',
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
      } : {
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 150,
        minWidth: Math.min(170, maxWidth ?? 170),
        maxWidth: Math.min(maxWidth ?? 320, 320),
        maxHeight: shellMaxH,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 6px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
        boxSizing: 'border-box',
      }}
    >
      {loading && !hasGhost && !hasSel ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px', fontSize: 12, color: 'var(--muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ai)', display: 'inline-block', animation: 'sugg-pulse 1.1s ease-in-out infinite' }} />
          Thinking…
        </div>
      ) : mode === 'ghost' ? (
        <>
          <div style={{ display: 'flex', gap: 2 }}>
            {GHOST_LEVELS.map((l, i) => (
              <div
                key={l}
                role="option"
                aria-selected={i === GHOST_LEVELS.indexOf(ghostLv)}
                onClick={() => onGhostLevel?.(l)}
                title={`Press ${i + 1}`}
                style={{
                  color: l === ghostLv ? 'var(--ink)' : 'var(--muted)',
                  background: l === ghostLv ? 'color-mix(in srgb, var(--ai) 16%, transparent)' : 'transparent',
                  padding: '0 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  gap: 4,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)' }}>{i + 1}</span>
                {GHOST_LABELS[l]}
              </div>
            ))}
          </div>
          {q && qText && (
            <div style={{ color: 'var(--ink)', fontStyle: 'italic', padding: '2px 6px' }}>{qText}</div>
          )}
        </>
      ) : showEmpty ? (
        <div style={{ padding: '6px 6px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          <div>{message}</div>
          {showConnect && onConnect ? (
            <button
              type="button"
              onClick={onConnect}
              title="Expand Connect panel for this 2+ sentence selection (Ctrl/Cmd+Shift+/)"
              style={{ font: 'inherit', color: 'var(--ink)', fontWeight: 600, background: 'none', border: 0, padding: '6px 0 0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Connect<kbd style={{ font: 'inherit', fontSize: 11, fontWeight: 400, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>ctrl+shift+/</kbd>
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '100%' }}>
          {SEL_COLS.map((c, ci) => {
            const cell = visibleCells(selGrid, ci, selPage)[0]
            if (cell == null) return null
            const active = ci === selCol
            return (
              <div
                key={c}
                role="option"
                aria-selected={active}
                onClick={() => onSelCell?.(ci, 0)}
                title={`${SEL_LABELS[c]}: ${cell}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'baseline',
                  padding: '3px 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  minWidth: 0,
                  background: active ? 'color-mix(in srgb, var(--ai) 20%, transparent)' : 'transparent',
                }}
              >
                <kbd style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: 'var(--ai)', border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', flexShrink: 0 }}>{ci + 1}</kbd>
                <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, minWidth: 62 }}>{SEL_LABELS[c]}</span>
                <span style={{ overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}>{cell}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="popup-foot" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4, padding: '2px 4px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>
        <span style={{ fontSize: 0, lineHeight: 0 }}>Reroll</span>
        <button
          type="button"
          onClick={onAccept}
          style={{ font: 'inherit', color: 'var(--ink)', fontWeight: 600, background: 'none', border: 0, padding: 0, cursor: q ? 'default' : 'pointer', opacity: q ? 0.4 : 1 }}
        >
          Accept<kbd style={{ font: 'inherit', fontWeight: 400, fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>tab</kbd>
        </button>
        {onNext && (
          <button
            type="button"
            onClick={onReroll}
            title="Reprompt: fetch fresh options"
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Reprompt<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>&#96;</kbd>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Reroll</span>
          </button>
        )}
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            title={mode === 'sel' ? 'Previous page' : 'Previous option'}
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Prev<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+`</kbd>
          </button>
        )}
        {mode === 'sel' && showConnect && onConnect ? (
          <button
            type="button"
            onClick={onConnect}
            title="Expand Connect panel for this 2+ sentence selection (Ctrl/Cmd+Shift+/)"
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Connect<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>ctrl+shift+/</kbd>
          </button>
        ) : null}
        {onReference && (
          <button
            type="button"
            onClick={onReference}
            title="Open reference popup (cite from library)"
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Reference<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+r</kbd>
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', ...(onReference ? null : { marginLeft: 'auto' }) }}
        >
          Dismiss<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>shift+`</kbd>
        </button>
      </div>
    </div>
  )
}
