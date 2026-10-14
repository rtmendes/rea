import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as cheerio from 'cheerio'
import { analyzeDocument } from '../server/analyze/core.mjs'
import { buildPrompt, digestReport, evaluate, handoffMarkdown, handoffPayload, heuristicEvaluation, newPortfolioItem, EVALUATION_SCHEMA, VERDICT_STAGE, STAGES } from '../src/agent.js'
import { FIXTURE_HTML, FIXTURE_HEADERS, FIXTURE_URL } from './fixture.mjs'

function report() {
  return analyzeDocument({ load: cheerio.load, html: FIXTURE_HTML, target: { input: FIXTURE_URL, url: FIXTURE_URL, finalUrl: FIXTURE_URL, status: 200, headers: FIXTURE_HEADERS, bytes: 1, timing: {}, redirects: [], addresses: [], contentType: 'text/html' } }).report
}

test('digest keeps evidence fields and drops bulk', () => {
  const d = digestReport(report())
  assert.equal(d.url, FIXTURE_URL)
  assert.ok(d.keywords.length && d.pricing.observed === 3)
  assert.ok(!('html' in d) && JSON.stringify(d).length < 20000)
})

test('heuristic routes to new_offer without a portfolio and to enrich_existing on overlap', async () => {
  const r = report()
  const none = heuristicEvaluation(r, { items: [] })
  assert.equal(none.verdict, 'new_offer')
  assert.equal(none.agent, 'heuristic')
  assert.ok(none.score >= 0 && none.score <= 100)
  assert.ok(none.offerIdea.priceAnchor.includes('39'))
  const portfolio = { items: [newPortfolioItem({ name: 'Seller Intelligence Suite', type: 'offer', audience: 'online sellers and ecommerce teams', keywords: 'intelligence sellers pricing ads store' })] }
  const hit = heuristicEvaluation(r, portfolio)
  assert.equal(hit.verdict, 'enrich_existing')
  assert.equal(hit.mapsTo[0].name, 'Seller Intelligence Suite')
  const viaEvaluate = await evaluate(r, portfolio, {})
  assert.equal(viaEvaluate.agent, 'heuristic')
  assert.deepEqual(viaEvaluate.fallbackErrors, [])
  assert.ok(STAGES.some(([key]) => key === VERDICT_STAGE[hit.verdict]))
})

test('evaluate falls back to the heuristic when a model provider fails', async () => {
  const r = report()
  const result = await evaluate(r, { items: [] }, { apiKey: 'bad', model: 'claude-opus-5-5', proxy: { url: 'http://127.0.0.1:9/offer-agent', headers: {} } })
  assert.equal(result.agent, 'heuristic')
  assert.equal(result.fallbackErrors.length, 2)
})

test('prompt and hand-off carry portfolio, digest and an original-offer instruction', () => {
  const r = report()
  const portfolio = { items: [newPortfolioItem({ name: 'Brand X', type: 'brand' })] }
  const prompt = buildPrompt(r, portfolio)
  assert.match(prompt, /PORTFOLIO \(1 items\)/)
  assert.match(prompt, /never copy the site's name/)
  const ev = heuristicEvaluation(r, portfolio)
  const md = handoffMarkdown(r, ev, portfolio)
  assert.match(md, /^# Offer pipeline hand-off/)
  assert.match(md, /Prompt for the offer creation assistant/)
  assert.match(md, /Do not reuse the source site's copy/)
  const payload = handoffPayload(r, ev, portfolio)
  assert.equal(payload.format, 'rea-webapp-handoff')
  assert.ok(payload.designTokensCss.startsWith(':root'))
  assert.ok(EVALUATION_SCHEMA.required.includes('offerIdea'))
})
