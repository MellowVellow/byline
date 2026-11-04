import type { Editor } from '@tiptap/react'
import TurndownService from 'turndown'
import { exportDocx } from '../lib/docx-export'

export type ExportFormat = 'docx' | 'markdown' | 'txt'

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' })

export const exportService = {
  async export(editor: Editor, format: ExportFormat, title = 'Byline-Draft') {
    if (!editor) return

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Byline-Draft'

    const refsHtml = (() => {
      try {
        return document.getElementById('byline-refs')?.innerHTML || localStorage.getItem('byline.refs.html') || ''
      } catch { return '' }
    })()
    const refsText = refsHtml
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (format === 'docx') {
      const json: any = editor.getJSON()
      if (refsText) {
        json.content = [
          ...(json.content || []),
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'References' }] },
          ...refsText.split('\n').filter(l => l.trim()).map(line => ({
            type: 'paragraph', content: [{ type: 'text', text: line }],
          })),
        ]
      }
      await exportDocx(json, { title, filename: `${sanitizedTitle}.docx` })
      return
    }

    if (format === 'txt') {
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
      const full = refsText ? `${text}\n\nReferences\n${refsText}` : text
      this.triggerDownload(`${sanitizedTitle}.txt`, full, 'text/plain;charset=utf-8')
      return
    }

    if (format === 'markdown') {
      const md = this.htmlToMarkdown(editor.getHTML())
      const full = refsText ? `${md}\n\n## References\n\n${refsText}` : md
      this.triggerDownload(`${sanitizedTitle}.md`, full, 'text/markdown;charset=utf-8')
      return
    }
  },

  htmlToMarkdown(html: string): string {
    try {
      return turndown.turndown(html || '').replace(/\n{3,}/g, '\n\n').trim()
    } catch {
      return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  },

  triggerDownload(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
