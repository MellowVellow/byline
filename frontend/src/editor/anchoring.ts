import type { Editor } from '@tiptap/react'
import type { TextAnchor, Finding } from '../domain/finding'

export interface ResolvedRange {
  from: number
  to: number
  matchedText: string
  confidence: 'exact' | 'contextual' | 'stale'
}

/**
 * Canonical plain-text separator. Must match every textBetween() call whose
 * offsets feed Harper spans or TextAnchor offsets ('\n' single).
 */
export const TEXT_SEP = '\n'

function nearestMatch(fullText: string, quote: string, hintIdx: number | null): number {
  if (hintIdx == null) return fullText.indexOf(quote)
  let idx = fullText.indexOf(quote)
  if (idx < 0) return -1
  let best = idx
  let bestDist = Math.abs(idx - hintIdx)
  while (true) {
    idx = fullText.indexOf(quote, idx + 1)
    if (idx < 0) break
    const d = Math.abs(idx - hintIdx)
    if (d < bestDist) {
      bestDist = d
      best = idx
    }
  }
  return best
}
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
    } else if (node.isBlock && chunks.length > 0 && chunks[chunks.length - 1] !== TEXT_SEP) {
      chunks.push(TEXT_SEP)
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

  // 0. Offset-aware fast path (Harper spans): map text offsets directly to
  // PM positions. Verifies quoted text to avoid fixing wrong ranges.
  // Separator slots map to -1 and are rejected explicitly (not via fallthrough).
  if (anchor.startOffset != null && anchor.endOffset != null && anchor.endOffset > anchor.startOffset) {
    const len = anchor.endOffset - anchor.startOffset
    if (anchor.startOffset >= 0 && anchor.endOffset <= posMap.length) {
      const fromPos = posMap[anchor.startOffset]
      const lastIdx = anchor.endOffset - 1
      const lastPos = posMap[lastIdx]
      if (fromPos == null || fromPos < 0 || lastPos == null || lastPos < 0) {
        return null
      }
      const toPos = lastPos + 1
      if (toPos > fromPos) {
        try {
          const actualText = editor.state.doc.textBetween(fromPos, toPos)
          // Exact or length-matched (Harper problem text may differ in case/trim)
          if (actualText === anchor.quotedText || actualText.trim() === quote || actualText.length === len) {
            return { from: fromPos, to: toPos, matchedText: actualText, confidence: 'exact' }
          }
        } catch { /* fall through to quote search */ }
      }
    }
  }

  const hint = anchor.startOffset ?? null
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

  // 3. Quote match nearest to the original offset (not first in doc —
  // first-match is what misapplied single-letter fixes like i→I).
  if (targetIdx < 0) {
    const firstMatch = nearestMatch(fullText, quote, hint)
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
  const lastPos = posMap[targetIdx + quote.length - 1]
  // Explicit separator rejection: a -1 slot means the span touches a synthetic
  // block boundary, so the offsets are not trustworthy.
  if (fromPos == null || fromPos < 0 || lastPos == null || lastPos < 0) {
    return null
  }
  const toPos = lastPos + 1

  if (toPos <= fromPos) {
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
// A programmatic replacement dispatches a doc change that is not typing.
// The flag lets the host tell ghost auto-fire apart from real keystrokes.
let programmaticApplyPending = false
export function markProgrammaticApply() { programmaticApplyPending = true }
/** Consume the flag (true when the last update came from an apply, not typing). */
export function consumeProgrammaticApplyFlag(): boolean {
  const v = programmaticApplyPending
  programmaticApplyPending = false
  return v
}

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

    markProgrammaticApply()
    editor.view.dispatch(tr)
    return { success: true }
  } catch (err: any) {
    programmaticApplyPending = false
    return { success: false, error: err?.message || 'Transaction failed' }
  }
}
