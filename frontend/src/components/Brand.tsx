import { useEffect, useState } from 'react'

export function getTheme(): 'light' | 'dark' {
  const s = localStorage.getItem('byline.theme')
  if (s === 'light' || s === 'dark') return s
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
export function Logo({ height = 30 }: { height?: number }) {
  const [t, setT] = useState(getTheme())
  useEffect(() => { const f = () => setT(getTheme()); addEventListener('byline-theme', f); return () => removeEventListener('byline-theme', f) }, [])
  return <a href="/" aria-label="Byline home" style={{ display: 'inline-flex' }}><img src={t === 'dark' ? '/darklogo.png' : '/lightlogo.png'} alt="Byline" style={{ height, width: 'auto', display: 'block' }} /></a>
}
export function ThemeToggle() {
  const [t, setT] = useState(getTheme())
  function toggle() {
    const n = t === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = n; localStorage.setItem('byline.theme', n); setT(n); dispatchEvent(new Event('byline-theme'))
  }
  return <button className="icon-btn" onClick={toggle} title={t === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
    <img src={t === 'dark' ? '/darkmodeico.png' : '/lightmodeico.png'} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
  </button>
}
