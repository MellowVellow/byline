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

/** No seeded rows: the Saved collection starts empty and holds only rows
 *  the user explicitly saves from Explore. */
export const DEFAULT_LIBRARY: LibraryEntry[] = []

/** Ids of the retired static seed rows — purged from old stored libraries. */
const RETIRED_SEED_IDS = new Set(['lib-1', 'lib-2', 'lib-3'])

export function loadLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const live = parsed.filter(e => e && typeof e.id === 'string' && !RETIRED_SEED_IDS.has(e.id))
        if (live.length !== parsed.length) saveLibrary(live)
        return live
      }
    }
  } catch {}
  return []
}

export function saveLibrary(entries: LibraryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {}
}

/** Explore conversation: one question plus its own summary + table snapshot. */
import type { ResearchRow, SourceRecord } from './mockResearch'

export interface ExploreSnapshot {
  rows: ResearchRow[]
  src: Record<string, SourceRecord>
  summary: string | null
  model: string | null
  savedAt: number
}

export interface ExploreConversation {
  id: string
  query: string
  createdAt: number
  /** Live results snapshot — rendered on reopen instead of static sample rows. */
  snapshot?: ExploreSnapshot
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
