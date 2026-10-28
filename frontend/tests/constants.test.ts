import { describe, it, expect } from 'vitest'
import { DICTIONS, TONES, matchText, digitFor } from '../src/lib/constants'
import { buildStyle, type AppliedSettings } from '../src/lib/buildStyle'
import { keys, getJSON, setJSON } from '../src/lib/storage'

describe('constants', () => {
  it('diction/tone catalogs non-empty and unique', () => {
    expect(new Set(DICTIONS).size).toBe(DICTIONS.length)
    expect(new Set(TONES).size).toBe(TONES.length)
    expect(DICTIONS).toContain('General')
  })
  it('matchText substring + word-prefix', () => {
    expect(matchText('cause eff', 'Cause / effect')).toBe(true)
    expect(matchText('xyz', 'Cause / effect')).toBe(false)
    expect(matchText('', 'anything')).toBe(true)
  })
  it('digitFor wraps at 10', () => { expect(digitFor(0)).toBe('1'); expect(digitFor(9)).toBe('0') })
})

describe('buildStyle', () => {
  const base: AppliedSettings = { context: '', level: 'General', voice: '', assist: 'Phrase', persona: '', tones: { Serious: 'allow', Humorous: 'ban' }, rhythm: 2, gramVoice: 'passive', clause: 'Subordinated', density: 2, audLevel: 3, audText: '' }
  it('renders allowed/banned tones + active voice', () => {
    const s = buildStyle({ ...base, gramVoice: 'active', voice: 'Direct' })
    expect(s).toContain('Tone ALLOWED: Serious')
    expect(s).toContain('Tone NOT ALLOWED: Humorous')
    expect(s).toContain('strictly ACTIVE')
    expect(s).toContain('Voice: Direct')
  })
})

describe('storage', () => {
  it('demo/app keys differ, JSON roundtrip', () => {
    const mem = new Map<string, string>()
    ;(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } }
    expect(keys.doc(true)).not.toBe(keys.doc(false))
    setJSON('byline.test.x', { a: 1 })
    expect(getJSON('byline.test.x', null)).toEqual({ a: 1 })
    expect(getJSON('byline.test.missing', 42)).toBe(42)
  })
})
