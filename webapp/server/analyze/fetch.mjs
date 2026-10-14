// Safe outbound fetching for the analyzer.
//
// Every hop (including redirects) is checked against an SSRF guard: only
// http(s) URLs whose hostnames resolve to public unicast addresses are fetched.
// Bodies are capped so a hostile or enormous page cannot exhaust memory.

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 rea-webapp/0.1'

export const LIMITS = {
  maxRedirects: 5,
  timeoutMs: 20_000,
  maxBodyBytes: 3 * 1024 * 1024,
  maxAssetBytes: 1024 * 1024,
}

const PRIVATE_V4 = [
  [/^0\./, 'this-network'],
  [/^10\./, 'private'],
  [/^127\./, 'loopback'],
  [/^169\.254\./, 'link-local'],
  [/^172\.(1[6-9]|2\d|3[01])\./, 'private'],
  [/^192\.168\./, 'private'],
  [/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, 'shared-address-space'],
  [/^192\.0\.0\./, 'ietf-protocol'],
  [/^192\.0\.2\.|^198\.51\.100\.|^203\.0\.113\./, 'documentation'],
  [/^198\.1[89]\./, 'benchmarking'],
  [/^22[4-9]\.|^23\d\./, 'multicast'],
  [/^24\d\.|^25[0-5]\./, 'reserved'],
]

/** Returns a reason string when the address must not be contacted, else null. */
export function classifyBlockedAddress(address) {
  const family = isIP(address)
  if (family === 4) {
    for (const [re, reason] of PRIVATE_V4) if (re.test(address)) return reason
    return null
  }
  if (family === 6) {
    const a = address.toLowerCase()
    if (a === '::' || a === '::1') return 'loopback'
    if (a.startsWith('fe80:') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb')) return 'link-local'
    if (/^f[cd]/.test(a)) return 'private'
    if (a.startsWith('ff')) return 'multicast'
    if (a.startsWith('::ffff:')) return classifyBlockedAddress(a.slice(7))
    if (a.startsWith('64:ff9b:')) return 'nat64'
    return null
  }
  return 'not-an-ip'
}

export class FetchBlockedError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'FetchBlockedError'
    this.details = details
  }
}

/** Parses user input into an absolute http(s) URL or throws. */
export function normalizeTargetUrl(input) {
  if (typeof input !== 'string' || !input.trim()) throw new FetchBlockedError('A URL is required.', { code: 'missing_url' })
  let text = input.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`
  let url
  try {
    url = new URL(text)
  } catch {
    throw new FetchBlockedError(`Not a valid URL: ${input}`, { code: 'invalid_url' })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchBlockedError(`Only http and https URLs are supported (got ${url.protocol}).`, { code: 'unsupported_scheme' })
  }
  if (url.username || url.password) {
    url.username = ''
    url.password = ''
  }
  url.hash = ''
  return url
}

/** Resolves the hostname and throws when any resolved address is non-public. */
export async function assertPublicHost(url) {
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new FetchBlockedError(`Refusing to fetch a local hostname: ${host}`, { code: 'blocked_host', host })
  }
  const literal = isIP(host)
  if (literal) {
    const reason = classifyBlockedAddress(host)
    if (reason) throw new FetchBlockedError(`Refusing to fetch ${reason} address ${host}`, { code: 'blocked_address', host, reason })
    return [host]
  }
  let records
  try {
    records = await lookup(host, { all: true, verbatim: true })
  } catch (error) {
    throw new FetchBlockedError(`DNS lookup failed for ${host}: ${error.code || error.message}`, { code: 'dns_failed', host })
  }
  if (!records.length) throw new FetchBlockedError(`DNS lookup returned no addresses for ${host}`, { code: 'dns_empty', host })
  for (const record of records) {
    const reason = classifyBlockedAddress(record.address)
    if (reason) {
      throw new FetchBlockedError(`Refusing to fetch ${host}: resolves to ${reason} address ${record.address}`, {
        code: 'blocked_address',
        host,
        address: record.address,
        reason,
      })
    }
  }
  return records.map((r) => r.address)
}

async function readBounded(response, maxBytes) {
  if (!response.body) return { buffer: Buffer.alloc(0), truncated: false }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)))
      truncated = true
      try { await reader.cancel() } catch { /* ignore */ }
      break
    }
    chunks.push(value)
  }
  return { buffer: Buffer.concat(chunks), truncated }
}

function headersToObject(headers) {
  const out = {}
  for (const [key, value] of headers.entries()) {
    const k = key.toLowerCase()
    out[k] = out[k] ? `${out[k]}, ${value}` : value
  }
  return out
}

/**
 * Fetches a URL following redirects manually so every hop is guarded.
 * Returns { url, finalUrl, status, headers, body (Buffer), text, truncated, timing, redirects, addresses }.
 */
export async function guardedFetch(input, options = {}) {
  const { maxBytes = LIMITS.maxBodyBytes, timeoutMs = LIMITS.timeoutMs, method = 'GET', accept = '*/*' } = options
  let url = input instanceof URL ? input : normalizeTargetUrl(input)
  const redirects = []
  const started = performance.now()
  let addresses = []
  for (let hop = 0; hop <= LIMITS.maxRedirects; hop++) {
    addresses = await assertPublicHost(url)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response
    const hopStart = performance.now()
    try {
      response = await fetch(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': DEFAULT_USER_AGENT,
          accept,
          'accept-language': 'en-US,en;q=0.9',
        },
      })
    } catch (error) {
      clearTimeout(timer)
      const reason = error.name === 'AbortError' ? `timed out after ${timeoutMs} ms` : (error.cause?.code || error.message)
      throw new FetchBlockedError(`Fetch failed for ${url}: ${reason}`, { code: 'fetch_failed', url: url.toString(), reason })
    }
    const ttfbMs = Math.round(performance.now() - hopStart)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      clearTimeout(timer)
      const location = response.headers.get('location')
      redirects.push({ from: url.toString(), status: response.status, location })
      if (!location) throw new FetchBlockedError(`Redirect without Location from ${url}`, { code: 'bad_redirect' })
      try { await response.body?.cancel() } catch { /* ignore */ }
      const next = new URL(location, url)
      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new FetchBlockedError(`Redirect to unsupported scheme ${next.protocol}`, { code: 'unsupported_scheme' })
      }
      url = next
      continue
    }
    let body
    try {
      body = await readBounded(response, maxBytes)
    } finally {
      clearTimeout(timer)
    }
    const totalMs = Math.round(performance.now() - started)
    return {
      url: (input instanceof URL ? input : normalizeTargetUrl(input)).toString(),
      finalUrl: url.toString(),
      status: response.status,
      statusText: response.statusText,
      headers: headersToObject(response.headers),
      body: body.buffer,
      text: body.buffer.toString('utf8'),
      truncated: body.truncated,
      timing: { ttfbMs, totalMs },
      redirects,
      addresses,
    }
  }
  throw new FetchBlockedError(`Too many redirects (more than ${LIMITS.maxRedirects})`, { code: 'too_many_redirects', redirects })
}

/** Fetches a secondary asset (robots, sitemap, script) and never throws; failures are reported inline. */
export async function fetchAsset(url, options = {}) {
  try {
    const result = await guardedFetch(url, { maxBytes: LIMITS.maxAssetBytes, timeoutMs: 12_000, ...options })
    return { ok: result.status >= 200 && result.status < 300, ...result }
  } catch (error) {
    return { ok: false, url: String(url), error: error.message, details: error.details || null }
  }
}
