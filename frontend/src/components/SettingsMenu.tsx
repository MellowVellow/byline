import React, { useEffect, useState } from 'react'
import { COLOR_PRESETS, DEFAULT_SETTINGS, SHORTCUTS, type AppSettings } from '../lib/settings'
import { api } from '../lib/api'
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
import { SUPPORTED_LANGUAGES, languageShort } from '../domain/writing-profile'
import { t } from '../i18n'

type Tab = 'colors' | 'document' | 'ai' | 'accessibility' | 'shortcuts'

const PERSONA_FIELDS: { key: 'ai' | 'grammar' | 'fix' | 'suggest' | 'uiBg' | 'uiPanel' | 'uiBgLight' | 'uiPanelLight' | 'paper' | 'paperLine' | 'caret' | 'btnBg' | 'btnInk'; label: string; hint: string; defaultColor: string }[] = [
  { key: 'ai',         label: 'Reader',     hint: 'Reader notes on tone and clarity', defaultColor: '#B094E9' },
  { key: 'grammar',    label: 'Grammar',    hint: 'Red line shown before correction',    defaultColor: '#D83343' },
  { key: 'fix',        label: 'Fix flash', hint: 'Green fade after a fix applies', defaultColor: '#16A34A' },
  { key: 'suggest',    label: 'Completions',hint: 'Faint text at cursor',  defaultColor: '#626A75' },
  { key: 'uiBg',       label: 'UI Background (dark)', hint: 'Dark-mode app background',          defaultColor: '#0F1115' },
  { key: 'uiPanel',    label: 'UI Panel (dark)',   hint: 'Dark-mode rail background',    defaultColor: '#16181D' },
  { key: 'uiBgLight',  label: 'UI Background (light)', hint: 'Light-mode app background',          defaultColor: '#F8F9FA' },
  { key: 'uiPanelLight', label: 'UI Panel (light)',   hint: 'Light-mode rail background',    defaultColor: '#EFF1F4' },
  { key: 'paper',      label: 'Writing space', hint: 'Paper background',          defaultColor: '#FFFFFF' },
  { key: 'paperLine',  label: 'Margin line',   hint: 'Vertical line in writing space',    defaultColor: '#D83343' },
  { key: 'caret',      label: 'Caret', hint: 'Cursor + writing accent',  defaultColor: '#B094E9' },
  { key: 'btnBg',      label: 'Button', hint: 'Primary button background',  defaultColor: '#B094E9' },
  { key: 'btnInk',     label: 'Button text', hint: 'Primary button text',  defaultColor: '#FFFFFF' },
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
  const [modelInfo, setModelInfo] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)

  useEffect(() => {
    if (tab !== 'ai') return
    let alive = true
    Promise.all([api.models(), api.usage()]).then(([m, u]) => {
      if (!alive) return
      setModelInfo(m)
      setUsage(u)
    })
    return () => { alive = false }
  }, [tab])

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
    { id: 'document',      label: 'Document' },
    { id: 'ai',            label: 'AI' },
    { id: 'accessibility', label: 'Audio & Display' },
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
            <div className="meta" style={{ marginTop: 2 }}>Layout, type, audio, and display</div>
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
          <button type="button" onClick={() => { blip('select'); onClose() }}>
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
              TAB 1: COLORS & THEME
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
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sets logo, cards, and lines</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {Object.entries(COLOR_PRESETS).filter(([k]) => !['default', 'ocean', 'forest'].includes(k)).map(([k, p]) => {
                    const isSelected =
                      settings.ai === p.ai &&
                      settings.grammar === p.grammar &&
                      settings.fix === p.fix &&
                      settings.suggest === p.suggest &&
                      settings.selection === p.selection &&
                      settings.uiBg === p.uiBg &&
                      settings.uiPanel === p.uiPanel &&
                      (settings as any).uiBgLight === p.uiBgLight &&
                      (settings as any).uiPanelLight === p.uiPanelLight

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          set({
                            ai: p.ai,
                            grammar: p.grammar,
                            fix: p.fix,
                            suggest: p.suggest,
                            selection: p.selection,
                            uiBg: p.uiBg,
                            uiPanel: p.uiPanel,
                            uiBgLight: p.uiBgLight,
                            uiPanelLight: p.uiPanelLight,
                            paper: p.paper,
                            paperLine: p.paperLine,
                            caret: p.caret,
                            btnBg: p.btnBg,
                            btnInk: p.btnInk,
                          } as any)
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
                          <span style={{ width: 11, height: 11, borderRadius: '50%', background: p.fix }} title="Auto-fix" />
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
                  Mark Colors
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
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.fix, color: '#fff', fontWeight: 600 }}>
                    Fix
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: settings.suggest, color: '#fff', fontWeight: 600 }}>
                    Complete
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 2: AI + USAGE
          ══════════════════════════════════════════════════ */}
          {tab === 'ai' && (
            <div style={{ display: 'grid', gap: 22 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Inference Provider
                </label>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 440 }}>
                  {([
                    ['auto', 'Auto', 'Baseten → Meta → OpenRouter', true],
                    ['baseten', 'Baseten', 'muse-spark-open-1026', !modelInfo || modelInfo.baseten_available],
                    ['meta', 'Meta API', 'muse-spark-1.3', !modelInfo || modelInfo.meta_api_available],
                  ] as const).map(([id, label, desc, available]) => (
                    <button
                      key={id}
                      type="button"
                      className={settings.metaProvider === id ? 'active' : ''}
                      disabled={!available}
                      title={available ? desc : `${label} is not configured on the server`}
                      style={{ flex: 1, fontSize: 12, opacity: available ? 1 : 0.45 }}
                      onClick={() => set({ metaProvider: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  {settings.metaProvider === 'auto'
                    ? 'Automatic: tries Baseten first, then Meta, then OpenRouter, then offline mock.'
                    : 'Explicit choice: no fallback. The request fails if this provider is unavailable.'}
                </div>
                {modelInfo && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Server active: <strong style={{ color: 'var(--ink)' }}>{modelInfo.active_model}</strong> · {modelInfo.active_provider}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  {t('contextLanguage')}
                </label>
                <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                  {languageShort(settings.language || 'en-US')} · {SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.label || 'English'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Switch via the EN | ID toggle in the top bar. Drives suggestion language; grammar checks stay English-only.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKey || ''}
                  placeholder="Shared backend key (empty = dev-open backend)"
                  autoComplete="off"
                  onChange={e => set({ apiKey: e.target.value.trim() })}
                  style={{ width: '100%', maxWidth: 440, padding: '6px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--dock)', color: 'var(--ink)', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Sent as X-API-Key. Required once the server sets API_KEY.
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                    This IP's Usage
                  </label>
                  {usage?.reset_at && (
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                      resets {new Date(usage.reset_at * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                {usage?.ok ? (
                  <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                      <span><strong>{usage.used_tokens.toLocaleString()}</strong> / {usage.limit_tokens.toLocaleString()} tokens</span>
                      <span>≈ <strong>${Number(usage.est_usd || 0).toFixed(4)}</strong></span>
                      <span>{usage.requests} requests</span>
                    </div>
                    {(usage.tokens_in != null || usage.tokens_reasoning != null) && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        in {(usage.tokens_in ?? 0).toLocaleString()} · out {(usage.tokens_out ?? 0).toLocaleString()} · reasoning {(usage.tokens_reasoning ?? 0).toLocaleString()} (billable)
                      </div>
                    )}
                    <div style={{ marginTop: 8, height: 6, background: 'var(--hover)', borderRadius: 3, overflow: 'hidden', maxWidth: 440 }}>
                      <div style={{ width: `${Math.min(100, usage.limit_tokens ? (usage.used_tokens / usage.limit_tokens) * 100 : 0)}%`, height: '100%', background: 'var(--explore)' }} />
                    </div>
                    {usage.used_tokens >= usage.limit_tokens && (
                      <div style={{ fontSize: 11, color: 'var(--lt)', marginTop: 6 }}>
                        Quota reached. AI requests return 429 until the window resets.
                      </div>
                    )}
                    {usage.by_provider && Object.keys(usage.by_provider).length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                        {Object.entries(usage.by_provider).map(([p, v]: any) => (
                          <span key={p} style={{ marginRight: 12 }}>{p}: {v.tokens.toLocaleString()} tok / {v.requests} calls</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Usage unavailable — backend not reachable.</div>
                )}
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 8 }}>
                  Quota is token-based; the dollar figure is an estimate using placeholder prices.
                </div>
              </div>

              {/* Section 3: Typing State (Ghost Triggers) */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                  Typing State
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>Pause trigger</span>
                    <input
                      type="range"
                      min={100}
                      max={1500}
                      step={50}
                      value={settings.slowMs}
                      onChange={e => set({ slowMs: +e.target.value })}
                      style={{ width: '100%', maxWidth: 340 }}
                    />
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                      Ghost text and selection paraphrase fire after this pause ({(settings.slowMs / 1000).toFixed(2)}s)
                    </span>
                  </label>
                </div>
              </div>

            </div>
          )}
          {/* ══════════════════════════════════════════════════
              TAB 2: DOCUMENT (FONT, LINE, WIDTH)
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
                    ['serif', 'Serif'],
                    ['sans', 'Sans'],
                    ['mono', 'Mono'],
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
                  Serif suits long prose.
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
                    Line Height
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
                    Page Width
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sets text column width</span>
                </div>
                <div className="mode-toggle" style={{ display: 'flex', maxWidth: 440 }}>
                  {([
                    ['narrow', 'Narrow (58ch)'],
                    ['normal', 'Normal (72ch)'],
                    ['wide', 'Wide (92ch)'],
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
                  Wide uses the full center area.
                </div>
              </div>

              {/* Citation style */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: 0 }}>
                  Citation Style
                </label>
                <select
                  value={settings.citationStyle}
                  onChange={e => set({ citationStyle: e.target.value as any })}
                  style={{ marginLeft: 8, fontSize: 12 }}
                >
                  <option value="apa">APA</option>
                  <option value="mla">MLA</option>
                  <option value="chicago">Chicago</option>
                </select>
              </div>

              {/* Spellcheck toggle (grammar corrections stay on) */}
              <div style={{ display: 'grid', gap: 6, paddingTop: 4 }}>
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
                    <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Browser Spellcheck</strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Browser spell lines in editor</span>
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
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════
              TAB 3: AUDIO & DISPLAY
          ══════════════════════════════════════════════════ */}
          {tab === 'accessibility' && (
            <div style={{ display: 'grid', gap: 24 }}>

              {/* Section 1: Audio / SFX (Soundscape & Tone Controls) */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                  Audio & Tone
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
                    <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Interface Sounds</strong>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Short tones for accept, toggle, and notes</span>
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
                    Instrument
                  </label>
                  <div className="mode-toggle" style={{ display: 'flex', maxWidth: 440 }}>
                    {([
                      ['triangle', 'Bell'],
                      ['sine', 'Tone'],
                      ['square', '8-Bit'],
                      ['sawtooth', 'String'],
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
                      Pitch
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
                    Test Sounds
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
                  Display
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
                      <strong style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>Word Count</strong>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Shows word and character counts in toolbar
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
                        Stops pulse, slide, and transition effects
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
                Key controls: <strong>1, 2, 3</strong> accept items · <strong>Tab</strong> accepts first · <strong>Alt + R</strong> lists new options · <strong>Select text</strong> shows options
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
