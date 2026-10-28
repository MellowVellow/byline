import { useEffect, useMemo, useState } from 'react'
import type { Fact, Reading } from '../lib/types'
import { textFragmentUrl } from '../lib/link'
import { safeUrl, groupByClaim } from '../lib/layers'

export default function SourcesLibrary({ facts, readings, onClose, onDeleteFact, onDeleteReading, onClear, onInsertFact, citeStyle = 'apa', setCiteStyle, citeTemplate = '', setCiteTemplate, researchAuto = true, setResearchAuto, onCopyBibliography, formatFact }: {
  facts: Fact[]; readings: Reading[]; onClose: () => void
  onDeleteFact: (f: Fact) => void; onDeleteReading: (r: Reading) => void; onClear: () => void; onInsertFact: (f: Fact) => void
  citeStyle?: string; setCiteStyle?: (v: any) => void; citeTemplate?: string; setCiteTemplate?: (v: any) => void
  researchAuto?: boolean; setResearchAuto?: (v: boolean) => void; onCopyBibliography?: () => void; formatFact?: (f: Fact) => string
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <strong style={{ fontSize: 12.5 }}>Citation settings</strong>
            <select value={citeStyle} onChange={e => setCiteStyle?.(e.target.value)} aria-label="Citation style"><option value="apa">APA</option><option value="mla">MLA</option><option value="chicago">Chicago</option></select>
            <select value={citeTemplate} onChange={e => setCiteTemplate?.(e.target.value)} aria-label="Citation template"><option value="">Inline only</option><option value="support">Support</option><option value="contrast">Contrast</option><option value="stat">Stat</option><option value="define">Define</option></select>
            <label className="meta" style={{ display: 'flex', gap: 4, alignItems: 'center', margin: 0 }}><input type="checkbox" checked={researchAuto} onChange={e => setResearchAuto?.(e.target.checked)} />Auto-verify claims</label>
            <button onClick={() => onCopyBibliography?.()}>Copy bibliography</button>
            {active && formatFact && <span className="meta">Inline preview: {formatFact(active)}</span>}
          </div>
          <div className="notebook-grid">
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Library</div>
              {fs.map((f, i) => <div key={i} className={`dock-item ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}><div className="source-why" style={{ fontSize: 13 }}>{f.fact}</div><div className="meta">{f.source_title || f.url}</div></div>)}
              {!fs.length && <div className="meta">No facts yet — run Research in Sources.</div>}
              {groupByClaim(rs).map((grp, i) => <div key={'r' + i} className="dock-item"><div className="source-why" style={{ fontSize: 13 }}>“{grp.claim}”</div><div className="meta">{grp.items.length} source{grp.items.length === 1 ? '' : 's'}</div></div>)}
            </div>
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Evidence</div>
              {active ? <><div className="source-why">{active.fact}</div><div className="source-excerpt"><a href={safeUrl(active.url || '#')} target="_blank" rel="noreferrer">{active.source_title || active.url}</a>{active.excerpt ? ` — “${active.excerpt}”` : ''}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><button onClick={() => onInsertFact(active)}>Insert citation</button><button onClick={() => onDeleteFact(active)}>Delete</button></div></>
              : <div className="meta">Select a fact.</div>}
            </div>
            <div className="notebook-col"><div className="kind-label" style={{ color: 'var(--blue)' }}>Checked claims</div>
              {groupByClaim(rs).map((grp, gi) => <div key={gi} className="source-card claim-group"><span className="source-badge">Claim · {grp.items.length} source{grp.items.length === 1 ? '' : 's'}</span>
                <div className="source-why">“{grp.claim}”</div>
                <div className="claim-links">{grp.items.map((r, i) => <div key={i} className="claim-link"><span className={`source-badge verdict-${r.verdict || r.label}`}>{r.verdict || r.label || 'source'}</span> <a href={textFragmentUrl(safeUrl(r.url), r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a>{r.domain && <span className="meta"> · {r.domain}</span>} <button onClick={() => onDeleteReading(r)}>Delete</button></div>)}</div></div>)}
              {!rs.length && <div className="meta">No checked claims yet — run Search in Sources.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
