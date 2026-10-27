/** Append Google-style text fragment so source opens scrolled+highlighted: #:~:text=... */
export function textFragmentUrl(url: string, text: string): string {
  if (!url || !text) return url
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return url
  // use first phrase (<=10 words) — long fragments often fail exact match
  const phrase = clean.split(' ').slice(0, 10).join(' ').replace(/[.\s]+$/, '')
  if (!phrase) return url
  const base = url.split('#')[0]
  return `${base}#:~:text=${encodeURIComponent(phrase)}`
}
