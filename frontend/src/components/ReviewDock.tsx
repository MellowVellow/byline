import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Finding, FindingStatus, Suggestion } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { resolveAnchor, applySafeReplacement } from '../editor/anchoring'
import { blip, sfxAccept, sfxDismiss } from '../lib/sfx'

export interface ReviewDockProps {
  findings: Finding[]
  onStatusChange: (id: string, status: FindingStatus) => void
  onRunAnalysis: () => Promise<void>
  analyzing: boolean
  editor: Editor | null
  highlightedFindingId?: string | null
  onToggleCollapse?: () => void
}

/** Reader accent (purple observations). */
export const READER_ACCENT = {
  label: 'Reader',
  color: 'var(--ai)',
  border: 'color-mix(in srgb, var(--ai) 45%, transparent)',
  bg: 'color-mix(in srgb, var(--ai) 10%, var(--paper))',
  dot: '🟣',
}

/** Grammar accent (red Harper fixes, shown in Edit mode). */
export const GRAMMAR_ACCENT = {
  label: 'Grammar',
  color: 'var(--lt)',
  border: 'color-mix(in srgb, var(--lt) 45%, transparent)',
  bg: 'color-mix(in srgb, var(--lt) 10%, var(--paper))',
  dot: '🔴',
}

/** Per-finding accent: grammar findings render red, everything else reader-purple. */
export function accentFor(finding: { persona: string }) {
  return finding.persona === 'grammar' ? GRAMMAR_ACCENT : READER_ACCENT
}

const STATUS_LABELS: Record<string, string> = {
  all: 'All statuses',
  open: 'Open',
  dismissed: 'Dismissed',
  stale: 'Stale',
}

const STATUS_OPTIONS: { id: FindingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'open', label: 'Open' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'stale', label: 'Stale' },
]

