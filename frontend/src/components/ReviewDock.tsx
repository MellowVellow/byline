import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Finding, Persona, FindingStatus, Suggestion } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { resolveAnchor, applySafeReplacement } from '../editor/anchoring'
import { blip, sfxAccept, sfxDismiss, sfxPick } from '../lib/sfx'
import { harperService } from '../services/harper-service'

export interface ReviewDockProps {
  findings: Finding[]
  onStatusChange: (id: string, status: FindingStatus) => void
  onRerollFinding: (finding: Finding) => Promise<void>
  onRunAnalysis: () => Promise<void>
  onRunGrammar: () => Promise<void>
  onRunResearch: () => Promise<void>
  onRunPersona?: (persona: Persona) => Promise<void>
  analyzing: boolean
  editor: Editor | null
  highlightedFindingId?: string | null
  onToggleCollapse?: () => void
  triggerReviewCounter?: number
  grammarNotice?: string | null
  selectedPersona?: Persona | 'all'
  onPersonaChange?: (p: Persona | 'all') => void
  visiblePersonas?: Record<Persona, boolean>
  onVisibilityChange?: (v: Record<Persona, boolean>) => void
}

const PERSONA_LABELS: Record<Persona, { label: string; color: string; border: string; bg: string; dot: string }> = {
  grammar: { label: 'Grammar', color: '#C0281F', border: '#F87171', bg: '#FEF2F2', dot: '🔴' },
  reader: { label: 'Reader', color: '#6D3BE0', border: '#C084FC', bg: '#FAF5FF', dot: '🟣' },
  supervisor: { label: 'Supervisor', color: '#8A5F00', border: '#FBBF24', bg: '#FEFCE8', dot: '🟡' },
  researcher: { label: 'Researcher', color: '#1765CC', border: '#60A5FA', bg: '#EFF6FF', dot: '🔵' },
}

export const REVIEW_PERSONAS: Array<{
  id: Persona
  label: string
  colorName: string
  colorDot: string
  color: string
  description: string
  endpoint: string
}> = [
  { id: 'grammar', label: 'Grammar', colorName: 'Red', colorDot: '🔴', color: '#C0281F', description: 'Spelling, punctuation, typography', endpoint: '/api/grammar' },
  { id: 'reader', label: 'Reader', colorName: 'Purple', colorDot: '🟣', color: '#6D3BE0', description: 'Perception, intent gap, tone reaction', endpoint: '/api/reactions' },
  { id: 'supervisor', label: 'Supervisor', colorName: 'Yellow', colorDot: '🟡', color: '#8A5F00', description: 'Outline alignment, structural flow, logic gaps', endpoint: '/api/lint' },
  { id: 'researcher', label: 'Researcher', colorName: 'Blue', colorDot: '🔵', color: '#1765CC', description: 'Claim verification, citations, evidence grounding', endpoint: '/api/readings' },
]

const STATUS_LABELS: Record<FindingStatus | 'all', string> = {
  all: 'All statuses',
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  stale: 'Stale',
}

const STATUS_OPTIONS: { id: FindingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All statuses' },
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'stale', label: 'Stale' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'document', label: 'Document order' },
  { value: 'newest', label: 'Newest first' },
  { value: 'persona', label: 'Persona' },
  { value: 'issue', label: 'Issue type' },
]

