import { useEffect, useState } from 'react'
import { COLOR_PRESETS, DEFAULT_SETTINGS, SHORTCUTS, type AppSettings } from '../lib/settings'
import { sfxMuted, sfxToggle, sfxPick, blip } from '../lib/sfx'

type Tab = 'inference' | 'ui' | 'shortcuts'

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
  { key: 'ai', label: 'Reader (Purple)', hint: 'Reader perception, tone & ambiguity observations' },
  { key: 'wordChoice', label: 'Supervisor (Yellow)', hint: 'Structural flow, plan adherence, alternatives' },
  { key: 'sources', label: 'Researcher (Blue)', hint: 'Evidence grounding, claim verification, citations' },
  { key: 'suggest', label: 'Draft Ghost (Grey)', hint: 'Contextual draft completions and suggestions' },
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
  const [tab, setTab] = useState<Tab>('inference')
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
          <div>
            <strong>Settings</strong>
            <div className="meta" style={{ marginTop: 2 }}>Workspace, Meta AI inference & interface preferences</div>
          </div>
          <span className="spacer" />
          <button type="button" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Reset defaults</button>
          <button type="button" onClick={onClose}>
            Close <span className="kbd">Esc</span>
          </button>
        </div>

        <div className="dock-tabs" style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)' }} role="tablist" aria-label="Settings sections">
          {(
            [
              ['inference', 'Meta AI Inference'],
              ['ui', 'Editor UI Settings'],
              ['shortcuts', 'Shortcuts'],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              type="button"
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

        <div className="library-scroll" style={{ padding: '18px 22px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Tab 1: Meta AI Inference Settings */}
          {tab === 'inference' && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  background: 'color-mix(in srgb, var(--ai) 8%, var(--paper))',
                  border: '1px solid color-mix(in srgb, var(--ai) 25%, var(--border))',
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                  Meta-Authored Models Only
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                  Byline strictly utilizes Meta-authored frontier models across Meta Model API, OpenRouter, and Baseten.
                  Credentials are authenticated server-side.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Active Meta Model
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    marginTop: 6,
                    fontSize: 13,
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Temperature
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
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
                  style={{ width: '100%', marginTop: 6 }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Lower for deterministic, precise analysis; higher for creative drafting variance.
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Top-P (Nucleus Sampling)
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
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
                  style={{ width: '100%', marginTop: 6 }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Max Output Tokens
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
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
                  style={{ width: '100%', marginTop: 6 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Reasoning Effort (Meta API)
                </label>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 6 }}>
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
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Controls depth of thinking passes before returning draft recommendations.
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Editor UI Settings (Colors, Document Setup, SFX) */}
          {tab === 'ui' && (
            <div style={{ display: 'grid', gap: 24 }}>
              {/* Section 1: Colors & Personas */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                  Colors & Personas
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Theme Mode
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 6 }}>
                    {(['light', 'dark', 'system'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        className={settings.theme === t ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => set({ theme: t })}
                      >
                        {t === 'system' ? 'System' : t[0].toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Color Palette Preset
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {Object.entries(COLOR_PRESETS).map(([k, p]) => (
                      <button
                        key={k}
                        type="button"
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
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12 }}
                      >
                        <span style={{ display: 'inline-flex', gap: 3 }}>
                          {[p.grammar, p.ai, p.sources, p.suggest, p.wordChoice].map(c => (
                            <span key={c} className="swatch" style={{ background: c, width: 9, height: 9, borderRadius: '50%' }} />
                          ))}
                        </span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Persona Annotation Colors
                  </label>
                  {COLOR_FIELDS.map(f => (
                    <div key={f.key} className="settings-row" style={{ padding: '6px 0', borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
                      <span className="swatch" style={{ background: settings[f.key], width: 14, height: 14, borderRadius: 3, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{f.label}</strong>
                        <div className="meta" style={{ fontSize: 11 }}>{f.hint}</div>
                      </span>
                      <input
                        type="color"
                        aria-label={f.label}
                        value={settings[f.key]}
                        onChange={e => set({ [f.key]: e.target.value } as Partial<AppSettings>)}
                        style={{ border: 'none', background: 'transparent', width: 28, height: 28, cursor: 'pointer' }}
                      />
                      <span className="meta" style={{ fontVariantNumeric: 'tabular-nums', width: 62, textAlign: 'right', fontSize: 12 }}>
                        {settings[f.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Document Setup */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                  Document Setup & Typography
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Editor Font
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 6 }}>
                    {([['serif', 'Serif'], ['sans', 'Sans'], ['mono', 'Mono']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        className={settings.editorFont === v ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => set({ editorFont: v })}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                      Font Size
                    </label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{settings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={22}
                    step={1}
                    value={settings.fontSize}
                    onChange={e => set({ fontSize: Number(e.target.value) })}
                    style={{ width: '100%', maxWidth: 360, marginTop: 6 }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                      Line Height
                    </label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{settings.lineHeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.4}
                    max={1.9}
                    step={0.05}
                    value={settings.lineHeight}
                    onChange={e => set({ lineHeight: Number(e.target.value) })}
                    style={{ width: '100%', maxWidth: 360, marginTop: 6 }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Paper Layout Width
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 6 }}>
                    {([['narrow', 'Narrow (58ch)'], ['normal', 'Normal (72ch)'], ['wide', 'Wide (88ch)']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        className={settings.paperWidth === v ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => set({ paperWidth: v })}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                    Interface Density
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360, marginTop: 6 }}>
                    {([['comfortable', 'Comfortable'], ['compact', 'Compact']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        className={settings.density === v ? 'active' : ''}
                        style={{ flex: 1 }}
                        onClick={() => set({ density: v })}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label className="settings-row" style={{ cursor: 'pointer', padding: '6px 0' }}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Browser Spellcheck</strong>
                      <div className="meta" style={{ fontSize: 11 }}>Enable native browser red squiggly spellchecker in draft editor</div>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.spellcheck}
                      aria-label="Browser spellcheck"
                      className={`switch ${settings.spellcheck ? 'on' : ''}`}
                      onClick={e => {
                        e.preventDefault()
                        set({ spellcheck: !settings.spellcheck })
                      }}
                    >
                      <span className="knob" />
                    </button>
                  </label>

                  <label className="settings-row" style={{ cursor: 'pointer', padding: '6px 0' }}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Auto-apply Grammar Fixes</strong>
                      <div className="meta" style={{ fontSize: 11 }}>Automatically apply safe high-confidence grammar edits in Edit mode</div>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.autoApplyGrammar}
                      aria-label="Auto-apply grammar fixes"
                      className={`switch ${settings.autoApplyGrammar ? 'on' : ''}`}
                      onClick={e => {
                        e.preventDefault()
                        set({ autoApplyGrammar: !settings.autoApplyGrammar })
                      }}
                    >
                      <span className="knob" />
                    </button>
                  </label>
                </div>
              </div>

              {/* Section 3: SFX & Accessibility */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 12 }}>
                  SFX & Accessibility
                </div>

                <label className="settings-row" style={{ cursor: 'pointer', padding: '8px 0' }}>
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13, color: 'var(--ink)' }}>UI Sound Effects (Melodic SFX)</strong>
                    <div className="meta" style={{ fontSize: 11 }}>Subtle audio cues on accepting suggestions, mode toggling, and review actions</div>
                  </span>
                  <button
                    type="button"
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
                    ['showWordCount', 'Show Word & Character Count', 'Display word counter in the sticky drafting toolbar'],
                    ['showMetrics', 'Show Ghost Acceptance Metrics', 'Track accepted vs suggested ghost text completions'],
                    ['reduceMotion', 'Reduce Motion', 'Disable pulse animations and animated transitions'],
                  ] as const
                ).map(([k, title, desc]) => (
                  <label key={k} className="settings-row" style={{ cursor: 'pointer', padding: '8px 0' }}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{title}</strong>
                      <div className="meta" style={{ fontSize: 11 }}>{desc}</div>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings[k]}
                      aria-label={title}
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
              </div>
            </div>
          )}

          {/* Tab 3: Shortcuts */}
          {tab === 'shortcuts' && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  background: 'var(--hover)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 14px',
                  fontSize: 12,
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                }}
              >
                Key controls: <strong>1, 2, 3</strong> accept alternatives · <strong>Tab</strong> accepts first or cycles overlapping review tabs · <strong>Alt + R</strong> rerolls suggestions · <strong>Click underline</strong> opens inline suggestions
              </div>

              {SHORTCUTS.map(g => (
                <div key={g.group} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {g.group}
                  </div>
                  <div style={{ display: 'grid', gap: 2 }}>
                    {g.items.map((s, i) => (
                      <div key={i} className="shortcut-row" style={{ padding: '6px 8px', borderRadius: 4, background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--hover) 40%, transparent)' }}>
                        <span style={{ fontSize: 13 }}>
                          {s.action}
                          {s.context && <span className="meta" style={{ fontSize: 11 }}> · {s.context}</span>}
                        </span>
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {s.keys.split(' / ').map(k => (
                            <span key={k} className="kbd" style={{ fontSize: 11 }}>
                              {k}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
