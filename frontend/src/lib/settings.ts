export type ThemeMode = 'light' | 'dark' | 'system'
export type EditorFont = 'serif' | 'sans' | 'mono'
export type PaperWidth = 'narrow' | 'normal' | 'wide' | 'full'
export type Density = 'comfortable' | 'compact'

export interface AppSettings {
  theme: ThemeMode
  ai: string
  grammar: string
  sources: string
  wordChoice: string
  selection: string
  suggest: string
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
  // Grammar auto-apply
  autoApplyGrammar: boolean
}

export interface ColorPreset {
  label: string
  description: string
  grammar: string   // Red / error / language
  ai: string        // Purple / reader
  wordChoice: string// Amber / supervisor / flow
  sources: string   // Blue / researcher / citations
  suggest: string   // Grey / ghost suggestions
  selection: string // Selection highlight
}

/** Rich, coordinated color presets driving the logo, annotations, cards, and paper underlines */
export const COLOR_PRESETS: Record<string, ColorPreset> = {
  byline: {
    label: 'Byline Classic',
    description: 'Iconic editorial palette: bold crimson, deep royal purple, warm amber, cobalt blue',
    grammar: '#C0281F',
    ai: '#6D3BE0',
    wordChoice: '#8A5F00',
    sources: '#1765CC',
    suggest: '#626A75',
    selection: '#F5E3B0',
  },
  oxford: {
    label: 'Oxford',
    description: 'Scholarly distinction: crimson red, deep indigo reader, antique brass, cobalt',
    grammar: '#BE123C',
    ai: '#4338CA',
    wordChoice: '#B45309',
    sources: '#1D4ED8',
    suggest: '#475569',
    selection: '#E0E7FF',
  },
  glacier: {
    label: 'Glacier',
    description: 'Crisp & modern: rose, vibrant cyan reader, ochre flow, steel blue evidence',
    grammar: '#E11D48',
    ai: '#0891B2',
    wordChoice: '#D97706',
    sources: '#2563EB',
    suggest: '#64748B',
    selection: '#CFFAFE',
  },
  verdant: {
    label: 'Verdant',
    description: 'Forest-inspired: scarlet berry, emerald green reader, olive gold, sky azure',
    grammar: '#DC2626',
    ai: '#059669',
    wordChoice: '#CA8A04',
    sources: '#0284C7',
    suggest: '#6B7280',
    selection: '#D1FAE5',
  },
  sunset: {
    label: 'Sunset',
    description: 'Warm evening: burnt orange, vivid magenta reader, warm gold, electric indigo',
    grammar: '#EA580C',
    ai: '#C026D3',
    wordChoice: '#EAB308',
    sources: '#4F46E5',
    suggest: '#78716C',
    selection: '#FDE68A',
  },
  monochrome: {
    label: 'Monochrome',
    description: 'Distraction-free high-contrast grayscale for deep focused drafting',
    grammar: '#18181B',
    ai: '#3F3F46',
    wordChoice: '#71717A',
    sources: '#52525B',
    suggest: '#A1A1AA',
    selection: '#E4E4E7',
  },
}

// Backwards compatibility aliases
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
  autoApplyGrammar: false,
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
  root.style.setProperty('--lt', s.grammar)
  root.style.setProperty('--blue', s.sources)
  root.style.setProperty('--yellow', s.wordChoice)
  root.style.setProperty('--grey', s.suggest || COLOR_PRESETS.byline.suggest)
  root.style.setProperty('--link', s.selection)

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
  { group: 'AI Drafting & Assistance', items: [
    { keys: 'Ctrl/⌘ Space', action: 'Suggest — request contextual ghost completions at caret', context: 'Editor' },
    { keys: 'Ctrl/⌘ /', action: 'Sentence starters — open transition phrases & connect menu', context: 'Editor' },
    { keys: '1 – 3', action: 'Accept suggestion #N', context: 'Suggestions open' },
    { keys: 'Tab', action: 'Accept first suggestion', context: 'Suggestions open' },
    { keys: 'Alt + R / `', action: 'Reroll — generate fresh suggestion options', context: 'Suggestions open' },
    { keys: 'Esc', action: 'Dismiss suggestions / clear selection', context: 'Suggestions open' },
    { keys: 'Double-click word', action: 'Synonyms & vocabulary explorer for selected word', context: 'Editor' },
  ] },
  { group: 'Inline Review & Edit Mode', items: [
    { keys: 'Click underline', action: 'Inspect issue & suggestions popup below cursor', context: 'Edit mode' },
    { keys: 'Select text', action: 'Open contextual inline assistance popup below selection', context: 'Edit mode' },
    { keys: 'Tab', action: 'Cycle next tab when multiple color categories overlap on text', context: 'Inline popup open' },
    { keys: 'Enter / Click Accept', action: 'Apply suggested revision safely into draft text', context: 'Inline popup open' },
    { keys: 'Esc', action: 'Dismiss inline review popup', context: 'Inline popup open' },
  ] },
  { group: 'Independent Outline & Structure', items: [
    { keys: 'Drag Handle ⠿', action: 'Reorder sections or nest into hierarchy (Godot / Notion style)', context: 'Outline panel' },
    { keys: 'Double-click title', action: 'Rename section title inline', context: 'Outline panel' },
    { keys: '+ button', action: 'Add a new section directly below', context: 'Outline panel' },
    { keys: 'Insert in Doc', action: 'Explicitly insert outline heading or expand proposed draft section', context: 'Outline panel' },
  ] },
  { group: 'Formatting & Typography', items: [
    { keys: 'Ctrl/⌘ B / I / U', action: 'Bold / italic / underline', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift X', action: 'Strikethrough', context: 'Editor' },
    { keys: 'Ctrl/⌘ E', action: 'Inline code', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift H', action: 'Highlight mark', context: 'Editor' },
    { keys: 'Ctrl/⌘ Alt 1 – 3', action: 'Heading levels 1 – 3', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift 7 / 8', action: 'Numbered / bullet list', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift B', action: 'Blockquote', context: 'Editor' },
    { keys: '/', action: 'Block menu on empty line (heading, list, quote, divider)', context: 'Empty block' },
  ] },
  { group: 'General & Application', items: [
    { keys: 'Ctrl/⌘ Z', action: 'Undo edit', context: 'Editor' },
    { keys: 'Ctrl/⌘ Shift Z / Ctrl Y', action: 'Redo edit', context: 'Editor' },
    { keys: 'Ctrl/⌘ ,', action: 'Open Workspace Settings', context: 'App' },
    { keys: 'Esc', action: 'Close modal / cancel active operation', context: 'Dialog open' },
  ] },
]
