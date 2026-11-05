
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
