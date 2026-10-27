// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { buildDocx } from '../src/lib/docx-export'
import { collectFootnotes } from '../src/editor/extensions'
import { Packer } from 'docx'

const json = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Deep section' }] },
    { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'Deepest' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Body', marks: [{ type: 'bold' }] },
      { type: 'footnote', attrs: { id: 'fn-a', content: 'A note' } },
    ] },
    { type: 'pageBreak' },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }] }] },
  ],
}

describe('docx export', () => {
  it('collects footnotes in doc order with 1-based labels', () => {
    expect(collectFootnotes(json)).toEqual([{ id: 'fn-a', content: 'A note', label: 1 }])
  })
  it('builds valid .docx (zip) with H1-H6, page break, header/footer, footnote', async () => {
    const doc = buildDocx(json, { title: 'T', header: 'Hdr', footer: 'Ftr', pageNumbers: true })
    const blob = await Packer.toBlob(doc)
    expect(blob.size).toBeGreaterThan(1000)
    const buf = new Uint8Array(await blob.arrayBuffer())
    expect(buf[0]).toBe(0x50); expect(buf[1]).toBe(0x4b) // PK zip
  })
})
