import React, { useState } from 'react'
import type { DocumentContext, OutlineNode } from '../domain/document'
import type { Editor } from '@tiptap/react'
import { blip, sfxPick } from '../lib/sfx'

export interface IntentDockProps {
  context: DocumentContext
  onContextChange: (ctx: DocumentContext) => void
  outline: OutlineNode[]
  onOutlineChange: (nodes: OutlineNode[]) => void
  editor: Editor | null
}

export default function IntentDock({
  context,
  onContextChange,
  outline,
  onOutlineChange,
  editor,
}: IntentDockProps) {
  const [activeTab, setActiveTab] = useState<'context' | 'outline'>('context')
  const [newKeyIdea, setNewKeyIdea] = useState('')

  // Outline node navigation: scroll editor to matching heading text
  const navigateToNode = (node: OutlineNode) => {
    blip('select')
    if (!editor) return

    const { doc } = editor.state
    let targetPos = -1

    // Check headings first
    doc.descendants((pmNode, pos) => {
      if (pmNode.isBlock && pmNode.textContent.toLowerCase().includes(node.title.toLowerCase())) {
        targetPos = pos
        return false
      }
    })

    if (targetPos >= 0) {
      editor.chain().setTextSelection(targetPos).scrollIntoView().run()
    }
  }

  const addOutlineNode = () => {
    const nextOrder = outline.length + 1
    const newNode: OutlineNode = {
      id: `sec-${Date.now()}`,
      title: `${nextOrder}. New Section`,
      description: 'Describe the intended goal of this section…',
      order: nextOrder,
    }
    onOutlineChange([...outline, newNode])
    sfxPick()
  }

  const removeOutlineNode = (id: string) => {
    onOutlineChange(outline.filter(n => n.id !== id))
    sfxPick()
  }

  const updateOutlineNode = (id: string, patch: Partial<OutlineNode>) => {
    onOutlineChange(outline.map(n => (n.id === id ? { ...n, ...patch } : n)))
  }

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

  return (
    <aside className="dock dock-left" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Dock Header & Tabs */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--ink-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-4)' }}>
            Intent
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Writer Control</span>
        </div>

        <div className="dock-tabs" style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={activeTab === 'context' ? 'active' : ''}
            onClick={() => setActiveTab('context')}
            style={{ flex: 1, padding: '4px 0', fontSize: 12 }}
          >
            Context ({context.topic ? '1' : '0'})
          </button>
          <button
            type="button"
            className={activeTab === 'outline' ? 'active' : ''}
            onClick={() => setActiveTab('outline')}
            style={{ flex: 1, padding: '4px 0', fontSize: 12 }}
          >
            Outline ({outline.length})
          </button>
        </div>
      </div>

      {/* Dock Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'grid', gap: 14 }}>
        {/* Tab 1: Context */}
        {activeTab === 'context' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Topic / Thesis
              </label>
              <textarea
                rows={2}
                value={context.topic || ''}
                placeholder="What is this piece about?"
                onChange={e => onContextChange({ ...context, topic: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)', marginTop: 4, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Purpose / Goal
              </label>
              <input
                type="text"
                value={context.purpose || ''}
                placeholder="e.g. Argue, explain, or persuade"
                onChange={e => onContextChange({ ...context, purpose: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)', marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Audience
              </label>
              <input
                type="text"
                value={context.audience || ''}
                placeholder="Who will read this?"
                onChange={e => onContextChange({ ...context, audience: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)', marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Background & Stakes
              </label>
              <textarea
                rows={2}
                value={context.background || ''}
                placeholder="Underlying premises or context"
                onChange={e => onContextChange({ ...context, background: e.target.value })}
                style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)', marginTop: 4, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Key Ideas & Assertions
              </label>
              <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                {(context.keyIdeas || []).map((idea, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--paper-2)', padding: '4px 8px', borderRadius: 4 }}>
                    <span style={{ color: 'var(--ink-4)' }}>•</span>
                    <span style={{ flex: 1, color: 'var(--ink-5)' }}>{idea}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyIdea(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    value={newKeyIdea}
                    placeholder="Add an assertion or point…"
                    onChange={e => setNewKeyIdea(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyIdea() } }}
                    style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-1)', color: 'var(--ink-5)' }}
                  />
                  <button
                    type="button"
                    onClick={addKeyIdea}
                    style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--ink-2)', background: 'var(--paper-2)', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Outline */}
        {activeTab === 'outline' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
              Editable outline nodes. Click a node to navigate to its associated section in the editor.
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {outline.map(node => (
                <div
                  key={node.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--ink-2)',
                    background: 'var(--paper-1)',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={node.title}
                      onChange={e => updateOutlineNode(node.id, { title: e.target.value })}
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--ink-5)',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        width: '80%',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => navigateToNode(node)}
                        title="Jump to section in editor"
                        style={{ background: 'none', border: 'none', color: '#1765CC', cursor: 'pointer', fontSize: 12 }}
                      >
                        ↗
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOutlineNode(node.id)}
                        title="Delete node"
                        style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={node.description || ''}
                    placeholder="Section objective or prompt…"
                    onChange={e => updateOutlineNode(node.id, { description: e.target.value })}
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-4)',
                      border: 'none',
                      borderBottom: '1px dashed var(--ink-2)',
                      background: 'transparent',
                      padding: '2px 0',
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOutlineNode}
              style={{
                padding: '8px 12px',
                background: 'var(--paper-2)',
                border: '1px dashed var(--ink-2)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--ink-5)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Add Section Node
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
