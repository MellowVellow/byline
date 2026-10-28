import { useEffect, useMemo, useState } from 'react'
import type { Fact, Reading } from '../lib/types'
import { textFragmentUrl } from '../lib/link'
import { safeUrl } from '../lib/layers'

export default function SourcesLibrary({ facts, readings, onClose, onDeleteFact, onDeleteReading, onClear, onInsertFact }: {
  facts: Fact[]; readings: Reading[]; onClose: () => void
  onDeleteFact: (f: Fact) => void; onDeleteReading: (r: Reading) => void; onClear: () => void; onInsertFact: (f: Fact) => void
}) {
  const [q, setQ] = useState(''); const [sel, setSel] = useState(0)
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [onClose])
  const fs = useMemo(() => facts.filter(f => !q || `${f.fact} ${f.source_title}`.toLowerCase().includes(q.toLowerCase())), [facts, q])
  const rs = useMemo(() => readings.filter(r => !q || `${r.title} ${r.why} ${r.claim_quote}`.toLowerCase().includes(q.toLowerCase())), [readings, q])
  const active = fs[sel] || fs[0]
  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade" role="dialog" aria-modal="true" aria-label="Sources workspace" style={{ width: 'min(1080px,97vw)' }} onMouseDown={e => e.stopPropagation()}>
        <div className="library-head"><strong>Sources</strong><span className="meta">{facts.length} facts · {readings.length} checked claims · saved locally</span><span className="spacer" />
          <button onClick={onClear}>Clear all</button><button onClick={onClose}>Close <span className="kbd">Esc</span></button></div>
        <div className="library-scroll">
          <input style={{ width: '100%', marginBottom: 12 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Filter sources, facts, claims…" aria-label="Filter library" />
          <div className="notebook-grid">
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Library</div>
              {fs.map((f, i) => <div key={i} className={`dock-item ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}><div className="source-why" style={{ fontSize: 13 }}>{f.fact}</div><div className="meta">{f.source_title || f.url}</div></div>)}
              {!fs.length && <div className="meta">No facts yet — run Research in Sources.</div>}
              {rs.map((r, i) => <div key={'r' + i} className="dock-item"><span className={`source-badge verdict-${r.verdict || r.label}`}>{r.verdict || r.label}</span><div className="meta">{r.title}</div></div>)}
            </div>
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Evidence</div>
              {active ? <><div className="source-why">{active.fact}</div><div className="source-excerpt"><a href={safeUrl(active.url || '#')} target="_blank" rel="noreferrer">{active.source_title || active.url}</a>{active.excerpt ? ` — “${active.excerpt}”` : ''}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><button onClick={() => onInsertFact(active)}>Insert citation</button><button onClick={() => onDeleteFact(active)}>Delete</button></div></>
              : <div className="meta">Select a fact.</div>}
            </div>
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Checked claims</div>
              {rs.map((r, i) => <div key={i} className="source-card"><span className={`source-badge verdict-${r.verdict || r.label}`}>{r.verdict || r.label || 'source'}</span>
                <a className="source-title" href={textFragmentUrl(safeUrl(r.url), r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a>
                <div className="source-why">Claim: “{r.claim_quote}”</div>
                <div className="source-why">Evidence <strong>{r.verdict || r.label}</strong> this claim: {r.why}</div>
                {r.excerpt && r.excerpt !== r.why && <div className="source-excerpt">“{r.excerpt}”</div>}
                {r.domain && <div className="meta">{r.domain}</div>}
                <div style={{ marginTop: 8 }}><button onClick={() => onDeleteReading(r)}>Delete</button></div></div>)}
              {!rs.length && <div className="meta">No checked claims yet — run Search in Sources.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
