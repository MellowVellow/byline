import type { OutlineNode } from './document'

export interface FlattenedOutlineNode {
  node: OutlineNode
  depth: number
  hasChildren: boolean
  index: number
}

/**
 * Returns a flattened array of outline nodes in hierarchical order
 * (roots first, then their nested children, with computed depth).
 */
export function flattenOutline(nodes: OutlineNode[]): FlattenedOutlineNode[] {
  if (!nodes || nodes.length === 0) return []

  const nodeMap = new Map<string, OutlineNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  // Find root nodes (no parentId, or parentId does not exist in nodes)
  const rootNodes = nodes
    .filter(n => !n.parentId || !nodeMap.has(n.parentId))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const result: FlattenedOutlineNode[] = []

  function traverse(node: OutlineNode, depth: number) {
    const children = nodes
      .filter(n => n.parentId === node.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    result.push({
      node,
      depth,
      hasChildren: children.length > 0,
      index: result.length,
    })

    for (const child of children) {
      traverse(child, depth + 1)
    }
  }

  for (const root of rootNodes) {
    traverse(root, 0)
  }

  return result
}

/**
 * Create a new outline section.
 * Does not mutate the editor draft.
 */
export function createOutlineSection(
  nodes: OutlineNode[],
  parentId?: string,
  title?: string,
  description?: string
): OutlineNode[] {
  const siblings = nodes.filter(n => n.parentId === parentId)
  const nextOrder = Math.max(0, ...siblings.map(n => n.order ?? 0)) + 1
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const newNode: OutlineNode = {
    id,
    title: title?.trim() || `${nextOrder}. New Section`,
    description: description ?? '',
    parentId: parentId || undefined,
    order: nextOrder,
  }

  return [...nodes, newNode]
}

/**
 * Update an outline section (title, description/notes, etc.).
 * Does not mutate the editor draft.
 */
export function updateOutlineSection(
  nodes: OutlineNode[],
  id: string,
  patch: Partial<OutlineNode>
): OutlineNode[] {
  return nodes.map(n => (n.id === id ? { ...n, ...patch } : n))
}

/**
 * Delete an outline section.
 * Children of the deleted section are reparented to the deleted section's parent
 * so child sections/notes are not accidentally lost.
 * Does not mutate the editor draft.
 */
export function deleteOutlineSection(nodes: OutlineNode[], id: string): OutlineNode[] {
  const target = nodes.find(n => n.id === id)
  if (!target) return nodes

  const remaining = nodes
    .filter(n => n.id !== id)
    .map(n => (n.parentId === id ? { ...n, parentId: target.parentId } : n))

  return remaining
}

/**
 * Move an outline section up or down among its siblings.
 * Does not mutate the editor draft.
 */
export function moveOutlineSection(
  nodes: OutlineNode[],
  id: string,
  direction: 'up' | 'down'
): OutlineNode[] {
  const target = nodes.find(n => n.id === id)
  if (!target) return nodes

  const siblings = nodes
    .filter(n => n.parentId === target.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const index = siblings.findIndex(n => n.id === id)
  if (index < 0) return nodes

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= siblings.length) return nodes

  const other = siblings[targetIndex]
  const currentOrder = target.order ?? index + 1
  const otherOrder = other.order ?? targetIndex + 1

  return nodes.map(n => {
    if (n.id === target.id) return { ...n, order: otherOrder }
    if (n.id === other.id) return { ...n, order: currentOrder }
    return n
  })
}

/**
 * Indent an outline section: nests it under the sibling immediately before it.
 * Does not mutate the editor draft.
 */
export function indentOutlineSection(nodes: OutlineNode[], id: string): OutlineNode[] {
  const target = nodes.find(n => n.id === id)
  if (!target) return nodes

  const siblings = nodes
    .filter(n => n.parentId === target.parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const index = siblings.findIndex(n => n.id === id)
  if (index <= 0) return nodes // Cannot indent the first sibling

  const prevSibling = siblings[index - 1]
  const newChildren = nodes.filter(n => n.parentId === prevSibling.id)
  const nextOrder = Math.max(0, ...newChildren.map(n => n.order ?? 0)) + 1

  return nodes.map(n => {
    if (n.id === id) {
      return { ...n, parentId: prevSibling.id, order: nextOrder }
    }
    return n
  })
}

/**
 * Outdent an outline section: promotes a nested section to be a sibling of its parent.
 * Does not mutate the editor draft.
 */
export function outdentOutlineSection(nodes: OutlineNode[], id: string): OutlineNode[] {
  const target = nodes.find(n => n.id === id)
  if (!target || !target.parentId) return nodes // Already top-level

  const parent = nodes.find(n => n.id === target.parentId)
  const newParentId = parent ? parent.parentId : undefined
  const nextOrder = (parent?.order ?? 0) + 1

  return nodes.map(n => {
    if (n.id === id) {
      return { ...n, parentId: newParentId, order: nextOrder }
    }
    return n
  })
}

/**
 * Semantic/structural comparison between outline and draft.
 * Identifies planned outline sections that are missing or undeveloped in the draft.
 * Does not modify outline or draft.
 */
export function compareOutlineWithDraft(
  outline: OutlineNode[],
  draftText: string
): {
  missingSections: OutlineNode[]
  coveredSections: OutlineNode[]
} {
  if (!outline || outline.length === 0) {
    return { missingSections: [], coveredSections: [] }
  }

  const normalizedDraft = draftText.toLowerCase()
  const missingSections: OutlineNode[] = []
  const coveredSections: OutlineNode[] = []

  for (const node of outline) {
    // Strip leading numbering like "1. ", "2.3 "
    const cleanTitle = node.title.replace(/^[\d.]+\s*/, '').trim().toLowerCase()
    const descWords = (node.description || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4)

    // Check if title or significant keywords from notes/description appear in draft
    const titleMatches = cleanTitle.length > 2 && normalizedDraft.includes(cleanTitle)
    const keywordsFound = descWords.filter(w => normalizedDraft.includes(w))
    const keywordMatches = descWords.length > 0 && keywordsFound.length >= Math.min(2, descWords.length)

    if (titleMatches || keywordMatches) {
      coveredSections.push(node)
    } else {
      missingSections.push(node)
    }
  }

  return { missingSections, coveredSections }
}
