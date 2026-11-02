import React, { useMemo, useRef, useState } from 'react'
import { ROWS, SRC, CHECK_LABEL, SOURCE_TYPES, type ResearchRow, type SourceRecord, type CheckState } from '../../data/mockResearch'
import type { ExploreSnapshot } from '../../data/mockLibrary'
import { api, type ExploreFinding } from '../../lib/api'
import { blip } from '../../lib/sfx'

export interface ExploreViewProps {
  onSaveToLibrary: (row: ResearchRow, source?: SourceRecord) => void
  savedIds: Set<number>
  initialQuery?: string
  startAtResults?: boolean
  /** Live snapshot of a saved conversation — shown instead of static rows. */
  initialSnapshot?: ExploreSnapshot | null
  onExploreComplete?: (query: string, snapshot?: ExploreSnapshot) => void
}

const STEPS = ['Searching for sources', 'Reading relevant material', 'Extracting findings', 'Organising results']

/** Source type assigned to live fetched pages (not in the static SOURCE_TYPES set). */
export const LIVE_SOURCE_TYPE = 'Web'
export const ALL_SOURCE_TYPES: string[] = [...(SOURCE_TYPES as unknown as string[]), LIVE_SOURCE_TYPE]

type Phase = 'init' | 'run' | 'results'

function toRows(findings: ExploreFinding[], angles: ExploreFinding[]): { rows: ResearchRow[]; src: Record<string, SourceRecord> } {
  const src: Record<string, SourceRecord> = {}
  const rows: ResearchRow[] = []
  const push = (f: ExploreFinding, fallbackType: string) => {
    const id = f.id
    if (f.url) {
      const key = `L${id}`
      let domain = ''
      try { domain = new URL(f.url).hostname } catch { domain = f.url }
      src[key] = {
        t: f.source_title || f.text.slice(0, 80) || 'Live source',
        a: 'Live web search', d: 'retrieved live', ty: 'Web',
        v: domain, u: f.url,
      }
      rows.push({
        id, type: f.type || fallbackType, text: f.text, main: key,
        st: (f.verdict === 'supports' ? 'supported' : f.verdict === 'contradicts' ? 'contradicted' : 'unverified') as CheckState,
        refs: [[key, 'primary']], why: f.why || 'Grounded in live web search results.',
        psg: f.excerpt || null, mat: f.source_title ? `${f.source_title}${f.locator ? ` (${f.locator})` : ''}.` : 'Live finding.',
      })
    } else {
      rows.push({
        id, type: f.type || fallbackType, text: f.text, main: null,
        st: 'na', refs: [], why: f.why || 'Exploration angle — no single source.',
        psg: null, mat: f.why || 'Use this to frame the next search or section.',
      })
    }
  }
  findings.forEach(f => push(f, 'Fact'))
  angles.forEach(a => push(a, 'Idea'))
  return { rows, src }
}

