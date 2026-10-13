// Browser-side library: full reports and lightweight entries (with thumbnails) in IndexedDB,
// so a long list of analyzed sites opens instantly without re-fetching the target.

const DB_NAME = 'rea-webapp'
const DB_VERSION = 1
const MAX_ENTRIES = 200

let dbPromise = null
const memory = { reports: new Map(), entries: new Map() }

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('reports')) db.createObjectStore('reports', { keyPath: 'url' })
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'url' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
  return dbPromise
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const result = fn(t.objectStore(store))
    t.oncomplete = () => resolve(result?.result ?? result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

/** Lightweight card data derived from a report. */
export function entryFromReport(report) {
  const v = report.visuals || {}
  return {
    url: report.target.finalUrl,
    host: new URL(report.target.finalUrl).hostname,
    title: report.summary.title || null,
    description: report.summary.description || null,
    at: report.generatedAt,
    siteType: report.summary.siteType,
    tech: report.summary.technologyCount,
    thirdParty: report.summary.thirdPartyHosts,
    securityScore: report.summary.securityScore,
    mode: v.mode || report.design?.colors?.mode || 'unknown',
    brandColor: v.brandColor || null,
    backgroundColor: v.backgroundColor || null,
    palette: (report.design?.colors?.palette || []).slice(0, 5).map((p) => p.hex),
    icon: v.icon?.dataUrl || null,
    thumb: v.screenshot?.dataUrl || v.ogImage?.dataUrl || null,
    thumbKind: v.screenshot ? 'screenshot' : v.ogImage?.dataUrl ? 'og:image' : null,
    frameworks: (report.technologies || []).filter((t) => ['framework', 'ssg', 'ecommerce'].includes(t.category)).map((t) => t.name).slice(0, 3),
  }
}

export async function saveReport(report) {
  const entry = entryFromReport(report)
  const db = await open()
  if (!db) { memory.reports.set(entry.url, report); memory.entries.set(entry.url, entry); return entry }
  try {
    await tx(db, 'reports', 'readwrite', (s) => s.put({ url: entry.url, report }))
    await tx(db, 'entries', 'readwrite', (s) => s.put(entry))
    const all = await listEntries()
    if (all.length > MAX_ENTRIES) {
      for (const old of all.slice(MAX_ENTRIES)) await removeEntry(old.url)
    }
  } catch { memory.reports.set(entry.url, report); memory.entries.set(entry.url, entry) }
  return entry
}

export async function loadReport(url) {
  const db = await open()
  if (!db) return memory.reports.get(url) || null
  try { const row = await tx(db, 'reports', 'readonly', (s) => s.get(url)); return row?.report || memory.reports.get(url) || null } catch { return memory.reports.get(url) || null }
}

export async function listEntries() {
  const db = await open()
  let rows = [...memory.entries.values()]
  if (db) { try { rows = rows.concat(await tx(db, 'entries', 'readonly', (s) => s.getAll())) } catch { /* ignore */ } }
  const byUrl = new Map()
  for (const r of rows) byUrl.set(r.url, r)
  return [...byUrl.values()].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
}

export async function removeEntry(url) {
  memory.reports.delete(url); memory.entries.delete(url)
  const db = await open()
  if (!db) return
  try { await tx(db, 'reports', 'readwrite', (s) => s.delete(url)); await tx(db, 'entries', 'readwrite', (s) => s.delete(url)) } catch { /* ignore */ }
}

export async function clearAll() {
  memory.reports.clear(); memory.entries.clear()
  const db = await open()
  if (!db) return
  try { await tx(db, 'reports', 'readwrite', (s) => s.clear()); await tx(db, 'entries', 'readwrite', (s) => s.clear()) } catch { /* ignore */ }
}

/** Splits pasted text into distinct URL-ish tokens (newlines, commas, spaces). */
export function parseUrlList(text) {
  const seen = new Set()
  const out = []
  for (const raw of (text || '').split(/[\s,;]+/)) {
    const t = raw.trim()
    if (!t || !/[a-z0-9]\.[a-z]{2,}/i.test(t)) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}
