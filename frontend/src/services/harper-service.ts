import { WorkerLinter, LocalLinter, Dialect, type Linter, type LintOptions } from 'harper.js'
import { binary } from 'harper.js/binary'
import type { Finding } from '../domain/finding'

const DIALECT_MAP: Record<string, Dialect> = {
  'en-US': Dialect.American,
  'en-GB': Dialect.British,
  'en-CA': Dialect.Canadian,
  'en-AU': Dialect.Australian,
  'en-IN': Dialect.Indian,
}

/**
 * Per harper.js docs (writewithharper.com/docs/harperjs/linting):
 * - Interactive web apps must use WorkerLinter (WASM off the event loop);
 *   LocalLinter is only a fallback (it blocks while compiling the dictionary).
 * - Editor content is plain text, so every lint call passes
 *   `{ language: 'plaintext' }` — the default is markdown, whose parser can
 *   swallow quotes and shift spans in prose.
 */
const LINT_OPTIONS: LintOptions = { language: 'plaintext' }

/** Give WASM compile+init a bounded window; never hang the lint pipeline. */
const SETUP_TIMEOUT_MS = 25000
/** After a total init failure, fail fast instead of re-spawning workers per keystroke. */
const RETRY_COOLDOWN_MS = 60000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([p, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}

export class HarperService {
  private linter: Linter | null = null
  private currentDialect: Dialect = Dialect.American
  private initialized = false
  private initPromise: Promise<void> | null = null
  private failedAt = 0
  private lastError: string | null = null

  /** Diagnostic snapshot for logging / UI. Never throws. */
  status(): { ready: boolean; error: string | null } {
    return { ready: this.initialized && !!this.linter, error: this.lastError }
  }

  /**
   * Check whether Harper supports the requested language.
   * Harper's core engine supports English dialects (US, UK, CA, AU, IN).
   */
  isLanguageSupported(languageCode: string): boolean {
    if (!languageCode) return true
    const normalized = languageCode.trim().toLowerCase()
    return normalized.startsWith('en')
  }

  getDialect(languageCode: string): Dialect {
    const key = Object.keys(DIALECT_MAP).find(
      k => k.toLowerCase() === languageCode.toLowerCase()
    )
    return key ? DIALECT_MAP[key] : Dialect.American
  }

  async initialize(languageCode = 'en-US'): Promise<void> {
    if (this.initialized && this.linter) return
    if (this.initPromise) return this.initPromise
    if (this.failedAt > 0 && Date.now() - this.failedAt < RETRY_COOLDOWN_MS) {
      throw new Error(this.lastError || 'Harper unavailable (cooling down after init failure)')
    }

    this.initPromise = (async () => {
      this.currentDialect = this.getDialect(languageCode)
      this.lastError = null

      const attempts: Array<{ name: string; make: () => Linter }> =
        typeof Worker !== 'undefined'
          ? [
              { name: 'WorkerLinter', make: () => new WorkerLinter({ binary, dialect: this.currentDialect }) },
              { name: 'LocalLinter', make: () => new LocalLinter({ binary, dialect: this.currentDialect }) },
            ]
          : [{ name: 'LocalLinter', make: () => new LocalLinter({ binary, dialect: this.currentDialect }) }]

      let lastErr: unknown = null
      for (const a of attempts) {
        let candidate: Linter | null = null
        try {
          candidate = a.make()
          await withTimeout(candidate.setup(), SETUP_TIMEOUT_MS, `Harper ${a.name} setup`)
          this.linter = candidate
          // Load custom user dictionary from localStorage
          await this.loadPersistedDictionary()
          this.initialized = true
          this.failedAt = 0
          console.info(`[HarperService] ready via ${a.name} (dialect ${this.currentDialect})`)
          return
        } catch (err) {
          lastErr = err
          console.warn(`[HarperService] ${a.name} failed, trying fallback:`, err)
          if (candidate) {
            try {
              await withTimeout(candidate.dispose(), 5000, `Harper ${a.name} dispose`)
            } catch { /* best-effort cleanup */ }
          }
          this.linter = null
        }
      }

      this.failedAt = Date.now()
      const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
      this.lastError = `Harper failed to start: ${msg}`
      console.warn('[HarperService] Failed to initialize Harper linter:', lastErr)
      throw new Error(this.lastError)
    })()

    try {
      return await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  async setLanguage(languageCode: string): Promise<void> {
    const dialect = this.getDialect(languageCode)
    if (this.linter && this.currentDialect !== dialect) {
      try {
        this.currentDialect = dialect
        await this.linter.setDialect(dialect)
      } catch (err) {
        // Worker may have died; force a fresh init on next lint.
        console.warn('[HarperService] setDialect failed, will re-init:', err)
        this.initialized = false
        this.linter = null
        throw err
      }
    }
  }

  /**
   * Lint text locally using the Web Worker Harper linter.
   * Returns normalized Byline Finding models.
   */
  async lint(
    text: string,
    languageCode = 'en-US',
    revision = 1
  ): Promise<{
    findings: Finding[]
    unsupportedLanguage?: boolean
    error?: string
  }> {
    if (!this.isLanguageSupported(languageCode)) {
      return {
        findings: [],
        unsupportedLanguage: true,
        error: `Harper language checking is currently available for English dialects (US, UK, CA, AU, IN). "${languageCode}" is unsupported.`,
      }
    }

    if (!text || !text.trim()) {
      return { findings: [] }
    }

    if (!this.initialized || !this.linter) {
      try {
        await this.initialize(languageCode)
      } catch (err: any) {
        return { findings: [], error: err?.message || 'Harper failed to start' }
      }
    } else {
      try {
        await this.setLanguage(languageCode)
      } catch (err: any) {
        return { findings: [], error: err?.message || 'Harper failed to switch dialect' }
      }
    }

    if (!this.linter) {
      return { findings: [] }
    }

    try {
      // Plaintext: editor content is not markdown (docs default would parse
      // quotes/headings as markup and can swallow spans in prose).
      const organized = await this.linter.organizedLints(text, LINT_OPTIONS)
      const findings: Finding[] = []
      let counter = 0

      for (const [ruleId, lints] of Object.entries(organized)) {
        for (const lint of lints) {
          counter++
          const span = lint.span()
          // Guard zero-length / out-of-range spans
          if (span.end <= span.start || span.start < 0 || span.end > text.length) continue
          const problemText = lint.get_problem_text() || text.slice(span.start, span.end)
          if (!problemText || !problemText.trim()) continue
          // Guard single-char slices inside a larger word (Harper mis-slice
          // that previously turned every letter into an i→I candidate)
          if (problemText.length === 1) {
            const prev = span.start > 0 ? text[span.start - 1] : ' '
            const next = span.end < text.length ? text[span.end] : ' '
            const isWordChar = (c: string) => /[A-Za-z0-9_]/.test(c)
            if (isWordChar(prev) || isWordChar(next)) {
              // Allow only standalone "i" / "a" capitalization
              const isStandaloneI = problemText === 'i' && !isWordChar(prev) && !isWordChar(next)
              if (!isStandaloneI) continue
            }
          }
          const category = lint.lint_kind_pretty() || lint.lint_kind() || 'Spelling'
          const message = lint.message() || `Language issue (${category})`

          const suggestions = (lint.suggestions?.() || []).slice(0, 3).map((s: any, idx: number) => ({
            id: `harper-sug-${counter}-${idx}`,
            text: typeof s.get_replacement_text === 'function' ? s.get_replacement_text() : (s.text || String(s)),
            rationale: category,
          }))

          // Grammar findings: silent auto-fix records in Draft, red-underline
          // review cards in Edit (never auto-fixed there).
          findings.push({
            id: `harper-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 6)}`,
            documentId: 'active-doc',
            persona: 'grammar',
            kind: 'language_error',
            category,
            ruleId,
            anchor: {
              quotedText: problemText,
              startOffset: span.start,
              endOffset: span.end,
              documentRevision: revision,
            },
            explanation: message,
            suggestions,
            status: 'open',
            sourceRevision: revision,
            createdAt: Date.now(),
          })
        }
      }

      return { findings }
    } catch (err: any) {
      console.warn('[HarperService] Lint execution failed:', err)
      return { findings: [], error: err?.message || 'Harper linting error' }
    }
  }

  // --- Rule suppression ---
  async ignoreRule(ruleId: string): Promise<void> {
    if (!ruleId || !this.linter) return
    try {
      const config = await this.linter.getLintConfig()
      config[ruleId] = false
      await this.linter.setLintConfig(config)
      localStorage.setItem('byline.harper.ignored_rules', JSON.stringify(
        Object.entries(config).filter(([, v]) => v === false).map(([k]) => k)
      ))
    } catch (err) {
      console.warn('[HarperService] Could not ignore rule:', err)
    }
  }

  // --- Personal User Dictionary Support ---
  async addWord(word: string): Promise<void> {
    const trimmed = word.trim()
    if (!trimmed || !this.linter) return
    try {
      await this.linter.importWords([trimmed])
      const words = await this.getWords()
      localStorage.setItem('byline.harper.user_dictionary', JSON.stringify(words))
    } catch (err) {
      console.warn('[HarperService] Could not add word to dictionary:', err)
    }
  }

  async getWords(): Promise<string[]> {
    if (!this.linter) {
      try {
        return JSON.parse(localStorage.getItem('byline.harper.user_dictionary') || '[]')
      } catch {
        return []
      }
    }
    try {
      return await this.linter.exportWords()
    } catch {
      return []
    }
  }

  async clearWords(): Promise<void> {
    if (this.linter) {
      await this.linter.clearWords()
    }
    localStorage.removeItem('byline.harper.user_dictionary')
  }

  private async loadPersistedDictionary(): Promise<void> {
    if (!this.linter) return
    try {
      const stored = localStorage.getItem('byline.harper.user_dictionary')
      if (stored) {
        const words = JSON.parse(stored)
        if (Array.isArray(words) && words.length > 0) {
          await this.linter.importWords(words)
        }
      }
    } catch {
      // noop
    }
    try {
      const ignored = localStorage.getItem('byline.harper.ignored_rules')
      if (ignored) {
        const rules = JSON.parse(ignored)
        if (Array.isArray(rules) && rules.length > 0) {
          const config = await this.linter.getLintConfig()
          for (const rule of rules) config[rule] = false
          await this.linter.setLintConfig(config)
        }
      }
    } catch {
      // noop
    }
  }

  async dispose(): Promise<void> {
    if (this.linter) {
      await this.linter.dispose()
      this.linter = null
      this.initialized = false
    }
  }
}

export const harperService = new HarperService()
