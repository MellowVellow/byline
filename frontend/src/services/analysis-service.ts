import type { Editor } from '@tiptap/react'
import type { Finding, Persona, FindingStatus, Suggestion } from '../domain/finding'
import { resolveAnchor } from '../editor/anchoring'

export class AnalysisService {
  private findings: Finding[] = []
  private listeners: Array<(findings: Finding[]) => void> = []

  constructor(initial: Finding[] = []) {
    this.findings = initial
  }

  getFindings(): Finding[] {
    return [...this.findings]
  }

  setFindings(newFindings: Finding[]) {
    this.findings = newFindings
    this.notify()
  }

  addFindings(incoming: Finding[]) {
    const existingMap = new Map(this.findings.map(f => [f.id, f]))
    for (const f of incoming) {
      existingMap.set(f.id, f)
    }
    this.findings = Array.from(existingMap.values())
    this.notify()
  }

  replacePersona(persona: Persona, incoming: Finding[]) {
    const keep = this.findings.filter(f => f.persona !== persona)
    const oldStatus = new Map(
      this.findings
        .filter(f => f.persona === persona && f.status !== 'open' && f.status !== 'stale')
        .map(f => [f.anchor.quotedText, f.status] as const)
    )
    const freshIds = new Set<string>()
    const fresh = incoming.filter(f => {
      if (freshIds.has(f.id)) return false
      freshIds.add(f.id)
      return true
    }).map(f => {
      const st = oldStatus.get(f.anchor.quotedText)
      return st ? { ...f, status: st } : f
    })
    this.findings = [...keep, ...fresh]
    this.notify()
  }

  updateStatus(id: string, status: FindingStatus) {
    // Resolved findings are deleted outright; stale stays greyed out.
    if (status === 'resolved') {
      this.findings = this.findings.filter(f => f.id !== id)
    } else {
      this.findings = this.findings.map(f => (f.id === id ? { ...f, status } : f))
    }
    this.notify()
  }

  /** Delete all resolved findings (they are removed, not listed). */
  purgeResolved() {
    const n = this.findings.length
    this.findings = this.findings.filter(f => f.status !== 'resolved')
    if (this.findings.length !== n) this.notify()
  }

  updateSuggestions(id: string, suggestions: Suggestion[]) {
    this.findings = this.findings.map(f => (f.id === id ? { ...f, suggestions } : f))
    this.notify()
  }

  filterFindings(opts: {
    persona?: Persona | 'all'
    status?: FindingStatus | 'active' | 'all'
    search?: string
  }): Finding[] {
    const { persona = 'all', status = 'active', search = '' } = opts
    const q = search.trim().toLowerCase()

    return this.findings.filter(f => {
      // Persona filter
      if (persona !== 'all' && f.persona !== persona) return false

      // Status filter
      if (status === 'active') {
        if (f.status === 'resolved' || f.status === 'dismissed') return false
      } else if (status !== 'all' && f.status !== status) {
        return false
      }

      // Search query
      if (q) {
        const inQuote = f.anchor.quotedText.toLowerCase().includes(q)
        const inExp = f.explanation.toLowerCase().includes(q)
        const inKind = f.kind.toLowerCase().includes(q)
        if (!inQuote && !inExp && !inKind) return false
      }

      return true
    })
  }

  /**
   * Evaluates text anchors against current editor content.
   * Marks unresolvable findings as 'stale' without corrupting or deleting them.
   */
  validateAnchors(editor: Editor) {
    let changed = false
    const next = this.findings.map(f => {
      if (f.status === 'resolved' || f.status === 'dismissed') return f
      const resolved = resolveAnchor(editor, f.anchor)
      if (!resolved && f.status !== 'stale') {
        changed = true
        return { ...f, status: 'stale' as FindingStatus }
      }
      if (resolved && f.status === 'stale') {
        changed = true
        return { ...f, status: 'open' as FindingStatus }
      }
      return f
    })

    if (changed) {
      this.findings = next
      this.notify()
    }
  }

  subscribe(fn: (findings: Finding[]) => void): () => void {
    this.listeners.push(fn)
    fn(this.getFindings())
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn)
    }
  }

  private notify() {
    for (const l of this.listeners) {
      l(this.getFindings())
    }
  }
}

export const globalAnalysisService = new AnalysisService()
