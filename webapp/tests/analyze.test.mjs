import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as cheerio from 'cheerio'
import { detectTechnologies } from '../server/analyze/fingerprints.mjs'
import { analyzeDesign, contrastRatio, normalizeHex, hslToHex } from '../server/analyze/design.mjs'
import { analyzeStructure } from '../server/analyze/structure.mjs'
import { analyzeContent, guessLanguage } from '../server/analyze/content.mjs'
import { analyzeScripts, describeShape } from '../server/analyze/scripts.mjs'
import { analyzeNetwork } from '../server/analyze/network.mjs'
import { analyzeSecurity } from '../server/analyze/security.mjs'
import { buildBlueprint } from '../server/analyze/blueprint.mjs'
import { selectScriptsToFetch } from '../server/analyze/index.mjs'
import { reportToMarkdown } from '../shared/report-markdown.mjs'
import { FIXTURE_HTML, FIXTURE_HEADERS, FIXTURE_URL } from './fixture.mjs'

function analyzeFixture() {
  const html = FIXTURE_HTML
  const $ = cheerio.load(html)
  const scriptSrcs = $('script[src]').map((_, el) => $(el).attr('src')).get()
  const inlineJs = $('script:not([src])').map((_, el) => $(el).html() || '').get().join('\n')
  const metas = {}
  $('meta[name]').each((_, el) => { metas[$(el).attr('name').toLowerCase()] = $(el).attr('content') || '' })
  const cookies = [FIXTURE_HEADERS['set-cookie']]
  const technologies = detectTechnologies({ html, scriptSrcs, inlineJs, headers: FIXTURE_HEADERS, cookies, metas })
  const design = analyzeDesign({ $, html })
  const structure = analyzeStructure({ $, pageUrl: FIXTURE_URL })
  const content = analyzeContent({ $, html, pageUrl: FIXTURE_URL })
  const scripts = analyzeScripts({ $, pageUrl: FIXTURE_URL, html })
  const network = analyzeNetwork({ $, pageUrl: FIXTURE_URL, html })
  const security = analyzeSecurity({ headers: FIXTURE_HEADERS, finalUrl: FIXTURE_URL, scripts, network })
  const report = { target: { finalUrl: FIXTURE_URL, headers: FIXTURE_HEADERS, status: 200, bytes: html.length, timing: { ttfbMs: 1, totalMs: 2 }, redirects: [], addresses: [] }, generatedAt: 'now', durationMs: 1, technologies, design, structure, content, scripts, network, security, discovery: null, limitations: ['test'] }
  report.blueprint = buildBlueprint(report)
  report.summary = { title: content.title, description: content.description, siteType: 'landing page', language: 'en', headline: 'x', technologyCount: technologies.length, thirdPartyHosts: network.thirdPartyCount, sections: report.blueprint.components.length, forms: 0, wordCount: content.wordCount, prices: content.prices.length, colorMode: design.colors.mode, primaryFonts: [], securityScore: security.score, developerCommentLanguage: content.comments.languageHint }
  return report
}

test('fingerprints detect libraries, pixels, server and ids with evidence', () => {
  const { technologies } = analyzeFixture()
  const byName = Object.fromEntries(technologies.map((t) => [t.name, t]))
  assert.equal(byName['GSAP'].version, '3.12.5')
  assert.equal(byName['Lenis smooth scroll'].version, '1.1.14')
  assert.equal(byName['Google Tag Manager'].version, 'GTM-TEST123')
  assert.equal(byName['Reddit Pixel'].version, 'a2_testpixel')
  assert.equal(byName['OpenAI Pixel (oaiq)'].version, 'TestPixelId123')
  assert.ok(byName['nginx'])
  assert.ok(byName['PHP'], 'PHPSESSID cookie should imply PHP')
  assert.ok(byName['Figma-exported fixed canvas'])
  assert.ok(byName['Google Fonts'])
  assert.ok(byName['Self-hosted @font-face'])
  assert.ok(byName['cdnjs (Cloudflare)'] && byName['unpkg'])
  for (const t of technologies) assert.ok(t.evidence.length > 0, `${t.name} has evidence`)
  assert.equal(byName['React'], undefined, 'no false positive for React')
})

test('design extraction finds dark mode, accent, fonts and tokens', () => {
  const { design } = analyzeFixture()
  assert.equal(design.colors.mode, 'dark')
  assert.equal(design.colors.roles.background, '#09101a')
  assert.equal(design.colors.roles.foreground, '#ffffff')
  assert.equal(design.colors.roles.accent, '#00b3dd')
  assert.ok(design.colors.roles.contrastBackgroundForeground > 15)
  assert.deepEqual(design.typography.googleFonts.map((g) => g.family), ['Plus Jakarta Sans', 'Inter'])
  assert.equal(design.typography.fontFaces[0].family, 'Brand')
  assert.ok(design.typography.typeScalePx.some((t) => t.px === 64))
  assert.ok(design.shape.borderRadius.some((r) => r.value === '25px'))
  assert.ok(design.shape.breakpoints.some((b) => b.value === '860px'))
  assert.equal(design.shape.usesPrefersReducedMotion, true)
  assert.ok(design.shape.cssVariables.some((v) => v.name === '--accent'))
})

