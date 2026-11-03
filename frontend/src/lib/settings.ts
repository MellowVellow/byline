import { z } from 'zod'

export type ThemeMode = 'light' | 'dark' | 'system'
export type EditorFont = 'serif' | 'sans' | 'mono'
export type PaperWidth = 'narrow' | 'normal' | 'wide' | 'full'
export type Density = 'comfortable' | 'compact'

export interface AppSettings {
  theme: ThemeMode
  ai: string
  grammar: string
  fix: string
  selection: string
  suggest: string
  /** Dark-mode surface overrides (empty = follow theme.css). */
  uiBg: string
  uiPanel: string
  /** Light-mode surface overrides (empty = follow theme.css). */
  uiBgLight: string
  uiPanelLight: string
  /** Writing space + caret accents per preset. */
  paper: string
  paperLine: string
  verticalRule: string
  caret: string
  btnBg: string
  btnInk: string
  editorFont: EditorFont
  fontSize: number
  lineHeight: number
  paperWidth: PaperWidth
  density?: Density
  showWordCount: boolean
  showMetrics?: boolean
  reduceMotion: boolean
  spellcheck: boolean
  // Meta-authored inference settings
  metaModel: string
  /** Per-request provider routing: auto cascades; explicit choices never fall back. */
  metaProvider: 'auto' | 'baseten' | 'meta'
  /** Shared backend API key (X-API-Key). Empty = backend enforces nothing. */
  apiKey: string
  temperature: number
  maxTokens: number
  topP: number
  reasoningEffort: 'minimal' | 'low' | 'medium'
  // Writing profile
  writingTheme: 'neutral' | 'academic' | 'gen-z' | 'buzzword'
  language: string
  /** Ghost suggestion trigger thresholds (ms). */
  slowMs: number
}

/** Runtime validation for stored settings. Unknown keys stripped, wrong
 *  types rejected per-field so one corrupt value can't poison the shape. */
const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  metaProvider: z.enum(['auto', 'baseten', 'meta']),
  apiKey: z.string().max(200),
  editorFont: z.enum(['serif', 'sans', 'mono']),
  fontSize: z.number().min(10).max(40),
  lineHeight: z.number().min(1).max(3),
  paperWidth: z.enum(['narrow', 'normal', 'wide', 'full']),
  density: z.enum(['comfortable', 'compact']),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(8000),
  topP: z.number().min(0).max(1),
  reasoningEffort: z.enum(['minimal', 'low', 'medium']),
  reduceMotion: z.boolean(),
  spellcheck: z.boolean(),
  showWordCount: z.boolean(),
  showMetrics: z.boolean(),
  writingTheme: z.enum(['neutral', 'academic', 'gen-z', 'buzzword']),
  language: z.string().max(20),
  slowMs: z.number().min(100).max(3000),
  metaModel: z.string().max(200),
  ai: z.string().max(30),
  grammar: z.string().max(30),
  fix: z.string().max(30),
  suggest: z.string().max(30),
  selection: z.string().max(30),
  uiBg: z.string().max(30),
  uiPanel: z.string().max(30),
  uiBgLight: z.string().max(30),
  uiPanelLight: z.string().max(30),
  paper: z.string().max(30),
  paperLine: z.string().max(30),
  verticalRule: z.string().max(30),
  caret: z.string().max(30),
  btnBg: z.string().max(30),
  btnInk: z.string().max(30),
}).partial()

export interface ColorPreset {
  label: string
  description: string
  ai: string        // Purple / reader
  grammar: string   // Red / grammar underline + hold marks
  fix: string       // Green / auto-fix flash
  suggest: string   // Grey / ghost suggestions
  selection: string // Yellow / selection highlight
  uiBg: string      // Dark-mode UI background override
  uiPanel: string   // Dark-mode UI panel (rails) override
  uiBgLight: string   // Light-mode UI background override
  uiPanelLight: string // Light-mode UI panel (rails) override
  paper: string     // Writing space (paper) background
  paperLine: string // Writing space vertical margin line (--proof)
  verticalRule: string // Writing space vertical rule
  caret: string     // Caret / cursor accent
  btnBg: string     // Primary button background
  btnInk: string    // Primary button text
}

