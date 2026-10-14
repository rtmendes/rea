// Visual identity: the best icon/logo the page declares, its social preview image and brand colour.

import { fetchAsset } from './fetch.mjs'
import { selectIcons } from './icons.mjs'

export { selectIcons }

const MAX_ICON_BYTES = 200 * 1024
const MAX_PREVIEW_BYTES = 600 * 1024

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
