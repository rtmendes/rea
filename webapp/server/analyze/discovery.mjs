// Well-known files that reveal site scope: robots.txt, sitemap.xml, manifest, security.txt, humans.txt.

import { fetchAsset } from './fetch.mjs'

export async function discoverSiteFiles(pageUrl) {
  const origin = new URL(pageUrl).origin
  const targets = {
    robots: `${origin}/robots.txt`,
    sitemap: `${origin}/sitemap.xml`,
    securityTxt: `${origin}/.well-known/security.txt`,
    humans: `${origin}/humans.txt`,
    manifest: `${origin}/manifest.json`,
  }
  const entries = await Promise.all(Object.entries(targets).map(async ([key, url]) => {
    const res = await fetchAsset(url, { accept: 'text/plain,application/xml,application/json,*/*' })
    const contentType = res.headers?.['content-type'] || ''
    const isHtml = /text\/html/i.test(contentType)
    const summary = { url, status: res.status ?? null, ok: Boolean(res.ok) && !isHtml, contentType: contentType || null, bytes: res.body?.length ?? null, error: res.error || null }
    if (summary.ok) {
      const text = res.text || ''
      if (key === 'robots') {
        summary.disallow = [...text.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 40)
        summary.allow = [...text.matchAll(/^\s*Allow:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 20)
        summary.sitemaps = [...text.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1])
        summary.userAgents = [...new Set([...text.matchAll(/^\s*User-agent:\s*(.+)$/gim)].map((m) => m[1].trim()))]
      } else if (key === 'sitemap') {
        summary.urls = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]).slice(0, 200)
        summary.isIndex = /<sitemapindex/i.test(text)
      } else if (key === 'manifest') {
        try { const j = JSON.parse(text); summary.name = j.name || j.short_name || null; summary.display = j.display || null; summary.themeColor = j.theme_color || null; summary.startUrl = j.start_url || null } catch { summary.error = 'invalid JSON' }
      } else {
        summary.preview = text.slice(0, 600)
      }
    }
    return [key, summary]
  }))
  return Object.fromEntries(entries)
}
