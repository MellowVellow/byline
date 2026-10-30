import React, { useState } from 'react'
import type { OutlineNode } from '../domain/document'
import {
  flattenOutline,
  createOutlineSection,
  updateOutlineSection,
  deleteOutlineSection,
  moveOutlineSection,
  indentOutlineSection,
  outdentOutlineSection,
} from '../domain/outline'
import { blip, sfxPick } from '../lib/sfx'

export interface OutlineEditorProps {
  outline: OutlineNode[]
  onOutlineChange: (nodes: OutlineNode[]) => void
  onInsertTitleAtCursor?: (title: string) => void
  onCopyOutlineContent?: (node: OutlineNode) => void
  onExpandSection?: (node: OutlineNode) => void
}

/**
 * Lightweight, structured Outline Editor.
 * Works as an independent, editable planning space alongside the main editor.
 * Changes here NEVER automatically mutate the editor draft.
 */
export default function OutlineEditor({
  outline,
  onOutlineChange,
  onInsertTitleAtCursor,
  onCopyOutlineContent,
  onExpandSection,
}: OutlineEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  const flattened = flattenOutline(outline)

  const filtered = filterQuery.trim()
    ? flattened.filter(({ node }) => {
        const q = filterQuery.toLowerCase()
        return (
          node.title.toLowerCase().includes(q) ||
          (node.description || '').toLowerCase().includes(q) ||
          (node.notes || '').toLowerCase().includes(q)
        )
      })
    : flattened

  const startEditing = (node: OutlineNode) => {
    blip('select')
    setEditingId(node.id)
    setEditTitle(node.title)
  }

  const commitTitle = (id: string) => {
    if (editTitle.trim()) {
      onOutlineChange(updateOutlineSection(outline, id, { title: editTitle.trim() }))
    }
    setEditingId(null)
  }

  const handleUpdateNotes = (id: string, notes: string) => {
    onOutlineChange(updateOutlineSection(outline, id, { description: notes, notes }))
  }

  const handleAddSection = (parentId?: string) => {
    sfxPick()
    const next = createOutlineSection(outline, parentId)
    onOutlineChange(next)
    // Focus the newly added node for editing
    const added = next[next.length - 1]
    if (added) {
      setEditingId(added.id)
      setEditTitle(added.title)
    }
  }

  const handleDelete = (id: string) => {
    sfxPick()
    onOutlineChange(deleteOutlineSection(outline, id))
    if (editingId === id) setEditingId(null)
    setActiveMenuId(null)
  }

  const handleMove = (id: string, dir: 'up' | 'down') => {
    sfxPick()
    onOutlineChange(moveOutlineSection(outline, id, dir))
  }

  const handleIndent = (id: string) => {
    sfxPick()
    onOutlineChange(indentOutlineSection(outline, id))
  }

  const handleOutdent = (id: string) => {
    sfxPick()
    onOutlineChange(outdentOutlineSection(outline, id))
  }

  const toggleNotes = (id: string) => {
    blip('select')
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="outline-editor" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Intro header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="meta" style={{ margin: 0, fontSize: 12 }}>
          Writer's planning space (independent from draft).
        </p>
        <span className="tab-badge" style={{ fontSize: 11 }}>
          {outline.length} {outline.length === 1 ? 'section' : 'sections'}
        </span>
      </div>

      {/* Filter / Search input if there are multiple sections */}
      {outline.length > 4 && (
        <input
          type="text"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder="Filter outline sections…"
          style={{
            width: '100%',
            fontSize: 12,
            padding: '5px 8px',
            borderRadius: 'var(--radius, 6px)',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Sections List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40 }}>
        {outline.length === 0 ? (
          <div
            className="meta"
            style={{
              padding: '16px 10px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius, 8px)',
            }}
          >
            No outline sections yet. Click <strong>+ Add Section</strong> to start planning.
          </div>
        ) : filtered.length === 0 ? (
          <div className="meta" style={{ padding: '12px 6px', textAlign: 'center' }}>
            No sections match "{filterQuery}".
          </div>
        ) : (
          filtered.map(({ node, depth }) => {
            const isEditing = editingId === node.id
            const showNotes = !!expandedNotes[node.id] || !!(node.description || node.notes)
            const indentPx = Math.min(depth * 18, 54)
            const isMenuOpen = activeMenuId === node.id

            return (
              <div
                key={node.id}
                style={{
                  marginLeft: indentPx,
                  background: 'var(--paper, #fff)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius, 8px)',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Row 1: Depth badge, Title, and Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="outline-level"
                    title={`Nesting level ${depth + 1}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: depth === 0 ? 'var(--blue, #1765CC)' : 'var(--muted)',
                      background: depth === 0 ? 'color-mix(in srgb, var(--blue, #1765CC) 12%, transparent)' : 'rgba(127,127,127,0.12)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {depth === 0 ? 'SEC' : `L${depth + 1}`}
                  </span>

                  {/* Title or Title Input */}
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => commitTitle(node.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitTitle(node.id)
                        } else if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '2px 6px',
                        border: '1px solid var(--blue, #1765CC)',
                        borderRadius: 4,
                        background: 'transparent',
                        color: 'var(--ink)',
                        minWidth: 0,
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditing(node)}
                      onClick={() => !isEditing && startEditing(node)}
                      title="Click or double-click to rename section"
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {node.title}
                    </span>
                  )}

                  {/* Quick hierarchy & reorder buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* Move Up */}
                    <button
                      type="button"
                      onClick={() => handleMove(node.id, 'up')}
                      title="Move Up"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '1px 3px',
                        fontSize: 12,
                        borderRadius: 3,
                      }}
                    >
                      ▲
                    </button>
                    {/* Move Down */}
                    <button
                      type="button"
                      onClick={() => handleMove(node.id, 'down')}
                      title="Move Down"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '1px 3px',
                        fontSize: 12,
                        borderRadius: 3,
                      }}
                    >
                      ▼
                    </button>
                    {/* Outdent */}
                    {node.parentId && (
                      <button
                        type="button"
                        onClick={() => handleOutdent(node.id)}
                        title="Outdent (Promote)"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          padding: '1px 3px',
                          fontSize: 11,
                          borderRadius: 3,
                        }}
                      >
                        ◀
                      </button>
                    )}
                    {/* Indent */}
                    <button
                      type="button"
                      onClick={() => handleIndent(node.id)}
                      title="Indent (Nest under previous section)"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '1px 3px',
                        fontSize: 11,
                        borderRadius: 3,
                      }}
                    >
                      ▶
                    </button>
                    {/* Add child */}
                    <button
                      type="button"
                      onClick={() => handleAddSection(node.id)}
                      title="Add child section"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        fontSize: 11,
                        borderRadius: 3,
                      }}
                    >
                      +
                    </button>
                    {/* Actions Menu Toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : node.id)}
                      title="Section Actions"
                      style={{
                        background: isMenuOpen ? 'var(--hover)' : 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        fontSize: 13,
                        borderRadius: 3,
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu for explicit transfer & delete actions */}
                {isMenuOpen && (
                  <div
                    style={{
                      background: 'var(--dock, #fff)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius, 6px)',
                      padding: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      marginTop: 2,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 10,
                    }}
                  >
                    {onInsertTitleAtCursor && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null)
                          onInsertTitleAtCursor(node.title)
                        }}
                        style={{
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: '5px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontSize: 12,
                        }}
                      >
                        ↳ Insert Title at Cursor
                      </button>
                    )}
                    {onCopyOutlineContent && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null)
                          onCopyOutlineContent(node)
                        }}
                        style={{
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: '5px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontSize: 12,
                        }}
                      >
                        📋 Copy Content to Draft
                      </button>
                    )}
                    {onExpandSection && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null)
                          onExpandSection(node)
                        }}
                        style={{
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: '5px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--blue, #1765CC)',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        ✨ Expand Section into Draft…
                      </button>
                    )}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2px 0' }} />
                    <button
                      type="button"
                      onClick={() => handleDelete(node.id)}
                      style={{
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '5px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: 'var(--red, #C0281F)',
                        fontSize: 12,
                      }}
                    >
                      ✕ Delete Section
                    </button>
                  </div>
                )}

                {/* Row 2: Notes / Description editor */}
                {showNotes ? (
                  <div style={{ marginTop: 2 }}>
                    <textarea
                      rows={2}
                      value={node.description || node.notes || ''}
                      onChange={e => handleUpdateNotes(node.id, e.target.value)}
                      placeholder="Add section notes, objectives, or key points…"
                      style={{
                        width: '100%',
                        fontSize: 12,
                        lineHeight: 1.45,
                        padding: '4px 6px',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        background: 'var(--bg)',
                        color: 'var(--muted)',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleNotes(node.id)}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Add note / description
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Toolbar: Add top-level section */}
      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => handleAddSection()}
          style={{
            flex: 1,
            padding: '7px 12px',
            border: '1px dashed var(--border)',
            background: 'transparent',
            borderRadius: 'var(--radius, 8px)',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink)',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          + Add Section
        </button>
      </div>
    </div>
  )
}
