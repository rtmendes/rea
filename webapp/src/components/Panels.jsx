import { useMemo, useState } from 'react'
import { Chips, CopyButton, ExternalLink, Section, Severity, Stat, Table } from './ui.jsx'

const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString() : n ?? '—')

export function OverviewPanel({ report, onOpenTab }) {
  const s = report.summary
  const t = report.target
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Site type" value={s.siteType} hint={s.language} />
        <Stat label="Technologies" value={s.technologyCount} hint={`${s.thirdPartyHosts} third-party hosts`} />
        <Stat label="Sections" value={s.sections} hint={`${report.structure.outline.length} headings`} />
        <Stat label="Words" value={fmtNum(s.wordCount)} hint={`${s.prices} prices, ${s.forms} forms`} />
        <Stat label="Color mode" value={s.colorMode} hint={report.design.colors.roles.accent ? `accent ${report.design.colors.roles.accent}` : null} />
        <Stat label="Security headers" value={`${s.securityScore}/100`} hint={report.security.https ? 'HTTPS' : 'no HTTPS'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Target" subtitle={`HTTP ${t.status} · ${fmtNum(t.bytes)} bytes · TTFB ${t.timing.ttfbMs} ms · total ${t.timing.totalMs} ms`}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-400">Final URL</dt><dd className="break-all"><ExternalLink href={t.finalUrl} /></dd>
            <dt className="text-ink-400">Title</dt><dd>{s.title || '—'}</dd>
            <dt className="text-ink-400">Description</dt><dd className="text-ink-200">{s.description || '—'}</dd>
            <dt className="text-ink-400">Headline</dt><dd>{s.headline || '—'}</dd>
            <dt className="text-ink-400">Server</dt><dd>{report.security.server || 'undisclosed'}{report.security.poweredBy ? ` · ${report.security.poweredBy}` : ''}</dd>
            <dt className="text-ink-400">Resolved to</dt><dd className="font-mono text-xs">{t.addresses.join(', ')}</dd>
            <dt className="text-ink-400">Redirects</dt><dd>{t.redirects.length ? t.redirects.map((r) => `${r.status} → ${r.location}`).join(' ; ') : 'none'}</dd>
            <dt className="text-ink-400">Dev comments</dt><dd>{s.developerCommentLanguage.language} ({report.content.comments.htmlCount + report.content.comments.jsCount} comments)</dd>
          </dl>
        </Section>
        <Section title="Stack at a glance" actions={<button className="text-xs text-accent-400 hover:text-white" onClick={() => onOpenTab('tech')}>Open evidence →</button>}>
          <div className="space-y-2">
            {Object.entries(s.technologiesByCategory).map(([cat, names]) => (
              <div key={cat} className="flex flex-wrap items-baseline gap-2">
                <span className="w-40 shrink-0 text-xs uppercase tracking-wide text-ink-400">{cat}</span>
                <Chips items={names} />
              </div>
            ))}
          </div>
        </Section>
        <Section title="Primary calls to action">
          <Table columns={[{ key: 'text', label: 'Text' }, { key: 'occurrences', label: '×' }, { key: 'kind', label: 'Kind' }, { key: 'hrefs', label: 'Targets', render: (r) => r.hrefs.join(', ') }]} rows={report.structure.ctas.slice(0, 8)} />
        </Section>
        <Section title="Tracking identifiers observed" subtitle="These belong to the target. Create your own when rebuilding.">
          {Object.keys(s.trackingIds).length ? (
            <ul className="space-y-1 text-sm">{Object.entries(s.trackingIds).map(([k, v]) => <li key={k}><span className="text-ink-400">{k}</span> <span className="font-mono text-xs">{v.join(', ')}</span></li>)}</ul>
          ) : <p className="text-sm text-ink-400">None found in the HTML.</p>}
        </Section>
      </div>
      <Section title="Evidence and limitations">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-200">{report.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </Section>
    </div>
  )
}

