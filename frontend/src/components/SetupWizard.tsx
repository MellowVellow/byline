import React, { useState, useEffect } from 'react'
import { blip, sfxAccept } from '../lib/sfx'

export interface SetupWizardProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the composed context paragraph (fills the context box). */
  onComplete: (paragraph: string) => void
  initial?: string
}

/** Setup wizard: three questions → one context paragraph.
 * The paragraph fills the context box above the draft.
 * Prompts send text only.
 */
export default function SetupWizard({ isOpen, onClose, onComplete, initial = '' }: SetupWizardProps) {
  const [what, setWhat] = useState('')
  const [who, setWho] = useState('')
  const [goal, setGoal] = useState('')

  // Prefill fields from existing context note so reopening setup edits, not blanks
  useEffect(() => {
    if (!isOpen) return
    const src = initial || ''
    const pick = (re: RegExp) => {
      const m = src.match(re)
      return m ? m[1].trim() : ''
    }
    setWhat(pick(/Writing about:\s*(.+?)(?=\.\s*(?:Audience|Goal):|$)/is))
    setWho(pick(/Audience:\s*(.+?)(?=\.\s*(?:Goal):|$|\.\s*$)/is))
    setGoal(pick(/Goal:\s*(.+?)(?=\.\s*$|$)/is))
    // If no labeled parts, put raw note into Topic so nothing is lost
    if (src.trim() && !/Writing about:|Audience:|Goal:/i.test(src)) {
      setWhat(src.trim())
      setWho('')
      setGoal('')
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const compose = () => {
    const parts = [
      what.trim() && `Writing about: ${what.trim()}.`,
      who.trim() && `Audience: ${who.trim()}.`,
      goal.trim() && `Goal: ${goal.trim()}.`,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : initial
  }

  const finish = () => {
    sfxAccept()
    onComplete(compose())
    onClose()
  }

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{label}</span>
      <textarea
        value={value}
        onChange={e => set(e.target.value)}
        rows={2}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
      />
    </label>
  )

  return (
    <div className="library-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Setup wizard">
      <div className="library-modal fade" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="library-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Setup — describe your document</h3>
          <button type="button" onClick={() => { blip('toggle'); onClose() }} title="Close (Esc)" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}>✕</button>
        </div>
        <div style={{ padding: '14px 18px' }}>
          {field('Topic', what, setWhat, 'e.g. Does AI reduce creativity')}
          {field('Readers', who, setWho, 'e.g. General readers')}
          {field('Goal', goal, setGoal, 'e.g. Present a balanced view')}
          <p className="meta" style={{ fontSize: 12, margin: '4px 0 12px' }}>
            This fills the context note above the draft. The note stays in your browser.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { blip('toggle'); onClose() }}>Skip</button>
            <button type="button" className="primary" onClick={finish}>Start writing →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
