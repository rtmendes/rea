// Connector mode persistence: the claude.ai artifact database (`db` capability). Each viewer's
// library lives under their private `data/users/<id>/library` subtree, so sharing the artifact
// link never exposes anyone's research. Reports larger than one document are split into parts.

import { siteId } from './images.js'

const PART_CHARS = 180_000 // documents are capped at 256 KiB; keep JSON parts well under it

export async function detectDb() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')])
    if (!db || !user) return null
    const uid = await user.id()
    if (!uid) return null
    return { db, user, uid, root: db.doc(`data/users/${uid}/library`) }
  } catch { return null }
}

const sites = (ctx) => ctx.root.collection('sites')

export async function dbSave(ctx, report, entry) {
  const id = siteId(entry.url)
  const json = JSON.stringify(report)
  const parts = []
  for (let i = 0; i < json.length; i += PART_CHARS) parts.push(json.slice(i, i + PART_CHARS))
  const doc = sites(ctx).doc(id)
  for (let i = 0; i < parts.length; i++) await doc.collection('parts').doc(String(i)).set({ i, text: parts[i] })
  // Remove stale parts from an earlier, longer version.
  const old = await doc.collection('parts').get()
  for (const p of old.docs) if (Number(p.id) >= parts.length) await doc.collection('parts').doc(p.id).delete()
  await doc.set({ ...entry, thumb: null, icon: entry.icon && !entry.icon.startsWith('data:') ? entry.icon : null, parts: parts.length, bytes: json.length, savedAt: new Date().toISOString() })
  return { ...entry, synced: true }
}

export async function dbList(ctx) {
  const snap = await sites(ctx).orderBy('at', 'desc').limit(500).get()
  return snap.docs.filter((d) => d.exists).map((d) => ({ ...d.data(), synced: true }))
}

export async function dbLoad(ctx, url) {
  const doc = sites(ctx).doc(siteId(url))
  const head = await doc.get()
  if (!head.exists) return null
  const n = head.data().parts || 0
  const texts = []
  for (let i = 0; i < n; i++) { const p = await doc.collection('parts').doc(String(i)).get(); if (!p.exists) return null; texts.push(p.data().text) }
  try { return JSON.parse(texts.join('')) } catch { return null }
}

export async function dbRemove(ctx, url) {
  const doc = sites(ctx).doc(siteId(url))
  const head = await doc.get()
  const n = head.exists ? head.data().parts || 0 : 0
  for (let i = 0; i < n; i++) await doc.collection('parts').doc(String(i)).delete()
  await doc.delete()
}

export async function dbGetPortfolio(ctx) {
  const snap = await ctx.root.get()
  return snap.exists ? { items: snap.data().portfolio || [], updatedAt: snap.data().portfolioUpdatedAt || null } : null
}

export async function dbSetPortfolio(ctx, portfolio) {
  const snap = await ctx.root.get()
  await ctx.root.set({ ...(snap.exists ? snap.data() : {}), portfolio: portfolio.items || [], portfolioUpdatedAt: new Date().toISOString() })
}
