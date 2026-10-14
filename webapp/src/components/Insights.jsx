// Workflow steps 2–7 and 10: the visual, decision-oriented panels.
import { useMemo, useState } from 'react'
import { Chips, CopyButton, ExternalLink, Section, Stat, Table } from './ui.jsx'
import { Bars, Breakdown, Meter, TagCloud } from './Charts.jsx'
import { PageGallery, RenderSwitch as RenderSwitchLocal } from './Frames.jsx'
import { SiteIcon as SiteIconLocal } from './Visuals.jsx'
import { STAGES, VERDICT_STAGE } from '../agent.js'

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n ?? '—')

function Evidence({ items, empty = 'Nothing observed on this page.', render }) {
  if (!items?.length) return <p className="text-xs text-ink-400">{empty}</p>
  return <ul className="space-y-1">{items.map((x, i) => <li key={i} className="rounded-md border border-ink-800 bg-ink-950 px-2 py-1 text-xs text-ink-200">{render ? render(x) : x.text || x}</li>)}</ul>
}

function Field({ label, children, hint }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-sm text-ink-200">{children}</div>
      {hint ? <div className="mt-1 text-[11px] text-ink-400">{hint}</div> : null}
    </div>
  )
}

// ---- 2. Who it sells to ----------------------------------------------------------------------
export function AudiencePanel({ report }) {
  const a = report.audience
  if (!a) return <p className="text-sm text-ink-400">Re-analyze this site to get the customer avatar (older report).</p>
  const s = a.summary
  const tone = a.tone
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">{a.disclaimer} Confidence: <b>{a.confidence}</b> ({a.evidenceCount} evidence items).</div>
      <section className="card grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-xl border border-ink-800 bg-ink-950 p-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent-500/60 bg-ink-900 text-3xl" aria-hidden="true">{a.model.label === 'B2B' ? '🏢' : a.model.label === 'B2C' ? '🙂' : '👥'}</div>
          <div className="mt-3 text-sm font-semibold text-white">{s.who}</div>
          <div className="mt-1 text-[11px] text-ink-400">{a.model.label} · B2B cues {a.model.b2bHits} · B2C cues {a.model.b2cHits}</div>
          <div className="mt-2 text-[11px] text-ink-400">{a.locale.lang || a.locale.textLanguage || 'language n/a'}{a.locale.currency ? ` · ${a.locale.currency}` : ''}{a.locale.hreflang.length ? ` · ${a.locale.hreflang.length} locales` : ''}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Wants (outcomes promised)">{s.wants.length ? <ul className="list-disc pl-4">{s.wants.map((w, i) => <li key={i}>{w}</li>)}</ul> : '—'}</Field>
          <Field label="Struggles (pains named)">{s.struggles.length ? <ul className="list-disc pl-4">{s.struggles.map((w, i) => <li key={i}>{w}</li>)}</ul> : '—'}</Field>
          <Field label="Hesitations the page answers"><Chips items={s.hesitations} /></Field>
          <Field label="Convinced by"><Chips items={s.convincedBy} empty="no proof devices found" /></Field>
          <Field label="Budget" hint={a.pricing.band ? `${a.pricing.band}${a.pricing.freePlan ? ' · free plan advertised' : ''}` : null}>{s.budget}</Field>
          <Field label="Reached through"><Chips items={s.reaches} empty="no channels linked" /></Field>
          <Field label="Tone">{s.tone}</Field>
          <Field label="Voice stats" hint="avg sentence words · 2nd person hits · we hits · ! · ?">{tone.avgSentenceWords} · {tone.secondPersonHits} · {tone.firstPersonPluralHits} · {tone.exclamations} · {tone.questions}</Field>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Who the copy names" subtitle='Explicit "for …" phrases and role words, with the sentence they come from.'>
          <Evidence items={a.who} render={(w) => <><b className="text-white">{w.label}</b> <span className="text-ink-400">· {w.count}× · {w.kind}</span>{w.evidence?.[0] ? <div className="mt-0.5 text-ink-400">“{w.evidence[0]}”</div> : null}</>} />
        </Section>
        <Section title="Proof devices" subtitle="Numbers, testimonial sections, logo strips and ratings.">
          <Evidence items={a.proof} render={(p) => <><span className="chip mr-1 !py-0 text-[10px]">{p.kind}</span>{p.text}</>} />
        </Section>
        <Section title="Outcomes promised (wants)"><Evidence items={a.wants} render={(w) => <>{w.text} <span className="text-ink-400">· marker “{w.marker}”</span></>} /></Section>
        <Section title="Pains named (struggles)"><Evidence items={a.struggles} render={(w) => <>{w.text} <span className="text-ink-400">· marker “{w.marker}”</span></>} /></Section>
        <Section title="Objections handled (hesitations)"><Evidence items={a.hesitations} render={(w) => <>{w.text} <span className="text-ink-400">· marker “{w.marker}”</span></>} /></Section>
        <Section title="Channels" subtitle="Where this audience is reached from this page.">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-400">Social</dt><dd><Chips items={a.channels.social.map((x) => x.platform)} /></dd>
            <dt className="text-ink-400">Email capture</dt><dd>{a.channels.emailCaptureForms} form(s)</dd>
            <dt className="text-ink-400">Chat</dt><dd><Chips items={a.channels.chatWidgets} /></dd>
            <dt className="text-ink-400">App stores</dt><dd><Chips items={a.channels.appStores} /></dd>
            <dt className="text-ink-400">Contact</dt><dd><Chips items={[...a.channels.emails, ...a.channels.phones, a.channels.whatsapp && 'WhatsApp'].filter(Boolean)} /></dd>
          </dl>
        </Section>
      </div>
    </div>
  )
}

