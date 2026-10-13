// Screenshot capture with a locally installed Chromium (never downloaded by this app).
// The browser is launched lazily, reused across requests and closed after idle time.
// Every request the page makes is checked against the same public-host guard as the
// analyzer, so a page cannot pull the renderer into private networks.

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { assertPublicHost, fetchAsset } from './analyze/fetch.mjs'

const IDLE_CLOSE_MS = 60_000
const NAV_TIMEOUT_MS = 15_000
const SETTLE_MS = 900
const VIEWPORT = { width: 1280, height: 800 }
const SCALE = 0.5 // 640×400 JPEG thumbnail: small enough for browser history, sharp enough for cards

let browserPromise = null
let idleTimer = null
let hostCache = new Map()

function candidatePaths() {
  const out = []
  if (process.env.REA_CHROMIUM_PATH) out.push(process.env.REA_CHROMIUM_PATH)
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(process.env.HOME || '', '.cache', 'ms-playwright'), '/opt/pw-browsers'].filter(Boolean)
  for (const root of roots) {
    if (!existsSync(root)) continue
    let entries = []
    try { entries = readdirSync(root) } catch { continue }
    for (const e of entries.sort().reverse()) {
      if (e.startsWith('chromium_headless_shell-')) out.push(join(root, e, 'chrome-linux', 'headless_shell'), join(root, e, 'chrome-mac', 'headless_shell'))
      if (e.startsWith('chromium-')) out.push(join(root, e, 'chrome-linux', 'chrome'), join(root, e, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'))
    }
  }
  out.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium')
  return out
}

/** Returns the Chromium executable this machine offers, or null. */
export function findChromium() {
  if (process.env.REA_DISABLE_SCREENSHOTS === '1') return null
  return candidatePaths().find((p) => { try { return existsSync(p) } catch { return false } }) || null
}

async function getBrowser(executablePath) {
  if (!browserPromise) {
    browserPromise = import('playwright-core').then(({ chromium }) => chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] }))
    browserPromise.then((b) => b.on('disconnected', () => { browserPromise = null }), () => { browserPromise = null })
  }
  clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => { const p = browserPromise; browserPromise = null; try { (await p)?.close() } catch { /* ignore */ } }, IDLE_CLOSE_MS)
  idleTimer.unref?.()
  return browserPromise
}

async function hostAllowed(hostname) {
  if (hostCache.has(hostname)) return hostCache.get(hostname)
  const p = assertPublicHost(new URL(`https://${hostname}/`)).then(() => true, () => false)
  hostCache.set(hostname, p)
  if (hostCache.size > 2000) hostCache = new Map()
  return p
}

/**
 * Captures a viewport screenshot. Returns { dataUrl, width, height, capturedAt, engine } or
 * { error } when no Chromium is available or the page could not be rendered in time.
 */
export async function captureScreenshot(url, { fullPage = false } = {}) {
  const executablePath = findChromium()
  if (!executablePath) return captureViaFirecrawl(url)
  let context
  try {
    const browser = await getBrowser(executablePath)
    context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, ignoreHTTPSErrors: true, javaScriptEnabled: true, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 rea-webapp/0.1', acceptDownloads: false, reducedMotion: 'reduce' })
    await context.route('**/*', async (route) => {
      const req = route.request()
      let host
      try { host = new URL(req.url()).hostname } catch { return route.abort() }
      if (!/^https?:$/.test(new URL(req.url()).protocol)) return route.abort()
      return (await hostAllowed(host)) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(NAV_TIMEOUT_MS)
    let navError = null
    try { await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS }) } catch (e) { navError = e.message }
    await page.waitForTimeout(SETTLE_MS).catch(() => {})
    const buffer = await page.screenshot({ type: 'jpeg', quality: 72, fullPage, timeout: 8000 })
    return {
      dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
      width: Math.round(VIEWPORT.width * SCALE),
      height: Math.round(VIEWPORT.height * SCALE),
      capturedAt: new Date().toISOString(),
      engine: executablePath,
      partial: navError ? `Page did not finish loading: ${navError.split('\n')[0]}` : null,
    }
  } catch (error) {
    return { error: `Screenshot failed: ${error.message.split('\n')[0]}` }
  } finally {
    try { await context?.close() } catch { /* ignore */ }
  }
}

export async function closeBrowser() {
  clearTimeout(idleTimer)
  const p = browserPromise
  browserPromise = null
  try { (await p)?.close() } catch { /* ignore */ }
}

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape'
const MAX_REMOTE_SCREENSHOT_BYTES = 1024 * 1024

/**
 * Fallback for hosts without Chromium (Vercel, containers): ask Firecrawl for a screenshot.
 * Uses FIRECRAWL_API_KEY when set, otherwise Firecrawl's rate-limited keyless free tier.
 * The image is embedded when it is at most 1 MB; otherwise only its time-limited URL is kept.
 */
export async function captureViaFirecrawl(url) {
  if (process.env.REA_DISABLE_SCREENSHOTS === '1') return { error: 'Screenshots disabled (REA_DISABLE_SCREENSHOTS=1).' }
  const apiKey = process.env.FIRECRAWL_API_KEY || ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(FIRECRAWL_API, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ url, formats: ['screenshot'], onlyMainContent: false, maxAge: 0 }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) return { error: `No local Chromium; Firecrawl screenshot failed (${res.status}): ${(body?.error || '').toString().slice(0, 160) || 'unknown error'}` }
    const remoteUrl = body.data?.screenshot
    if (typeof remoteUrl !== 'string' || !/^https?:\/\//.test(remoteUrl)) return { error: 'No local Chromium; Firecrawl returned no screenshot.' }
    const img = await fetchAsset(remoteUrl, { accept: 'image/*', maxBytes: MAX_REMOTE_SCREENSHOT_BYTES })
    const type = img.ok ? (img.headers?.['content-type'] || 'image/png').split(';')[0] : null
    return {
      dataUrl: img.ok && !img.truncated ? `data:${type};base64,${img.body.toString('base64')}` : null,
      remoteUrl,
      width: null,
      height: null,
      capturedAt: new Date().toISOString(),
      engine: apiKey ? 'Firecrawl API (key)' : 'Firecrawl API (keyless)',
      partial: img.ok && !img.truncated ? null : 'Screenshot larger than 1 MB kept as a time-limited link only.',
    }
  } catch (error) {
    return { error: `No local Chromium; Firecrawl screenshot failed: ${error.message.split('\n')[0]}` }
  } finally {
    clearTimeout(timer)
  }
}
