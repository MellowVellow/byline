// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  flattenOutline,
  createOutlineSection,
  updateOutlineSection,
  deleteOutlineSection,
  moveOutlineSection,
  indentOutlineSection,
  outdentOutlineSection,
  compareOutlineWithDraft,
} from '../src/domain/outline'
import type { OutlineNode } from '../src/domain/document'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

if (typeof window !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as any
  }
  if (!Element.prototype.getClientRects) {
    Element.prototype.getClientRects = () => [] as any
  }
}

describe('Independent Outline Domain & Operations', () => {
  let initialOutline: OutlineNode[]

  beforeEach(() => {
    initialOutline = [
      { id: 'sec-1', title: '1. Introduction', description: 'Thesis and background', order: 1 },
      { id: 'sec-2', title: '2. Economic Arguments', description: 'Evaluate cost models', order: 2 },
      { id: 'sec-3', title: '3. Conclusion', description: 'Final synthesis', order: 3 },
    ]
  })

  it('creates, renames, edits notes, and deletes outline sections without modifying the draft', () => {
    // 1. Create a section
    const withNew = createOutlineSection(initialOutline, undefined, '4. Counterarguments', 'Address potential objections')
    expect(withNew).toHaveLength(4)
    expect(withNew[3].title).toBe('4. Counterarguments')
    expect(withNew[3].description).toBe('Address potential objections')
    expect(withNew[3].order).toBe(4)

    // 2. Rename section
    const renamed = updateOutlineSection(withNew, 'sec-2', { title: '2. Capital & Operating Costs' })
    expect(renamed.find(n => n.id === 'sec-2')?.title).toBe('2. Capital & Operating Costs')

    // 3. Edit notes / description
    const updatedNotes = updateOutlineSection(renamed, 'sec-2', { description: 'Updated financial analysis notes' })
    expect(updatedNotes.find(n => n.id === 'sec-2')?.description).toBe('Updated financial analysis notes')

    // 4. Delete section
    const afterDelete = deleteOutlineSection(updatedNotes, 'sec-3')
    expect(afterDelete).toHaveLength(3)
    expect(afterDelete.find(n => n.id === 'sec-3')).toBeUndefined()
  })

  it('reorders sections up and down independently', () => {
    // Move sec-2 up
    const movedUp = moveOutlineSection(initialOutline, 'sec-2', 'up')
    expect(movedUp.find(n => n.id === 'sec-2')?.order).toBe(1)
    expect(movedUp.find(n => n.id === 'sec-1')?.order).toBe(2)

    // Move sec-1 down
    const movedDown = moveOutlineSection(movedUp, 'sec-2', 'down')
    expect(movedDown.find(n => n.id === 'sec-2')?.order).toBe(2)
    expect(movedDown.find(n => n.id === 'sec-1')?.order).toBe(1)
  })

  it('nests sections (indent) and changes hierarchy (outdent)', () => {
    // Indent sec-2 under sec-1 (becomes child of sec-1)
    const nested = indentOutlineSection(initialOutline, 'sec-2')
    const sec2 = nested.find(n => n.id === 'sec-2')
    expect(sec2?.parentId).toBe('sec-1')

    // Flattening reflects the hierarchy and depth
    const flat = flattenOutline(nested)
    expect(flat[0].node.id).toBe('sec-1')
    expect(flat[0].depth).toBe(0)
    expect(flat[0].hasChildren).toBe(true)

    expect(flat[1].node.id).toBe('sec-2')
    expect(flat[1].depth).toBe(1)

    // Outdent sec-2 back to top-level
    const outdented = outdentOutlineSection(nested, 'sec-2')
    const sec2Out = outdented.find(n => n.id === 'sec-2')
    expect(sec2Out?.parentId).toBeUndefined()
  })

  it('preserves children when a parent section is deleted', () => {
    // Create hierarchy: sec-1 -> child-1
    const outlineWithChild: OutlineNode[] = [
      { id: 'sec-1', title: '1. Introduction', order: 1 },
      { id: 'child-1', title: '1.1 Background Context', parentId: 'sec-1', order: 1 },
      { id: 'sec-2', title: '2. Main Arguments', order: 2 },
    ]

    const afterDeleteParent = deleteOutlineSection(outlineWithChild, 'sec-1')
    expect(afterDeleteParent).toHaveLength(2)
    const reparentedChild = afterDeleteParent.find(n => n.id === 'child-1')
    expect(reparentedChild).toBeDefined()
    expect(reparentedChild?.parentId).toBeUndefined()
  })
})

