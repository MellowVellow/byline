import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Finding, FindingStatus, Persona, Suggestion } from '../domain/finding'
import { groupFindingsByNote, noteKey } from '../domain/finding'

export type PersonaFilter = Persona | 'all'
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
  onApplied?: () => void
  /** Persona filter. Controlled when onPersonaFilterChange is given. */
  personaFilter?: PersonaFilter
  onPersonaFilterChange?: (p: PersonaFilter) => void
}

export const READER_ACCENT = {
  label: 'Reader',
  color: 'var(--ai)',
  border: 'color-mix(in srgb, var(--ai) 45%, transparent)',
  bg: 'color-mix(in srgb, var(--ai) 10%, var(--paper))',
  dot: '🟣',
}

export const GRAMMAR_ACCENT = {
  label: 'Grammar',
  color: 'var(--lt)',
  border: 'color-mix(in srgb, var(--lt) 45%, transparent)',
  bg: 'color-mix(in srgb, var(--lt) 10%, var(--paper))',
  dot: '🔴',
}

export function accentFor(finding: { persona: string }) {
  return finding.persona === 'grammar' ? GRAMMAR_ACCENT : READER_ACCENT
}

export function truncateQuote(q: string, maxWords = 20): string {
  const words = q.trim().split(/\s+/)
  return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : q
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

const PERSONA_LABELS: Record<PersonaFilter, string> = {
  all: 'All',
  reader: 'Reader',
  grammar: 'Grammar',
}

const PERSONA_OPTIONS: { id: PersonaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'reader', label: 'Reader' },
  { id: 'grammar', label: 'Grammar' },
]

