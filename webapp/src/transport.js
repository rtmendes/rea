// Two ways to obtain a target page: the app's own API (local server / Vercel) or, when the page
// runs inside a claude.ai artifact, the viewer's Firecrawl connector through the `mcp` capability.

import { load } from 'cheerio/slim'
import { analyzeDocument, summarize } from '../server/analyze/core.mjs'
import { buildBlueprint } from '../server/analyze/blueprint.mjs'

export const FIRECRAWL_SERVER = 'Firecrawl'

/** Resolves the artifact runtime's mcp namespace, or null outside a claude.ai artifact. */
export async function detectMcp() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try { return await window.claude.use('mcp') } catch { return null }
}

export async function detectDownloads() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null
  try { return await window.claude.use('downloads') } catch { return null }
}

export async function analyzeViaApi(url, options) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, ...options }) })
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

/**
 * Fetches the page through Firecrawl (rendered DOM + screenshot URL + branding) and runs the
 * analyzer in the browser. Images from other hosts cannot be displayed inside an artifact, so
 * the screenshot and icon are kept as links rather than embedded thumbnails.
 */
export async function analyzeViaFirecrawl(url, mcp, options = {}) {
  const started = performance.now()
  const target = normalize(url)
  const formats = options.screenshot === false ? ['rawHtml', 'branding'] : ['rawHtml', 'screenshot', 'branding']
  const result = await mcp.callTool(FIRECRAWL_SERVER, 'firecrawl_scrape', {
    url: target,
    formats,
    onlyMainContent: false,
    maxAge: 0,
    objective: 'Reverse engineer this page: return its rendered HTML, a screenshot and branding so the stack, design system and structure can be analyzed.',
  })
  let payload = result.payload
  if (typeof payload === 'string') { try { payload = JSON.parse(payload) } catch { throw new Error(`Firecrawl returned text instead of a scrape result: ${payload.slice(0, 200)}`) } }
  if (!payload && Array.isArray(result.content)) { const text = result.content.find((c) => c.type === 'text')?.text; try { payload = JSON.parse(text) } catch { /* ignore */ } }
  const html = payload?.rawHtml || payload?.html
  if (!html) throw new Error(`Firecrawl returned no HTML for ${target}`)
  const meta = payload.metadata || {}
  const finalUrl = meta.url || meta.sourceURL || target
  const limitations = [
    'Fetched through the Firecrawl connector: the HTML is the DOM after JavaScript ran, so client-rendered content is included.',
    'Response headers, cookies, redirects, resolved addresses, robots.txt/sitemap and script bodies were not observed in connector mode.',
  ]
  const { report } = analyzeDocument({
    load,
    html,
    limitations,
    target: {
      input: url,
      url: target,
      finalUrl,
      status: meta.statusCode ?? null,
      statusText: '',
      redirects: [],
      addresses: [],
      headers: {},
      bytes: new TextEncoder().encode(html).length,
      truncated: false,
      timing: { ttfbMs: null, totalMs: null },
      contentType: meta.contentType || 'text/html',
      source: 'Firecrawl connector',
    },
  })
  const branding = payload.branding || null
  const iconCandidate = report.visuals.iconCandidates[0] || null
  const iconUrl = iconCandidate?.url || meta.favicon || null
  const screenshotUrl = typeof payload.screenshot === 'string' && /^https?:\/\//.test(payload.screenshot) ? payload.screenshot : null
  report.visuals = {
    ...report.visuals,
    icon: iconUrl ? { ok: true, url: iconUrl, type: null, bytes: null, dataUrl: null, rel: iconCandidate?.rel || 'favicon', remote: true } : null,
    screenshot: screenshotUrl ? { dataUrl: null, remoteUrl: screenshotUrl, width: null, height: null, capturedAt: new Date().toISOString(), engine: 'Firecrawl', partial: null } : null,
    screenshotError: screenshotUrl ? 'The screenshot is a time-limited link: pages inside a claude.ai artifact cannot display images from other hosts.' : 'Firecrawl returned no screenshot.',
    firecrawlBranding: branding ? { colorScheme: branding.colorScheme || null, colors: branding.colors || null, fonts: branding.fonts || null, brandName: branding.brandName || null, designSystem: branding.designSystem || null } : null,
    brandColor: report.design.colors.roles.accent || branding?.colors?.accent?.toLowerCase() || branding?.colors?.primary?.toLowerCase() || report.design.colors.themeColor || report.design.colors.roles.background || null,
  }
  if (screenshotUrl) limitations.push('Screenshot and icon are links to the original hosts; the artifact sandbox cannot embed them as thumbnails.')
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  report.durationMs = Math.round(performance.now() - started)
  return report
}

// ---------------------------------------------------------------------------------------------
// Static mode: the page is served from a static host (GitHub Pages) with no API of its own, so
// the browser calls Firecrawl's REST API directly. Keyless calls use Firecrawl's free tier and
// are rate limited; a personal API key (stored only in this browser) lifts that.

