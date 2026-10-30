import React, { useEffect, useState } from 'react'
import { COLOR_PRESETS, DEFAULT_SETTINGS, SHORTCUTS, type AppSettings } from '../lib/settings'
import {
  sfxMuted,
  sfxToggle,
  blip,
  sfxSuccess,
  getSfxInstrument,
  setSfxInstrument,
  getSfxPitch,
  setSfxPitch,
  type SfxInstrument,
} from '../lib/sfx'
import { Logo } from './Brand'

type Tab = 'colors' | 'document' | 'accessibility' | 'shortcuts'

const PERSONA_FIELDS: { key: 'grammar' | 'ai' | 'wordChoice' | 'sources' | 'suggest'; label: string; hint: string; defaultColor: string }[] = [
  { key: 'grammar',    label: 'Grammar',    hint: 'Language correctness, punctuation, spelling',   defaultColor: '#C0281F' },
  { key: 'ai',         label: 'Reader',     hint: 'Audience perception, tone & clarity reactions', defaultColor: '#6D3BE0' },
  { key: 'wordChoice', label: 'Supervisor', hint: 'Outline alignment, flow, and logic structure',  defaultColor: '#8A5F00' },
  { key: 'sources',    label: 'Researcher', hint: 'Fact grounding, evidence, and citations',      defaultColor: '#1765CC' },
  { key: 'suggest',    label: 'Draft Ghost',hint: 'Contextual caret completions and suggestions',  defaultColor: '#626A75' },
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
  const [tab, setTab] = useState<Tab>('colors')
  const [muted, setMuted] = useState(sfxMuted())
  const [instrument, setInstrumentState] = useState<SfxInstrument>(getSfxInstrument)
  const [pitch, setPitchState] = useState<number>(getSfxPitch)

  const set = (p: Partial<AppSettings>) => {
    blip('select')
    onChange({ ...settings, ...p })
  }

  useEffect(() => {
    blip('open')
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'colors',        label: 'Colors & Theme' },
    { id: 'document',      label: 'Document Setup' },
    { id: 'accessibility', label: 'Accessibility & Audio' },
    { id: 'shortcuts',     label: 'Shortcuts' },
  ]

  const handleInstrumentChange = (inst: SfxInstrument) => {
    setSfxInstrument(inst)
    setInstrumentState(inst)
    if (muted) {
      sfxToggle()
      setMuted(false)
    }
    blip('select')
  }

  const handlePitchChange = (semitones: number) => {
    setSfxPitch(semitones)
    setPitchState(semitones)
    if (muted) {
      sfxToggle()
      setMuted(false)
    }
    blip('select')
  }

  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div
        className="library-modal fade settings-modal"
        role="dialog"
        aria-label="Settings"
        onMouseDown={e => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        {/* Header */}
        <div className="library-head">
          <div>
            <strong>Settings</strong>
            <div className="meta" style={{ marginTop: 2 }}>Workspace, typography, audio & interface preferences</div>
          </div>
          <span className="spacer" />
          <button
            type="button"
            onClick={() => {
              blip('toggle')
              onChange({ ...DEFAULT_SETTINGS })
            }}
          >
            Reset defaults
          </button>
          <button type="button" onClick={onClose}>
            Close <span className="kbd">Esc</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="dock-tabs"
          style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}
          role="tablist"
          aria-label="Settings sections"
        >
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => {
                blip('select')
                setTab(t.id)
              }}
              style={{ fontSize: 12.5 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="library-scroll" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>

          {/* ══════════════════════════════════════════════════
              TAB 1: COLOR SETUP & THEME MODE
          ══════════════════════════════════════════════════ */}
          {tab === 'colors' && (
            <div style={{ display: 'grid', gap: 24 }}>

              {/* Theme Mode Toggle */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Theme Mode
                </label>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={settings.theme === t ? 'active' : ''}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => set({ theme: t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                    Color Palette Presets
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Matches Logo, Cards & Underlines</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {Object.entries(COLOR_PRESETS).filter(([k]) => !['default', 'ocean', 'forest'].includes(k)).map(([k, p]) => {
                    const isSelected =
                      settings.grammar === p.grammar &&
                      settings.ai === p.ai &&
                      settings.wordChoice === p.wordChoice &&
                      settings.sources === p.sources

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          set({
                            grammar: p.grammar,
                            ai: p.ai,
                            wordChoice: p.wordChoice,
                            sources: p.sources,
                            suggest: p.suggest,
                            selection: p.selection,
                          })
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '10px 12px',
                          border: isSelected ? '2px solid var(--ai)' : '1px solid var(--border)',
                          background: isSelected ? 'color-mix(in srgb, var(--ai) 8%, var(--paper))' : 'var(--paper)',
                          borderRadius: 'var(--radius-lg, 6px)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          gap: 6,
                          minHeight: 88,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.grammar }} title="Grammar" />
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.ai }} title="Reader" />
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.wordChoice }} title="Supervisor" />
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.sources }} title="Researcher" />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.35 }}>{p.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Individual Persona Color Pickers */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
                  Persona & Accent Customization
                </label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {PERSONA_FIELDS.map(f => (
                    <div
                      key={f.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: settings[f.key] }} />
                        <div>
                          <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>{f.label}</strong>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.hint}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="color"
                          aria-label={f.label}
                          value={settings[f.key]}
                          onChange={e => set({ [f.key]: e.target.value } as Partial<AppSettings>)}
                          style={{ border: 'none', background: 'transparent', width: 28, height: 28, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', width: 58, textAlign: 'right' }}>
                          {settings[f.key]}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Selection Highlight */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: settings.selection }} />
                      <div>
                        <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Selection Highlight</strong>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cursor selection background color</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        aria-label="Selection highlight"
                        value={settings.selection}
                        onChange={e => set({ selection: e.target.value })}
                        style={{ border: 'none', background: 'transparent', width: 28, height: 28, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', width: 58, textAlign: 'right' }}>
                        {settings.selection}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Strip */}
              <div
                style={{
                  background: 'var(--dock)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg, 6px)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)', marginBottom: 4 }}>
                    Live Preview
                  </div>
                  <Logo height={24} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.grammar, color: '#fff', fontWeight: 600 }}>
                    Grammar
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.ai, color: '#fff', fontWeight: 600 }}>
                    Reader
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.wordChoice, color: '#fff', fontWeight: 600 }}>
                    Supervisor
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.sources, color: '#fff', fontWeight: 600 }}>
                    Researcher
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: DOCUMENT SETUP (FONT, LINE, FULL/WIDE WIDTH)
          ══════════════════════════════════════════════════ */}
          {tab === 'document' && (
            <div style={{ display: 'grid', gap: 22 }}>

              {/* Font Family */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Editor Typeface
                </label>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
                  {([
                    ['serif', 'Source Serif Pro'],
                    ['sans', 'Inter (Sans)'],
                    ['mono', 'Monospace'],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={settings.editorFont === v ? 'active' : ''}
                      style={{ flex: 1, fontSize: 12 }}
                      onClick={() => set({ editorFont: v })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Source Serif Pro provides the classic literary editorial experience for long-form prose.
                </div>
              </div>

              {/* Font Size Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                    Font Size
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={24}
                  step={1}
                  value={settings.fontSize}
                  onChange={e => set({ fontSize: Number(e.target.value) })}
                  style={{ width: '100%', maxWidth: 360 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  <span>14px Compact</span>
                  <span>19px Default</span>
                  <span>24px Large</span>
                </div>
              </div>

              {/* Line Height Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                    Line Height (Leading)
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{settings.lineHeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={1.3}
                  max={2.0}
                  step={0.05}
                  value={settings.lineHeight}
                  onChange={e => set({ lineHeight: Number(e.target.value) })}
                  style={{ width: '100%', maxWidth: 360 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360, fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  <span>1.30 Tight</span>
                  <span>1.65 Balanced</span>
                  <span>2.00 Spacious</span>
                </div>
              </div>

              {/* Paper Layout Width (Full / Wide / Normal / Narrow) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                    Paper Layout Width
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Controls reading column span</span>
                </div>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 440 }}>
                  {([
                    ['narrow', 'Narrow (58ch)'],
                    ['normal', 'Normal (72ch)'],
                    ['wide', 'Wide (92ch)'],
                    ['full', 'Full (100% Span)'],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={settings.paperWidth === v ? 'active' : ''}
                      style={{ flex: 1, fontSize: 12 }}
                      onClick={() => set({ paperWidth: v })}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Select "Full" or "Wide" to span the paper editor out across the middle canvas.
                </div>
              </div>

              {/* Spellcheck & Grammar Toggles */}
              <div style={{ display: 'grid', gap: 6, paddingTop: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '8px 0',
                    borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Browser Spellcheck</strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Native browser red squiggly spellchecker in document editor</span>
                  </div>
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

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '8px 0',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Auto-apply Grammar Fixes</strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Automatically apply high-confidence grammar edits in Edit mode</span>
                  </div>
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
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: ACCESSIBILITY & AUDIO (MERGED SFX)
          ══════════════════════════════════════════════════ */}
          {tab === 'accessibility' && (
            <div style={{ display: 'grid', gap: 24 }}>

              {/* Section 1: Audio / SFX (Soundscape & Tone Controls) */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                  Audio Feedback & Synth Tone
                </div>

                {/* Master SFX Switch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--dock)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg, 6px)',
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>UI Sound Effects (Melodic SFX)</strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Subtle acoustic chimes for accepting suggestions, toggles, and findings</span>
                  </div>
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
                      if (!m) sfxSuccess()
                    }}
                  >
                    <span className="knob" />
                  </button>
                </div>

                {/* Instrument / Timbre Selector */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    Synthesizer Instrument / Timbre
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 440 }}>
                    {([
                      ['triangle', 'Soft Bell'],
                      ['sine', 'Pure Tone'],
                      ['square', 'Chiptune (8-Bit)'],
                      ['sawtooth', 'Bright String'],
                    ] as const).map(([inst, label]) => (
                      <button
                        key={inst}
                        type="button"
                        className={instrument === inst ? 'active' : ''}
                        style={{ flex: 1, fontSize: 11.5 }}
                        onClick={() => handleInstrumentChange(inst)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pitch / Tone Transposition */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                      Pitch & Tone Tuning
                    </label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                      {pitch === 0 ? 'Normal (C4)' : pitch > 0 ? `+${pitch} semitones (Higher)` : `${pitch} semitones (Lower)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-7}
                    max={7}
                    step={1}
                    value={pitch}
                    onChange={e => handlePitchChange(Number(e.target.value))}
                    style={{ width: '100%', maxWidth: 440 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 440, fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    <span>-7 Deep Low</span>
                    <span>0 Default</span>
                    <span>+7 Crisp High</span>
                  </div>
                </div>

                {/* Audition Testing Buttons */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    Audition Sound Cues
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Select', cue: () => blip('select') },
                      { label: 'Accept', cue: () => blip('done') },
                      { label: 'Mode Toggle', cue: () => blip('mode') },
                      { label: 'Success Chime', cue: () => sfxSuccess() },
                      { label: 'Dismiss', cue: () => blip('dismiss') },
                    ].map(s => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          if (muted) {
                            sfxToggle()
                            setMuted(false)
                          }
                          s.cue()
                        }}
                        style={{ padding: '4px 9px', fontSize: 11, borderRadius: 3 }}
                      >
                        ▶ {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Visual Accessibility & Metrics */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                  Display & Accessibility Controls
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  {/* Word & Character Count Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '8px 0',
                      borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Show Word & Character Count</strong>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Displays real-time live word and character counters in the sticky drafting toolbar
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.showWordCount}
                      aria-label="Show word count"
                      className={`switch ${settings.showWordCount ? 'on' : ''}`}
                      onClick={e => {
                        e.preventDefault()
                        set({ showWordCount: !settings.showWordCount })
                      }}
                    >
                      <span className="knob" />
                    </button>
                  </label>

                  {/* Reduce Motion Toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Reduce Motion</strong>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Disable pulse glows, sliding drawers, and animated keyframe transitions
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.reduceMotion}
                      aria-label="Reduce motion"
                      className={`switch ${settings.reduceMotion ? 'on' : ''}`}
                      onClick={e => {
                        e.preventDefault()
                        set({ reduceMotion: !settings.reduceMotion })
                      }}
                    >
                      <span className="knob" />
                    </button>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 4: SHORTCUTS
          ══════════════════════════════════════════════════ */}
          {tab === 'shortcuts' && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  background: 'var(--hover)',
                  borderRadius: 'var(--radius, 4px)',
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {g.group}
                  </div>
                  <div style={{ display: 'grid', gap: 2 }}>
                    {g.items.map((s, i) => (
                      <div
                        key={i}
                        className="shortcut-row"
                        style={{
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--hover) 40%, transparent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
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
