import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as cheerio from 'cheerio'
import { analyzeDocument, applyDiscovery, REPORT_VERSION } from '../server/analyze/core.mjs'
import { classifyPage } from '../server/analyze/pages.mjs'
import { FIXTURE_HTML, FIXTURE_HEADERS, FIXTURE_URL } from './fixture.mjs'

function run() {
  return analyzeDocument({
    load: cheerio.load,
    html: FIXTURE_HTML,
    target: { input: FIXTURE_URL, url: FIXTURE_URL, finalUrl: FIXTURE_URL, status: 200, headers: FIXTURE_HEADERS, bytes: FIXTURE_HTML.length, timing: { ttfbMs: 1, totalMs: 2 }, redirects: [], addresses: [], contentType: 'text/html' },
  })
}

test('report version 3 carries pages, keywords, audience and reach blocks', () => {
  const { report } = run()
  assert.equal(REPORT_VERSION, 3)
  assert.equal(report.reportVersion, 3)
  for (const k of ['pages', 'keywords', 'audience', 'reach']) assert.ok(report[k], `${k} present`)
  assert.equal(report.summary.focusKeyword, report.keywords.focus?.term)
  assert.ok(Array.isArray(report.summary.topKeywords))
})

test('keywords weight the title and h1 above body copy and classify CTA intents', () => {
  const { report } = run()
  const k = report.keywords
  const terms = Object.fromEntries(k.terms.map((t) => [t.term, t]))
  assert.ok(terms.intelligence && terms.intelligence.where.h1 >= 1, 'h1 term found with placement')
  assert.ok(terms.sellers, 'h1 term "sellers" found')
  assert.ok(terms.pricing && (terms.pricing.where.nav || terms.pricing.where.h2), 'nav/h2 term found')
  assert.ok(k.phrases.some((p) => p.term === 'intelligence for sellers'), 'phrase keeps inner stop word')
  assert.ok(k.focus, 'a focus keyword is chosen')
  const intents = Object.fromEntries(k.intents.map((i) => [i.intent, i]))
  assert.ok(intents.try && intents.try.examples.includes('Start now'), '"Start now" classified as try')
  assert.ok(intents.learn && intents.learn.examples.includes('See how it works'))
  assert.ok(!terms.the && !terms.for, 'stop words removed')
  assert.match(k.method, /No external search data/)
})

test('audience avatar reads roles, pricing, objections and tone with evidence', () => {
  const { report } = run()
  const a = report.audience
  assert.match(a.disclaimer, /Inferred/)
  assert.ok(a.who.some((w) => w.label === 'sellers' && w.evidence.length), 'role "sellers" with evidence')
  assert.equal(a.pricing.observed, 3)
  assert.equal(a.pricing.min, 39)
  assert.equal(a.pricing.max, 249)
  assert.equal(a.pricing.cadence, 'monthly')
  assert.equal(a.pricing.currency, 'US$')
  assert.ok(a.hesitations.some((h) => /cancel any time/i.test(h.text)), 'cancel-anytime objection captured')
  assert.ok(a.channels.social.some((s) => s.platform === 'Instagram'))
  assert.ok(a.channels.emails.includes('contact@example-target.test'))
  assert.ok(['very low', 'low', 'medium'].includes(a.confidence))
  assert.ok(a.summary.budget.includes('39'))
  assert.ok(a.tone.register && a.tone.voice)
})

test('pages map groups internal links, classifies types and picks key pages', () => {
  const { report } = run()
  const p = report.pages
  assert.ok(p.internalCount >= 1)
  assert.ok(p.subdomains.includes('app.example-target.test'), 'app subdomain detected')
  const login = p.pages.find((x) => x.host === 'app.example-target.test')
  assert.equal(login.type, 'login')
  assert.ok(login.inNav >= 1, 'login link counted in nav')
  assert.ok(p.keyPages.some((k) => k.type === 'login'))
  assert.equal(classifyPage('/pricing', 'Pricing'), 'pricing')
  assert.equal(classifyPage('/blog/how-to', 'Read'), 'blog')
  assert.equal(classifyPage('/privacy', ''), 'legal')
  assert.equal(classifyPage('/', 'Home'), 'home')
  assert.equal(classifyPage('/x', 'Random'), 'other')
})

test('reach lists observed acquisition signals and public lookup links, never traffic numbers', () => {
  const { report } = run()
  const r = report.reach
  assert.match(r.disclaimer, /No visitor numbers/)
  assert.ok(r.ads.some((a) => /Reddit/.test(a.name)), 'Reddit pixel counted as ad signal')
  assert.ok(r.tagManagers.some((t) => /Tag Manager/.test(t.name)))
  assert.equal(r.paidAcquisitionLikely, true)
  assert.ok(r.socialByPlatform.Instagram?.length === 1)
  assert.ok(r.lookups.every((l) => /^https:\/\//.test(l.url)))
  assert.ok(r.lookups.some((l) => l.url.includes('similarweb.com/website/example-target.test')))
  assert.ok(r.signals.find((s) => s.label === 'Languages (hreflang)').value.includes('pt-BR'))
  assert.ok(!JSON.stringify(r).match(/visits per month|monthly visits/i))
})

test('applyDiscovery merges sitemap URLs into the pages map and refreshes reach', () => {
  const { report, $ } = run()
  const before = report.pages.internalCount
  applyDiscovery(report, $, { sitemap: { url: `${FIXTURE_URL}sitemap.xml`, ok: true, status: 200, urls: [`${FIXTURE_URL}blog/post-1`, `${FIXTURE_URL}blog/post-2`, `${FIXTURE_URL}pricing`, 'https://elsewhere.test/ignored'] } })
  assert.equal(report.pages.internalCount, before + 3)
  assert.equal(report.pages.byType.blog, 2)
  assert.ok(report.pages.pages.filter((p) => p.fromSitemap).length === 3)
  assert.equal(report.reach.organicContentLikely, true)
  assert.match(report.pages.source, /sitemap/)
})
