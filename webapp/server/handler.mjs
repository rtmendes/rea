// Framework-agnostic request handler shared by the Node server and the Vercel function.

import { analyzeUrl } from './analyze/index.mjs'
import { FetchBlockedError, assertPublicHost, normalizeTargetUrl } from './analyze/fetch.mjs'
import { captureScreenshot } from './screenshot.mjs'
import { OMNICANVAS_API, folderFromName, importBoard, pushBoard, validateBoard } from '../shared/omnicanvas.mjs'

const inflight = new Map()

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function readJson(req, limit = 64 * 1024) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    chunks.push(chunk)
    size += chunk.length
    if (size > limit) throw new Error('Request body too large')
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

export async function handleAnalyze(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  let params = {}
  try {
    if (req.method === 'POST') params = await readJson(req)
    else if (req.method === 'GET') params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
    else return send(res, 405, { error: 'Use GET ?url= or POST {"url": ...}' })
  } catch (error) {
    return send(res, 400, { error: `Invalid request body: ${error.message}` })
  }
  const url = typeof params.url === 'string' ? params.url.trim() : ''
  if (!url) return send(res, 400, { error: 'Missing "url" parameter.' })
  const options = {
    discover: params.discover !== 'false' && params.discover !== false,
    fetchFirstPartyScripts: params.scripts !== 'false' && params.scripts !== false,
    screenshot: params.screenshot !== 'false' && params.screenshot !== false,
  }
  const key = `${url}|${options.discover}|${options.fetchFirstPartyScripts}|${options.screenshot}`
  try {
    let pending = inflight.get(key)
    if (!pending) {
      pending = analyzeUrl(url, options).finally(() => inflight.delete(key))
      inflight.set(key, pending)
    }
    const report = await pending
    return send(res, 200, report)
  } catch (error) {
    if (error instanceof FetchBlockedError) return send(res, 400, { error: error.message, details: error.details })
    console.error('analyze failed', error)
    return send(res, 500, { error: `Analysis failed: ${error.message}` })
  }
}

/** POST /api/capture {url, fullPage?, mobile?} → one rendered screenshot of a public page. */
export async function handleCapture(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  let params = {}
  try {
    if (req.method === 'POST') params = await readJson(req)
    else if (req.method === 'GET') params = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
    else return send(res, 405, { error: 'Use GET ?url= or POST {"url": ...}' })
  } catch (error) {
    return send(res, 400, { error: `Invalid request body: ${error.message}` })
  }
  const raw = typeof params.url === 'string' ? params.url.trim() : ''
  if (!raw) return send(res, 400, { error: 'Missing "url" parameter.' })
  try {
    const url = normalizeTargetUrl(raw)
    await assertPublicHost(new URL(url))
    const shot = await captureScreenshot(url, { fullPage: params.fullPage === true || params.fullPage === 'true', mobile: params.mobile === true || params.mobile === 'true' })
    if (shot.error && !shot.dataUrl && !shot.remoteUrl) return send(res, 502, { error: shot.error })
    return send(res, 200, { url, ...shot })
  } catch (error) {
    if (error instanceof FetchBlockedError) return send(res, 400, { error: error.message, details: error.details })
    return send(res, 500, { error: `Capture failed: ${error.message}` })
  }
}

/**
 * POST /api/omnicanvas from the server (no browser CORS involved). Two modes:
 *   {key, name, graph, folder?, labels?} → creates a NEW board in a folder (import key,
 *       OmniCanvas Settings → Import; POST /api/v1/import/boards).
 *   {token, name, graph} → replaces an existing board (board token, Share → API access).
 * The destination host is fixed (OMNICANVAS_API env or the default); only the credential varies.
 */
export async function handleOmniCanvas(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' })
  let body
  try { body = await readJson(req, 1024 * 1024) } catch (e) { return send(res, 400, { error: e.message }) }
  const { key, token, name, graph, folder, labels } = body || {}
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return send(res, 400, { error: 'graph {nodes, edges} is required.' })
  const problems = validateBoard(graph)
  if (problems.length) return send(res, 400, { error: `Board graph is invalid: ${problems.slice(0, 3).join('; ')}` })
  try {
    const common = { name: String(name || 'REA board').slice(0, 200), graph, apiBase: process.env.OMNICANVAS_API || OMNICANVAS_API, signal: AbortSignal.timeout(30000) }
    const result = key
      ? await importBoard({ ...common, key, folder: String(folder || folderFromName(name)).slice(0, 300), labels: Array.isArray(labels) ? labels.slice(0, 10).map(String) : undefined })
      : await pushBoard({ ...common, token })
    return send(res, 200, result)
  } catch (e) {
    return send(res, e.status && e.status < 500 ? 400 : 502, { error: e.message })
  }
}
