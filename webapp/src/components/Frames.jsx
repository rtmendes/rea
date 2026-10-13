// Device frames and galleries for rendered pages: the "see it laid out" part of the report.
import { useEffect, useRef, useState } from 'react'

export function BrowserFrame({ url, children, height = 560, label }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-700/80 bg-ink-950 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-900 px-3 py-1.5">
        <span className="flex gap-1"><i className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></span>
        <span className="ml-2 flex-1 truncate rounded-md bg-ink-950 px-2 py-0.5 font-mono text-[11px] text-ink-400">{url}</span>
        {label ? <span className="chip !py-0 text-[10px]">{label}</span> : null}
      </div>
      <div className="relative overflow-auto bg-ink-950" style={{ height }}>{children}</div>
    </div>
  )
}

export function PhoneFrame({ children, height = 560 }) {
  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[32px] border-[6px] border-ink-700 bg-ink-950 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]" style={{ height }}>
      <div className="mx-auto mt-1 h-4 w-24 rounded-b-xl bg-ink-700" />
      <div className="h-[calc(100%-20px)] overflow-auto">{children}</div>
    </div>
  )
}

/** Live site in an iframe. Many sites refuse framing (X-Frame-Options / CSP); we detect only the load event. */
export function LiveFrame({ url, height = 560 }) {
  const [state, setState] = useState('loading')
  const ref = useRef(null)
  useEffect(() => { setState('loading'); const t = setTimeout(() => setState((s) => (s === 'loading' ? 'slow' : s)), 8000); return () => clearTimeout(t) }, [url])
  return (
    <div className="relative" style={{ height }}>
      <iframe ref={ref} src={url} title={`Live view of ${url}`} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full bg-white" onLoad={() => setState('loaded')} />
      {state !== 'loaded' ? <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink-900/90 p-2 text-center text-[11px] text-ink-300">{state === 'slow' ? 'Still blank? The site refuses to be embedded (X-Frame-Options / frame-ancestors). Use the rendered screenshot or open it in a new tab.' : 'Loading the live site…'}</div> : null}
    </div>
  )
}

/** Tabbed hero: full-page render (scrollable), mobile render, live iframe, and the card thumbnail. */
export function RenderSwitch({ report, inArtifact, onCaptureMobile, capturing, onZoom }) {
  const v = report.visuals || {}
  const url = report.target.finalUrl
  const tabs = [
    v.fullPage?.dataUrl && ['full', 'Full page'],
    v.mobile?.dataUrl && ['mobile', 'Mobile'],
    v.screenshot?.dataUrl && ['viewport', 'Above the fold'],
    !inArtifact && ['live', 'Live site'],
  ].filter(Boolean)
  const [tab, setTab] = useState(tabs[0]?.[0] || 'live')
  useEffect(() => { if (!tabs.some(([k]) => k === tab)) setTab(tabs[0]?.[0] || 'live') }, [report.target.finalUrl]) // eslint-disable-line react-hooks/exhaustive-deps
  const shot = tab === 'full' ? v.fullPage : tab === 'mobile' ? v.mobile : tab === 'viewport' ? v.screenshot : null
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map(([k, label]) => <button key={k} type="button" className="tab !px-2.5 !py-1 !text-xs" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>)}
        {!v.mobile?.dataUrl && onCaptureMobile ? <button type="button" className="chip hover:border-accent-500" disabled={capturing} onClick={onCaptureMobile}>{capturing ? 'Rendering mobile…' : '+ Mobile render'}</button> : null}
        <a className="ml-auto text-[11px] text-accent-400 hover:text-white" href={url} target="_blank" rel="noopener noreferrer">Open site ↗</a>
        {v.screenshot?.remoteUrl && !v.screenshot?.dataUrl?.startsWith('data:') ? <a className="text-[11px] text-accent-400 hover:text-white" href={v.screenshot.remoteUrl} target="_blank" rel="noopener noreferrer">Screenshot link ↗</a> : null}
      </div>
      {tab === 'live' ? (
        <BrowserFrame url={url} label="live"><LiveFrame url={url} height={560} /></BrowserFrame>
      ) : tab === 'mobile' && shot ? (
        <PhoneFrame><img src={shot.dataUrl} alt={`Mobile render of ${url}`} className="w-full cursor-zoom-in" onClick={() => onZoom?.(shot.dataUrl)} /></PhoneFrame>
      ) : shot ? (
        <BrowserFrame url={url} label={`${tab === 'full' ? 'full page' : 'viewport'} · ${shot.width}×${shot.height}`}>
          <img src={shot.dataUrl} alt={`${tab === 'full' ? 'Full-page' : 'Viewport'} render of ${url}`} className="w-full cursor-zoom-in" onClick={() => onZoom?.(shot.dataUrl)} />
        </BrowserFrame>
      ) : <p className="text-sm text-ink-400">No render available in this mode.</p>}
      {shot?.partial ? <div className="text-[11px] text-amber-200">{shot.partial}</div> : null}
      {shot ? <div className="text-[11px] text-ink-400">Rendered {new Date(shot.capturedAt).toLocaleString()} by {shot.engine?.split('/').pop()}.</div> : null}
    </div>
  )
}

/** Gallery of rendered key pages (pricing, signup, about…). */
export function PageGallery({ captures, onZoom, onOpen }) {
  if (!captures?.length) return null
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {captures.map((c) => (
        <figure key={c.url} className="overflow-hidden rounded-lg border border-ink-800 bg-ink-950">
          {c.ok && c.dataUrl ? (
            <button type="button" className="block aspect-[8/5] w-full overflow-hidden" onClick={() => onZoom?.(c.full?.dataUrl || c.dataUrl)} title="Enlarge"><img src={c.dataUrl} alt={`Render of ${c.url}`} className="h-full w-full object-cover object-top" loading="lazy" /></button>
          ) : c.ok && c.remoteUrl ? (
            <a href={c.remoteUrl} target="_blank" rel="noopener noreferrer" className="flex aspect-[8/5] items-center justify-center text-xs text-accent-400">screenshot link ↗</a>
          ) : (
            <div className="flex aspect-[8/5] items-center justify-center p-2 text-center text-[11px] text-rose-300">{c.error || 'not rendered'}</div>
          )}
          <figcaption className="space-y-0.5 p-2 text-[11px]">
            <div className="flex items-center justify-between gap-2"><span className="chip !py-0 text-[10px]">{c.type || 'page'}</span><button type="button" className="text-accent-400 hover:text-white" onClick={() => onOpen?.(c.url)}>analyze →</button></div>
            <div className="truncate font-mono text-ink-400" title={c.url}>{c.path || c.url}</div>
            {c.title ? <div className="truncate text-ink-200" title={c.title}>{c.title}</div> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