/** Color presets for logo, cards, and text marks */
export const COLOR_PRESETS: Record<string, ColorPreset> = {
  byline: {
    label: 'Byline',
    description: 'Default marks: red, purple, amber, blue',
    ai: '#B094E9',
    grammar: '#D83343',
    fix: '#16A34A',
    suggest: '#626A75',
    selection: '#FEE180',
    uiBg: '#0F1115',
    uiPanel: '#16181D',
    uiBgLight: '#F8F9FA',
    uiPanelLight: '#EFF1F4',
    paper: '#FFFFFF',
    paperLine: '#D83343',
    verticalRule: '#E2E4E8',
    caret: '#B094E9',
    btnBg: '#6D3BE0',
    btnInk: '#FFFFFF',
  },
  oxford: {
    label: 'Oxford',
    description: 'Dark red, indigo, brass, blue',
    ai: '#4338CA',
    grammar: '#B91C1C',
    fix: '#15803D',
    suggest: '#475569',
    selection: '#E0E7FF',
    uiBg: '#111420',
    uiPanel: '#181C28',
    uiBgLight: '#F7F6F2',
    uiPanelLight: '#ECE9E2',
    paper: '#FFFDF8',
    paperLine: '#B91C1C',
    verticalRule: '#ECE9E2',
    caret: '#4338CA',
    btnBg: '#4338CA',
    btnInk: '#FFFFFF',
  },
  glacier: {
    label: 'Glacier',
    description: 'Rose, cyan, ochre, steel blue',
    ai: '#0891B2',
    grammar: '#E11D48',
    fix: '#059669',
    suggest: '#64748B',
    selection: '#CFFAFE',
    uiBg: '#0E1418',
    uiPanel: '#162026',
    uiBgLight: '#F4F8FA',
    uiPanelLight: '#E6EFF3',
    paper: '#FFFFFF',
    paperLine: '#E11D48',
    verticalRule: '#E6EFF3',
    caret: '#0891B2',
    btnBg: '#0891B2',
    btnInk: '#FFFFFF',
  },
  verdant: {
    label: 'Verdant',
    description: 'Red, green, olive, sky blue',
    ai: '#059669',
    grammar: '#DC2626',
    fix: '#16A34A',
    suggest: '#6B7280',
    selection: '#D1FAE5',
    uiBg: '#0E1512',
    uiPanel: '#16211B',
    uiBgLight: '#F4F8F4',
    uiPanelLight: '#E5EFE6',
    paper: '#FFFFFF',
    paperLine: '#DC2626',
    verticalRule: '#E5EFE6',
    caret: '#059669',
    btnBg: '#059669',
    btnInk: '#FFFFFF',
  },
  sunset: {
    label: 'Sunset',
    description: 'Orange, magenta, gold, indigo',
    ai: '#C026D3',
    grammar: '#EA580C',
    fix: '#65A30D',
    suggest: '#78716C',
    selection: '#FDE68A',
    uiBg: '#161210',
    uiPanel: '#211914',
    uiBgLight: '#FAF6F2',
    uiPanelLight: '#F1E8DE',
    paper: '#FFFEFA',
    paperLine: '#EA580C',
    verticalRule: '#F1E8DE',
    caret: '#C026D3',
    btnBg: '#C026D3',
    btnInk: '#FFFFFF',
  },
  monochrome: {
    label: 'Monochrome',
    description: 'Gray scale for focused drafting',
    ai: '#3F3F46',
    grammar: '#52525B',
    fix: '#3F3F46',
    suggest: '#A1A1AA',
    selection: '#E4E4E7',
    uiBg: '#131313',
    uiPanel: '#1B1B1B',
    uiBgLight: '#FAFAFA',
    uiPanelLight: '#F0F0F0',
    paper: '#FFFFFF',
    paperLine: '#52525B',
    verticalRule: '#F0F0F0',
    caret: '#3F3F46',
    btnBg: '#3F3F46',
    btnInk: '#FFFFFF',
  },
}

