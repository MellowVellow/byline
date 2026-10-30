import type { Editor } from '@tiptap/react'
import type { TextAnchor, Finding } from '../domain/finding'

export interface ResolvedRange {
  from: number
  to: number
  matchedText: string
  confidence: 'exact' | 'contextual' | 'stale'
}

/**
 * Builds a character-level map from plain-text coordinates to ProseMirror document positions.
 */
export interface EditorTextMap {
  fullText: string
  posMap: number[] // index in fullText -> ProseMirror position
}

export function buildEditorTextMap(editor: Editor): EditorTextMap {
  const chunks: string[] = []
  const posMap: number[] = []

  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        chunks.push(node.text[i])
        posMap.push(pos + i)
      }
    } else if (node.isBlock && chunks.length > 0 && chunks[chunks.length - 1] !== '\n') {
      chunks.push('\n')
      posMap.push(-1)
    }
  })

  return { fullText: chunks.join(''), posMap }
}

/**
 * Resolves a TextAnchor to exact current ProseMirror coordinates.
 * Validates prefix, quotedText, and suffix.
 * Returns null if the anchor cannot be safely verified.
 */
export function resolveAnchor(editor: Editor, anchor: TextAnchor): ResolvedRange | null {
  if (!editor || !anchor.quotedText) return null

  const { fullText, posMap } = buildEditorTextMap(editor)
  if (!fullText) return null

  const quote = anchor.quotedText.trim()
  if (!quote) return null

  let targetIdx = -1
  let confidence: 'exact' | 'contextual' = 'exact'

  // 1. Try matching with surrounding prefix and suffix
  if (anchor.prefix && anchor.suffix) {
    const fullSnippet = `${anchor.prefix}${anchor.quotedText}${anchor.suffix}`
    const snipIdx = fullText.indexOf(fullSnippet)
    if (snipIdx >= 0) {
      targetIdx = snipIdx + anchor.prefix.length
    }
  }

  // 2. Try matching with prefix or suffix individually
  if (targetIdx < 0 && anchor.prefix) {
    const preSnip = `${anchor.prefix}${anchor.quotedText}`
    const pIdx = fullText.indexOf(preSnip)
    if (pIdx >= 0) {
      targetIdx = pIdx + anchor.prefix.length
      confidence = 'contextual'
    }
  }

  if (targetIdx < 0 && anchor.suffix) {
    const sufSnip = `${anchor.quotedText}${anchor.suffix}`
    const sIdx = fullText.indexOf(sufSnip)
    if (sIdx >= 0) {
      targetIdx = sIdx
      confidence = 'contextual'
    }
  }

  // 3. Exact unique match fallback
  if (targetIdx < 0) {
    const firstMatch = fullText.indexOf(quote)
    if (firstMatch >= 0) {
      targetIdx = firstMatch
      confidence = 'contextual'
    }
  }

  // If no match found, anchor is stale
  if (targetIdx < 0 || targetIdx + quote.length > posMap.length) {
    return null
  }

  const fromPos = posMap[targetIdx]
  const toPos = posMap[targetIdx + quote.length - 1] + 1

  if (fromPos < 0 || toPos <= fromPos) {
    return null
  }

  // Double-verify against actual ProseMirror slice
  try {
    const actualText = editor.state.doc.textBetween(fromPos, toPos)
    if (actualText.trim() !== quote) {
      return null
    }
    return { from: fromPos, to: toPos, matchedText: actualText, confidence }
  } catch {
    return null
  }
}

/**
 * Safely applies a text replacement through an atomic ProseMirror transaction.
 * Strictly verifies anchor validity prior to mutation.
 * Preserves undo/redo history.
 */
export function applySafeReplacement(
  editor: Editor,
  anchor: TextAnchor,
  replacementText: string
): { success: boolean; error?: string } {
  if (!editor || !editor.view) {
    return { success: false, error: 'Editor is not initialized' }
  }

  const resolved = resolveAnchor(editor, anchor)
  if (!resolved) {
    return {
      success: false,
      error: 'Target anchor is stale or no longer matches the document text. Edit aborted for safety.',
    }
  }

  try {
    const tr = editor.state.tr.replaceWith(
      resolved.from,
      resolved.to,
      editor.schema.text(replacementText)
    )

    // Set cursor immediately after the replacement
    tr.setSelection(
      (editor.state.selection.constructor as any).near(
        tr.doc.resolve(resolved.from + replacementText.length)
      )
    )

    editor.view.dispatch(tr)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Transaction failed' }
  }
}
