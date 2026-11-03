// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextSelection } from '@tiptap/pm/state'
import { createConnectSession } from '../src/lib/connect'

describe('Connect apply transaction', () => {
  it('applies connectors across a multi-paragraph selection', () => {
    const editor = new Editor({
      extensions: [StarterKit],
      content: '<p>One claim.</p><p>Two claim.</p><p>Three claim.</p>',
    })
    const doc = editor.state.doc
    const from = 1
    const to = doc.content.size - 1
    const raw = doc.textBetween(from, to, ' ')
    const session = createConnectSession(from, raw, to)
    expect(session).not.toBeNull()

    const tr = editor.state.tr.insertText(session!.text, session!.from, session!.to)
    tr.setSelection(TextSelection.create(tr.doc, session!.from + session!.text.length))
    expect(() => editor.view.dispatch(tr)).not.toThrow()
    expect(editor.state.doc.textContent).toContain('Moreover, two claim.')
    editor.destroy()
  })
})
