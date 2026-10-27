import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Anchor } from '../lib/types'

export const anchorStore: { anchors: Anchor[]; ranges: Map<string, { from: number; to: number }>; ghost: string; ghostPos: number; linkedId: string | null } =
  { anchors: [], ranges: new Map(), ghost: '', ghostPos: 0, linkedId: null }

const anchorKey = new PluginKey('byline-anchors')
const ghostKey = new PluginKey('byline-ghost')

// Draw order: red, yellow, blue, purple
const prio: Record<string, number> = { grammar: 0, vocabulary: 1, claim: 2, relevance: 3, reaction: 3 }

export function subtractRange(r: { from: number; to: number }, taken: { from: number; to: number }[]): { from: number; to: number }[] {
  let segs = [r]
  for (const t of taken) {
    const next: { from: number; to: number }[] = []
    for (const s of segs) {
      if (t.to <= s.from || s.to <= t.from) { next.push(s); continue }
      if (s.from < t.from) next.push({ from: s.from, to: t.from })
      if (t.to < s.to) next.push({ from: t.to, to: s.to })
    }
    segs = next
  }
  return segs.filter(s => s.to > s.from)
}

function buildAnchors(doc: any): Decoration[] {
  // stacked layers delete each other: red cuts yellow/blue/purple, yellow cuts blue/purple, etc.
  const ordered = [...anchorStore.anchors].sort((x, y) => (prio[x.kind] ?? 9) - (prio[y.kind] ?? 9) || (anchorStore.ranges.get(x.id)?.from ?? 0) - (anchorStore.ranges.get(y.id)?.from ?? 0))
  const decos: Decoration[] = []
  const taken: { from: number; to: number }[] = []
  for (const a of ordered) {
    const r = anchorStore.ranges.get(a.id)
    if (!r || r.to > doc.content.size) continue
    for (const seg of subtractRange(r, taken)) {
      decos.push(Decoration.inline(seg.from, seg.to, { class: `anch anch-${a.kind}${a.tone ? ` tone-${a.tone}` : ''}${anchorStore.linkedId === a.id ? ' anch-linked' : ''}`, 'data-anchor-id': a.id }))
    }
    taken.push(r)
  }
  return decos
}
function buildGhost(doc: any): Decoration[] {
  if (!anchorStore.ghost || anchorStore.ghostPos > doc.content.size) return []
  const el = document.createElement('span')
  el.className = 'ghost-text'; el.textContent = anchorStore.ghost; el.setAttribute('aria-hidden', 'true')
  return [Decoration.widget(anchorStore.ghostPos, el, { side: 1 })]
}

/** Dispatch that only maps existing decorations through the transaction (no stale-range rebuild). */
export function redraw(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta('byline:redraw', true))
}
/** Rebuild anchor decorations from fresh ranges (call only after fresh locate). */
export function syncAnchors(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(anchorKey, { rebuild: true }))
}
export function syncGhost(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(ghostKey, { rebuild: true }))
}

export const AnchorDecorations = Extension.create({
  name: 'anchorDecorations',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: anchorKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildAnchors(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc) // underlines follow text while typing
            return tr.getMeta(anchorKey)?.rebuild ? DecorationSet.create(tr.doc, buildAnchors(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => anchorKey.getState(state) },
      }),
      new Plugin({
        key: ghostKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildGhost(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc)
            return tr.getMeta(ghostKey)?.rebuild ? DecorationSet.create(tr.doc, buildGhost(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => ghostKey.getState(state) },
      }),
    ]
  },
})
