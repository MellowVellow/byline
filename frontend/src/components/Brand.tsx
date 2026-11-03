import { useEffect, useState } from 'react'
import { loadSettings, saveSettings, resolveTheme } from '../lib/settings'
import { blip } from '../lib/sfx'

export function getTheme(): 'light' | 'dark' {
  try {
    const s = localStorage.getItem('byline.theme')
    if (s === 'light' || s === 'dark') return s
  } catch {}
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function Logo({ height = 28 }: { height?: number }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const f = () => setTick(t => t + 1)
    window.addEventListener('byline-theme', f)
    window.addEventListener('byline-colors', f)
    return () => {
      window.removeEventListener('byline-theme', f)
      window.removeEventListener('byline-colors', f)
    }
  }, [])

  const fontSize = Math.round(height * 0.82)
  const dotSize = Math.max(3, Math.round(height * 0.12))

  return (
    <a
      href="/"
      aria-label="Byline home"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: '"Source Serif Pro", "Source Serif 4", Georgia, serif',
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'baseline',
          position: 'relative',
        }}
      >
        <span style={{ color: 'var(--ink)' }}>By</span>
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            color: 'var(--muted)',
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          line
          {/* 4 dots below "line": red grammar, purple reader, yellow selection, blue explore */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '1px',
              left: 0,
              right: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              justifyItems: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: 'var(--lt)',
                flexShrink: 0,
              }}
              title="Grammar (Red)"
            />
            <span
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: 'var(--ai)',
                flexShrink: 0,
              }}
              title="Reader (Purple)"
            />
            <span
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: 'var(--link)',
                flexShrink: 0,
              }}
              title="Selection (Yellow)"
            />
            <span
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: 'var(--explore)',
                flexShrink: 0,
              }}
              title="Explore (Blue)"
            />
          </span>
        </span>
      </span>
    </a>
  )
}

export function ThemeToggle() {
  const [t, setT] = useState(getTheme())
  useEffect(() => {
    const sync = () => setT(getTheme())
    window.addEventListener('byline-theme', sync)
    return () => window.removeEventListener('byline-theme', sync)
  }, [])
  function toggle() {
    blip('toggle')
    const s = loadSettings()
    const resolved = resolveTheme(s.theme)
    const n = resolved === 'dark' ? 'light' : 'dark'
    saveSettings({ ...s, theme: n })
    setT(n)
  }
  return (
    <button className="icon-btn" onClick={toggle} title={t === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
      <img src={t === 'dark' ? '/darkmodeico.png' : '/lightmodeico.png'} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
    </button>
  )
}
