import { WorkerLinter, LocalLinter, Dialect, type Linter } from 'harper.js'
import { binary } from 'harper.js/binary'
import type { Finding } from '../domain/finding'

const DIALECT_MAP: Record<string, Dialect> = {
  'en-US': Dialect.American,
  'en-GB': Dialect.British,
  'en-CA': Dialect.Canadian,
  'en-AU': Dialect.Australian,
  'en-IN': Dialect.Indian,
}

export class HarperService {
  private linter: Linter | null = null
  private currentDialect: Dialect = Dialect.American
  private initialized = false
  private initPromise: Promise<void> | null = null

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

    this.initPromise = (async () => {
      this.currentDialect = this.getDialect(languageCode)

      try {
        // Use WorkerLinter in browser contexts if Worker is supported
        if (typeof Worker !== 'undefined') {
          this.linter = new WorkerLinter({
            binary,
            dialect: this.currentDialect,
          })
        } else {
          this.linter = new LocalLinter({
            binary,
            dialect: this.currentDialect,
          })
        }
        await this.linter.setup()

        // Load custom user dictionary from localStorage
        await this.loadPersistedDictionary()
        this.initialized = true
      } catch (err) {
        // Fallback to LocalLinter if Worker instantiation fails
        try {
          this.linter = new LocalLinter({
            binary,
            dialect: this.currentDialect,
          })
          await this.linter.setup()
          await this.loadPersistedDictionary()
          this.initialized = true
        } catch (innerErr) {
          console.warn('[HarperService] Failed to initialize Harper linter:', innerErr)
          throw innerErr
        }
      } finally {
        this.initPromise = null
      }
    })()

    return this.initPromise
  }

  async setLanguage(languageCode: string): Promise<void> {
    const dialect = this.getDialect(languageCode)
    if (this.linter && this.currentDialect !== dialect) {
      this.currentDialect = dialect
      await this.linter.setDialect(dialect)
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
      await this.initialize(languageCode)
    } else {
      await this.setLanguage(languageCode)
    }

    if (!this.linter) {
      return { findings: [] }
    }

    try {
      const organized = await this.linter.organizedLints(text)
      const findings: Finding[] = []
      let counter = 0

      for (const [ruleId, lints] of Object.entries(organized)) {
        for (const lint of lints) {
          counter++
          const span = lint.span()
          const problemText = lint.get_problem_text() || text.slice(span.start, span.end)
          const category = lint.lint_kind_pretty() || lint.lint_kind() || 'Spelling'
          const message = lint.message() || `Language issue (${category})`

          const suggestions = (lint.suggestions?.() || []).slice(0, 3).map((s: any, idx: number) => ({
            id: `harper-sug-${counter}-${idx}`,
            text: typeof s.get_replacement_text === 'function' ? s.get_replacement_text() : (s.text || String(s)),
            rationale: category,
          }))

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
