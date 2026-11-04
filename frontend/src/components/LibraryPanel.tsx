import React, { useMemo, useRef, useState } from 'react'
import type { CiteType, LibraryCard, LibrarySource } from '../domain/library'
import { CITE_LABELS, CITE_TYPES, authorShort, dots, relevanceScore, sourceYear } from '../domain/library'
import { blip } from '../lib/sfx'

export interface ClaimHit {
  sentence: string
  cardId: string
  verdict: 'supported' | 'contradicted'
}

interface Props {
  cards: LibraryCard[]
  sources: LibrarySource[]
  docText: string
  citeType: CiteType
  onCiteType: (t: CiteType) => void
  status: string
  url: string
  onUrl: (u: string) => void
  onAddLink: () => void
  onAddPdf: (f: File) => void
  adding: boolean
  onCite: (card: LibraryCard) => void
  onShowSource: (card: LibraryCard) => void
  onDelete: (card: LibraryCard) => void
  onCheckClaims: () => void
  claimHits: ClaimHit[]
}

export default function LibraryPanel(p: Props) {
  const [filter, setFilter] = useState<'all' | 'source' | 'ai'>('all')
  const [checking, setChecking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const srcById = useMemo(() => new Map(p.sources.map(s => [s.id, s])), [p.sources])

  const sorted = useMemo(() => {
    return p.cards
      .filter(c => filter === 'all' || c.kind === filter)
      .map(c => ({ c, n: relevanceScore(c, p.docText) }))
      .sort((a, b) => b.n - a.n || a.c.id.localeCompare(b.c.id))
  }, [p.cards, filter, p.docText])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={p.url}
          onChange={e => p.onUrl(e.target.value)}
          placeholder="Paste..."
          aria-label="Link"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" className="primary" onClick={() => { blip('open'); p.onAddLink() }} disabled={p.adding}>
          Add link
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={p.adding} title="Add PDF">
          Add PDF
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) p.onAddPdf(f)
            e.target.value = ''
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {p.status || ''}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <label style={{ margin: 0 }} htmlFor="cite-type">type</label>
        <select id="cite-type" value={p.citeType} onChange={e => p.onCiteType(e.target.value as CiteType)} style={{ flex: 1, minWidth: 0 }}>
          {CITE_TYPES.map(t => <option key={t} value={t}>{CITE_LABELS[t]}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={filter}
          onChange={e => { blip('select'); setFilter(e.target.value as 'all' | 'source' | 'ai') }}
          aria-label="Filter cards"
          style={{ flex: 1, minWidth: 0 }}
        >
          <option value="all">All cards</option>
          <option value="source">Source</option>
          <option value="ai">AI</option>
        </select>
        <button
          type="button"
          className="primary"
          disabled={checking}
          onClick={() => {
            if (checking) return
            blip('open')
            setChecking(true)
            try { p.onCheckClaims() } finally { setChecking(false) }
          }}
          title="Underline claims supported/contradicted by cards"
          style={{
            padding: '5px 14px', fontSize: 12.5, fontWeight: 800, minHeight: 'auto',
            borderRadius: 99, whiteSpace: 'nowrap',
            background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff',
            boxShadow: '0 2px 12px color-mix(in srgb, var(--blue) 55%, transparent)',
            cursor: checking ? 'wait' : 'pointer',
          }}
        >
          {checking ? <span className="reading-pulse">Checking…</span> : 'Check claims'}
        </button>
      </div>
      {p.claimHits.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {p.claimHits.length} claim{p.claimHits.length > 1 ? 's' : ''} underlined in blue — click one.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '12px 4px' }}>
            No cards yet. Paste a link or add a PDF to build the library.
          </div>
        )}
        {sorted.map(({ c, n }) => {
          const s = srcById.get(c.sourceId)
          const inferred = s ? Object.entries(s.provenance || {}).filter(([, v]) => v === 'inferred').map(([k]) => k) : []
          return (
            <div
              key={c.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', `card:${c.id}`)
                e.dataTransfer.effectAllowed = 'copy'
                // Dot-only cursor: replace the whole-card ghost with a 14px dot.
                try {
                  const css = getComputedStyle(document.documentElement)
                  const dotColor = (css.getPropertyValue('--blue') || '').trim() || '#1765CC'
                  const ring = (css.getPropertyValue('--paper') || '').trim() || '#fff'
                  const d = document.createElement('div')
                  d.style.cssText = `position:fixed;top:-50px;left:-50px;width:14px;height:14px;border-radius:50%;background:${dotColor};box-shadow:0 0 0 3px ${ring};pointer-events:none;`
                  document.body.appendChild(d)
                  e.dataTransfer.setDragImage(d, 7, 7)
                  setTimeout(() => d.remove(), 0)
                } catch { /* default ghost */ }
              }}
              style={{
                border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
                background: 'var(--paper)', cursor: 'grab', display: 'grid', gap: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                <span style={{
                  borderRadius: 4, padding: '0 6px', fontWeight: 700, color: '#fff',
                  background: c.kind === 'source' ? 'var(--blue)' : 'var(--btn-bg, var(--ai))',
                }}>
                  {c.kind === 'source' ? 'Source' : 'AI'}
                </span>
                <span style={{ background: 'color-mix(in srgb, var(--btn-bg, var(--ai)) 14%, transparent)', color: 'var(--ink)', borderRadius: 99, padding: '0 8px', fontWeight: 600 }}>
                  {c.type}
                </span>
                {c.vision && <span style={{ background: 'var(--ink-1)', borderRadius: 99, padding: '0 8px' }}>vision</span>}
                {c.status === 'flagged' && <span style={{ color: 'var(--gold, #8A5F00)' }}>⚠ check quote</span>}
                <span style={{ flex: 1 }} />
                <span title="Match to your text" style={{ letterSpacing: 2, color: 'var(--btn-bg, var(--ai))' }}>{dots(n)}</span>
                <button type="button" onClick={() => p.onDelete(c)} title="Delete card" aria-label="Delete card" style={{ minHeight: 'auto', padding: '0 4px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>×</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{c.finding}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {s ? `${authorShort(s)} ${sourceYear(s)} · ${s.kind || (s.type === 'webpage' ? 'Web' : 'PDF')}${s.kind === 'PDF' || s.type !== 'webpage' ? ` · p. ${c.page || 1}` : ''}` : 'Derived from your sources, no citation'}
                {inferred.length > 0 && c.passage ? ` · ⚠ inferred: ${inferred.join(', ')}` : ''}
              </div>
              {c.kind === 'source' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" disabled={!c.passage} onClick={() => p.onCite(c)}>Cite</button>
                  <button type="button" disabled={!c.passage} onClick={() => p.onShowSource(c)}>Show in source</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