export function TechPanel({ report }) {
  const [filter, setFilter] = useState('')
  const rows = report.technologies.filter((t) => !filter || `${t.name} ${t.categoryLabel}`.toLowerCase().includes(filter.toLowerCase()))
  return (
    <Section title={`${report.technologies.length} technologies detected`} subtitle="Each row shows the exact evidence that triggered the rule." actions={<input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs" />}>
      <Table
        columns={[
          { key: 'name', label: 'Technology', render: (t) => <div><div className="font-medium text-white">{t.name}</div><ExternalLink href={t.website}><span className="text-xs">{t.website.replace(/^https?:\/\//, '')}</span></ExternalLink></div> },
          { key: 'categoryLabel', label: 'Category' },
          { key: 'version', label: 'Version / ID', render: (t) => <span className="font-mono text-xs">{t.version || ''}</span> },
          { key: 'confidence', label: 'Confidence', render: (t) => <span className={`chip ${t.confidence === 'high' ? 'border-emerald-500/40 text-emerald-200' : ''}`}>{t.confidence}</span> },
          { key: 'evidence', label: 'Evidence', render: (t) => <ul className="space-y-0.5">{t.evidence.map((e, i) => <li key={i} className="evidence"><span className="text-ink-200">{e.where}:</span> {e.match}</li>)}</ul> },
        ]}
        rows={rows}
      />
    </Section>
  )
}

export function DesignPanel({ report }) {
  const d = report.design
  const c = d.colors
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Mode" value={c.mode} hint={c.themeColor ? `theme-color ${c.themeColor}` : null} />
        <Stat label="Background / foreground" value={`${c.roles.background || '—'} / ${c.roles.foreground || '—'}`} hint={c.roles.contrastBackgroundForeground ? `contrast ${c.roles.contrastBackgroundForeground}:1` : null} />
        <Stat label="Accent" value={c.roles.accent || '—'} hint={c.roles.contrastAccentOnBackground ? `on background ${c.roles.contrastAccentOnBackground}:1` : null} />
        <Stat label="Inline CSS" value={`${fmtNum(d.stylesheetBytesInline)} B`} hint={`${d.inlineStyleAttributes} style attributes · ${d.externalStylesheets.length} external sheets`} />
      </div>
      <Section title="Palette" subtitle="Colours from <style> blocks and inline styles, ordered by frequency. Role is inferred from the CSS property they were used with.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {c.palette.slice(0, 24).map((p) => (
            <div key={p.hex} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950 p-2">
              <span className="h-9 w-9 shrink-0 rounded-md border border-white/10" style={{ background: p.hex }} />
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-mono text-xs text-white">{p.hex}<CopyButton text={p.hex} label="⧉" /></div>
                <div className="truncate text-[11px] text-ink-400">{p.role} · {p.count}×{p.alphas.length ? ` · α ${p.alphas.slice(0, 3).join('/')}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Typography">
          <div className="space-y-3 text-sm">
            <div><div className="mb-1 text-xs uppercase tracking-wide text-ink-400">Google Fonts</div><Chips items={d.typography.googleFonts.map((g) => `${g.family}${g.axes ? ` · ${g.axes}` : ''}`)} /></div>
            <div><div className="mb-1 text-xs uppercase tracking-wide text-ink-400">Self-hosted @font-face</div>{d.typography.fontFaces.length ? <ul className="space-y-0.5 font-mono text-xs">{d.typography.fontFaces.map((f, i) => <li key={i}>{f.family} {f.weight} {f.style} → {f.src}</li>)}</ul> : <span className="text-xs text-ink-400">none</span>}</div>
            <div><div className="mb-1 text-xs uppercase tracking-wide text-ink-400">font-family usage</div><Table columns={[{ key: 'family', label: 'Family' }, { key: 'count', label: 'Uses' }, { key: 'fallbacks', label: 'Fallbacks', render: (f) => f.fallbacks.join(', ') }]} rows={d.typography.families.slice(0, 10)} /></div>
            <div><div className="mb-1 text-xs uppercase tracking-wide text-ink-400">Weights</div><Chips items={d.typography.weights.map((w) => `${w.weight} ×${w.count}`)} /></div>
          </div>
        </Section>
        <Section title="Type scale" subtitle="font-size declarations (rem/em converted at 16px).">
          {d.typography.typeScalePx.length ? (
            <div className="space-y-1">
              {d.typography.typeScalePx.filter((t) => t.px >= 8 && t.px <= 160).map((t) => (
                <div key={t.px} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-mono text-ink-200">{t.px}px</span>
                  <div className="h-2 flex-1 rounded bg-ink-800"><div className="h-2 rounded bg-accent-600" style={{ width: `${Math.min(100, (t.count / Math.max(...d.typography.typeScalePx.map((x) => x.count))) * 100)}%` }} /></div>
                  <span className="w-8 text-right text-ink-400">{t.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-400">No font-size declarations in the HTML (styles may live in external CSS).</p>}
        </Section>
        <Section title="Shape and motion">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-400">Radius</dt><dd><Chips items={d.shape.borderRadius.map((x) => x.value)} /></dd>
            <dt className="text-ink-400">Shadows</dt><dd><Chips items={d.shape.boxShadow.map((x) => x.value)} /></dd>
            <dt className="text-ink-400">Gradients</dt><dd><Chips items={d.shape.gradients.map((x) => x.value)} /></dd>
            <dt className="text-ink-400">Backdrop</dt><dd><Chips items={d.shape.backdropFilter.map((x) => x.value)} /></dd>
            <dt className="text-ink-400">Easings</dt><dd><Chips items={d.shape.easings.map((x) => `${x.value} ×${x.count}`)} /></dd>
            <dt className="text-ink-400">Keyframes</dt><dd><Chips items={d.shape.keyframes} /></dd>
            <dt className="text-ink-400">Breakpoints</dt><dd><Chips items={d.shape.breakpoints.map((x) => x.value)} /></dd>
            <dt className="text-ink-400">Flags</dt><dd><Chips items={[d.shape.usesPrefersReducedMotion && 'prefers-reduced-motion', d.shape.usesPrefersColorScheme && 'prefers-color-scheme', d.shape.usesContainerQueries && 'container queries', d.shape.usesCustomProperties && 'CSS variables'].filter(Boolean)} /></dd>
          </dl>
        </Section>
        <Section title="CSS custom properties" subtitle={`${d.shape.cssVariables.length} declared`}>
          <Table columns={[{ key: 'name', label: 'Variable', render: (v) => <span className="font-mono text-xs">{v.name}</span> }, { key: 'value', label: 'Value', render: (v) => <span className="font-mono text-xs">{v.value}</span> }]} rows={d.shape.cssVariables} empty="No CSS variables in inline styles." />
        </Section>
      </div>
    </div>
  )
}

export function StructurePanel({ report }) {
  const st = report.structure
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="DOM elements" value={fmtNum(st.dom.totalElements)} hint={`depth ${st.dom.maxDepth}`} />
        <Stat label="Images" value={st.images.count} hint={`${st.images.withAlt} with alt · ${st.images.inlineSvg} inline SVG`} />
        <Stat label="Forms" value={st.forms.length} hint={`${st.forms.reduce((a, f) => a + f.fields.length, 0)} fields`} />
        <Stat label="Interactive" value={st.interactive.ariaAttributes} hint={`aria/role attrs · ${st.interactive.withId} ids`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Landmarks and tags">
          <Chips items={Object.entries(st.landmarks).filter(([, v]) => v).map(([k, v]) => `${k} ×${v}`)} />
          <div className="mt-3"><Chips items={st.dom.topTags.map((t) => `${t.tag} ${t.count}`)} /></div>
          <div className="mt-3 text-xs text-ink-400">{st.hasMobileVariant ? 'Ships a separate mobile DOM variant.' : 'No separate mobile DOM detected.'} {st.hasSkipLink ? 'Has a skip link.' : ''}</div>
        </Section>
        <Section title="Heading outline">
          {st.outline.length ? <ol className="space-y-0.5 text-sm">{st.outline.map((h, i) => <li key={i} style={{ paddingLeft: `${(h.level - 1) * 14}px` }}><span className="mr-2 font-mono text-[11px] text-ink-400">h{h.level}</span>{h.text}</li>)}</ol> : <p className="text-sm text-ink-400">No headings.</p>}
        </Section>
      </div>
      <Section title={`Sections (${st.sections.length})`} subtitle="From data-sec/data-section attributes, semantic tags and identified blocks.">
        <Table columns={[
          { key: 'label', label: 'Label', render: (s) => <span className="font-medium text-white">{s.label || s.id || s.tag}</span> },
          { key: 'source', label: 'Source' },
          { key: 'heading', label: 'Heading / first text', render: (s) => s.heading || s.firstText || '' },
          { key: 'textChars', label: 'Chars' }, { key: 'links', label: 'Links' }, { key: 'buttons', label: 'Buttons' }, { key: 'images', label: 'Media' }, { key: 'inputs', label: 'Inputs' },
        ]} rows={st.sections} />
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Calls to action"><Table columns={[{ key: 'text', label: 'Text' }, { key: 'occurrences', label: '×' }, { key: 'kind', label: 'Kind' }, { key: 'hrefs', label: 'Targets', render: (r) => <span className="break-all font-mono text-xs">{r.hrefs.join(', ')}</span> }]} rows={st.ctas} /></Section>
        <Section title="Navigation links"><Table columns={[{ key: 'text', label: 'Text' }, { key: 'href', label: 'Href', render: (r) => <span className="break-all font-mono text-xs">{r.href}</span> }]} rows={st.navLinks} /></Section>
      </div>
      <Section title="Forms">
        <Table columns={[{ key: 'action', label: 'Action', render: (f) => f.action || '(none)' }, { key: 'method', label: 'Method' }, { key: 'fields', label: 'Fields', render: (f) => <Chips items={f.fields.map((x) => `${x.type || x.tag}${x.name ? `:${x.name}` : ''}${x.required ? '*' : ''}`)} /> }]} rows={st.forms} empty="No forms in the HTML." />
      </Section>
      <Section title="Media" subtitle={`${st.media.iframes.length} iframes · ${st.media.video} video · ${st.media.audio} audio · ${st.media.canvas} canvas`}>
        <Chips items={[...Object.entries(st.images.formats).map(([f, n]) => `${f || 'no-ext'} ×${n}`), `${st.images.lazy} lazy-loaded`]} />
        {st.images.sources.length ? <ul className="mt-2 max-h-40 overflow-auto font-mono text-[11px] text-ink-400">{st.images.sources.map((s, i) => <li key={i}>{s}</li>)}</ul> : null}
        {st.media.iframes.length ? <ul className="mt-2 font-mono text-[11px] text-ink-400">{st.media.iframes.map((s, i) => <li key={i}>{s}</li>)}</ul> : null}
      </Section>
    </div>
  )
}

export function ContentPanel({ report }) {
  const c = report.content
  const [q, setQ] = useState('')
  const blocks = c.textBlocks.filter((b) => !q || b.text.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Metadata">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-400">lang</dt><dd>{c.lang || '—'} <span className="text-xs text-ink-400">(text guess: {c.languageHint.language})</span></dd>
            <dt className="text-ink-400">canonical</dt><dd className="break-all">{c.canonical || '—'}</dd>
            <dt className="text-ink-400">robots</dt><dd>{c.robotsMeta || '—'}</dd>
            <dt className="text-ink-400">generator</dt><dd>{c.generator || '—'}</dd>
            <dt className="text-ink-400">viewport</dt><dd className="font-mono text-xs">{c.viewport || '—'}</dd>
            <dt className="text-ink-400">Open Graph</dt><dd className="text-xs">{Object.entries(c.openGraph).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</dd>
            <dt className="text-ink-400">hreflang</dt><dd><Chips items={c.hreflang.map((h) => `${h.lang} → ${h.href}`)} /></dd>
            <dt className="text-ink-400">JSON-LD</dt><dd><Chips items={c.jsonLd.map((j) => j.type)} /></dd>
            <dt className="text-ink-400">icons</dt><dd><Chips items={c.icons.map((i) => `${i.rel} ${i.href}`)} /></dd>
          </dl>
        </Section>
        <Section title="Contacts and outbound">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-400">Emails</dt><dd><Chips items={c.emails} /></dd>
            <dt className="text-ink-400">Phones</dt><dd><Chips items={c.phones} /></dd>
            <dt className="text-ink-400">Social</dt><dd><Chips items={c.socialLinks} /></dd>
            <dt className="text-ink-400">External hosts</dt><dd><Chips items={c.externalLinkHosts.map((h) => `${h.host} ×${h.count}`)} /></dd>
          </dl>
        </Section>
      </div>
      <Section title={`Prices (${c.prices.length})`} subtitle="Currency amounts in visible text and in script literals.">
        <Table columns={[{ key: 'amount', label: 'Amount', render: (p) => <span className="font-mono text-xs text-white">{p.amount}</span> }, { key: 'context', label: 'Context' }]} rows={c.prices} />
      </Section>
      <Section title="Developer comments" subtitle={`${c.comments.htmlCount} HTML + ${c.comments.jsCount} JS comments · language hint ${c.comments.languageHint.language} (${c.comments.languageHint.confidence})`}>
        {c.comments.sample.length ? <ul className="space-y-1 text-xs text-ink-200">{c.comments.sample.map((s, i) => <li key={i} className="rounded border border-ink-800 bg-ink-950 px-2 py-1 font-mono">{s}</li>)}</ul> : <p className="text-sm text-ink-400">No comments.</p>}
      </Section>
      <Section title={`Copy inventory (${c.textBlocks.length} unique blocks · ${fmtNum(c.wordCount)} words)`} actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text…" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs" />}>
        <div className="max-h-[480px] overflow-auto space-y-1">
          {blocks.map((b, i) => <div key={i} className="flex gap-2 text-sm"><span className="w-10 shrink-0 font-mono text-[11px] text-ink-400">{b.tag}</span><span className="text-ink-200">{b.text}</span></div>)}
        </div>
      </Section>
    </div>
  )
}

export function ScriptsPanel({ report }) {
  const s = report.scripts
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="External scripts" value={s.totals.external} hint={`${s.totals.thirdPartyExternal} third-party · ${s.totals.withIntegrity} with SRI`} />
        <Stat label="Inline scripts" value={s.totals.inline} hint={`${fmtNum(s.totals.inlineBytes)} bytes`} />
        <Stat label="Data blobs" value={s.dataBlobs.length} hint="window.__X / JSON tags" />
        <Stat label="Behaviours" value={s.behaviours.length} />
      </div>
      <Section title="Behaviours detected"><Chips items={s.behaviours} /></Section>
      <Section title="External scripts">
        <Table columns={[
          { key: 'src', label: 'Source', render: (x) => <span className="break-all font-mono text-xs">{x.src}</span> },
          { key: 'firstParty', label: 'Party', render: (x) => (x.firstParty ? 'first' : 'third') },
          { key: 'library', label: 'Library', render: (x) => `${x.library || ''}${x.version ? ` ${x.version}` : ''}` },
          { key: 'loading', label: 'Loading', render: (x) => [x.async && 'async', x.defer && 'defer', x.module && 'module'].filter(Boolean).join(' ') || 'blocking' },
          { key: 'integrity', label: 'SRI', render: (x) => (x.integrity ? 'yes' : 'no') },
        ]} rows={s.external} />
      </Section>
      <Section title="Inline scripts" subtitle="Purpose is inferred from the code; globals, listeners and element ids reveal the interaction model.">
        <Table columns={[
          { key: 'purpose', label: 'Purpose' }, { key: 'bytes', label: 'Bytes' },
          { key: 'globals', label: 'Globals', render: (x) => <Chips items={x.globals} empty="" /> },
          { key: 'listeners', label: 'Listeners', render: (x) => <Chips items={x.listeners} empty="" /> },
          { key: 'elementIds', label: 'Element ids / selectors', render: (x) => <span className="font-mono text-[11px] text-ink-400">{[...x.elementIds, ...x.selectors].slice(0, 12).join(', ')}</span> },
          { key: 'flags', label: 'Uses', render: (x) => <Chips items={[x.usesFetch && 'fetch', x.usesStorage && 'storage', x.usesCookies && 'cookies', x.usesIntersectionObserver && 'IntersectionObserver', x.usesMutationObserver && 'MutationObserver', x.usesMatchMedia && 'matchMedia', x.usesRequestAnimationFrame && 'rAF'].filter(Boolean)} empty="" /> },
          { key: 'preview', label: 'Preview', render: (x) => <span className="evidence">{x.preview}</span> },
        ]} rows={s.inline} />
      </Section>
      <Section title="Embedded data blobs" subtitle="Globals assigned to window and JSON script tags expose the page's content model.">
        {s.dataBlobs.length ? s.dataBlobs.map((d, i) => (
          <details key={i} className="rounded-lg border border-ink-800 bg-ink-950 p-2">
            <summary className="cursor-pointer text-sm"><span className="font-mono text-white">{d.name}</span> <span className="text-ink-400">· {d.kind} · {d.bytes} B · {d.shape}</span></summary>
            <pre className="code mt-2">{d.parsed ? JSON.stringify(d.parsed, null, 2) : d.sample}</pre>
          </details>
        )) : <p className="text-sm text-ink-400">None.</p>}
      </Section>
      <Section title="Fetched script bodies" subtitle="First-party scripts and custom third-party widgets (public CDNs skipped). Endpoints and storage keys show where the app talks.">
        {(s.fetchedScripts || []).length ? (s.fetchedScripts || []).map((d, i) => (
          <div key={i} className="rounded-lg border border-ink-800 bg-ink-950 p-3 text-sm">
            <div className="break-all font-mono text-xs text-white">{d.src}</div>
            {d.ok ? (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="text-ink-400">Size</dt><dd>{fmtNum(d.bytes)} B · {d.minified ? 'minified' : 'readable source'} · {d.sourceMap ? `source map ${d.sourceMap}` : 'no source map'} · {d.lastModified || ''}</dd>
                <dt className="text-ink-400">Endpoints</dt><dd><Chips items={[...d.endpoints, ...d.relativeEndpoints]} /></dd>
                <dt className="text-ink-400">Globals</dt><dd><Chips items={d.globals} /></dd>
                <dt className="text-ink-400">Storage keys</dt><dd><Chips items={d.storageKeys} /></dd>
                <dt className="text-ink-400">Network</dt><dd><Chips items={[d.usesFetch && 'fetch/XHR', d.usesWebSocket && 'WebSocket'].filter(Boolean)} /></dd>
                {d.headerComment ? <><dt className="text-ink-400">Header comment</dt><dd className="text-ink-200">{d.headerComment}</dd></> : null}
              </dl>
            ) : <div className="mt-1 text-xs text-rose-300">{d.error}</div>}
          </div>
        )) : <p className="text-sm text-ink-400">No script bodies fetched.</p>}
      </Section>
    </div>
  )
}

export function NetworkPanel({ report }) {
  const n = report.network
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Hosts referenced" value={n.hosts.length} hint={`${n.thirdPartyCount} third-party`} />
        <Stat label="Preconnects" value={n.preconnects.length} />
        <Stat label="Preloads" value={n.preloads.length} />
        <Stat label="Mixed content" value={n.mixedContent.length} />
      </div>
      <Section title="Third parties by purpose">
        <div className="space-y-2">{Object.entries(n.byCategory).map(([cat, hosts]) => <div key={cat} className="flex flex-wrap items-baseline gap-2"><span className="w-36 shrink-0 text-xs uppercase tracking-wide text-ink-400">{cat}</span><Chips items={hosts} /></div>)}</div>
      </Section>
      <Section title="Every host referenced">
        <Table columns={[
          { key: 'host', label: 'Host', render: (h) => <span className="font-mono text-xs text-white">{h.host}</span> },
          { key: 'category', label: 'Category' }, { key: 'firstParty', label: 'Party', render: (h) => (h.firstParty ? 'first' : 'third') }, { key: 'count', label: 'Refs' },
          { key: 'kinds', label: 'Used as', render: (h) => <Chips items={h.kinds} /> },
        ]} rows={n.hosts} />
      </Section>
      <Section title="Subdomains of the target seen from this page" subtitle="Separate origins usually mean a distinct app, API or asset service.">
        <Chips items={n.subdomainsOfTarget} empty="none" />
      </Section>
    </div>
  )
}

export function SecurityPanel({ report }) {
  const s = report.security
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Header score" value={`${s.score}/100`} hint={s.https ? 'served over HTTPS' : 'not HTTPS'} />
        <Stat label="Server" value={s.server || 'undisclosed'} hint={s.poweredBy || ''} />
        <Stat label="Cookies set" value={s.cookies.length} hint={s.cookies.map((c) => c.name).join(', ')} />
        <Stat label="Cache-Control" value={s.cacheControl || '—'} />
      </div>
      <Section title="Response header checks">
        <Table columns={[{ key: 'label', label: 'Header' }, { key: 'present', label: 'Present', render: (c) => (c.present ? <span className="text-emerald-300">yes</span> : <span className="text-rose-300">no</span>) }, { key: 'value', label: 'Value', render: (c) => <span className="break-all font-mono text-xs">{c.value || ''}</span> }, { key: 'advice', label: 'If missing', render: (c) => (c.present ? '' : c.advice) }]} rows={s.headerChecks} />
      </Section>
      <Section title="Findings">
        <ul className="space-y-1.5 text-sm">{s.findings.map((f, i) => <li key={i} className="flex items-start gap-2"><Severity level={f.severity} /><span>{f.text}</span></li>)}</ul>
      </Section>
      {s.cookies.length ? <Section title="Cookies"><Table columns={[{ key: 'name', label: 'Name' }, { key: 'secure', label: 'Secure', render: (c) => String(c.secure) }, { key: 'httpOnly', label: 'HttpOnly', render: (c) => String(c.httpOnly) }, { key: 'sameSite', label: 'SameSite' }, { key: 'sessionHint', label: 'Hint' }]} rows={s.cookies} /></Section> : null}
      <Section title="All response headers">
        <pre className="code">{Object.entries(report.target.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
      </Section>
    </div>
  )
}

export function DiscoveryPanel({ report }) {
  const d = report.discovery
  if (!d) return <p className="text-sm text-ink-400">Discovery was disabled for this run.</p>
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Object.entries(d).map(([k, v]) => (
        <Section key={k} title={k} subtitle={v.url}>
          <div className="text-sm">
            <span className={v.ok ? 'text-emerald-300' : 'text-ink-400'}>{v.ok ? `HTTP ${v.status}` : v.error || `HTTP ${v.status} (${v.contentType || 'no body'})`}</span>
            {v.urls ? <ul className="mt-2 max-h-56 overflow-auto font-mono text-xs">{v.urls.map((u, i) => <li key={i}>{u}</li>)}</ul> : null}
            {v.disallow ? <div className="mt-2"><div className="text-xs text-ink-400">Disallow</div><Chips items={v.disallow} /></div> : null}
            {v.sitemaps?.length ? <div className="mt-2"><div className="text-xs text-ink-400">Sitemaps</div><Chips items={v.sitemaps} /></div> : null}
            {v.name ? <div className="mt-2 text-xs">name {v.name} · display {v.display} · start {v.startUrl}</div> : null}
            {v.preview ? <pre className="code mt-2">{v.preview}</pre> : null}
          </div>
        </Section>
      ))}
    </div>
  )
}

export function BlueprintPanel({ report }) {
  const b = report.blueprint
  const tree = useMemo(() => b.components, [b])
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{b.legalNote}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Recommended stack" subtitle="Grounded in what was observed, adapted to a maintainable rebuild.">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-400">Frontend</dt><dd>{b.recommendedStack.frontend}</dd>
            <dt className="text-ink-400">Animation</dt><dd><Chips items={b.recommendedStack.animation} /></dd>
            <dt className="text-ink-400">Hosting</dt><dd>{b.recommendedStack.hosting}</dd>
            <dt className="text-ink-400">Backend</dt><dd>{b.recommendedStack.backend}</dd>
            <dt className="text-ink-400">Analytics</dt><dd><Chips items={b.recommendedStack.analytics} /></dd>
          </dl>
        </Section>
        <Section title="Interactions to re-implement"><ul className="list-disc space-y-1 pl-5 text-sm">{b.interactions.map((i, k) => <li key={k}>{i}</li>)}</ul></Section>
      </div>
      <Section title={`Component tree (${tree.length})`} subtitle="One component per observed section. Props are what the section needs as data.">
        <Table columns={[
          { key: 'name', label: 'Component', render: (c) => <span className="font-mono text-xs text-white">&lt;{c.name} /&gt;</span> },
          { key: 'sourceLabel', label: 'Observed label' }, { key: 'heading', label: 'Heading' },
          { key: 'props', label: 'Props', render: (c) => <Chips items={c.props} /> }, { key: 'contentHints', label: 'Hints', render: (c) => <Chips items={c.contentHints} empty="" /> }, { key: 'occurrences', label: '×' },
        ]} rows={tree} />
      </Section>
      <Section title="Design tokens" actions={<CopyButton text={b.tokensCss} label="Copy CSS" />}>
        <pre className="code">{b.tokensCss}</pre>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Integrations to recreate with your own accounts">
          <Table columns={[{ key: 'name', label: 'Integration', render: (i) => <ExternalLink href={i.website}>{i.name}</ExternalLink> }, { key: 'category', label: 'Category' }, { key: 'observedId', label: 'Observed ID', render: (i) => <span className="font-mono text-xs">{i.observedId || ''}</span> }]} rows={b.integrations} />
        </Section>
        <Section title="Content model" actions={<CopyButton text={JSON.stringify(b.contentModel, null, 2)} label="Copy JSON" />}>
          <pre className="code">{JSON.stringify(b.contentModel, null, 2)}</pre>
        </Section>
      </div>
      <Section title="Build checklist">
        <ol className="list-decimal space-y-1 pl-5 text-sm">{b.checklist.map((c, i) => <li key={i}>{c}</li>)}</ol>
      </Section>
    </div>
  )
}

export function RawPanel({ report }) {
  const text = useMemo(() => JSON.stringify(report, null, 2), [report])
  return (
    <Section title="Raw report JSON" subtitle={`${(text.length / 1024).toFixed(1)} KB`} actions={<CopyButton text={text} label="Copy JSON" />}>
      <pre className="code max-h-[70vh]">{text}</pre>
    </Section>
  )
}
