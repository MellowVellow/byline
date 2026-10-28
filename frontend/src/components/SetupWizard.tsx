import { useEffect, useRef, useState } from 'react'
import { sfxStep, sfxBack, sfxPick, sfxToggle, sfxMuted } from '../lib/sfx'
import { recordWav } from '../lib/wav'
import { transcribeWav, api } from '../lib/api'
import { textFragmentUrl } from '../lib/link'
import type { Fact, Reading, OutlineDraft, DocSection } from '../lib/types'
import '../styles/setup-wizard.css'

export type SetupPayload = { configuration_id: string; dimensions: { diction: string; tone: string; voice: string; style: string }; active_preset_rules: string[]; custom_rules: { id: string; category: string; rule: string }[]; ghost_text_filters: { starter_categories: string[]; allowed_transitions: string[] }; followup_question?: string }

export type Answers = { goal: string; doc_type: string; audience: string; audience_level: number; key_points: string; voice_note: string }
const DOCS = ['essay', 'report', 'proposal', 'email', 'blog']
const TEXT_KEYS = ['goal', 'key_points', 'audience', 'voice_note']
const STEPS: { key: keyof Answers | 'welcome'; title: string; gold?: string; ph?: string }[] = [
  { key: 'welcome', title: 'Refinement through', gold: 'reflection.' },
  { key: 'goal', title: 'What are you writing?', ph: 'Argue cats are better than dogs…' },
  { key: 'key_points', title: 'Must cover —' },
  { key: 'audience', title: 'Who reads this?', ph: 'Stakeholders, undergraduates…' },
  { key: 'voice_note', title: 'Voice, in a phrase —', ph: 'Dry, warm, Hemingway…' },
  { key: 'doc_type', title: 'Form —' },
  { key: 'audience_level', title: 'Reader level —' },
]
type VState = 'idle' | 'listening' | 'transcribing' | 'error'

export type WizardTab = 'survey' | 'agent' | 'outline' | 'search'
export type OutlineReview = { draft: OutlineDraft[]; sections: DocSection[]; onInsert: (i: number, mode: 'append' | 'replace') => void; onInsertAll: () => void; onSkip: (i: number) => void; onRegenerate: () => Promise<boolean>; generating: boolean }
export type SearchReview = { url: string; setUrl: (v: string) => void; question: string; setQuestion: (v: string) => void; onSearch: () => void; onUpload: (f: File) => void; searching: boolean; facts: Fact[]; readings: Reading[]; onInsertFact: (f: Fact) => void }

