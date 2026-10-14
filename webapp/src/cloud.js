// Cloud sync through Supabase: email sign-in, one row per site, full reports as JSON, rendered
// images in a private bucket. Configured at build time (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// or at run time from the Cloud sync panel (kept in this browser's localStorage).

import { dehydrate, rehydrate, siteId } from './images.js'

export const CLOUD_CONFIG_STORAGE = 'rea-webapp:cloud'
export const BUCKET = 'rea-renders'

let clientPromise = null
let clientKey = ''

export function readCloudConfig() {
  let stored = null
  try { stored = JSON.parse(localStorage.getItem(CLOUD_CONFIG_STORAGE) || 'null') } catch { /* ignore */ }
  const url = (stored?.url || import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const anonKey = (stored?.anonKey || import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim()
  return { url, anonKey, source: stored?.url ? 'browser' : url ? 'build' : 'none', configured: Boolean(url && anonKey) }
}

export function writeCloudConfig({ url, anonKey }) {
  try {
    if (url && anonKey) localStorage.setItem(CLOUD_CONFIG_STORAGE, JSON.stringify({ url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() }))
    else localStorage.removeItem(CLOUD_CONFIG_STORAGE)
  } catch { /* storage blocked */ }
  clientPromise = null
}

/** Lazily loads supabase-js so the library stays out of the initial bundle for everyone else. */
export async function cloudClient() {
  const cfg = readCloudConfig()
  if (!cfg.configured) return null
  const key = `${cfg.url}|${cfg.anonKey}`
  if (!clientPromise || clientKey !== key) {
    clientKey = key
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }))
  }
  return clientPromise
}

export async function cloudSession() {
  const client = await cloudClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data?.session || null
}

export async function signInWithEmail(email) {
  const client = await cloudClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: true } })
  if (error) throw new Error(error.message)
  return redirectTo
}

export async function signOut() {
  const client = await cloudClient()
  if (client) await client.auth.signOut()
}

/** Subscribes to auth changes; returns an unsubscribe function. */
export async function onAuthChange(cb) {
  const client = await cloudClient()
  if (!client) return () => {}
  const { data } = client.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

/** Proxy descriptor for Firecrawl calls through the edge function (signed-in users only). */
export async function cloudProxy() {
  const client = await cloudClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return null
  const cfg = readCloudConfig()
  return { url: `${cfg.url}/functions/v1/firecrawl-proxy`, headers: { authorization: `Bearer ${token}`, apikey: cfg.anonKey } }
}

/** Checks whether the proxy function is deployed (OPTIONS preflight answers 204). */
export async function proxyAvailable() {
  const cfg = readCloudConfig()
  if (!cfg.configured) return false
  try { const r = await fetch(`${cfg.url}/functions/v1/firecrawl-proxy`, { method: 'OPTIONS' }); return r.status === 204 } catch { return false }
}

function must(resp) { if (resp.error) throw new Error(resp.error.message || String(resp.error)); return resp.data }

async function signedUrls(client, paths) {
  const map = new Map()
  if (!paths.length) return map
  const { data, error } = await client.storage.from(BUCKET).createSignedUrls(paths, 60 * 60)
  if (error) return map
  for (const row of data || []) if (row.signedUrl && !row.error) map.set(row.path, row.signedUrl)
  return map
}

/** Uploads renders and upserts the site + report rows. Returns the stored entry. */
export async function pushSite(report, entry) {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) throw new Error('Not signed in to cloud sync.')
  const uid = session.user.id
  const id = siteId(entry.url)
  const prefix = `${uid}/${id}`
  const { report: stored, blobs } = dehydrate(report, prefix)
  for (const b of blobs) must(await client.storage.from(BUCKET).upload(b.path, b.blob, { upsert: true, contentType: b.type, cacheControl: '3600' }))
  const cloudEntry = { ...entry, thumb: null, icon: entry.icon && !entry.icon.startsWith('data:') ? entry.icon : null, thumbPath: stored.visuals?.screenshot?.storagePath || stored.visuals?.ogImage?.storagePath || null, iconPath: stored.visuals?.icon?.storagePath || null, fullPagePath: stored.visuals?.fullPage?.storagePath || null }
  const site = must(await client.from('rea_sites').upsert({ user_id: uid, url: entry.url, host: entry.host, title: entry.title, site_type: entry.siteType, entry: cloudEntry, report_version: report.reportVersion, analyzed_at: report.generatedAt }, { onConflict: 'user_id,url' }).select('id').single())
  const json = JSON.stringify(stored)
  must(await client.from('rea_reports').upsert({ site_id: site.id, user_id: uid, report: stored, bytes: json.length }, { onConflict: 'site_id' }))
  return { ...cloudEntry, cloudId: site.id, synced: true }
}

/** All entries for the signed-in user, newest first, with signed thumbnail URLs. */
export async function pullEntries() {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return []
  const rows = must(await client.from('rea_sites').select('id, url, entry, updated_at').order('updated_at', { ascending: false }).limit(500))
  const paths = rows.flatMap((r) => [r.entry?.thumbPath, r.entry?.iconPath].filter(Boolean))
  const urls = await signedUrls(client, paths)
  return rows.map((r) => ({ ...r.entry, url: r.url, cloudId: r.id, synced: true, thumb: urls.get(r.entry?.thumbPath) || r.entry?.thumb || null, icon: urls.get(r.entry?.iconPath) || r.entry?.icon || null }))
}

export async function pullReport(url) {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return null
  const site = must(await client.from('rea_sites').select('id').eq('url', url).maybeSingle())
  if (!site) return null
  const row = must(await client.from('rea_reports').select('report').eq('site_id', site.id).maybeSingle())
  if (!row?.report) return null
  return rehydrate(row.report, (paths) => signedUrls(client, paths))
}

export async function deleteSite(url) {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return
  const prefix = `${session.user.id}/${siteId(url)}`
  const { data: files } = await client.storage.from(BUCKET).list(prefix)
  if (files?.length) await client.storage.from(BUCKET).remove(files.map((f) => `${prefix}/${f.name}`))
  must(await client.from('rea_sites').delete().eq('url', url))
}

export async function cloudStats() {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return null
  const { count } = await client.from('rea_sites').select('id', { count: 'exact', head: true })
  return { sites: count ?? 0, email: session.user.email || null, userId: session.user.id }
}

export async function pullPortfolio() {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return null
  const row = must(await client.from('rea_portfolio').select('items, updated_at').maybeSingle())
  return row ? { items: row.items || [], updatedAt: row.updated_at } : null
}

export async function pushPortfolio(portfolio) {
  const client = await cloudClient()
  const session = await cloudSession()
  if (!client || !session) return
  must(await client.from('rea_portfolio').upsert({ user_id: session.user.id, items: portfolio.items || [] }, { onConflict: 'user_id' }))
}

/** Proxy descriptor for the offer-agent edge function (null when not deployed or signed out). */
export async function agentProxy() {
  const p = await cloudProxy()
  if (!p) return null
  const url = p.url.replace(/firecrawl-proxy$/, 'offer-agent')
  try { const r = await fetch(url, { method: 'OPTIONS' }); if (r.status !== 204) return null } catch { return null }
  return { url, headers: p.headers }
}
