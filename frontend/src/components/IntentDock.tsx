import React, { useState } from 'react'
import type { DocumentContext, OutlineNode } from '../domain/document'
import type { Editor } from '@tiptap/react'
import { blip, sfxPick } from '../lib/sfx'
import OutlineEditor from './OutlineEditor'

export interface IntentDockProps {
  context: DocumentContext
  onContextChange: (ctx: DocumentContext) => void
  outline: OutlineNode[]
  onOutlineChange: (nodes: OutlineNode[]) => void
  editor?: Editor | null
  activeNodeId?: string | null
  onNodeClick?: (node: OutlineNode) => void
  onToggleCollapse?: () => void
  onInsertHeading?: (title: string, level: 1 | 2 | 3, parentId?: string | null) => void
  onInsertTitleAtCursor?: (title: string) => void
  onCopyOutlineContent?: (node: OutlineNode) => void
  onExpandSection?: (node: OutlineNode) => void
}

/**
 * Left Dock: Intent & Outline
 * Houses the independent Outline planning space and Document Context.
 * Outline changes do not automatically mutate the main draft.
 */
export default function IntentDock({
  context,
  onContextChange,
  outline,
  onOutlineChange,
  onToggleCollapse,
  onInsertHeading,
  onInsertTitleAtCursor,
  onCopyOutlineContent,
  onExpandSection,
}: IntentDockProps) {
  const [activeTab, setActiveTab] = useState<'context' | 'outline'>('outline')
  const [newKeyIdea, setNewKeyIdea] = useState('')
  const [newConstraint, setNewConstraint] = useState('')

  // Map legacy onInsertHeading to onInsertTitleAtCursor if not explicitly provided
  const handleInsertTitle = onInsertTitleAtCursor || (onInsertHeading ? (title: string) => onInsertHeading(title, 2, null) : undefined)

  const addKeyIdea = () => {
    if (!newKeyIdea.trim()) return
    const keyIdeas = [...(context.keyIdeas || []), newKeyIdea.trim()]
    onContextChange({ ...context, keyIdeas })
    setNewKeyIdea('')
    sfxPick()
  }

  const removeKeyIdea = (index: number) => {
    const keyIdeas = (context.keyIdeas || []).filter((_, i) => i !== index)
    onContextChange({ ...context, keyIdeas })
  }

  const addConstraint = () => {
    if (!newConstraint.trim()) return
    const constraints = [...(context.constraints || []), newConstraint.trim()]
    onContextChange({ ...context, constraints })
    setNewConstraint('')
    sfxPick()
  }

  const removeConstraint = (index: number) => {
    const constraints = (context.constraints || []).filter((_, i) => i !== index)
    onContextChange({ ...context, constraints })
  }

  return (
    <div className="dock" style={{ height: '100%', display: 'flex', flexDirection: 'column', margin: 0, padding: 12 }}>
      {/* Dock Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
          <span className="swatch" style={{ background: 'var(--pencil, #1765CC)' }} />
          Intent & Outline
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="meta" style={{ fontSize: 11 }}>
            {activeTab === 'context' ? 'Context' : `${outline.length} ${outline.length === 1 ? 'section' : 'sections'}`}
          </span>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse Intent Dock"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '2px 6px',
                minHeight: 'auto',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ‹
            </button>
          )}
        </div>
      </div>

      {/* Dock Tabs */}
      <div className="dock-tabs" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={activeTab === 'outline' ? 'active' : ''}
          onClick={() => {
            blip('select')
            setActiveTab('outline')
          }}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Outline
          <span className="tab-badge">{outline.length}</span>
        </button>
        <button
          type="button"
          className={activeTab === 'context' ? 'active' : ''}
          onClick={() => {
            blip('select')
            setActiveTab('context')
          }}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Context
          <span className="tab-badge">{context.topic ? '1' : '0'}</span>
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div
        className="rail-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: 4,
          paddingBottom: 12,
          overflowWrap: 'break-word',
          minHeight: 0,
        }}
      >
        {activeTab === 'outline' && (
          <OutlineEditor
            outline={outline}
            onOutlineChange={onOutlineChange}
            onInsertTitleAtCursor={handleInsertTitle}
            onCopyOutlineContent={onCopyOutlineContent}
            onExpandSection={onExpandSection}
          />
        )}

        {activeTab === 'context' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Topic / Thesis
              </label>
              <textarea
                rows={2}
                value={context.topic || ''}
                placeholder="What is this piece about?"
                onChange={e => onContextChange({ ...context, topic: e.target.value })}
                style={{ width: '100%', minHeight: 48, resize: 'vertical', overflowWrap: 'break-word', whiteSpace: 'normal', minWidth: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Purpose / Goal
              </label>
              <input
                type="text"
                value={context.purpose || ''}
                placeholder="e.g. Argue, explain, or analyze"
                onChange={e => onContextChange({ ...context, purpose: e.target.value })}
                style={{ width: '100%', overflowWrap: 'break-word', whiteSpace: 'normal', minWidth: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Audience
              </label>
              <input
                type="text"
                value={context.audience || ''}
                placeholder="Target readers"
                onChange={e => onContextChange({ ...context, audience: e.target.value })}
                style={{ width: '100%', overflowWrap: 'break-word', whiteSpace: 'normal', minWidth: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Background
              </label>
              <textarea
                rows={2}
                value={context.background || ''}
                placeholder="Stakes, context, or assignment constraints"
                onChange={e => onContextChange({ ...context, background: e.target.value })}
                style={{ width: '100%', minHeight: 44, resize: 'vertical', overflowWrap: 'break-word', whiteSpace: 'normal', minWidth: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Key Ideas
              </label>
              <div style={{ display: 'grid', gap: 5, marginTop: 4 }}>
                {(context.keyIdeas || []).map((idea, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius)',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: 10 }}>•</span>
                    <span style={{ flex: 1, color: 'var(--ink)' }}>{idea}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyIdea(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, minHeight: 'auto', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                  <input
                    type="text"
                    value={newKeyIdea}
                    placeholder="Add an assertion…"
                    onChange={e => setNewKeyIdea(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyIdea()
                      }
                    }}
                    style={{ flex: 1, minHeight: 32, fontSize: 12, minWidth: 0 }}
                  />
                  <button type="button" onClick={addKeyIdea} style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}>
                    + Add
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Constraints / Relevant Facts
              </label>
              <div style={{ display: 'grid', gap: 5, marginTop: 4 }}>
                {(context.constraints || []).map((idea, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius)',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: 10 }}>•</span>
                    <span style={{ flex: 1, color: 'var(--ink)' }}>{idea}</span>
                    <button
                      type="button"
                      onClick={() => removeConstraint(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, minHeight: 'auto', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                  <input
                    type="text"
                    value={newConstraint}
                    placeholder="Add a constraint…"
                    onChange={e => setNewConstraint(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addConstraint()
                      }
                    }}
                    style={{ flex: 1, minHeight: 32, fontSize: 12, minWidth: 0 }}
                  />
                  <button type="button" onClick={addConstraint} style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}>
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