// Backwards-compatible names
COLOR_PRESETS.default = COLOR_PRESETS.byline
COLOR_PRESETS.ocean = COLOR_PRESETS.glacier
COLOR_PRESETS.forest = COLOR_PRESETS.verdant

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  ...COLOR_PRESETS.byline,
  editorFont: 'serif',
  fontSize: 19,
  lineHeight: 1.65,
  paperWidth: 'normal',
  density: 'comfortable',
  showWordCount: true,
  showMetrics: true,
  reduceMotion: false,
  spellcheck: false,
  metaModel: 'meta-llama/llama-3.3-70b-instruct',
  metaProvider: 'auto',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 800,
  topP: 0.9,
  reasoningEffort: 'minimal',
  writingTheme: 'neutral',
  language: 'en-US',
  slowMs: 350,
}

const KEY = 'byline.settings.v1'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = SettingsSchema.safeParse(JSON.parse(raw))
      // Unknown keys dropped, wrong types fall back to defaults: stored
      // settings can never poison the runtime shape.
      if (parsed.success) {
        const data = { ...parsed.data }
        // Retired layout: Full (100% span) collapses to Wide.
        if (data.paperWidth === 'full') data.paperWidth = 'wide'
        return { ...DEFAULT_SETTINGS, ...data }
      }
    }
  } catch { /* fall through */ }
  const legacy = localStorage.getItem('byline.theme')
  return { ...DEFAULT_SETTINGS, theme: legacy === 'light' || legacy === 'dark' ? legacy : 'system' }
}

