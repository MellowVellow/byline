/** Single access layer for all `byline.*` localStorage keys. Keys frozen for compatibility. */
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

/** Durable async backup of the draft HTML (IndexedDB quota >> localStorage). */
export async function idbSetDoc(html: string): Promise<void> {
  try { await (await _db()).put('docs', html, 'doc.html') } catch { /* private mode etc. */ }
}

/** Recover the draft backup. Null when absent/unavailable. */
export async function idbGetDoc(): Promise<string | null> {
  try { return (await (await _db()).get('docs', 'doc.html')) ?? null } catch { return null }
}
export const keys = {
  doc: (demo: boolean) => demo ? 'byline.doc.demo' : 'byline.doc.app',
  sugg: (demo: boolean) => demo ? 'byline.sugg.demo' : 'byline.sugg.app',
  facts: (demo: boolean) => demo ? 'byline.facts.demo' : 'byline.facts.app',
  readings: (demo: boolean) => demo ? 'byline.readings.demo' : 'byline.readings.app',
  outline: (demo: boolean) => demo ? 'byline.outline.demo' : 'byline.outline.app',
  customRules: 'byline.customRules',
  configActive: 'byline.config.active',
  citeStyle: 'byline.citeStyle',
  researchAuto: 'byline.researchAuto',
  leftOpen: 'byline.leftOpen',
  dict: 'byline.dict.v1',
  metrics: 'byline.metrics.v3',
  dataset: 'byline.dataset',
  vocabApplied: 'byline.vocabApplied',
  preferred: 'byline.preferred',
} as const

export function getJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}
export function setJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* full/blocked */ }
}
export function getStr(key: string, fallback = ''): string {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
export function setStr(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* full/blocked */ }
}
export function removeKey(key: string): void {
  try { localStorage.removeItem(key) } catch { /* blocked */ }
}
