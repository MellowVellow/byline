import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface BylineDB extends DBSchema {
  docs: { key: string; value: string }
  sourceTexts: { key: string; value: string }
}

let _dbp: Promise<IDBPDatabase<BylineDB>> | null = null
function _db(): Promise<IDBPDatabase<BylineDB>> {
  const existing = _dbp
  if (existing) return existing
  const p = openDB<BylineDB>('byline', 2, {
    upgrade(d, oldV) {
      if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs')
      if (oldV < 2 && !d.objectStoreNames.contains('sourceTexts')) d.createObjectStore('sourceTexts')
    },
  })
  _dbp = p
  p.catch(() => { if (_dbp === p) _dbp = null })
  return p
}

export async function idbSetDoc(html: string): Promise<void> {
  try { await (await _db()).put('docs', html, 'doc.html') } catch { /* private mode etc. */ }
}

export async function idbGetDoc(): Promise<string | null> {
  try { return (await (await _db()).get('docs', 'doc.html')) ?? null } catch { return null }
}

const TEXTS_FALLBACK_KEY = 'byline.library.texts.v1'

/** Full source texts: IndexedDB first, localStorage fallback (oldest-evicted). */
export async function idbSetSourceText(id: string, text: string): Promise<void> {
  try {
    await (await _db()).put('sourceTexts', text, id)
    return
  } catch { /* fall through to localStorage */ }
  try {
    const raw = localStorage.getItem(TEXTS_FALLBACK_KEY)
    const all: Record<string, string> = raw ? JSON.parse(raw) : {}
    all[id] = text
    // Evict oldest entries until it fits (quota-safe).
    for (let guard = 0; guard < 20; guard++) {
      try {
        localStorage.setItem(TEXTS_FALLBACK_KEY, JSON.stringify(all))
        return
      } catch {
        const first = Object.keys(all)[0]
        if (first === undefined) return
        delete all[first]
      }
    }
  } catch { /* ignore */ }
}

export async function idbGetSourceText(id: string): Promise<string | null> {
  try {
    const v = await (await _db()).get('sourceTexts', id)
    if (v != null) return v
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(TEXTS_FALLBACK_KEY)
    if (raw) return (JSON.parse(raw) as Record<string, string>)[id] ?? null
  } catch { /* ignore */ }
  return null
}

export async function idbGetAllSourceTextIds(): Promise<string[]> {
  try {
    return await (await _db()).getAllKeys('sourceTexts')
  } catch {
    try {
      const raw = localStorage.getItem(TEXTS_FALLBACK_KEY)
      return raw ? Object.keys(JSON.parse(raw)) : []
    } catch { return [] }
  }
}
