import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface BylineDB extends DBSchema {
  docs: { key: string; value: string }
}

let _dbp: Promise<IDBPDatabase<BylineDB>> | null = null
function _db(): Promise<IDBPDatabase<BylineDB>> {
  const existing = _dbp
  if (existing) return existing
  const p = openDB<BylineDB>('byline', 1, {
    upgrade(d) { d.createObjectStore('docs') },
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