// ---- 3. What it sells ------------------------------------------------------------------------
export function OfferPanel({ report }) {
  const a = report.audience
  const k = report.keywords
  const st = report.structure
  const prices = (report.content.prices || []).filter((p) => p.context !== 'inline script literal')
  const tiers = a?.pricing?.tiers || []
  const intentOrder = ['try', 'signup', 'buy', 'pricing', 'demo', 'contact', 'download', 'learn']
  const intentCtas = (k?.intents || []).filter((i) => i.intent !== 'other').sort((x, y) => intentOrder.indexOf(x.intent) - intentOrder.indexOf(y.intent))
  const primary = intentCtas[0] ? { text: intentCtas[0].examples[0], hint: `${intentCtas[0].intent} · ${intentCtas[0].count}×` } : st.ctas[0] ? { text: st.ctas[0].text, hint: `${st.ctas[0].occurrences}× · ${st.ctas[0].kind}` } : null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Prices observed" value={prices.length} hint={a?.pricing?.cadence || ''} />
        <Stat label="Price band" value={a?.pricing?.observed ? `${a.pricing.currency || ''}${a.pricing.min}–${a.pricing.max}` : 'none'} hint={a?.pricing?.band || (a?.pricing?.freePlan ? 'free plan' : '')} />
        <Stat label="Primary CTA" value={primary?.text || '—'} hint={primary?.hint || ''} />
        <Stat label="Site type" value={report.summary.siteType} hint={report.summary.focusKeyword ? `focus: ${report.summary.focusKeyword}` : ''} />
      </div>
      <Section title="Offer ladder observed" subtitle="Tiers as they appear in the copy; the context shows what each tier bundles.">
        {tiers.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {tiers.map((t, i) => (
              <div key={i} className={`rounded-xl border p-3 ${i === 1 ? 'border-accent-500/60 bg-accent-500/5' : 'border-ink-800 bg-ink-950'}`}>
                <div className="text-[11px] uppercase tracking-wide text-ink-400">Tier {i + 1}</div>
                <div className="mt-1 text-xl font-semibold text-white">{t.amount}</div>
                <div className="mt-2 text-xs text-ink-200">…{t.context}…</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-ink-400">No prices on this page. Render the pricing page in step 6 or analyze it directly.</p>}
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Calls to action by intent" subtitle="What the page asks visitors to do, grouped.">
          <Bars rows={(k?.intents || []).map((i) => ({ key: i.intent, label: i.intent, value: i.count, title: `${i.intent}: ${i.examples.join(' / ')}` }))} labelWidth="w-20" />
          <div className="mt-3 space-y-1">{(k?.intents || []).map((i) => <div key={i.intent} className="text-xs"><span className="chip mr-1 !py-0 text-[10px]">{i.intent}</span><span className="text-ink-200">{i.examples.join(' · ')}</span></div>)}</div>
        </Section>
        <Section title="Conversion path" subtitle="Forms, sign-up and app origins observed.">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-ink-400">Forms</dt><dd>{st.forms.length ? st.forms.map((f, i) => <div key={i} className="text-xs"><span className="font-mono">{f.method.toUpperCase()} {f.action || '(same page)'}</span> · <Chips items={f.fields.map((x) => x.type || x.tag)} /></div>) : 'none on this page'}</dd>
            <dt className="text-ink-400">App origins</dt><dd><Chips items={report.network.subdomainsOfTarget} empty="none observed" /></dd>
            <dt className="text-ink-400">Sign-up / login pages</dt><dd><Chips items={(report.pages?.pages || []).filter((p) => ['signup', 'login', 'pricing', 'demo'].includes(p.type)).map((p) => `${p.type}: ${p.path}`)} empty="none linked" /></dd>
            <dt className="text-ink-400">Payments / checkout tech</dt><dd><Chips items={report.technologies.filter((t) => ['payments', 'ecommerce'].includes(t.category)).map((t) => t.name)} empty="none detected" /></dd>
          </dl>
        </Section>
      </div>
      <Section title="Every price with context">
        <Table columns={[{ key: 'amount', label: 'Amount', render: (p) => <span className="font-mono text-xs text-white">{p.amount}</span> }, { key: 'context', label: 'Context' }]} rows={prices} empty="No prices in visible text." />
      </Section>
    </div>
  )
}

// ---- 4. Messaging & keywords -----------------------------------------------------------------
export function KeywordsPanel({ report }) {
  const k = report.keywords
  const [picked, setPicked] = useState(null)
  if (!k) return <p className="text-sm text-ink-400">Re-analyze to get keywords (older report).</p>
  const blocks = useMemo(() => (picked ? report.content.textBlocks.filter((b) => b.text.toLowerCase().includes(picked)).slice(0, 12) : []), [picked, report])
  const placements = ['title', 'h1', 'description', 'h2', 'h3', 'nav', 'cta', 'alt', 'url', 'body']
  const placementCounts = placements.map((p) => ({ label: p, value: k.terms.reduce((a, t) => a + (t.where[p] || 0), 0) })).filter((x) => x.value)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Focus keyword" value={k.focus?.term || '—'} hint={k.focus ? `score ${k.focus.score} · ${Object.keys(k.focus.where).join(', ')}` : 'none'} />
        <Stat label="Distinct terms" value={fmt(k.totals.distinctTerms)} hint={`${fmt(k.totals.termHits)} weighted hits`} />
        <Stat label="Phrases" value={fmt(k.phrases.length)} hint={`${fmt(k.totals.distinctPhrases)} candidates`} />
        <Stat label="Meta keywords" value={k.metaKeywords.length} hint={k.metaKeywords.slice(0, 3).join(', ')} />
      </div>
      <Section title="Term cloud" subtitle="Size follows placement-weighted score. Click a term to see where it appears." actions={picked ? <button type="button" className="chip" onClick={() => setPicked(null)}>clear “{picked}”</button> : null}>
        <TagCloud items={k.terms} onPick={(t) => setPicked(t.term)} picked={picked} />
        {picked ? <div className="mt-3 space-y-1">{blocks.map((b, i) => <div key={i} className="flex gap-2 text-xs"><span className="w-8 shrink-0 font-mono text-ink-400">{b.tag}</span><span className="text-ink-200">{b.text}</span></div>)}{!blocks.length ? <p className="text-xs text-ink-400">Appears only in metadata, alt text or the URL.</p> : null}</div> : null}
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top phrases" subtitle="2–3 word phrases that recur or sit in the title / h1 / description.">
          <Bars rows={k.phrases.slice(0, 15).map((p) => ({ key: p.term, label: p.term, value: p.score, title: `${p.term}: ${p.count}× · ${Object.entries(p.where).map(([a, b]) => `${a} ${b}`).join(', ')}` }))} labelWidth="w-44" onPick={(r) => setPicked(r.key)} picked={picked} />
        </Section>
        <Section title="Top terms" subtitle="Placement-weighted; share is the term's part of all weighted hits.">
          <Bars rows={k.terms.slice(0, 15).map((t) => ({ key: t.term, label: t.term, value: t.score, title: `${t.term}: ${t.count}× · share ${t.share}%` }))} labelWidth="w-32" onPick={(r) => setPicked(r.key)} picked={picked} />
        </Section>
      </div>
      <Section title="Where the weight comes from" subtitle={k.method}><Breakdown parts={placementCounts} /></Section>
      <Section title="Headlines in order" subtitle="The message hierarchy as written."><ol className="space-y-0.5 text-sm">{report.structure.outline.slice(0, 30).map((h, i) => <li key={i} style={{ paddingLeft: `${(h.level - 1) * 14}px` }}><span className="mr-2 font-mono text-[11px] text-ink-400">h{h.level}</span>{h.text}</li>)}</ol></Section>
    </div>
  )
}

// ---- 5. Reach & traffic signals --------------------------------------------------------------
export function ReachPanel({ report }) {
  const r = report.reach
  if (!r) return <p className="text-sm text-ink-400">Re-analyze to get reach signals (older report).</p>
  const groups = [...new Set(r.signals.map((s) => s.group))]
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">{r.disclaimer}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Paid acquisition" value={r.paidAcquisitionLikely ? 'likely' : 'not seen'} hint={r.ads.map((a) => a.name).join(', ') || 'no ad pixels'} />
        <Stat label="Organic content" value={r.organicContentLikely ? 'likely' : 'not seen'} hint="blog links / sitemap size" />
        <Stat label="Tracking IDs" value={r.trackingIdCount} hint={r.analytics.map((a) => a.name).join(', ') || 'no analytics'} />
        <Stat label="Social profiles" value={Object.keys(r.socialByPlatform).length} hint={Object.keys(r.socialByPlatform).join(', ')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((g) => (
          <Section key={g} title={g}>
            <dl className="space-y-2 text-sm">
              {r.signals.filter((s) => s.group === g).map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">{s.label}</dt>
                  <dd className="mt-0.5"><Chips items={s.value} empty="none" />{s.note ? <div className="mt-0.5 text-[11px] text-ink-400">{s.note}</div> : null}</dd>
                </div>
              ))}
            </dl>
          </Section>
        ))}
      </div>
      <Section title="Traffic estimates and history (public tools)" subtitle="Each opens the tool's own page for this domain. Figures there are the tool's estimates, not measurements.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{r.lookups.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-accent-400 hover:border-accent-500 hover:text-white">{l.name} ↗<div className="truncate font-mono text-[11px] text-ink-400">{l.url}</div></a>)}</div>
      </Section>
      <Section title="Social profiles linked">
        {Object.keys(r.socialByPlatform).length ? <ul className="space-y-1 text-sm">{Object.entries(r.socialByPlatform).map(([p, urls]) => <li key={p}><span className="chip mr-2">{p}</span>{urls.map((u) => <ExternalLink key={u} href={u}><span className="mr-2 text-xs">{u.replace(/^https?:\/\//, '')}</span></ExternalLink>)}</li>)}</ul> : <p className="text-sm text-ink-400">None linked from this page.</p>}
      </Section>
    </div>
  )
}

// ---- 6. Pages & flows ------------------------------------------------------------------------
export function PagesPanel({ report, onCapturePages, capturing, captureProgress, onZoom, onOpen, inArtifact }) {
  const p = report.pages
  if (!p) return <p className="text-sm text-ink-400">Re-analyze to get the site map (older report).</p>
  const [filter, setFilter] = useState('')
  const rows = p.pages.filter((x) => !filter || `${x.path} ${x.label} ${x.type} ${x.section}`.toLowerCase().includes(filter.toLowerCase()))
  const typeRows = Object.entries(p.byType).map(([t, n]) => ({ key: t, label: t, value: n }))
  const notYet = p.keyPages.filter((k) => !(p.captures || []).some((c) => c.url === k.url))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Internal pages linked" value={p.internalCount} hint={p.source} />
        <Stat label="Sections" value={p.sections.length} hint={p.sections.slice(0, 3).map((s) => s.name).join(', ')} />
        <Stat label="In navigation" value={p.navCount} hint={`${p.footerOnlyCount} footer-only`} />
        <Stat label="Other origins" value={p.subdomains.length} hint={p.subdomains.join(', ')} />
      </div>
      <Section title="Rendered key pages" subtitle={`One render per page type (${p.keyPages.map((k) => k.type).join(', ') || 'none found'}). Each render is one Firecrawl request; they run spaced out to respect rate limits.`}
        actions={notYet.length && onCapturePages ? <button type="button" className="rounded-md bg-accent-600 px-3 py-1 text-xs font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60" disabled={capturing} onClick={() => onCapturePages(notYet)}>{capturing ? `Rendering ${captureProgress?.done ?? 0}/${captureProgress?.total ?? notYet.length}…` : `Render ${notYet.length} key page${notYet.length > 1 ? 's' : ''}`}</button> : null}>
        {capturing && captureProgress?.current ? <div className="mb-2 text-xs text-ink-400">Rendering <span className="font-mono text-ink-200">{captureProgress.current}</span></div> : null}
        {captureProgress?.stopped ? <div className="mb-2 text-xs text-amber-200">Stopped: {captureProgress.stopped}. Add a Firecrawl key in Settings for higher limits.</div> : null}
        <PageGallery captures={p.captures} onZoom={onZoom} onOpen={onOpen} />
        {!p.captures?.length && !notYet.length ? <p className="text-sm text-ink-400">No key pages to render: this page links only to itself{p.anchors?.length ? ' and to in-page sections' : ''}.</p> : null}
        {inArtifact && notYet.length ? <p className="mt-2 text-[11px] text-ink-400">In the claude.ai artifact, renders are links (images cannot be embedded here).</p> : null}
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Pages by type"><Bars rows={typeRows} labelWidth="w-28" /></Section>
        <Section title="Sections of the site" subtitle="First path segment, or the subdomain.">
          <Bars rows={p.sections.slice(0, 15).map((s) => ({ key: s.name, label: s.name, value: s.count, title: `${s.name}: ${s.count} pages · types ${s.types.join(', ')} · e.g. ${s.samples.slice(0, 3).join(', ')}` }))} labelWidth="w-36" />
        </Section>
      </div>
      {p.anchors?.length ? <Section title="In-page sections (anchors)" subtitle="Single-page sites expose their flow as #anchors."><Chips items={p.anchors.map((a) => `#${a.id}${a.label ? ` “${a.label}”` : ''} ×${a.count}${a.exists ? '' : ' (missing target)'}`)} /></Section> : null}
      <Section title="Site map" subtitle="Every internal link, nav links first." actions={<input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter pages…" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs" />}>
        <Table columns={[
          { key: 'path', label: 'Path', render: (x) => <a className="break-all font-mono text-xs text-accent-400 hover:text-white" href={x.url} target="_blank" rel="noopener noreferrer">{x.subdomain ? `${x.host}` : ''}{x.path}</a> },
          { key: 'type', label: 'Type', render: (x) => <span className="chip !py-0 text-[10px]">{x.type}</span> },
          { key: 'label', label: 'Link text', render: (x) => x.labels.join(' · ') },
          { key: 'count', label: '×' },
          { key: 'where', label: 'From', render: (x) => [x.inNav && 'nav', x.inBody && 'body', x.inFooter && 'footer', x.fromSitemap && 'sitemap'].filter(Boolean).join(', ') },
          { key: 'act', label: '', render: (x) => <button type="button" className="text-xs text-accent-400 hover:text-white" onClick={() => onOpen?.(x.url)}>analyze →</button> },
        ]} rows={rows} />
      </Section>
    </div>
  )
}

// ---- 7. Look & feel (design board) -----------------------------------------------------------
function textOn(hex) { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff'; const n = parseInt(m[1], 16); const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; return l > 0.6 ? '#0b0f17' : '#fff' }

export function DesignBoard({ report }) {
  const d = report.design
  const fb = report.visuals?.firecrawlBranding
  const bg = d.colors.roles.background || fb?.colors?.background || '#111'
  const fg = d.colors.roles.foreground || fb?.colors?.textPrimary || '#eee'
  const accent = d.colors.roles.accent || fb?.colors?.accent || fb?.colors?.primary || '#22d3ee'
  const heading = d.typography.fontFaces[0]?.family || d.typography.googleFonts[0]?.family || fb?.typography?.fontFamilies?.heading || d.typography.families[0]?.family || 'system-ui'
  const body = d.typography.googleFonts.find((g) => g.family !== heading)?.family || fb?.typography?.fontFamilies?.primary || d.typography.families.find((f) => f.family !== heading)?.family || heading
  const gfonts = [...new Set([heading, body].filter((f) => f && f !== 'system-ui'))]
  const radius = d.shape.borderRadius[0]?.value || fb?.components?.buttonPrimary?.borderRadius || '8px'
  const shadow = d.shape.boxShadow[0]?.value || 'none'
  const scale = d.typography.typeScalePx.filter((t) => t.px >= 10 && t.px <= 96).sort((a, b) => b.count - a.count).slice(0, 6).sort((a, b) => b.px - a.px)
  return (
    <div className="space-y-4">
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${gfonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;700`).join('&')}&display=swap`} />
      <section className="rounded-xl border border-ink-700/70 p-5" style={{ background: bg, color: fg }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <div className="text-[11px] uppercase tracking-wide opacity-60" style={{ fontFamily: `'${body}', system-ui` }}>Specimen rendered with the observed tokens</div>
            {scale.slice(0, 2).map((t) => <div key={t.px} style={{ fontFamily: `'${heading}', system-ui`, fontSize: Math.min(t.px, 56), lineHeight: 1.1, fontWeight: 700 }} className="mt-2 line-clamp-2">{report.summary.headline || report.summary.title || 'Headline'}</div>)}
            <p className="mt-3 text-base opacity-85" style={{ fontFamily: `'${body}', system-ui` }}>{report.summary.description || 'Body copy specimen in the body typeface.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-block px-4 py-2 text-sm font-semibold" style={{ background: accent, color: fb?.components?.buttonPrimary?.textColor || textOn(accent), borderRadius: radius, boxShadow: shadow === 'none' ? undefined : shadow, fontFamily: `'${body}', system-ui` }}>{(report.keywords?.intents || []).find((i) => ['try', 'signup', 'buy'].includes(i.intent))?.examples[0] || report.structure.ctas[0]?.text || 'Primary action'}</span>
              <span className="inline-block px-4 py-2 text-sm font-semibold" style={{ border: `1px solid ${accent}`, color: accent, borderRadius: radius, fontFamily: `'${body}', system-ui` }}>{report.structure.ctas[1]?.text || 'Secondary'}</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {d.colors.palette.slice(0, 10).map((p) => <span key={p.hex} className="h-10 w-10 rounded-md border border-white/10" style={{ background: p.hex }} title={`${p.hex} · ${p.role} · ${p.count}×`} />)}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Mode" value={d.colors.mode} hint={`bg ${bg} · fg ${fg}`} />
        <Stat label="Accent" value={accent} hint={d.colors.roles.contrastAccentOnBackground ? `contrast ${d.colors.roles.contrastAccentOnBackground}:1` : ''} />
        <Stat label="Heading / body" value={heading} hint={body !== heading ? body : 'same family'} />
        <Stat label="Radius / shadow" value={radius} hint={shadow !== 'none' ? shadow.slice(0, 40) : 'no shadows'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Colour roles" subtitle="From inline CSS and Firecrawl's branding pass.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[['background', bg], ['foreground', fg], ['accent', accent], ...(fb?.colors ? Object.entries(fb.colors).filter(([k]) => !['background', 'textPrimary', 'accent'].includes(k)).map(([k, v]) => [`firecrawl ${k}`, v]) : [])].filter(([, c]) => c).map(([label, c]) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950 p-2"><span className="h-8 w-8 shrink-0 rounded-md border border-white/10" style={{ background: c }} /><div className="min-w-0"><div className="truncate text-[11px] text-ink-400">{label}</div><div className="flex items-center gap-1 font-mono text-xs text-white">{c}<CopyButton text={c} label="⧉" /></div></div></div>
            ))}
          </div>
        </Section>
        <Section title="Type scale" subtitle="Most-used sizes, rendered in the heading face.">
          <div className="space-y-1">{scale.map((t) => <div key={t.px} className="flex items-baseline gap-3 border-b border-ink-800 py-1"><span className="w-12 shrink-0 font-mono text-[11px] text-ink-400">{t.px}px</span><span className="truncate text-white" style={{ fontFamily: `'${heading}', system-ui`, fontSize: Math.min(t.px, 40) }}>The quick brown fox</span><span className="ml-auto font-mono text-[11px] text-ink-400">{t.count}×</span></div>)}{!scale.length ? <p className="text-sm text-ink-400">No inline font-size declarations (styles live in external CSS).</p> : null}</div>
        </Section>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Radii"><div className="flex flex-wrap gap-2">{d.shape.borderRadius.slice(0, 6).map((r) => <div key={r.value} className="flex flex-col items-center gap-1 text-[11px] text-ink-400"><span className="h-12 w-12 border-2 border-accent-500/70" style={{ borderRadius: r.value }} />{r.value} ×{r.count}</div>)}{!d.shape.borderRadius.length ? <span className="text-xs text-ink-400">none inline</span> : null}</div></Section>
        <Section title="Shadows"><div className="flex flex-wrap gap-3">{d.shape.boxShadow.slice(0, 4).map((s) => <div key={s.value} className="flex flex-col items-center gap-1 text-[11px] text-ink-400"><span className="h-12 w-16 rounded-md bg-ink-200" style={{ boxShadow: s.value }} /><span className="max-w-[120px] truncate" title={s.value}>{s.value}</span></div>)}{!d.shape.boxShadow.length ? <span className="text-xs text-ink-400">none inline</span> : null}</div></Section>
        <Section title="Motion"><Chips items={[...d.shape.easings.slice(0, 4).map((e) => e.value), ...d.shape.keyframes.slice(0, 6), d.shape.usesPrefersReducedMotion && 'respects reduced motion'].filter(Boolean)} empty="no inline motion tokens" /></Section>
      </div>
      <Section title="Tokens as CSS" actions={<CopyButton text={report.blueprint.tokensCss} label="Copy CSS" />}><pre className="code max-h-72">{report.blueprint.tokensCss}</pre></Section>
    </div>
  )
}

// ---- 10. Value check & hand-off --------------------------------------------------------------
export function ValuePanel({ report, portfolio, onEvaluate, evaluating, onStage, onExportBrief, onSendWebhook, webhook, agentLabel, onOpenSettings, onOpenPortfolio }) {
  const ev = report.evaluation
  const stage = report.pipeline?.stage || 'inbox'
  const o = ev?.offerIdea
  const [sent, setSent] = useState(null)
  return (
    <div className="space-y-4">
      <section className="card grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Does this add new value to our enterprise?</h3>
            <span className="chip">judge: {agentLabel}</span>
            <button type="button" className="text-[11px] text-accent-400 hover:text-white" onClick={onOpenSettings}>change</button>
          </div>
          <p className="text-xs text-ink-400">The agent compares the site with your portfolio ({portfolio?.items?.length || 0} brands / offers / projects{!portfolio?.items?.length ? ' — add yours for a real comparison' : ''}). <button type="button" className="text-accent-400 hover:text-white" onClick={onOpenPortfolio}>Edit portfolio →</button></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60" disabled={evaluating} onClick={onEvaluate}>{evaluating ? 'Judging…' : ev ? 'Re-run value check' : 'Run value check'}</button>
            {ev ? <button type="button" className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500" onClick={() => onExportBrief('md')}>Download brief (.md)</button> : null}
            {ev ? <button type="button" className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500" onClick={() => onExportBrief('json')}>Hand-off JSON</button> : null}
            {ev && webhook ? <button type="button" className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500" onClick={async () => { setSent('sending'); try { await onSendWebhook(); setSent('ok') } catch (e) { setSent(`failed: ${e.message}`) } }}>{sent === 'sending' ? 'Sending…' : 'Send to pipeline webhook'}</button> : null}
          </div>
          {sent && sent !== 'sending' ? <div className={`text-xs ${sent === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>{sent === 'ok' ? 'Delivered to your pipeline webhook.' : sent}</div> : null}
          {ev?.fallbackErrors?.length ? <div className="text-[11px] text-amber-200">Model providers failed ({ev.fallbackErrors.join(' · ')}); the heuristic judged instead.</div> : null}
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-950 p-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-400">Pipeline stage</div>
          <select value={stage} onChange={(e) => onStage(e.target.value)} className="mt-1 w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-white">{STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
          <div className="mt-1 text-[11px] text-ink-400">{STAGES.find(([k]) => k === stage)?.[2]}</div>
          {ev ? <div className="mt-3"><Meter value={ev.score} label="Value score" tone={ev.score >= 70 ? 'good' : ev.score >= 40 ? 'warn' : 'bad'} /><div className="mt-2 text-sm"><span className={`chip ${ev.addsValue ? 'border-emerald-500/40 text-emerald-200' : 'border-rose-500/40 text-rose-200'}`}>{ev.verdict.replace('_', ' ')}</span> <span className="text-[11px] text-ink-400">→ suggested stage: {STAGES.find(([k]) => k === VERDICT_STAGE[ev.verdict])?.[1]}</span></div></div> : null}
        </div>
      </section>
      {ev ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Why" subtitle={`${ev.agent}${ev.model ? ` · ${ev.model}` : ''} · ${new Date(ev.evaluatedAt).toLocaleString()}`}><ul className="list-disc space-y-1 pl-5 text-sm">{ev.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></Section>
            <Section title="Maps to your portfolio">{ev.mapsTo?.length ? <ul className="space-y-1 text-sm">{ev.mapsTo.map((m, i) => <li key={i}><b className="text-white">{m.name}</b> <span className="text-ink-400">({m.portfolioId})</span>: {m.how}</li>)}</ul> : <p className="text-sm text-ink-400">No portfolio item matched{portfolio?.items?.length ? '' : ' (portfolio is empty)'}.</p>}</Section>
          </div>
          <Section title="Offer idea for us (original)" subtitle="A starting point for the offer creation pipeline, never a copy of the source.">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name">{o.name}</Field><Field label="Promise">{o.promise}</Field>
              <Field label="Audience">{o.audience}</Field><Field label="Problem">{o.problem}</Field>
              <Field label="Mechanism">{o.mechanism}</Field><Field label="Price anchor">{o.priceAnchor}</Field>
            </div>
            {o.ladder?.length ? <div className="mt-3 grid gap-2 md:grid-cols-3">{o.ladder.map((t, i) => <div key={i} className="rounded-lg border border-ink-800 bg-ink-950 p-3"><div className="text-[11px] uppercase tracking-wide text-ink-400">{t.tier}</div><div className="text-lg font-semibold text-white">{t.price}</div><div className="text-xs text-ink-200">{t.includes}</div></div>)}</div> : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Deliverables"><ul className="list-disc pl-4">{o.deliverables.map((x, i) => <li key={i}>{x}</li>)}</ul></Field>
              <Field label="Hooks"><ul className="list-disc pl-4">{o.hooks.map((x, i) => <li key={i}>{x}</li>)}</ul></Field>
              <Field label="Objections to answer"><ul className="list-disc pl-4">{o.objections.map((x, i) => <li key={i}><b>{x.objection}</b> — {x.answer}</li>)}</ul></Field>
              <Field label="Proof to gather / channels"><ul className="list-disc pl-4">{[...o.proofToGather, ...o.channels].map((x, i) => <li key={i}>{x}</li>)}</ul></Field>
            </div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Brand learnings"><ul className="list-disc space-y-1 pl-5 text-sm">{ev.brandLearnings.map((r, i) => <li key={i}>{r}</li>)}</ul></Section>
            <Section title="Next steps"><ol className="list-decimal space-y-1 pl-5 text-sm">{ev.nextSteps.map((r, i) => <li key={i}>{r}</li>)}</ol></Section>
          </div>
        </>
      ) : <p className="text-sm text-ink-400">Run the value check to get a verdict, an original offer idea and a hand-off brief for your offer creation pipeline.</p>}
    </div>
  )
}

// ---- 1. Snapshot -----------------------------------------------------------------------------
export function SnapshotPanel({ report, onOpenStep, inArtifact, onCaptureMobile, capturing, onZoom }) {
  const s = report.summary
  const t = report.target
  const v = report.visuals || {}
  const host = new URL(t.finalUrl).hostname
  const a = report.audience?.summary
  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SiteIconLocal icon={v.icon?.dataUrl} host={host} brandColor={v.brandColor} size={56} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-white">{s.title || host}</div>
            <div className="truncate text-sm text-ink-400">{host} · {s.siteType}{s.language ? ` · ${s.language}` : ''}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">{report.design.colors.palette.slice(0, 8).map((p) => <span key={p.hex} className="h-6 w-6 rounded border border-white/10" style={{ background: p.hex }} title={`${p.hex} · ${p.role}`} />)}</div>
        </div>
        <p className="text-sm text-ink-200">{s.description || s.headline || '—'}</p>
        <RenderSwitchLocal report={report} inArtifact={inArtifact} onCaptureMobile={onCaptureMobile} capturing={capturing} onZoom={onZoom} />
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <button type="button" className="text-left" onClick={() => onOpenStep('audience')}><Stat label="2 · Sells to" value={a?.who || '—'} hint={a?.model || ''} /></button>
        <button type="button" className="text-left" onClick={() => onOpenStep('offer')}><Stat label="3 · Budget" value={a?.budget || '—'} hint={`${s.prices} prices · ${s.ctas.length} CTAs`} /></button>
        <button type="button" className="text-left" onClick={() => onOpenStep('keywords')}><Stat label="4 · Focus keyword" value={s.focusKeyword || '—'} hint={(s.topKeywords || []).slice(1, 4).join(', ')} /></button>
        <button type="button" className="text-left" onClick={() => onOpenStep('reach')}><Stat label="5 · Acquisition" value={s.paidAcquisitionLikely ? 'paid + organic' : 'organic / direct'} hint={`${Object.values(s.trackingIds).flat().length} tracking ids`} /></button>
        <button type="button" className="text-left" onClick={() => onOpenStep('pages')}><Stat label="6 · Pages linked" value={s.pageCount ?? '—'} hint={`${s.pageSections ?? 0} sections`} /></button>
        <button type="button" className="text-left" onClick={() => onOpenStep('build')}><Stat label="8 · Stack" value={`${s.technologyCount} tech`} hint={`${s.thirdPartyHosts} third parties · sec ${s.securityScore ?? 'n/a'}`} /></button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Target" subtitle={`HTTP ${t.status ?? '?'} · ${fmt(t.bytes)} bytes${t.timing?.ttfbMs != null ? ` · TTFB ${t.timing.ttfbMs} ms` : ''} · via ${t.source || 'direct fetch'}`}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-400">Final URL</dt><dd className="break-all"><ExternalLink href={t.finalUrl} /></dd>
            <dt className="text-ink-400">Headline</dt><dd>{s.headline || '—'}</dd>
            <dt className="text-ink-400">Server</dt><dd>{report.security.server || 'undisclosed'}</dd>
            <dt className="text-ink-400">Resolved to</dt><dd className="font-mono text-xs">{t.addresses?.length ? t.addresses.join(', ') : 'not observed'}</dd>
            <dt className="text-ink-400">Icon</dt><dd className="text-xs">{v.icon?.remote ? <ExternalLink href={v.icon.url}>{v.icon.url.replace(/^https?:\/\//, '')}</ExternalLink> : v.icon?.dataUrl ? `${v.icon.rel} (${v.icon.type}, ${v.icon.bytes} B)` : 'none; monogram generated'}</dd>
            {v.firecrawlBranding ? <><dt className="text-ink-400">Branding pass</dt><dd className="text-xs">{v.firecrawlBranding.brandName || host} · {v.firecrawlBranding.colorScheme || 'n/a'} · {(v.firecrawlBranding.fonts || []).map((f) => f.family).join(', ') || 'fonts n/a'}</dd></> : null}
          </dl>
        </Section>
        <Section title="Stack at a glance" actions={<button type="button" className="text-xs text-accent-400 hover:text-white" onClick={() => onOpenStep('build')}>Evidence →</button>}>
          <div className="space-y-2">{Object.entries(s.technologiesByCategory).map(([cat, names]) => <div key={cat} className="flex flex-wrap items-baseline gap-2"><span className="w-40 shrink-0 text-xs uppercase tracking-wide text-ink-400">{cat}</span><Chips items={names} /></div>)}</div>
        </Section>
      </div>
      <Section title="Evidence and limitations"><ul className="list-disc space-y-1 pl-5 text-sm text-ink-200">{report.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul></Section>
    </div>
  )
}
