import type { Editor } from '@tiptap/react'
import TurndownService from 'turndown'
import { exportDocx } from '../lib/docx-export'

export type ExportFormat = 'docx' | 'markdown' | 'txt'

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' })

export const exportService = {
  async export(editor: Editor, format: ExportFormat, title = 'Byline-Draft') {
    if (!editor) return

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Byline-Draft'

    if (format === 'docx') {
      await exportDocx(editor.getJSON(), { title, filename: `${sanitizedTitle}.docx` })
      return
    }

    if (format === 'txt') {
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n\n')
      this.triggerDownload(`${sanitizedTitle}.txt`, text, 'text/plain;charset=utf-8')
      return
    }

    if (format === 'markdown') {
      const md = this.htmlToMarkdown(editor.getHTML())
      this.triggerDownload(`${sanitizedTitle}.md`, md, 'text/markdown;charset=utf-8')
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
