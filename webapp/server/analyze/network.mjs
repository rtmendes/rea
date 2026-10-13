// Third-party surface: every external host the page contacts, grouped by purpose.

const HOST_CATEGORIES = [
  [/googletagmanager\.com/, 'Tag manager'], [/google-analytics\.com|analytics\.google\.com/, 'Analytics'], [/googleadservices|doubleclick\.net/, 'Advertising'],
  [/fonts\.(googleapis|gstatic)\.com/, 'Web fonts'], [/use\.typekit\.net/, 'Web fonts'], [/cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net|esm\.sh/, 'Public JS CDN'],
  [/redditstatic\.com|connect\.facebook\.net|analytics\.tiktok\.com|snap\.licdn\.com|bzrcdn\.openai\.com|pinimg\.com|ads-twitter\.com/, 'Ad pixel'],
  [/hotjar|clarity\.ms|mxpnl|segment\.com|amplitude|posthog|plausible|usefathom/, 'Analytics'], [/intercom|crisp\.chat|driftt|tawk\.to|zdassets|tidio|chat\./, 'Chat / support'],
  [/stripe\.com|paypal|lemonsqueezy|paddle\.com/, 'Payments'], [/youtube|vimeo|wistia|loom\.com/, 'Video'], [/cloudfront\.net|akamai|fastly|cloudflare\.com/, 'CDN'],
  [/supabase|firebase|amazonaws\.com|storage\.googleapis\.com/, 'Backend / storage'], [/instagram|facebook\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com|discord/, 'Social profile'],
]

function categorize(host) { return HOST_CATEGORIES.find(([re]) => re.test(host))?.[1] || 'Other' }

export function analyzeNetwork({ $, pageUrl, html }) {
  const pageUrlObj = new URL(pageUrl)
  const root = pageUrlObj.hostname.split('.').slice(-2).join('.')
  const hosts = new Map()
  const add = (raw, kind) => {
    if (!raw) return
    let u
    try { u = new URL(raw, pageUrl) } catch { return }
    if (!/^https?:$/.test(u.protocol)) return
    const host = u.hostname
    const e = hosts.get(host) || { host, kinds: new Set(), count: 0, firstParty: host === pageUrlObj.hostname || host.endsWith('.' + root), category: categorize(host), insecure: false }
    e.count++
    e.kinds.add(kind)
    // Namespace/schema URLs inside markup (xmlns, schema.org) are identifiers, not fetched resources.
    if (u.protocol === 'http:' && pageUrlObj.protocol === 'https:' && kind !== 'literal' && kind !== 'anchor') e.insecure = true
    hosts.set(host, e)
  }
  $('script[src]').each((_, el) => add($(el).attr('src'), 'script'))
  $('link[href]').each((_, el) => add($(el).attr('href'), `link:${($(el).attr('rel') || '').split(' ')[0] || 'link'}`))
  $('img[src],source[src],source[srcset],video[src],audio[src]').each((_, el) => add(($(el).attr('src') || $(el).attr('srcset') || '').split(/[\s,]/)[0], 'media'))
  $('iframe[src]').each((_, el) => add($(el).attr('src'), 'iframe'))
  $('a[href]').each((_, el) => add($(el).attr('href'), 'anchor'))
  $('form[action]').each((_, el) => add($(el).attr('action'), 'form'))
  for (const m of html.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s'"<>)]*)?/gi)) add(m[0], 'literal')

  const list = [...hosts.values()].map((h) => ({ ...h, kinds: [...h.kinds] })).sort((a, b) => Number(a.firstParty) - Number(b.firstParty) || b.count - a.count)
  const thirdParty = list.filter((h) => !h.firstParty)
  const byCategory = {}
  for (const h of thirdParty) (byCategory[h.category] ||= []).push(h.host)
  return {
    hosts: list,
    thirdPartyCount: thirdParty.length,
    byCategory,
    preconnects: $('link[rel="preconnect"],link[rel="dns-prefetch"]').map((_, el) => $(el).attr('href')).get(),
    preloads: $('link[rel="preload"],link[rel="modulepreload"]').map((_, el) => ({ href: $(el).attr('href'), as: $(el).attr('as') || null })).get(),
    mixedContent: list.filter((h) => h.insecure).map((h) => h.host),
    subdomainsOfTarget: list.filter((h) => h.firstParty && h.host !== pageUrlObj.hostname).map((h) => h.host),
  }
}
