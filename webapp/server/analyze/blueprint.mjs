// Rebuild blueprint: turns observations into a build plan for an original implementation.
// It deliberately describes structure, tokens and integrations, not the target's copy or assets.

function slug(text) { return (text || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section' }
function pascal(text) { return slug(text).split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('') || 'Section' }

export function buildBlueprint(report) {
  const { technologies, design, structure, content, scripts, network, discovery, security } = report
  const techNames = technologies.map((t) => t.name)
  const has = (name) => techNames.some((n) => n.toLowerCase().includes(name.toLowerCase()))

  // 1) Component tree from observed sections (deduplicated by label/heading).
  const seen = new Map()
  for (const s of structure.sections) {
    const key = s.label || s.heading || s.id || `${s.tag}-${s.firstText?.slice(0, 20)}`
    const e = seen.get(key) || { key, label: s.label || s.heading || s.id || s.tag, heading: s.heading, textChars: 0, links: 0, buttons: 0, images: 0, inputs: 0, occurrences: 0, source: s.source }
    e.textChars += s.textChars; e.links += s.links; e.buttons += s.buttons; e.images += s.images; e.inputs += s.inputs; e.occurrences++
    seen.set(key, e)
  }
  const components = [...seen.values()].filter((c) => c.textChars > 0 || c.images > 0).slice(0, 30).map((c) => ({
    name: pascal(c.label),
    sourceLabel: c.label,
    heading: c.heading,
    occurrences: c.occurrences,
    contentHints: [c.textChars > 600 && 'long copy', c.links > 3 && 'link list', c.buttons > 0 && 'buttons', c.images > 2 && 'image gallery / cards', c.inputs > 0 && 'form'].filter(Boolean),
    props: [c.heading && 'title', c.textChars > 0 && 'body', (c.links > 0 || c.buttons > 0) && 'cta', c.images > 0 && 'media'].filter(Boolean),
  }))

  // 2) Design tokens as CSS custom properties.
  const palette = design.colors.palette.slice(0, 12)
  const tokenLines = [':root {']
  if (design.colors.roles.background) tokenLines.push(`  --color-background: ${design.colors.roles.background};`)
  if (design.colors.roles.foreground) tokenLines.push(`  --color-foreground: ${design.colors.roles.foreground};`)
  if (design.colors.roles.accent) tokenLines.push(`  --color-accent: ${design.colors.roles.accent};`)
  palette.forEach((p, i) => tokenLines.push(`  --palette-${i + 1}: ${p.hex}; /* ${p.role}, ${p.count}× */`))
  const headingFont = design.typography.fontFaces[0]?.family || design.typography.googleFonts[0]?.family || design.typography.families[0]?.family
  const bodyFont = design.typography.googleFonts.find((g) => g.family !== headingFont)?.family || design.typography.families.find((f) => f.family !== headingFont)?.family || headingFont
  if (headingFont) tokenLines.push(`  --font-heading: '${headingFont}', system-ui, sans-serif;`)
  if (bodyFont) tokenLines.push(`  --font-body: '${bodyFont}', system-ui, sans-serif;`)
  const scale = design.typography.typeScalePx.filter((s) => s.px >= 10 && s.px <= 160).sort((a, b) => b.count - a.count).slice(0, 8).sort((a, b) => a.px - b.px)
  scale.forEach((s, i) => tokenLines.push(`  --text-${i + 1}: ${s.px}px;`))
  design.shape.borderRadius.slice(0, 3).forEach((r, i) => tokenLines.push(`  --radius-${i + 1}: ${r.value};`))
  design.shape.boxShadow.slice(0, 2).forEach((r, i) => tokenLines.push(`  --shadow-${i + 1}: ${r.value};`))
  design.shape.easings.slice(0, 2).forEach((r, i) => tokenLines.push(`  --ease-${i + 1}: ${r.value};`))
  tokenLines.push('}')

  // 3) Integrations the target relies on, each with the equivalent you would configure yourself.
  const integrations = technologies
    .filter((t) => ['analytics', 'ads', 'tagmanager', 'chat', 'payments', 'forms', 'fonts', 'video', 'maps', 'security'].includes(t.category))
    .map((t) => ({ name: t.name, category: t.categoryLabel, website: t.website, observedId: t.version, note: t.version ? 'Observed identifier belongs to the target; create your own account/ID.' : null }))

  // 4) Interactions to re-implement.
  const interactions = [...scripts.behaviours]
  if (structure.forms.length) interactions.push(`${structure.forms.length} form(s) to wire to your own backend`)
  if (content.hreflang.length > 1) interactions.push(`Language switcher for: ${content.hreflang.map((h) => h.lang).join(', ')}`)
  if (structure.hasMobileVariant) interactions.push('Separate mobile layout variant (target ships a distinct mobile DOM)')

  // 5) Stack recommendation grounded in what was observed.
  const fixedCanvas = has('Figma-exported fixed canvas')
  const recommendedStack = {
    frontend: fixedCanvas || (!has('React') && !has('Vue') && !has('Next') && !has('Nuxt') && !has('Svelte') && !has('Angular'))
      ? 'Vite + React + Tailwind CSS (static marketing page; replace fixed-canvas absolute positioning with responsive flex/grid sections)'
      : `Match the observed framework family (${technologies.filter((t) => t.category === 'framework').map((t) => t.name).join(', ')})`,
    animation: [has('GSAP') && 'GSAP + ScrollTrigger', has('Lenis') && 'Lenis smooth scroll (or native CSS scroll-behavior)', !has('GSAP') && !has('Lenis') && 'CSS transitions + IntersectionObserver reveals'].filter(Boolean),
    hosting: techNames.includes('Vercel') ? 'Vercel' : techNames.includes('Netlify') ? 'Netlify' : techNames.includes('Cloudflare') ? 'Cloudflare Pages' : 'Any static host (target uses ' + (security.server || 'unknown server') + ')',
    backend: network.subdomainsOfTarget.length ? `Separate app origin(s) observed: ${network.subdomainsOfTarget.join(', ')} — plan an authenticated app shell apart from the marketing site` : 'No separate app origin observed from this page',
    analytics: integrations.filter((i) => ['Analytics', 'Tag manager', 'Ad / marketing pixel'].includes(i.category)).map((i) => i.name),
  }

  // 6) Content model derived from headings, CTAs, prices and embedded data.
  const contentModel = {
    pages: discovery?.sitemap?.urls?.length ? discovery.sitemap.urls : [report.target.finalUrl],
    sections: components.map((c) => c.name),
    pricingTiers: content.prices.filter((p) => p.context !== 'inline script literal').length ? 'Pricing table detected (see Content → prices); model tiers as data, not markup.' : null,
    embeddedData: scripts.dataBlobs.map((d) => ({ name: d.name, shape: d.shape })),
    faq: structure.sections.some((s) => /faq|question/i.test(s.label || s.heading || '')) ? 'FAQ section detected; model as an array of {question, answer}.' : null,
    locales: content.hreflang.map((h) => h.lang),
  }

  const checklist = [
    'Write original copy, imagery and brand assets; do not reuse the target\'s text, logos, fonts or screenshots.',
    `Build ${components.length} section components: ${components.map((c) => c.name).join(', ') || 'none detected'}.`,
    'Apply the token sheet below and verify contrast (background/foreground ratio ' + (design.colors.roles.contrastBackgroundForeground ?? 'n/a') + ').',
    ...interactions.map((i) => `Re-implement: ${i}.`),
    ...integrations.filter((i) => i.category !== 'Web fonts').map((i) => `Set up your own ${i.name} account and ID.`),
    ...(integrations.some((i) => i.category === 'Web fonts') ? ['License or substitute the typefaces (self-hosted fonts observed on the target are not yours to redistribute).'] : []),
    ...security.findings.filter((f) => f.severity !== 'info').slice(0, 4).map((f) => `Avoid the target's gap: ${f.text}`),
  ]

  return {
    components,
    tokensCss: tokenLines.join('\n'),
    integrations,
    interactions,
    recommendedStack,
    contentModel,
    checklist,
    legalNote: 'This blueprint describes structure, tokens and integrations observed in public HTML for research and competitive analysis. Copying text, images, logos, licensed fonts or code verbatim may infringe copyright or trademark rights; build an original implementation.',
  }
}