export default function ReviewDock({
  findings,
  onStatusChange,
  onRunAnalysis,
  analyzing,
  editor,
  highlightedFindingId,
  onToggleCollapse,
}: ReviewDockProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'document' | 'newest'>('document')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFilterMenuOpen(false); setSortMenuOpen(false) } }
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!popoverRef.current?.contains(target)) {
        setFilterMenuOpen(false)
        setSortMenuOpen(false)
      }
    }
    addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [])

  React.useEffect(() => {
    if (highlightedFindingId) {
      const cardEl = document.getElementById(`finding-card-${highlightedFindingId}`)
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [highlightedFindingId])

  const handleJumpToText = useCallback((finding: Finding) => {
    if (!editor) return
    const resolved = resolveAnchor(editor, finding.anchor)
    if (resolved) {
      editor.chain().setTextSelection({ from: resolved.from, to: resolved.to }).scrollIntoView().run()
      blip('select')
    }
  }, [editor])

  const handleAcceptSuggestion = (finding: Finding, suggestion: Suggestion) => {
    if (!editor) return
    const res = applySafeReplacement(editor, finding.anchor, suggestion.text)
    if (res.success) {
      sfxAccept()
      onStatusChange(finding.id, 'resolved')
    } else {
      alert(res.error || 'Failed to apply replacement.')
    }
  }

  const handleDismiss = (id: string) => {
    sfxDismiss()
    onStatusChange(id, 'dismissed')
  }

  const filtered = findings.filter(f => {
    if (selectedStatus !== 'all' && f.status !== selectedStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match =
        f.anchor.quotedText.toLowerCase().includes(q) ||
        f.explanation.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    return 0
  })

  const openCount = findings.filter(f => f.status === 'open' || f.status === 'stale').length
  const openReader = findings.filter(f => f.persona !== 'grammar' && (f.status === 'open' || f.status === 'stale')).length
  const openGrammar = findings.filter(f => f.persona === 'grammar' && (f.status === 'open' || f.status === 'stale')).length
  const meta = READER_ACCENT

  return (
    <aside className="dock dock-right" ref={popoverRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="swatch" style={{ background: 'var(--ai)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Review</h3>
          <span className="meta" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, whiteSpace: 'nowrap' }}>
            {openCount} open{openGrammar > 0 ? ` (${openReader} reader · ${openGrammar} grammar)` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => void onRunAnalysis()}
            disabled={analyzing}
            title="Run Reader review"
            style={{ padding: '3px 10px', fontSize: 11.5, fontWeight: 700, minHeight: 'auto' }}
          >
            {analyzing ? 'Reading…' : 'Run Review'}
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse Reader Dock"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', minHeight: 'auto', fontSize: 13, fontWeight: 700 }}
            >
              ‹
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 14px 6px', minWidth: 0 }}>
        <input
          type="text"
          value={searchQuery}
          placeholder="Search comments…"
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', minWidth: 0, padding: '5px 10px', fontSize: 12,
            borderRadius: 4, border: '1px solid var(--ink-2)',
            background: 'var(--paper-1)', color: 'var(--ink-5)', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: '0 14px 8px', display: 'flex', gap: 8, minWidth: 0, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            title="Filter by status"
            onClick={() => { setFilterMenuOpen(v => !v); setSortMenuOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12,
              border: selectedStatus !== 'all' ? '1px solid var(--blue)' : '1px solid var(--border)',
              borderRadius: 4,
              background: selectedStatus !== 'all' ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent',
              color: selectedStatus !== 'all' ? 'var(--blue)' : 'var(--ink)', cursor: 'pointer', minHeight: 'auto', flexShrink: 0,
            }}
          >
            {selectedStatus === 'all' ? 'Filter' : STATUS_LABELS[selectedStatus]} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>

          {filterMenuOpen && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                background: 'var(--paper)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22), 0 8px 12px -6px rgba(0,0,0,0.12)',
                zIndex: 120, overflow: 'hidden', minWidth: 180,
              }}
            >
              <div style={{ padding: '2px 0' }}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSelectedStatus(s.id); setFilterMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: selectedStatus === s.id ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12,
                      color: selectedStatus === s.id ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: selectedStatus === s.id ? 700 : 400,
                      minHeight: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {selectedStatus === s.id && <span style={{ fontSize: 10 }}>✓</span>}
                    {STATUS_LABELS[s.id]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            title="Sort comments"
            onClick={() => { setSortMenuOpen(v => !v); setFilterMenuOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12,
              border: sortBy !== 'document' ? '1px solid var(--blue)' : '1px solid var(--border)',
              borderRadius: 4,
              background: sortBy !== 'document' ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent',
              color: sortBy !== 'document' ? 'var(--blue)' : 'var(--ink)', cursor: 'pointer', minHeight: 'auto', flexShrink: 0,
            }}
          >
            {sortBy === 'document' ? 'Sort' : 'Newest first'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>

          {sortMenuOpen && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                background: 'var(--paper)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22), 0 8px 12px -6px rgba(0,0,0,0.12)',
                zIndex: 120, overflow: 'hidden', minWidth: 180,
              }}
            >
              <div style={{ padding: '2px 0' }}>
                {(['document', 'newest'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setSortBy(v); setSortMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: sortBy === v ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12,
                      color: sortBy === v ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: sortBy === v ? 700 : 400,
                      minHeight: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {sortBy === v && <span style={{ fontSize: 10 }}>✓</span>}
                    {v === 'document' ? 'Document order' : 'Newest first'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {(selectedStatus !== 'all' || sortBy !== 'document') && (
          <button
            type="button"
            onClick={() => { setSelectedStatus('all'); setSortBy('document') }}
            title="Clear filters and sort"
            style={{ padding: '4px 8px', fontSize: 11, color: 'var(--muted)', border: 'none', background: 'none', cursor: 'pointer', minHeight: 'auto' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, minWidth: 0 }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 13, paddingTop: 40 }}>
            No comments in this view.
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Click <strong>Run Review</strong> to hear a Reader response.
            </div>
          </div>
        ) : (
          sorted.map(f => {
            const isHighlighted = highlightedFindingId === f.id
            const meta = accentFor(f)
            return (
              <div
                key={f.id}
                id={`finding-card-${f.id}`}
                style={{
                  border: isHighlighted
                    ? `2px solid ${meta.color}`
                    : `1px solid ${f.status === 'stale' ? 'var(--ink-2)' : meta.border}`,
                  borderLeft: `4px solid ${meta.color}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  background: f.status === 'resolved' ? 'var(--paper-2)' : 'var(--paper-1)',
                  opacity: f.status === 'resolved' || f.status === 'dismissed' ? 0.6 : 1,
                  display: 'grid', gap: 8,
                  minWidth: 0,
                  height: 'fit-content',
                  flexShrink: 0,
                  boxShadow: isHighlighted ? '0 0 0 1px color-mix(in srgb, var(--ink) 20%, transparent)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '1px 5px',
                        borderRadius: 3, background: meta.bg, color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>
                    {f.status === 'stale' && (
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', background: 'var(--ink-1)', padding: '1px 4px', borderRadius: 2 }}>
                        Stale Anchor
                      </span>
                    )}
                    {f.status === 'resolved' && (
                      <span style={{ fontSize: 10, color: '#15803D', fontWeight: 600 }}>{'✓'} Resolved</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleJumpToText(f) }}
                      title="Jump to quote in editor"
                      style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 11 }}
                    >
                      Jump ↗
                    </button>
                    {f.status === 'open' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDismiss(f.id) }}
                        title="Dismiss"
                        style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 11 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {f.anchor?.quotedText && (
                  <div
                    style={{
                      fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 13,
                      color: 'var(--ink-5)', background: 'var(--paper-2)', padding: '4px 8px',
                      borderRadius: 4, borderLeft: `2px solid ${meta.color}`,
                    }}
                  >
                    “{f.anchor.quotedText}”
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--ink-5)', lineHeight: 1.45 }}>
                  {f.explanation}
                </div>

                {f.suggestions && f.suggestions.length > 0 && f.status === 'open' && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                      Suggested Revisions ({f.suggestions.length})
                    </div>
                    {f.suggestions.map((sug, sIdx) => (
                      <div
                        key={sug.id || sIdx}
                        style={{
                          padding: '6px 8px', background: 'var(--paper-2)', border: '1px solid var(--ink-2)',
                          borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}
                      >
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-5)' }}>
                          <span style={{ fontWeight: 700, color: meta.color, marginRight: 6 }}>{sIdx + 1}.</span>
                          {sug.text}
                          {sug.rationale && (
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{sug.rationale}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleAcceptSuggestion(f, sug) }}
                          style={{
                            padding: '3px 8px', background: meta.color, color: '#fff', border: 'none',
                            borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
