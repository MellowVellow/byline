import React, { useState } from 'react'
import type { Finding, Persona, FindingStatus, Suggestion } from '../domain/finding'
import type { Editor } from '@tiptap/react'
import { resolveAnchor, applySafeReplacement } from '../editor/anchoring'
import { blip, sfxAccept, sfxDismiss, sfxPick } from '../lib/sfx'

export interface ReflectionDockProps {
  findings: Finding[]
  onStatusChange: (id: string, status: FindingStatus) => void
  onRerollFinding: (finding: Finding) => Promise<void>
  onRunAnalysis: () => Promise<void>
  onRunGrammar: () => Promise<void>
  onRunResearch: () => Promise<void>
  analyzing: boolean
  editor: Editor | null
}

const PERSONA_LABELS: Record<Persona, { label: string; color: string; border: string; bg: string }> = {
  grammar: { label: 'Grammar', color: '#C0281F', border: '#F87171', bg: '#FEF2F2' },
  reader: { label: 'Reader', color: '#6D3BE0', border: '#C084FC', bg: '#FAF5FF' },
  supervisor: { label: 'Supervisor', color: '#8A5F00', border: '#FBBF24', bg: '#FEFCE8' },
  researcher: { label: 'Researcher', color: '#1765CC', border: '#60A5FA', bg: '#EFF6FF' },
}

