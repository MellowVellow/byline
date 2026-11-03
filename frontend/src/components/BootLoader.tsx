import React, { useCallback, useEffect, useRef, useState } from 'react'

const MESSAGES = [
  'Waking things up…',
  'Gathering your documents…',
  'Syncing the latest changes…',
  'Tuning the editor…',
  'Almost ready…',
]

export default function BootLoader({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    if (reduce) {
      onDone()
      return
    }
    setLeaving(true)
    setTimeout(onDone, 260)
  }, [onDone, reduce])

  useEffect(() => {
    const t = setInterval(() => setMsg(m => (m + 1) % MESSAGES.length), 2400)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setTimeout(finish, 2600)
    const fallback = setTimeout(finish, 4000)
    return () => {
      clearTimeout(t)
      clearTimeout(fallback)
    }
  }, [finish])

  return (
    <div
      role="status"
      aria-label="Loading Byline"
      className={`loader-fade${leaving ? ' leaving' : ''}`}
      style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--muted)' }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 24 }}>
        <svg width="120" height="120" viewBox="0 0 400 400" role="img" aria-label="b logo">
          <defs>
            <linearGradient id="byline-flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="260" y2="0" spreadMethod="repeat" gradientTransform="rotate(35)">
              <stop offset="0" stopColor="#b9a0f7" />
              <stop offset="0.28" stopColor="#de5a50" />
              <stop offset="0.58" stopColor="#fbe777" />
              <stop offset="0.82" stopColor="#8ec8fa" />
              <stop offset="1" stopColor="#b9a0f7" />
              {!reduce && (
                <animateTransform attributeName="gradientTransform" type="translate" additive="sum" from="0 0" to="260 0" dur="3.2s" repeatCount="indefinite" />
              )}
            </linearGradient>
          </defs>
          <text x="200" y="300" fontSize="300" textAnchor="middle" fill="var(--border)" fontFamily="Georgia, serif">b</text>
          <rect x="88" y="201" width="224" height="30" fill="url(#byline-flow)" opacity="0.8" />
        </svg>
        <p style={{ margin: 0, fontSize: 16, fontFamily: 'Georgia, serif' }}>{MESSAGES[msg]}</p>
        <div role="status" aria-label="Loading" style={{ width: 44, height: 44 }}>
          <svg className="boot-loop" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="url(#byline-ring)" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 40" />
            <defs>
              <linearGradient id="byline-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#b9a0f7" />
                <stop offset="0.5" stopColor="#de5a50" />
                <stop offset="1" stopColor="#8ec8fa" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
