import { useEffect, useState } from 'react'
import { COLOR_PRESETS, DEFAULT_SETTINGS, SHORTCUTS, type AppSettings } from '../lib/settings'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import { sfxMuted, sfxToggle, sfxPick, blip } from '../lib/sfx'

type Tab = 'models' | 'writing' | 'colors' | 'ui' | 'shortcuts'

const APPROVED_META_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B Instruct (Primary frontier reasoning)', provider: 'OpenRouter' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B Instruct (High capability)', provider: 'OpenRouter' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Meta Llama 3.1 8B Instruct (Ultra-fast latency)', provider: 'OpenRouter' },
  { id: 'muse-spark-1.3', label: 'Muse Spark 1.3 (Meta Model API)', provider: 'Meta API' },
  { id: 'muse-glimmer-30b', label: 'Muse Glimmer 30B (Meta Model API)', provider: 'Meta API' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Meta Llama 3.3 70B (Baseten Hosted)', provider: 'Baseten' },
]

const COLOR_FIELDS: { key: 'ai' | 'grammar' | 'sources' | 'wordChoice' | 'suggest'; label: string; hint: string }[] = [
  { key: 'grammar', label: 'Grammar (Red)', hint: 'Language correctness, determinism, spelling' },
  { key: 'ai', label: 'Reader (Purple)', hint: 'Reader perception, ambiguity observations' },
  { key: 'wordChoice', label: 'Supervisor (Yellow)', hint: 'Structural flow, intent review, alternatives' },
  { key: 'sources', label: 'Researcher (Blue)', hint: 'Evidence grounding, claim status, citations' },
  { key: 'suggest', label: 'Draft Ghost (Grey)', hint: 'Contextual draft completions' },
]

