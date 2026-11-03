import { describe, it, expect } from 'vitest'
import {
  createConnectSession,
  hasConnectSelection,
  sentenceCount,
  splitSentences,
  transformConnect,
  type ConnectSeam,
} from '../src/lib/connect'

const DEMO = 'AI consumes so much water, and people are crazy about it due to its interpreted value, but in reality it doesn’t really do much for individual consumers. It’s just that companies are benefitting from it. Companies are building datacenters which cause lots of water usage, upto trillions of liter in total usage.'

describe('Connect rules engine', () => {
  it('counts sentences and only activates at 2+', () => {
    expect(sentenceCount('One.')).toBe(1)
    expect(hasConnectSelection('One.')).toBe(false)
    expect(hasConnectSelection('One. Two.')).toBe(true)
    expect(splitSentences(DEMO)).toHaveLength(3)
  })

  it('writes connectors into the selection and marks them', () => {
    const session = createConnectSession(0, DEMO)
    expect(session).not.toBeNull()
    expect(session!.text).toContain('Instead,')
    expect(session!.text).toContain('So companies')
    expect(session!.marks).toHaveLength(2)
  })

  it('removes a connector when its seam is off', () => {
    const session = createConnectSession(0, DEMO)!
    const seams: ConnectSeam[] = session.seams.map((s, i) => ({ ...s, on: i !== 0 }))
    const out = transformConnect(session.orig, seams, session.casual, session.alts)
    expect(out.text).not.toContain('Instead,')
    expect(out.text).toContain('So companies')
    expect(out.marks).toHaveLength(1)
  })

  it('replaces rather than double-links an already linked sentence', () => {
    const orig = 'One claim. However, a second claim. A third claim.'
    const session = createConnectSession(0, orig)!
    const out = transformConnect(session.orig, session.seams, false, session.alts)
    expect(out.text.startsWith('One claim. However, a second claim.')).toBe(true)
    expect(out.text).not.toContain('However, However')
    expect(session.seams[0].on).toBe(true)
    expect(session.marks).toHaveLength(2)
  })

  it('offers alternatives for an already linked sentence, keeping the original', () => {
    const orig = 'One claim. However, a second claim. A third claim.'
    const session = createConnectSession(0, orig)!
    const alts = session.alts[0].map(a => a.text)
    expect(alts).toContain('However,')
    expect(alts.length).toBeGreaterThan(1)
    expect(session.text.startsWith('One claim. However, a second claim.')).toBe(true)
  })

  it('pages through one alternative at a time', () => {
    const session = createConnectSession(0, 'One claim. Two claim. Three claim.')!
    expect(session.alts[0].length).toBeGreaterThan(1)
    const first = session.text
    const stepped = {
      ...session,
      seams: session.seams.map((s, i) =>
        i === 0 ? { ...s, v: (s.v + 1) % session.alts[i].length } : s,
      ),
    }
    const out = transformConnect(stepped.orig, stepped.seams, stepped.casual, stepped.alts)
    expect(out.text).not.toBe(first)
    expect(out.text).toContain(stepped.alts[0][stepped.seams[0].v].text)
  })

  it('cycles the relationship type to the next family of alternatives', () => {
    const session = createConnectSession(0, 'One claim. Two claim. Three claim.')!
    const alts = session.alts[0]
    const curRel = alts[session.seams[0].v].rel
    const nextRel = (curRel + 1) % 4
    const idx = alts.findIndex(a => a.rel === nextRel)
    expect(idx).toBeGreaterThanOrEqual(0)
    const stepped = {
      ...session,
      seams: session.seams.map((s, i) => (i === 0 ? { ...s, v: idx } : s)),
    }
    const out = transformConnect(stepped.orig, stepped.seams, stepped.casual, stepped.alts)
    expect(out.text).toContain(alts[idx].text)
  })

  it('uses casual connectors when the selection is casual', () => {
    const session = createConnectSession(0, DEMO)!
    expect(session.casual).toBe(true)
    expect(session.text).toContain('Instead,')
  })
})
