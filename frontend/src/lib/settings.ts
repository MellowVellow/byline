export type ThemeMode = 'light' | 'dark' | 'system'
export type EditorFont = 'serif' | 'sans' | 'mono'
export type PaperWidth = 'narrow' | 'normal' | 'wide' | 'full'
export type Density = 'comfortable' | 'compact'

export interface AppSettings {
  theme: ThemeMode
  ai: string
  grammar: string
  explore: string
  fix: string
  selection: string
  suggest: string
  /** Dark-mode surface overrides (empty = follow theme.css). */
  uiBg: string
  uiPanel: string
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
  temperature: number
  maxTokens: number
  topP: number
  reasoningEffort: 'minimal' | 'low' | 'medium'
  // Writing profile
  writingTheme: 'neutral' | 'academic' | 'gen-z' | 'buzzword'
  language: string
}

export interface ColorPreset {
  label: string
  description: string
  ai: string        // Purple / reader
  grammar: string   // Red / grammar underline + hold marks
  explore: string   // Blue / explore underline
  fix: string       // Green / auto-fix flash
  suggest: string   // Grey / ghost suggestions
  selection: string // Yellow / selection highlight
  uiBg: string      // Dark-mode UI background override
  uiPanel: string   // Dark-mode UI panel (rails) override
}

/** Color presets for logo, cards, and text marks */
export const COLOR_PRESETS: Record<string, ColorPreset> = {
  byline: {
    label: 'Byline',
    description: 'Default marks: red, purple, amber, blue',
    ai: '#6D3BE0',
    grammar: '#C0281F',
    explore: '#1765CC',
    fix: '#16A34A',
    suggest: '#626A75',
    selection: '#F5E3B0',
    uiBg: '#0F1115',
    uiPanel: '#16181D',
  },
  oxford: {
    label: 'Oxford',
    description: 'Dark red, indigo, brass, blue',
    ai: '#4338CA',
    grammar: '#B91C1C',
    explore: '#1D4ED8',
    fix: '#15803D',
    suggest: '#475569',
    selection: '#E0E7FF',
    uiBg: '#111420',
    uiPanel: '#181C28',
  },
  glacier: {
    label: 'Glacier',
    description: 'Rose, cyan, ochre, steel blue',
    ai: '#0891B2',
    grammar: '#E11D48',
    explore: '#0284C7',
    fix: '#059669',
    suggest: '#64748B',
    selection: '#CFFAFE',
    uiBg: '#0E1418',
    uiPanel: '#162026',
  },
  verdant: {
    label: 'Verdant',
    description: 'Red, green, olive, sky blue',
    ai: '#059669',
    grammar: '#DC2626',
    explore: '#0284C7',
    fix: '#16A34A',
    suggest: '#6B7280',
    selection: '#D1FAE5',
    uiBg: '#0E1512',
    uiPanel: '#16211B',
  },
  sunset: {
    label: 'Sunset',
    description: 'Orange, magenta, gold, indigo',
    ai: '#C026D3',
    grammar: '#EA580C',
    explore: '#4F46E5',
    fix: '#65A30D',
    suggest: '#78716C',
    selection: '#FDE68A',
    uiBg: '#161210',
    uiPanel: '#211914',
  },
  monochrome: {
    label: 'Monochrome',
    description: 'Gray scale for focused drafting',
    ai: '#3F3F46',
    grammar: '#52525B',
    explore: '#52525B',
    fix: '#3F3F46',
    suggest: '#A1A1AA',
    selection: '#E4E4E7',
    uiBg: '#131313',
    uiPanel: '#1B1B1B',
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
  temperature: 0.7,
  maxTokens: 800,
  topP: 0.9,
  reasoningEffort: 'minimal',
  writingTheme: 'neutral',
  language: 'en-US',
}

const KEY = 'byline.settings.v1'

export function loadSettings(): AppSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s) return { ...DEFAULT_SETTINGS, ...s }
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
  root.style.setProperty('--explore', s.explore || COLOR_PRESETS.byline.explore)
  root.style.setProperty('--fix', s.fix || COLOR_PRESETS.byline.fix)
  root.style.setProperty('--grey', s.suggest || COLOR_PRESETS.byline.suggest)
  root.style.setProperty('--link', s.selection)

  // Dark-mode surface overrides (light mode always follows theme.css)
  if (resolved === 'dark') {
    if (s.uiBg) root.style.setProperty('--bg', s.uiBg)
    else root.style.removeProperty('--bg')
    if (s.uiPanel) root.style.setProperty('--dock', s.uiPanel)
    else root.style.removeProperty('--dock')
  } else {
    root.style.removeProperty('--bg')
    root.style.removeProperty('--dock')
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
    { keys: 'Ctrl/⌘ Space', action: 'Request completions at cursor', context: 'Editor' },
    { keys: 'Ctrl/⌘ /', action: 'Open links and connectors', context: 'Editor' },
    { keys: '1 – 4', action: 'Set completion level (cue / question / fragment / sentence)', context: 'Options open' },
    { keys: '1 – 9', action: 'Accept grid cell', context: 'Grid open' },
    { keys: 'Tab', action: 'Accept first option', context: 'Options open' },
    { keys: 'Alt + R / `', action: 'List new options', context: 'Options open' },
    { keys: 'Ctrl/⌘ .', action: 'Show last options', context: 'Editor' },
    { keys: 'Esc', action: 'Close options / clear selection', context: 'Options open' },
    { keys: 'Double-click word', action: 'Show synonyms for word', context: 'Editor' },
  ] },
  { group: 'Review & Edit', items: [
    { keys: 'Click line', action: 'Show Reader note below cursor', context: 'Edit mode' },
    { keys: 'Select text', action: 'Show options below selection', context: 'Edit mode' },
    { keys: 'Tab', action: 'Show next Reader note', context: 'Note open' },
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
