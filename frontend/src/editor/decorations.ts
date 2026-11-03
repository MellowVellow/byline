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

const KIND_COLORS: Record<string, string> = {
  reader: 'var(--ai)',
  reaction: 'var(--ai)',
  grammar: 'var(--lt)',
}

/** Resolve a CSS var to hex for SVG data URIs. */
function cssVarHex(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    if (/^#[0-9a-f]{6}$/i.test(v)) return v
    const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (m) return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('')
  } catch { /* fall through */ }
  return fallback
}

function squiggleBg(colorHex: string): string {
  const c = encodeURIComponent(colorHex)
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='5' viewBox='0 0 12 5'%3E%3Cpath d='M0 3.5 Q 3 0.5 6 2.5 T 12 2.5' fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E")`
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
      const style = a.kind === 'grammar'
        ? `background-image: ${squiggleBg(cssVarHex('--lt', '#D83343'))}; background-repeat: repeat-x; background-position: 0 100%; background-size: 12px 5px; padding-bottom: 6px; border-radius: 2px;`
        : `background-image: linear-gradient(90deg, ${color}, ${color}); background-size: 100% 2px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 4px; border-radius: 2px;`
      decos.push(Decoration.inline(g.from, g.to, {
        class: `anch anch-${a.kind}${anchorStore.linkedId === a.id ? ' anch-linked' : ''}`,
        'data-anchor-id': a.id,
        style,
      }))
    } else {
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

const holdKey = new PluginKey('byline-grammar-hold')
export const holdStore: { holds: Array<{ id: string; from: number; to: number }> } = { holds: [] }

const connectKey = new PluginKey('byline-connect')
export const connectStore: { ranges: Array<{ from: number; to: number }> } = { ranges: [] }

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

function buildConnect(doc: any): Decoration[] {
  const decos: Decoration[] = []
  for (const r of connectStore.ranges) {
    if (r.to <= doc.content.size && r.from < r.to) {
      decos.push(Decoration.inline(r.from, r.to, { class: 'connect-mark' }))
    }
  }
  return decos
}

/** Dispatch that only maps existing decorations through the transaction. */
export function redraw(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta('byline:redraw', true))
}
/** Rebuild anchor decorations from fresh ranges. */
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
export function syncConnect(editor: any) {
  if (editor?.view) editor.view.dispatch(editor.state.tr.setMeta(connectKey, { rebuild: true }))
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
      new Plugin({
        key: connectKey,
        state: {
          init: (_cfg, state) => DecorationSet.create(state.doc, buildConnect(state.doc)),
          apply: (tr, set) => {
            const mapped = set.map(tr.mapping, tr.doc)
            return tr.getMeta(connectKey)?.rebuild ? DecorationSet.create(tr.doc, buildConnect(tr.doc)) : mapped
          },
        },
        props: { decorations: (state) => connectKey.getState(state) },
      }),
    ]
  },
})