export function resolveTheme(t: ThemeMode): 'light' | 'dark' {
  if (t === 'light' || t === 'dark') return t
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function applySettings(s: AppSettings) {
  const root = document.documentElement
  const resolved = resolveTheme(s.theme)
  root.dataset.theme = resolved
  if (s.density) root.dataset.density = s.density
  root.dataset.motion = s.reduceMotion ? 'reduce' : ''
  localStorage.setItem('byline.theme', resolved)
  dispatchEvent(new Event('byline-theme'))

  // Apply colors to root CSS custom properties
  root.style.setProperty('--ai', s.ai)
  root.style.setProperty('--lt', s.grammar || COLOR_PRESETS.byline.grammar)
  root.style.setProperty('--fix', s.fix || COLOR_PRESETS.byline.fix)
  root.style.setProperty('--grey', s.suggest || COLOR_PRESETS.byline.suggest)
  root.style.setProperty('--link', s.selection)

  // Surfaces: clear every mode-specific override first so toggling resolved
  // theme never leaves stale cross-mode inline vars (the reported bug:
  // dark --bg persisted after switching to light while --ink/--border
  // flipped via theme.css). --ink/--border/--muted always come from
  // theme.css and must never linger inline (clears legacy writes).
  for (const k of ['--bg', '--dock', '--paper', '--proof', '--caret', 'caret-color',
    '--btn-bg', '--btn-ink', '--ink', '--border', '--muted',
    '--paper-0', '--paper-1', '--paper-2', '--ink-1', '--ink-2', '--ink-4', '--ink-5']) {
    root.style.removeProperty(k)
  }

  // Dark-mode surface overrides (light mode always follows theme.css)
  if (resolved === 'dark') {
    if (s.uiBg) root.style.setProperty('--bg', s.uiBg)
    if (s.uiPanel) root.style.setProperty('--dock', s.uiPanel)
    // Dark keeps theme.css surfaces: never apply light paper/caret/buttons here.
  } else {
    if (s.uiBgLight) root.style.setProperty('--bg', s.uiBgLight)
    if (s.uiPanelLight) root.style.setProperty('--dock', s.uiPanelLight)
    // Writing space, margin line, caret, buttons follow preset in light mode
    if (s.paper) root.style.setProperty('--paper', s.paper)
    if (s.paperLine) root.style.setProperty('--proof', s.paperLine)
    if (s.verticalRule) root.style.setProperty('--vertical-rule', s.verticalRule)
    if (s.caret) {
      root.style.setProperty('--caret', s.caret)
      root.style.setProperty('caret-color', s.caret)
    }
    if (s.btnBg) root.style.setProperty('--btn-bg', s.btnBg)
    if (s.btnInk) root.style.setProperty('--btn-ink', s.btnInk)
  }

  // Typography & document setup
  root.style.setProperty(
    '--editor-font',
    s.editorFont === 'serif'
      ? '"Source Serif Pro","Source Serif 4",Georgia,serif'
      : s.editorFont === 'mono'
      ? 'ui-monospace,Menlo,monospace'
      : '"Inter",-apple-system,"Segoe UI",sans-serif'
  )
  root.style.setProperty('--editor-size', `${s.fontSize}px`)
  root.style.setProperty('--editor-lh', String(s.lineHeight))
  root.style.setProperty('--paper-w', s.paperWidth === 'narrow' ? '58ch' : s.paperWidth === 'wide' ? '92ch' : s.paperWidth === 'full' ? '100%' : '72ch')

  // Notify listeners (Logo, etc.) that colors changed
  dispatchEvent(new Event('byline-colors'))
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
  applySettings(s)
}

export interface Shortcut { keys: string; action: string; context?: string }
export const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  { group: 'Drafting', items: [
    { keys: 'Ctrl/⌘ Space', action: 'Request ghost text — or synonym/paraphrase grid when text is selected', context: 'Editor' },
    { keys: 'Ctrl/⌘ ⇧ /', action: 'Expand Connect for a 2+ sentence selection', context: 'Selection grid open' },
    { keys: 'Esc / Tab', action: 'Undo / keep an applied Connect', context: 'Connect open' },
    { keys: 'Alt + 1–9 / Alt + R', action: 'Toggle a Connect seam / reroll connectors', context: 'Connect open' },
    { keys: '1 – 4', action: 'Select completion level (cue / question / fragment / sentence)', context: 'Options open' },
    { keys: '1 – 9', action: 'Select grid cell', context: 'Grid open' },
    { keys: 'Tab', action: 'Accept selected option', context: 'Options open' },
    { keys: 'Ctrl/⌘ [ / ]', action: 'Previous / next alternative (grid page)', context: 'Options open' },
    { keys: 'Alt', action: 'Dismiss options', context: 'Options open' },
    { keys: 'Ctrl/⌘ .', action: 'Show last suggestions (reopens after dismiss)', context: 'Editor' },
    { keys: 'Esc', action: 'Close options and cancel the request', context: 'Options open' },
    { keys: 'Double-click word', action: 'Show synonyms for word', context: 'Editor' },
  ] },
  { group: 'Review & Edit', items: [
    { keys: 'Click line', action: 'Show Reader note below cursor', context: 'Edit mode' },
    { keys: 'Select text', action: 'Show options below selection', context: 'Edit mode' },
    { keys: '|', action: 'Show next note in the same area', context: 'Note open' },
    { keys: 'Enter / Click Accept', action: 'Apply change to draft', context: 'Note open' },
    { keys: 'Esc', action: 'Close review note', context: 'Note open' },
  ] },
  { group: 'Formatting', items: [
    { keys: 'Ctrl/⌘ B / I / U', action: 'Bold / italic / underline', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift X', action: 'Strikethrough', context: 'Editor' },
    { keys: 'Ctrl/⌘ E', action: 'Inline code', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift H', action: 'Highlight mark', context: 'Editor' },
    { keys: 'Ctrl/⌘ Alt 1 – 3', action: 'Heading levels 1 – 3', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift 7 / 8', action: 'Numbered / bullet list', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift B', action: 'Blockquote', context: 'Editor' },
    { keys: '/', action: 'Block menu on empty line (heading, list, quote, divider)', context: 'Empty block' },
  ] },
  { group: 'General', items: [
    { keys: 'Ctrl/⌘ Z', action: 'Undo edit', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift Z / Ctrl Y', action: 'Redo edit', context: 'Editor' },
    { keys: 'Ctrl/⌘ ,', action: 'Open Settings', context: 'App' },
    { keys: 'Esc', action: 'Close dialog / cancel task', context: 'Dialog open' },
  ] },
]