export default function ReviewDock({
  findings,
  onStatusChange,
  onRerollFinding,
  onRunAnalysis,
  onRunGrammar,
  onRunResearch,
  onRunPersona,
  analyzing,
  editor,
  highlightedFindingId,
  onToggleCollapse,
  triggerReviewCounter,
  grammarNotice,
  selectedPersona: selectedPersonaProp,
  onPersonaChange,
  visiblePersonas: visiblePersonasProp,
  onVisibilityChange,
}: ReviewDockProps) {
  const [selectedPersona, setSelectedPersona] = useState<Persona | 'all'>(selectedPersonaProp ?? 'all')

  useEffect(() => {
    if (selectedPersonaProp !== undefined && selectedPersonaProp !== selectedPersona) {
      setSelectedPersona(selectedPersonaProp)
    }
  }, [selectedPersonaProp, selectedPersona])

  const [visiblePersonas, setVisiblePersonas] = useState<Record<Persona, boolean>>(visiblePersonasProp ?? {
    grammar: true, reader: true, supervisor: true, researcher: true,
  })

  useEffect(() => {
    if (visiblePersonasProp && JSON.stringify(visiblePersonasProp) !== JSON.stringify(visiblePersonas)) {
      setVisiblePersonas(visiblePersonasProp)
    }
  }, [visiblePersonasProp, visiblePersonas])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'document' | 'newest' | 'persona' | 'issue'>('document')
  const [rerollingId, setRerollingId] = useState<string | null>(null)

  // Dropdown menu state (filter and sort each open their own)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on Escape or clicking outside
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

  // Auto-scroll and highlight card when underlined text in editor is clicked
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

  const handleAddToDictionary = async (finding: Finding) => {
    const word = finding.anchor.quotedText.trim()
    if (!word || /\s/.test(word)) return
    await harperService.addWord(word)
    onStatusChange(finding.id, 'dismissed')
    blip('done')
  }

  const handleIgnoreRule = async (finding: Finding) => {
    if (!finding.ruleId) return
    await harperService.ignoreRule(finding.ruleId)
    findings
      .filter(f => f.ruleId === finding.ruleId && f.status === 'open')
      .forEach(f => onStatusChange(f.id, 'dismissed'))
    blip('done')
  }

  const handleReroll = async (finding: Finding) => {
    setRerollingId(finding.id)
    blip('select')
    try {
      await onRerollFinding(finding)
    } finally {
      setRerollingId(null)
    }
  }

  // Filtering (independent of visibility)
  const filtered = findings.filter(f => {
    if (selectedPersona !== 'all' && f.persona !== selectedPersona) return false
    if (selectedStatus === 'all') {
      // show everything
    } else if (f.status !== selectedStatus) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match =
        f.anchor.quotedText.toLowerCase().includes(q) ||
        f.explanation.toLowerCase().includes(q) ||
        f.kind.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    }
    if (sortBy === 'persona') {
      const order: Record<Persona, number> = { grammar: 0, reader: 1, supervisor: 2, researcher: 3 }
      const diff = (order[a.persona] ?? 9) - (order[b.persona] ?? 9)
      if (diff !== 0) return diff
      return (a.anchor?.quotedText || '').localeCompare(b.anchor?.quotedText || '')
    }
    if (sortBy === 'issue') {
      const ka = (a.kind || a.persona).localeCompare(b.kind || b.persona)
      if (ka !== 0) return ka
      return (a.anchor?.quotedText || '').localeCompare(b.anchor?.quotedText || '')
    }
    return 0
  })

  const counts = {
    all: findings.filter(f => f.status === 'open' || f.status === 'stale').length,
    grammar: findings.filter(f => f.persona === 'grammar' && (f.status === 'open' || f.status === 'stale')).length,
    reader: findings.filter(f => f.persona === 'reader' && (f.status === 'open' || f.status === 'stale')).length,
    supervisor: findings.filter(f => f.persona === 'supervisor' && (f.status === 'open' || f.status === 'stale')).length,
    researcher: findings.filter(f => f.persona === 'researcher' && (f.status === 'open' || f.status === 'stale')).length,
  }

  const getShortExcerpt = (text: string, len = 60) => {
    if (text.length <= len) return text
    return text.slice(0, len).trim() + '…'
  }

  // Pill button style
  const pillStyle = (active: boolean, color: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
    fontSize: 11.5, fontWeight: 600, borderRadius: 99,
    border: `1px solid ${active ? color : 'var(--border)'}`,
    background: active ? color : 'transparent',
    color: active ? '#fff' : 'var(--ink)', cursor: 'pointer', minHeight: 'auto',
    transition: 'all 0.15s ease',
  })

  return (
    <aside className="dock dock-right" ref={popoverRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', margin: 0, padding: 0, position: 'relative' }}>
      {/* Compact header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="swatch" style={{ background: 'var(--ai)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>Review</h3>
          <span className="meta" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6, whiteSpace: 'nowrap' }}>
            {counts.all} finding{counts.all !== 1 ? 's' : ''}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Review Dock"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', minHeight: 'auto', fontSize: 13, fontWeight: 700 }}
          >
            ‹
          </button>
        )}
      </div>

      {/* Persona filter chips */}
      <div style={{ padding: '8px 14px 6px', display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
        {[
          { id: 'all' as const, label: 'All', count: counts.all, color: 'var(--ink)' },
          { id: 'grammar', label: 'Grammar', count: counts.grammar, color: PERSONA_LABELS.grammar.color },
          { id: 'reader', label: 'Reader', count: counts.reader, color: PERSONA_LABELS.reader.color },
          { id: 'supervisor', label: 'Supervisor', count: counts.supervisor, color: PERSONA_LABELS.supervisor.color },
          { id: 'researcher', label: 'Researcher', count: counts.researcher, color: PERSONA_LABELS.researcher.color },
        ].map(chip => {
          const active = selectedPersona === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => { setSelectedPersona(chip.id as Persona); onPersonaChange?.(chip.id as Persona) }}
              style={pillStyle(active, chip.color)}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: chip.color, flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>{chip.label}</span>
              <span style={{ fontSize: 9.5, opacity: 0.8 }}>{chip.count}</span>
            </button>
          )
        })}
      </div>

      {/* Search on its own row */}
      <div style={{ padding: '0 14px 6px', minWidth: 0 }}>
        <input
          type="text"
          value={searchQuery}
          placeholder="Search findings…"
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', minWidth: 0, padding: '5px 10px', fontSize: 12,
            borderRadius: 4, border: '1px solid var(--ink-2)',
            background: 'var(--paper-1)', color: 'var(--ink-5)', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter + Sort buttons (open dropdown menus, no subtext) */}
      <div style={{ padding: '0 14px 8px', display: 'flex', gap: 8, minWidth: 0, alignItems: 'center' }}>
        {/* Filter button + popover */}
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
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22), 0 8px 12px -6px rgba(0,0,0,0.12)',
                zIndex: 120,
                overflow: 'hidden',
                minWidth: 180,
              }}
            >
              <div style={{ padding: '8px 12px', background: 'var(--dock)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Filter by status</span>
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, fontSize: 13 }}
                >
                  ✕
                </button>
              </div>
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
                      minHeight: 'auto',
                      display: 'flex', alignItems: 'center', gap: 6,
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

        {/* Sort button + popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            title="Sort findings"
            onClick={() => { setSortMenuOpen(v => !v); setFilterMenuOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12,
              border: sortBy !== 'document' ? '1px solid var(--blue)' : '1px solid var(--border)',
              borderRadius: 4,
              background: sortBy !== 'document' ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent',
              color: sortBy !== 'document' ? 'var(--blue)' : 'var(--ink)', cursor: 'pointer', minHeight: 'auto', flexShrink: 0,
            }}
          >
            {sortBy === 'document' ? 'Sort' : SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>

          {sortMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 28px -4px rgba(0,0,0,0.22), 0 8px 12px -6px rgba(0,0,0,0.12)',
                zIndex: 120,
                overflow: 'hidden',
                minWidth: 180,
              }}
            >
              <div style={{ padding: '8px 12px', background: 'var(--dock)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>Sort by</span>
                <button
                  type="button"
                  onClick={() => setSortMenuOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, fontSize: 13 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '2px 0' }}>
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { setSortBy(o.value as 'document' | 'newest' | 'persona' | 'issue'); setSortMenuOpen(false) }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', background: sortBy === o.value ? 'var(--hover)' : 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12,
                      color: sortBy === o.value ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: sortBy === o.value ? 700 : 400,
                      minHeight: 'auto',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {sortBy === o.value && <span style={{ fontSize: 10 }}>✓</span>}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter/sort reset */}
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

      {/* Grammar notice */}
      {grammarNotice && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            padding: '6px 9px', margin: '0 14px 8px', borderRadius: 'var(--radius)',
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            fontSize: 11.5, color: '#991B1B', lineHeight: 1.4, minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{ fontWeight: 700 }}>🔴</span>
          <span style={{ minWidth: 0 }}>{grammarNotice}</span>
        </div>
      )}

      {/* Findings list — old card UI */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, minWidth: 0 }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-4)', fontSize: 13, paddingTop: 40 }}>
            No findings in this view.
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Click <strong>Run Review</strong> to analyze your prose across personas.
            </div>
          </div>
        ) : (
          sorted.map(f => {
            const personaMeta = PERSONA_LABELS[f.persona]
            const isHighlighted = highlightedFindingId === f.id
            return (
              <div
                key={f.id}
                id={`finding-card-${f.id}`}
                style={{
                  border: isHighlighted
                    ? `2px solid ${personaMeta.color}`
                    : `1px solid ${f.status === 'stale' ? 'var(--ink-2)' : personaMeta.border}`,
                  borderLeft: `4px solid ${personaMeta.color}`,
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
                        borderRadius: 3, background: personaMeta.bg, color: personaMeta.color,
                      }}
                    >
                      {personaMeta.label}
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
                      borderRadius: 4, borderLeft: `2px solid ${personaMeta.color}`,
                    }}
                  >
                    “{f.anchor.quotedText}”
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--ink-5)', lineHeight: 1.45 }}>
                  {f.explanation}
                </div>

                {f.evidence && f.evidence.length > 0 && (
                  <div style={{ display: 'grid', gap: 4, marginTop: 2 }}>
                    {f.evidence.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11, padding: '4px 6px',
                          background: ev.status === 'supported' ? '#EFF6FF' : (ev.status === 'contradicted' ? '#FEF2F2' : '#F9FAFB'),
                          border: `1px solid ${ev.status === 'supported' ? '#BFDBFE' : (ev.status === 'contradicted' ? '#FECACA' : '#E5E7EB')}`,
                          borderRadius: 4,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span style={{ color: ev.status === 'supported' ? '#1E40AF' : (ev.status === 'contradicted' ? '#991B1B' : '#4B5563') }}>
                            {ev.status === 'supported' ? '✓ Supported' : (ev.status === 'contradicted' ? '✗ Contradicted' : '? Unverified')}
                          </span>
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1765CC', textDecoration: 'none' }}>
                            {ev.title || 'Source'} ↗
                          </a>
                        </div>
                        <div style={{ color: 'var(--ink-4)', marginTop: 2 }}>{ev.excerpt}</div>
                      </div>
                    ))}
                  </div>
                )}

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
                          <span style={{ fontWeight: 700, color: personaMeta.color, marginRight: 6 }}>{sIdx + 1}.</span>
                          {sug.text}
                          {sug.rationale && (
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{sug.rationale}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleAcceptSuggestion(f, sug) }}
                          style={{
                            padding: '3px 8px', background: personaMeta.color, color: '#fff', border: 'none',
                            borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                    {f.persona !== 'grammar' && (
                      <button
                        type="button"
                        disabled={rerollingId === f.id}
                        onClick={(e) => { e.stopPropagation(); handleReroll(f) }}
                        style={{
                          padding: '4px 8px', background: 'transparent', border: '1px dashed var(--ink-2)',
                          borderRadius: 4, fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', textAlign: 'center',
                        }}
                      >
                        {rerollingId === f.id ? 'Generating fresh options…' : '↻ Reroll alternatives'}
                      </button>
                    )}
                    {f.ruleId && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleIgnoreRule(f) }}
                        style={{
                          padding: '4px 8px', background: 'transparent', border: '1px dashed var(--ink-2)',
                          borderRadius: 4, fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', textAlign: 'center',
                        }}
                      >
                        Ignore rule
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAddToDictionary(f) }}
                      style={{
                        padding: '4px 8px', background: 'transparent', border: '1px dashed var(--ink-2)',
                        borderRadius: 4, fontSize: 11, color: 'var(--ink-4)', cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      Add to dictionary
                    </button>
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
