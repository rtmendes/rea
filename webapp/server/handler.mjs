// Framework-agnostic request handler shared by the Node server and the Vercel function.

import { analyzeUrl } from './analyze/index.mjs'
import { FetchBlockedError } from './analyze/fetch.mjs'

const inflight = new Map()

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
    if (Buffer.concat(chunks).length > 64 * 1024) throw new Error('Request body too large')
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
  }
  const key = `${url}|${options.discover}|${options.fetchFirstPartyScripts}`
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
