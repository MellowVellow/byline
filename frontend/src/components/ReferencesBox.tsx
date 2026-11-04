import React, { useEffect, useRef, useState } from 'react'
import { loadRefsHtml, saveRefsHtml } from '../domain/library'

function storedHasContent(): boolean {
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = loadRefsHtml()
    return !!(tmp.textContent?.trim())
  } catch { return false }
}

function notifyRefsChanged() {
  try { window.dispatchEvent(new Event('byline-refs-changed')) } catch { /* ignore */ }
}

export default function ReferencesBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [hasContent, setHasContent] = useState(storedHasContent)

  // Restore saved HTML whenever the editable div (re)mounts.
  useEffect(() => {
    if (ref.current) {
      const saved = loadRefsHtml()
      if (saved && !ref.current.innerHTML) ref.current.innerHTML = saved
      setHasContent(!!(ref.current.textContent?.trim()))
    }
  }, [hasContent])

  // Re-show when references are appended while hidden; re-check otherwise.
  useEffect(() => {
    const onChanged = () => {
      if (ref.current) setHasContent(!!(ref.current.textContent?.trim()))
      else setHasContent(storedHasContent())
    }
    window.addEventListener('byline-refs-changed', onChanged)
    return () => window.removeEventListener('byline-refs-changed', onChanged)
  }, [])

  if (!hasContent) return null

  return (
    <div style={{ width: '100%', maxWidth: '72ch', margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', margin: '16px 0 6px' }}>
        References (editable)
      </div>
      <div
        ref={ref}
        id="byline-refs"
        contentEditable
        spellCheck={false}
        onInput={e => {
          const el = e.target as HTMLDivElement
          saveRefsHtml(el.innerHTML)
          setHasContent(!!(el.textContent?.trim()))
        }}
        style={{
          fontSize: 13, lineHeight: 1.5, border: '1px dashed var(--border)',
          borderRadius: 8, padding: '8px 12px', minHeight: 56, outline: 'none',
          background: 'var(--paper)',
        }}
      />
    </div>
  )
}

export function appendReference(html: string) {
  try {
    const box = document.getElementById('byline-refs')
    if (!box) {
      saveRefsHtml((loadRefsHtml() + html).trim())
      notifyRefsChanged()
      return
    }
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    const incoming = tmp.textContent?.trim() || ''
    const existing = Array.from(box.querySelectorAll('p')).map(p => p.textContent?.trim())
    if (existing.includes(incoming)) return
    box.insertAdjacentHTML('beforeend', html)
    // Keep alpha order by text.
    const ps = Array.from(box.querySelectorAll('p'))
    ps.sort((a, b) => (a.textContent || '').localeCompare(b.textContent || ''))
    box.innerHTML = ''
    ps.forEach(p => box.appendChild(p))
    saveRefsHtml(box.innerHTML)
    notifyRefsChanged()
  } catch { /* ignore */ }
}
