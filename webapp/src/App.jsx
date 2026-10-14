import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { reportToMarkdown } from '../shared/report-markdown.mjs'
import { BlueprintPanel, ContentPanel, DiscoveryPanel, NetworkPanel, RawPanel, ScriptsPanel, SecurityPanel, StructurePanel, TechPanel } from './components/Panels.jsx'
import { OmniCanvasCard } from './components/OmniCanvas.jsx'
import { AudiencePanel, DesignBoard, KeywordsPanel, OfferPanel, PagesPanel, ReachPanel, SnapshotPanel, ValuePanel } from './components/Insights.jsx'
import { PipelineBoard, PortfolioEditor, SettingsPanel } from './components/Pipeline.jsx'
import { STEPS, StepNav, Stepper } from './components/Workflow.jsx'
import { Identity, LibraryGrid, Lightbox, SiteIcon } from './components/Visuals.jsx'
import { Toggle, download } from './components/ui.jsx'
import { clearAll, entryFromReport, exportLibrary, importLibrary, parseUrlList } from './store.js'
import * as lib from './library.js'
import { analyzeViaApi, analyzeViaFirecrawl, analyzeViaFirecrawlApi, captureViaApi, captureViaFirecrawl, captureViaFirecrawlApi, capturePages, describeMcpError, detectApi, detectDownloads, detectMcp, detectSample, readApiKey, writeApiKey } from './transport.js'
import { detectDb } from './artifactdb.js'
import { agentProxy, cloudProxy, cloudSession, cloudStats, onAuthChange, proxyAvailable, readCloudConfig, signInWithEmail, signOut, writeCloudConfig } from './cloud.js'
import { VERDICT_STAGE, evaluate, handoffMarkdown, handoffPayload, readAgentConfig, readWebhook, sendToWebhook, writeAgentConfig, writeWebhook } from './agent.js'

const EXAMPLES = ['dvoracle.com', 'https://rea.tools/', 'https://vercel.com/']
const IN_ARTIFACT = typeof window !== 'undefined' && Boolean(window.claude && typeof window.claude.use === 'function')

function readInitial() {
  try {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('url')
    const hash = (window.location.hash || '').slice(1)
    return { url: q || (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hash) ? hash : ''), view: params.get('view') || null, step: params.get('step') || null }
  } catch { return { url: '', view: null, step: null } }
}

const BUILD_TABS = [['tech', 'Tech stack'], ['structure', 'Structure'], ['content', 'Content'], ['scripts', 'Scripts & data'], ['network', 'Third parties'], ['security', 'Security']]

