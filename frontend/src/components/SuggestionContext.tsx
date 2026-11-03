import React from 'react'
import { THEME_DEFINITIONS } from '../domain/writing-profile'
import type { ThemeId } from '../domain/document'

export interface SuggestionContextProps {
  value: string
  onChange: (v: string) => void
}

const THEME_IDS = Object.keys(THEME_DEFINITIONS) as ThemeId[]

export const themeTemplate = (id: ThemeId): string => {
  const th = THEME_DEFINITIONS[id]
  return `${th.name}: ${th.description}`
}

export default function SuggestionContext({ value, onChange }: SuggestionContextProps) {
  return (
    <div style={{ flex: '1 1 280px', minWidth: 220, marginBottom: 12 }}>
      <label
        htmlFor="byline-suggestion-context"
        title="Tone, audience, and constraints for ghost text and paraphrase suggestions."
        style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}
      >
        SUGGESTION CONTEXT
      </label>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {THEME_IDS.map(id => {
          const template = themeTemplate(id)
          const active = value.trim() === template
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(template)}
              title={template}
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
              {THEME_DEFINITIONS[id].name}
            </button>
          )
        })}
      </div>
      <textarea
        id="byline-suggestion-context"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="What should suggestions sound like? Tone, audience, constraints…"
        title="Tone, audience, and constraints for ghost text and paraphrase suggestions."
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
      />
    </div>
  )
}
