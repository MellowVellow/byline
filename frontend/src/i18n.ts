// Minimal locale stub — UI stays English in v1, AI output follows context language.
// Route every new user-facing string via `t()` so full chrome translation later
// only needs dictionary entries + a locale switch, no call-site hunt.
const en = {
  contextLanguage: 'Context language',
  grammarUnavailableId:
    'Grammar checks are English-only for now — skipped for Bahasa Indonesia. Reader review still runs.',
} as const

const id: typeof en = {
  contextLanguage: 'Context language',
  grammarUnavailableId:
    'Grammar checks are English-only for now — skipped for Bahasa Indonesia. Reader review still runs.',
}

export type I18nKey = keyof typeof en

/** v1: always English chrome. `locale` param reserved for future full-i18n switch. */
export function t(key: I18nKey, _locale = 'en'): string {
  return en[key]
}
