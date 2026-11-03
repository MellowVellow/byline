import React from 'react'
import type { ReviewTemplate } from '../lib/review-templates'

export interface ContextInputProps {
  value: string
  onChange: (v: string) => void
  templates?: ReviewTemplate[]
}
export default function ContextInput({ value, onChange, templates = [] }: ContextInputProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor="byline-context" title="What am I writing about? Who is the audience? What should I achieve?" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        REVIEW CONTEXT
      </label>
      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
          {templates.map(t => {
            const active = value.trim() === t.text
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.text)}
                title={t.text}
                style={{
                  fontSize: 10.5,
                  padding: '2px 7px',
                  minHeight: 22,
                  height: 22,
                  borderRadius: 99,
                  border: '1px solid var(--border)',
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--muted)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}
      <textarea
        id="byline-context"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="What am I writing about? Who is the audience? What should I achieve?"
        title="What am I writing about? Who is the audience? What should I achieve?"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
      />
    </div>
  )
}
