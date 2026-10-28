import { useEffect, useState } from 'react'
import { COLOR_PRESETS, DEFAULT_SETTINGS, SHORTCUTS, type AppSettings } from '../lib/settings'
import { sfxMuted, sfxToggle, sfxPick, blip } from '../lib/sfx'

type Tab = 'colors' | 'ui' | 'shortcuts'
const COLOR_FIELDS: { key: 'ai' | 'grammar' | 'sources' | 'wordChoice' | 'selection'; label: string; hint: string }[] = [
  { key: 'ai', label: 'Reader accent', hint: 'Purple underlines, reader panel' },
  { key: 'grammar', label: 'Grammar', hint: 'Red squiggles (LanguageTool)' },
  { key: 'sources', label: 'Sources', hint: 'Blue wavy underlines, source links' },
  { key: 'wordChoice', label: 'Lint', hint: 'Yellow underline family for lint (language uses red shades)' },
]

export default function SettingsMenu({ settings, onChange, onClose, onClearGreyed }: { settings: AppSettings; onChange: (s: AppSettings) => void; onClose: () => void; onClearGreyed?: () => void }) {
  const [tab, setTab] = useState<Tab>('colors')
  const [muted, setMuted] = useState(sfxMuted())
  const set = (p: Partial<AppSettings>) => { blip('select'); onChange({ ...settings, ...p }) }
  useEffect(() => { blip('open'); const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [onClose])
  return (
    <div className="library-backdrop" onMouseDown={onClose}>
      <div className="library-modal fade settings-modal" role="dialog" aria-label="Settings" onMouseDown={e => e.stopPropagation()}>
        <div className="library-head"><strong>Settings</strong><span className="meta">General app usage</span><span className="spacer" />
          <button onClick={() => onClearGreyed?.()}>Clear all greyed-out</button>
          <button onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Reset defaults</button>
          <button onClick={onClose}>Close <span className="kbd">Esc</span></button></div>
        <div className="dock-tabs" style={{ padding: '12px 16px 0' }} role="tablist" aria-label="Settings sections">
          {([['colors', 'Colors'], ['ui', 'UI / UX'], ['shortcuts', 'Shortcuts']] as [Tab, string][]).map(([t, l]) =>
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => { blip('select'); setTab(t) }}>{l}</button>)}
        </div>
        <div className="library-scroll">
          {tab === 'colors' && <>
            <label>Theme</label>
            <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
              {(['light', 'dark', 'system'] as const).map(t => <button key={t} className={settings.theme === t ? 'active' : ''} style={{ flex: 1 }} onClick={() => set({ theme: t })}>{t === 'system' ? 'System' : t[0].toUpperCase() + t.slice(1)}</button>)}
            </div>
            <label>Color preset</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(COLOR_PRESETS).map(([k, p]) => <button key={k} onClick={() => set({ ai: p.ai, grammar: p.grammar, sources: p.sources, wordChoice: p.wordChoice, selection: p.selection })} title={p.label}>
                <span style={{ display: 'inline-flex', gap: 3, marginRight: 6 }}>{[p.ai, p.grammar, p.sources, p.wordChoice].map(c => <span key={c} className="swatch" style={{ background: c }} />)}</span>{p.label}</button>)}
            </div>
            <label>Annotation colors</label>
            {COLOR_FIELDS.map(f => <div key={f.key} className="settings-row">
              <span className="swatch" style={{ background: settings[f.key], width: 14, height: 14 }} />
              <span style={{ flex: 1 }}><strong style={{ fontSize: 13 }}>{f.label}</strong><div className="meta">{f.hint}</div></span>
              <input type="color" aria-label={f.label} value={settings[f.key]} onChange={e => set({ [f.key]: e.target.value } as Partial<AppSettings>)} />
              <span className="meta" style={{ fontVariantNumeric: 'tabular-nums' }}>{settings[f.key]}</span></div>)}
            <p className="meta">Colors apply instantly → editor underlines, docks, badges. Persisted locally ✔︎</p>
          </>}
          {tab === 'ui' && <>
            <label>Editor font</label>
            <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
              {([['serif', 'Serif'], ['sans', 'Sans'], ['mono', 'Mono']] as const).map(([v, l]) => <button key={v} className={settings.editorFont === v ? 'active' : ''} style={{ flex: 1 }} onClick={() => set({ editorFont: v })}>{l}</button>)}
            </div>
            <label>Font size · {settings.fontSize}px</label>
            <input type="range" min={16} max={22} step={1} value={settings.fontSize} onChange={e => set({ fontSize: Number(e.target.value) })} style={{ width: '100%', maxWidth: 360 }} />
            <label>Line height · {settings.lineHeight.toFixed(2)}</label>
            <input type="range" min={1.4} max={1.9} step={0.05} value={settings.lineHeight} onChange={e => set({ lineHeight: Number(e.target.value) })} style={{ width: '100%', maxWidth: 360 }} />
            <label>Text width</label>
            <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
              {([['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']] as const).map(([v, l]) => <button key={v} className={settings.paperWidth === v ? 'active' : ''} style={{ flex: 1 }} onClick={() => set({ paperWidth: v })}>{l}</button>)}
            </div>
            <label>Interface density</label>
            <div className="mode-toggle" style={{ display: 'flex', maxWidth: 360 }}>
              {([['comfortable', 'Comfortable'], ['compact', 'Compact']] as const).map(([v, l]) => <button key={v} className={settings.density === v ? 'active' : ''} style={{ flex: 1 }} onClick={() => set({ density: v })}>{l}</button>)}
            </div>
            <label className="settings-row" style={{ cursor: 'pointer' }}><span style={{ flex: 1 }}>UI sound effects (Tone.js melodic blips)</span>
              <button role="switch" aria-checked={!muted} aria-label="UI sound effects" className={`switch ${!muted ? 'on' : ''}`} onClick={e => { e.preventDefault(); const m = sfxToggle(); setMuted(m); if (!m) sfxPick() }}><span className="knob" /></button></label>
            {([['showWordCount', 'Show word / character count'], ['showMetrics', 'Show ghost-acceptance metrics in top bar'], ['spellcheck', 'Browser spellcheck in editor'], ['reduceMotion', 'Reduce motion (disable spinner / pulse animations)']] as const).map(([k, l]) =>
              <label key={k} className="settings-row" style={{ cursor: 'pointer' }}><span style={{ flex: 1 }}>{l}</span>
                <button role="switch" aria-checked={settings[k]} aria-label={l} className={`switch ${settings[k] ? 'on' : ''}`} onClick={e => { e.preventDefault(); set({ [k]: !settings[k] } as Partial<AppSettings>) }}><span className="knob" /></button></label>)}
          </>}
          {tab === 'shortcuts' && <>
            <p className="meta" style={{ marginTop: 0 }}>All app shortcuts. <strong>Suggest</strong> + <strong>sentence starter</strong> also pinned in editor bar ✔︎</p>
            {SHORTCUTS.map(g => <div key={g.group} style={{ marginBottom: 16 }}>
              <div className="kind-label" style={{ fontSize: 12, color: 'var(--ai)' }}>{g.group}</div>
              {g.items.map((s, i) => <div key={i} className="shortcut-row"><span>{s.action}{s.context && <span className="meta"> · {s.context}</span>}</span><span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{s.keys.split(' / ').map(k => <span key={k} className="kbd">{k}</span>)}</span></div>)}
            </div>)}
          </>}
        </div>
      </div>
    </div>
  )
}
