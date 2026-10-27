import type { Editor } from '@tiptap/react'

export type TextMap = { text: string; map: number[] } // plain idx -> PM pos (-1 = synthetic separator)

export function docToText(editor: Editor): TextMap {
  const chunks: string[] = []; const map: number[] = []
  editor.state.doc.forEach((node, offset) => {
    if (chunks.length) { chunks.push('\n\n'); map.push(-1, -1) }
    const text = node.textContent
    for (let i = 0; i < text.length; i++) map.push(offset + 1 + i)
    chunks.push(text)
  })
  return { text: chunks.join(''), map }
}

/** Locate exact quote, preferring occurrence inside verbatim context snippet. TipTap string-search anchoring. */
export function locateQuote(tm: TextMap, quote: string, context: string): { from: number; to: number } | null {
  if (!quote) return null
  let idx = -1
  if (context) {
    const ci = tm.text.indexOf(context)
    if (ci >= 0) { const qi = context.indexOf(quote); if (qi >= 0) idx = ci + qi }
  }
  if (idx < 0) idx = tm.text.indexOf(quote)
  if (idx < 0) return null
  const from = tm.map[idx]; const to = tm.map[idx + quote.length - 1]
  if (from == null || to == null || from < 0) return null
  return { from, to: to + 1 }
}

export function locateOffset(tm: TextMap, from: number, to: number): { from: number; to: number } | null {
  const f = tm.map[from]; const t = tm.map[to - 1]
  if (f == null || t == null || f < 0) return null
  return { from: f, to: t + 1 }
}
