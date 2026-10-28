// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { sfxEnabled, sfxMuted, sfxToggle, setSfxEnabled } from '../src/lib/sfx'

describe('sfx default', () => {
  beforeEach(() => { localStorage.clear() })
  it('defaults ON when unset (fresh origin)', () => {
    expect(sfxEnabled()).toBe(true)
    expect(sfxMuted()).toBe(false)
  })
  it('stays OFF after explicit mute', () => {
    setSfxEnabled(false)
    expect(sfxEnabled()).toBe(false)
    expect(sfxMuted()).toBe(true)
  })
  it('toggle flips and persists', () => {
    expect(sfxToggle()).toBe(true) // enabled -> toggle returns muted=true
    expect(localStorage.getItem('byline.sfx')).toBe('0')
    expect(sfxToggle()).toBe(false) // muted -> toggle returns muted=false
    expect(sfxEnabled()).toBe(true)
  })
})
