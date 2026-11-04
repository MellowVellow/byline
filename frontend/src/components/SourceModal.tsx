import React, { useMemo } from 'react'
import type { LibraryCard, LibrarySource } from '../domain/library'
import { normalizeText } from '../domain/library'

interface Props {
  card: LibraryCard | null
  source: LibrarySource | null
  pageText: string
  onClose: () => void
}

/** Fuzzy locate: normalized passage inside normalized page text. */
export function fuzzyFind(passage: string, pageText: string): { start: number; end: number } | null {
  const pn = normalizeText(passage)
  const tn = normalizeText(pageText)
  if (!pn || !tn) return null
  // Try full, then first 12 words for robustness.
  const tries = [pn, pn.split(' ').slice(0, 12).join(' ')]
  for (const q of tries) {
    if (q.length > 10 && tn.includes(q)) {
      return { start: tn.indexOf(q), end: tn.indexOf(q) + q.length }
    }
  }
  return null
}

export default function SourceModal({ card, source, pageText, onClose }: Props) {
  const marked = useMemo(() => {
    if (!card || !pageText) return pageText || '(no page text captured — PDF figure page, vision card).'
    const hit = fuzzyFind(card.passage || card.finding, pageText)
    if (!hit) return pageText.slice(0, 2000)
    // Map normalized hit back approximately: highlight by sentence containing keywords.
    const norm = normalizeText(pageText)
    void norm
    const idx = pageText.toLowerCase().indexOf(card.passage.slice(0, 24).toLowerCase())
    if (idx >= 0) {
      return (
        <>
          {pageText.slice(Math.max(0, idx - 300), idx)}
          <mark>{pageText.slice(idx, idx + card.passage.length + 40)}</mark>
          {pageText.slice(idx + card.passage.length + 40, idx + card.passage.length + 800)}
        </>
      )
    }
    return pageText.slice(0, 2000)
  }, [card, pageText])

  if (!card) return null
  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div className="fade" style={{ background: 'var(--paper)', width: 'min(560px, calc(100vw - 32px))', maxWidth: 560, margin: 16, padding: 20, borderRadius: 10, fontSize: 14, maxHeight: '80vh', overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {source?.title || 'Source'} · {source?.type === 'webpage' ? 'page snapshot' : `page ${card.page || 1}`}{card.vision ? ' · found by vision model' : ''}
        </div>
        <div style={{ margin: '8px 0', lineHeight: 1.6 }}>{marked as React.ReactNode}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Fuzzy match on normalized text; highlight boxes computed client-side (pdf.js word positions in full build).
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
