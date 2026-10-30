export type ThemeMode = 'light' | 'dark' | 'system'
export type EditorFont = 'serif' | 'sans' | 'mono'
export type PaperWidth = 'narrow' | 'normal' | 'wide'
export type Density = 'comfortable' | 'compact'

export interface AppSettings {
  theme: ThemeMode
  ai: string; grammar: string; sources: string; wordChoice: string; selection: string; suggest: string
  editorFont: EditorFont; fontSize: number; lineHeight: number; paperWidth: PaperWidth
  density: Density; showWordCount: boolean; showMetrics: boolean; reduceMotion: boolean; spellcheck: boolean
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

/** One preset drives every annotation surface: grammar=Language red, ai=Reader purple, sources=blue, wordChoice=Lint yellow, suggest=Suggest grey. */
export const COLOR_PRESETS: Record<string, { label: string; ai: string; grammar: string; sources: string; wordChoice: string; selection: string; suggest: string }> = {
  default: { label: 'Byline', ai: '#6D3BE0', grammar: '#C0281F', sources: '#1765CC', wordChoice: '#8A5F00', selection: '#F5E3B0', suggest: '#626A75' },
  ocean: { label: 'Ocean', ai: '#0E7490', grammar: '#E11D48', sources: '#2563EB', wordChoice: '#D97706', selection: '#DBEAFE', suggest: '#64748B' },
  forest: { label: 'Forest', ai: '#15803D', grammar: '#DC2626', sources: '#0369A1', wordChoice: '#CA8A04', selection: '#DCFCE7', suggest: '#6B7280' },
  sunset: { label: 'Sunset', ai: '#C026D3', grammar: '#EA580C', sources: '#4F46E5', wordChoice: '#EAB308', selection: '#FDE68A', suggest: '#78716C' },
  mono: { label: 'Mono', ai: '#525252', grammar: '#171717', sources: '#404040', wordChoice: '#737373', selection: '#E5E5E5', suggest: '#9CA3AF' },
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system', ...COLOR_PRESETS.default, editorFont: 'serif', fontSize: 19, lineHeight: 1.65,
  paperWidth: 'normal', density: 'comfortable', showWordCount: true, showMetrics: true, reduceMotion: false, spellcheck: false,
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
const { label: _l, ...presetColors } = COLOR_PRESETS.default; void _l; void presetColors

export function loadSettings(): AppSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s) return { ...DEFAULT_SETTINGS, ...s }
  } catch { /* fall through */ }
  const legacy = localStorage.getItem('byline.theme')
  return { ...DEFAULT_SETTINGS, theme: legacy === 'light' || legacy === 'dark' ? legacy : 'system' }
}
export function resolveTheme(t: ThemeMode): 'light' | 'dark' {
  return t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t
}
export function applySettings(s: AppSettings) {
  const root = document.documentElement
  const resolved = resolveTheme(s.theme)
  root.dataset.theme = resolved; root.dataset.density = s.density; root.dataset.motion = s.reduceMotion ? 'reduce' : ''
  localStorage.setItem('byline.theme', resolved); dispatchEvent(new Event('byline-theme'))
  root.style.setProperty('--ai', s.ai); root.style.setProperty('--lt', s.grammar)
  root.style.setProperty('--blue', s.sources); root.style.setProperty('--yellow', s.wordChoice)
  root.style.setProperty('--grey', s.suggest || COLOR_PRESETS.default.suggest)
  root.style.setProperty('--link', s.selection)
  root.style.setProperty('--editor-font', s.editorFont === 'serif' ? '"Source Serif 4",Georgia,serif' : s.editorFont === 'mono' ? 'ui-monospace,Menlo,monospace' : '"Inter",-apple-system,"Segoe UI",sans-serif')
  root.style.setProperty('--editor-size', `${s.fontSize}px`); root.style.setProperty('--editor-lh', String(s.lineHeight))
  root.style.setProperty('--paper-w', s.paperWidth === 'narrow' ? '58ch' : s.paperWidth === 'wide' ? '88ch' : '70ch')
}
export function saveSettings(s: AppSettings) { localStorage.setItem(KEY, JSON.stringify(s)); applySettings(s) }

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
