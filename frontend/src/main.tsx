import React from 'react'
import { createRoot } from 'react-dom/client'
import Landing from './pages/Landing'
import EditorPage from './pages/EditorPage'
import './styles/theme.css'
import './styles/app.css'

document.documentElement.dataset.theme = (() => { const s = localStorage.getItem('byline.theme'); return s === 'light' || s === 'dark' ? s : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') })()
const path = location.pathname
const Page = path.startsWith('/app') ? <EditorPage /> : path.startsWith('/demo') ? <EditorPage demo /> : <Landing />
createRoot(document.getElementById('root')!).render(<React.StrictMode>{Page}</React.StrictMode>)
