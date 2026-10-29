import { describe, it, expect } from 'vitest'
import { DICTIONS, matchText, digitFor } from '../src/lib/constants'
import { keys, getJSON, setJSON } from '../src/lib/storage'

describe('constants', () => {
  it('diction catalog non-empty and unique', () => {
    expect(new Set(DICTIONS).size).toBe(DICTIONS.length)
    expect(DICTIONS).toContain('General')
  })
  it('matchText substring + word-prefix', () => {
    expect(matchText('cause eff', 'Cause / effect')).toBe(true)
    expect(matchText('xyz', 'Cause / effect')).toBe(false)
    expect(matchText('', 'anything')).toBe(true)
  })
  it('digitFor wraps at 10', () => { expect(digitFor(0)).toBe('1'); expect(digitFor(9)).toBe('0') })
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
