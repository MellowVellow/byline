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
  const shellMaxH = popupMaxHeight(p.position.y, vh, 520)
  return (
    <div
      ref={p.containerRef}
      data-popup="cite"
      role="listbox"
      aria-label="Cite from library"
      className="caret-pop fade popup-shell"
      onMouseDown={e => { if (!(e.target as HTMLElement).closest('input')) e.preventDefault() }}
      style={{
        position: 'fixed', top: p.position.y, left: p.position.x, zIndex: 170,
        width: Math.min(p.position.w ?? 340, 360), maxWidth: 'calc(100vw - 16px)',
        maxHeight: shellMaxH, overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box',
        background: 'var(--paper)', border: '1px solid var(--btn-bg, var(--ai))',
        borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 1.45,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
      }}
    >
      {p.stage === 'filter' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Reference · filter cards</div>
          <input
            autoFocus
            value={p.query}
            onChange={e => p.onQuery(e.target.value)}
            placeholder="Filter by words or type…"
            style={{ width: '100%', margin: '6px 0', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
            {p.items.map(({ c, n, top }, i) => {
              const textStyle: React.CSSProperties =
                top || n >= 3
                  ? { textDecoration: 'underline solid var(--blue) 2px', textUnderlineOffset: '3px' }
                  : n === 2 || n === 1
                    ? { textDecoration: 'underline dotted var(--blue) 1.5px', textUnderlineOffset: '3px' }
                    : {}
              return (
                <div
                  key={c.id}
                  role="option"
                  aria-selected={i === p.filterSel}
                  onClick={() => p.onPickCard(c)}
                  style={{
                    padding: '5px 7px', borderRadius: 6, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center',
                    background: i === p.filterSel ? 'color-mix(in srgb, var(--ai) 16%, transparent)' : 'transparent',
                    border: top ? '1px solid var(--blue)' : '1px solid transparent',
                  }}
                >
                  <span style={{ flex: 1, ...textStyle }}>{c.finding.length > 70 ? c.finding.slice(0, 68) + '…' : c.finding}</span>
                  <span style={{ letterSpacing: 2, fontSize: 11, color: 'var(--btn-bg, var(--ai))' }}>{dots(n)}</span>
                </div>
              )
            })}
            {p.items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No cards match.</div>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>↑↓ · Enter use card · Esc close</div>
        </>
      )}
      {p.stage === 'levels' && p.card && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
            Full sentence · {(p.card.finding || '').slice(0, 42)}
          </div>
          <div
            role="option"
            aria-selected
            onClick={p.onAccept}
            style={{ padding: '5px 7px', borderRadius: 6, cursor: 'pointer', background: 'color-mix(in srgb, var(--ai) 16%, transparent)' }}
          >
            <span style={{ fontFamily: 'Georgia, serif' }}>{p.sentence}</span>
          </div>
          {p.hasCitation ? (
            <>
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {CITE_TYPES.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => p.onTypeSelect(t)}
                    title={`Select ${CITE_SHORT[t]} (${i + 1})`}
                    style={{
                      minHeight: 'auto', padding: '2px 8px', fontSize: 11, fontWeight: p.activeType === t ? 700 : 400,
                      background: p.activeType === t ? 'var(--ink)' : 'var(--paper)',
                      color: p.activeType === t ? 'var(--bg)' : 'var(--ink)',
                    }}
                  >
                    {i + 1} · {CITE_SHORT[t]}
                  </button>
                ))}
                <button
                  type="button"
                  title="Reroll: next citation type"
                  onClick={p.onRerollType}
                  style={{ minHeight: 'auto', padding: '2px 8px', fontSize: 11 }}
                >
                  ↻
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <kbd>1</kbd>–<kbd>5</kbd> type · <kbd>Alt</kbd> reroll · <kbd>Tab</kbd> accept · <kbd>Backspace</kbd> back
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              AI note — no citation · <kbd>Tab</kbd> accept · <kbd>Backspace</kbd> back
            </div>
          )}
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button type="button" onClick={p.stage === 'filter' ? p.onClose : p.onBack} style={{ minHeight: 'auto', fontSize: 12 }}>
          {p.stage === 'filter' ? '✕ Close' : '← Back'}
        </button>
      </div>
    </div>
  )
}
