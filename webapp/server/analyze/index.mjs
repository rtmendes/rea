// Orchestrates a single-URL analysis and returns the complete report.

import * as cheerio from 'cheerio'
import { guardedFetch, normalizeTargetUrl, fetchAsset } from './fetch.mjs'
import { discoverSiteFiles } from './discovery.mjs'
import { buildBlueprint } from './blueprint.mjs'
import { collectVisuals } from './visuals.mjs'
import { captureScreenshot } from '../screenshot.mjs'
import { analyzeDocument, summarize } from './core.mjs'

export { REPORT_VERSION } from './core.mjs'

/**
 * @param {string} input   URL typed by the user
 * @param {{discover?: boolean, fetchFirstPartyScripts?: boolean, screenshot?: boolean}} options
 */
export async function analyzeUrl(input, options = {}) {
  const { discover = true, fetchFirstPartyScripts = true, screenshot = true } = options
  const started = Date.now()
  const url = normalizeTargetUrl(input)
  const page = await guardedFetch(url, { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' })
  const html = page.text
  const pageUrl = page.finalUrl
  const limitations = ['Static analysis of the HTML response only; JavaScript was not executed, so client-rendered DOM, XHR/fetch traffic and runtime state are not observed.']
  if (page.truncated) limitations.push(`Response body was truncated at ${page.body.length} bytes.`)

  const { report, $ } = analyzeDocument({
    load: cheerio.load,
    html,
    limitations,
    target: {
      input,
      url: page.url,
      finalUrl: pageUrl,
      status: page.status,
      statusText: page.statusText,
      redirects: page.redirects,
      addresses: page.addresses,
      headers: page.headers,
      bytes: page.body.length,
      truncated: page.truncated,
      timing: page.timing,
      contentType: page.headers['content-type'] || null,
      source: 'direct fetch',
    },
  })
  const { scripts, content, design } = report

  const [discovery, fetchedScripts, visualAssets, shot] = await Promise.all([
    discover ? discoverSiteFiles(pageUrl) : Promise.resolve(null),
    fetchFirstPartyScripts ? inspectScripts(selectScriptsToFetch(scripts.external), pageUrl) : Promise.resolve([]),
    collectVisuals({ $, pageUrl, ogImageUrl: content.openGraph.image }),
    screenshot ? captureScreenshot(pageUrl) : Promise.resolve({ error: 'Screenshot disabled for this run.' }),
  ])
  if (!discover) limitations.push('Well-known file discovery was skipped.')
  if (!fetchFirstPartyScripts) limitations.push('External script bodies were not fetched.')
  scripts.fetchedScripts = fetchedScripts
  report.discovery = discovery
  report.visuals = {
    ...report.visuals,
    icon: visualAssets.icon,
    iconAttempts: visualAssets.iconAttempts,
    ogImage: visualAssets.ogImage,
    screenshot: shot.dataUrl || shot.remoteUrl ? shot : null,
    screenshotError: shot.error || null,
    brandColor: design.colors.roles.accent || design.colors.themeColor || design.colors.roles.background || null,
  }
  if (shot.error) limitations.push(shot.error)
  if (shot.partial) limitations.push(shot.partial)
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  report.durationMs = Date.now() - started
  return report
}

const PUBLIC_SCRIPT_HOSTS = /(^|\.)(cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net|esm\.sh|googletagmanager\.com|google-analytics\.com|googleapis\.com|gstatic\.com|redditstatic\.com|facebook\.net|tiktok\.com|openai\.com|hotjar\.com|clarity\.ms|stripe\.com|licdn\.com|cloudflareinsights\.com|vercel-scripts\.com)$/i

/** First-party scripts first, then custom third-party scripts (not public CDNs or well-known vendors). */
export function selectScriptsToFetch(external) {
  const firstParty = external.filter((s) => s.firstParty).slice(0, 4)
  const custom = external.filter((s) => !s.firstParty && s.host && !PUBLIC_SCRIPT_HOSTS.test(s.host)).slice(0, 2)
  return [...firstParty, ...custom]
}

async function inspectScripts(list, pageUrl) {
  return Promise.all(list.map(async (s) => {
    const res = await fetchAsset(new URL(s.src, pageUrl), { accept: 'application/javascript,text/javascript,*/*' })
    if (!res.ok) return { src: s.src, ok: false, firstParty: s.firstParty, error: res.error || `HTTP ${res.status}` }
    const code = res.text || ''
    return {
      src: s.src,
      ok: true,
      firstParty: s.firstParty,
      bytes: res.body.length,
      truncated: res.truncated,
      contentType: res.headers['content-type'] || null,
      lastModified: res.headers['last-modified'] || null,
      minified: code.split('\n').some((l) => l.length > 1500),
      sourceMap: /\/\/[#@]\s*sourceMappingURL=([^\s]+)/.exec(code)?.[1] || null,
      endpoints: [...new Set([...code.matchAll(/https?:\/\/[^\s'"`<>)]+/g)].map((m) => m[0]))].slice(0, 30),
      relativeEndpoints: [...new Set([...code.matchAll(/['"`](\/(?:api|v\d|graphql|chat|auth|login|track|collect)[^'"`\s]*)['"`]/g)].map((m) => m[1]))].slice(0, 30),
      globals: [...new Set([...code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]))].slice(0, 20),
      storageKeys: [...new Set([...code.matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))].slice(0, 20),
      headerComment: /^\s*\/\*\*?([\s\S]{0,600}?)\*\//.exec(code)?.[1]?.replace(/\s*\*\s?/g, ' ').trim() || null,
      usesFetch: /\bfetch\(|XMLHttpRequest/.test(code),
      usesWebSocket: /new WebSocket\(/.test(code),
    }
  }))
}
