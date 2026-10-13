import { useEffect, useState } from 'react'

function textOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  return lum > 0.6 ? '#0b0f17' : '#ffffff'
}

function initials(host) {
  const core = (host || '').replace(/^www\./, '').split('.')[0] || '?'
  return core.slice(0, 2).toUpperCase()
}

/** Site logo/favicon with a generated monogram fallback in the site's brand colour. */
export function SiteIcon({ icon, host, brandColor, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [icon])
  const style = { width: size, height: size }
  if (icon && !broken) {
    return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-950 ${className}`} style={style}><img src={icon} alt="" width={size} height={size} className="h-full w-full object-contain" onError={() => setBroken(true)} /></span>
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 font-bold ${className}`} style={{ ...style, background: brandColor || '#263146', color: textOn(brandColor || '#263146'), fontSize: size * 0.38 }} aria-hidden="true">
      {initials(host)}
    </span>
  )
}

/** Screenshot / og:image thumbnail with a brand-coloured placeholder when neither exists. */
export function Thumbnail({ src, kind, host, brandColor, backgroundColor, palette = [], className = '', onClick, title, remoteUrl }) {
  const content = src ? (
    <img src={src} alt={`${kind === 'screenshot' ? 'Screenshot' : 'Preview image'} of ${host}`} className="h-full w-full object-cover object-top" loading="lazy" />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2" style={{ background: backgroundColor || '#111827' }}>
      <span className="text-2xl font-bold" style={{ color: brandColor || '#8b97ad' }}>{initials(host)}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-400">{remoteUrl ? 'screenshot opens in a new tab' : 'no preview'}</span>
    </div>
  )
  if (!src && remoteUrl) {
    return (
      <a href={remoteUrl} target="_blank" rel="noopener noreferrer" title={`Open screenshot of ${host}`} className={`relative block aspect-[8/5] w-full overflow-hidden rounded-lg border border-ink-700/70 bg-ink-950 hover:border-accent-500 ${className}`}>
        {content}
        {palette.length ? <span className="absolute bottom-0 left-0 flex h-1.5 w-full">{palette.map((hex) => <span key={hex} className="flex-1" style={{ background: hex }} />)}</span> : null}
        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">screenshot ↗</span>
      </a>
    )
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} title={title} className={`relative block aspect-[8/5] w-full overflow-hidden rounded-lg border border-ink-700/70 bg-ink-950 text-left ${onClick ? 'cursor-zoom-in hover:border-accent-500' : ''} ${className}`}>
      {content}
      {palette.length ? <span className="absolute bottom-0 left-0 flex h-1.5 w-full">{palette.map((hex) => <span key={hex} className="flex-1" style={{ background: hex }} />)}</span> : null}
      {kind ? <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{kind}</span> : null}
    </Tag>
  )
}

export function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, onClose])
  if (!src) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={onClose}>
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg border border-ink-700 shadow-2xl" />
      <button type="button" className="absolute right-4 top-4 rounded-md bg-ink-800 px-3 py-1 text-sm text-white" onClick={onClose}>Close (Esc)</button>
    </div>
  )
}

/** Compact identity line: icon + host + title + brand swatch. */
export function Identity({ entry, size = 28 }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <SiteIcon icon={entry.icon} host={entry.host} brandColor={entry.brandColor} size={size} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{entry.title || entry.host}</div>
        <div className="flex items-center gap-1.5 truncate text-[11px] text-ink-400">
          {entry.brandColor ? <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: entry.brandColor }} title={`brand colour ${entry.brandColor}`} /> : null}
          <span className="truncate">{entry.host}</span>
        </div>
      </div>
    </div>
  )
}

function scoreTone(score) {
  if (score == null) return 'text-ink-400'
  return score >= 70 ? 'text-emerald-300' : score >= 40 ? 'text-amber-200' : 'text-rose-300'
}

