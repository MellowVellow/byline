/** Mock library entries (explore history + saved sources), persisted to localStorage. */
export interface LibraryEntry {
  id: string
  title: string
  kind: 'explore' | 'source' | 'idea'
  detail?: string
  createdAt: number
  /** Saved research contents (present for rows saved from Explore). */
  url?: string
  claim?: string
  excerpt?: string
  why?: string
}

const KEY = 'byline.library.entries'

export const DEFAULT_LIBRARY: LibraryEntry[] = [
  { id: 'lib-1', title: 'Does AI reduce creativity?', kind: 'explore', detail: '12 findings · 4 supported', createdAt: Date.now() - 86400000 },
  { id: 'lib-2', title: 'Doshi & Hauser (2024) — Science Advances', kind: 'source', detail: 'Peer-reviewed · primary', createdAt: Date.now() - 82000000 },
  { id: 'lib-3', title: 'Cognitive debt — define on first use', kind: 'idea', detail: 'Terminology', createdAt: Date.now() - 40000000 },
]

export function loadLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_LIBRARY
}

export function saveLibrary(entries: LibraryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {}
}

/** Explore conversation: one question plus its own summary + table snapshot. */
export interface ExploreConversation {
  id: string
  query: string
  createdAt: number
}

const CONV_KEY = 'byline.explore.conversations'

export function loadConversations(): ExploreConversation[] {
  try {
    const raw = localStorage.getItem(CONV_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export function saveConversations(convs: ExploreConversation[]) {
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(convs.slice(0, 30)))
  } catch {}
}
