import React from 'react'

export type GhostLevel = 'cue' | 'question' | 'fragment' | 'sentence'
export const GHOST_LEVELS: GhostLevel[] = ['cue', 'question', 'fragment', 'sentence']
/** Display labels for ghost levels, shared by the popup tabs and the top-bar
 *  Completion Level picker so both read cue/question/fragment/sentence. */
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

/** Option at (level, index) with wraparound. */
export function ghostOption(groups: GhostGroups, lv: GhostLevel, idx: number): string {
  const a = groups[lv] || []
  return a.length ? a[idx % a.length] : ''
}

/** 3 visible cells of a column with wraparound paging. */
export function visibleCells(grid: SelGrid, col: number, page: number): string[] {
  const a = grid[SEL_COLS[col]] || []
  if (!a.length) return []
  const o = (page * 3) % a.length
  return [0, 1, 2].filter(n => n < a.length).map(n => a[(o + n) % a.length])
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
  /** Next option (`). */
  onNext?: () => void
  /** Previous option (alt+`). */
  onPrev?: () => void
  /** Redo: fresh fetch (alt+0). */
  onReroll: () => void
  onDismiss: () => void
  /** Render as static full-width sheet (mobile bottom area) instead of fixed popup. */
  sheet?: boolean
}

/** Minimal compact caret popup — ported from caret-popup-feel-test.html.
 * Dumb component: state + keys live in the parent (single key handler).
 */
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
  sheet,
}: CaretPopupProps) {
  const hasGhost = GHOST_LEVELS.some(l => (ghostGroups[l] || []).length > 0)
  const hasSel = SEL_COLS.some(c => (selGrid[c] || []).length > 0)
  const showEmpty = mode === 'sel' && !hasSel && !!message
  if (!loading && ((mode === 'ghost' && !hasGhost) || (mode === 'sel' && !hasSel && !message))) return null

  const q = mode === 'ghost' && ghostLv === 'question'
  const qText = q ? ghostOption(ghostGroups, 'question', ghostIdx) : ''

  return (
    <div
      ref={containerRef}
      data-popup={mode === 'ghost' ? 'ghost' : 'selection'}
      role="listbox"
      aria-label="Suggestions"
      className="caret-pop fade"
      onMouseDown={e => e.preventDefault()}
      style={sheet ? {
        position: 'static',
        width: '100%',
        maxWidth: 'none',
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
        maxWidth: maxWidth ?? 440,
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 6px',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        fontFamily: '"Source Serif 4", Georgia, serif',
        color: 'var(--ink)',
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
          {message}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '2px 12px' }}>
          {SEL_COLS.map((c, ci) => (
            <div key={c} style={{ minWidth: 0 }}>
              <h4 style={{ margin: '0 0 2px', fontWeight: 400, fontSize: 12, color: 'var(--muted)' }}>{c}</h4>
              {visibleCells(selGrid, ci, selPage).map((o, ri) => (
                <div
                  key={ri}
                  role="option"
                  aria-selected={ci === selCol && ri === selRow}
                  onClick={() => onSelCell?.(ci, ri)}
                  title={o}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'baseline',
                    padding: '1px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: ci === selCol && ri === selRow ? 'color-mix(in srgb, var(--ai) 20%, transparent)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', flexShrink: 0 }}>{ci * 3 + ri + 1}</span>
                  <span style={{ overflowWrap: 'anywhere' }}>{o}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4, padding: '2px 4px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>
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
            onClick={onNext}
            title="Next option"
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Next<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>`</kbd>
          </button>
        )}
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            title="Previous option"
            style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
          >
            Prev<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+`</kbd>
          </button>
        )}
        <button
          type="button"
          onClick={onReroll}
          title="Redo: fetch fresh options"
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
        >
          Redo<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>alt+0</kbd>
        </button>
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
        <button
          type="button"
          onClick={onDismiss}
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Dismiss<kbd style={{ font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }}>shift+`</kbd>
        </button>
      </div>
    </div>
  )
}
