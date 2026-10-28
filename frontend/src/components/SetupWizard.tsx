import { useEffect, useRef, useState } from 'react'
import { sfxStep, sfxPick, sfxToggle, sfxMuted } from '../lib/sfx'
import { api } from '../lib/api'
import type { OutlineDraft, DocSection } from '../lib/types'
import '../styles/setup-wizard.css'

export type SetupPayload = { configuration_id: string; dimensions: { diction: string; tone: string; voice: string; style: string }; active_preset_rules: string[]; custom_rules: { id: string; category: string; rule: string }[]; ghost_text_filters: { starter_categories: string[]; allowed_transitions: string[] }; followup_question?: string }
export type Answers = { goal: string; doc_type: string; audience: string; audience_level: number; key_points: string; voice_note: string; choices?: Record<string, string> }
export type WizardTab = 'survey' | 'outline'
export type OutlineReview = { draft: OutlineDraft[]; sections: DocSection[]; onInsert: (i: number, mode: 'append' | 'replace') => void; onInsertAll: () => void; onSkip: (i: number) => void; onRegenerate: () => Promise<boolean>; generating: boolean; onUpdate?: (i: number, patch: Partial<OutlineDraft>) => void }
type Q = { id: string; question: string; maps_to: string; options: string[] }

const FALLBACK_QS: Q[] = [
  { id: 'q_diction', question: 'Which register fits this piece?', maps_to: 'diction', options: ['General', 'Formal', 'Academic', 'Casual', 'Technical'] },
  { id: 'q_tone', question: 'Tone readers should feel?', maps_to: 'tone', options: ['Serious', 'Objective', 'Humorous', 'Emotional'] },
  { id: 'q_audience', question: 'Who reads this first?', maps_to: 'audience', options: ['Beginners', 'General readers', 'Practitioners', 'Experts'] },
  { id: 'q_voice', question: 'Voice closest to yours?', maps_to: 'voice', options: ['Direct and plain', 'Warm and personal', 'Analytical and precise', 'Bold and opinionated'] },
  { id: 'q_outline', question: 'Outline should prioritise?', maps_to: 'outline_focus', options: ['Argument first', 'Story / chronology', 'Problem → solution', 'Comparison'] },
]

