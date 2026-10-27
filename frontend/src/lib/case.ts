/** Auto rule mirror of backend: sentence start -> capitalize first letter. */
export function sentenceCase(before: string, suggestion: string): string {
  const b = (before || '').trimEnd()
  if (b && !/[.!?]["'”’)\]]*\s*$/.test(b)) return suggestion
  const i = suggestion.search(/[A-Za-z]/)
  if (i < 0) return suggestion
  return suggestion.slice(0, i) + suggestion[i].toUpperCase() + suggestion.slice(i + 1)
}