export default function ReflectionDock({
  findings,
  onStatusChange,
  onRerollFinding,
  onRunAnalysis,
  onRunGrammar,
  onRunResearch,
  analyzing,
  editor,
}: ReflectionDockProps) {
  const [selectedPersona, setSelectedPersona] = useState<Persona | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus | 'active'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [rerollingId, setRerollingId] = useState<string | null>(null)

  // Navigate to quote in editor
  const handleJumpToText = (finding: Finding) => {
    if (!editor) return
    const resolved = resolveAnchor(editor, finding.anchor)
    if (resolved) {
      editor.chain().setTextSelection({ from: resolved.from, to: resolved.to }).scrollIntoView().run()
      blip('select')
    }
  }

  // Accept a suggestion safely
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

  // Dismiss finding
  const handleDismiss = (id: string) => {
    sfxDismiss()
    onStatusChange(id, 'dismissed')
  }

  // Reroll alternatives
  const handleReroll = async (finding: Finding) => {
    setRerollingId(finding.id)
    blip('select')
    try {
      await onRerollFinding(finding)
    } finally {
      setRerollingId(null)
    }
  }

  // Filtering
  const filtered = findings.filter(f => {
    if (selectedPersona !== 'all' && f.persona !== selectedPersona) return false
    if (selectedStatus === 'active') {
      if (f.status === 'resolved' || f.status === 'dismissed') return false
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

  const counts = {
    all: findings.filter(f => f.status === 'open' || f.status === 'stale').length,
    grammar: findings.filter(f => f.persona === 'grammar' && (f.status === 'open' || f.status === 'stale')).length,
    reader: findings.filter(f => f.persona === 'reader' && (f.status === 'open' || f.status === 'stale')).length,
    supervisor: findings.filter(f => f.persona === 'supervisor' && (f.status === 'open' || f.status === 'stale')).length,
    researcher: findings.filter(f => f.persona === 'researcher' && (f.status === 'open' || f.status === 'stale')).length,
  }

  return (
    <aside className="dock dock-right" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Dock Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--ink-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-4)' }}>
            Reflection
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
            {counts.all} active finding{counts.all === 1 ? '' : 's'}
          </span>
        </div>

        {/* Action Triggers */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => { sfxPick(); onRunAnalysis() }}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: 12,
              fontWeight: 600,
              background: '#8A5F00',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: analyzing ? 'wait' : 'pointer',
              opacity: analyzing ? 0.7 : 1,
            }}
          >
            {analyzing ? 'Analyzing…' : '✦ Supervisor & Reader'}
          </button>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => { sfxPick(); onRunGrammar() }}
            title="Run Language / Spellcheck"
            style={{
              padding: '5px 8px',
              fontSize: 12,
              background: 'var(--paper-2)',
              border: '1px solid var(--ink-2)',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#C0281F',
              fontWeight: 600,
            }}
          >
            Grammar
          </button>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => { sfxPick(); onRunResearch() }}
            title="Verify Claims with Researcher"
            style={{
              padding: '5px 8px',
              fontSize: 12,
              background: 'var(--paper-2)',
              border: '1px solid var(--ink-2)',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#1765CC',
              fontWeight: 600,
            }}
          >
            Research
          </button>
        </div>

        {/* Persona Filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          <button
            type="button"
            className={`wz-pill ${selectedPersona === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedPersona('all')}
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`wz-pill ${selectedPersona === 'grammar' ? 'active' : ''}`}
            onClick={() => setSelectedPersona('grammar')}
            style={{ fontSize: 11, padding: '2px 8px', color: '#C0281F' }}
          >
            Grammar ({counts.grammar})
          </button>
          <button
            type="button"
            className={`wz-pill ${selectedPersona === 'reader' ? 'active' : ''}`}
            onClick={() => setSelectedPersona('reader')}
            style={{ fontSize: 11, padding: '2px 8px', color: '#6D3BE0' }}
          >
            Reader ({counts.reader})
          </button>
          <button
            type="button"
            className={`wz-pill ${selectedPersona === 'supervisor' ? 'active' : ''}`}
            onClick={() => setSelectedPersona('supervisor')}
            style={{ fontSize: 11, padding: '2px 8px', color: '#8A5F00' }}
          >
            Supervisor ({counts.supervisor})
          </button>
          <button
            type="button"
            className={`wz-pill ${selectedPersona === 'researcher' ? 'active' : ''}`}
            onClick={() => setSelectedPersona('researcher')}
            style={{ fontSize: 11, padding: '2px 8px', color: '#1765CC' }}
          >
            Researcher ({counts.researcher})
          </button>
        </div>

        {/* Search Input & Status Toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={searchQuery}
            placeholder="Filter findings…"
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
          />
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
          >
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="stale">Stale</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'grid', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-4)', fontSize: 13 }}>
            No findings in this view.
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Run <strong>Supervisor & Reader</strong> or <strong>Grammar</strong> above to analyze your prose.
            </div>
          </div>
        ) : (
          filtered.map(f => {
            const personaMeta = PERSONA_LABELS[f.persona]
            return (
              <div
                key={f.id}
                style={{
                  border: `1px solid ${f.status === 'stale' ? 'var(--ink-2)' : personaMeta.border}`,
                  borderLeft: `4px solid ${personaMeta.color}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                  background: f.status === 'resolved' ? 'var(--paper-2)' : 'var(--paper-1)',
                  opacity: f.status === 'resolved' || f.status === 'dismissed' ? 0.6 : 1,
                  display: 'grid',
                  gap: 8,
                }}
              >
                {/* Finding Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: personaMeta.bg,
                        color: personaMeta.color,
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
                      <span style={{ fontSize: 10, color: '#15803D', fontWeight: 600 }}>
                        ✓ Resolved
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleJumpToText(f)}
                      title="Jump to quote in editor"
                      style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 11 }}
                    >
                      Jump ↗
                    </button>
                    {f.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleDismiss(f.id)}
                        title="Dismiss"
                        style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 11 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Quoted Text */}
                {f.anchor?.quotedText && (
                  <div
                    style={{
                      fontFamily: '"Source Serif 4", serif',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: 'var(--ink-5)',
                      background: 'var(--paper-2)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      borderLeft: `2px solid ${personaMeta.color}`,
                    }}
                  >
                    “{f.anchor.quotedText}”
                  </div>
                )}

                {/* Explanation */}
                <div style={{ fontSize: 12, color: 'var(--ink-5)', lineHeight: 1.45 }}>
                  {f.explanation}
                </div>

                {/* Researcher Evidence Records */}
                {f.evidence && f.evidence.length > 0 && (
                  <div style={{ display: 'grid', gap: 4, marginTop: 2 }}>
                    {f.evidence.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: '4px 6px',
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

                {/* Suggestions / Alternatives */}
                {f.suggestions && f.suggestions.length > 0 && f.status === 'open' && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                      Suggested Revisions ({f.suggestions.length})
                    </div>
                    {f.suggestions.map((sug, sIdx) => (
                      <div
                        key={sug.id || sIdx}
                        style={{
                          padding: '6px 8px',
                          background: 'var(--paper-2)',
                          border: '1px solid var(--ink-2)',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-5)' }}>
                          <span style={{ fontWeight: 700, color: personaMeta.color, marginRight: 6 }}>
                            {sIdx + 1}.
                          </span>
                          {sug.text}
                          {sug.rationale && (
                            <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{sug.rationale}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptSuggestion(f, sug)}
                          style={{
                            padding: '3px 8px',
                            background: personaMeta.color,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    ))}

                    {/* Reroll single finding alternatives */}
                    {f.persona !== 'grammar' && (
                      <button
                        type="button"
                        disabled={rerollingId === f.id}
                        onClick={() => handleReroll(f)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px dashed var(--ink-2)',
                          borderRadius: 4,
                          fontSize: 11,
                          color: 'var(--ink-4)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {rerollingId === f.id ? 'Generating fresh options…' : '↻ Reroll alternatives'}
                      </button>
                    )}
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
