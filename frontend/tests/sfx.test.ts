// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { sfxEnabled, sfxMuted, sfxToggle, setSfxEnabled } from '../src/lib/sfx'

describe('sfx default', () => {
  beforeEach(() => { localStorage.clear() })
  it('defaults MUTED when unset (fresh origin)', () => {
    expect(sfxEnabled()).toBe(false)
    expect(sfxMuted()).toBe(true)
  })
  it('stays ON after explicit enable', () => {
    setSfxEnabled(true)
    expect(sfxEnabled()).toBe(true)
    expect(sfxMuted()).toBe(false)
  })
  it('toggle flips and persists', () => {
    expect(sfxToggle()).toBe(false) // muted -> toggle returns muted=false (now on)
    expect(localStorage.getItem('byline.sfx')).toBe('1')
    expect(sfxToggle()).toBe(true) // enabled -> toggle returns muted=true
    expect(sfxEnabled()).toBe(false)
  })
})
