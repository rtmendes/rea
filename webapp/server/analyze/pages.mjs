// Site map from the page: every internal link grouped into sections and page types, so the
// whole product surface (pricing, signup, docs, blog, legal, app) is visible from one fetch.
// Sitemap URLs (API mode) are merged in when available.

function clean(t) { return (t || '').replace(/\s+/g, ' ').trim() }

const TYPE_RULES = [
  ['home', /^\/?$/, /^(home|início|inicio|accueil|startseite)$/i],
  ['pricing', /pric|plan|preco|preço|precio|tarif|preise|checkout|assinar|subscribe/i, /pric|plan|preço|preco|precio|tarif|preise|assin/i],
  ['signup', /sign-?up|register|cadastr|registr|trial|get-?started|join|inscri/i, /sign ?up|register|create account|cadastr|registr|start free|get started|começar|começe|comece|join|inscre/i],
  ['login', /log-?in|sign-?in|entrar|acessar|auth|account|conta|minha-conta|dashboard|app\./i, /log ?in|sign ?in|entrar|acessar|my account|minha conta|dashboard/i],
  ['product', /product|feature|solution|platform|funcionalidad|recurso|solu|how-it-works|como-funciona|tour|servic/i, /product|feature|solution|platform|funcionalidade|recurso|solu|how it works|como funciona|servi/i],
  ['demo', /demo|book|schedule|agend|calendly|meeting/i, /demo|book a|schedule|agend/i],
  ['blog', /blog|news|article|post|insight|resource|journal|magazine|noticia|notícia|artigo|conteudo|conteúdo|guide|guia/i, /blog|news|article|insights?|resources|artigos|notícias|conteúdo|guides?/i],
  ['docs', /docs?|documentation|developer|api|reference|help|support|faq|knowledge|ajuda|suporte|central/i, /docs?|documentation|developers?|api|help|support|faq|ajuda|suporte|central de/i],
  ['about', /about|sobre|team|company|empresa|quem-somos|story|mission|nosotros|a-propos|uber-uns/i, /about|sobre|team|company|empresa|quem somos|our story|mission|nosotros/i],
  ['contact', /contact|contato|contacto|kontakt|fale|talk|whatsapp|tel:|mailto:/i, /contact|contato|fale|talk to|whatsapp/i],
  ['careers', /career|jobs|vagas|trabalhe|empleo|hiring|join-us/i, /careers?|jobs|vagas|trabalhe|hiring|we're hiring/i],
  ['customers', /customer|client|case-?stud|testimon|depoiment|success|stories|portfolio|cases/i, /customers?|clients?|case stud|testimon|depoiment|success stor|portfolio/i],
  ['integrations', /integrat|partner|marketplace|apps|plugins?|extensions?/i, /integrat|partners?|marketplace|apps/i],
  ['legal', /privacy|privacidade|terms|termos|legal|cookie|gdpr|lgpd|policy|politica|política|aviso|imprint|impressum|refund|reembolso/i, /privacy|privacidade|terms|termos|legal|cookie|policy|política|refund|reembolso/i],
  ['shop', /shop|store|loja|tienda|cart|carrinho|collections?|catalog|products?\/|produtos?\/|category|categoria/i, /shop|store|loja|tienda|cart|carrinho|collection|catalog|all products/i],
  ['download', /download|baixar|descargar|install|app-?store|play\.google/i, /download|baixar|descargar|install/i],
  ['changelog', /changelog|release|updates|whats-new|novidades|roadmap|status/i, /changelog|releases?|what'?s new|novidades|roadmap|status/i],
  ['community', /community|forum|discord|slack|comunidade|events?|webinar|academy|course|curso|learn/i, /community|forum|comunidade|events?|webinar|academy|courses?|curso|learn/i],
  ['affiliate', /affiliate|afiliad|referral|indique|partner-program|parceir/i, /affiliate|afiliad|referral|indique|parceir/i],
  ['search', /search|busca|buscar|pesquisa/i, /search|busca|pesquis/i],
]
const TYPE_PRIORITY = ['pricing', 'signup', 'product', 'demo', 'about', 'blog', 'customers', 'shop', 'docs', 'contact', 'login', 'integrations', 'community', 'download', 'careers', 'changelog', 'affiliate', 'legal', 'search', 'home', 'other']

function normalizeHost(h) { return h.replace(/^www\./, '').toLowerCase() }

export function classifyPage(path, label, hostIsAppSubdomain) {
  const p = path || '/'
  const l = label || ''
  if (hostIsAppSubdomain && /^\/(login|signin|auth|app|dashboard)?\/?$/i.test(p)) return 'login'
  for (const [type, pathRe, labelRe] of TYPE_RULES) if (pathRe.test(p) || labelRe.test(l)) return type
  return 'other'
}

/**
 * @param {object} input
 * @param {any} input.$ cheerio
 * @param {string} input.pageUrl
 * @param {string[]} [input.sitemapUrls]  from well-known discovery (API mode)
 */
export function analyzePages({ $, pageUrl, sitemapUrls = [] }) {
  const base = new URL(pageUrl)
  const root = normalizeHost(base.hostname).split('.').slice(-2).join('.')
  const pages = new Map()
  const external = new Map()
  const consider = (href, label, where) => {
    if (!href) return
    let u
    try { u = new URL(href, pageUrl) } catch { return }
    if (!/^https?:$/.test(u.protocol)) return
    const host = normalizeHost(u.hostname)
    const sameSite = host === normalizeHost(base.hostname) || host.endsWith('.' + root)
    if (!sameSite) { external.set(host, (external.get(host) || 0) + 1); return }
    u.hash = ''
    const key = `${u.hostname}${u.pathname.replace(/\/+$/, '') || '/'}${u.search}`
    const path = (u.pathname.replace(/\/+$/, '') || '/') + u.search
    const e = pages.get(key) || { url: u.toString(), host: u.hostname, path, labels: new Map(), count: 0, inNav: 0, inFooter: 0, inBody: 0, fromSitemap: false, depth: path === '/' ? 0 : path.split('?')[0].split('/').filter(Boolean).length, subdomain: host !== normalizeHost(base.hostname) }
    e.count++
    e[where]++
    const lab = clean(label).slice(0, 60)
    if (lab) e.labels.set(lab, (e.labels.get(lab) || 0) + 1)
    pages.set(key, e)
  }
  // In-page anchors describe the sections of a single-page site.
  const anchors = new Map()
  $('a[href^="#"]').each((_, el) => {
    const id = ($(el).attr('href') || '').slice(1)
    if (!id) return
    const e = anchors.get(id) || { id, labels: new Map(), count: 0, exists: $(`#${id.replace(/[^\w-]/g, (c) => `\\${c}`)}`).length > 0 }
    e.count++
    const lab = clean($(el).text()).slice(0, 60)
    if (lab) e.labels.set(lab, (e.labels.get(lab) || 0) + 1)
    anchors.set(id, e)
  })
  const navRoots = $('nav, header, [role="navigation"]')
  const footerRoots = $('footer, [role="contentinfo"]')
  $('a[href]').each((_, el) => {
    const $el = $(el)
    const where = navRoots.has(el).length || $el.parents('nav, header, [role="navigation"]').length ? 'inNav' : footerRoots.has(el).length || $el.parents('footer, [role="contentinfo"]').length ? 'inFooter' : 'inBody'
    consider($el.attr('href'), $el.text() || $el.attr('aria-label') || $el.attr('title'), where)
  })
  for (const u of sitemapUrls.slice(0, 2000)) {
    let parsed
    try { parsed = new URL(u) } catch { continue }
    if (!/^https?:$/.test(parsed.protocol)) continue
    const host = normalizeHost(parsed.hostname)
    if (!(host === normalizeHost(base.hostname) || host.endsWith('.' + root))) continue
    parsed.hash = ''
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    const key = `${parsed.hostname}${path}${parsed.search}`
    const e = pages.get(key) || { url: parsed.toString(), host: parsed.hostname, path, labels: new Map(), count: 0, inNav: 0, inFooter: 0, inBody: 0, fromSitemap: false, depth: path === '/' ? 0 : path.split('/').filter(Boolean).length, subdomain: host !== normalizeHost(base.hostname) }
    e.fromSitemap = true
    pages.set(key, e)
  }

  const list = [...pages.values()].map((e) => {
    const label = [...e.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
    return {
      url: e.url, host: e.host, path: e.path, label, labels: [...e.labels.keys()].slice(0, 5), count: e.count, inNav: e.inNav, inFooter: e.inFooter, inBody: e.inBody, fromSitemap: e.fromSitemap, depth: e.depth, subdomain: e.subdomain,
      section: e.subdomain ? e.host : (e.path.split('?')[0].split('/').filter(Boolean)[0] || '(root)'),
      type: classifyPage(e.path, label, e.subdomain && /^(app|my|account|dashboard|login|auth|portal)\./.test(e.host)),
    }
  }).sort((a, b) => (b.inNav - a.inNav) || (b.count - a.count) || a.path.localeCompare(b.path))

  const sections = new Map()
  for (const p of list) { const s = sections.get(p.section) || { name: p.section, count: 0, nav: 0, types: new Set(), samples: [] }; s.count++; s.nav += p.inNav ? 1 : 0; s.types.add(p.type); if (s.samples.length < 6) s.samples.push(p.path); sections.set(p.section, s) }
  const byType = {}
  for (const p of list) (byType[p.type] ||= []).push(p)

  // Pages worth rendering: one per high-value type, nav links first, never the current page.
  const current = `${base.hostname}${(base.pathname.replace(/\/+$/, '') || '/')}`
  const key = []
  for (const type of TYPE_PRIORITY) {
    if (type === 'other' || type === 'legal' || type === 'search' || type === 'home') continue
    const cands = (byType[type] || []).filter((p) => `${p.host}${p.path}` !== current && !/\.(pdf|zip|jpg|png|svg|webp|mp4)$/i.test(p.path) && !p.url.includes('mailto:'))
    const best = cands.sort((a, b) => (b.inNav - a.inNav) || (b.count - a.count))[0]
    if (best) key.push({ url: best.url, type, label: best.label, path: best.path })
    if (key.length >= 8) break
  }

  return {
    source: sitemapUrls.length ? 'links on this page + sitemap' : 'links on this page',
    internalCount: list.length,
    externalHostCount: external.size,
    maxDepth: list.reduce((m, p) => Math.max(m, p.depth), 0),
    navCount: list.filter((p) => p.inNav).length,
    footerOnlyCount: list.filter((p) => !p.inNav && !p.inBody && p.inFooter).length,
    subdomains: [...new Set(list.filter((p) => p.subdomain).map((p) => p.host))],
    sections: [...sections.values()].map((s) => ({ ...s, types: [...s.types] })).sort((a, b) => b.count - a.count),
    byType: Object.fromEntries(Object.entries(byType).sort((a, b) => TYPE_PRIORITY.indexOf(a[0]) - TYPE_PRIORITY.indexOf(b[0])).map(([t, ps]) => [t, ps.length])),
    pages: list.slice(0, 400),
    anchors: [...anchors.values()].map((a) => ({ id: a.id, label: [...a.labels.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || null, count: a.count, exists: a.exists })).sort((a, b) => b.count - a.count).slice(0, 40),
    keyPages: key,
    captures: [],
  }
}
