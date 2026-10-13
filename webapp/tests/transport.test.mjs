import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeViaFirecrawl, describeMcpError } from '../src/transport.js'
import { FIXTURE_HTML } from './fixture.mjs'

globalThis.window ??= undefined

test('analyzeViaFirecrawl builds a full report from a Firecrawl scrape payload', async () => {
  const calls = []
  const mcp = {
    async callTool(server, tool, input) {
      calls.push({ server, tool, input })
      return { payload: { rawHtml: FIXTURE_HTML, screenshot: 'https://storage.example.test/shot.png?sig=1', branding: { colorScheme: 'dark', colors: { primary: '#B22234', accent: '#00B3DD' }, fonts: [{ family: 'Brand', role: 'heading' }], brandName: 'Example' }, metadata: { url: 'https://example-target.test/', statusCode: 200, contentType: 'text/html; charset=UTF-8', favicon: 'https://example-target.test/favicon.ico' } } }
    },
  }
  const report = await analyzeViaFirecrawl('example-target.test', mcp, { screenshot: true })
  assert.equal(calls[0].server, 'Firecrawl')
  assert.equal(calls[0].tool, 'firecrawl_scrape')
  assert.equal(calls[0].input.url, 'https://example-target.test')
  assert.deepEqual(calls[0].input.formats, ['rawHtml', 'screenshot', 'branding'])
  assert.equal(report.target.source, 'Firecrawl connector')
  assert.equal(report.target.status, 200)
  assert.ok(report.technologies.some((t) => t.name === 'GSAP'))
  assert.equal(report.security.score, null, 'no headers → no header score')
  assert.equal(report.visuals.screenshot.remoteUrl, 'https://storage.example.test/shot.png?sig=1')
  assert.equal(report.visuals.screenshot.dataUrl, null)
  assert.equal(report.visuals.icon.remote, true)
  assert.equal(report.visuals.brandColor, '#00b3dd')
  assert.equal(report.visuals.firecrawlBranding.brandName, 'Example')
  assert.ok(report.limitations.some((l) => /Firecrawl connector/.test(l)))
  assert.ok(report.blueprint.components.length > 0)
  assert.equal(report.summary.title, 'Example SaaS')
})

test('analyzeViaFirecrawl accepts a JSON text payload and rejects empty results', async () => {
  const text = { async callTool() { return { payload: JSON.stringify({ rawHtml: '<html><head><title>T</title></head><body><h1>Hi</h1></body></html>', metadata: {} }) } } }
  const r = await analyzeViaFirecrawl('https://x.test/', text, { screenshot: false })
  assert.equal(r.summary.title, 'T')
  const empty = { async callTool() { return { payload: { metadata: {} } } } }
  await assert.rejects(analyzeViaFirecrawl('https://x.test/', empty), /no HTML/)
})

test('describeMcpError maps connector codes to actionable copy', () => {
  assert.match(describeMcpError({ code: 'server_not_connected' }), /Settings → Connectors/)
  assert.match(describeMcpError({ code: 'tool_error', message: 'boom' }), /boom/)
  assert.equal(describeMcpError(new Error('plain')), 'plain')
})
