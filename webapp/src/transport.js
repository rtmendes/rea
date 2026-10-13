// How the page obtains a target. Three modes:
//  - API: the app's own server (local Node / Vercel) fetches, analyzes and renders with Chromium.
//  - Static: no server (GitHub Pages); the browser calls Firecrawl's REST API directly, or the
//    Supabase edge proxy when cloud sync is connected (so the Firecrawl key lives server-side).
//  - Connector: inside a claude.ai artifact, the viewer's Firecrawl connector via `mcp`.

import { load } from 'cheerio/slim'
import { analyzeDocument, summarize } from '../server/analyze/core.mjs'
import { buildBlueprint } from '../server/analyze/blueprint.mjs'

export const FIRECRAWL_SERVER = 'Firecrawl'
export const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape'
export const API_KEY_STORAGE = 'rea-webapp:firecrawl-key'

/** Firecrawl Free plan allows 10 scrapes/minute; keyless is capped per IP per day. Space calls. */
export const CAPTURE_SPACING_MS = 6500
export const MAX_KEY_PAGE_CAPTURES = 6

/** Resolves the artifact runtime's mcp namespace, or null outside a claude.ai artifact. */
export async function detectMcp() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try { return await window.claude.use('mcp') } catch { return null }
}

export async function detectSample() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try { return await window.claude.use('sample') } catch { return null }
}

export async function detectDownloads() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try { return await window.claude.use('downloads') } catch { return null }
}

