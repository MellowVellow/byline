import { useEffect, useMemo, useState } from 'react'
import type { Fact, Reading } from '../lib/types'
import { textFragmentUrl } from '../lib/link'

export default function SourcesLibrary({ facts, readings, onClose, onDeleteFact, onDeleteReading, onClear, onInsertFact }: {
  facts: Fact[]; readings: Reading[]; onClose: () => void
  onDeleteFact: (f: Fact) => void; onDeleteReading: (r: Reading) => void; onClear: () => void; onInsertFact: (f: Fact) => void
}) {
  const [tab, setTab] = useState<'facts' | 'sources'>('facts'), [q, setQ] = useState('')
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [onClose])
  const fs = useMemo(() => facts.filter(f => !q || `${f.fact} ${f.source_title}`.toLowerCase().includes(q.toLowerCase())), [facts, q])
  const rs = useMemo(() => readings.filter(r => !q || `${r.title} ${r.why} ${r.claim_quote}`.toLowerCase().includes(q.toLowerCase())), [readings, q])
  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade" role="dialog" aria-modal="true" aria-label="Facts and sources library" onMouseDown={e => e.stopPropagation()}>
        <div className="library-head"><strong>Library</strong><span className="meta">{facts.length} facts · {readings.length} sources · saved locally</span><span className="spacer" />
          <button onClick={onClear}>Clear all</button><button onClick={onClose}>Close <span className="kbd">Esc</span></button></div>
        <div className="library-scroll">
          <div className="dock-tabs" role="tablist" aria-label="Library collections">
            <button role="tab" aria-selected={tab === 'facts'} className={tab === 'facts' ? 'active' : ''} onClick={() => setTab('facts')}>Facts {facts.length > 0 && <span className="tab-badge">{facts.length}</span>}</button>
            <button role="tab" aria-selected={tab === 'sources'} className={tab === 'sources' ? 'active' : ''} onClick={() => setTab('sources')}>Sources {readings.length > 0 && <span className="tab-badge">{readings.length}</span>}</button>
          </div>
          <input style={{ width: '100%', marginBottom: 12 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…" aria-label="Filter library" />
          {tab === 'facts' && (fs.length ? fs.map((f, i) => (
            <div key={`${f.url}-${i}`} className="source-card">
              <span className="source-badge">Fact{f.locator ? ` · ${f.locator}` : ''}</span>
              <div className="source-why">{f.fact}</div>
              <div className="source-excerpt"><a href={f.url || '#'} target="_blank" rel="noreferrer">{f.source_title || f.url}</a>{f.excerpt ? ` — “${f.excerpt}”` : ''}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button onClick={() => onInsertFact(f)}>Insert citation</button><button aria-label={`Delete fact ${i + 1}`} onClick={() => onDeleteFact(f)}>Delete</button></div>
            </div>)) : <div className="meta">No facts yet — run Research in Sources.</div>)}
          {tab === 'sources' && (rs.length ? rs.map((r, i) => (
            <div key={`${r.url}-${i}`} className="source-card">
              <span className="source-badge">{r.label || 'source'}</span>
              <a className="source-title" href={textFragmentUrl(r.url, r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a>
              <div className="source-why">vs “{r.claim_quote}” — {r.why}</div>
              {r.excerpt && r.excerpt !== r.why && <div className="source-excerpt">“{r.excerpt}”</div>}
              <div style={{ marginTop: 8 }}><button aria-label={`Delete source ${i + 1}`} onClick={() => onDeleteReading(r)}>Delete</button></div>
            </div>)) : <div className="meta">No sources yet — run Search in Sources.</div>)}
        </div>
      </div>
    </div>
  )
}
