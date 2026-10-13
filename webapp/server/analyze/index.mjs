// Orchestrates a single-URL analysis and returns the complete report.

import * as cheerio from 'cheerio'
import { guardedFetch, normalizeTargetUrl, fetchAsset } from './fetch.mjs'
import { detectTechnologies } from './fingerprints.mjs'
import { analyzeDesign } from './design.mjs'
import { analyzeStructure } from './structure.mjs'
import { analyzeContent } from './content.mjs'
import { analyzeScripts } from './scripts.mjs'
import { analyzeNetwork } from './network.mjs'
import { analyzeSecurity } from './security.mjs'
import { discoverSiteFiles } from './discovery.mjs'
import { buildBlueprint } from './blueprint.mjs'

export const REPORT_VERSION = 1

/**
 * @param {string} input   URL typed by the user
 * @param {{discover?: boolean, fetchFirstPartyScripts?: boolean}} options
 */
export async function analyzeUrl(input, options = {}) {
  const { discover = true, fetchFirstPartyScripts = true } = options
  const started = Date.now()
  const url = normalizeTargetUrl(input)
  const page = await guardedFetch(url, { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' })
  const html = page.text
  const $ = cheerio.load(html)
  const pageUrl = page.finalUrl
  const limitations = ['Static analysis of the HTML response only; JavaScript was not executed, so client-rendered DOM, XHR/fetch traffic and runtime state are not observed.']
  if (page.truncated) limitations.push(`Response body was truncated at ${page.body.length} bytes.`)
  if (!/text\/html|application\/xhtml/i.test(page.headers['content-type'] || '')) limitations.push(`Content-Type is ${page.headers['content-type'] || 'unknown'}; HTML heuristics may not apply.`)

  const scriptSrcs = $('script[src]').map((_, el) => $(el).attr('src')).get()
  const inlineJs = $('script:not([src])').map((_, el) => $(el).html() || '').get().join('\n')
  const metas = {}
  $('meta[name]').each((_, el) => { metas[($(el).attr('name') || '').toLowerCase()] = $(el).attr('content') || '' })
  const cookies = (page.headers['set-cookie'] || '').split(/,(?=\s*[A-Za-z0-9_-]+=)/).filter(Boolean)

  const technologies = detectTechnologies({ html, scriptSrcs, inlineJs, headers: page.headers, cookies, metas })
  const design = analyzeDesign({ $, html })
  const structure = analyzeStructure({ $, pageUrl })
  const content = analyzeContent({ $, html, pageUrl })
  const scripts = analyzeScripts({ $, pageUrl, html })
  const network = analyzeNetwork({ $, pageUrl, html })
  const security = analyzeSecurity({ headers: page.headers, finalUrl: pageUrl, scripts, network })

  const [discovery, fetchedScripts] = await Promise.all([
    discover ? discoverSiteFiles(pageUrl) : Promise.resolve(null),
    fetchFirstPartyScripts ? inspectScripts(selectScriptsToFetch(scripts.external), pageUrl) : Promise.resolve([]),
  ])
  if (!discover) limitations.push('Well-known file discovery was skipped.')
  if (!fetchFirstPartyScripts) limitations.push('External script bodies were not fetched.')
  scripts.fetchedScripts = fetchedScripts

  const report = {
    reportVersion: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
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
    },
    summary: null,
    technologies,
    design,
    structure,
    content,
    scripts,
    network,
    security,
    discovery,
    limitations,
  }
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
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

function summarize(report) {
  const { technologies, structure, content, scripts, network, security, design } = report
  const byCat = {}
  for (const t of technologies) (byCat[t.categoryLabel] ||= []).push(t.name + (t.version ? ` ${t.version}` : ''))
  return {
    title: content.title,
    description: content.description,
    language: content.lang || content.languageHint.language,
    siteType: inferSiteType(report),
    technologyCount: technologies.length,
    technologiesByCategory: byCat,
    thirdPartyHosts: network.thirdPartyCount,
    sections: report.blueprint.components.length,
    ctas: structure.ctas.slice(0, 5).map((c) => c.text),
    forms: structure.forms.length,
    wordCount: content.wordCount,
    prices: content.prices.filter((p) => p.context !== 'inline script literal').length,
    colorMode: design.colors.mode,
    primaryFonts: [...new Set([...design.typography.fontFaces.map((f) => f.family), ...design.typography.googleFonts.map((g) => g.family)].filter(Boolean))].slice(0, 5),
    securityScore: security.score,
    trackingIds: scripts.trackingIds,
    developerCommentLanguage: content.comments.languageHint,
    headline: content.headlines[0] || content.textBlocks[0]?.text || null,
  }
}

function inferSiteType(report) {
  const { content, structure, technologies } = report
  const text = `${content.title} ${content.description} ${content.headlines.join(' ')}`.toLowerCase()
  const names = technologies.map((t) => t.name)
  if (names.includes('Shopify') || /add to cart|checkout/.test(text)) return 'e-commerce storefront'
  if (content.prices.length >= 3 && /plan|pricing|month|yearly|subscri/.test(text)) return 'SaaS marketing / pricing page'
  if (structure.forms.some((f) => f.fields.some((x) => x.type === 'password'))) return 'authentication / login page'
  if (/blog|article|posted|read more/.test(text)) return 'blog / editorial'
  if (/docs|documentation|api reference/.test(text)) return 'documentation'
  if (structure.ctas.length && content.wordCount < 3000) return 'landing page'
  return 'web page'
}
