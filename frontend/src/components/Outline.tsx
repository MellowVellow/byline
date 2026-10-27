import { useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { TableOfContentData } from '@tiptap/extension-table-of-contents'

/**
 * Notion-like Outline (TipTap TableOfContents data):
 * H1–H6 hierarchy, hover row actions, active-heading tracking, drag-reorder sections.
 */
export default function Outline({ editor, data, onMove }: {
  editor: Editor
  data: TableOfContentData
  onMove: (srcSeg: number, dstSeg: number) => void
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.map((item, seg) => ({ item, seg })).filter(({ item }) => !q || item.textContent.toLowerCase().includes(q))
  }, [data, query])

  const goto = (item: TableOfContentData[number]) => {
    item.dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    editor.chain().focus().setTextSelection(item.pos + 1).run()
  }

  if (!data.length) return <div className="meta">No headings yet.</div>

  return (
    <div className="outline">
      <input className="outline-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter headings…" aria-label="Filter headings" />
      <nav aria-label="Document outline">
        {items.map(({ item, seg }) => (
          <div
            key={item.id}
            className={`outline-item${item.isActive ? ' active' : ''}${item.isScrolledOver ? ' scrolled' : ''}${over === seg && drag !== null && drag !== seg ? ' drop-target' : ''}`}
            style={{ paddingLeft: 8 + (item.level - 1) * 14 }}
            draggable
            onDragStart={() => setDrag(seg)}
            onDragEnd={() => { setDrag(null); setOver(null) }}
            onDragOver={e => { e.preventDefault(); setOver(seg) }}
            onDrop={e => { e.preventDefault(); if (drag !== null) onMove(drag, seg); setDrag(null); setOver(null) }}
            onClick={() => goto(item)}
            title={item.textContent}
          >
            <span className="outline-handle" aria-hidden>⠿</span>
            <span className={`outline-level l${item.level}`}>H{item.level}</span>
            <span className="outline-text">{item.textContent || '(untitled)'}</span>
            <span className="outline-jump" aria-hidden>↗</span>
          </div>
        ))}
        {!items.length && <div className="meta">No headings match.</div>}
      </nav>
    </div>
  )
}
