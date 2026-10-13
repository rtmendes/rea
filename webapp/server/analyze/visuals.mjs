// Visual identity: the best icon/logo the page declares, its social preview image and brand colour.

import { fetchAsset } from './fetch.mjs'

const MAX_ICON_BYTES = 200 * 1024
const MAX_PREVIEW_BYTES = 600 * 1024

function sizeOf(sizes) {
  const m = /(\d+)x(\d+)/i.exec(sizes || '')
  return m ? +m[1] : 0
}

/** Ranks declared icons: apple-touch-icon and large PNG/SVG first, then any icon, then /favicon.ico. */
export function selectIcons($, pageUrl) {
  const found = []
  $('link[rel]').each((_, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase()
    const href = $(el).attr('href')
    if (!href) return
    if (!/\b(icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)\b/.test(rel)) return
    let url
    try { url = new URL(href, pageUrl).toString() } catch { return }
    const type = ($(el).attr('type') || '').toLowerCase()
    const size = sizeOf($(el).attr('sizes'))
    let score = 0
    if (rel.includes('apple-touch-icon')) score += 300
    if (type.includes('svg') || /\.svg(\?|$)/i.test(url)) score += 250
    if (type.includes('png') || /\.png(\?|$)/i.test(url)) score += 150
    if (rel.includes('mask-icon')) score -= 100
    score += Math.min(size, 512) / 4
    found.push({ url, rel, type: type || null, size: size || null, score })
  })
  found.sort((a, b) => b.score - a.score)
  const fallback = new URL('/favicon.ico', pageUrl).toString()
  if (!found.some((f) => f.url === fallback)) found.push({ url: fallback, rel: 'fallback', type: null, size: null, score: 0 })
  return found
}

function sniffImageType(buffer, headerType) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg'
  if (buffer.length >= 6 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  if (buffer.length >= 6 && /^GIF8/.test(buffer.subarray(0, 4).toString())) return 'image/gif'
  if (buffer.length >= 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0) return 'image/x-icon'
  const head = buffer.subarray(0, 512).toString('utf8').trim().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml'
  if (/^image\//i.test(headerType || '')) return headerType.split(';')[0].trim()
  return null
}

async function fetchImageDataUrl(url, maxBytes) {
  const res = await fetchAsset(url, { accept: 'image/*,*/*;q=0.5', maxBytes })
  if (!res.ok || !res.body?.length || res.truncated) return { ok: false, url, error: res.error || (res.truncated ? 'too large' : `HTTP ${res.status}`) }
  const type = sniffImageType(res.body, res.headers?.['content-type'])
  if (!type) return { ok: false, url, error: `not an image (${res.headers?.['content-type'] || 'unknown type'})` }
  return { ok: true, url, type, bytes: res.body.length, dataUrl: `data:${type};base64,${res.body.toString('base64')}` }
}

/** Returns { icon, ogImage, candidates } with embedded data URLs where fetchable. */
export async function collectVisuals({ $, pageUrl, ogImageUrl }) {
  const candidates = selectIcons($, pageUrl)
  let icon = null
  const attempts = []
  for (const c of candidates.slice(0, 4)) {
    const r = await fetchImageDataUrl(c.url, MAX_ICON_BYTES)
    attempts.push({ url: c.url, rel: c.rel, ok: r.ok, error: r.error || null })
    if (r.ok) { icon = { ...r, rel: c.rel, declaredSize: c.size }; break }
  }
  let ogImage = null
  if (ogImageUrl) {
    try {
      const r = await fetchImageDataUrl(new URL(ogImageUrl, pageUrl).toString(), MAX_PREVIEW_BYTES)
      ogImage = r.ok ? r : { ok: false, url: ogImageUrl, error: r.error }
    } catch { ogImage = { ok: false, url: ogImageUrl, error: 'invalid URL' } }
  }
  return { icon, ogImage, iconAttempts: attempts }
}