export const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape'
export const API_KEY_STORAGE = 'rea-webapp:firecrawl-key'

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

/** Downloads an image URL (needs CORS) and returns a resized JPEG data URL, or null. */
export async function imageUrlToThumbnail(url, { width = 640, height = 400, quality = 0.74 } = {}) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob)
    const scale = width / bitmap.width
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.min(height, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, bitmap.width, canvas.height / scale, 0, 0, width, canvas.height)
    bitmap.close?.()
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height: canvas.height }
  } catch { return null }
}

export function describeFirecrawlHttpError(status, body) {
  const msg = typeof body === 'string' ? body : body?.error || body?.message || ''
  if (status === 401 || status === 403) return `Firecrawl rejected the API key (${status}). Check it at https://www.firecrawl.dev/app/api-keys.`
  if (status === 402) return 'Firecrawl says this account is out of credits (402).'
  if (status === 429) return msg.includes('keyless') ? 'Firecrawl\'s keyless free tier is rate limited right now. Add a free API key (Settings → Firecrawl key) or wait a minute.' : 'Firecrawl rate limit reached (429). Wait a minute and retry.'
  return `Firecrawl error ${status}: ${msg.slice(0, 200) || 'unknown'}`
}

/** Fetches the page through Firecrawl's REST API from the browser and analyzes it locally. */
export async function analyzeViaFirecrawlApi(url, options = {}) {
  const started = performance.now()
  const target = normalize(url)
  const apiKey = options.apiKey || readApiKey()
  const formats = options.screenshot === false ? ['rawHtml', 'branding'] : ['rawHtml', 'screenshot', 'branding']
  let res
  try {
    res = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ url: target, formats, onlyMainContent: false, maxAge: 0 }),
    })
  } catch (e) {
    throw new Error(`Could not reach Firecrawl from this browser: ${e.message}`)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) throw new Error(describeFirecrawlHttpError(res.status, body))
  const data = body.data || {}
  const html = data.rawHtml || data.html
  if (!html) throw new Error(`Firecrawl returned no HTML for ${target}`)
  const meta = data.metadata || {}
  const finalUrl = meta.url || meta.sourceURL || target
  const limitations = [
    'Fetched through Firecrawl\'s API from your browser: the HTML is the DOM after JavaScript ran, so client-rendered content is included.',
    'Response headers, cookies, redirects, resolved addresses, robots.txt/sitemap and script bodies were not observed in this mode.',
  ]
  const { report } = analyzeDocument({
    load,
    html,
    limitations,
    target: { input: url, url: target, finalUrl, status: meta.statusCode ?? null, statusText: '', redirects: [], addresses: [], headers: {}, bytes: new TextEncoder().encode(html).length, truncated: false, timing: { ttfbMs: null, totalMs: null }, contentType: meta.contentType || 'text/html', source: apiKey ? 'Firecrawl API (your key)' : 'Firecrawl API (keyless free tier)' },
  })
  const branding = data.branding || null
  const iconCandidate = report.visuals.iconCandidates[0] || null
  const iconUrl = iconCandidate?.url || (meta.favicon && meta.favicon !== 'data:,' ? meta.favicon : null)
  const screenshotUrl = typeof data.screenshot === 'string' && /^https?:\/\//.test(data.screenshot) ? data.screenshot : null
  const thumb = screenshotUrl ? await imageUrlToThumbnail(screenshotUrl) : null
  report.visuals = {
    ...report.visuals,
    icon: iconUrl ? { ok: true, url: iconUrl, type: null, bytes: null, dataUrl: iconUrl, rel: iconCandidate?.rel || 'favicon', remote: true } : null,
    screenshot: screenshotUrl ? { dataUrl: thumb?.dataUrl || screenshotUrl, remoteUrl: screenshotUrl, width: thumb?.width || null, height: thumb?.height || null, capturedAt: new Date().toISOString(), engine: 'Firecrawl', partial: null, embedded: Boolean(thumb) } : null,
    screenshotError: screenshotUrl ? null : 'Firecrawl returned no screenshot.',
    firecrawlBranding: branding ? { colorScheme: branding.colorScheme || null, colors: branding.colors || null, fonts: branding.fonts || null, brandName: branding.brandName || null, designSystem: branding.designSystem || null } : null,
    brandColor: report.design.colors.roles.accent || branding?.colors?.accent?.toLowerCase() || branding?.colors?.primary?.toLowerCase() || report.design.colors.themeColor || report.design.colors.roles.background || null,
    creditsUsed: meta.creditsUsed ?? null,
  }
  if (screenshotUrl && !thumb) limitations.push('The screenshot could not be downloaded into the library; it is shown from Firecrawl\'s time-limited link.')
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  report.durationMs = Math.round(performance.now() - started)
  return report
}
