// Reach and traffic *signals* observable from the page itself. No visitor counts are measured or
// estimated here; the block says so and links to public tools that hold such estimates.

export function analyzeReach({ technologies, content, structure, scripts, network, pages, discovery, pageUrl }) {
  const host = new URL(pageUrl).hostname.replace(/^www\./, '')
  const byCat = (cats) => technologies.filter((t) => cats.includes(t.category)).map((t) => ({ name: t.name, id: t.version || null, website: t.website }))
  const analytics = byCat(['analytics'])
  const ads = byCat(['ads'])
  const tagManagers = byCat(['tagmanager'])
  const chat = byCat(['chat'])
  const marketing = technologies.filter((t) => /klaviyo|mailchimp|hubspot|convertkit|activecampaign|rd ?station|brevo|sendinblue|mailerlite|customer\.io|braze|intercom|drip|getresponse|aweber/i.test(t.name)).map((t) => ({ name: t.name, id: t.version || null, website: t.website }))
  const trackingIdCount = Object.values(scripts.trackingIds || {}).reduce((a, v) => a + v.length, 0)

  const socialByPlatform = {}
  for (const s of content.socialLinks || []) {
    const platform = /instagram/.test(s) ? 'Instagram' : /facebook/.test(s) ? 'Facebook' : /twitter|x\.com/.test(s) ? 'X / Twitter' : /linkedin/.test(s) ? 'LinkedIn' : /youtube/.test(s) ? 'YouTube' : /tiktok/.test(s) ? 'TikTok' : /github/.test(s) ? 'GitHub' : /discord/.test(s) ? 'Discord' : /t\.me/.test(s) ? 'Telegram' : /wa\.me|whatsapp/.test(s) ? 'WhatsApp' : /pinterest/.test(s) ? 'Pinterest' : /reddit/.test(s) ? 'Reddit' : /medium/.test(s) ? 'Medium' : /substack/.test(s) ? 'Substack' : /threads/.test(s) ? 'Threads' : 'Other'
    ;(socialByPlatform[platform] ||= []).push(s)
  }

  const blogPages = pages?.byType?.blog || 0
  const sitemapUrls = discovery?.sitemap?.urls?.length || 0
  const rss = (content.metas && Object.keys(content.metas).length, (structure.navLinks || []).some((n) => /rss|feed/i.test(n.href || ''))) || false
  const emailForms = (structure.forms || []).filter((f) => f.fields.some((x) => x.type === 'email')).length
  const appStores = (content.externalLinkHosts || []).filter((h) => /apps\.apple\.com|play\.google\.com/.test(h.host)).map((h) => h.host)

  const signals = [
    { group: 'Measurement', label: 'Analytics tools', value: analytics.map((a) => a.name), note: analytics.length ? 'The site measures its own traffic with these; their dashboards are private.' : 'No analytics script observed in the HTML.' },
    { group: 'Measurement', label: 'Tag managers', value: tagManagers.map((a) => a.name) },
    { group: 'Acquisition', label: 'Ad / retargeting pixels', value: ads.map((a) => a.name), note: ads.length ? 'Pixels imply paid acquisition on these networks.' : 'No ad pixels observed: no sign of paid campaigns from this page.' },
    { group: 'Acquisition', label: 'Social profiles linked', value: Object.keys(socialByPlatform) },
    { group: 'Acquisition', label: 'Email marketing / CRM', value: marketing.map((m) => m.name) },
    { group: 'Acquisition', label: 'Email capture forms', value: emailForms ? [`${emailForms} form(s) with an email field`] : [] },
    { group: 'Acquisition', label: 'Mobile app stores', value: appStores },
    { group: 'Acquisition', label: 'Chat / support widgets', value: chat.map((c) => c.name) },
    { group: 'Content footprint', label: 'Internal pages linked', value: pages ? [`${pages.internalCount} pages across ${pages.sections.length} sections`] : [] },
    { group: 'Content footprint', label: 'Blog / articles', value: blogPages ? [`${blogPages} blog-type links`] : [], note: blogPages ? 'Editorial content is a signal of organic (SEO) acquisition.' : 'No blog links from this page.' },
    { group: 'Content footprint', label: 'Sitemap URLs', value: sitemapUrls ? [`${sitemapUrls} URLs in sitemap.xml`] : [], note: discovery ? null : 'Sitemap not fetched in this mode.' },
    { group: 'Content footprint', label: 'Languages (hreflang)', value: (content.hreflang || []).map((h) => h.lang) },
    { group: 'Indexing', label: 'robots meta', value: content.robotsMeta ? [content.robotsMeta] : [], note: /noindex/i.test(content.robotsMeta || '') ? 'Page asks search engines not to index it.' : null },
    { group: 'Indexing', label: 'canonical', value: content.canonical ? [content.canonical] : [] },
    { group: 'Indexing', label: 'Structured data (JSON-LD)', value: (content.jsonLd || []).map((j) => j.type).filter(Boolean) },
    { group: 'Indexing', label: 'Social cards', value: [content.openGraph?.title && 'Open Graph', content.twitter?.card && `Twitter card (${content.twitter.card})`].filter(Boolean) },
    { group: 'Indexing', label: 'RSS feed link', value: rss ? ['present'] : [] },
  ].map((s) => ({ ...s, value: s.value || [] }))

  const q = encodeURIComponent(host)
  const lookups = [
    { name: 'Similarweb (traffic estimate)', url: `https://www.similarweb.com/website/${host}/` },
    { name: 'Semrush domain overview', url: `https://www.semrush.com/analytics/overview/?q=${q}&searchType=domain` },
    { name: 'Ahrefs website authority checker', url: `https://ahrefs.com/website-authority-checker?input=${q}` },
    { name: 'Google indexed pages (site:)', url: `https://www.google.com/search?q=site%3A${q}` },
    { name: 'Wayback Machine history', url: `https://web.archive.org/web/*/${host}` },
    { name: 'BuiltWith profile', url: `https://builtwith.com/${host}` },
    { name: 'Certificate log (subdomains)', url: `https://crt.sh/?q=${encodeURIComponent('%.' + host)}` },
    { name: 'PageSpeed Insights', url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(pageUrl)}` },
    { name: 'Facebook Ad Library', url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${q}&search_type=keyword_unordered` },
  ]

  return {
    disclaimer: 'No visitor numbers are measured or estimated by this app. The signals below are observed in the page; the links open public tools that publish their own estimates.',
    trackingIdCount,
    analytics, ads, tagManagers, chat, marketing,
    socialByPlatform,
    signals,
    lookups,
    paidAcquisitionLikely: ads.length > 0,
    organicContentLikely: blogPages > 0 || sitemapUrls > 20,
  }
}
