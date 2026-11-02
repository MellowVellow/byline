import { describe, it, expect } from 'vitest'
import { SOURCE_TYPES } from '../src/data/mockResearch'
import { LIVE_SOURCE_TYPE, ALL_SOURCE_TYPES } from '../src/modes/explore/ExploreView'

// Regression: live fetched sources (ty='Web') were dropped by the source-type
// filter because SOURCE_TYPES had no 'Web' entry — the table showed only
// derived angles and looked like mock data.
describe('explore live source filter', () => {
  it('covers the live Web type plus every static type', () => {
    expect(LIVE_SOURCE_TYPE).toBe('Web')
    for (const t of SOURCE_TYPES as unknown as string[]) {
      expect(ALL_SOURCE_TYPES).toContain(t)
    }
    expect(ALL_SOURCE_TYPES).toContain('Web')
  })

  it('keeps a live sourced row visible under the default allowlist', () => {
    const allowed = new Set(ALL_SOURCE_TYPES)
    expect(allowed.has('Web')).toBe(true)
  })
})
