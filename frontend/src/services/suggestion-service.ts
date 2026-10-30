export interface ActiveSuggestionState<T> {
  options: T[]
  selectedIndex: number
  isVisible: boolean
  source: 'draft' | 'connect' | 'paraphrase' | 'finding'
}

export class SuggestionService {
  /**
   * Helper to check whether an active suggestions overlay should consume hotkeys.
   * Only active when suggestions are visibly awaiting writer choice.
   */
  static handleKeyDown<T>(
    event: KeyboardEvent | React.KeyboardEvent,
    state: ActiveSuggestionState<T>,
    actions: {
      onSelect: (index: number) => void
      onReroll?: () => void
      onDismiss: () => void
    }
  ): boolean {
    if (!state.isVisible || state.options.length === 0) {
      return false
    }

    // Do not interfere if user is holding Ctrl / Cmd (e.g. Cmd+C, Cmd+Z)
    if (event.ctrlKey || event.metaKey) {
      return false
    }

    // 1, 2, 3: accept corresponding alternative
    if (['1', '2', '3'].includes(event.key)) {
      const idx = Number(event.key) - 1
      if (idx < state.options.length) {
        event.preventDefault()
        event.stopPropagation()
        actions.onSelect(idx)
        return true
      }
    }

    // Tab or Enter: accept first or focused option
    if (event.key === 'Tab' || (event.key === 'Enter' && event.shiftKey)) {
      event.preventDefault()
      event.stopPropagation()
      actions.onSelect(state.selectedIndex >= 0 ? state.selectedIndex : 0)
      return true
    }

    // Alt: Reroll current suggestion alternatives
    if (event.altKey && (event.key === 'r' || event.key === 'Alt') && actions.onReroll) {
      event.preventDefault()
      event.stopPropagation()
      actions.onReroll()
      return true
    }

    // Escape: Dismiss
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      actions.onDismiss()
      return true
    }

    return false
  }
}