export default function ReviewDock({
  findings,
  onStatusChange,
  onRunAnalysis,
  analyzing,
  editor,
  highlightedFindingId,
  onToggleCollapse,
  onApplied,
  personaFilter,
  onPersonaFilterChange,
}: ReviewDockProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus | 'all'>('open')
  const [sortBy, setSortBy] = useState<'document' | 'newest'>('document')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false)
  const [innerPersona, setInnerPersona] = useState<PersonaFilter>('all')
  const selectedPersona = personaFilter ?? innerPersona
  const setSelectedPersona = (p: PersonaFilter) => {
    if (personaFilter === undefined) setInnerPersona(p)
    onPersonaFilterChange?.(p)
  }

  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFilterMenuOpen(false); setSortMenuOpen(false); setPersonaMenuOpen(false) } }
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!popoverRef.current?.contains(target)) {
        setFilterMenuOpen(false)
        setSortMenuOpen(false)
        setPersonaMenuOpen(false)
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
      onApplied?.()
    } else {
      alert(res.error || 'Failed to apply replacement.')
    }
  }

  const handleDismiss = (id: string) => {
    sfxDismiss()
    onStatusChange(id, 'dismissed')
  }

  const filtered = findings.filter(f => {
    if (selectedPersona !== 'all' && f.persona !== selectedPersona) return false
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

  const groups = groupFindingsByNote(sorted)

  const openCount = findings.filter(f => f.status === 'open' || f.status === 'stale').length
  const meta = READER_ACCENT

  return (
    <aside className="dock dock-right" ref={popoverRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="swatch" style={{ background: 'var(--ai)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Review</h3>
          <span className="meta" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, whiteSpace: 'nowrap' }}>
            {openCount} open
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            type="button"
            className="primary"
            onClick={() => { blip('open'); void onRunAnalysis() }}
            disabled={analyzing}
            title="Run Reader review"
            style={{
              padding: '5px 14px', fontSize: 12.5, fontWeight: 800, minHeight: 'auto',
              borderRadius: 99, whiteSpace: 'nowrap',
              boxShadow: '0 2px 12px color-mix(in srgb, var(--btn-bg, var(--ai)) 55%, transparent)',
              cursor: analyzing ? 'wait' : 'pointer',
            }}
          >
            {analyzing ? (
              <span className="reading-pulse">Reading…</span>
            ) : (
              'Run Review'
            )}
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={() => { blip('toggle'); onToggleCollapse() }}
              title="Collapse dock — hides underlines"
              style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                padding: '2px 6px', minHeight: 'auto', fontSize: 13, fontWeight: 700,
                textDecoration: 'underline', textDecorationColor: 'var(--ai)',
                textDecorationThickness: 2, textUnderlineOffset: 3,
              }}
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
            onClick={() => { blip('open'); setFilterMenuOpen(v => !v); setSortMenuOpen(false); setPersonaMenuOpen(false) }}
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
                    onClick={() => { blip('select'); setSelectedStatus(s.id); setFilterMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: selectedStatus === s.id ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
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
            title="Filter by persona (also toggles underlines)"
            onClick={() => { blip('open'); setPersonaMenuOpen(v => !v); setFilterMenuOpen(false); setSortMenuOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12,
              border: selectedPersona !== 'all' ? '1px solid var(--blue)' : '1px solid var(--border)',
              borderRadius: 4,
              background: selectedPersona !== 'all' ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent',
              color: selectedPersona !== 'all' ? 'var(--blue)' : 'var(--ink)', cursor: 'pointer', minHeight: 'auto', flexShrink: 0,
            }}
          >
            {selectedPersona === 'all' ? 'Persona' : PERSONA_LABELS[selectedPersona]} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>

          {personaMenuOpen && (
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
                {PERSONA_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { blip('select'); setSelectedPersona(s.id); setPersonaMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: selectedPersona === s.id ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                      color: selectedPersona === s.id ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: selectedPersona === s.id ? 700 : 400,
                      minHeight: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {selectedPersona === s.id && <span style={{ fontSize: 10 }}>✓</span>}
                    {PERSONA_LABELS[s.id]}
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
            onClick={() => { blip('open'); setSortMenuOpen(v => !v); setFilterMenuOpen(false); setPersonaMenuOpen(false) }}
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
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
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
                    onClick={() => { blip('select'); setSortBy(v); setSortMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: sortBy === v ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
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

        {(selectedPersona !== 'all' || selectedStatus !== 'open' || sortBy !== 'document') && (
          <button
            type="button"
            onClick={() => { blip('dismiss'); setSelectedPersona('all'); setSelectedStatus('open'); setSortBy('document') }}
            title="Clear filters and sort"
            style={{ padding: '4px 8px', fontSize: 11, color: 'var(--muted)', border: 'none', background: 'none', cursor: 'pointer', minHeight: 'auto' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, minWidth: 0 }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 13, paddingTop: 40 }}>
            No comments in this view.
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Click <strong>Run Review</strong> to hear a Reader response.
            </div>
          </div>
        ) : (
          groups.map(g => {
            const first = g.items[0]
            const meta = accentFor(first)
            return (
              <div
                key={g.key + ':' + first.id}
                style={{
                  border: `1px solid ${meta.border}`,
                  borderLeft: `4px solid ${meta.color}`,
                  borderRadius: 6,
                  padding: '8px 10px',
                  background: 'var(--paper-1)',
                  display: 'grid', gap: 6,
                  minWidth: 0,
                  height: 'fit-content',
                  flexShrink: 0,
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
                    {g.items.length > 1 && (
                      <span style={{ fontSize: 10, color: 'var(--ink-4)', background: 'var(--ink-1)', padding: '1px 4px', borderRadius: 2 }}>
                        ×{g.items.length}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-5)', lineHeight: 1.45 }}>
                  {g.explanation}
                </div>

                {g.items.map(f => {
                  const isHighlighted = highlightedFindingId === f.id
                  return (
                    <div key={f.id} id={`finding-card-${f.id}`} style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {f.anchor?.quotedText && (
                          <div
                            title={f.anchor.quotedText}
                            style={{
                              flex: 1,
                              fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 13,
                              lineHeight: 1.4,
                              color: 'var(--ink-5)', background: 'var(--paper-2)', padding: '3px 6px',
                              borderRadius: 4, borderLeft: `2px solid ${meta.color}`,
                              minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word',
                              outline: isHighlighted ? `2px solid ${meta.color}` : 'none',
                            }}
                          >
                            “{truncateQuote(f.anchor.quotedText)}”
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleJumpToText(f) }}
                          title="Jump to quote in editor"
                          style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
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
                      {f.status === 'stale' && (
                        <span style={{ fontSize: 10, color: 'var(--ink-4)', background: 'var(--ink-1)', padding: '1px 4px', borderRadius: 2, justifySelf: 'start' }}>
                          Stale Anchor
                        </span>
                      )}
                      {f.status === 'dismissed' && (
                        <span style={{ fontSize: 10, color: 'var(--ink-4)', background: 'var(--ink-1)', padding: '1px 4px', borderRadius: 2, justifySelf: 'start' }}>
                          Dismissed
                        </span>
                      )}
                      {f.status === 'resolved' && (
                        <span style={{ fontSize: 10, color: '#15803D', fontWeight: 600 }}>{'✓'} Resolved</span>
                      )}

                      {f.suggestions && f.suggestions.length > 0 && f.status === 'open' && (
                        <div style={{ display: 'grid', gap: 2 }}>
                          {f.suggestions.map((sug, sIdx) => (
                            <div
                              key={sug.id || sIdx}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); handleAcceptSuggestion(f, sug) }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleAcceptSuggestion(f, sug)
                                }
                              }}
                              title="Click to apply"
                              style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontFamily: '"Source Serif 4", Georgia, serif',
                                fontSize: 13,
                                lineHeight: 1.45,
                                color: 'var(--ink)',
                                overflowWrap: 'anywhere',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--ai) 20%, transparent)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                            >
                              {sug.text}
                              {sug.rationale && noteKey({ persona: first.persona, explanation: sug.rationale }) !== g.key && (
                                <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 1 }}>{sug.rationale}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
