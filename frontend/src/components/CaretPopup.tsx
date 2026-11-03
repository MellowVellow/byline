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
  position: { x: number; y: number }
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
  // shared
  onAccept: () => void
  onReroll: () => void
  onRerollPrev?: () => void
  onDismiss: () => void
}

/** Minimal compact caret popup — ported from caret-popup-feel-test.html.
 * Dumb component: state + keys live in the parent (single key handler).
 */
export default function CaretPopup({
  mode,
  position,
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
  onAccept,
  onReroll,
  onRerollPrev,
  onDismiss,
}: CaretPopupProps) {
  const hasGhost = GHOST_LEVELS.some(l => (ghostGroups[l] || []).length > 0)
  const hasSel = SEL_COLS.some(c => (selGrid[c] || []).length > 0)
  if (!loading && ((mode === 'ghost' && !hasGhost) || (mode === 'sel' && !hasSel))) return null

  const q = mode === 'ghost' && ghostLv === 'question'
  const qText = q ? ghostOption(ghostGroups, 'question', ghostIdx) : ''

  return (
    <div
      role="listbox"
      aria-label="Suggestions"
      className="caret-pop fade"
      onMouseDown={e => e.preventDefault()}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 150,
        minWidth: 170,
        maxWidth: 440,
        background: 'var(--paper)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '6px 8px',
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(110px,1fr))', gap: '2px 12px' }}>
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
      <div style={{ display: 'flex', gap: 14, marginTop: 6, padding: '3px 6px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13 }}>
        <button
          type="button"
          onClick={onAccept}
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: q ? 'default' : 'pointer', opacity: q ? 0.4 : 1 }}
        >
          Accept<kbd style={{ font: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>tab</kbd>
        </button>
        <button
          type="button"
          onClick={onRerollPrev ?? onReroll}
          title="Previous alternative (Ctrl+[)"
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
        >
          ←<kbd style={{ font: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>ctrl+[</kbd>
        </button>
        <button
          type="button"
          onClick={onReroll}
          title="Next alternative (Ctrl+])"
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
        >
          Reroll<kbd style={{ font: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>ctrl+]</kbd>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title="Alt to dismiss"
          style={{ font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Dismiss<kbd style={{ font: 'inherit', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 5px', marginLeft: 4 }}>alt</kbd>
        </button>
      </div>
    </div>
  )
}
