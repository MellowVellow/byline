import { useEffect, useRef, useState } from 'react'
import { sfxStep, sfxBack, sfxPick, sfxToggle, sfxMuted } from '../lib/sfx'
import { recordWav } from '../lib/wav'
import { transcribeWav } from '../lib/api'
import '../styles/setup-wizard.css'

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

export default function SetupWizard({ answers, setAnswers, onClose, onGenerate, generating }: {
  answers: Answers; setAnswers: (f: (a: Answers) => Answers) => void; onClose: () => void; onGenerate: () => Promise<boolean>; generating: boolean
}) {
  const [i, setI] = useState(0), [muted, setMuted] = useState(sfxMuted()), [mode, setMode] = useState<'type' | 'speak'>('type')
  const [vState, setVState] = useState<VState>('idle'), [vErr, setVErr] = useState(''), [genErr, setGenErr] = useState(false)
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
      </div>
    </div>
  )
}
