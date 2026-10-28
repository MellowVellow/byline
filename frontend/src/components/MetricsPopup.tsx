import { Fragment, useEffect, useState } from 'react'
import { loadCalls, clearCalls, type CallEvent } from '../lib/metrics'
import { BENCH_MODELS, BENCH_MODES, BENCH_PROMPTS, BENCH_PARAMS } from '../lib/benchmarks'

export default function MetricsPopup({ summary, onClose }: { summary: string; onClose: () => void }) {
  const [calls, setCalls] = useState<CallEvent[]>(loadCalls)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const r = () => setCalls(loadCalls())
    addEventListener('keydown', f); addEventListener('byline-metrics', r)
    return () => { removeEventListener('keydown', f); removeEventListener('byline-metrics', r) }
  }, [onClose])
  const totIn = calls.reduce((n, c) => n + (c.usage?.in || 0), 0)
  const totOut = calls.reduce((n, c) => n + (c.usage?.out || 0), 0)
  const avg = calls.length ? Math.round(calls.reduce((n, c) => n + (c.ms || 0), 0) / calls.length) : 0
  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade metrics-modal" role="dialog" aria-modal="true" aria-label="Metrics and benchmarks" onMouseDown={e => e.stopPropagation()}>
        <div className="library-head"><strong>Metrics & benchmarks</strong><span className="meta">{summary}</span><span className="spacer" />
          <button onClick={() => { clearCalls(); setCalls([]) }}>Clear live log</button>
          <button onClick={onClose}>Close <span className="kbd">Esc</span></button></div>
        <div className="library-scroll">
          <div className="metrics-cards">
            <div className="metric-card"><strong>{calls.length}</strong><span>live calls (local)</span></div>
            <div className="metric-card"><strong>{avg}ms</strong><span>avg latency</span></div>
            <div className="metric-card"><strong>{totIn} / {totOut}</strong><span>tokens in / out</span></div>
            <div className="metric-card"><strong>{calls[0]?.model || '—'}</strong><span>latest model</span></div>
          </div>
          <h3 className="metrics-h">Live calls — this browser</h3>
          {!calls.length && <div className="meta">No calls yet — write in editor, suggestions/checks log here. Prompts stored locally only.</div>}
          {calls.length > 0 && <div className="metrics-table-wrap"><table className="metrics-table"><thead><tr><th>Time</th><th>Endpoint</th><th>Model</th><th>Params</th><th>Latency</th><th>Tokens in/out/reasoning</th><th>OK</th><th>Prompt</th></tr></thead>
            <tbody>{calls.map((c, i) => <Fragment key={c.ts + '-' + i}><tr><td>{new Date(c.ts).toLocaleTimeString()}</td><td>{c.endpoint}</td><td>{c.model}</td>
              <td className="meta">temp {c.params?.temperature} · max {c.params?.max_tokens} · effort {c.params?.reasoning_effort || '—'}</td>
              <td>{c.ms}ms</td><td>{c.usage?.in}/{c.usage?.out}/{c.usage?.reasoning}</td><td>{c.ok ? '✔︎' : '⚠︎'}</td>
              <td><button onClick={() => setOpen(open === i ? null : i)}>{open === i ? 'Hide' : 'Show'}</button></td></tr>
              {open === i && <tr><td colSpan={8}><pre className="metrics-prompt">SYSTEM:\n{c.prompt?.system}\n\nUSER:\n{c.prompt?.user}</pre></td></tr>}</Fragment>)}
            </tbody></table></div>}
          <h3 className="metrics-h">Benchmark — stored runs (results/bench_muse.json)</h3>
          <div className="meta" style={{ marginBottom: 8 }}>Settings: {BENCH_PARAMS} · Quote-verbatim validation 100% all models ✔︎</div>
          <div className="metrics-table-wrap"><table className="metrics-table"><thead><tr><th>Model</th><th>Case</th><th>Latency</th><th>In</th><th>Out</th><th>Reasoning</th><th>OK</th><th>Input prompt used</th></tr></thead>
            <tbody>{BENCH_MODELS.flatMap(m => m.rows.map(r => <tr key={m.model + r.case}><td>{m.model}<div className="meta">{m.provider}</div></td><td>{r.case}</td><td>{r.ms}ms</td><td>{r.inp}</td><td>{r.out}</td><td>{r.reasoning}</td><td>{r.ok}</td><td className="meta" style={{ maxWidth: 340 }}>{BENCH_PROMPTS[r.case]}</td></tr>))}</tbody></table></div>
          <h3 className="metrics-h">Benchmark — mode consumption (results/bench_modes.json)</h3>
          <div className="metrics-table-wrap"><table className="metrics-table"><thead><tr><th>Text</th><th>Mode</th><th>Calls</th><th>In</th><th>Out</th><th>Reasoning</th><th>Wall</th><th>Input prompt used</th></tr></thead>
            <tbody>{BENCH_MODES.map((r, i) => <tr key={i}><td>{r.text}</td><td>{r.mode}</td><td>{r.calls}</td><td>{r.inp}</td><td>{r.out}</td><td>{r.reasoning}</td><td>{r.ms}ms</td><td className="meta">API cycle: {r.mode} endpoints on seeded cats/dogs or medium lint text (bench/bench_modes.py)</td></tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  )
}