describe('Separation of Spaces: Outline vs. Editor Draft', () => {
  let editor: Editor

  beforeEach(() => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    editor = new Editor({
      element: el,
      extensions: [StarterKit],
      content: '<h1>Draft Document</h1><p>Existing draft paragraph text that must be protected.</p>',
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  it('editing outline sections does not change the editor draft', () => {
    const initialDraftHtml = editor.getHTML()
    const outline: OutlineNode[] = [
      { id: 'o-1', title: 'Section Plan Alpha', description: 'Alpha notes', order: 1 },
    ]

    // Create outline section
    const nextOutline = createOutlineSection(outline, undefined, 'Section Plan Beta', 'Beta notes')
    // Rename outline section
    const renamed = updateOutlineSection(nextOutline, 'o-1', { title: 'Renamed Alpha Plan' })
    // Delete outline section
    const deleted = deleteOutlineSection(renamed, 'o-1')

    expect(deleted).toHaveLength(1)
    expect(deleted[0].title).toBe('Section Plan Beta')

    // Draft remains 100% identical and unchanged
    expect(editor.getHTML()).toBe(initialDraftHtml)
    expect(editor.getText()).toContain('Existing draft paragraph text')
    expect(editor.getText()).not.toContain('Section Plan Beta')
  })

  it('editing the draft does not change the outline', () => {
    const outline: OutlineNode[] = [
      { id: 'o-1', title: 'Section Plan Alpha', description: 'Alpha notes', order: 1 },
      { id: 'o-2', title: 'Section Plan Beta', description: 'Beta notes', order: 2 },
    ]
    const outlineClone = JSON.parse(JSON.stringify(outline))

    // Modify editor draft by inserting new text and headings
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent('<h2>Completely New Draft Section</h2><p>Additional drafting words.</p>').run()

    // Outline remains unchanged
    expect(outline).toEqual(outlineClone)
    expect(outline.find(n => n.title.includes('Completely New'))).toBeUndefined()
  })

  it('explicit action: user explicitly inserts outline section title at current cursor', () => {
    const initialText = editor.getText()

    // Move cursor to end of document
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).run()

    // Explicit action: Insert title at cursor
    const sectionToInsert: OutlineNode = {
      id: 'sec-explicit',
      title: '2. High-Speed Rail Economic Payback',
      order: 2,
    }
    editor.chain().focus().insertContent(`<h2>${sectionToInsert.title}</h2>\n`).run()

    // Draft now contains the title, while original draft text remains intact
    expect(editor.getText()).toContain(initialText)
    expect(editor.getText()).toContain('2. High-Speed Rail Economic Payback')
    expect(editor.getHTML()).toContain('<h2>2. High-Speed Rail Economic Payback</h2>')
  })

  it('explicit action: user copies outline content into draft without overwriting', () => {
    const initialText = editor.getText()
    const section: OutlineNode = {
      id: 'sec-notes',
      title: '3. Operating Yields',
      description: 'Long-term ridership trends and operational efficiency benchmarks.',
      order: 3,
    }

    // Explicit action: Copy content into draft at cursor
    const textToInsert = `<h2>${section.title}</h2>\n<p>${section.description}</p>\n`
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent(textToInsert).run()

    expect(editor.getText()).toContain(initialText)
    expect(editor.getText()).toContain('3. Operating Yields')
    expect(editor.getText()).toContain('Long-term ridership trends')
  })
})

describe('Independent Persistence & Reopening', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and restores outline and draft independently in localStorage', () => {
    const outline: OutlineNode[] = [
      { id: 'o-1', title: '1. Thesis', description: 'Core thesis notes', order: 1 },
      { id: 'o-2', title: '2. Evidence', description: 'Empirical datasets', order: 2 },
    ]
    const draftHtml = '<h1>My Custom Title</h1><p>My custom draft writing.</p>'

    // Persist independently
    localStorage.setItem('byline.doc.outline', JSON.stringify(outline))
    localStorage.setItem('byline.doc.html', draftHtml)

    // Reopen/restore
    const restoredOutline: OutlineNode[] = JSON.parse(localStorage.getItem('byline.doc.outline') || '[]')
    const restoredDraft = localStorage.getItem('byline.doc.html')

    expect(restoredOutline).toEqual(outline)
    expect(restoredDraft).toBe(draftHtml)

    // Modifying one does not affect the other
    const modifiedOutline = updateOutlineSection(restoredOutline, 'o-1', { title: '1. Updated Thesis' })
    localStorage.setItem('byline.doc.outline', JSON.stringify(modifiedOutline))

    expect(localStorage.getItem('byline.doc.html')).toBe(draftHtml)
    expect(JSON.parse(localStorage.getItem('byline.doc.outline')!)[0].title).toBe('1. Updated Thesis')
  })
})

describe('Supervisor Integration: Semantic Outline vs. Draft Comparison', () => {
  it('identifies planned outline sections missing from the draft without block links', () => {
    const outline: OutlineNode[] = [
      { id: 's-1', title: '1. Introduction', description: 'Runway and highway congestion dilemma', order: 1 },
      { id: 's-2', title: '2. Capital Cost Critique', description: 'Examine debt loads and upfront costs', order: 2 },
      { id: 's-3', title: '3. Environmental Carbon Dividends', description: 'Quantify lifecycle emissions reductions', order: 3 },
    ]

    // Draft that only covers the introduction and capital costs
    const draftText = `The Infrastructure Dilemma: High-Speed Rail in North America.
Critics frequently point to astronomical upfront capital expenditure and persistent debt loads incurred by regional authorities.`

    const { missingSections, coveredSections } = compareOutlineWithDraft(outline, draftText)

    // Section 1 and 2 are covered via title / keywords ("dilemma", "capital", "debt", "costs")
    // Section 3 (Environmental Carbon Dividends) is missing from the draft
    expect(missingSections.map(n => n.id)).toContain('s-3')
    expect(coveredSections.length).toBeGreaterThanOrEqual(1)
  })

  it('semantic comparison does not modify the outline or draft', () => {
    const outline: OutlineNode[] = [
      { id: 's-1', title: '1. Introduction', order: 1 },
      { id: 's-2', title: '2. Missing Point', order: 2 },
    ]
    const outlineCopy = JSON.parse(JSON.stringify(outline))
    const draftText = 'Existing draft text without the missing point.'

    const result = compareOutlineWithDraft(outline, draftText)
    expect(result.missingSections).toHaveLength(1)
    expect(outline).toEqual(outlineCopy) // Outline remains unchanged
  })
})
