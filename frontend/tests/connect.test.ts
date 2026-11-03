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
    const out = transformConnect(session.orig, seams, session.casual)
    expect(out.text).not.toContain('Instead,')
    expect(out.text).toContain('So companies')
    expect(out.marks).toHaveLength(1)
  })

  it('never double-links an already linked sentence', () => {
    const orig = 'One claim. However, a second claim. A third claim.'
    const session = createConnectSession(0, orig)!
    const out = transformConnect(session.orig, session.seams, false)
    expect(out.text.startsWith('One claim. However, a second claim.')).toBe(true)
    expect(session.seams[0].on).toBe(true)
    expect(session.marks).toHaveLength(1)
  })

  it('uses casual connectors when the selection is casual', () => {
    const session = createConnectSession(0, DEMO)!
    expect(session.casual).toBe(true)
    expect(session.text).toContain('Instead,')
  })
})
