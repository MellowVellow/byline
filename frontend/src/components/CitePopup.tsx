import React from 'react'
import { popupMaxHeight } from '../lib/popupViewport'
import type { CiteType, LibraryCard } from '../domain/library'
import { CITE_SHORT, CITE_TYPES, dots } from '../domain/library'

export type CiteStage = 'filter' | 'levels'

export interface CiteItem {
  c: LibraryCard
  n: number
  top: boolean
}

interface Props {
  position: { x: number; y: number; w?: number }
  stage: CiteStage
  query: string
  onQuery: (q: string) => void
  items: CiteItem[]
  filterSel: number
  onFilterSel: (i: number) => void
  onPickCard: (c: LibraryCard) => void
  card: LibraryCard | null
  // Single-view citation: one sentence for the active type, reroll cycles types.
  sentence: string
  activeType: CiteType
  onTypeSelect: (t: CiteType) => void
  onRerollType: () => void
  hasCitation: boolean
  onAccept: () => void
  onBack: () => void
  onClose: () => void
  containerRef?: (node: HTMLDivElement | null) => void
}

export default function CitePopup(p: Props) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const shellMaxH = popupMaxHeight(p.position.y, vh, 420)
  const kbd: React.CSSProperties = { font: 'inherit', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', marginLeft: 3 }
  const footBtn: React.CSSProperties = { font: 'inherit', color: 'inherit', background: 'none', border: 0, padding: 0, cursor: 'pointer' }
  return (
    <div
      ref={p.containerRef}
      data-popup="cite"
      role="listbox"
      aria-label="Cite from library"
      className="caret-pop fade popup-shell"
      onMouseDown={e => { if (!(e.target as HTMLElement).closest('input')) e.preventDefault() }}
      style={{
        position: 'fixed', top: p.position.y, left: p.position.x, zIndex: 150,
        minWidth: Math.min(170, p.position.w ?? 170),
        maxWidth: Math.min(p.position.w ?? 320, 320),
        maxHeight: shellMaxH, overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box',
        background: 'var(--paper)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '4px 6px', fontSize: 13, lineHeight: 1.5,
        fontFamily: '"Source Serif 4", Georgia, serif', color: 'var(--ink)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
      }}
    >
      {p.stage === 'filter' && (
        <>
          <div style={{ color: 'var(--muted)', padding: '0 6px', fontSize: 13, display: 'flex', gap: 4, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)' }}>R</span>
            reference
          </div>
          <input
            autoFocus
            value={p.query}
            onChange={e => p.onQuery(e.target.value)}
            placeholder="Filter by words or type…"
            style={{
              width: '100%', margin: '6px 0', boxSizing: 'border-box',
              font: 'inherit', fontSize: 13, padding: '3px 6px',
              borderRadius: 4, border: '1px solid var(--border)',
              background: 'var(--paper)', color: 'var(--ink)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 220, overflowY: 'auto', maxWidth: '100%' }}>
            {p.items.map(({ c, n }, i) => {
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={i === p.filterSel}
                  onClick={() => p.onPickCard(c)}
                  title={c.finding}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'baseline',
                    padding: '3px 6px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    minWidth: 0,
                    background: i === p.filterSel ? 'color-mix(in srgb, var(--ai) 20%, transparent)' : 'transparent',
                  }}
                >
                  <span style={{ overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}>{c.finding.length > 70 ? c.finding.slice(0, 68) + '…' : c.finding}</span>
                  <span style={{ letterSpacing: 2, fontSize: 11, color: 'var(--ai)', flexShrink: 0 }}>{dots(n)}</span>
                </div>
              )
            })}
            {p.items.length === 0 && <div style={{ padding: '2px 6px', fontSize: 13, color: 'var(--muted)' }}>No cards match.</div>}
          </div>
        </>
      )}
      {p.stage === 'levels' && p.card && (
        <>
          <div
            role="option"
            aria-selected
            onClick={p.onAccept}
            title="Click to accept"
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
              padding: '3px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              minWidth: 0,
              background: 'color-mix(in srgb, var(--ai) 20%, transparent)',
            }}
          >
            <span style={{ overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}>{p.sentence}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap' }}>
            {CITE_TYPES.map((t, i) => (
              <div
                key={t}
                role="option"
                aria-selected={p.activeType === t}
                onClick={() => p.onTypeSelect(t)}
                title={`Press ${i + 1}`}
                style={{
                  color: p.activeType === t ? 'var(--ink)' : 'var(--muted)',
                  background: p.activeType === t ? 'color-mix(in srgb, var(--ai) 16%, transparent)' : 'transparent',
                  padding: '0 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  gap: 4,
                  alignItems: 'baseline',
                }}
              >
                {CITE_SHORT[t]}
              </div>
            ))}
          </div>
          {!p.hasCitation && (
            <div style={{ padding: '2px 6px', fontSize: 13, color: 'var(--muted)' }}>AI note — no citation</div>
          )}
        </>
      )}
      <div className="popup-foot" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4, padding: '2px 4px 0', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12 }}>
        {p.stage === 'filter' ? (
          <>
            <button
              type="button"
              onClick={() => { const hit = p.items[p.filterSel]; if (hit) p.onPickCard(hit.c) }}
              disabled={p.items.length === 0}
              title="Use selected card"
              style={{ ...footBtn, color: 'var(--ink)', fontWeight: 600, opacity: p.items.length === 0 ? 0.4 : 1 }}
            >
              Use<kbd style={kbd}>enter</kbd>
            </button>
            <button
              type="button"
              onClick={p.onClose}
              title="Close"
              style={{ ...footBtn, marginLeft: 'auto' }}
            >
              Close<kbd style={kbd}>esc</kbd>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={p.onAccept}
              title="Accept citation"
              style={{ ...footBtn, color: 'var(--ink)', fontWeight: 600 }}
            >
              Accept<kbd style={kbd}>tab</kbd>
            </button>
            <button
              type="button"
              onClick={p.onRerollType}
              title="Redo: next citation type"
              style={footBtn}
            >
              Redo<kbd style={kbd}>alt+0</kbd>
            </button>
            <button
              type="button"
              onClick={p.onBack}
              title="Back to filter"
              style={footBtn}
            >
              Back<kbd style={kbd}>backspace</kbd>
            </button>
            <button
              type="button"
              onClick={p.onClose}
              title="Close"
              style={{ ...footBtn, marginLeft: 'auto' }}
            >
              Close<kbd style={kbd}>esc</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
