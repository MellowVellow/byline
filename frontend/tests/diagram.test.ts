// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { sanitizeDiagramSvg } from '../src/components/Diagram'

describe('diagram labels', () => {
  it('keeps SVG <text> labels through sanitizer', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g class="node"><rect width="10" height="10"/><text x="5" y="5">Cats are great</text></g><script>alert(1)</script></svg>'
    const clean = sanitizeDiagramSvg(svg)
    expect(clean).toContain('Cats are great')
    expect(clean).not.toContain('<script')
  })
  it('documents foreignObject stripping (why htmlLabels must stay off)', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">Hidden label</div></foreignObject></svg>'
    expect(sanitizeDiagramSvg(svg)).not.toContain('Hidden label')
  })
})
