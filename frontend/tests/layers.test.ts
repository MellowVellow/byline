import { describe, it, expect } from 'vitest'
import { subtractRange } from '../src/editor/decorations'

describe('stacked underline cutting (red>yellow>blue>purple)', () => {
  it('purple sentence loses segment under yellow word', () => {
    expect(subtractRange({ from: 0, to: 30 }, [{ from: 10, to: 18 }])).toEqual([{ from: 0, to: 10 }, { from: 18, to: 30 }])
  })
  it('fully covered range disappears', () => {
    expect(subtractRange({ from: 10, to: 18 }, [{ from: 0, to: 30 }])).toEqual([])
  })
  it('non-overlap untouched', () => {
    expect(subtractRange({ from: 20, to: 25 }, [{ from: 0, to: 10 }])).toEqual([{ from: 20, to: 25 }])
  })
})