export async function analyzeViaApi(url, options) {
  const res = await fetch('api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, ...options }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

/** One rendered screenshot from the app's own server (API mode). */
export async function captureViaApi(url, { fullPage = false, mobile = false } = {}) {
  const res = await fetch('api/capture', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, fullPage, mobile }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function normalize(url) {
  const t = url.trim()
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`
}

export function describeMcpError(e) {
  const code = e?.code
  const map = {
    server_not_connected: 'Firecrawl is not connected for your account. Add it in claude.ai Settings → Connectors, then try again.',
    needs_reauth: 'Firecrawl needs to be reconnected in claude.ai Settings → Connectors.',
    not_in_manifest: 'This page was not allowed to use Firecrawl. Allow it in the artifact\'s Permissions menu.',
    approval_required: 'The call needs your approval. Click Analyze again and allow Firecrawl when asked.',
    consent_required: 'Firecrawl was not allowed for this page yet. Click Analyze again and allow it when asked.',
    selection_required: 'You have more than one Firecrawl connector. Choose one when claude.ai asks, then retry.',
    server_unavailable: 'Firecrawl did not answer in time. Try again in a moment.',
    tool_error: `Firecrawl reported an error: ${e?.message || 'unknown'}`,
    not_granted: 'Connector access was not granted to this page.',
    capability_disabled: 'Connector calls are not available in this view.',
  }
  return map[code] || e?.message || String(e)
}

function payloadOf(result) {
  let payload = result.payload
  if (typeof payload === 'string') { try { payload = JSON.parse(payload) } catch { throw new Error(`Firecrawl returned text instead of a scrape result: ${payload.slice(0, 200)}`) } }
  if (!payload && Array.isArray(result.content)) { const text = result.content.find((c) => c.type === 'text')?.text; try { payload = JSON.parse(text) } catch { /* ignore */ } }
  return payload || {}
}

function screenshotFormat(fullPage) { return fullPage ? { type: 'screenshot', fullPage: true } : 'screenshot' }

function buildReport({ html, url, target, meta, source, limitations }) {
  const finalUrl = meta.url || meta.sourceURL || target
  return analyzeDocument({
    load,
    html,
    limitations,
    target: {
      input: url, url: target, finalUrl, status: meta.statusCode ?? null, statusText: '', redirects: [], addresses: [], headers: {},
      bytes: new TextEncoder().encode(html).length, truncated: false, timing: { ttfbMs: null, totalMs: null }, contentType: meta.contentType || 'text/html', source,
    },
  }).report
}

function brandingBlock(branding) {
  return branding ? { colorScheme: branding.colorScheme || null, colors: branding.colors || null, fonts: branding.fonts || null, brandName: branding.brandName || null, designSystem: branding.designSystem || null, typography: branding.typography || null, components: branding.components || null, spacing: branding.spacing || null, personality: branding.personality || null } : null
}

function brandColorOf(report, branding) {
  return report.design.colors.roles.accent || branding?.colors?.accent?.toLowerCase() || branding?.colors?.primary?.toLowerCase() || report.design.colors.themeColor || report.design.colors.roles.background || null
}

/**
 * Connector mode: fetch the page through the viewer's Firecrawl connector (rendered DOM, screenshot
 * link, branding) and analyze it in the browser. Images from other hosts cannot be displayed inside
 * an artifact, so screenshots and icons are kept as links.
 */
export async function analyzeViaFirecrawl(url, mcp, options = {}) {
  const started = performance.now()
  const target = normalize(url)
  const formats = options.screenshot === false ? ['rawHtml', 'branding'] : ['rawHtml', options.fullPage ? screenshotFormat(true) : 'screenshot', 'branding']
  const result = await mcp.callTool(FIRECRAWL_SERVER, 'firecrawl_scrape', {
    url: target,
    formats,
    onlyMainContent: false,
    maxAge: 0,
    objective: 'Reverse engineer this page: return its rendered HTML, a screenshot and branding so the stack, design system and structure can be analyzed.',
  })
  const payload = payloadOf(result)
  const html = payload?.rawHtml || payload?.html
  if (!html) throw new Error(`Firecrawl returned no HTML for ${target}`)
  const meta = payload.metadata || {}
  const limitations = [
    'Fetched through the Firecrawl connector: the HTML is the DOM after JavaScript ran, so client-rendered content is included.',
    'Response headers, cookies, redirects, resolved addresses, robots.txt/sitemap and script bodies were not observed in connector mode.',
  ]
  const report = buildReport({ html, url, target, meta, source: 'Firecrawl connector', limitations })
  const branding = payload.branding || null
  const iconCandidate = report.visuals.iconCandidates[0] || null
  const iconUrl = iconCandidate?.url || meta.favicon || null
  const screenshotUrl = typeof payload.screenshot === 'string' && /^https?:\/\//.test(payload.screenshot) ? payload.screenshot : null
  report.visuals = {
    ...report.visuals,
    icon: iconUrl ? { ok: true, url: iconUrl, type: null, bytes: null, dataUrl: null, rel: iconCandidate?.rel || 'favicon', remote: true } : null,
    screenshot: screenshotUrl ? { dataUrl: null, remoteUrl: screenshotUrl, width: null, height: null, capturedAt: new Date().toISOString(), engine: 'Firecrawl', kind: options.fullPage ? 'fullPage' : 'viewport', partial: null } : null,
    screenshotError: screenshotUrl ? 'The screenshot is a time-limited link: pages inside a claude.ai artifact cannot display images from other hosts.' : 'Firecrawl returned no screenshot.',
    fullPage: null,
    mobile: null,
    firecrawlBranding: brandingBlock(branding),
    brandColor: brandColorOf(report, branding),
  }
  if (screenshotUrl) limitations.push('Screenshot and icon are links to the original hosts; the artifact sandbox cannot embed them as thumbnails. Open the same library in the GitHub Pages version for embedded renders.')
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  report.durationMs = Math.round(performance.now() - started)
  return report
}

/** Connector mode: one more rendered page (link only). */
export async function captureViaFirecrawl(url, mcp, { fullPage = false, mobile = false } = {}) {
  const result = await mcp.callTool(FIRECRAWL_SERVER, 'firecrawl_scrape', { url: normalize(url), formats: [screenshotFormat(fullPage)], mobile, onlyMainContent: false, maxAge: 0, objective: 'Render this page to a screenshot for a visual site map.' })
  const payload = payloadOf(result)
  const remoteUrl = typeof payload.screenshot === 'string' && /^https?:\/\//.test(payload.screenshot) ? payload.screenshot : null
  if (!remoteUrl) throw new Error('Firecrawl returned no screenshot.')
  return { url: normalize(url), dataUrl: null, remoteUrl, width: null, height: null, capturedAt: new Date().toISOString(), engine: 'Firecrawl', kind: mobile ? 'mobile' : fullPage ? 'fullPage' : 'viewport', title: payload.metadata?.title || null }
}

// ---------------------------------------------------------------------------------------------
// Static mode: the browser calls Firecrawl's REST API directly (keyless free tier, or the viewer's
// key kept in this browser), or the Supabase edge proxy when cloud sync is connected.

export function readApiKey() { try { return localStorage.getItem(API_KEY_STORAGE) || '' } catch { return '' } }
export function writeApiKey(key) { try { if (key) localStorage.setItem(API_KEY_STORAGE, key.trim()); else localStorage.removeItem(API_KEY_STORAGE) } catch { /* storage blocked */ } }

/** Is the app's own API reachable? (false on static hosts) */
export async function detectApi() {
  try {
    const res = await fetch('api/health', { cache: 'no-store' })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return Boolean(data && data.ok === true)
  } catch { return false }
}

/**
 * Downloads an image once (needs CORS) and produces several JPEG renditions: a cropped card
 * thumbnail and, optionally, a width-fitted full-height render. Returns {} when it cannot.
 */
export async function imageRenditions(url, specs = [{ name: 'thumb', width: 640, height: 400 }]) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return {}
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob)
    const out = {}
    for (const spec of specs) {
      const scale = spec.width / bitmap.width
      const fullHeight = Math.round(bitmap.height * scale)
      const height = spec.height ? Math.min(spec.height, fullHeight) : Math.min(fullHeight, spec.maxHeight || 12000)
      const canvas = document.createElement('canvas')
      canvas.width = spec.width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, bitmap.width, height / scale, 0, 0, spec.width, height)
      out[spec.name] = { dataUrl: canvas.toDataURL('image/jpeg', spec.quality ?? 0.74), width: spec.width, height, sourceWidth: bitmap.width, sourceHeight: bitmap.height, cut: fullHeight > height }
    }
    bitmap.close?.()
    return out
  } catch { return {} }
}

/** Backwards-compatible single thumbnail. */
export async function imageUrlToThumbnail(url, { width = 640, height = 400, quality = 0.74 } = {}) {
  const r = await imageRenditions(url, [{ name: 'thumb', width, height, quality }])
  return r.thumb || null
}

export function describeFirecrawlHttpError(status, body) {
  const msg = typeof body === 'string' ? body : body?.error || body?.message || ''
  if (status === 401 || status === 403) return `Firecrawl rejected the API key (${status}). Check it at https://www.firecrawl.dev/app/api-keys.`
  if (status === 402) return 'Firecrawl says this account is out of credits (402).'
  if (status === 429) return msg.includes('keyless') || !msg ? 'Firecrawl\'s keyless free tier is rate limited right now. Add a free API key (Firecrawl key field) or wait a minute.' : `Firecrawl rate limit reached (429): ${msg.slice(0, 160)}`
  return `Firecrawl error ${status}: ${msg.slice(0, 200) || 'unknown'}`
}

/**
 * Low-level scrape through Firecrawl's REST API, or through a proxy {url, headers} that forwards
 * the same body (the Supabase edge function adds the server-side key).
 */
export async function firecrawlScrape(body, { apiKey = readApiKey(), proxy = null, signal } = {}) {
  const endpoint = proxy?.url || FIRECRAWL_API
  const headers = { 'content-type': 'application/json', ...(proxy ? proxy.headers || {} : apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }
  let res
  try { res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal }) } catch (e) { throw new Error(`Could not reach ${proxy ? 'the cloud proxy' : 'Firecrawl'} from this browser: ${e.message}`) }
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) { const err = new Error(describeFirecrawlHttpError(res.status, json)); err.status = res.status; throw err }
  return json.data || {}
}

/** Fetches the page through Firecrawl's REST API from the browser and analyzes it locally. */
export async function analyzeViaFirecrawlApi(url, options = {}) {
  const started = performance.now()
  const target = normalize(url)
  const apiKey = options.apiKey || readApiKey()
  const wantShot = options.screenshot !== false
  const fullPage = wantShot && options.fullPage !== false
  const formats = wantShot ? ['rawHtml', screenshotFormat(fullPage), 'branding'] : ['rawHtml', 'branding']
  const data = await firecrawlScrape({ url: target, formats, onlyMainContent: false, maxAge: 0 }, { apiKey, proxy: options.proxy, signal: options.signal })
  const html = data.rawHtml || data.html
  if (!html) throw new Error(`Firecrawl returned no HTML for ${target}`)
  const meta = data.metadata || {}
  const via = options.proxy ? 'Firecrawl via cloud proxy' : apiKey ? 'Firecrawl API (your key)' : 'Firecrawl API (keyless free tier)'
  const limitations = [
    `Fetched through ${via} from your browser: the HTML is the DOM after JavaScript ran, so client-rendered content is included.`,
    'Response headers, cookies, redirects, resolved addresses, robots.txt/sitemap and script bodies were not observed in this mode.',
  ]
  const report = buildReport({ html, url, target, meta, source: via, limitations })
  const branding = data.branding || null
  const iconCandidate = report.visuals.iconCandidates[0] || null
  const iconUrl = iconCandidate?.url || (meta.favicon && meta.favicon !== 'data:,' ? meta.favicon : null)
  const screenshotUrl = typeof data.screenshot === 'string' && /^https?:\/\//.test(data.screenshot) ? data.screenshot : null
  const renditions = screenshotUrl ? await imageRenditions(screenshotUrl, fullPage ? [{ name: 'thumb', width: 640, height: 400 }, { name: 'full', width: 800, maxHeight: 12000, quality: 0.68 }] : [{ name: 'thumb', width: 640, height: 400 }]) : {}
  const capturedAt = new Date().toISOString()
  report.visuals = {
    ...report.visuals,
    icon: iconUrl ? { ok: true, url: iconUrl, type: null, bytes: null, dataUrl: iconUrl, rel: iconCandidate?.rel || 'favicon', remote: true } : null,
    screenshot: screenshotUrl ? { dataUrl: renditions.thumb?.dataUrl || screenshotUrl, remoteUrl: screenshotUrl, width: renditions.thumb?.width || null, height: renditions.thumb?.height || null, capturedAt, engine: 'Firecrawl', kind: 'viewport', partial: null, embedded: Boolean(renditions.thumb) } : null,
    screenshotError: screenshotUrl ? null : 'Firecrawl returned no screenshot.',
    fullPage: renditions.full ? { dataUrl: renditions.full.dataUrl, remoteUrl: screenshotUrl, width: renditions.full.width, height: renditions.full.height, capturedAt, engine: 'Firecrawl', kind: 'fullPage', partial: renditions.full.cut ? 'Full-page render cut at 12000px.' : null } : null,
    fullPageError: fullPage && !renditions.full ? (screenshotUrl ? 'The full-page image could not be downloaded into the library.' : 'Firecrawl returned no screenshot.') : null,
    mobile: null,
    firecrawlBranding: brandingBlock(branding),
    brandColor: brandColorOf(report, branding),
    creditsUsed: meta.creditsUsed ?? null,
  }
  if (screenshotUrl && !renditions.thumb) limitations.push('The screenshot could not be downloaded into the library; it is shown from Firecrawl\'s time-limited link.')
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  report.durationMs = Math.round(performance.now() - started)
  return report
}

/** Static mode: one more rendered page as an embedded thumbnail (and optional full render). */
export async function captureViaFirecrawlApi(url, { fullPage = false, mobile = false, apiKey, proxy, signal, full = false } = {}) {
  const target = normalize(url)
  const data = await firecrawlScrape({ url: target, formats: [screenshotFormat(fullPage)], mobile, onlyMainContent: false, maxAge: 0 }, { apiKey, proxy, signal })
  const remoteUrl = typeof data.screenshot === 'string' && /^https?:\/\//.test(data.screenshot) ? data.screenshot : null
  if (!remoteUrl) throw new Error('Firecrawl returned no screenshot.')
  const specs = mobile ? [{ name: 'thumb', width: 390, maxHeight: 3000, quality: 0.72 }] : [{ name: 'thumb', width: 640, height: 400 }]
  if (full && !mobile) specs.push({ name: 'full', width: 800, maxHeight: 12000, quality: 0.68 })
  const r = await imageRenditions(remoteUrl, specs)
  const capturedAt = new Date().toISOString()
  return {
    url: target, dataUrl: r.thumb?.dataUrl || null, remoteUrl, width: r.thumb?.width || null, height: r.thumb?.height || null, capturedAt, engine: 'Firecrawl', kind: mobile ? 'mobile' : fullPage ? 'fullPage' : 'viewport', title: data.metadata?.title || null,
    full: r.full ? { dataUrl: r.full.dataUrl, width: r.full.width, height: r.full.height } : null,
  }
}

const sleep = (ms, signal) => new Promise((resolve, reject) => { const t = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('cancelled')) }, { once: true }) })