export default function App() {
  const initial = useMemo(readInitial, [])
  const [input, setInput] = useState(initial.url)
  const [discover, setDiscover] = useState(true)
  const [fetchScripts, setFetchScripts] = useState(true)
  const [screenshot, setScreenshot] = useState(true)
  const [report, setReport] = useState(null)
  const [step, setStep] = useState(initial.step && STEPS.some((s) => s.key === initial.step) ? initial.step : 'snapshot')
  const [buildTab, setBuildTab] = useState('tech')
  const [view, setView] = useState(initial.view && ['library', 'pipeline', 'settings'].includes(initial.view) ? initial.view : 'library')
  const [entries, setEntries] = useState([])
  const [queue, setQueue] = useState({ running: false, done: 0, total: 0, current: null, errors: [] })
  const cancelRef = useRef(false)
  const [runtime, setRuntime] = useState({ mode: 'detecting', mcp: null, downloads: null, sample: null, dbctx: null })
  const [confirmClear, setConfirmClear] = useState(false)
  const [apiKey, setApiKey] = useState(readApiKey)
  const [cloudCfg, setCloudCfg] = useState(readCloudConfig)
  const [cloudState, setCloudState] = useState({ signedIn: false, label: 'not configured', stats: null, proxy: false })
  const [agentCfg, setAgentCfg] = useState(readAgentConfig)
  const [webhook, setWebhook] = useState(readWebhook)
  const [portfolio, setPortfolio] = useState({ items: [], updatedAt: null })
  const [zoom, setZoom] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [notice, setNotice] = useState(null)
  const captureAbort = useRef(null)

  // ---- runtime + remote store -----------------------------------------------------------------
  const remote = useMemo(() => {
    if (runtime.mode === 'detecting') return null
    if (IN_ARTIFACT) return runtime.dbctx ? lib.artifactProvider(runtime.dbctx) : null
    return cloudCfg.configured ? lib.cloudProvider() : null
  }, [runtime.mode, runtime.dbctx, cloudCfg.configured, cloudCfg.url])

  const refreshCloudState = useCallback(async () => {
    if (IN_ARTIFACT || !cloudCfg.configured) { setCloudState({ signedIn: false, label: IN_ARTIFACT ? 'artifact database' : 'not configured', stats: null, proxy: false }); return }
    const session = await cloudSession().catch(() => null)
    if (!session) { setCloudState({ signedIn: false, label: 'configured, signed out', stats: null, proxy: false }); return }
    const [stats, proxy] = await Promise.all([cloudStats().catch(() => null), proxyAvailable().catch(() => false)])
    setCloudState({ signedIn: true, label: 'signed in', stats, proxy })
  }, [cloudCfg.configured])

  useEffect(() => {
    ;(async () => {
      if (IN_ARTIFACT) {
        const [mcp, downloads, sample, dbctx] = await Promise.all([detectMcp(), detectDownloads(), detectSample(), detectDb()])
        setRuntime({ mode: mcp ? 'connector' : 'unavailable', mcp, downloads, sample, dbctx })
        return
      }
      const hasApi = await detectApi()
      setRuntime({ mode: hasApi ? 'api' : 'static', mcp: null, downloads: null, sample: null, dbctx: null })
    })()
  }, [])

  useEffect(() => { refreshCloudState() }, [refreshCloudState])
  useEffect(() => {
    if (IN_ARTIFACT || !cloudCfg.configured) return undefined
    let unsub = () => {}
    onAuthChange(() => refreshCloudState()).then((u) => { unsub = u })
    return () => unsub()
  }, [cloudCfg.configured, refreshCloudState])

  const refreshEntries = useCallback(async () => setEntries(await lib.list(remote)), [remote])
  useEffect(() => { if (runtime.mode !== 'detecting') refreshEntries() }, [refreshEntries, runtime.mode, cloudState.signedIn])
  useEffect(() => { if (runtime.mode !== 'detecting') lib.loadPortfolio(remote).then(setPortfolio) }, [remote, runtime.mode, cloudState.signedIn])

  const persist = useCallback(async (r) => {
    const res = await lib.save(r, remote)
    if (res.error) setNotice(res.error)
    await refreshEntries()
    return res
  }, [remote, refreshEntries])

  const syncUrl = useCallback((patch) => {
    if (IN_ARTIFACT) return
    try { const params = new URLSearchParams(window.location.search); for (const [k, v] of Object.entries(patch)) { if (v) params.set(k, v); else params.delete(k) } window.history.replaceState(null, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`) } catch { /* no history */ }
  }, [])

  const showReport = useCallback((r, toStep = 'snapshot') => { setReport(r); setStep(toStep); setView('report'); syncUrl({ url: r.target.finalUrl, view: null, step: toStep === 'snapshot' ? null : toStep }) }, [syncUrl])
  const goView = useCallback((v) => { setView(v); syncUrl({ view: v === 'library' ? null : v, url: v === 'report' ? report?.target.finalUrl : null, step: null }) }, [syncUrl, report])

  // ---- fetching -------------------------------------------------------------------------------
  const proxyFor = useCallback(async () => (cloudState.signedIn && cloudState.proxy ? cloudProxy().catch(() => null) : null), [cloudState.signedIn, cloudState.proxy])

  const runBatch = useCallback(async (urls) => {
    if (!urls.length || queue.running || runtime.mode === 'detecting') return
    cancelRef.current = false
    const options = { discover, scripts: fetchScripts, screenshot }
    const proxy = runtime.mode === 'static' ? await proxyFor() : null
    const analyze = runtime.mode === 'connector'
      ? (u) => analyzeViaFirecrawl(u, runtime.mcp, options).catch((e) => { throw new Error(describeMcpError(e)) })
      : runtime.mode === 'static' ? (u) => analyzeViaFirecrawlApi(u, { ...options, apiKey, proxy }) : (u) => analyzeViaApi(u, options)
    const errors = []
    setQueue({ running: true, done: 0, total: urls.length, current: urls[0], errors })
    let last = null
    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) break
      setQueue((q) => ({ ...q, current: urls[i] }))
      try {
        const r = await analyze(urls[i])
        const previous = await lib.load(r.target.finalUrl, remote).catch(() => null)
        if (previous?.pipeline) r.pipeline = previous.pipeline
        if (previous?.evaluation) r.evaluation = previous.evaluation
        if (previous?.visuals?.mobile?.dataUrl && !r.visuals.mobile) r.visuals.mobile = previous.visuals.mobile
        if (previous?.pages?.captures?.length && r.pages) r.pages.captures = previous.pages.captures.filter((c) => r.pages.keyPages.some((k) => k.url === c.url) || c.ok)
        await persist(r)
        last = r
        if (urls.length === 1) showReport(r)
      } catch (e) { errors.push({ url: urls[i], error: e.message }) }
      setQueue((q) => ({ ...q, done: i + 1, errors: [...errors] }))
    }
    setQueue((q) => ({ ...q, running: false, current: null }))
    if (urls.length > 1 || (!last && errors.length)) goView('library')
  }, [discover, fetchScripts, screenshot, queue.running, runtime, apiKey, remote, persist, showReport, goView, proxyFor])

  const submit = (e) => { e.preventDefault(); runBatch(parseUrlList(input)) }

  const openEntry = useCallback(async (entry, toStep) => {
    const r = await lib.load(entry.url, remote)
    if (r) showReport(r, toStep); else runBatch([entry.url])
  }, [remote, runBatch, showReport])

  useEffect(() => {
    if (!initial.url || runtime.mode === 'detecting') return
    ;(async () => {
      const all = await lib.list(remote)
      const norm = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
      const hit = all.find((e) => norm(e.url) === norm(initial.url))
      if (hit) openEntry(hit, step); else runBatch([initial.url])
    })()
  }, [runtime.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- renders --------------------------------------------------------------------------------
  const captureFn = useCallback(async (opts) => {
    if (runtime.mode === 'api') return (u) => captureViaApi(u, opts)
    if (runtime.mode === 'connector') return (u) => captureViaFirecrawl(u, runtime.mcp, opts).catch((e) => { throw new Error(describeMcpError(e)) })
    const proxy = await proxyFor()
    return (u) => captureViaFirecrawlApi(u, { ...opts, apiKey, proxy })
  }, [runtime, apiKey, proxyFor])

  const capturePagesFor = useCallback(async (keyPages) => {
    if (!report || capturing) return
    setCapturing(true); setCaptureProgress({ done: 0, total: keyPages.length, current: keyPages[0]?.url })
    captureAbort.current = new AbortController()
    const fn = await captureFn({})
    const results = await capturePages(keyPages.map((k) => k.url), fn, { onProgress: setCaptureProgress, signal: captureAbort.current.signal })
    const r = { ...report, pages: { ...report.pages, captures: [...(report.pages.captures || []).filter((c) => !results.some((x) => x.url === c.url)), ...results.map((x) => ({ ...x, ...(keyPages.find((k) => k.url === x.url) || {}) }))] } }
    setReport(r); await persist(r); setCapturing(false)
  }, [report, capturing, captureFn, persist])

  const captureMobile = useCallback(async () => {
    if (!report || capturing) return
    setCapturing(true)
    try {
      const fn = await captureFn({ mobile: true })
      const shot = await fn(report.target.finalUrl)
      const r = { ...report, visuals: { ...report.visuals, mobile: shot.dataUrl || shot.remoteUrl ? shot : null } }
      setReport(r); await persist(r)
      if (!shot.dataUrl && shot.remoteUrl) setNotice(`Mobile render is a link in this mode: ${shot.remoteUrl}`)
    } catch (e) { setNotice(`Mobile render failed: ${e.message}`) } finally { setCapturing(false) }
  }, [report, capturing, captureFn, persist])

  // ---- agent + pipeline -----------------------------------------------------------------------
  const agentLabel = runtime.sample ? 'claude.ai (artifact)' : cloudState.signedIn && cloudState.proxy ? 'Claude via cloud function (if deployed)' : agentCfg.apiKey ? `Claude (${agentCfg.model})` : 'built-in heuristic (add a key for Claude)'

  const runEvaluate = useCallback(async (target) => {
    const r = target || report
    if (!r || evaluating) return
    setEvaluating(true)
    try {
      const proxy = cloudState.signedIn ? await agentProxy().catch(() => null) : null
      const evaluation = await evaluate(r, portfolio, { sample: runtime.sample, proxy, apiKey: agentCfg.apiKey, model: agentCfg.model })
      const stage = r.pipeline?.stage && !['inbox', 'evaluate'].includes(r.pipeline.stage) ? r.pipeline.stage : VERDICT_STAGE[evaluation.verdict] || 'evaluate'
      const next = { ...r, evaluation, pipeline: { ...(r.pipeline || {}), stage, updatedAt: new Date().toISOString(), suggestedStage: VERDICT_STAGE[evaluation.verdict] } }
      if (!target || target.target.finalUrl === report?.target.finalUrl) setReport(next)
      await persist(next)
    } catch (e) { setNotice(`Value check failed: ${e.message}`) } finally { setEvaluating(false) }
  }, [report, evaluating, portfolio, runtime.sample, cloudState.signedIn, agentCfg, persist])

  const setStageFor = useCallback(async (r, stage) => {
    const next = { ...r, pipeline: { ...(r.pipeline || {}), stage, updatedAt: new Date().toISOString() } }
    if (report?.target.finalUrl === r.target.finalUrl) setReport(next)
    await persist(next)
  }, [report, persist])

  const exportFile = useCallback(async (filename, text) => {
    if (runtime.downloads) { try { await runtime.downloads.save({ filename, data: text }) } catch (e) { if (e?.code !== 'declined') setNotice(`Download failed: ${e?.message || e}`) } return }
    download(filename, text)
  }, [runtime.downloads])

  const slugName = report ? report.target.finalUrl.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_').replace(/_+$/, '') : 'report'
  const activeEntry = report ? entryFromReport(report) : null
  const pendingUrls = parseUrlList(input)
  const stepStatus = report ? { value: report.evaluation ? 'done' : 'todo', pages: report.pages?.captures?.length ? 'done' : undefined } : {}

  const importFromFile = async (file) => {
    try { const data = JSON.parse(await file.text()); const r = await importLibrary(data); setNotice(`Imported: ${r.added} added, ${r.updated} updated, ${r.skipped} skipped.`); refreshEntries() } catch (e) { setNotice(`Import failed: ${e.message}`) }
  }

  const NAV = [['library', `Library (${entries.length})`], ['pipeline', 'Offer pipeline'], ['settings', 'Settings']]

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
      <Lightbox src={zoom} alt="Enlarged render" onClose={() => setZoom(null)} />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Reverse Engineer Any App</h1>
          <p className="text-sm text-ink-400">Paste a URL or a list. Walk the 11-step workflow: who it sells to, what it sells, how it reaches them, every page rendered, the design system, the stack, a rebuild blueprint and a value check for your offer pipeline.</p>
        </div>
        <a className="text-xs text-ink-400 hover:text-white" href="https://github.com/rtmendes/rea/tree/ccr-6ab83666-664d68/webapp" target="_blank" rel="noopener noreferrer">rtmendes/rea · webapp{runtime.mode === 'connector' ? ' · connector mode' : runtime.mode === 'static' ? ' · static mode' : runtime.mode === 'api' ? ' · api mode' : ''}</a>
      </header>

      <form className="card mb-4 space-y-3" onSubmit={submit}>
        <div className="flex flex-col gap-2 md:flex-row">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runBatch(parseUrlList(input)) } }}
            placeholder={'https://example.com\nhttps://another.com   (one per line, or comma separated; Shift+Enter for a new line)'} aria-label="URLs to analyze" rows={Math.min(6, Math.max(1, input.split('\n').length))}
            className="flex-1 resize-y rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-ink-600 focus:border-accent-500" autoFocus />
          <div className="flex gap-2 md:flex-col">
            <button type="submit" disabled={queue.running || !pendingUrls.length || runtime.mode === 'detecting' || runtime.mode === 'unavailable'} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 disabled:opacity-60">{queue.running ? `Analyzing ${queue.done + 1}/${queue.total}…` : pendingUrls.length > 1 ? `Analyze ${pendingUrls.length} sites` : 'Analyze'}</button>
            {queue.running ? <button type="button" className="rounded-lg border border-ink-700 px-3 py-2 text-xs text-ink-200 hover:border-rose-400" onClick={() => { cancelRef.current = true }}>Stop after current</button> : null}
          </div>
        </div>
        {runtime.mode === 'connector' ? <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 p-2 text-xs text-ink-200">Connector mode: pages are fetched through your Firecrawl connector; claude.ai asks once to allow it. Your library is saved in this artifact's database (private to you) and the value check runs on claude.ai. Renders are links here; the GitHub Pages version embeds them.</div> : null}
        {runtime.mode === 'unavailable' ? <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">This page cannot reach a connector in this view. Open it inside claude.ai with the Firecrawl connector added (Settings → Connectors), or use the hosted version.</div> : null}
        {runtime.mode === 'static' ? <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 p-2 text-xs text-ink-200">Static mode: your browser calls Firecrawl directly ({cloudState.proxy ? 'through your cloud proxy' : apiKey ? 'with your key' : 'keyless free tier, rate limited'}) and analyzes locally. Library: {cloudState.signedIn ? `synced to the cloud (${cloudState.stats?.email || 'signed in'})` : 'this browser only'} — <button type="button" className="text-accent-400 hover:text-white" onClick={() => goView('settings')}>Settings</button>.</div> : null}
        {runtime.mode === 'detecting' ? <div className="text-xs text-ink-400">Checking how this page can fetch targets…</div> : null}
        <div className="flex flex-wrap items-center gap-4">
          <Toggle checked={screenshot} onChange={setScreenshot} label={runtime.mode === 'api' ? 'Render (viewport + full page)' : 'Request full-page render (Firecrawl)'} />
          {runtime.mode === 'api' ? <Toggle checked={discover} onChange={setDiscover} label="Probe robots, sitemap, manifest, security.txt" /> : null}
          {runtime.mode === 'api' ? <Toggle checked={fetchScripts} onChange={setFetchScripts} label="Fetch first-party and widget scripts" /> : null}
          <span className="text-xs text-ink-400">Try:</span>
          {EXAMPLES.map((ex) => <button key={ex} type="button" className="chip hover:border-accent-500" onClick={() => { setInput(ex); runBatch([ex]) }}>{ex}</button>)}
        </div>
        {queue.running ? <div className="space-y-1"><div className="h-1.5 overflow-hidden rounded bg-ink-800"><div className="h-full bg-accent-500 transition-all" style={{ width: `${(queue.done / Math.max(1, queue.total)) * 100}%` }} /></div><div className="text-xs text-ink-400">Working on <span className="font-mono text-ink-200">{queue.current}</span></div></div> : null}
        {queue.errors.length ? <ul className="space-y-1 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{queue.errors.map((e) => <li key={e.url}><span className="font-mono">{e.url}</span>: {e.error}</li>)}</ul> : null}
      </form>

      {notice ? <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100"><span className="break-all">{notice}</span><button type="button" className="shrink-0 text-amber-200 hover:text-white" onClick={() => setNotice(null)}>dismiss</button></div> : null}

      <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Views">
        {NAV.map(([key, label]) => <button key={key} type="button" className="tab" aria-selected={view === key} onClick={() => goView(key)}>{label}</button>)}
        {report ? <button type="button" className="tab flex items-center gap-2" aria-selected={view === 'report'} onClick={() => goView('report')}><SiteIcon icon={activeEntry.icon} host={activeEntry.host} brandColor={activeEntry.brandColor} size={16} />{activeEntry.host}</button> : null}
        {entries.length && view === 'library' ? (
          confirmClear
            ? <span className="ml-auto flex items-center gap-2 text-[11px]"><span className="text-ink-400">Remove all {entries.length} sites from this browser{remote ? ' (cloud copies stay)' : ''}?</span><button type="button" className="rounded border border-rose-400/60 px-2 py-0.5 text-rose-200 hover:bg-rose-500/20" onClick={async () => { await clearAll(); setReport(null); setConfirmClear(false); refreshEntries() }}>Yes, clear</button><button type="button" className="text-ink-400 hover:text-white" onClick={() => setConfirmClear(false)}>Keep</button></span>
            : <button type="button" className="ml-auto text-[11px] text-ink-400 hover:text-rose-300" onClick={() => setConfirmClear(true)}>Clear local library</button>
        ) : null}
      </nav>

      {view === 'library' ? <LibraryGrid entries={entries} activeUrl={report?.target.finalUrl} onOpen={openEntry} onRemove={async (e) => { await lib.remove(e.url, remote); if (report?.target.finalUrl === e.url) setReport(null); refreshEntries() }} onReanalyze={(e) => runBatch([e.url])} /> : null}

      {view === 'pipeline' ? (
        <div className="space-y-4">
          <PipelineBoard entries={entries} onOpen={(e) => openEntry(e, 'value')} onStage={async (e, stage) => { const r = await lib.load(e.url, remote); if (r) await setStageFor(r, stage) }} onEvaluate={async (e) => { const r = await lib.load(e.url, remote); if (r) await runEvaluate(r) }} />
          <PortfolioEditor portfolio={portfolio} onSave={async (items) => setPortfolio(await lib.savePortfolio(items, remote))} syncLabel={remote ? `Synced with ${remote.name}.` : 'Saved in this browser.'} />
        </div>
      ) : null}

      {view === 'settings' ? (
        <SettingsPanel runtime={runtime} apiKey={apiKey} onApiKey={(v) => { setApiKey(v); writeApiKey(v) }}
          cloudCfg={cloudCfg} onCloudCfg={(c) => { writeCloudConfig(c); setCloudCfg(readCloudConfig()) }} cloudState={cloudState}
          onSignIn={signInWithEmail} onSignOut={async () => { await signOut(); refreshCloudState() }} pushing={pushing}
          onPushAll={async () => { setPushing(true); const r = await lib.pushAll(remote, () => {}); setPushing(false); setNotice(`Uploaded ${r.pushed} report(s)${r.failed ? `, ${r.failed} failed` : ''}.`); refreshEntries() }}
          agentCfg={agentCfg} onAgentCfg={(c) => { setAgentCfg(c); writeAgentConfig(c) }} webhook={webhook} onWebhook={(u) => { setWebhook(u); writeWebhook(u) }}
          onExportLibrary={async () => exportFile(`rea-library-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportLibrary()))} onImportLibrary={importFromFile} />
      ) : null}

      {view === 'report' && report ? (
        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          <aside className="space-y-3">
            <div className="card space-y-2">
              <Identity entry={activeEntry} size={36} />
              <div className="text-[11px] text-ink-400">Analyzed {new Date(report.generatedAt).toLocaleString()} · {report.durationMs} ms{activeEntry.synced ? ' · ☁ synced' : ''}</div>
              <div className="flex gap-2"><button type="button" className="flex-1 rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => runBatch([report.target.finalUrl])} disabled={queue.running}>Re-analyze</button><a className="flex-1 rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-center text-xs text-ink-200 hover:border-accent-500" href={report.target.finalUrl} target="_blank" rel="noopener noreferrer">Open ↗</a></div>
            </div>
            <div className="card !p-2"><Stepper current={step} onPick={(k) => { setStep(k); syncUrl({ step: k === 'snapshot' ? null : k }) }} status={stepStatus} /></div>
            <div className="card space-y-2">
              <div className="text-xs uppercase tracking-wide text-ink-400">Export</div>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => exportFile(`${slugName}.md`, reportToMarkdown(report))}>Markdown report</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => exportFile(`${slugName}.json`, JSON.stringify(report, null, 2))}>Report JSON</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => exportFile(`${slugName}.tokens.txt`, report.blueprint.tokensCss)}>tokens.css</button>
              {report.evaluation ? <button type="button" className="w-full rounded-md border border-accent-500/50 bg-ink-800 px-2 py-1 text-xs text-accent-400 hover:border-accent-500" onClick={() => exportFile(`${slugName}.handoff.md`, handoffMarkdown(report, report.evaluation, portfolio))}>Pipeline hand-off (.md)</button> : null}
              {report.visuals?.fullPage?.dataUrl?.startsWith('data:') && !IN_ARTIFACT ? <a className="block w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-center text-xs text-ink-200 hover:border-accent-500" href={report.visuals.fullPage.dataUrl} download={`${slugName}.fullpage.jpg`}>Full-page render</a> : null}
              {report.visuals?.screenshot?.dataUrl?.startsWith('data:') && !IN_ARTIFACT ? <a className="block w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-center text-xs text-ink-200 hover:border-accent-500" href={report.visuals.screenshot.dataUrl} download={`${slugName}.screenshot.jpg`}>Screenshot</a> : null}
            </div>
            <div className="card">
              <div className="mb-2 text-xs uppercase tracking-wide text-ink-400">Recent</div>
              <ul className="space-y-1">{entries.slice(0, 10).map((e) => <li key={e.url}><button type="button" className={`w-full rounded px-1.5 py-1 text-left hover:bg-ink-800 ${e.url === report.target.finalUrl ? 'bg-ink-800' : ''}`} onClick={() => openEntry(e)}><Identity entry={e} size={22} /></button></li>)}</ul>
            </div>
          </aside>
          <main className="min-w-0">
            <div className="mb-3 flex items-baseline gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-sm font-bold text-ink-950">{STEPS.find((s) => s.key === step)?.n}</span><h2 className="text-lg font-semibold text-white">{STEPS.find((s) => s.key === step)?.label}</h2><span className="text-xs text-ink-400">{STEPS.find((s) => s.key === step)?.hint}</span></div>
            {step === 'snapshot' && <SnapshotPanel report={report} onOpenStep={setStep} inArtifact={IN_ARTIFACT} onCaptureMobile={captureMobile} capturing={capturing} onZoom={setZoom} />}
            {step === 'audience' && <AudiencePanel report={report} />}
            {step === 'offer' && <OfferPanel report={report} />}
            {step === 'keywords' && <KeywordsPanel report={report} />}
            {step === 'reach' && <ReachPanel report={report} />}
            {step === 'pages' && <PagesPanel report={report} onCapturePages={capturePagesFor} capturing={capturing} captureProgress={captureProgress} onZoom={setZoom} onOpen={(u) => { setInput(u); runBatch([u]) }} inArtifact={IN_ARTIFACT} />}
            {step === 'design' && <DesignBoard report={report} />}
            {step === 'build' && (
              <div className="space-y-4">
                <nav role="tablist" className="flex gap-1 overflow-x-auto rounded-xl border border-ink-700/70 bg-ink-900/70 p-1">{BUILD_TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={buildTab === k} className="tab" onClick={() => setBuildTab(k)}>{l}</button>)}</nav>
                {buildTab === 'tech' && <TechPanel report={report} />}
                {buildTab === 'structure' && <StructurePanel report={report} />}
                {buildTab === 'content' && <ContentPanel report={report} />}
                {buildTab === 'scripts' && <ScriptsPanel report={report} />}
                {buildTab === 'network' && <NetworkPanel report={report} />}
                {buildTab === 'security' && <SecurityPanel report={report} />}
              </div>
            )}
            {step === 'blueprint' && <BlueprintPanel report={report} />}
            {step === 'value' && <ValuePanel report={report} portfolio={portfolio} onEvaluate={() => runEvaluate()} evaluating={evaluating} onStage={(s) => setStageFor(report, s)} agentLabel={agentLabel}
              onExportBrief={(kind) => (kind === 'md' ? exportFile(`${slugName}.handoff.md`, handoffMarkdown(report, report.evaluation, portfolio)) : exportFile(`${slugName}.handoff.json`, JSON.stringify(handoffPayload(report, report.evaluation, portfolio), null, 2)))}
              onSendWebhook={() => sendToWebhook(webhook, handoffPayload(report, report.evaluation, portfolio))} webhook={webhook} onOpenSettings={() => goView('settings')} onOpenPortfolio={() => goView('pipeline')} />}
            {step === 'value' && <OmniCanvasCard report={report} mode={runtime.mode} onDownload={(text) => exportFile(`${slugName}.omnicanvas.json`, text)} />}
            {step === 'raw' && <div className="space-y-4"><DiscoveryPanel report={report} /><RawPanel report={report} /></div>}
            <StepNav current={step} onPick={(k) => { setStep(k); syncUrl({ step: k === 'snapshot' ? null : k }); window.scrollTo({ top: 0 }) }} />
          </main>
        </div>
      ) : null}
    </div>
  )
}
