import React from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import Landing from './pages/Landing'
import EditorPage from './pages/EditorPage'
import './styles/theme.css'
import './styles/app.css'

document.documentElement.dataset.theme = (() => {
  try {
    const s = localStorage.getItem('byline.theme')
    if (s === 'light' || s === 'dark') return s
  } catch {}
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
})()

const path = location.pathname
const Page = path.startsWith('/app')
  ? <EditorPage />
  : path.startsWith('/demo')
  ? <EditorPage demo />
  : <Landing />

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {Page}
    <Analytics />
  </React.StrictMode>
)
