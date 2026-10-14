import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dehydrate, rehydrate, siteId, imageSlots } from '../src/images.js'
import { dbSave, dbLoad, dbList, dbRemove } from '../src/artifactdb.js'
import { exportLibrary, importLibrary, saveReport, listEntries, entryFromReport } from '../src/store.js'

globalThis.atob ??= (b) => Buffer.from(b, 'base64').toString('binary')

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function sampleReport(url = 'https://example-target.test/') {
  return {
    reportVersion: 3, generatedAt: '2026-10-13T20:00:00.000Z', durationMs: 5,
    target: { finalUrl: url, headers: {}, status: 200, bytes: 10, timing: {}, redirects: [], addresses: [] },
    summary: { title: 'Example', description: 'd', siteType: 'landing page', technologyCount: 2, thirdPartyHosts: 1, securityScore: null },
    design: { colors: { palette: [{ hex: '#000000' }], mode: 'dark', roles: {} } },
    technologies: [], pages: { internalCount: 3, captures: [{ ok: true, url: `${url}pricing`, dataUrl: PNG, full: { dataUrl: PNG } }] },
    keywords: { focus: { term: 'example' }, terms: [{ term: 'example' }] }, audience: { summary: { who: 'sellers', budget: 'US$39' }, model: { label: 'B2B' } },
    visuals: { screenshot: { dataUrl: PNG, width: 1, height: 1 }, fullPage: { dataUrl: PNG }, icon: { dataUrl: 'https://example-target.test/favicon.ico', remote: true }, ogImage: null, brandColor: '#00b3dd', mode: 'dark' },
  }
}

test('siteId is stable, path-safe and distinct per URL', () => {
  assert.equal(siteId('https://a.test/'), siteId('https://a.test/'))
  assert.notEqual(siteId('https://a.test/'), siteId('https://b.test/'))
  assert.match(siteId('https://a.test/x?y=1'), /^[0-9a-f]+$/)
})

test('dehydrate moves embedded images to storage paths and rehydrate puts URLs back', async () => {
  const report = sampleReport()
  const { report: stored, blobs } = dehydrate(report, 'uid/site')
  assert.equal(blobs.length, 4, 'screenshot, fullPage, capture thumb, capture full')
  assert.ok(blobs.every((b) => b.path.startsWith('uid/site/') && b.path.endsWith('.png') && b.type === 'image/png'))
  assert.equal(stored.visuals.screenshot.dataUrl, null)
  assert.equal(stored.visuals.screenshot.storagePath, 'uid/site/screenshot.png')
  assert.equal(stored.visuals.icon.dataUrl, 'https://example-target.test/favicon.ico', 'remote icon URL untouched')
  assert.equal(report.visuals.screenshot.dataUrl, PNG, 'original report untouched')
  const back = await rehydrate(stored, async (paths) => new Map(paths.map((p) => [p, `https://signed.test/${p}`])))
  assert.equal(back.visuals.screenshot.dataUrl, 'https://signed.test/uid/site/screenshot.png')
  assert.equal(back.pages.captures[0].full.dataUrl, 'https://signed.test/uid/site/page-0-full.png')
  assert.equal(imageSlots(back).length, 5)
})

function fakeDb() {
  const docs = new Map()
  const makeDoc = (path) => ({
    path,
    async get() { const d = docs.get(path); return { exists: Boolean(d), id: path.split('/').pop(), data: () => d } },
    async set(data) { docs.set(path, data) },
    async delete() { docs.delete(path) },
    collection(name) { return makeCol(`${path}/${name}`) },
  })
  const makeCol = (path) => ({
    doc(id) { return makeDoc(`${path}/${id}`) },
    orderBy() { return this }, limit() { return this },
    async get() { const rows = [...docs.entries()].filter(([k]) => k.startsWith(`${path}/`) && k.split('/').length === path.split('/').length + 1); return { docs: rows.map(([k, v]) => ({ exists: true, id: k.split('/').pop(), data: () => v })) } },
  })
  return { docs, ctx: { root: makeDoc('data/users/u1/library') } }
}

test('artifact db store splits large reports into parts and restores them', async () => {
  const { docs, ctx } = fakeDb()
  const report = sampleReport()
  report.padding = 'x'.repeat(400_000)
  const entry = entryFromReport(report)
  await dbSave(ctx, report, entry)
  const head = docs.get(`data/users/u1/library/sites/${siteId(entry.url)}`)
  assert.equal(head.parts, 3)
  assert.equal(head.thumb, null, 'embedded thumbnail not stored in the db')
  const loaded = await dbLoad(ctx, entry.url)
  assert.equal(loaded.padding.length, 400_000)
  assert.equal(loaded.summary.title, 'Example')
  assert.equal((await dbList(ctx)).length, 1)
  // A shorter re-save removes stale parts.
  delete report.padding
  await dbSave(ctx, report, entry)
  assert.equal(docs.get(`data/users/u1/library/sites/${siteId(entry.url)}`).parts, 1)
  assert.ok(![...docs.keys()].some((k) => k.endsWith('/parts/2')))
  await dbRemove(ctx, entry.url)
  assert.equal([...docs.keys()].filter((k) => k.includes('/sites/')).length, 0)
})

test('library export/import round-trips and keeps the newer report', async () => {
  const a = sampleReport('https://one.test/')
  await saveReport(a)
  const dump = await exportLibrary()
  assert.equal(dump.format, 'rea-webapp-library')
  assert.ok(dump.items.some((i) => i.entry.url === 'https://one.test/'))
  const older = { ...a, generatedAt: '2020-01-01T00:00:00.000Z' }
  const r1 = await importLibrary({ format: 'rea-webapp-library', version: 1, items: [{ report: older }] })
  assert.equal(r1.skipped, 1, 'older copy skipped')
  const newer = { ...a, generatedAt: '2030-01-01T00:00:00.000Z', target: { ...a.target, finalUrl: 'https://two.test/' } }
  const r2 = await importLibrary({ format: 'rea-webapp-library', version: 1, items: [{ report: newer }, { report: {} }] })
  assert.equal(r2.added, 1)
  assert.equal(r2.skipped, 1)
  assert.ok((await listEntries()).some((e) => e.url === 'https://two.test/'))
  await assert.rejects(importLibrary({ nope: true }), /Not a rea-webapp library file/)
})

test('entryFromReport carries the new card fields', () => {
  const e = entryFromReport(sampleReport())
  assert.equal(e.pageCount, 3)
  assert.equal(e.focusKeyword, 'example')
  assert.equal(e.audience, 'sellers')
  assert.equal(e.hasFullPage, true)
  assert.equal(e.captures, 1)
})
