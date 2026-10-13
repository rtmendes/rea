// Local server: serves the built UI from dist/ and exposes POST/GET /api/analyze.

import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAnalyze, handleCapture } from './handler.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist')
const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '127.0.0.1'

const MIME = { '.webmanifest': 'application/manifest+json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json' }

function serveStatic(req, res) {
  if (!existsSync(dist)) {
    res.statusCode = 503
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('UI not built. Run "npm run build" (or use "npm run dev" for the Vite dev server with API proxy).')
    return
  }
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  let file = normalize(join(dist, pathname))
  if (!file.startsWith(dist)) { res.statusCode = 403; res.end(); return }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html')
  res.statusCode = 200
  res.setHeader('content-type', MIME[extname(file)] || 'application/octet-stream')
  if (/\/assets\//.test(file)) res.setHeader('cache-control', 'public, max-age=31536000, immutable')
  createReadStream(file).pipe(res)
}

export const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (pathname === '/api/analyze') return handleAnalyze(req, res)
  if (pathname === '/api/capture') return handleCapture(req, res)
  if (pathname === '/api/health') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ ok: true })) }
  return serveStatic(req, res)
})

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, host, () => console.log(`rea-webapp listening on http://${host}:${port}`))
}
