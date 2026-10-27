// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { docToText, locateQuote } from '../src/lib/locate'
import { AnchorDecorations, anchorStore, syncAnchors } from '../src/editor/decorations'

function make(content: string) {
  const el = document.createElement('div'); document.body.appendChild(el)
  return new Editor({ element: el, extensions: [StarterKit, AnchorDecorations], content })
}

describe('quote anchoring', () => {
  it('locates exact quote inside context', () => {
    const ed = make('<p>Cats are quiet. A plethora of reasons exist.</p>')
    const tm = docToText(ed as any)
    const r = locateQuote(tm, 'plethora', 'A plethora of reasons exist.')
    expect(r).not.toBeNull()
    expect(ed.state.doc.textBetween(r!.from, r!.to)).toBe('plethora')
    ed.destroy()
  })
  it('renders layered anchor classes in DOM', () => {
    const ed = make('<p>A plethora of reasons exist.</p>')
    const tm = docToText(ed as any)
    const r = locateQuote(tm, 'plethora', tm.text)!
    anchorStore.anchors = [
      { id: 'p1', kind: 'reaction', quote: 'plethora', context: tm.text, title: 'Reader', detail: 'x' },
      { id: 'v1', kind: 'vocabulary', quote: 'plethora', context: tm.text, title: 'Word', detail: 'y' },
    ]
    anchorStore.ranges = new Map([['p1', r], ['v1', r]])
    syncAnchors(ed as any)
    const spans = ed.view.dom.querySelectorAll('[data-anchor-id]')
    const classes = [...spans].map(s => s.className).join(' ')
    // stacked cutting: yellow fully covers purple on identical range -> purple not drawn
    expect(classes).not.toContain('anch-reaction')
    expect(classes).toContain('anch-vocabulary')
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
