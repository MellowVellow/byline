import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

export type DiagramNode = { label: string; quote: string; context: string }

export default function Diagram({ source, caption, nodes, onNode }: { source: string; caption: string; nodes: DiagramNode[]; onNode: (n: DiagramNode) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState('')
  const [showSrc, setShowSrc] = useState(false)
  useEffect(() => {
    if (!source || !ref.current) return
    const dark = document.documentElement.dataset.theme === 'dark'
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' })
    const id = `mmd-${Math.random().toString(36).slice(2, 8)}`
    mermaid.render(id, source).then(({ svg }) => {
      if (ref.current) { ref.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } }); setErr('') }
    }).catch(e => setErr(String(e?.message || e).slice(0, 160)))
  }, [source])
  function click(e: any) {
    const t = (e.target as Element).textContent || ''
    const n = nodes.find(x => t.includes(x.label) || x.label.includes(t.trim())) || nodes.find(x => x.label.split(' ')[0] && t.includes(x.label.split(' ')[0]))
    if (n) onNode(n)
  }
  if (!source) return null
  return (
    <div className="diagram-card">
      {caption && <div className="quote-serif" style={{ marginBottom: 6 }}>{caption}</div>}
      {err ? <div className="meta">Diagram error: {err}</div> : <div ref={ref} className="diagram-svg" onClick={click} />}
      <button style={{ marginTop: 6 }} onClick={() => setShowSrc(v => !v)}>{showSrc ? 'Hide' : 'Mermaid'} source</button>
      {showSrc && <pre className="diagram-src">{source}</pre>}
    </div>
  )
}
