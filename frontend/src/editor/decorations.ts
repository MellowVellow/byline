import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Anchor } from '../lib/types'

export const anchorStore: { anchors: Anchor[]; ranges: Map<string, { from: number; to: number }>; ghost: string; ghostPos: number; linkedId: string | null } =
  { anchors: [], ranges: new Map(), ghost: '', ghostPos: 0, linkedId: null }
export type EditorMode = 'drafting' | 'editing'
export const modeStore: { mode: EditorMode } = { mode: 'drafting' }
const anchorKey = new PluginKey('byline-anchors')
const ghostKey = new PluginKey('byline-ghost')

// Draw order: red, yellow, blue, purple

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

// Underline palette: purple reader, red grammar.
const KIND_COLORS: Record<string, string> = {
  reader: 'var(--ai)',
  reaction: 'var(--ai)',
  grammar: 'var(--lt)',
}

function groupOverlapping(anchors: Array<{ id: string; kind: string; from: number; to: number }>): Array<{ items: typeof anchors; from: number; to: number }> {
  const sorted = [...anchors].sort((x, y) => x.from - y.from)
  const groups: Array<{ items: typeof anchors; from: number; to: number }> = []
  let cur: typeof anchors | null = null
  let curTo = -1

  for (const a of sorted) {
    if (cur === null || a.from >= curTo) {
      if (cur) groups.push({ items: cur, from: cur[0].from, to: curTo })
      cur = [a]
      curTo = a.to
    } else {
      cur.push(a)
      curTo = Math.max(curTo, a.to)
    }
  }
  if (cur) groups.push({ items: cur, from: cur[0].from, to: curTo })
  return groups
}

function buildAnchors(doc: any): Decoration[] {
  if (modeStore.mode !== 'editing') return []

  // Findings anchor sentence-scale quotes; a span beyond this is a stale or
  // misresolved anchor (e.g. whole-document), never a legitimate underline.
  const MAX_ANCHOR_CHARS = 500
  const anchors: Array<{ id: string; kind: string; from: number; to: number }> = []
  for (const a of anchorStore.anchors) {
    const r = anchorStore.ranges.get(a.id)
    if (!r || r.to > doc.content.size || r.from >= r.to) continue
    const span = r.to - r.from
    if (span > MAX_ANCHOR_CHARS) continue
    anchors.push({ id: a.id, kind: a.kind, from: r.from, to: r.to })
  }

  if (anchors.length === 0) return []

  const groups = groupOverlapping(anchors)
  const decos: Decoration[] = []

  for (const g of groups) {
    if (g.items.length === 1) {
      const a = g.items[0]
      const color = KIND_COLORS[a.kind] || 'var(--lt)'
      // Grammar underlines are wavy red (Harper feel); reader underlines stay solid.
      const wavy = a.kind === 'grammar' ? ' text-decoration-style: wavy;' : ''
      decos.push(Decoration.inline(g.from, g.to, {
        class: `anch anch-${a.kind}${anchorStore.linkedId === a.id ? ' anch-linked' : ''}`,
        'data-anchor-id': a.id,
        style: `text-decoration-line: underline;${wavy} text-decoration-color: ${color}; text-decoration-thickness: 2px; text-underline-offset: 3px; border-radius: 2px;`,
      }))
    } else {
      // Multiple overlapping anchors on same range -> merged gradient underline
      const stops = g.items.map((a, i) => {
        const c = KIND_COLORS[a.kind] || 'var(--lt)'
        const pct = Math.round((i / Math.max(1, g.items.length - 1)) * 100)
        return `${c} ${pct}%`
      })
      decos.push(Decoration.inline(g.from, g.to, {
        class: 'anch anch-merged' + (anchorStore.linkedId ? ' anch-linked' : ''),
        'data-anchor-ids': g.items.map(a => a.id).join(','),
        style: `background-image: linear-gradient(90deg, ${stops.join(', ')}); background-size: 100% 2px; background-repeat: no-repeat; background-position: bottom; padding-bottom: 4px; border-radius: 2px;`,
      }))
    }
  }

  return decos
}
function buildGhost(doc: any): Decoration[] {
  if (!anchorStore.ghost || anchorStore.ghostPos > doc.content.size) return []
  const el = document.createElement('span')
  el.className = 'ghost-text'; el.textContent = anchorStore.ghost; el.setAttribute('aria-hidden', 'true')
  return [Decoration.widget(anchorStore.ghostPos, el, { side: 1 })]
}

const flashKey = new PluginKey('byline-flash')
export const flashStore: { range: { from: number; to: number } | null } = { range: null }

function buildFlash(doc: any): Decoration[] {
  if (!flashStore.range || flashStore.range.to > doc.content.size || flashStore.range.from >= flashStore.range.to) return []
  return [
    Decoration.inline(flashStore.range.from, flashStore.range.to, {
      class: 'outline-flash-highlight',
    }),
  ]
}

const popKey = new PluginKey('byline-grammar-pop')
export const popStore: { pops: Array<{ id: string; from: number; to: number; expireAt: number }> } = { pops: [] }

// Red wavy underlines shown DURING the pre-fix hold so the writer sees
// exactly which text is about to be auto-fixed. Cleared when fixes apply.
const holdKey = new PluginKey('byline-grammar-hold')
export const holdStore: { holds: Array<{ id: string; from: number; to: number }> } = { holds: [] }

function buildPops(doc: any): Decoration[] {
  const now = Date.now()
  popStore.pops = popStore.pops.filter(p => p.expireAt > now)
  const decos: Decoration[] = []
  for (const p of popStore.pops) {
    if (p.to <= doc.content.size && p.from < p.to) {
      decos.push(Decoration.inline(p.from, p.to, { class: 'grammar-auto-pop' }))
    }
  }
  return decos
}

function buildHolds(doc: any): Decoration[] {
  const decos: Decoration[] = []
  for (const h of holdStore.holds) {
    if (h.to <= doc.content.size && h.from < h.to) {
      decos.push(Decoration.inline(h.from, h.to, { class: 'grammar-hold-mark' }))
    }
  }
  return decos
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
export function syncFlash(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(flashKey, { rebuild: true }))
}
export function syncPops(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(popKey, { rebuild: true }))
}
export function syncHolds(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(holdKey, { rebuild: true }))
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
      new Plugin({
        key: flashKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildFlash(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc)
            return tr.getMeta(flashKey)?.rebuild ? DecorationSet.create(tr.doc, buildFlash(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => flashKey.getState(state) },
      }),
      new Plugin({
        key: popKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildPops(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc)
            return tr.getMeta(popKey)?.rebuild ? DecorationSet.create(tr.doc, buildPops(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => popKey.getState(state) },
      }),
      new Plugin({
        key: holdKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildHolds(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc)
            return tr.getMeta(holdKey)?.rebuild ? DecorationSet.create(tr.doc, buildHolds(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => holdKey.getState(state) },
      }),
    ]
  },
})