test('color helpers normalize and measure contrast', () => {
  assert.deepEqual(normalizeHex('#fff'), { hex: '#ffffff', alpha: null })
  assert.deepEqual(normalizeHex('#09101A80'), { hex: '#09101a', alpha: 0.5 })
  assert.equal(hslToHex(0, 100, 50), '#ff0000')
  assert.equal(contrastRatio('#000000', '#ffffff'), 21)
})

test('structure finds sections, outline, ctas and nav', () => {
  const { structure } = analyzeFixture()
  assert.ok(structure.sections.some((s) => s.label === 'Hero'))
  assert.ok(structure.sections.some((s) => s.label === 'pricing-section'))
  assert.equal(structure.outline[0].text, 'Intelligence for sellers')
  const start = structure.ctas.find((c) => c.text === 'Start now')
  assert.equal(start.occurrences, 3)
  assert.equal(start.kind, 'external')
  assert.ok(structure.navLinks.length >= 3)
  assert.equal(structure.images.count, 2)
  assert.equal(structure.images.withAlt, 1)
  assert.equal(structure.landmarks.header, 1)
})

test('content inventory extracts prices, contacts, locales and comment language', () => {
  const { content } = analyzeFixture()
  assert.equal(content.title, 'Example SaaS')
  assert.deepEqual(content.hreflang.map((h) => h.lang), ['en', 'pt-BR'])
  assert.ok(content.prices.some((p) => p.amount.replace(/\s/g, '') === 'US$39/mo'))
  assert.deepEqual(content.emails, ['contact@example-target.test'])
  assert.ok(content.socialLinks.includes('https://instagram.com/example'))
  assert.equal(content.comments.languageHint.language, 'portuguese')
  assert.equal(guessLanguage('the quick brown fox jumps with the dog and you are here for this').language, 'english')
})

test('scripts inventory exposes globals, blobs, ids and behaviours', () => {
  const { scripts } = analyzeFixture()
  assert.equal(scripts.external.length, 4)
  assert.ok(scripts.dataBlobs.some((d) => d.name === '__faq' && d.shape === 'array(3) of string'))
  assert.ok(scripts.dataBlobs.some((d) => d.name === '__plans' && d.shape.startsWith('array(2) of array')))
  const cfg = scripts.dataBlobs.find((d) => d.name === 'WidgetConfig')
  assert.ok(cfg && /title, brandColor, endpoint/.test(cfg.shape))
  assert.deepEqual(scripts.trackingIds.gtm, ['GTM-TEST123'])
  assert.deepEqual(scripts.trackingIds.redditPixel, ['a2_testpixel'])
  assert.ok(scripts.behaviours.some((b) => /Toggle/.test(b)))
  assert.ok(scripts.behaviours.some((b) => /IntersectionObserver/.test(b)))
  assert.ok(scripts.behaviours.some((b) => /reduced-motion/.test(b)))
  assert.equal(describeShape({ a: [1, 2], b: 'x' }), '{ a: array(2) of number, b: string }')
  const picked = selectScriptsToFetch(scripts.external)
  assert.deepEqual(picked.map((s) => s.host), ['chat.vendor-widget.test'], 'public CDNs skipped, custom widget fetched')
})

test('network groups third parties and ignores namespace literals as mixed content', () => {
  const { network } = analyzeFixture()
  assert.ok(network.hosts.some((h) => h.host === 'cdnjs.cloudflare.com' && h.category === 'Public JS CDN'))
  assert.ok(network.subdomainsOfTarget.includes('app.example-target.test'))
  assert.deepEqual(network.mixedContent, [])
})

test('security audit scores headers and flags missing SRI', () => {
  const { security } = analyzeFixture()
  assert.equal(security.https, true)
  assert.ok(security.score > 0 && security.score < 100)
  assert.ok(security.headerChecks.find((c) => c.header === 'x-content-type-options').present)
  assert.ok(security.findings.some((f) => /Subresource Integrity/.test(f.text)))
  assert.equal(security.cookies[0].name, 'PHPSESSID')
  assert.equal(security.cookies[0].httpOnly, true)
})

test('blueprint derives components, tokens and integrations', () => {
  const { blueprint } = analyzeFixture()
  assert.ok(blueprint.components.some((c) => c.name === 'Hero'))
  assert.ok(blueprint.components.some((c) => c.name === 'PricingSection'))
  assert.match(blueprint.tokensCss, /--color-background: #09101a/)
  assert.match(blueprint.tokensCss, /--color-accent: #00b3dd/)
  assert.match(blueprint.tokensCss, /--font-heading: 'Brand'/)
  assert.ok(blueprint.integrations.some((i) => i.name === 'Google Tag Manager' && i.observedId === 'GTM-TEST123'))
  assert.ok(blueprint.interactions.some((i) => /Language switcher/.test(i)))
  assert.match(blueprint.recommendedStack.frontend, /Vite \+ React/)
  assert.ok(blueprint.checklist.length > 3)
})

test('markdown export renders every section', () => {
  const md = reportToMarkdown(analyzeFixture())
  for (const heading of ['## Summary', '## Technology stack', '## Design system', '## Structure', '## Content inventory', '## Scripts and data', '## Third-party surface', '## Security posture', '## Rebuild blueprint', '## Evidence and limitations']) {
    assert.ok(md.includes(heading), heading)
  }
  assert.match(md, /GTM-TEST123/)
})
