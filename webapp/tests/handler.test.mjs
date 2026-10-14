import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server } from '../server/index.mjs'

async function withServer(fn) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try { await fn(base) } finally { await new Promise((resolve) => server.close(resolve)) }
}

test('health endpoint responds', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`)
    assert.deepEqual(await res.json(), { ok: true })
  })
})

test('analyze rejects missing, invalid and local URLs with 400', async () => {
  await withServer(async (base) => {
    let res = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    assert.equal(res.status, 400)
    res = await fetch(`${base}/api/analyze?url=ftp://x`)
    assert.equal(res.status, 400)
    res = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'http://127.0.0.1:1/' }) })
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.match(body.error, /Refusing/)
    res = await fetch(`${base}/api/analyze`, { method: 'PUT' })
    assert.equal(res.status, 405)
  })
})

test('omnicanvas route validates the board before forwarding and rejects other methods', async () => {
  await withServer(async (base) => {
    let res = await fetch(`${base}/api/omnicanvas`)
    assert.equal(res.status, 405)
    res = await fetch(`${base}/api/omnicanvas`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'tok_12345678' }) })
    assert.equal(res.status, 400)
    const bad = { nodes: [{ id: 'a', type: 'editor', position: { x: 0, y: 0 }, data: { title: 'a', category: 'generator', content: {} } }], edges: [{ id: 'e', source: 'a', target: 'a' }] }
    res = await fetch(`${base}/api/omnicanvas`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'tok_12345678', graph: bad }) })
    assert.equal(res.status, 400)
    assert.match((await res.json()).error, /self-loop/)
  })
})
