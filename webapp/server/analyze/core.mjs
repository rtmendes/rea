// Pure document analysis: everything derivable from one HTML document plus what is known
// about its response. No Node APIs, so it runs in the server, the CLI and the browser build.

import { detectTechnologies } from './fingerprints.mjs'
import { analyzeDesign } from './design.mjs'
import { analyzeStructure } from './structure.mjs'
import { analyzeContent } from './content.mjs'
import { analyzeScripts } from './scripts.mjs'
import { analyzeNetwork } from './network.mjs'
import { analyzeSecurity } from './security.mjs'
import { buildBlueprint } from './blueprint.mjs'
import { selectIcons } from './icons.mjs'
import { analyzeKeywords } from './keywords.mjs'
import { analyzeAudience } from './audience.mjs'
import { analyzePages } from './pages.mjs'
import { analyzeReach } from './reach.mjs'

export const REPORT_VERSION = 3

/**
 * @param {object} input
 * @param {(html: string) => any} input.load   cheerio `load` (full or slim build)
 * @param {string} input.html
 * @param {{input: string, url: string, finalUrl: string, status: number, statusText?: string, headers: Record<string,string>, bytes: number, truncated?: boolean, timing: {ttfbMs: number|null, totalMs: number|null}, redirects?: any[], addresses?: string[], contentType?: string|null, source?: string}} input.target
 * @param {string[]} [input.limitations]
 */
export function analyzeDocument({ load, html, target, limitations = [] }) {
  const $ = load(html)
  const pageUrl = target.finalUrl
  const headers = target.headers || {}
  const scriptSrcs = $('script[src]').map((_, el) => $(el).attr('src')).get()
  const inlineJs = $('script:not([src])').map((_, el) => $(el).html() || '').get().join('\n')
  const metas = {}
  $('meta[name]').each((_, el) => { metas[($(el).attr('name') || '').toLowerCase()] = $(el).attr('content') || '' })
  const cookies = (headers['set-cookie'] || '').split(/,(?=\s*[A-Za-z0-9_-]+=)/).filter(Boolean)
  const headersObserved = Object.keys(headers).length > 0
  if (!headersObserved) limitations.push('Response headers were not observed, so the security header audit and server fingerprints from headers are not available.')
  if (!/text\/html|application\/xhtml/i.test(target.contentType || 'text/html')) limitations.push(`Content-Type is ${target.contentType}; HTML heuristics may not apply.`)

  const technologies = detectTechnologies({ html, scriptSrcs, inlineJs, headers, cookies, metas })
  const design = analyzeDesign({ $, html })
  const structure = analyzeStructure({ $, pageUrl })
  const content = analyzeContent({ $, html, pageUrl })
  const scripts = analyzeScripts({ $, pageUrl, html })
  const network = analyzeNetwork({ $, pageUrl, html })
  const security = analyzeSecurity({ headers, finalUrl: pageUrl, scripts, network })
  if (!headersObserved) { security.score = null; security.headerChecks = []; security.findings = security.findings.filter((f) => !/header missing|Cookie|Server header|X-Powered-By/.test(f.text)) }
  const pages = analyzePages({ $, pageUrl })
  const keywords = analyzeKeywords({ $, content, structure, pageUrl })
  const audience = analyzeAudience({ $, content, structure, technologies })
  const report = {
    reportVersion: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    durationMs: 0,
    target: { ...target, headers },
    summary: null,
    technologies,
    design,
    structure,
    content,
    scripts,
    network,
    security,
    pages,
    keywords,
    audience,
    reach: null,
    discovery: null,
    visuals: {
      icon: null,
      iconCandidates: selectIcons($, pageUrl).slice(0, 4),
      iconAttempts: [],
      ogImage: content.openGraph.image ? { ok: false, url: content.openGraph.image, error: 'not fetched' } : null,
      screenshot: null,
      screenshotError: null,
      brandColor: design.colors.roles.accent || design.colors.themeColor || design.colors.roles.background || null,
      backgroundColor: design.colors.roles.background || null,
      mode: design.colors.mode,
    },
    limitations,
  }
  report.reach = analyzeReach({ technologies, content, structure, scripts, network, pages, discovery: null, pageUrl })
  report.blueprint = buildBlueprint(report)
  report.summary = summarize(report)
  return { report, $ }
}

/** Re-derives the parts that depend on well-known discovery (sitemap) once it has run. */
export function applyDiscovery(report, $, discovery) {
  report.discovery = discovery
  const sitemapUrls = discovery?.sitemap?.urls || []
  if (sitemapUrls.length) {
    const captures = report.pages?.captures || []
    report.pages = analyzePages({ $, pageUrl: report.target.finalUrl, sitemapUrls })
    report.pages.captures = captures
  }
  report.reach = analyzeReach({ technologies: report.technologies, content: report.content, structure: report.structure, scripts: report.scripts, network: report.network, pages: report.pages, discovery, pageUrl: report.target.finalUrl })
  return report
}

export function summarize(report) {
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
    hasScreenshot: Boolean(report.visuals?.screenshot),
    hasIcon: Boolean(report.visuals?.icon),
    focusKeyword: report.keywords?.focus?.term || null,
    topKeywords: (report.keywords?.terms || []).slice(0, 6).map((t) => t.term),
    audience: report.audience?.summary?.who || null,
    businessModel: report.audience?.model?.label || null,
    pageCount: report.pages?.internalCount ?? null,
    pageSections: report.pages?.sections?.length ?? null,
    paidAcquisitionLikely: report.reach?.paidAcquisitionLikely ?? null,
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
