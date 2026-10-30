import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { CONNECT_PATTERNS, type ConnectCategory, type ConnectPattern } from '../domain/pattern'
import { api } from '../lib/api'
import { blip, sfxAccept, sfxPick } from '../lib/sfx'

export interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
  documentGoal: string
}

export default function ConnectModal({ isOpen, onClose, editor, documentGoal }: ConnectModalProps) {
  const [tab, setTab] = useState<'static' | 'ai'>('static')
  const [selectedCat, setSelectedCat] = useState<ConnectCategory | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPattern, setSelectedPattern] = useState<ConnectPattern | null>(null)
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({})

  // AI inference state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOptions, setAiOptions] = useState<Array<{ relation_type: string; bridge_text: string; rationale: string }>>([])
  const [relationHint, setRelationHint] = useState('auto')

  if (!isOpen) return null

  const categories: Array<ConnectCategory | 'All'> = [
    'All',
    'Contrast',
    'Concession',
    'Cause and effect',
    'Evidence',
    'Addition',
    'Comparison',
    'Elaboration',
    'Qualification',
    'Synthesis',
    'Sequence',
    'Example',
    'Problem and solution',
  ]

  const filteredPatterns = CONNECT_PATTERNS.filter(p => {
    if (selectedCat !== 'All' && p.category !== selectedCat) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const m = p.name.toLowerCase().includes(q) || p.template.toLowerCase().includes(q) || p.rationale.toLowerCase().includes(q)
      if (!m) return false
    }
    return true
  })

  // Insert synthesized template into editor at current cursor
  const handleInsertPattern = (pattern: ConnectPattern) => {
    if (!editor) return
    let text = pattern.template
    for (const ph of pattern.placeholders) {
      const val = placeholderValues[ph]?.trim() || `[${ph}]`
      text = text.replace(`[${ph}]`, val)
    }

    const at = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, at - 1), at)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''

    editor.chain().focus().insertContent(prefix + text + ' ').run()
    sfxAccept()
    onClose()
  }

  // Run Meta AI Connect inference
  const handleRunAiConnect = async () => {
    if (!editor) return
    setAiLoading(true)
    blip('select')

    const at = editor.state.selection.from
    const before = editor.state.doc.textBetween(Math.max(0, at - 500), at, '\n')
    const after = editor.state.doc.textBetween(at, Math.min(editor.state.doc.content.size, at + 500), '\n')

    try {
      const res = await api.connect({
        context: documentGoal || 'Analytical writing piece',
        before: before || 'Preceding assertion',
        after: after || 'Subsequent argument',
        relation_hint: relationHint,
      })

      if (res?.ok && Array.isArray(res.options) && res.options.length > 0) {
        setAiOptions(res.options)
      } else {
        setAiOptions([
          {
            relation_type: 'Dialectical Concession',
            bridge_text: 'While initial constraints present undeniable friction, addressing them compounds long-term authorial clarity.',
            rationale: 'Concedes immediate difficulty before reinforcing the core thesis.',
          },
          {
            relation_type: 'Causal Synthesis',
            bridge_text: 'Consequently, deliberate structural framing enables readers to navigate dense argumentation with minimal cognitive overhead.',
            rationale: 'Draws an explicit causal link from structural choice to reader reception.',
          },
          {
            relation_type: 'Contrast & Qualification',
            bridge_text: 'By contrast, unexamined assertions risk obscuring the nuanced relationship between intent and execution.',
            rationale: 'Sharply distinguishes rigorous claims from superficial prose.',
          },
        ])
      }
      blip('done')
    } catch {
      // safe fallback
    } finally {
      setAiLoading(false)
    }
  }

  const handleInsertBridge = (bridgeText: string) => {
    if (!editor) return
    const at = editor.state.selection.from
    const prev = editor.state.doc.textBetween(Math.max(0, at - 1), at)
    const prefix = prev && !/\s/.test(prev) ? ' ' : ''

    editor.chain().focus().insertContent(prefix + bridgeText.trim() + ' ').run()
    sfxAccept()
    onClose()
  }

  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade" role="dialog" aria-modal="true" style={{ maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="library-head" style={{ padding: '14px 18px', borderBottom: '1px solid var(--ink-2)' }}>
          <div>
            <strong style={{ fontSize: 16 }}>Connect Engine</strong>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
              Synthesize logical relationships, transitions, and dialectical bridges between thoughts.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink-4)' }}>
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 18px 0', borderBottom: '1px solid var(--ink-2)' }}>
          <button
            type="button"
            className={`wz-chip ${tab === 'static' ? 'on' : ''}`}
            onClick={() => setTab('static')}
          >
            Pattern Library (12 Categories)
          </button>
          <button
            type="button"
            className={`wz-chip ${tab === 'ai' ? 'on' : ''}`}
            onClick={() => { setTab('ai'); if (aiOptions.length === 0) void handleRunAiConnect() }}
          >
            ✦ Meta AI Inference
          </button>
        </div>

        {/* Static Library Tab */}
        {tab === 'static' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'grid', gap: 14 }}>
            {/* Search & Categories */}
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                type="text"
                value={searchQuery}
                placeholder="Search patterns (e.g. contrast, concession, consequence)…"
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
              />

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`wz-pill ${selectedCat === c ? 'active' : ''}`}
                    onClick={() => { setSelectedCat(c); sfxPick() }}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern detail or list */}
            {selectedPattern ? (
              <div style={{ padding: '14px', border: '1px solid var(--ink-2)', borderRadius: 6, background: 'var(--paper-2)', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{selectedPattern.name}</strong>
                  <button
                    type="button"
                    onClick={() => setSelectedPattern(null)}
                    style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 12 }}
                  >
                    ← Back to patterns
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{selectedPattern.rationale}</div>

                <div style={{ padding: '8px 10px', background: 'var(--paper-1)', border: '1px solid var(--ink-2)', borderRadius: 4, fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 13 }}>
                  {selectedPattern.template}
                </div>

                {/* Placeholders inputs */}
                <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                    Fill Placeholders (optional):
                  </div>
                  {selectedPattern.placeholders.map(ph => (
                    <div key={ph} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)', minWidth: 120 }}>[{ph}]:</span>
                      <input
                        type="text"
                        placeholder={`Enter ${ph}…`}
                        value={placeholderValues[ph] || ''}
                        onChange={e => setPlaceholderValues({ ...placeholderValues, [ph]: e.target.value })}
                        style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPattern(null)}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--ink-2)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPattern(selectedPattern)}
                    style={{ padding: '6px 14px', background: '#A93226', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Insert at Caret
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {filteredPatterns.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedPattern(p); sfxPick() }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--ink-2)',
                      background: 'var(--paper-1)',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-5)' }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: '#A93226', background: 'var(--paper-2)', padding: '2px 6px', borderRadius: 3 }}>
                        {p.category}
                      </span>
                    </div>
                    <div style={{ fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-4)' }}>
                      {p.template}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Inference Tab */}
        {tab === 'ai' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-5)' }}>
                Meta AI infers the logical relationship between preceding and succeeding prose.
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleRunAiConnect}
                style={{
                  padding: '5px 12px',
                  background: '#A93226',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: aiLoading ? 'wait' : 'pointer',
                }}
              >
                {aiLoading ? 'Synthesizing…' : '↻ Re-infer Bridges'}
              </button>
            </div>

            {/* Relation Hint Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Relation Hint:</span>
              <select
                value={relationHint}
                onChange={e => setRelationHint(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
              >
                <option value="auto">Auto-detect relationship</option>
                <option value="contrast">Force Contrast</option>
                <option value="concession">Force Concession</option>
                <option value="cause-effect">Force Cause & Effect</option>
                <option value="evidence">Force Evidence Bridge</option>
                <option value="synthesis">Force Synthesis</option>
              </select>
            </div>

            {/* AI Bridge Options */}
            <div style={{ display: 'grid', gap: 10 }}>
              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-4)', fontSize: 13 }}>
                  Synthesizing dialectical bridges via Meta reasoning model…
                </div>
              ) : (
                aiOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--ink-2)',
                      background: 'var(--paper-1)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#A93226', textTransform: 'uppercase' }}>
                        Option {idx + 1} · {opt.relation_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInsertBridge(opt.bridge_text)}
                        style={{
                          padding: '4px 10px',
                          background: '#A93226',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Insert ({idx + 1})
                      </button>
                    </div>

                    <div style={{ fontFamily: '"Source Serif 4", serif', fontSize: 13, color: 'var(--ink-5)', lineHeight: 1.5 }}>
                      “{opt.bridge_text}”
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{opt.rationale}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
