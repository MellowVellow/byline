import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType }
    footnote: { setFootnote: (text: string) => ReturnType }
  }
}

/** Word-style page break: block atom, exports as real PageBreak in .docx */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() { return [{ tag: 'div[data-page-break]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-page-break': '', class: 'page-break' }), ['span', { class: 'page-break-label' }, 'Page break']]
  },
  addCommands() {
    return { setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name }) }
  },
})

let footnoteSeq = 0
/** Inline footnote reference; note text in `content` attr, numbered by order in doc at render/export */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null },
      content: { default: '' },
      label: {
        default: null,
        parseHTML: (el) => el.textContent?.trim() || null,
        renderHTML: (attrs) => ({ 'data-fn-label': attrs.label ?? '' }),
      },
    }
  },
  parseHTML() { return [{ tag: 'sup[data-footnote]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { 'data-footnote': '', class: 'footnote-ref', title: node.attrs.content || '' }), node.attrs.label ?? '†']
  },
  addCommands() {
    return {
      setFootnote: (text: string) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { id: `fn${++footnoteSeq}-${Date.now()}`, content: text } }),
    }
  },
})

/** Assign 1..n labels by document order; call before render/export */
export function collectFootnotes(json: any): { id: string; content: string; label: number }[] {
  const out: { id: string; content: string; label: number }[] = []
  const walk = (n: any) => {
    if (!n) return
    if (n.type === 'footnote') out.push({ id: n.attrs?.id || `fn${out.length + 1}`, content: n.attrs?.content || '', label: out.length + 1 })
    ;(n.content || []).forEach(walk)
  }
  walk(json)
  return out
}
