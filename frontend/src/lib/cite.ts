import type { CiteType, LibraryCard, LibrarySource } from '../domain/library'
import { authorShort, isUnknownAuthor, sourceYear, titleShort } from '../domain/library'

/** Deterministic APA inline — mirrors backend citations.format_apa_inline. */
export function apaInline(source: LibrarySource, ctype: CiteType, page = 0): string {
  const first = authorShort(source)
  const year = sourceYear(source)
  if (ctype === 'narr') return `${first} (${year})`
  const loc = page && (ctype === 'direct' || ctype === 'intext' || (ctype as string) === 'paren') ? `, p. ${page}` : ''
  return `(${first}, ${year}${loc})`
}

/** Deterministic MLA inline — mirrors backend style. */
export function mlaInline(source: LibrarySource, ctype: CiteType, page = 0): string {
  const first = authorShort(source)
  const title = (source.title || 'Untitled').trim()
  const who = isUnknownAuthor(source.author) ? `"${titleShort(title)}"` : first
  if (ctype === 'narr') return page ? `${who} (${page})` : who
  return page ? `(${who} ${page})` : `(${who})`
}

/** Deterministic MLA reference line (Works Cited). */
export function mlaReference(source: LibrarySource): string {
  const title = (source.title || 'Untitled').trim()
  const url = (source.URL || '').trim()
  const year = sourceYear(source)
  const container = (source['container-title'] || '').trim()
  if (isUnknownAuthor(source.author)) {
    const base = container ? `"${title}." ${container}, ${year}.` : `"${title}." ${year}.`
    return url ? `${base} ${url}.` : base
  }
  const au = apaAuthors(source) // reuse author list formatting as best effort
  const base = container
    ? `${au}. "${title}." ${container}, ${year}.`
    : `${au}. "${title}." ${year}.`
  return url ? `${base} ${url}.` : base
}

/** Deterministic Chicago inline (author-date). */
export function chicagoInline(source: LibrarySource, ctype: CiteType, page = 0): string {
  const first = authorShort(source)
  const title = (source.title || 'Untitled').trim()
  const who = isUnknownAuthor(source.author) ? `"${titleShort(title)}"` : first
  const year = sourceYear(source)
  if (ctype === 'narr') return page ? `${who} (${year}, ${page})` : `${who} (${year})`
  const loc = page ? `, ${page}` : ''
  return `(${who} ${year}${loc})`
}

/** Deterministic Chicago reference (bibliography). */
export function chicagoReference(source: LibrarySource): string {
  const title = (source.title || 'Untitled').trim()
  const url = (source.URL || '').trim()
  const year = sourceYear(source)
  const container = (source['container-title'] || '').trim()
  const au = isUnknownAuthor(source.author) ? title : apaAuthors(source)
  const base = container
    ? `${au}. "${title}." ${container}. ${year}.`
    : `${au}. "${title}." ${year}.`
  return url ? `${base} ${url}.` : base
}

function apaAuthors(source: LibrarySource): string {
  const list = (source.author || []).map(a =>
    a.literal ? a.literal : a.given ? `${a.family}, ${a.given[0]}.` : a.family || '',
  ).filter(Boolean)
  if (list.length > 1) return list.slice(0, -1).join(', ') + ', & ' + list[list.length - 1]
  return list[0] || authorShort(source)
}

function retrievedPrefix(source: LibrarySource): string {
  try {
    const dp = source.accessed?.['date-parts']?.[0]
    if (dp && dp.length >= 3) {
      return `Retrieved ${new Date(Date.UTC(dp[0], dp[1] - 1, dp[2])).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}, from `
    }
  } catch { /* ignore */ }
  return ''
}

/** Deterministic APA7 reference line — mirrors backend. */
export function apaReference(source: LibrarySource): string {
  const year = sourceYear(source)
  const title = (source.title || 'Untitled').trim()
  const url = (source.URL || '').trim()
  const doi = (source.DOI || '').trim()
  const container = (source['container-title'] || '').trim()
  const link = doi ? `https://doi.org/${doi}` : url
  if (isUnknownAuthor(source.author)) {
    // APA: move the full title to the author position, then the date.
    const t = title.replace(/\.+$/, '')
    if (source.type === 'article-journal') {
      const base = container ? `${t}. (${year}). ${container}.` : `${t}. (${year}).`
      return link && !base.includes(link) ? `${base} ${link}` : base
    }
    if (source.type === 'webpage') {
      const base = container ? `${t}. (${year}). ${container}.` : `${t}. (${year}).`
      return link ? `${base} ${retrievedPrefix(source)}${link}`.trim() : base
    }
    const base = `${t}. (${year}). [Report].`
    return link ? `${base} ${link}` : base
  }
  const au = apaAuthors(source)
  const acc = retrievedPrefix(source)
  if (source.type === 'article-journal') {
    const base = container ? `${au} (${year}). ${title}. ${container}.` : `${au} (${year}). ${title}.`
    return link && !base.includes(link) ? `${base} ${link}` : base
  }
  if (source.type === 'webpage') {
    const base = container ? `${au} (${year}). ${title}. ${container}.` : `${au} (${year}). ${title}.`
    return link ? `${base} ${acc}${link}`.trim() : base
  }
  const base = `${au} (${year}). ${title} [Report].`
  return link ? `${base} ${link}` : base
}


function inlineForStyle(style: string, source: LibrarySource, ctype: CiteType, page = 0): string {
  const st = (style || 'apa').toLowerCase()
  if (st === 'mla') return mlaInline(source, ctype, page)
  if (st === 'chicago') return chicagoInline(source, ctype, page)
  return apaInline(source, ctype, page)
}

function referenceForStyle(style: string, source: LibrarySource): string {
  const st = (style || 'apa').toLowerCase()
  if (st === 'mla') return mlaReference(source)
  if (st === 'chicago') return chicagoReference(source)
  return apaReference(source)
}

export { referenceForStyle, inlineForStyle }

/** Instant cite (no LLM): bare mark, except direct/para full form. */
export function quickCite(card: LibraryCard, source: LibrarySource, ctype: CiteType, style: string = 'apa'): string {
  const page = card.page || 0
  if (ctype === 'narr') return inlineForStyle(style, source, 'narr', page)
  if (ctype === 'direct' && card.passage) {
    return `\u201c${card.passage.trim().replace(/\.$/, '')}\u201d ${inlineForStyle(style, source, 'direct', page)}`
  }
  if (ctype === 'para') {
    return `${card.finding.trim().replace(/\.$/, '')} ${inlineForStyle(style, source, 'para', page)}`
  }
  return inlineForStyle(style, source, ctype, page)
}

/** Deterministic fallback sentence when LLM grid is unavailable. */
export function fallbackSentence(card: LibraryCard, source: LibrarySource, ctype: CiteType, style: string = 'apa'): string {
  const h = (card.finding || '').trim()
  const m = inlineForStyle(style, source, ctype, card.page || 0)
  const first = authorShort(source)
  const year = sourceYear(source)
  const lower = h ? h[0].toLowerCase() + h.slice(1).replace(/\.$/, '') : ''
  if (ctype === 'narr') return `${first} (${year}) reports that ${lower}.`
  if (ctype === 'direct' && card.passage) return `\u201c${card.passage.trim().replace(/\.$/, '')}\u201d ${m}.`
  if (ctype === 'para') return `In other words, ${lower} ${m}.`
  return `${h.replace(/\.$/, '')} ${m}.`
}