export default function SettingsMenu({
  settings,
  onChange,
  onClose,
}: {
  settings: AppSettings
  onChange: (s: AppSettings) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('models')
  const [muted, setMuted] = useState(sfxMuted())

  const set = (p: Partial<AppSettings>) => {
    blip('select')
    onChange({ ...settings, ...p })
  }

  useEffect(() => {
    blip('open')
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    addEventListener('keydown', f)
    return () => removeEventListener('keydown', f)
  }, [onClose])

  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade settings-modal" role="dialog" aria-label="Settings" onMouseDown={e => e.stopPropagation()}>
        <div className="library-head">
          <strong>Settings</strong>
          <span className="meta">Byline Workspace & Inference Configuration</span>
          <span className="spacer" />
          <button onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Reset defaults</button>
          <button onClick={onClose}>
            Close <span className="kbd">Esc</span>
          </button>
        </div>

        <div className="dock-tabs" style={{ padding: '12px 16px 0' }} role="tablist" aria-label="Settings sections">
          {(
            [
              ['models', 'Meta AI Inference'],
              ['writing', 'Writing Profile'],
              ['colors', 'Colors & Personas'],
              ['ui', 'Editor & UI'],
              ['shortcuts', 'Shortcuts'],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => {
                blip('select')
                setTab(t)
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="library-scroll" style={{ padding: '16px 20px' }}>
          {/* Tab 1: Meta AI Inference Settings */}
          {tab === 'models' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--ink-2)',
                  borderRadius: 6,
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-5)' }}>
                  Meta-Authored Models Only
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4, lineHeight: 1.5 }}>
                  Byline strictly utilizes Meta-authored models across Meta Model API, OpenRouter, and Baseten.
                  Credentials are guarded exclusively on the server.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                  Active Meta Model
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--ink-2)',
                    background: 'var(--paper-1)',
                    color: 'var(--ink-5)',
                    marginTop: 4,
                  }}
                  value={settings.metaModel}
                  onChange={e => set({ metaModel: e.target.value })}
                >
                  {APPROVED_META_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.provider}] {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                    Temperature
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                    {settings.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={settings.temperature}
                  onChange={e => set({ temperature: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                    Top-P
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                    {settings.topP.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={settings.topP}
                  onChange={e => set({ topP: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                    Max Output Tokens
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                    {settings.maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={settings.maxTokens}
                  onChange={e => set({ maxTokens: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                  Reasoning Effort (Meta API)
                </label>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 4 }}>
                  {(['minimal', 'low', 'medium'] as const).map(eff => (
                    <button
                      key={eff}
                      type="button"
                      className={settings.reasoningEffort === eff ? 'active' : ''}
                      style={{ flex: 1 }}
                      onClick={() => set({ reasoningEffort: eff })}
                    >
                      {eff[0].toUpperCase() + eff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Writing Profile */}
          {tab === 'writing' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                  Writing Theme
                </label>
                <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                  {Object.values(THEME_DEFINITIONS).map(th => (
                    <div
                      key={th.id}
                      onClick={() => set({ writingTheme: th.id })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: settings.writingTheme === th.id ? '2px solid #A93226' : '1px solid var(--ink-2)',
                        background: settings.writingTheme === th.id ? 'var(--paper-2)' : 'var(--paper-1)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-5)' }}>{th.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{th.tagline}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>{th.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                  Document Language
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--ink-2)',
                    background: 'var(--paper-1)',
                    color: 'var(--ink-5)',
                    marginTop: 4,
                  }}
                  value={settings.language}
                  onChange={e => set({ language: e.target.value })}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={settings.autoApplyGrammar}
                  onChange={e => set({ autoApplyGrammar: e.target.checked })}
                />
                Automatically apply grammar fixes in editing mode
              </label>
            </div>
          )}

          {/* Tab 3: Colors */}
          {tab === 'colors' && (
            <>
              <label>Theme</label>
              <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                {(['light', 'dark', 'system'] as const).map(t => (
                  <button
                    key={t}
                    className={settings.theme === t ? 'active' : ''}
                    style={{ flex: 1 }}
                    onClick={() => set({ theme: t })}
                  >
                    {t === 'system' ? 'System' : t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <label>Color preset</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(COLOR_PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    onClick={() =>
                      set({
                        ai: p.ai,
                        grammar: p.grammar,
                        sources: p.sources,
                        wordChoice: p.wordChoice,
                        selection: p.selection,
                        suggest: p.suggest,
                      })
                    }
                    title={p.label}
                  >
                    <span style={{ display: 'inline-flex', gap: 3, marginRight: 6 }}>
                      {[p.grammar, p.ai, p.sources, p.suggest, p.wordChoice].map(c => (
                        <span key={c} className="swatch" style={{ background: c }} />
                      ))}
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
              <label>Annotation colors for 4 Personas</label>
              {COLOR_FIELDS.map(f => (
                <div key={f.key} className="settings-row">
                  <span className="swatch" style={{ background: settings[f.key], width: 14, height: 14 }} />
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{f.label}</strong>
                    <div className="meta">{f.hint}</div>
                  </span>
                  <input
                    type="color"
                    aria-label={f.label}
                    value={settings[f.key]}
                    onChange={e => set({ [f.key]: e.target.value } as Partial<AppSettings>)}
                  />
                  <span className="meta" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {settings[f.key]}
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Tab 4: UI */}
          {tab === 'ui' && (
            <>
              <label>Editor font</label>
              <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                {([['serif', 'Serif'], ['sans', 'Sans'], ['mono', 'Mono']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    className={settings.editorFont === v ? 'active' : ''}
                    style={{ flex: 1 }}
                    onClick={() => set({ editorFont: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label>Font size · {settings.fontSize}px</label>
              <input
                type="range"
                min={16}
                max={22}
                step={1}
                value={settings.fontSize}
                onChange={e => set({ fontSize: Number(e.target.value) })}
                style={{ width: '100%', maxWidth: 360 }}
              />
              <label>Line height · {settings.lineHeight.toFixed(2)}</label>
              <input
                type="range"
                min={1.4}
                max={1.9}
                step={0.05}
                value={settings.lineHeight}
                onChange={e => set({ lineHeight: Number(e.target.value) })}
                style={{ width: '100%', maxWidth: 360 }}
              />
              <label>Text width</label>
              <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                {([['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    className={settings.paperWidth === v ? 'active' : ''}
                    style={{ flex: 1 }}
                    onClick={() => set({ paperWidth: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label>Interface density</label>
              <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                {([['comfortable', 'Comfortable'], ['compact', 'Compact']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    className={settings.density === v ? 'active' : ''}
                    style={{ flex: 1 }}
                    onClick={() => set({ density: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <label className="settings-row" style={{ cursor: 'pointer' }}>
                <span style={{ flex: 1 }}>UI sound effects (melodic audio cues)</span>
                <button
                  role="switch"
                  aria-checked={!muted}
                  aria-label="UI sound effects"
                  className={`switch ${!muted ? 'on' : ''}`}
                  onClick={e => {
                    e.preventDefault()
                    const m = sfxToggle()
                    setMuted(m)
                    if (!m) sfxPick()
                  }}
                >
                  <span className="knob" />
                </button>
              </label>
              {(
                [
                  ['showWordCount', 'Show word / character count'],
                  ['showMetrics', 'Show ghost-acceptance metrics in top bar'],
                  ['spellcheck', 'Browser spellcheck in editor'],
                  ['reduceMotion', 'Reduce motion (disable spinner / pulse animations)'],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="settings-row" style={{ cursor: 'pointer' }}>
                  <span style={{ flex: 1 }}>{l}</span>
                  <button
                    role="switch"
                    aria-checked={settings[k]}
                    aria-label={l}
                    className={`switch ${settings[k] ? 'on' : ''}`}
                    onClick={e => {
                      e.preventDefault()
                      set({ [k]: !settings[k] } as Partial<AppSettings>)
                    }}
                  >
                    <span className="knob" />
                  </button>
                </label>
              ))}
            </>
          )}

          {/* Tab 5: Shortcuts */}
          {tab === 'shortcuts' && (
            <>
              <p className="meta" style={{ marginTop: 0 }}>
                Key controls: <strong>1, 2, 3</strong> accept alternatives · <strong>Tab</strong> accepts first ·{' '}
                <strong>Alt</strong> rerolls
              </p>
              {SHORTCUTS.map(g => (
                <div key={g.group} style={{ marginBottom: 16 }}>
                  <div className="kind-label" style={{ fontSize: 12, color: 'var(--ai)' }}>
                    {g.group}
                  </div>
                  {g.items.map((s, i) => (
                    <div key={i} className="shortcut-row">
                      <span>
                        {s.action}
                        {s.context && <span className="meta"> · {s.context}</span>}
                      </span>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {s.keys.split(' / ').map(k => (
                          <span key={k} className="kbd">
                            {k}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