/**
 * Renders several pages one after another, spaced to respect Firecrawl's per-minute limits.
 * `capture(url)` is the mode-specific function; `onProgress({done,total,current,result,error})`.
 */
export async function capturePages(urls, capture, { spacingMs = CAPTURE_SPACING_MS, onProgress, signal } = {}) {
  const results = []
  for (let i = 0; i < urls.length; i++) {
    if (signal?.aborted) break
    const url = urls[i]
    onProgress?.({ done: i, total: urls.length, current: url })
    try {
      const result = await capture(url)
      results.push({ url, ok: true, ...result })
    } catch (e) {
      if (e.status === 429) {
        // One spaced retry; a second 429 ends the batch so the viewer is not kept waiting.
        try { await sleep(spacingMs * 3, signal); const result = await capture(url); results.push({ url, ok: true, ...result }) } catch (e2) { results.push({ url, ok: false, error: e2.message }); if (e2.status === 429) { onProgress?.({ done: i + 1, total: urls.length, current: null, stopped: 'rate limit' }); break } }
      } else {
        results.push({ url, ok: false, error: e.message })
      }
    }
    onProgress?.({ done: i + 1, total: urls.length, current: null, last: results[results.length - 1] })
    if (i < urls.length - 1) { try { await sleep(spacingMs, signal) } catch { break } }
  }
  return results
}
