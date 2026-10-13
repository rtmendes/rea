// Icon/logo candidate ranking from declared <link rel=icon> tags. Pure; shared by server and browser builds.

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

