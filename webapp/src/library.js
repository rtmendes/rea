// The library: local IndexedDB first (instant, offline), mirrored to a remote store when one is
// available. Remote providers share one shape: { name, list(), get(url), put(report, entry), remove(url) }.
// Static/API modes use Supabase cloud sync; connector mode uses the artifact database.

import { entryFromReport, getMeta, listEntries, loadReport, removeEntry, saveReport, setMeta } from './store.js'
import { pullEntries, pullReport, pushSite, deleteSite, cloudSession, readCloudConfig, pullPortfolio, pushPortfolio } from './cloud.js'
import { dbGetPortfolio, dbList, dbLoad, dbRemove, dbSave, dbSetPortfolio } from './artifactdb.js'

export function cloudProvider() {
  return {
    name: 'Supabase cloud',
    async ready() { return readCloudConfig().configured && Boolean(await cloudSession()) },
    list: pullEntries,
    get: pullReport,
    put: pushSite,
    remove: deleteSite,
    getPortfolio: pullPortfolio,
    putPortfolio: pushPortfolio,
  }
}

export function artifactProvider(ctx) {
  return {
    name: 'claude.ai artifact database',
    async ready() { return Boolean(ctx) },
    list: () => dbList(ctx),
    get: (url) => dbLoad(ctx, url),
    put: (report, entry) => dbSave(ctx, report, entry),
    remove: (url) => dbRemove(ctx, url),
    getPortfolio: () => dbGetPortfolio(ctx),
    putPortfolio: (p) => dbSetPortfolio(ctx, p),
  }
}

const EMPTY_PORTFOLIO = { items: [], updatedAt: null }

/** Local portfolio, refreshed from the remote copy when that one is newer. */
export async function loadPortfolio(remote) {
  const local = (await getMeta('portfolio')) || EMPTY_PORTFOLIO
  if (!remote || !(await remote.ready())) return local
  try {
    const r = await remote.getPortfolio()
    if (r && (r.updatedAt || '') > (local.updatedAt || '')) { await setMeta('portfolio', r); return r }
    if (local.items.length && (!r || (local.updatedAt || '') > (r.updatedAt || ''))) await remote.putPortfolio(local).catch(() => {})
  } catch { /* offline */ }
  return local
}

export async function savePortfolio(items, remote) {
  const portfolio = { items, updatedAt: new Date().toISOString() }
  await setMeta('portfolio', portfolio)
  if (remote && (await remote.ready())) { try { await remote.putPortfolio(portfolio) } catch { /* reported via status */ } }
  return portfolio
}

/** Saves locally, then mirrors. Remote failures are reported, never fatal. */
export async function save(report, remote) {
  const entry = await saveReport(report)
  if (!remote || !(await remote.ready())) return { entry, synced: false, error: null }
  try { const stored = await remote.put(report, entry); return { entry: { ...entry, synced: true, cloudId: stored?.cloudId || null }, synced: true, error: null } } catch (e) { return { entry, synced: false, error: `${remote.name}: ${e.message}` } }
}

/** Local entries merged with remote ones (remote-only sites appear with a cloud badge). */
export async function list(remote) {
  const local = await listEntries()
  if (!remote || !(await remote.ready())) return local.map((e) => ({ ...e, where: 'local' }))
  let remoteEntries = []
  try { remoteEntries = await remote.list() } catch { return local.map((e) => ({ ...e, where: 'local' })) }
  const byUrl = new Map()
  for (const r of remoteEntries) byUrl.set(r.url, { ...r, where: 'remote' })
  for (const l of local) {
    const r = byUrl.get(l.url)
    if (!r) { byUrl.set(l.url, { ...l, where: 'local' }); continue }
    // Local copy carries embedded images; remote tells us it is synced. Newer analysis wins.
    byUrl.set(l.url, (l.at || '') >= (r.at || '') ? { ...r, ...l, thumb: l.thumb || r.thumb, icon: l.icon || r.icon, where: 'both', synced: true } : { ...l, ...r, thumb: r.thumb || l.thumb, icon: r.icon || l.icon, where: 'both', synced: true })
  }
  return [...byUrl.values()].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
}

/** Local report, else fetched from the remote store (and cached locally). */
export async function load(url, remote) {
  const local = await loadReport(url)
  if (local) return local
  if (!remote || !(await remote.ready())) return null
  try { const r = await remote.get(url); if (r) await saveReport(r); return r } catch { return null }
}

export async function remove(url, remote) {
  await removeEntry(url)
  if (remote && (await remote.ready())) { try { await remote.remove(url) } catch { /* reported by caller via list() */ } }
}

/** Pushes every local report that the remote does not have yet. */
export async function pushAll(remote, onProgress) {
  if (!remote || !(await remote.ready())) return { pushed: 0, failed: 0 }
  const local = await listEntries()
  const have = new Set((await remote.list().catch(() => [])).map((e) => e.url))
  let pushed = 0, failed = 0
  const todo = local.filter((e) => !have.has(e.url))
  for (const [i, e] of todo.entries()) {
    onProgress?.({ done: i, total: todo.length, current: e.url })
    const report = await loadReport(e.url)
    if (!report) continue
    try { await remote.put(report, entryFromReport(report)); pushed++ } catch { failed++ }
  }
  onProgress?.({ done: todo.length, total: todo.length, current: null })
  return { pushed, failed }
}
