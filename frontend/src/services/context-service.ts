import type { Editor } from '@tiptap/react'
import type { DocumentContext, OutlineNode, WritingProfile } from '../domain/document'

export interface CursorContext {
  before: string
  after: string
  currentBlock: string
  cursorPos: number
}

export interface SelectionContext {
  selectedText: string
  beforeSelection: string
  afterSelection: string
  surroundingParagraph: string
  from: number
  to: number
}

export interface FullDocumentContext {
  fullText: string
  context: DocumentContext
  outline: OutlineNode[]
  profile: WritingProfile
}

export const contextService = {
  getCursorContext(editor: Editor, maxChars = 500): CursorContext {
    const at = editor.state.selection.from
    const docSize = editor.state.doc.content.size

    const before = editor.state.doc.textBetween(Math.max(0, at - maxChars), at, '\n')
    const after = editor.state.doc.textBetween(at, Math.min(docSize, at + maxChars), '\n')

    // Find current block text
    const $pos = editor.state.doc.resolve(at)
    const blockStart = $pos.start()
    const blockEnd = $pos.end()
    const currentBlock = editor.state.doc.textBetween(blockStart, blockEnd, '\n')

    return { before, after, currentBlock, cursorPos: at }
  },

  getSelectionContext(editor: Editor, maxSurrounding = 300): SelectionContext | null {
    const { from, to } = editor.state.selection
    if (from === to) return null

    const docSize = editor.state.doc.content.size
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    if (!selectedText.trim()) return null

    const beforeSelection = editor.state.doc.textBetween(Math.max(0, from - maxSurrounding), from, '\n')
    const afterSelection = editor.state.doc.textBetween(to, Math.min(docSize, to + maxSurrounding), '\n')

    const $pos = editor.state.doc.resolve(from)
    const surroundingParagraph = editor.state.doc.textBetween($pos.start(), $pos.end(), '\n')

    return {
      selectedText,
      beforeSelection,
      afterSelection,
      surroundingParagraph,
      from,
      to,
    }
  },

  getFullContext(
    editor: Editor,
    context: DocumentContext,
    outline: OutlineNode[],
    profile: WritingProfile
  ): FullDocumentContext {
    const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
    return {
      fullText,
      context,
      outline,
      profile,
    }
  },
}
