import { useEffect, useState } from 'react'

export function getTheme(): 'light' | 'dark' {
  const s = localStorage.getItem('byline.theme')
  if (s === 'light' || s === 'dark') return s
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
  const dotSize = Math.max(3.5, Math.round(height * 0.13))

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
          display: 'inline-flex',
          alignItems: 'baseline',
          position: 'relative',
        }}
      >
        <span style={{ color: 'var(--ink)' }}>By</span>
        <span
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}>line</span>
          {/* 4 circles below line to act as underline */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: `-${dotSize + 2}px`,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 1px',
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
                background: 'var(--yellow)',
                flexShrink: 0,
              }}
              title="Supervisor (Amber)"
            />
            <span
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                background: 'var(--blue)',
                flexShrink: 0,
              }}
              title="Researcher (Blue)"
            />
          </span>
        </span>
      </span>
    </a>
  )
}

export function ThemeToggle() {
  const [t, setT] = useState(getTheme())
  function toggle() {
    const n = t === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = n
    localStorage.setItem('byline.theme', n)
    setT(n)
    dispatchEvent(new Event('byline-theme'))
  }
  return (
    <button className="icon-btn" onClick={toggle} title={t === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
      <img src={t === 'dark' ? '/darkmodeico.png' : '/lightmodeico.png'} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
    </button>
  )
}
