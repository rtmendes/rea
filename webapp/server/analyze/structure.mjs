// Page structure: landmarks, outline, sections, navigation, CTAs, forms, media.

function clean(text) { return (text || '').replace(/\s+/g, ' ').trim() }

function classifyHref(href, pageUrl) {
  if (!href) return 'none'
  if (href.startsWith('#')) return 'anchor'
  if (/^mailto:/i.test(href)) return 'mailto'
  if (/^tel:/i.test(href)) return 'tel'
  if (/^javascript:/i.test(href)) return 'javascript'
  try {
    const u = new URL(href, pageUrl)
    return u.hostname === new URL(pageUrl).hostname ? 'internal' : 'external'
  } catch { return 'invalid' }
}

export function analyzeStructure({ $, pageUrl }) {
  const landmarks = {}
  for (const tag of ['header', 'nav', 'main', 'footer', 'section', 'article', 'aside', 'form', 'dialog']) landmarks[tag] = $(tag).length
  for (const role of ['banner', 'navigation', 'main', 'contentinfo', 'dialog', 'switch', 'tablist', 'button']) {
    const n = $(`[role="${role}"]`).length
    if (n) landmarks[`role=${role}`] = n
  }

  const outline = $('h1,h2,h3,h4,h5,h6').map((_, el) => ({ level: +el.tagName.slice(1), text: clean($(el).text()).slice(0, 160) })).get()

  // Section heuristics: semantic sections, data-sec/data-section markers, or identified top-level blocks.
  const sectionNodes = []
  const seen = new Set()
  const push = (el, source) => {
    if (seen.has(el)) return
    seen.add(el)
    const $el = $(el)
    const text = clean($el.text())
    const heading = clean($el.find('h1,h2,h3').first().text()) || null
    sectionNodes.push({
      source,
      tag: el.tagName,
      id: $el.attr('id') || null,
      label: $el.attr('data-sec') || $el.attr('data-section') || $el.attr('aria-label') || null,
      heading,
      firstText: text.slice(0, 140) || null,
      textChars: text.length,
      links: $el.find('a[href]').length,
      buttons: $el.find('button,[role="button"]').length,
      images: $el.find('img,svg,picture,video').length,
      inputs: $el.find('input,textarea,select').length,
    })
  }
  $('[data-sec],[data-section]').each((_, el) => push(el, 'data attribute'))
  $('section,header,footer,main,nav,article,aside').each((_, el) => push(el, 'semantic tag'))
  $('body > div[id], main > div[id], body > div > div[id]').each((_, el) => { if ($(el).text().trim().length > 80) push(el, 'identified block') })

  const navLinks = $('nav a[href], header a[href], [role="navigation"] a[href]').map((_, el) => ({ text: clean($(el).text()).slice(0, 60), href: $(el).attr('href') })).get()

  const ctaCandidates = []
  $('a[href],button,[role="button"],input[type="submit"]').each((_, el) => {
    const $el = $(el)
    const text = clean($el.text() || $el.attr('value') || $el.attr('aria-label')).slice(0, 80)
    if (!text) return
    const href = $el.attr('href') || null
    ctaCandidates.push({ text, tag: el.tagName, href, kind: classifyHref(href, pageUrl), id: $el.attr('id') || null, classes: ($el.attr('class') || '').slice(0, 80) || null })
  })
  // Anchors/buttons repeated with the same text are a strong CTA signal.
  const ctaByText = new Map()
  for (const c of ctaCandidates) { const e = ctaByText.get(c.text) || { ...c, occurrences: 0, hrefs: new Set() }; e.occurrences++; if (c.href) e.hrefs.add(c.href); ctaByText.set(c.text, e) }
  const ctas = [...ctaByText.values()].map((c) => ({ text: c.text, occurrences: c.occurrences, kind: c.kind, hrefs: [...c.hrefs].slice(0, 5) })).sort((a, b) => b.occurrences - a.occurrences).slice(0, 40)

  const forms = $('form').map((_, el) => {
    const $f = $(el)
    return {
      action: $f.attr('action') || null,
      method: ($f.attr('method') || 'get').toLowerCase(),
      id: $f.attr('id') || null,
      fields: $f.find('input,textarea,select').map((__, f) => ({ tag: f.tagName, type: $(f).attr('type') || null, name: $(f).attr('name') || null, placeholder: $(f).attr('placeholder') || null, required: $(f).attr('required') !== undefined })).get(),
    }
  }).get()

  const imgs = $('img')
  const images = {
    count: imgs.length,
    withAlt: imgs.filter((_, el) => clean($(el).attr('alt')).length > 0).length,
    lazy: imgs.filter((_, el) => $(el).attr('loading') === 'lazy').length,
    formats: Object.fromEntries([...imgs.map((_, el) => ($(el).attr('src') || '').split('?')[0].split('.').pop().toLowerCase()).get().reduce((m, f) => m.set(f, (m.get(f) || 0) + 1), new Map())]),
    sources: imgs.map((_, el) => $(el).attr('src')).get().filter(Boolean).slice(0, 60),
    inlineSvg: $('svg').length,
  }
  const media = {
    video: $('video').length,
    audio: $('audio').length,
    iframes: $('iframe').map((_, el) => $(el).attr('src') || $(el).attr('data-src') || null).get(),
    canvas: $('canvas').length,
  }

  const tagCounts = new Map()
  let maxDepth = 0
  const walk = (node, depth) => {
    if (node.type === 'tag') {
      tagCounts.set(node.tagName, (tagCounts.get(node.tagName) || 0) + 1)
      if (depth > maxDepth) maxDepth = depth
      for (const child of node.children || []) walk(child, depth + 1)
    }
  }
  $('body').each((_, el) => walk(el, 1))
  const totalElements = [...tagCounts.values()].reduce((a, b) => a + b, 0)

  const interactive = {
    withId: $('[id]').length,
    ariaAttributes: $('[aria-label],[aria-checked],[aria-expanded],[aria-controls],[role]').length,
    tabindex: $('[tabindex]').length,
    details: $('details').length,
    dialogs: $('dialog').length,
  }

  return {
    landmarks,
    outline,
    sections: sectionNodes.slice(0, 60),
    navLinks: navLinks.slice(0, 60),
    ctas,
    forms,
    images,
    media,
    dom: {
      totalElements,
      maxDepth,
      topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([tag, count]) => ({ tag, count })),
    },
    interactive,
    hasSkipLink: $('a[href^="#"]').filter((_, el) => /skip/i.test($(el).text())).length > 0,
    hasMobileVariant: $('.mob, .mobile, [class*="mobile-only"], [class*="d-md-none"]').length > 0,
  }
}
