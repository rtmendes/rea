// Content inventory: metadata, copy, pricing, contacts, languages, structured data.

function clean(text) { return (text || '').replace(/\s+/g, ' ').trim() }

const CURRENCY_RE = /(?:\b(?:US\$|R\$|USD|EUR|GBP|BRL|CAD|AUD)|[$€£¥₹])\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?(?:\s?(?:\/|per)\s?(?:mo|month|mês|mes|yr|year|ano|seat|user))?/gi
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g
const SOCIAL_HOSTS = ['instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'github.com', 'discord.gg', 'discord.com', 't.me', 'wa.me', 'whatsapp.com', 'threads.net', 'pinterest.com', 'reddit.com', 'medium.com', 'substack.com']

export function analyzeContent({ $, html, pageUrl }) {
  const meta = (name) => $(`meta[name="${name}"]`).attr('content') || null
  const prop = (p) => $(`meta[property="${p}"]`).attr('content') || null
  const metas = {}
  $('meta[name],meta[property]').each((_, el) => { const k = $(el).attr('name') || $(el).attr('property'); if (k) metas[k.toLowerCase()] = ($(el).attr('content') || '').slice(0, 300) })

  const bodyClone = $('body').clone()
  bodyClone.find('script,style,noscript,template').remove()
  const visibleText = clean(bodyClone.text())
  const words = visibleText ? visibleText.split(' ').length : 0

  const textBlocks = []
  bodyClone.find('h1,h2,h3,h4,p,li,span,div,a,button,td,th,dt,dd,blockquote,figcaption,label').each((_, el) => {
    const own = clean($(el).contents().filter((__, n) => n.type === 'text').text())
    if (own.length >= 3) textBlocks.push({ tag: el.tagName, text: own.slice(0, 240) })
  })
  const uniqueBlocks = []
  const seenText = new Set()
  for (const b of textBlocks) { if (seenText.has(b.text)) continue; seenText.add(b.text); uniqueBlocks.push(b) }

  const prices = []
  for (const m of visibleText.matchAll(CURRENCY_RE)) {
    const idx = m.index
    prices.push({ amount: m[0].trim(), context: clean(visibleText.slice(Math.max(0, idx - 60), idx + m[0].length + 60)) })
  }
  const inlineJs = $('script:not([src])').map((_, el) => $(el).html() || '').get().join('\n')
  for (const m of inlineJs.matchAll(CURRENCY_RE)) prices.push({ amount: m[0].trim(), context: 'inline script literal' })
  const uniquePrices = [...new Map(prices.map((p) => [p.amount.replace(/\s+/g, '') + (p.context === 'inline script literal' ? '|js' : ''), p])).values()].slice(0, 40)

  const emails = [...new Set([...html.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase()).filter((e) => !/\.(png|jpg|svg|webp|js|css)$/.test(e)))]
  const phones = [...new Set([...visibleText.matchAll(PHONE_RE)].map((m) => m[0].trim()).filter((p) => p.replace(/\D/g, '').length >= 8))].slice(0, 10)

  const links = $('a[href]').map((_, el) => $(el).attr('href')).get()
  const social = []
  const externalHosts = new Map()
  for (const href of links) {
    try {
      const u = new URL(href, pageUrl)
      if (u.hostname === new URL(pageUrl).hostname) continue
      externalHosts.set(u.hostname, (externalHosts.get(u.hostname) || 0) + 1)
      if (SOCIAL_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) social.push(u.toString())
    } catch { /* ignore */ }
  }

  const jsonLd = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try { const data = JSON.parse($(el).html() || 'null'); const arr = Array.isArray(data) ? data : [data]; for (const d of arr) jsonLd.push({ type: d?.['@type'] || null, name: d?.name || null }) } catch { jsonLd.push({ type: 'invalid JSON-LD', name: null }) }
  })

  const hreflang = $('link[rel="alternate"][hreflang]').map((_, el) => ({ lang: $(el).attr('hreflang'), href: $(el).attr('href') })).get()

  // Developer comments reveal language and intent of the original team.
  const htmlComments = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => clean(m[1])).filter((c) => c && !/^\[if|^End |^Google Tag Manager/i.test(c))
  const jsComments = [...inlineJs.matchAll(/\/\*([\s\S]*?)\*\/|(?:^|\s)\/\/([^\n]*)/g)].map((m) => clean(m[1] || m[2])).filter((c) => c.length > 12)
  const commentSample = [...htmlComments, ...jsComments].slice(0, 25)
  const commentLanguageHint = guessLanguage(commentSample.join(' '))

  return {
    title: clean($('title').first().text()) || null,
    description: meta('description'),
    lang: $('html').attr('lang') || null,
    canonical: $('link[rel="canonical"]').attr('href') || null,
    robotsMeta: meta('robots'),
    viewport: meta('viewport'),
    themeColor: meta('theme-color'),
    generator: meta('generator'),
    openGraph: { title: prop('og:title'), description: prop('og:description'), type: prop('og:type'), url: prop('og:url'), image: prop('og:image'), locale: prop('og:locale'), siteName: prop('og:site_name') },
    twitter: { card: meta('twitter:card'), site: meta('twitter:site'), image: meta('twitter:image') },
    icons: $('link[rel~="icon"],link[rel="apple-touch-icon"]').map((_, el) => ({ rel: $(el).attr('rel'), href: $(el).attr('href'), sizes: $(el).attr('sizes') || null })).get(),
    hreflang,
    jsonLd,
    metas,
    wordCount: words,
    textBlocks: uniqueBlocks.slice(0, 160),
    headlines: uniqueBlocks.filter((b) => /^h[1-4]$/.test(b.tag)).map((b) => b.text).slice(0, 40),
    prices: uniquePrices,
    emails,
    phones,
    socialLinks: [...new Set(social)],
    externalLinkHosts: [...externalHosts.entries()].sort((a, b) => b[1] - a[1]).map(([host, count]) => ({ host, count })),
    comments: { htmlCount: htmlComments.length, jsCount: jsComments.length, sample: commentSample, languageHint: commentLanguageHint },
    languageHint: guessLanguage(visibleText.slice(0, 4000)),
  }
}

/** Very small stop-word based language guess; returns {language, confidence}. */
export function guessLanguage(text) {
  const t = ` ${(text || '').toLowerCase()} `
  const sets = {
    english: [' the ', ' and ', ' with ', ' for ', ' you ', ' your ', ' that ', ' this ', ' from ', ' are '],
    portuguese: [' que ', ' não ', ' nao ', ' para ', ' com ', ' uma ', ' você ', ' voce ', ' pra ', ' mesmo ', ' também ', ' então ', ' já ', ' só ', ' dos ', ' das ', ' pelo ', ' pela '],
    spanish: [' que ', ' para ', ' con ', ' una ', ' los ', ' las ', ' por ', ' pero ', ' también ', ' está ', ' muy '],
    french: [' les ', ' des ', ' pour ', ' avec ', ' une ', ' est ', ' vous ', ' dans ', ' pas ', ' sur '],
    german: [' und ', ' der ', ' die ', ' das ', ' mit ', ' für ', ' nicht ', ' sie ', ' ist ', ' auf '],
  }
  let best = { language: 'unknown', score: 0 }
  const total = t.split(' ').length || 1
  for (const [language, words] of Object.entries(sets)) {
    let score = 0
    for (const w of words) score += t.split(w).length - 1
    if (score > best.score) best = { language, score }
  }
  if (!best.score) return { language: 'unknown', confidence: 0 }
  return { language: best.language, confidence: Math.min(1, Math.round((best.score / total) * 100) / 10) }
}
