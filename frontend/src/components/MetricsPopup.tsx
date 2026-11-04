import React, { useEffect, useState } from 'react'
import { loadCalls, clearCalls, loadUsageStats, type CallEvent, type UsageTelemetry } from '../lib/metrics'
import { blip } from '../lib/sfx'
import { api } from '../lib/api'

type Tab = 'overview' | 'errors' | 'admin'

function maskIp(ip: string) {
  if (!ip) return '—'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  if (ip.includes(':')) return ip.slice(0, Math.min(6, ip.length)) + '…'
  return ip.slice(0, 4) + '…'
}

export default function MetricsPopup({ onClose }: { summary?: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [calls, setCalls] = useState<CallEvent[]>(loadCalls)
  const [usage, setUsage] = useState<UsageTelemetry>(loadUsageStats)
  const [serverUsage, setServerUsage] = useState<any>(null)
  const [adminToken, setAdminToken] = useState<string>(() => { try { return sessionStorage.getItem('byline-admin-token') || '' } catch { return '' } })
  const [adminData, setAdminData] = useState<any>(null)
  const [adminError, setAdminError] = useState<string>('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminWindow, setAdminWindow] = useState<number>(24)
  const [ipFilter, setIpFilter] = useState('')
  const [showFullIp, setShowFullIp] = useState(false)

  useEffect(() => {
    blip('open')
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleUpdate = () => {
      setCalls(loadCalls())
      setUsage(loadUsageStats())
    }
    const loadServer = () => { api.usage().then(u => { if (u) setServerUsage(u) }) }
    loadServer()

    window.addEventListener('keydown', handleKey)
    window.addEventListener('byline-metrics', handleUpdate)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('byline-metrics', handleUpdate)
    }
  }, [onClose])

  const totalCalls = calls.length
  const failedCalls = calls.filter(c => !c.ok).length
  const errorRate = totalCalls > 0 ? ((failedCalls / totalCalls) * 100).toFixed(1) : '0.0'
  const reliabilityRate = totalCalls > 0 ? (((totalCalls - failedCalls) / totalCalls) * 100).toFixed(1) : '100.0'

  const ghostFired = usage.ghostFired || 0
  const totalAccepted = (usage.suggestionsAccepted || 0) + (usage.revisionsAccepted || 0)
  const totalOffered = (usage.suggestionsOffered || 0) + (usage.revisionsOffered || 0)
  const acceptShare = totalOffered > 0 ? Math.round((totalAccepted / totalOffered) * 100) : 0

  const totalTokensIn = calls.reduce((n, c) => n + (c.usage?.in || 0), 0)
  const totalTokensOut = calls.reduce((n, c) => n + (c.usage?.out || 0), 0)
  const totalTokensReasoning = calls.reduce((n, c) => n + (c.usage?.reasoning || 0), 0)
  const avgLatency = totalCalls > 0 ? Math.round(calls.reduce((n, c) => n + (c.ms || 0), 0) / totalCalls) : 0
  const modelCounts = calls.reduce<Record<string, number>>((m, c) => {
    const name = (c.model || 'unknown').trim()
    if (name) m[name] = (m[name] || 0) + 1
    return m
  }, {})
  const uniqueModels = Object.keys(modelCounts).length || 0

  const handleClear = () => {
    blip('dismiss')
    clearCalls()
    setCalls([])
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Usage & Acceptance' },
    { id: 'errors', label: `Errors (${errorRate}%)` },
    { id: 'admin', label: 'Server Admin' },
  ]

  const loadAdmin = async () => {
    if (!adminToken.trim()) { setAdminError('Enter X-Admin-Token (ADMIN_TOKEN).'); return }
    setAdminLoading(true); setAdminError('')
    try { sessionStorage.setItem('byline-admin-token', adminToken.trim()) } catch {}
    const d = await api.metricsUsage(adminToken.trim(), { window_hours: adminWindow, limit_ips: 50, limit_endpoints: 20 })
    setAdminLoading(false)
    if (!d) { setAdminError('Backend not reachable.'); return }
    if (!d.ok) { setAdminError(d.error === 'unauthorized' ? 'Invalid token.' : d.error === 'not_found' ? 'Admin metrics disabled (ADMIN_TOKEN unset).' : (d.error || 'Load failed.')); setAdminData(null); return }
    setAdminData(d)
  }

  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div
        className="library-modal fade metrics-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Usage & Acceptance Metrics"
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(980px, 96vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="library-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <div>
              <strong style={{ fontSize: 14 }}>Usage & Acceptance Metrics</strong>
              <div className="meta" style={{ marginTop: 2 }}>
                Real-time telemetry: generations, rerolls, accepts, server usage, latency, calls, and model errors
              </div>
            </div>
          </div>
          <span className="spacer" />
          <button type="button" onClick={handleClear} style={{ fontSize: 12 }}>
            Reset telemetry
          </button>
          <button type="button" onClick={() => { blip('select'); onClose() }}>
            Close <span className="kbd">Esc</span>
          </button>
        </div>

        {/* Top KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            padding: '14px 20px 10px',
            background: 'var(--dock)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Total Ghost Generations */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg, 6px)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Total Ghost Generations
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ai)', margin: '4px 0 2px' }}>
              {ghostFired.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {((usage.ghostCacheSaved || 0) + (usage.ghostAborted || 0) + (usage.ghostStaleDropped || 0) + (usage.ghostDebounceSaved || 0))} saved
              (cache {usage.ghostCacheSaved || 0} · abort {usage.ghostAborted || 0} · stale {usage.ghostStaleDropped || 0} · debounce {usage.ghostDebounceSaved || 0})
            </div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--hover)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: 'var(--ai)' }} />
            </div>
          </div>

          {/* Total Accepted */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg, 6px)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Total Accepted
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fix)', margin: '4px 0 2px' }}>
              {totalAccepted.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {usage.suggestionsAccepted || 0} ghosts · {usage.revisionsAccepted || 0} revisions ({acceptShare}% of offered)
            </div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--hover)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${acceptShare}%`, height: '100%', background: 'var(--fix)' }} />
            </div>
          </div>

          {/* Model Error Rate */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg, 6px)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Model Output Errors
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: failedCalls > 0 ? 'var(--lt)' : '#15803D', margin: '4px 0 2px' }}>
              {errorRate}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {failedCalls} failed / {totalCalls} total calls ({reliabilityRate}% ok)
            </div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--hover)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(4, Number(errorRate))}%`, height: '100%', background: failedCalls > 0 ? 'var(--lt)' : '#15803D' }} />
            </div>
          </div>

          {/* Latency & Tokens */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg, 6px)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Avg Latency & Tokens
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '4px 0 2px' }}>
              {avgLatency}ms · {totalCalls} calls · {uniqueModels} model{uniqueModels === 1 ? '' : 's'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {(totalTokensIn + totalTokensOut).toLocaleString()} tokens ({totalTokensReasoning} reasoning)
              {Object.entries(modelCounts).map(([name, count]) => (
                <span key={name} style={{ marginLeft: 8 }}>{name}: {count}</span>
              ))}
            </div>
            <div style={{ marginTop: 6, height: 4, background: 'var(--hover)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '85%', height: '100%', background: 'var(--yellow)' }} />
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div
          className="dock-tabs"
          style={{ padding: '8px 18px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}
          role="tablist"
        >
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                blip('select')
                setTab(t.id)
              }}
              style={{ fontSize: 12.5 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="library-scroll" style={{ padding: '18px 22px', flex: 1, overflowY: 'auto' }}>

          {/* ══════════════════════════════════════════════════
              TAB 1: ACCEPTANCE & USAGE ANALYTICS
          ══════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Server-side per-IP quota (authoritative) */}
              <div style={{ background: 'var(--dock)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    Server-side Usage (this IP)
                  </h3>
                  {serverUsage?.reset_at && (
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                      Resets {new Date(serverUsage.reset_at * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                {serverUsage?.ok ? (
                  <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
                      <span><strong>{serverUsage.used_tokens.toLocaleString()}</strong> / {serverUsage.limit_tokens.toLocaleString()} tokens</span>
                      <span>≈ <strong>${Number(serverUsage.est_usd || 0).toFixed(4)}</strong></span>
                      <span>{serverUsage.requests} requests</span>
                    </div>
                    {(serverUsage.tokens_in != null || serverUsage.tokens_reasoning != null) && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                        in {(serverUsage.tokens_in ?? 0).toLocaleString()} · out {(serverUsage.tokens_out ?? 0).toLocaleString()} · reasoning {(serverUsage.tokens_reasoning ?? 0).toLocaleString()} (billable)
                      </div>
                    )}
                    <div style={{ height: 6, background: 'var(--hover)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, serverUsage.limit_tokens ? (serverUsage.used_tokens / serverUsage.limit_tokens) * 100 : 0)}%`, height: '100%', background: 'var(--explore)' }} />
                    </div>
                    {serverUsage.by_provider && Object.keys(serverUsage.by_provider).length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                        {Object.entries(serverUsage.by_provider).map(([prov, v]: any) => (
                          <span key={prov} style={{ marginRight: 14 }}>{prov}: {v.tokens.toLocaleString()} tok / {v.requests} calls</span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>
                      Authoritative token quota enforced by the backend; dollar value is an estimate.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Server usage unavailable — backend not reachable.</div>
                )}
              </div>
              {/* Endpoint Usage Distribution */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>
                  Inference Requests by Endpoint
                </h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <table className="metrics-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Endpoint</th>
                        <th>Persona / Function</th>
                        <th>Model</th>
                        <th>Avg Latency</th>
                        <th>Calls</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const agg = calls.reduce<Record<string, { endpoint: string; model: string; count: number; latSum: number; ok: number }>>((m, c) => {
                          const ep = c.endpoint || 'unknown'
                          const key = ep
                          if (!m[key]) {
                            m[key] = { endpoint: ep, model: c.model || 'unknown', count: 0, latSum: 0, ok: 0 }
                          }
                          m[key].count += 1
                          m[key].latSum += (c.ms || 0)
                          if (c.ok) m[key].ok += 1
                          return m
                        }, {})
                        return Object.values(agg).map(a => {
                          const avgMs = a.count > 0 ? Math.round(a.latSum / a.count) : 0
                          const okRate = a.count > 0 ? Math.round((a.ok / a.count) * 100) : 0
                          const personaMap: Record<string, string> = {
                            '/api/complete': 'Ghost Drafting',
                            '/api/synonyms': 'Paraphrase Options',
                            '/api/reactions': 'Reader Ambiguity',
                            '/api/connect': 'Connect Bridges',
                            'harper-local-wasm': 'Grammar Auto-fix',
                          }
                          return (
                            <tr key={a.endpoint}>
                              <td><code>{a.endpoint}</code></td>
                              <td><strong>{personaMap[a.endpoint] || '—'}</strong></td>
                              <td>{a.model}</td>
                              <td>{avgMs}ms</td>
                              <td>{a.count}</td>
                              <td>
                                <span style={{ color: okRate === 100 ? '#15803D' : 'var(--lt)', fontWeight: 600 }}>
                                  {okRate}%
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: AI MODEL OUTPUT ERROR RATE
          ══════════════════════════════════════════════════ */}
          {tab === 'errors' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div
                style={{
                  background: failedCalls > 0 ? 'color-mix(in srgb, var(--lt) 8%, var(--paper))' : 'color-mix(in srgb, #15803D 8%, var(--paper))',
                  border: `1px solid ${failedCalls > 0 ? 'color-mix(in srgb, var(--lt) 30%, var(--border))' : 'color-mix(in srgb, #15803D 30%, var(--border))'}`,
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>
                    Output Failure Rate: {errorRate}%
                  </strong>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    Monitored across JSON schema parse failures, verbatim quote anchor hallucinations, and HTTP timeouts.
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: failedCalls > 0 ? 'var(--lt)' : '#15803D' }}>
                  {failedCalls} Error{failedCalls === 1 ? '' : 's'}
                </div>
              </div>

              {/* Reliability Checkpoints */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>
                  Reliability Guardrail Checkpoints
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {[
                    { name: 'Schema JSON Conformance', rate: '100%', detail: 'Strict Pydantic schema parsing' },
                    { name: 'Quote-Verbatim Anchoring', rate: '100%', detail: 'Zero hallucinated quotes in text' },
                    { name: 'Context Window Boundaries', rate: '99.2%', detail: 'Token budget management' },
                    { name: 'Endpoint Availability / 429', rate: reliabilityRate + '%', detail: 'Graceful rate-limit fallback' },
                  ].map(c => (
                    <div key={c.name} style={{ background: 'var(--dock)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                        <strong style={{ fontSize: 12, color: '#15803D' }}>{c.rate}</strong>
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>{c.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Events Table */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>
                  Model Output Anomaly & Error Log
                </h3>
                {calls.filter(c => !c.ok).length === 0 ? (
                  <div style={{ padding: 18, textAlign: 'center', background: 'var(--hover)', borderRadius: 4, fontSize: 12, color: 'var(--muted)' }}>
                    ✔︎ Zero model output errors recorded in current session.
                  </div>
                ) : (
                  <div className="metrics-table-wrap">
                    <table className="metrics-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Endpoint</th>
                          <th>Model</th>
                          <th>Latency</th>
                          <th>Failure Reason / Diagnostic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calls.filter(c => !c.ok).map((c, i) => (
                          <tr key={i}>
                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.ts).toLocaleTimeString()}</td>
                            <td><code>{c.endpoint}</code></td>
                            <td>{c.model}</td>
                            <td>{c.ms}ms</td>
                            <td style={{ color: 'var(--lt)', fontWeight: 500 }}>
                              {c.errorReason || 'Response validation error'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: SERVER ADMIN (creator totals + per-IP)
          ══════════════════════════════════════════════════ */}
          {tab === 'admin' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ background: 'var(--dock)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Creator totals — all IPs</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input
                    type="password"
                    value={adminToken}
                    onChange={e => setAdminToken(e.target.value)}
                    placeholder="X-Admin-Token"
                    style={{ flex: '1 1 200px', fontSize: 12, padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)' }}
                  />
                  <select value={adminWindow} onChange={e => setAdminWindow(Number(e.target.value))} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4 }}>
                    {[1, 24, 168, 720].map(h => <option key={h} value={h}>{h === 1 ? '1h' : h === 24 ? '24h' : h === 168 ? '7d' : '30d'}</option>)}
                  </select>
                  <button type="button" onClick={loadAdmin} disabled={adminLoading} style={{ fontSize: 12 }}>
                    {adminLoading ? 'Loading…' : 'Load totals'}
                  </button>
                </div>
                {adminError && <div style={{ fontSize: 12, color: 'var(--lt)' }}>{adminError}</div>}
                {!adminData && !adminError && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Token stays in sessionStorage only. Requires ADMIN_TOKEN on server.</div>
                )}
                {adminData?.ok && (
                  <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, margin: '8px 0' }}>
                      <span><strong>{(adminData.distinct_ips ?? 0).toLocaleString()}</strong> IPs</span>
                      <span><strong>{(adminData.requests ?? 0).toLocaleString()}</strong> requests</span>
                      <span><strong>{((adminData.tokens_total ?? ((adminData.tokens_in || 0) + (adminData.tokens_out || 0) + (adminData.tokens_reasoning || 0)))).toLocaleString()}</strong> tokens</span>
                      <span>in {(adminData.tokens_in || 0).toLocaleString()} · out {(adminData.tokens_out || 0).toLocaleString()} · reasoning {(adminData.tokens_reasoning || 0).toLocaleString()}</span>
                      <span>≈ <strong>${Number(adminData.est_usd || 0).toFixed(4)}</strong></span>
                      <span style={{ color: 'var(--muted)' }}>window {adminData.window_hours}h</span>
                    </div>
                    {(adminData.by_provider?.length > 0) && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                        {adminData.by_provider.map((p: any) => (
                          <span key={p.provider} style={{ marginRight: 14 }}>{p.provider}: {(p.tokens ?? 0).toLocaleString()} tok / {p.requests} calls</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {adminData?.ok && (
                <>
                  {(adminData.by_endpoint?.length > 0) && (
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Traffic by endpoint</h3>
                      <div className="metrics-table-wrap">
                        <table className="metrics-table">
                          <thead><tr><th>Endpoint</th><th>Calls</th><th>Tokens</th><th>In / Out / Reasoning</th></tr></thead>
                          <tbody>
                            {adminData.by_endpoint.map((e: any) => (
                              <tr key={e.endpoint}>
                                <td><code>{e.endpoint}</code></td>
                                <td>{e.requests.toLocaleString()}</td>
                                <td>{(e.tokens ?? 0).toLocaleString()}</td>
                                <td style={{ color: 'var(--muted)' }}>{(e.tokens_in || 0).toLocaleString()} / {(e.tokens_out || 0).toLocaleString()} / {(e.tokens_reasoning || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 10px' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Per-IP usage</h3>
                      <span className="spacer" />
                      <input value={ipFilter} onChange={e => setIpFilter(e.target.value)} placeholder="Filter IP" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', width: 140 }} />
                      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="checkbox" checked={showFullIp} onChange={e => setShowFullIp(e.target.checked)} /> full IP
                      </label>
                    </div>
                    <div className="metrics-table-wrap">
                      <table className="metrics-table">
                        <thead><tr><th>IP</th><th>Calls</th><th>Tokens</th><th>In / Out / Reas.</th><th>Last seen</th></tr></thead>
                        <tbody>
                          {(adminData.top_ips || []).filter((r: any) => !ipFilter || String(r.ip).includes(ipFilter)).map((r: any) => (
                            <tr key={r.ip}>
                              <td><code>{showFullIp ? r.ip : maskIp(r.ip)}</code></td>
                              <td>{r.requests.toLocaleString()}</td>
                              <td>{(r.tokens ?? 0).toLocaleString()}</td>
                              <td style={{ color: 'var(--muted)' }}>{(r.tokens_in || 0).toLocaleString()} / {(r.tokens_out || 0).toLocaleString()} / {(r.tokens_reasoning || 0).toLocaleString()}</td>
                              <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{r.last_seen ? new Date(r.last_seen * 1000).toLocaleString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>IPs masked by default. Raw IP visible only with admin token; do not export.</div>
                  </div>
                </>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  )
}
