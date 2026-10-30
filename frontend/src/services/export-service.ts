import type { Editor } from '@tiptap/react'
import { exportDocx } from '../lib/docx-export'

export type ExportFormat = 'docx' | 'markdown' | 'txt'

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
    return html
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul>(.*?)<\/ul>/gi, '$1\n')
      .replace(/<ol>(.*?)<\/ol>/gi, '$1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
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
