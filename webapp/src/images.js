// Helpers for moving rendered images between data URLs, blobs and remote storage paths.

/** Every place in a report that may hold an embedded image data URL. */
export function imageSlots(report) {
  const slots = []
  const v = report.visuals || {}
  for (const k of ['screenshot', 'fullPage', 'mobile', 'ogImage', 'icon']) if (v[k]) slots.push({ key: k, obj: v[k], field: 'dataUrl' })
  for (const [i, c] of (report.pages?.captures || []).entries()) {
    if (c) slots.push({ key: `page-${i}`, obj: c, field: 'dataUrl' })
    if (c?.full) slots.push({ key: `page-${i}-full`, obj: c.full, field: 'dataUrl' })
  }
  return slots
}

export function isDataUrl(s) { return typeof s === 'string' && s.startsWith('data:') }

export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const type = /^data:([^;,]+)/.exec(head)?.[1] || 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export function extensionFor(type) { return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/gif': 'gif' })[type] || 'bin' }

/** Stable, path-safe id for a URL (djb2 → hex). */
export function siteId(url) {
  let h = 5381
  const s = String(url)
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return `${h.toString(16).padStart(8, '0')}${s.length.toString(16)}`
}

/**
 * Replaces embedded images with storage paths. Returns a deep copy of the report plus the blobs
 * to upload: [{path, blob, type}]. The copy keeps `storagePath` where each dataUrl was.
 */
export function dehydrate(report, prefix) {
  const copy = JSON.parse(JSON.stringify(report))
  const blobs = []
  for (const slot of imageSlots(copy)) {
    const val = slot.obj[slot.field]
    if (!isDataUrl(val)) continue
    const blob = dataUrlToBlob(val)
    const path = `${prefix}/${slot.key}.${extensionFor(blob.type)}`
    blobs.push({ path, blob, type: blob.type })
    slot.obj[slot.field] = null
    slot.obj.storagePath = path
  }
  return { report: copy, blobs }
}

/** Puts URLs back where `dehydrate` left storage paths. `resolve(paths) → Map(path → url)`. */
export async function rehydrate(report, resolve) {
  const slots = imageSlots(report).filter((s) => s.obj.storagePath && !isDataUrl(s.obj[s.field]))
  if (!slots.length) return report
  const urls = await resolve(slots.map((s) => s.obj.storagePath))
  for (const s of slots) { const u = urls.get(s.obj.storagePath); if (u) s.obj[s.field] = u }
  return report
}

/** Entry (card) copy with its images swapped for the given resolver as well. */
export async function rehydrateEntry(entry, resolve) {
  const paths = [entry.thumbPath, entry.iconPath, entry.fullPagePath].filter(Boolean)
  if (!paths.length) return entry
  const urls = await resolve(paths)
  return { ...entry, thumb: entry.thumb || urls.get(entry.thumbPath) || null, icon: entry.icon || urls.get(entry.iconPath) || null }
}