export default function ExploreView({ onSaveToLibrary, savedIds, initialQuery, startAtResults, initialSnapshot, onExploreComplete }: ExploreViewProps) {
  // Conversations without a snapshot (legacy) land on the prompt, never on
  // static sample rows.
  const [phase, setPhase] = useState<Phase>(startAtResults && initialSnapshot ? 'results' : 'init')
  const [query, setQuery] = useState(initialQuery ?? 'Does AI reduce creativity?')
  const [allowed, setAllowed] = useState<Set<string>>(new Set(ALL_SOURCE_TYPES))
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<number | null>(null)
  const [typeF, setTypeF] = useState('All')
  const [liveRows, setLiveRows] = useState<ResearchRow[] | null>(initialSnapshot?.rows ?? null)
  const [liveSrc, setLiveSrc] = useState<Record<string, SourceRecord> | null>(initialSnapshot?.src ?? null)
  const [liveSummary, setLiveSummary] = useState<string | null>(initialSnapshot?.summary ?? null)
  const [liveModel, setLiveModel] = useState<string | null>(initialSnapshot?.model ?? null)
  const [offline, setOffline] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [stageMsg, setStageMsg] = useState<string | null>(null)
  const [evCounts, setEvCounts] = useState<{ sources: number; findings: number }>({ sources: 0, findings: 0 })
  const abortRef = useRef<AbortController | null>(null)

  const activeRows = liveRows ?? ROWS
  const activeSrc = liveSrc ?? SRC

  const run = () => {
    blip('select')
    abortRef.current?.abort()
    const ctl = new AbortController()
    abortRef.current = ctl
    setPhase('run')
    setStep(1)
    setSel(null)
    setErrMsg(null)
    setOffline(false)
    setStageMsg('Starting…')
    setEvCounts({ sources: 0, findings: 0 })
    setLiveModel(null)
    // Live backend: SSE orchestrator stream (plan → search → fetch → findings → synthesize).
    api.exploreStream({ query, count: 8 }, (ev, d) => {
      if (ctl.signal.aborted) return
      if (ev === 'stage' && typeof d?.step === 'number') { setStep(Math.min(d.step + 1, STEPS.length)); if (d?.msg) setStageMsg(String(d.msg)) }
      if (ev === 'source') { setStep(2); setEvCounts(c => ({ ...c, sources: c.sources + 1 })) }
      if (ev === 'finding') { setStep(3); setEvCounts(c => ({ ...c, findings: c.findings + 1 })) }
      if (ev === 'error') setErrMsg(String(d?.error ?? 'backend error'))
    }, ctl.signal).then(res => {
      if (ctl.signal.aborted || res?.aborted) return
      if (res?.ok && ((res.findings?.length ?? 0) + (res.angles?.length ?? 0) > 0)) {
        try {
          const { rows, src } = toRows(res.findings ?? [], res.angles ?? [])
          setLiveRows(rows)
          setLiveSrc(src)
          setLiveSummary(res.summary || null)
          setLiveModel(res.model || null)
          setOffline(!!res.mock || !!res.offline)
          setStep(STEPS.length)
          setPhase('results')
          onExploreComplete?.(query, {
            rows, src,
            summary: res.summary || null,
            model: res.model || null,
            savedAt: Date.now(),
          })
          return
        } catch (e) {
          console.error('explore: failed to parse live results', e)
          setLiveRows(null)
          setLiveSrc(null)
          setErrMsg('Could not parse live results — showing embedded sample data.')
        }
        setLiveSummary(null)
        setLiveModel(null)
        setOffline(true)
        setStep(STEPS.length)
        setPhase('results')
        onExploreComplete?.(query)
      } else {
        // Fixed fallback: static mock dataset with offline banner (never fake live).
        setLiveRows(null)
        setLiveSrc(null)
        setLiveSummary(null)
        setOffline(true)
        if (res && !res.ok && res.error) setErrMsg(res.error)
      }
      setStep(STEPS.length)
      setPhase('results')
      onExploreComplete?.(query)
    }).catch(() => {
      if (ctl.signal.aborted) return
      setLiveRows(null)
      setLiveSrc(null)
      setOffline(true)
      setErrMsg('Cannot reach backend — showing embedded sample data.')
      setStep(STEPS.length)
      setPhase('results')
      onExploreComplete?.(query)
    })
  }

  const visible = useMemo(
    () => activeRows.filter(r => (typeF === 'All' || r.type === typeF) && (!r.main || allowed.has((activeSrc[r.main]?.ty ?? 'Web') as string) || allowed.has(activeSrc[r.main]?.ty ?? ''))),
    [typeF, allowed, activeRows, activeSrc]
  )
  const types = useMemo(() => ['All', ...new Set(activeRows.map(r => r.type))], [activeRows])
  const counts = useMemo(() => {
    const c = { supported: 0, contradicted: 0, unverified: 0 }
    for (const r of activeRows) if (r.st in c) c[r.st as keyof typeof c]++
    return c
  }, [activeRows])

  const selected = sel != null ? activeRows.find(r => r.id === sel) : undefined
  const toggleAllowed = (t: string) =>
    setAllowed(prev => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })

  if (phase === 'init') {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '20vh 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontWeight: 400, fontSize: 24, fontFamily: 'Georgia, serif' }}>What would you like to explore?</h1>
        <input aria-label="Research question" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', fontSize: 17, padding: '12px 16px', borderRadius: 10, textAlign: 'center', boxSizing: 'border-box' }} />
        <div><button type="button" className="primary" onClick={run} style={{ marginTop: 18, borderRadius: 999, padding: '8px 26px' }}>Explore</button></div>
        <div style={{ marginTop: 26, fontSize: 13, color: 'var(--muted)' }}>
          Sources:{' '}
          {ALL_SOURCE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleAllowed(t)} aria-pressed={allowed.has(t)} style={{ margin: 3, borderRadius: 999, borderColor: allowed.has(t) ? 'var(--muted)' : undefined, color: allowed.has(t) ? 'var(--ink)' : undefined }}>{t}</button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'run') {
    return (
      <div className="explore-loading" style={{ maxWidth: 620, margin: '0 auto', padding: '20vh 20px', textAlign: 'center' }}>
        <h1 style={{ fontWeight: 400, fontSize: 22, fontFamily: 'Georgia, serif' }}>Exploring: {query}</h1>
        <ul style={{ listStyle: 'none', padding: 0, display: 'inline-block', textAlign: 'left' }}>
          {STEPS.map((s, i) => {
            const done = i < step - 1 || (i === STEPS.length - 1 && step > STEPS.length - 1)
            const active = !done && i === step - 1 && step <= STEPS.length
            return (
              <li
                key={s}
                className={active ? 'explore-step-active' : 'explore-step'}
                style={{ color: done || active ? 'var(--ink)' : 'var(--muted)', padding: '4px 0', animationDelay: active ? undefined : `${i * 70}ms` }}
              >
                {done ? '✓ ' : active ? '● ' : '○ '}{s}
              </li>
            )
          })}
        </ul>
        {stageMsg && <p className="explore-step" style={{ color: 'var(--muted)', fontSize: 13, animationDelay: '280ms' }}>{stageMsg} · {evCounts.sources} sources · {evCounts.findings} findings</p>}
        <div><button type="button" onClick={() => abortRef.current?.abort()}>Cancel</button></div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '12px 20px 40px' }} className="explore-results">
      <div style={{ maxWidth: 860 }}>
        <h2 style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Summary</h2>
        {liveSummary ? (
          <p style={{ fontSize: 14 }}>{liveSummary}</p>
        ) : liveRows ? (
          <>
            <p style={{ fontSize: 14 }}>{counts.supported} supported · {counts.contradicted} contradicted · {counts.unverified} unverified across {activeRows.length} findings.</p>
            {activeRows.slice(0, 3).map(r => (
              <p key={r.id} style={{ fontSize: 13.5 }}><strong>{r.type}:</strong> {r.text}</p>
            ))}
          </>
        ) : (
          <>
            <p style={{ fontSize: 14 }}>Facts: AI ideas made stories more creative but more alike <button type="button" onClick={() => setSel(1)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[1]</button><button type="button" onClick={() => setSel(2)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[2]</button>. Trial speed-ups <button type="button" onClick={() => setSel(4)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[4]</button>.</p>
            <p style={{ fontSize: 14 }}>Data: 40% less time, 18% higher quality <button type="button" onClick={() => setSel(4)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[4]</button>. Novelty percentages unverified <button type="button" onClick={() => setSel(3)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[3]</button>.</p>
            <p style={{ fontSize: 14 }}>Terminology: Cognitive debt, homogenization. Open: does a boost last? <button type="button" onClick={() => setSel(11)} style={{ border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>[11]</button></p>
          </>
        )}
        {offline && <p style={{ fontSize: 12, color: 'var(--gold)' }}>Offline/sample data — backend unreachable or mock mode. {errMsg ?? 'Embedded sample shown.'}</p>}
        {!offline && errMsg && <p style={{ fontSize: 12, color: 'var(--gold)' }}>{errMsg}</p>}
        {liveRows && liveModel && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Live results · {liveModel} · {activeRows.length} rows ({evCounts.sources} sources streamed).</p>}
        <div style={{ marginTop: 12 }}>
          <input aria-label="Research question" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', fontSize: 14, padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box' }} />
          <button type="button" className="primary" onClick={run} style={{ marginTop: 8, borderRadius: 999, padding: '6px 20px' }}>Re-explore</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(240px,340px)', gap: 24, alignItems: 'start' }} className="explore-results-main">
      <div>
        <div style={{ fontSize: 13, marginBottom: 12, display: 'flex', gap: 14 }}>
          <span style={{ color: 'var(--success)' }}>{counts.supported} supported</span>
          <span style={{ color: 'var(--lt)' }}>{counts.contradicted} contradicted</span>
          <span style={{ color: 'var(--gold)' }}>{counts.unverified} unverified</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          {types.map(t => (
            <button key={t} type="button" onClick={() => setTypeF(t)} aria-pressed={typeF === t} style={{ margin: 2, borderRadius: 999 }}>{t}</button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr><th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 400 }}>Type</th><th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 400 }}>Finding</th><th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 400 }}>Source</th><th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 400 }}>Check</th></tr></thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} tabIndex={0} onClick={() => setSel(r.id)} onKeyDown={e => { if (e.key === 'Enter') setSel(r.id) }} aria-selected={sel === r.id} style={{ cursor: 'pointer', background: sel === r.id ? 'var(--dock)' : undefined }}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>{r.type}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>{r.text}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>{r.main ? activeSrc[r.main].v : 'Derived idea'}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)', color: r.st === 'supported' ? 'var(--success)' : r.st === 'contradicted' ? 'var(--lt)' : 'var(--gold)' }}>{CHECK_LABEL[r.st]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{liveRows ? `Live results from /api/explore (grounded web search + fetched pages${liveModel ? ` · ${liveModel}` : ''}). A claim counts as supported only when a source states it.` : 'Progress simulated. Sources retrieved by live web searches on 2 Nov 2026 and embedded. A claim counts as supported only when a primary source states it.'}</p>
      </div>
      <aside className="dock" aria-live="polite" style={{ position: 'sticky', top: 12 }}>
        <h2 style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Details</h2>
        {!selected ? (
          <p className="meta">Select a result to read its source.</p>
        ) : (
          <div>
            {selected.main ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>{activeSrc[selected.main].t}</h3>
                <div className="meta" style={{ marginBottom: 10 }}>{activeSrc[selected.main].a} · {activeSrc[selected.main].d} · {activeSrc[selected.main].ty}<br />{activeSrc[selected.main].v}<br /><a href={activeSrc[selected.main].u} target="_blank" rel="noreferrer">{activeSrc[selected.main].u}</a></div>
              </>
            ) : (
              <><h3>Derived idea</h3><div className="meta">No single source. Built from the sources below.</div></>
            )}
            {selected.psg && <div style={{ borderLeft: '3px solid var(--muted)', padding: '8px 12px', margin: '10px 0' }}><span className="meta">From the source (paraphrased)</span><div>{selected.psg}</div></div>}
            <div style={{ borderLeft: '3px solid var(--ai)', background: 'color-mix(in srgb, var(--ai) 8%, transparent)', padding: '8px 12px', margin: '10px 0', borderRadius: '0 6px 6px 0' }}><span className="meta" style={{ color: 'var(--ai)' }}>AI interpretation</span><div>{selected.mat}</div></div>
            <div style={{ borderLeft: '3px solid var(--border)', padding: '8px 12px', margin: '10px 0' }}><span className="meta">Check</span><div><strong>{CHECK_LABEL[selected.st]}</strong> {selected.why}</div></div>
            <div style={{ borderLeft: '3px solid var(--border)', padding: '8px 12px', margin: '10px 0' }}><span className="meta">Sources consulted</span>
              {selected.refs.map(([k, role]) => (
                activeSrc[k] ? <div key={k} style={{ fontSize: 12.5 }}><a href={activeSrc[k].u} target="_blank" rel="noreferrer">{activeSrc[k].t}</a> <span style={{ color: 'var(--muted)' }}>({role}{role === 'primary' ? ', counts' : ', does not count'})</span></div> : null
              ))}
            </div>
            <button type="button" onClick={() => onSaveToLibrary(selected, selected.main ? activeSrc[selected.main] : undefined)} aria-pressed={savedIds.has(selected.id)} style={{ borderRadius: 999, background: savedIds.has(selected.id) ? 'var(--ink)' : undefined, color: savedIds.has(selected.id) ? 'var(--bg)' : undefined }}>
              {savedIds.has(selected.id) ? 'Saved to Library' : 'Save to Library'}
            </button>
          </div>
        )}
      </aside>
      </div>
    </div>
  )
}
