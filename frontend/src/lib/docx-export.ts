import {
  AlignmentType, Document, FootnoteReferenceRun, Header, Footer, HeadingLevel,
  Packer, PageBreak, PageNumber, Paragraph, TextRun,
} from 'docx'
import { collectFootnotes } from '../editor/extensions'

export type DocxOptions = {
  title?: string
  header?: string
  footer?: string
  pageNumbers?: boolean
}

const HEADINGS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
}
const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED,
}

function runs(node: any, fnIds: Map<string, number>): TextRun[] {
  if (!node) return []
  if (node.type === 'text') {
    const marks = node.marks || []
    const has = (t: string) => marks.some((m: any) => m.type === t)
    const link = marks.find((m: any) => m.type === 'link')
    return [new TextRun({
      text: node.text || '',
      bold: has('bold'), italics: has('italic'), strike: has('strike'),
      underline: has('underline') ? {} : undefined,
      ...(has('code') ? { font: 'Consolas', size: 20 } : {}),
      ...(has('highlight') ? { shading: { fill: 'FFF3C4' } } : {}),
      ...(link ? { style: 'Hyperlink' } : {}),
    })]
  }
  if (node.type === 'hardBreak') return [new TextRun({ break: 1 })]
  if (node.type === 'footnote') {
    const id = fnIds.get(node.attrs?.id) ?? fnIds.size + 1
    return [new FootnoteReferenceRun(id) as unknown as TextRun]
  }
  return (node.content || []).flatMap((c: any) => runs(c, fnIds))
}

function blocks(node: any, fnIds: Map<string, number>, depth = 0): Paragraph[] {
  if (!node) return []
  const align = node.attrs?.textAlign ? ALIGN[node.attrs.textAlign] : undefined
  switch (node.type) {
    case 'doc': return (node.content || []).flatMap((c: any) => blocks(c, fnIds, depth))
    case 'heading': return [new Paragraph({ heading: HEADINGS[node.attrs?.level || 1], alignment: align, children: runs(node, fnIds) })]
    case 'paragraph': return [new Paragraph({ alignment: align, children: runs(node, fnIds) })]
    case 'blockquote': return (node.content || []).flatMap((c: any) =>
      blocks(c, fnIds, depth).map(p => new Paragraph({ ...p, style: 'IntenseQuote' } as any)))
    case 'codeBlock': return [new Paragraph({ children: [new TextRun({ text: (node.content || []).map((c: any) => c.text || '').join(''), font: 'Consolas', size: 20 })] })]
    case 'horizontalRule': return [new Paragraph({ text: '─'.repeat(24), alignment: AlignmentType.CENTER })]
    case 'pageBreak': return [new Paragraph({ children: [new PageBreak()] })]
    case 'bulletList':
    case 'orderedList': return (node.content || []).flatMap((item: any, i: number) =>
      (item.content || []).flatMap((c: any) => {
        if (c.type === 'paragraph') return [new Paragraph({
          alignment: c.attrs?.textAlign ? ALIGN[c.attrs.textAlign] : undefined,
          bullet: node.type === 'bulletList' ? { level: depth } : undefined,
          numbering: node.type === 'orderedList' ? { reference: 'byline-numbering', level: depth } : undefined,
          children: runs(c, fnIds),
        })]
        return blocks(c, fnIds, depth + 1)
      }))
    case 'listItem': return (node.content || []).flatMap((c: any) => blocks(c, fnIds, depth))
    default: return (node.content || []).flatMap((c: any) => blocks(c, fnIds, depth))
  }
}

export function buildDocx(json: any, opts: DocxOptions = {}) {
  const notes = collectFootnotes(json)
  const fnIds = new Map(notes.map(n => [n.id, n.label]))
  // relabel footnote nodes so in-text refs match export numbering
  const footnotes: Record<number, { children: Paragraph[] }> = {}
  for (const n of notes) footnotes[n.label] = { children: [new Paragraph({ children: [new TextRun(n.content)] })] }

  const children = blocks(json, fnIds)
  return new Document({
    title: opts.title || 'Byline document',
    numbering: { config: [{ reference: 'byline-numbering', levels: [{ level: 0, format: 'decimal' as any, text: '%1.', alignment: AlignmentType.LEFT }] }] },
    footnotes,
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      headers: opts.header ? { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: opts.header, size: 18, color: '68707A' })] })] }) } : undefined,
      footers: (opts.footer || opts.pageNumbers) ? {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            ...(opts.footer ? [new TextRun({ text: opts.footer, size: 18, color: '68707A' })] : []),
            ...(opts.pageNumbers ? [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '68707A' })] : []),
          ],
        })] }),
      } : undefined,
      children: children.length ? children : [new Paragraph('')],
    }],
  })
}

export async function exportDocx(json: any, opts: DocxOptions & { filename?: string } = {}) {
  const blob = await Packer.toBlob(buildDocx(json, opts))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = opts.filename || `${(opts.title || 'byline').replace(/[^\w-]+/g, '-').toLowerCase()}.docx`
  a.click()
  URL.revokeObjectURL(a.href)
}
