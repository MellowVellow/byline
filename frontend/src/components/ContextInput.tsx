import React from 'react'

export interface ContextInputProps {
  value: string
  onChange: (v: string) => void
}

/** Draft context strip — a plain scratch note above the editor (spec §7).
 * Display-only: its contents are never sent to any AI prompt.
 */
export default function ContextInput({ value, onChange }: ContextInputProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor="byline-context" title="What am I writing about? Who is the audience? What should I achieve?" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Context
      </label>
      <textarea
        id="byline-context"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="What am I writing about? Who is the audience? What should I achieve?"
        title="What am I writing about? Who is the audience? What should I achieve? Private note — never sent to AI."
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
      />
    </div>
  )
}