export default function SetupWizard({ answers, setAnswers, onClose, onGenerate, generating, onApplySetup, tab, setTab, outline, search }: {
  answers: Answers; setAnswers: (f: (a: Answers) => Answers) => void; onClose: () => void; onGenerate: () => Promise<boolean>; generating: boolean; onApplySetup?: (p: SetupPayload) => void
  tab: WizardTab; setTab: (t: WizardTab) => void; outline?: OutlineReview; search?: SearchReview
}) {
  const [i, setI] = useState(0), [muted, setMuted] = useState(sfxMuted()), [mode, setMode] = useState<'type' | 'speak'>('type')
  const [vState, setVState] = useState<VState>('idle'), [vErr, setVErr] = useState(''), [genErr, setGenErr] = useState(false)
  const [rawGoal, setRawGoal] = useState(''), [payload, setPayload] = useState<SetupPayload | null>(null), [compiling, setCompiling] = useState(false), [convo, setConvo] = useState<{ q: string; a: string }[]>([])
  const cardRef = useRef<HTMLDivElement>(null), titleRef = useRef<HTMLHeadingElement>(null), recRef = useRef<{ stop: () => Promise<Blob> } | null>(null)
  const cancelRef = useRef(false), finishRef = useRef(false)
  const step = STEPS[i], last = i === STEPS.length - 1, isText = TEXT_KEYS.includes(step.key as string)
  const valid = ['welcome', 'doc_type', 'audience_level', 'voice_note'].includes(step.key as string) || !!(answers as any)[step.key]?.trim()

  const cancelVoice = () => { cancelRef.current = true; const r = recRef.current; recRef.current = null; if (r) void r.stop().catch(() => {}); setVState('idle') }
  const go = (n: number) => { cancelVoice(); const v = Math.min(STEPS.length - 1, Math.max(0, n)); if (v !== i) v > i ? sfxStep(v) : sfxBack(); setI(v) }
  const close = () => { cancelVoice(); onClose() }

  async function finishVoice(field: string, idx: number) {
    if (finishRef.current || cancelRef.current) return; finishRef.current = true
    const r = recRef.current; recRef.current = null; if (!r) return
    setVState('transcribing')
    const blob = await r.stop().catch(() => null); if (cancelRef.current || !blob) { finishRef.current = false; return }
    const text = await transcribeWav(blob); finishRef.current = false
    if (cancelRef.current) return
    if (!text) { setVErr('No speech heard.'); setVState('error'); return }
    setAnswers(a => ({ ...a, [field]: ((a as any)[field] ? (a as any)[field] + ' ' : '') + text })); setVState('idle'); sfxStep(idx + 1); setI(idx + 1)
  }
  async function startVoice(field: string, idx: number) {
    if (recRef.current || finishRef.current) return
    cancelRef.current = false; setVErr('')
    try { recRef.current = await recordWav(25, () => void finishVoice(field, idx)); if (cancelRef.current) { cancelVoice(); return } setVState('listening') }
    catch { setVErr('Microphone unavailable.'); setVState('error') }
  }
  // Voice mode: auto-arm each text step — one click at entry, hands-free thereafter.
  useEffect(() => { if (mode === 'speak' && isText && vState !== 'error') { const t = setTimeout(() => void startVoice(step.key as string, i), 350); return () => clearTimeout(t) } }, [i, mode]) // eslint-disable-line
  useEffect(() => { titleRef.current?.focus() }, [i])
  useEffect(() => () => { cancelRef.current = true; const r = recRef.current; recRef.current = null; if (r) void r.stop().catch(() => {}); document.getElementById('setup-wizard-btn')?.focus() }, [])

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'Tab' && cardRef.current) {
      const f = [...cardRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea')].filter(el => el.offsetParent !== null)
      if (!f.length) return; const first = f[0], lastEl = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus() } else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus() }
    }
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement) && valid) { e.preventDefault(); void advance() }
  }
  async function advance() {
    if (last) { setGenErr(false); const ok = await onGenerate(); if (!ok) setGenErr(true) } else go(i + 1)
  }
  const pickMode = (m: 'type' | 'speak') => { setMode(m); sfxPick(); setI(1); sfxStep(1) }
  async function compileAgent() {
    if (!rawGoal.trim() || compiling) return
    setCompiling(true); setPayload(null)
    const d = await api.setupAgent({ raw_goal: rawGoal, answers })
    setCompiling(false)
    if (d?.ok) { setPayload(d as SetupPayload); sfxPick();
      if (d.followup_question) setConvo(c => [...c.slice(-2), { q: d.followup_question, a: '' }]) }
  }
  async function voiceDump() {
    try { const rec = await recordWav(25); setVState('listening')
      const blob = await rec.stop().catch(() => null); setVState('idle')
      if (!blob) return; setVState('transcribing')
      const text = await transcribeWav(blob); setVState('idle')
      if (text) setRawGoal(g => (g ? g + ' ' : '') + text)
    } catch { setVState('idle') }
  }

  return (
    <div className="wz-back" onMouseDown={close}>
      <div ref={cardRef} className="wz-card" role="dialog" aria-modal="true" aria-label="Setup wizard" onMouseDown={e => e.stopPropagation()} onKeyDown={trapTab}>
        <div className="wz-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontFamily: '"Playfair Display",serif', letterSpacing: '.22em', fontSize: 11, color: '#A16207' }}>BYLINE</span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {mode === 'speak' && i > 0 && <button className="wz-pill" onClick={() => { cancelVoice(); setMode('type') }} aria-label="End voice session">{vState === 'listening' ? <><span className="rec" />Listening — tap to end</> : vState === 'transcribing' ? 'Transcribing…' : 'Voice on — tap to end'}</button>}
            <button className={`wz-icon ${muted ? '' : 'on'}`} aria-label="Toggle sound" onClick={() => { const m = sfxToggle(); setMuted(m); if (!m) sfxPick() }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5z" />{muted ? <line x1="22" y1="9" x2="16" y2="15" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</svg></button>
            <button className="wz-icon" aria-label="Close" onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </span>
        </div>
        <div className="wz-glowline" role="progressbar" aria-label="Wizard progress" aria-valuemin={0} aria-valuemax={STEPS.length - 1} aria-valuenow={i}><div className="wz-glowbar" style={{ width: `${(i / (STEPS.length - 1)) * 100}%` }} /></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`wz-chip ${tab === 'survey' ? 'on' : ''}`} onClick={() => setTab('survey')}>Survey</button>
          <button className={`wz-chip ${tab === 'agent' ? 'on' : ''}`} onClick={() => setTab('agent')}>Goal agent</button>
          <button className={`wz-chip ${tab === 'outline' ? 'on' : ''}`} onClick={() => setTab('outline')}>Outline{outline && outline.draft.some(d => d.state === 'pending') && ` (${outline.draft.filter(d => d.state === 'pending').length})`}</button>
          <button className={`wz-chip ${tab === 'search' ? 'on' : ''}`} onClick={() => setTab('search')}>Search</button>
        </div>
        {tab === 'agent' && <div style={{ display: 'grid', gap: 10 }}>
          <textarea className="wz-input" rows={4} value={rawGoal} onChange={e => setRawGoal(e.target.value)} placeholder="Paste raw goal — e.g. B2B SaaS pitch for conservative investors, zero hype, security + unit economics…" aria-label="Raw goal" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wz-chip" onClick={() => void voiceDump()}>{vState === 'transcribing' ? 'Transcribing…' : vState === 'listening' ? 'Listening…' : '🎙 Voice dump'}</button>
            <button className="wz-cta" disabled={!rawGoal.trim() || compiling} onClick={() => void compileAgent()}>{compiling ? 'Compiling…' : 'Compile payload →'}</button>
          </div>
          {convo.map((t, k) => <div key={k} className="meta" style={{ fontStyle: 'italic' }}>Agent: {t.q}<input className="wz-input" value={t.a} onChange={e => { const n = [...convo]; n[k] = { ...n[k], a: e.target.value }; setConvo(n) }} placeholder="Your answer…" onBlur={() => setRawGoal(g => g + ' ' + (convo[k]?.a || ''))} /></div>)}
          {payload && <div className="library-rule" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div className="kind-label">{payload.configuration_id} · {payload.dimensions.diction} · {payload.dimensions.tone}</div>
            <p><strong>Voice:</strong> {payload.dimensions.voice}</p>
            <p><strong>Style:</strong> {payload.dimensions.style}</p>
            <p><strong>Rules:</strong> {payload.active_preset_rules.join(', ')}</p>
            {payload.custom_rules.map(c => <p key={c.id}><strong>{c.id}:</strong> {c.rule}</p>)}
            <p className="meta">Ghost: {payload.ghost_text_filters.allowed_transitions.join(' · ')}</p>
            <button className="wz-cta" onClick={() => { onApplySetup?.(payload); onClose() }}>Apply to editor ✓</button>
          </div>}
        </div>}
        {tab === 'outline' && <div style={{ display: 'grid', gap: 10 }}>
          <div className="meta">Review-first: the outline never writes to the editor by itself. Compare each section against your draft, then insert or replace section by section.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wz-chip" disabled={generating} onClick={() => void outline?.onRegenerate()}>{generating ? 'Generating…' : '↻ Regenerate'}</button>
            <button className="wz-chip" disabled={!outline?.draft.some(d => d.state === 'pending')} onClick={() => outline?.onInsertAll()}>Insert all pending</button>
          </div>
          {!outline?.draft.length && <div className="meta">No outline yet — finish the survey and press Generate outline.</div>}
          {outline?.draft.map((o, k) => {
            const h = o.heading.trim().toLowerCase()
            const m = h ? outline.sections.find(s => { const d = s.heading.toLowerCase(); return d === h || (d && (d.includes(h) || h.includes(d))) }) : undefined
            return <div key={k} className="library-rule">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{k + 1}. {o.heading}</strong><span className="spacer" />
                <span className="kind-label">{o.state === 'pending' ? (m ? 'differs · in draft' : 'new · not in draft') : o.state}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                <div><div className="kind-label">Outline</div><p style={{ fontStyle: 'italic' }}>{o.purpose}</p>{o.points.map((p, j) => <p key={j}>· {p}</p>)}</div>
                <div><div className="kind-label">In draft now</div>{m ? <><p><strong>{m.heading}</strong></p><p className="meta">{m.preview || '—'}</p></> : <p className="meta">No matching section.</p>}</div>
              </div>
              {o.state === 'pending' && <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <button className="wz-chip" onClick={() => outline.onInsert(k, 'append')}>Insert as new section</button>
                {m && <button className="wz-chip" onClick={() => outline.onInsert(k, 'replace')}>Replace “{m.heading}”</button>}
                <button className="wz-chip" onClick={() => outline.onSkip(k)}>Skip</button>
              </div>}
            </div>
          })}
        </div>}
        {tab === 'search' && search && <div style={{ display: 'grid', gap: 10 }}>
          <div className="meta">Research without leaving the wizard. Results land in Sources too — insert citations from either place.</div>
          <input className="wz-input" value={search.url} onChange={e => search.setUrl(e.target.value)} placeholder="Research URL — web / PDF / paper" aria-label="Research URL" />
          <input className="wz-input" value={search.question} onChange={e => search.setQuestion(e.target.value)} placeholder="Question (optional)" aria-label="Research question" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wz-cta" disabled={!search.url || search.searching} onClick={() => search.onSearch()}>{search.searching ? 'Researching…' : 'Research URL'}</button>
            <label className="wz-chip" style={{ cursor: 'pointer' }}>Upload file<input type="file" hidden accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.docx,.csv,.xlsx,.tsv" onChange={e => { const f = e.target.files?.[0]; if (f) search.onUpload(f); e.target.value = '' }} /></label>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {search.facts.map((f, k) => <div key={k} className="library-rule"><div className="kind-label">Fact{f.locator ? ` · ${f.locator}` : ''}</div><p>{f.fact}</p><p className="meta">{f.source_title || f.url}{f.excerpt ? ` — “${f.excerpt}”` : ''}</p><button className="wz-chip" onClick={() => search.onInsertFact(f)}>Insert citation</button></div>)}
            {search.readings.map((r, k) => <div key={k} className="library-rule"><a href={textFragmentUrl(r.url, r.excerpt || r.claim_quote)} target="_blank" rel="noreferrer">{r.title || r.url}</a><p className="meta">vs “{r.claim_quote}” — {r.why}</p></div>)}
            {!search.facts.length && !search.readings.length && <div className="meta">No results yet.</div>}
          </div>
        </div>}
        {tab === 'survey' && <>
        <div className="wz-step" key={i} aria-live="polite">
          <h2 ref={titleRef} tabIndex={-1} id="wz-title" className="wz-title" style={{ outline: 'none' }}>{step.title} {step.gold && <span className="gold">{step.gold}</span>}</h2>
          <div style={{ marginTop: 26, minHeight: 92 }}>
            {step.key === 'welcome' && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="wz-chip" onClick={() => pickMode('type')}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>Type</span></button>
              <button className="wz-chip" onClick={() => pickMode('speak')}><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 19v3" /></svg>Speak — hands-free</span></button>
            </div>}
            {(step.key === 'goal' || step.key === 'audience' || step.key === 'voice_note') && <input className="wz-input" value={(answers as any)[step.key]} placeholder={step.ph} aria-labelledby="wz-title" onChange={e => setAnswers(a => ({ ...a, [step.key]: e.target.value }))} />}
            {step.key === 'key_points' && <textarea className="wz-input" rows={3} value={answers.key_points} aria-labelledby="wz-title" onChange={e => setAnswers(a => ({ ...a, key_points: e.target.value }))} />}
            {step.key === 'doc_type' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{DOCS.map(d => <button key={d} className={`wz-chip ${answers.doc_type === d ? 'on' : ''}`} aria-pressed={answers.doc_type === d} onClick={() => { sfxPick(); setAnswers(a => ({ ...a, doc_type: d })) }}>{d}</button>)}</div>}
            {step.key === 'audience_level' && <div className="wz-row">{[1, 2, 3, 4, 5].map(n => <button key={n} className={`wz-dot ${answers.audience_level === n ? 'on' : ''}`} aria-label={`Audience level ${n}`} aria-pressed={answers.audience_level === n} onClick={() => { sfxStep(n); setAnswers(a => ({ ...a, audience_level: n })) }}>{n}</button>)}<span style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--wz-sub)' }}>beginner → expert</span></div>}
            {vState === 'error' && <div role="alert" style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><span style={{ color: '#B3261E', fontSize: 14 }}>{vErr}</span><button className="wz-chip" onClick={() => { setVState('idle'); void startVoice(step.key as string, i) }}>Retry</button><button className="wz-chip" onClick={() => { setVState('idle'); go(i + 1) }}>Skip</button></div>}
            {genErr && <div role="alert" style={{ marginTop: 14, color: '#B3261E', fontSize: 14 }}>Generation failed — check connection, retry.</div>}
          </div>
        </div>
        <div className="wz-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          {i === 0 ? <span /> : <button className="wz-chip" onClick={() => go(i - 1)}>← Back</button>}
          {i > 0 && <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 12, color: 'var(--wz-sub)' }}>{i} / {STEPS.length - 1}</span>}
          {step.key !== 'welcome' && (last
            ? <button className="wz-cta" disabled={generating} aria-busy={generating} onClick={() => void advance()}>{generating ? 'Generating…' : 'Generate outline'}</button>
            : <button className="wz-cta" disabled={!valid || vState === 'transcribing'} onClick={() => void advance()}>{step.key === 'voice_note' && !answers.voice_note.trim() ? 'Skip →' : 'Continue →'}</button>)}
        </div>
        </>}
      </div>
    </div>
  )
}
