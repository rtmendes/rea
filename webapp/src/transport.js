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
