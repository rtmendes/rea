// Script inventory: external libraries, inline behaviour, exposed globals, data blobs, endpoints.

function hostOf(src, pageUrl) { try { return new URL(src, pageUrl).hostname } catch { return null } }

const KNOWN_LIBS = [
  [/gsap/i, 'GSAP'], [/ScrollTrigger/i, 'GSAP ScrollTrigger'], [/lenis/i, 'Lenis'], [/jquery/i, 'jQuery'], [/react/i, 'React'], [/vue/i, 'Vue'],
  [/swiper/i, 'Swiper'], [/alpine/i, 'Alpine.js'], [/htmx/i, 'HTMX'], [/lottie/i, 'Lottie'], [/three/i, 'Three.js'], [/gtm\.js/i, 'Google Tag Manager'], [/gtag\/js/i, 'gtag'],
  [/fbevents/i, 'Meta Pixel'], [/pixel\.js/i, 'Ad pixel'], [/widget\.js/i, 'Embedded widget'], [/bootstrap/i, 'Bootstrap'], [/tailwind/i, 'Tailwind'], [/stripe/i, 'Stripe.js'],
]

export function analyzeScripts({ $, pageUrl, html }) {
  const pageHost = new URL(pageUrl).hostname
  const external = $('script[src]').map((_, el) => {
    const src = $(el).attr('src')
    const host = hostOf(src, pageUrl)
    const version = /@([0-9]+\.[0-9]+(?:\.[0-9]+)?)|\/([0-9]+\.[0-9]+\.[0-9]+)\//.exec(src || '')
    return {
      src,
      host,
      firstParty: host === pageHost || (host && host.endsWith('.' + pageHost.split('.').slice(-2).join('.'))),
      async: $(el).attr('async') !== undefined,
      defer: $(el).attr('defer') !== undefined,
      module: $(el).attr('type') === 'module',
      integrity: $(el).attr('integrity') || null,
      crossorigin: $(el).attr('crossorigin') || null,
      library: KNOWN_LIBS.find(([re]) => re.test(src || ''))?.[1] || null,
      version: version ? (version[1] || version[2]) : null,
    }
  }).get()

  const inline = []
  const inlineCodes = []
  $('script:not([src])').each((_, el) => {
    const type = $(el).attr('type') || 'text/javascript'
    const code = $(el).html() || ''
    if (!code.trim()) return
    const purpose = classifyInline(code, type)
    inlineCodes.push(code)
    inline.push({
      type,
      bytes: Buffer.byteLength(code),
      purpose,
      globals: [...new Set([...code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]))].slice(0, 20),
      listeners: [...new Set([...code.matchAll(/addEventListener\(\s*['"]([a-z]+)['"]/g)].map((m) => m[1]))],
      elementIds: [...new Set([...code.matchAll(/getElementById\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))].slice(0, 30),
      selectors: [...new Set([...code.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))].slice(0, 30),
      urls: [...new Set([...code.matchAll(/https?:\/\/[^\s'"<>)]+/g)].map((m) => m[0]))].slice(0, 20),
      usesFetch: /\bfetch\(|XMLHttpRequest|axios\./.test(code),
      usesStorage: /localStorage|sessionStorage/.test(code),
      usesCookies: /document\.cookie/.test(code),
      usesIntersectionObserver: /IntersectionObserver/.test(code),
      usesMutationObserver: /MutationObserver/.test(code),
      usesMatchMedia: /matchMedia\(/.test(code),
      usesRequestAnimationFrame: /requestAnimationFrame/.test(code),
      preview: code.trim().replace(/\s+/g, ' ').slice(0, 220),
    })
  })

  // Data blobs: window.__X = [...] / {...} and JSON script tags expose the content model.
  const dataBlobs = []
  for (const m of html.matchAll(/window\.(__[A-Za-z0-9_]+|[A-Z][A-Za-z0-9_]*Config|[A-Za-z0-9_]*Settings)\s*=\s*([\[{])/g)) {
    const start = m.index + m[0].length - 1
    const literal = sliceBalanced(html, start)
    let parsed = null
    let shape = null
    if (literal) {
      try { parsed = JSON.parse(literal); shape = describeShape(parsed) } catch { shape = describeLooseObject(literal) }
    }
    dataBlobs.push({ name: m[1], kind: m[2] === '[' ? 'array' : 'object', bytes: literal ? literal.length : null, shape, sample: literal ? literal.slice(0, 400) : null, parsed: parsed && JSON.stringify(parsed).length < 6000 ? parsed : undefined })
  }
  $('script[type="application/json"],script[type="application/ld+json"]').each((_, el) => {
    const code = $(el).html() || ''
    try { const parsed = JSON.parse(code); dataBlobs.push({ name: $(el).attr('id') || $(el).attr('type'), kind: Array.isArray(parsed) ? 'array' : 'object', bytes: code.length, shape: describeShape(parsed), sample: code.slice(0, 400) }) } catch { /* ignore */ }
  })

  const allInline = inlineCodes.join('\n')
  const ids = {
    gtm: [...new Set([...html.matchAll(/GTM-[A-Z0-9]{4,}/g)].map((m) => m[0]))],
    ga4: [...new Set([...html.matchAll(/\bG-[A-Z0-9]{8,}\b/g)].map((m) => m[0]))],
    googleAds: [...new Set([...html.matchAll(/\bAW-\d{6,}\b/g)].map((m) => m[0]))],
    metaPixel: [...new Set([...html.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,})['"]/g)].map((m) => m[1]))],
    redditPixel: [...new Set([...html.matchAll(/rdt\(\s*['"]init['"]\s*,\s*['"]([a-z0-9_]+)['"]/gi)].map((m) => m[1]))],
    openaiPixel: [...new Set([...html.matchAll(/oaiq\(\s*['"]init['"]\s*,\s*\{[^}]*pixelId:\s*['"]([A-Za-z0-9]+)['"]/g)].map((m) => m[1]))],
    tiktokPixel: [...new Set([...html.matchAll(/ttq\.load\(\s*['"]([A-Z0-9]+)['"]/g)].map((m) => m[1]))],
    hotjar: [...new Set([...html.matchAll(/hjid\s*:\s*(\d+)/g)].map((m) => m[1]))],
    clarity: [...new Set([...html.matchAll(/clarity\.ms\/tag\/([a-z0-9]+)/gi)].map((m) => m[1]))],
  }
  for (const k of Object.keys(ids)) if (!ids[k].length) delete ids[k]

  return {
    external,
    inline,
    totals: {
      external: external.length,
      thirdPartyExternal: external.filter((s) => !s.firstParty).length,
      inline: inline.length,
      inlineBytes: inline.reduce((a, b) => a + b.bytes, 0),
      withIntegrity: external.filter((s) => s.integrity).length,
    },
    dataBlobs: dataBlobs.slice(0, 20),
    trackingIds: ids,
    behaviours: summarizeBehaviours(inline, allInline),
  }
}

function classifyInline(code, type) {
  if (type === 'application/ld+json') return 'structured data'
  if (type === 'application/json' || type === 'importmap') return type
  if (/googletagmanager\.com\/gtm\.js/.test(code)) return 'Google Tag Manager loader'
  if (/gtag\(/.test(code)) return 'gtag config'
  if (/fbq\(/.test(code)) return 'Meta Pixel'
  if (/rdt\(/.test(code)) return 'Reddit Pixel'
  if (/oaiq\(/.test(code)) return 'OpenAI Pixel'
  if (/ttq\./.test(code)) return 'TikTok Pixel'
  if (/^\s*window\.[A-Za-z_$][\w$]*\s*=\s*\{/.test(code) && !/function/.test(code)) return 'configuration object'
  if (/^\s*window\.__[\w$]*\s*=/.test(code)) return 'embedded data'
  if (/gsap|ScrollTrigger|Lenis|IntersectionObserver/.test(code)) return 'animation / scroll behaviour'
  if (/addEventListener\(\s*['"]click/.test(code)) return 'UI interaction'
  if (/MutationObserver/.test(code)) return 'DOM patching'
  if (/fetch\(|XMLHttpRequest/.test(code)) return 'network / API calls'
  return 'other'
}

function summarizeBehaviours(inline, text) {
  const f = []
  const has = (re) => re.test(text)
  if (has(/role',\s*'switch'|aria-checked|toggle/i)) f.push('Toggle / switch control (e.g. monthly ↔ yearly pricing)')
  if (has(/faq|accordion|aria-expanded/i)) f.push('Accordion / FAQ expand-collapse')
  if (has(/Lenis|smooth/i)) f.push('Smooth scrolling')
  if (has(/ScrollTrigger|parallax|yPercent/i)) f.push('Scroll-linked parallax / reveal animation')
  if (inline.some((i) => i.usesIntersectionObserver)) f.push('Reveal-on-scroll via IntersectionObserver')
  if (has(/scrollTo|scrollIntoView/i)) f.push('Anchor navigation with programmatic scroll')
  if (has(/matchMedia\(['"]\(prefers-reduced-motion/i)) f.push('Respects prefers-reduced-motion')
  if (has(/innerWidth|resize/i)) f.push('Responsive scaling computed in JS')
  if (inline.some((i) => i.usesFetch)) f.push('Client-side API calls')
  if (inline.some((i) => i.usesStorage)) f.push('Browser storage (localStorage/sessionStorage)')
  if (has(/lang=|__dvo|i18n|translate/i)) f.push('Multi-language content switching')
  return f
}

function sliceBalanced(text, start) {
  const open = text[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inString = null
  for (let i = start; i < text.length && i - start < 200_000; i++) {
    const ch = text[i]
    if (inString) { if (ch === '\\') { i++; continue } if (ch === inString) inString = null; continue }
    if (ch === '"' || ch === "'") { inString = ch; continue }
    if (ch === open) depth++
    else if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}

export function describeShape(value, depth = 0) {
  if (depth > 3) return '…'
  if (Array.isArray(value)) return value.length ? `array(${value.length}) of ${describeShape(value[0], depth + 1)}` : 'array(0)'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return `{ ${keys.slice(0, 12).map((k) => `${k}: ${describeShape(value[k], depth + 1)}`).join(', ')}${keys.length > 12 ? ', …' : ''} }`
  }
  return typeof value
}

function describeLooseObject(literal) {
  const keys = [...new Set([...literal.matchAll(/(?:^|[{,]\s*)([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]))]
  return keys.length ? `{ ${keys.slice(0, 20).join(', ')}${keys.length > 20 ? ', …' : ''} }` : 'non-JSON literal'
}
