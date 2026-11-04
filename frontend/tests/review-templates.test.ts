import { describe, expect, it } from 'vitest'
import { REVIEW_TEMPLATES } from '../src/lib/review-templates'

describe('review templates', () => {
  it('has unique ids and non-empty labels/text', () => {
    const ids = REVIEW_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of REVIEW_TEMPLATES) {
      expect(t.label.trim().length).toBeGreaterThan(0)
      expect(t.text.trim().length).toBeGreaterThan(0)
    }
  })

  it('includes a reader template for review context', () => {
    const reader = REVIEW_TEMPLATES.find(t => t.id === 'reader')
    expect(reader).toBeDefined()
    expect(reader!.label).toBe('Reader')
    // Guides the Purple/reactions persona: ambiguity + reader interpretation,
    // fixable passages with replacements (matches /api/reactions contract).
    expect(reader!.text).toMatch(/reader/i)
    expect(reader!.text).toMatch(/ambigu|misread|interpret/i)
    expect(reader!.text).toMatch(/replacement|alternative/i)
    expect(reader!.text).toMatch(/grammar or spelling/i)
  })
})