/** Card grid for many analyzed sites. */
export function LibraryGrid({ entries, activeUrl, onOpen, onRemove, onReanalyze }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')
  let rows = entries.filter((e) => !q || `${e.host} ${e.title} ${e.siteType} ${e.frameworks.join(' ')} ${e.audience || ''} ${e.focusKeyword || ''} ${(e.keywords || []).join(' ')} ${e.pipeline?.stage || ''}`.toLowerCase().includes(q.toLowerCase()))
  if (sort === 'host') rows = [...rows].sort((a, b) => a.host.localeCompare(b.host))
  if (sort === 'tech') rows = [...rows].sort((a, b) => b.tech - a.tech)
  if (sort === 'security') rows = [...rows].sort((a, b) => (b.securityScore ?? -1) - (a.securityScore ?? -1))
  if (sort === 'value') rows = [...rows].sort((a, b) => (b.evaluation?.score ?? -1) - (a.evaluation?.score ?? -1))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter sites…" aria-label="Filter library" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort library" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-ink-200">
          <option value="recent">Most recent</option><option value="host">Host A–Z</option><option value="tech">Most technologies</option><option value="security">Best security score</option><option value="value">Highest value score</option>
        </select>
        <span className="text-xs text-ink-400">{rows.length} of {entries.length} sites</span>
      </div>
      {rows.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((e) => (
            <article key={e.url} className={`card !p-2 ${activeUrl === e.url ? 'ring-1 ring-accent-500' : ''}`}>
              <Thumbnail src={e.thumb} kind={e.thumbKind} host={e.host} brandColor={e.brandColor} backgroundColor={e.backgroundColor} palette={e.palette} onClick={() => onOpen(e)} title={`Open ${e.host}`} remoteUrl={e.thumbRemoteUrl} />
              <div className="mt-2 flex items-start justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(e)}><Identity entry={e} /></button>
                <span className="mt-0.5 flex items-center gap-1 text-[11px]">
                  <span className={`chip ${e.mode === 'dark' ? '' : 'bg-ink-200 text-ink-900'}`} title={`${e.mode} mode`}>{e.mode === 'dark' ? '●' : '○'}</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-ink-400">
                <span className="chip">{e.siteType}</span>
                {e.audience ? <span className="chip" title="audience (inferred)">{e.audience}</span> : null}
                {e.budget && e.budget !== 'no prices on this page' ? <span className="chip" title="budget observed">{e.budget}</span> : null}
                {e.focusKeyword ? <span className="chip" title="focus keyword">“{e.focusKeyword}”</span> : null}
                {e.frameworks.map((f) => <span key={f} className="chip">{f}</span>)}
                <span className="chip">{e.tech} tech</span>
                <span className={`chip ${scoreTone(e.securityScore)}`}>sec {e.securityScore ?? '—'}</span>
                {e.pageCount != null ? <span className="chip">{e.pageCount} pages</span> : null}
                {e.evaluation ? <span className={`chip ${e.evaluation.addsValue ? 'border-emerald-500/40 text-emerald-200' : 'border-rose-500/40 text-rose-200'}`} title={`value check by ${e.evaluation.agent}`}>{e.evaluation.verdict.replace('_', ' ')} · {e.evaluation.score}</span> : null}
                {e.pipeline?.stage && e.pipeline.stage !== 'inbox' ? <span className="chip border-accent-500/40 text-accent-400">{e.pipeline.stage}</span> : null}
                {e.where === 'remote' ? <span className="chip" title="only in the cloud; opens on demand">☁ cloud</span> : e.synced ? <span className="chip" title="synced">☁</span> : null}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                <span>{new Date(e.at).toLocaleString()}</span>
                <span className="flex gap-2">
                  <button type="button" className="hover:text-white" onClick={() => onReanalyze(e)}>Re-analyze</button>
                  <button type="button" className="hover:text-rose-300" onClick={() => onRemove(e)}>Remove</button>
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="text-sm text-ink-400">{entries.length ? 'No sites match the filter.' : 'No sites analyzed yet. Paste one URL, or many (one per line), above.'}</p>}
    </div>
  )
}