export default function SetupWizard({ answers, setAnswers, onClose, onGenerate, generating, tab, setTab, outline }: {
  answers: Answers; setAnswers: (f: (a: Answers) => Answers) => void; onClose: () => void
  onGenerate: (a?: Answers) => Promise<boolean>; generating: boolean; onApplySetup?: (p: SetupPayload) => void
  tab: WizardTab; setTab: (t: WizardTab) => void; outline?: OutlineReview; search?: unknown
}) {
  const [muted, setMuted] = useState(sfxMuted())
  const [context, setContext] = useState(answers.key_points || '')
  const [questions, setQuestions] = useState<Q[]>([])
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [asking, setAsking] = useState(false); const [genErr, setGenErr] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const close = () => onClose()
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, []) // eslint-disable-line

  async function askFollowups() {
    if (!answers.goal.trim() || asking) return
    setAsking(true)
    const d = await api.setupQuestions({ goal: answers.goal, context })
    setAsking(false)
    const qs: Q[] = Array.isArray(d?.questions) && d.questions.length >= 3 ? d.questions : FALLBACK_QS
    setQuestions(qs); sfxPick()
  }
  function finish() {
    const choices: Record<string, string> = {}
    for (const q of questions) { const v = (other[q.id]?.trim() || picks[q.id] || ''); if (v) choices[q.maps_to] = v }
    const enriched: Answers = {
      ...answers, goal: answers.goal, key_points: context,
      audience: choices.audience || answers.audience,
      voice_note: choices.voice || choices.tone || answers.voice_note,
      choices,
    }
    setAnswers(() => enriched)
    setGenErr(false)
    void onGenerate(enriched).then(ok => { if (!ok) setGenErr(true) })
  }
  const answered = questions.filter(q => picks[q.id] || other[q.id]?.trim()).length

  return (
    <div className="wz-back" onMouseDown={close}>
      <div ref={cardRef} className="wz-card" role="dialog" aria-modal="true" aria-label="Setup" onMouseDown={e => e.stopPropagation()}>
        <div className="wz-row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontFamily: '"Playfair Display",serif', letterSpacing: '.22em', fontSize: 11, color: '#A16207' }}>BYLINE SETUP</span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={`wz-icon ${muted ? '' : 'on'}`} aria-label="Toggle sound" onClick={() => { const m = sfxToggle(); setMuted(m); if (!m) sfxPick() }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5z" />{muted ? <line x1="22" y1="9" x2="16" y2="15" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</svg></button>
            <button className="wz-icon" aria-label="Close" onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '14px 0 12px', flexWrap: 'wrap' }}>
          <button className={`wz-chip ${tab === 'survey' ? 'on' : ''}`} onClick={() => setTab('survey')}>Setup questions</button>
          <button className={`wz-chip ${tab === 'outline' ? 'on' : ''}`} onClick={() => setTab('outline')}>Outline{outline && outline.draft.some(d => d.state === 'pending') && ` (${outline.draft.filter(d => d.state === 'pending').length})`}</button>
        </div>

        {tab === 'survey' && <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <h2 className="wz-title" style={{ fontSize: 26 }}>What do you wanna write?</h2>
            <input className="wz-input" value={answers.goal} placeholder="Argue cats are better than dogs…" aria-label="What do you wanna write" onChange={e => setAnswers(a => ({ ...a, goal: e.target.value }))} />
          </div>
          <div>
            <h2 className="wz-title" style={{ fontSize: 26 }}>What is the context?</h2>
            <textarea className="wz-input" rows={3} value={context} placeholder="Assignment, audience, stakes, must-cover points, source material…" aria-label="Context" onChange={e => setContext(e.target.value)} />
          </div>
          {!questions.length
            ? <div className="wz-row"><button className="wz-cta" disabled={!answers.goal.trim() || asking} onClick={() => void askFollowups()}>{asking ? 'Thinking…' : 'Generate follow-up questions →'}</button>
                <button className="wz-chip" disabled={!answers.goal.trim() || generating} onClick={finish}>{generating ? 'Generating…' : 'Skip questions, generate outline'}</button></div>
            : <>
              <div className="meta">Fast picks — every answer maps into Context, diction, style, and outline. {answered}/{questions.length} answered.</div>
              {questions.map((q, qi) => <div key={q.id} className="library-rule" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{qi + 1}. {q.question}</strong><span className="kind-label">→ {q.maps_to}</span></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {q.options.map(o => <button key={o} className={`wz-chip ${picks[q.id] === o ? 'on' : ''}`} aria-pressed={picks[q.id] === o} onClick={() => { sfxStep(qi + 1); setPicks(p => ({ ...p, [q.id]: o })) }}>{o}</button>)}
                </div>
                <input className="wz-input" style={{ fontSize: 14, marginTop: 6 }} value={other[q.id] || ''} placeholder="Or type your own…" aria-label={`Own answer: ${q.question}`} onChange={e => setOther(p => ({ ...p, [q.id]: e.target.value }))} />
              </div>)}
              {genErr && <div role="alert" style={{ color: '#B3261E', fontSize: 14 }}>Generation failed — check connection, retry.</div>}
              <div className="wz-row"><button className="wz-chip" onClick={() => { setQuestions([]); setPicks({}); setOther({}) }}>← Back</button><span className="spacer" />
                <button className="wz-cta" disabled={generating} onClick={finish}>{generating ? 'Generating…' : 'Apply settings + generate outline →'}</button></div>
            </>}
        </div>}

        {tab === 'outline' && <div style={{ display: 'grid', gap: 10 }}>
          <div className="meta">Editable outline workspace. Edit headings/points here or in Outline dock — blocks stay linked to writing space: click a block to jump, writing caret highlights matching block.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wz-chip" disabled={generating} onClick={() => void outline?.onRegenerate()}>{generating ? 'Generating…' : '↻ Regenerate'}</button>
            <button className="wz-chip" disabled={!outline?.draft.some(d => d.state === 'pending')} onClick={() => outline?.onInsertAll()}>Insert all pending</button>
          </div>
          {!outline?.draft.length && <div className="meta">No outline yet — answer setup questions first.</div>}
          {outline?.draft.map((o, k) => {
            const h = o.heading.trim().toLowerCase()
            const m = h ? outline.sections.find(s => { const d = s.heading.toLowerCase(); return d === h || (d && (d.includes(h) || h.includes(d))) }) : undefined
            return <div key={k} className="library-rule">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>{k + 1}.</strong>
                <input className="wz-input" style={{ flex: 1, fontSize: 16 }} value={o.heading} aria-label={`Outline heading ${k + 1}`} onChange={e => outline.onUpdate?.(k, { heading: e.target.value })} />
                <span className="kind-label">{o.state === 'pending' ? (m ? 'in draft' : 'new') : o.state}</span>
              </div>
              <textarea className="wz-input" rows={2} style={{ fontSize: 13 }} value={o.purpose} placeholder="Purpose…" aria-label={`Outline purpose ${k + 1}`} onChange={e => outline.onUpdate?.(k, { purpose: e.target.value })} />
              <textarea className="wz-input" rows={3} style={{ fontSize: 13 }} value={(o.points || []).join('\n')} placeholder={'One point per line…'} aria-label={`Outline points ${k + 1}`} onChange={e => outline.onUpdate?.(k, { points: e.target.value.split('\n') })} />
              {m && <div className="meta" style={{ marginTop: 4 }}>In draft now: <strong>{m.heading}</strong> — {m.preview || '—'}</div>}
              {o.state === 'pending' && <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <button className="wz-chip" onClick={() => outline.onInsert(k, 'append')}>Insert as new section</button>
                {m && <button className="wz-chip" onClick={() => outline.onInsert(k, 'replace')}>Replace “{m.heading}”</button>}
                <button className="wz-chip" onClick={() => outline.onSkip(k)}>Skip</button>
              </div>}
            </div>
          })}
        </div>}
      </div>
    </div>
  )
}
