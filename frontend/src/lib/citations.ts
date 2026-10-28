import type { Fact } from './types'
export type CiteStyle = 'apa' | 'mla' | 'chicago'
export const CITE_TEMPLATES = {
  support: 'According to {inline}, {claim} — {excerpt}',
  contrast: 'However, {inline} qualifies this: {excerpt}',
  stat: '{claim} ({stat} per {inline})',
  define: '{term} is defined as {excerpt} {inline}',
} as const
export type CiteTemplate = keyof typeof CITE_TEMPLATES

export function formatInline(f: Pick<Fact, 'source_title' | 'url' | 'locator'>, style: CiteStyle = 'apa'): string {
  const t = (f.source_title || f.url || 'source').trim()
  const loc = f.locator?.trim() ? `, ${f.locator.trim()}` : ''
  if (style === 'mla') return `("${t}"${loc})`
  if (style === 'chicago') return f.url ? `(${t}${loc}, ${f.url})` : `(${t}${loc})`
  return `(${t}${loc})`
}
export function applyTemplate(name: CiteTemplate, v: { inline: string; claim?: string; excerpt?: string; stat?: string; term?: string }): string {
  return CITE_TEMPLATES[name]
    .replaceAll('{inline}', v.inline).replaceAll('{claim}', v.claim || '')
    .replaceAll('{excerpt}', v.excerpt || '').replaceAll('{stat}', v.stat || '').replaceAll('{term}', v.term || v.claim || '')
}
export function insertCitationText(f: Fact, style: CiteStyle = 'apa', template: CiteTemplate | '' = ''): string {
  const inline = formatInline(f, style)
  if (!template) return ` ${inline}`
  return ` ${applyTemplate(template, { inline, claim: f.fact, excerpt: f.excerpt, term: f.fact })}`
}
