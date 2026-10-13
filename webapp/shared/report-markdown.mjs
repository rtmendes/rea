// Renders a report as Markdown. Used by the CLI and by the UI's export button.

const row = (cells) => `| ${cells.map((c) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`
const table = (headers, rows) => rows.length ? [row(headers), row(headers.map(() => '---')), ...rows.map(row)].join('\n') : '_none observed_'
const list = (items) => items.length ? items.map((i) => `- ${i}`).join('\n') : '_none observed_'

export function reportToMarkdown(r) {
  const s = r.summary
  const lines = []
  lines.push(`# Reverse-engineering report: ${r.target.finalUrl}`)
  lines.push('')
  lines.push(`Generated ${r.generatedAt} in ${r.durationMs} ms. HTTP ${r.target.status}, ${r.target.bytes} bytes, TTFB ${r.target.timing.ttfbMs} ms.`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(table(['Field', 'Value'], [
    ['Title', s.title], ['Description', s.description], ['Site type', s.siteType], ['Language', s.language], ['Headline', s.headline],
    ['Technologies', s.technologyCount], ['Third-party hosts', s.thirdPartyHosts], ['Sections', s.sections], ['Forms', s.forms], ['Word count', s.wordCount],
    ['Prices found', s.prices], ['Color mode', s.colorMode], ['Primary fonts', s.primaryFonts.join(', ')], ['Security header score', `${s.securityScore}/100`],
    ['Developer comment language', `${s.developerCommentLanguage.language} (${s.developerCommentLanguage.confidence})`],
  ]))
  lines.push('')
  lines.push('## Technology stack')
  lines.push('')
  lines.push(table(['Technology', 'Category', 'Version / ID', 'Confidence', 'Evidence', 'Reference'], r.technologies.map((t) => [t.name, t.categoryLabel, t.version || '', t.confidence, t.evidence.map((e) => `${e.where}: \`${e.match}\``).join('; '), t.website])))
  lines.push('')
  lines.push('## Design system')
  lines.push('')
  lines.push(`Mode: **${r.design.colors.mode}**. Background ${r.design.colors.roles.background || 'n/a'}, foreground ${r.design.colors.roles.foreground || 'n/a'}, accent ${r.design.colors.roles.accent || 'n/a'} (contrast bg/fg ${r.design.colors.roles.contrastBackgroundForeground ?? 'n/a'}).`)
  lines.push('')
  lines.push(table(['Color', 'Role', 'Uses', 'Alphas'], r.design.colors.palette.slice(0, 16).map((p) => [p.hex, p.role, p.count, p.alphas.join(', ')])))
  lines.push('')
  lines.push('### Typography')
  lines.push('')
  lines.push(table(['Family', 'Uses', 'Fallbacks'], r.design.typography.families.slice(0, 10).map((f) => [f.family, f.count, f.fallbacks.join(', ')])))
  lines.push('')
  lines.push(`Google Fonts: ${r.design.typography.googleFonts.map((g) => `${g.family}${g.axes ? ` (${g.axes})` : ''}`).join(', ') || 'none'}.`)
  lines.push(`Self-hosted @font-face: ${r.design.typography.fontFaces.map((f) => `${f.family} ${f.weight || ''} → ${f.src}`).join('; ') || 'none'}.`)
  lines.push(`Type scale (px → uses): ${r.design.typography.typeScalePx.map((t) => `${t.px}→${t.count}`).join(', ') || 'none'}.`)
  lines.push(`Weights: ${r.design.typography.weights.map((w) => `${w.weight}×${w.count}`).join(', ') || 'none'}.`)
  lines.push('')
  lines.push('### Shape, motion, layout')
  lines.push('')
  lines.push(list([
    `Border radius: ${r.design.shape.borderRadius.map((x) => x.value).join(', ') || 'none'}`,
    `Shadows: ${r.design.shape.boxShadow.map((x) => x.value).join(' | ') || 'none'}`,
    `Gradients: ${r.design.shape.gradients.length}`,
    `Easings: ${r.design.shape.easings.map((x) => x.value).join(', ') || 'none'}`,
    `Breakpoints: ${r.design.shape.breakpoints.map((x) => x.value).join(', ') || 'none'}`,
    `Keyframes: ${r.design.shape.keyframes.join(', ') || 'none'}`,
    `CSS variables: ${r.design.shape.cssVariables.length}; reduced-motion: ${r.design.shape.usesPrefersReducedMotion}; color-scheme: ${r.design.shape.usesPrefersColorScheme}`,
  ]))
  lines.push('')
  lines.push('## Structure')
  lines.push('')
  lines.push(`Landmarks: ${Object.entries(r.structure.landmarks).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`).join(', ') || 'none'}. DOM: ${r.structure.dom.totalElements} elements, depth ${r.structure.dom.maxDepth}.`)
  lines.push('')
  lines.push('### Heading outline')
  lines.push('')
  lines.push(list(r.structure.outline.map((h) => `${'#'.repeat(h.level)} ${h.text}`)))
  lines.push('')
  lines.push('### Sections')
  lines.push('')
  lines.push(table(['Label', 'Source', 'Heading', 'Text chars', 'Links', 'Buttons', 'Images'], r.structure.sections.map((x) => [x.label || x.id || x.tag, x.source, x.heading || x.firstText || '', x.textChars, x.links, x.buttons, x.images])))
  lines.push('')
  lines.push('### Calls to action')
  lines.push('')
  lines.push(table(['Text', 'Occurrences', 'Kind', 'Targets'], r.structure.ctas.slice(0, 25).map((c) => [c.text, c.occurrences, c.kind, c.hrefs.join(', ')])))
  lines.push('')
  lines.push('### Forms')
  lines.push('')
  lines.push(table(['Action', 'Method', 'Fields'], r.structure.forms.map((f) => [f.action || '(none)', f.method, f.fields.map((x) => `${x.type || x.tag}${x.name ? `:${x.name}` : ''}`).join(', ')])))
  lines.push('')
  lines.push(`Images: ${r.structure.images.count} (${r.structure.images.withAlt} with alt, ${r.structure.images.lazy} lazy, formats ${JSON.stringify(r.structure.images.formats)}), inline SVG ${r.structure.images.inlineSvg}, iframes ${r.structure.media.iframes.length}, video ${r.structure.media.video}.`)
  lines.push('')
  lines.push('## Content inventory')
  lines.push('')
  lines.push(list([
    `Canonical: ${r.content.canonical || 'none'}; robots meta: ${r.content.robotsMeta || 'none'}; generator: ${r.content.generator || 'none'}`,
    `Open Graph: ${JSON.stringify(r.content.openGraph)}`,
    `hreflang: ${r.content.hreflang.map((h) => `${h.lang} → ${h.href}`).join(', ') || 'none'}`,
    `JSON-LD: ${r.content.jsonLd.map((j) => j.type).join(', ') || 'none'}`,
    `Emails: ${r.content.emails.join(', ') || 'none'}; phones: ${r.content.phones.join(', ') || 'none'}`,
    `Social: ${r.content.socialLinks.join(', ') || 'none'}`,
    `External link hosts: ${r.content.externalLinkHosts.map((h) => `${h.host}×${h.count}`).join(', ') || 'none'}`,
  ]))
  lines.push('')
  lines.push('### Headlines')
  lines.push('')
  lines.push(list(r.content.headlines))
  lines.push('')
  lines.push('### Prices')
  lines.push('')
  lines.push(table(['Amount', 'Context'], r.content.prices.map((p) => [p.amount, p.context])))
  lines.push('')
  lines.push('### Developer comments (sample)')
  lines.push('')
  lines.push(`${r.content.comments.htmlCount} HTML + ${r.content.comments.jsCount} JS comments; language hint ${r.content.comments.languageHint.language}.`)
  lines.push('')
  lines.push(list(r.content.comments.sample.slice(0, 12).map((c) => c.slice(0, 200))))
  lines.push('')
  lines.push('## Scripts and data')
  lines.push('')
  lines.push(table(['Script', 'Host', 'Party', 'Library', 'Version', 'Loading', 'SRI'], r.scripts.external.map((x) => [x.src, x.host, x.firstParty ? 'first' : 'third', x.library || '', x.version || '', [x.async && 'async', x.defer && 'defer', x.module && 'module'].filter(Boolean).join(' ') || 'blocking', x.integrity ? 'yes' : 'no'])))
  lines.push('')
  lines.push(table(['Inline script', 'Bytes', 'Globals', 'Listeners', 'Element ids'], r.scripts.inline.map((x) => [x.purpose, x.bytes, x.globals.join(', '), x.listeners.join(', '), x.elementIds.slice(0, 8).join(', ')])))
  lines.push('')
  lines.push('### Embedded data blobs')
  lines.push('')
  lines.push(table(['Name', 'Kind', 'Bytes', 'Shape'], r.scripts.dataBlobs.map((d) => [d.name, d.kind, d.bytes, d.shape])))
  lines.push('')
  lines.push(`Tracking identifiers observed: ${JSON.stringify(r.scripts.trackingIds)}`)
  lines.push('')
  lines.push('### Script bodies fetched (first-party and custom third-party)')
  lines.push('')
  lines.push(table(['Script', 'Bytes', 'Minified', 'Source map', 'Endpoints', 'Storage keys', 'Header comment'], (r.scripts.fetchedScripts || []).map((d) => [d.src, d.bytes ?? '', d.minified ?? '', d.sourceMap || '', (d.endpoints || []).concat(d.relativeEndpoints || []).join(', '), (d.storageKeys || []).join(', '), (d.headerComment || d.error || '').slice(0, 200)])))
  lines.push('')
  lines.push('### Behaviours detected')
  lines.push('')
  lines.push(list(r.scripts.behaviours))
  lines.push('')
  lines.push('## Third-party surface')
  lines.push('')
  lines.push(table(['Host', 'Category', 'Party', 'Refs', 'Used as'], r.network.hosts.map((h) => [h.host, h.category, h.firstParty ? 'first' : 'third', h.count, h.kinds.join(', ')])))
  lines.push('')
  lines.push(`Preconnects: ${r.network.preconnects.join(', ') || 'none'}. Mixed content: ${r.network.mixedContent.join(', ') || 'none'}.`)
  lines.push('')
  lines.push('## Security posture')
  lines.push('')
  lines.push(`HTTPS: ${r.security.https}. Header score ${r.security.score}/100. Server: ${r.security.server || 'undisclosed'}.`)
  lines.push('')
  lines.push(table(['Header', 'Present', 'Value'], r.security.headerChecks.map((c) => [c.label, c.present ? 'yes' : 'no', c.value || ''])))
  lines.push('')
  lines.push(list(r.security.findings.map((f) => `**${f.severity}** — ${f.text}`)))
  lines.push('')
  if (r.discovery) {
    lines.push('## Site discovery')
    lines.push('')
    lines.push(table(['File', 'Status', 'Notes'], Object.entries(r.discovery).map(([k, d]) => [k, d.ok ? `${d.status} ok` : `${d.status ?? 'error'} ${d.error || ''}`, d.urls ? `${d.urls.length} URLs: ${d.urls.slice(0, 10).join(', ')}` : d.disallow ? `disallow: ${d.disallow.join(', ')}` : d.name || d.preview?.slice(0, 120) || ''])))
    lines.push('')
  }
  lines.push('## Rebuild blueprint')
  lines.push('')
  lines.push(`> ${r.blueprint.legalNote}`)
  lines.push('')
  lines.push('### Recommended stack')
  lines.push('')
  lines.push(list([
    `Frontend: ${r.blueprint.recommendedStack.frontend}`,
    `Animation: ${r.blueprint.recommendedStack.animation.join(', ') || 'none'}`,
    `Hosting: ${r.blueprint.recommendedStack.hosting}`,
    `Backend: ${r.blueprint.recommendedStack.backend}`,
    `Analytics to configure: ${r.blueprint.recommendedStack.analytics.join(', ') || 'none'}`,
  ]))
  lines.push('')
  lines.push('### Component tree')
  lines.push('')
  lines.push(table(['Component', 'Observed label', 'Heading', 'Props', 'Hints'], r.blueprint.components.map((c) => [c.name, c.sourceLabel, c.heading || '', c.props.join(', '), c.contentHints.join(', ')])))
  lines.push('')
  lines.push('### Design tokens')
  lines.push('')
  lines.push('```css')
  lines.push(r.blueprint.tokensCss)
  lines.push('```')
  lines.push('')
  lines.push('### Interactions to re-implement')
  lines.push('')
  lines.push(list(r.blueprint.interactions))
  lines.push('')
  lines.push('### Integrations')
  lines.push('')
  lines.push(table(['Integration', 'Category', 'Observed ID', 'Reference'], r.blueprint.integrations.map((i) => [i.name, i.category, i.observedId || '', i.website])))
  lines.push('')
  lines.push('### Content model')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(r.blueprint.contentModel, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('### Build checklist')
  lines.push('')
  lines.push(r.blueprint.checklist.map((c, i) => `${i + 1}. ${c}`).join('\n'))
  lines.push('')
  lines.push('## Evidence and limitations')
  lines.push('')
  lines.push(list(r.limitations))
  lines.push('')
  lines.push(`Response headers observed: ${Object.entries(r.target.headers).map(([k, v]) => `${k}: ${v}`).join('; ')}`)
  lines.push('')
  return lines.join('\n')
}
