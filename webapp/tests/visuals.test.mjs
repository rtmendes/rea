import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as cheerio from 'cheerio'
import { selectIcons } from '../server/analyze/visuals.mjs'
import { captureScreenshot, findChromium } from '../server/screenshot.mjs'

test('selectIcons ranks apple-touch-icon and SVG above small favicons and appends /favicon.ico', () => {
  const $ = cheerio.load(`<html><head>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
    <link rel="alternate icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="stylesheet" href="/x.css">
  </head></html>`)
  const icons = selectIcons($, 'https://example-target.test/page/')
  assert.equal(icons[0].url, 'https://example-target.test/apple-touch-icon.png')
  assert.equal(icons[1].url, 'https://example-target.test/favicon.svg')
  assert.ok(icons.some((i) => i.url === 'https://example-target.test/favicon.ico'))
  assert.ok(!icons.some((i) => i.url.endsWith('x.css')))
  assert.equal(icons.filter((i) => i.url.endsWith('favicon.ico')).length, 1)
})

test('selectIcons falls back to /favicon.ico when nothing is declared', () => {
  const icons = selectIcons(cheerio.load('<html><head></head></html>'), 'https://example-target.test/')
  assert.deepEqual(icons.map((i) => i.url), ['https://example-target.test/favicon.ico'])
})

test('captureScreenshot reports a reason instead of throwing when screenshots are disabled', async () => {
  const prev = process.env.REA_DISABLE_SCREENSHOTS
  process.env.REA_DISABLE_SCREENSHOTS = '1'
  try {
    assert.equal(findChromium(), null)
    const r = await captureScreenshot('https://example-target.test/')
    assert.match(r.error, /No local Chromium/)
    assert.equal(r.dataUrl, undefined)
  } finally {
    if (prev === undefined) delete process.env.REA_DISABLE_SCREENSHOTS; else process.env.REA_DISABLE_SCREENSHOTS = prev
  }
})
