import React, { useState, useRef } from 'react'
import type { OutlineNode } from '../domain/document'
import {
  flattenOutline,
  createOutlineSection,
  updateOutlineSection,
  deleteOutlineSection,
  reorderOrReparentOutlineSection,
  isDescendant,
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
 * Modern Godot / Notion-style Tree Outline Editor.
 * Sections are draggable and droppable into nested hierarchies (before, after, inside).
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

  // Drag and Drop State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)

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

  const toggleNotes = (id: string) => {
    blip('select')
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedNodeId(id)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedNodeId || draggedNodeId === targetId) return
    // Prevent cycles: cannot drag parent into its own descendant
    if (isDescendant(outline, draggedNodeId, targetId)) return

    const rect = e.currentTarget.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const height = rect.height

    let pos: 'before' | 'after' | 'inside'
    if (relY < height * 0.28) {
      pos = 'before'
    } else if (relY > height * 0.72) {
      pos = 'after'
    } else {
      pos = 'inside'
    }

    setDropTargetId(targetId)
    setDropPosition(pos)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving to outside the element
    const related = e.relatedTarget as Node | null
    if (!related || !e.currentTarget.contains(related)) {
      if (dropTargetId === e.currentTarget.getAttribute('data-node-id')) {
        setDropTargetId(null)
        setDropPosition(null)
      }
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedNodeId && dropPosition && draggedNodeId !== targetId) {
      if (!isDescendant(outline, draggedNodeId, targetId)) {
        const next = reorderOrReparentOutlineSection(outline, draggedNodeId, targetId, dropPosition)
        onOutlineChange(next)
        blip('done')
      }
    }

    setDraggedNodeId(null)
    setDropTargetId(null)
    setDropPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedNodeId(null)
    setDropTargetId(null)
    setDropPosition(null)
  }

  return (
    <div className="outline-editor" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Intro Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="meta" style={{ margin: 0, fontSize: 12 }}>
          Writer's plan (drag to nest or reorder).
        </p>
        <span className="tab-badge" style={{ fontSize: 11 }}>
          {outline.length} {outline.length === 1 ? 'section' : 'sections'}
        </span>
      </div>

      {/* Filter / Search input if there are multiple sections */}
      {outline.length > 5 && (
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

      {/* Sections Tree List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 40, position: 'relative' }}>
        {outline.length === 0 ? (
          <div
            className="meta"
            style={{
              padding: '20px 12px',
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
            const isMenuOpen = activeMenuId === node.id
            const isDraggingThis = draggedNodeId === node.id
            const isTarget = dropTargetId === node.id
            const isHovered = hoveredNodeId === node.id

            const indentPx = depth * 20

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onDragOver={e => handleDragOver(e, node.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, node.id)}
                onDragEnd={handleDragEnd}
                style={{
                  marginLeft: indentPx,
                  position: 'relative',
                  background: isTarget && dropPosition === 'inside'
                    ? 'color-mix(in srgb, var(--blue, #2563EB) 14%, var(--paper, #fff))'
                    : 'var(--paper, #fff)',
                  border: isTarget && dropPosition === 'inside'
                    ? '1.5px dashed var(--blue, #2563EB)'
                    : '1px solid var(--border)',
                  borderLeft: depth > 0
                    ? '2.5px solid color-mix(in srgb, var(--blue, #2563EB) 50%, var(--border))'
                    : isTarget && dropPosition === 'inside'
                      ? '1.5px dashed var(--blue, #2563EB)'
                      : '1px solid var(--border)',
                  borderRadius: 'var(--radius, 6px)',
                  padding: '6px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  opacity: isDraggingThis ? 0.4 : 1,
                  transition: 'background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease',
                  boxShadow: isTarget && dropPosition === 'inside'
                    ? '0 0 10px color-mix(in srgb, var(--blue, #2563EB) 20%, transparent)'
                    : 'none',
                }}
              >
                {/* Visual Drop Line: Before */}
                {isTarget && dropPosition === 'before' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -3,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'var(--blue, #2563EB)',
                      borderRadius: 2,
                      boxShadow: '0 0 8px var(--blue, #2563EB)',
                      zIndex: 30,
                    }}
                  />
                )}

                {/* Visual Drop Line: After */}
                {isTarget && dropPosition === 'after' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -3,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: 'var(--blue, #2563EB)',
                      borderRadius: 2,
                      boxShadow: '0 0 8px var(--blue, #2563EB)',
                      zIndex: 30,
                    }}
                  />
                )}

                {/* Row 1: Handle, Quick Add, Section Title, and Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%' }}>
                  {/* Drag Handle: 6 dots (Godot / Notion style) */}
                  <span
                    draggable
                    onDragStart={e => handleDragStart(e, node.id)}
                    title="Drag to reorder or nest inside another section"
                    aria-label="Drag handle"
                    style={{
                      cursor: 'grab',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isHovered ? 'var(--ink)' : 'var(--muted)',
                      opacity: isHovered ? 1 : 0.45,
                      padding: '2px 1px',
                      flexShrink: 0,
                      userSelect: 'none',
                      transition: 'opacity 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                      <circle cx="2.5" cy="2" r="1.3" />
                      <circle cx="7.5" cy="2" r="1.3" />
                      <circle cx="2.5" cy="7" r="1.3" />
                      <circle cx="7.5" cy="7" r="1.3" />
                      <circle cx="2.5" cy="12" r="1.3" />
                      <circle cx="7.5" cy="12" r="1.3" />
                    </svg>
                  </span>

                  {/* Quick Add sibling button (+) on hover */}
                  <button
                    type="button"
                    onClick={() => handleAddSection(node.parentId)}
                    title="Add section below"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: isHovered ? 'var(--ink)' : 'var(--muted)',
                      opacity: isHovered ? 0.9 : 0.3,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      minHeight: 'auto',
                      transition: 'opacity 0.15s ease, color 0.15s ease',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 2v8M2 6h8" />
                    </svg>
                  </button>

                  {/* Title or Inline Edit Input: takes full width of the block */}
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                          width: '100%',
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '2px 6px',
                          border: '1px solid var(--blue, #2563EB)',
                          borderRadius: 4,
                          background: 'transparent',
                          color: 'var(--ink)',
                          boxSizing: 'border-box',
                          minHeight: 24,
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => !isEditing && startEditing(node)}
                        title="Click to rename section"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.4,
                        }}
                      >
                        {node.title}
                      </div>
                    )}
                  </div>

                  {/* Drop position badge indicator when nesting */}
                  {isTarget && dropPosition === 'inside' && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--blue, #2563EB)',
                        background: 'color-mix(in srgb, var(--blue, #2563EB) 18%, transparent)',
                        padding: '1px 5px',
                        borderRadius: 3,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      ↳ Nest Inside
                    </span>
                  )}

                  {/* Actions right-aligned: Note toggle and ⋯ menu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {/* Note toggle icon */}
                    <button
                      type="button"
                      onClick={() => toggleNotes(node.id)}
                      title={showNotes ? 'Hide notes' : 'Add or view notes'}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: node.description || node.notes ? 'var(--blue, #2563EB)' : 'var(--muted)',
                        opacity: node.description || node.notes || isHovered ? 1 : 0.35,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: 11,
                        borderRadius: 3,
                        minHeight: 'auto',
                      }}
                    >
                      📝
                    </button>

                    {/* Section Actions Menu Toggle (⋯) */}
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : node.id)}
                      title="Section options"
                      style={{
                        background: isMenuOpen ? 'var(--hover)' : 'none',
                        border: 'none',
                        color: isHovered || isMenuOpen ? 'var(--ink)' : 'var(--muted)',
                        opacity: isHovered || isMenuOpen ? 1 : 0.4,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: 13,
                        borderRadius: 3,
                        minHeight: 'auto',
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu for explicit draft actions & deletion */}
                {isMenuOpen && (
                  <div
                    ref={menuRef}
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
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                      zIndex: 40,
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
                          padding: '6px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontSize: 12,
                          minHeight: 'auto',
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
                          padding: '6px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          fontSize: 12,
                          minHeight: 'auto',
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
                          padding: '6px 8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          color: 'var(--blue, #2563EB)',
                          fontWeight: 600,
                          fontSize: 12,
                          minHeight: 'auto',
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
                        padding: '6px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: 'var(--red, #C0281F)',
                        fontSize: 12,
                        minHeight: 'auto',
                      }}
                    >
                      ✕ Delete Section
                    </button>
                  </div>
                )}

                {/* Row 2: Notes / Description editor */}
                {showNotes && (
                  <div style={{ marginTop: 2, paddingLeft: 18 }}>
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
