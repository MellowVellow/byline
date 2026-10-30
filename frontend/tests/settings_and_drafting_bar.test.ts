import { describe, it, expect } from 'vitest'
import { SHORTCUTS, DEFAULT_SETTINGS, COLOR_PRESETS } from '../src/lib/settings'
import { SUPPORTED_LANGUAGES, THEME_DEFINITIONS } from '../src/domain/writing-profile'

describe('Settings Revamp & Shortcuts', () => {
  it('contains the updated shortcut categories matching the current codebase features', () => {
    const groups = SHORTCUTS.map(g => g.group)
    expect(groups).toContain('AI Drafting & Assistance')
    expect(groups).toContain('Inline Review & Edit Mode')
    expect(groups).toContain('Independent Outline & Structure')
    expect(groups).toContain('Formatting & Typography')
    expect(groups).toContain('General & Application')

    // AI drafting shortcuts
    const aiGroup = SHORTCUTS.find(g => g.group === 'AI Drafting & Assistance')
    expect(aiGroup?.items.some(i => i.keys.includes('Ctrl/⌘ Space'))).toBe(true)

    // Inline review shortcuts
    const reviewGroup = SHORTCUTS.find(g => g.group === 'Inline Review & Edit Mode')
    expect(reviewGroup?.items.some(i => i.keys.includes('Click underline'))).toBe(true)
    expect(reviewGroup?.items.some(i => i.keys.includes('Tab'))).toBe(true)

    // Outline shortcuts
    const outlineGroup = SHORTCUTS.find(g => g.group === 'Independent Outline & Structure')
    expect(outlineGroup?.items.some(i => i.keys.includes('Drag Handle ⠿'))).toBe(true)
  })

  it('provides default meta inference and editor UI settings', () => {
    expect(DEFAULT_SETTINGS.metaModel).toBe('meta-llama/llama-3.3-70b-instruct')
    expect(DEFAULT_SETTINGS.temperature).toBe(0.7)
    expect(DEFAULT_SETTINGS.topP).toBe(0.9)
    expect(DEFAULT_SETTINGS.maxTokens).toBe(800)
    expect(DEFAULT_SETTINGS.reasoningEffort).toBe('minimal')

    expect(DEFAULT_SETTINGS.editorFont).toBe('serif')
    expect(DEFAULT_SETTINGS.fontSize).toBe(19)
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.65)
    expect(DEFAULT_SETTINGS.paperWidth).toBe('normal')

    expect(COLOR_PRESETS.default).toBeDefined()
    expect(COLOR_PRESETS.ocean).toBeDefined()
  })

  it('provides supported languages and themes for drafting tools bar', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0)
    expect(SUPPORTED_LANGUAGES.some(l => l.code === 'en-US')).toBe(true)
    expect(THEME_DEFINITIONS.neutral).toBeDefined()
    expect(THEME_DEFINITIONS.academic).toBeDefined()
  })
})
