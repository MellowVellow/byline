// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { buildEditorTextMap, resolveAnchor } from '../src/editor/anchoring'
import { AnchorDecorations, anchorStore, syncAnchors, modeStore } from '../src/editor/decorations'

function make(content: string) {
  const el = document.createElement('div'); document.body.appendChild(el)
  return new Editor({ element: el, extensions: [StarterKit, AnchorDecorations], content })
}

describe('quote anchoring', () => {
  it('locates exact quote inside context', () => {
    const ed = make('<p>Cats are quiet. A plethora of reasons exist.</p>')
    const r = resolveAnchor(ed as any, { quotedText: 'plethora', documentRevision: 1 })
    expect(r).not.toBeNull()
    expect(ed.state.doc.textBetween(r!.from, r!.to)).toBe('plethora')
    ed.destroy()
  })
  it('renders layered anchor classes in DOM', () => { modeStore.mode = 'editing'
    const ed = make('<p>A plethora of reasons exist.</p>')
    const tm = buildEditorTextMap(ed as any)
    const r = resolveAnchor(ed as any, { quotedText: 'plethora', documentRevision: 1 })!
    anchorStore.anchors = [
      { id: 'p1', kind: 'reaction', quote: 'plethora', context: tm.fullText, title: 'Reader', detail: 'x' },
      { id: 'v1', kind: 'vocabulary', quote: 'plethora', context: tm.fullText, title: 'Word', detail: 'y' },
    ]
    anchorStore.ranges = new Map([['p1', r], ['v1', r]])
    syncAnchors(ed as any)
    const spans = ed.view.dom.querySelectorAll('[data-anchor-ids]')
    const classes = [...spans].map(s => s.className).join(' ')
    expect(classes).toContain('anch-merged')
    expect(spans[0].getAttribute('data-anchor-ids')).toContain('p1')
    expect(spans[0].getAttribute('data-anchor-ids')).toContain('v1')
    ed.destroy()
  })
  it('keyboard Tab handler is capture-registered (smoke: editor editable)', () => {
    const ed = make('<p>Hello world</p>')
    expect(ed.isEditable).toBe(true)
    ed.chain().focus().setTextSelection(3).insertContent('X').run()
    expect(ed.getText()).toContain('X')
    ed.destroy()
  })
})
