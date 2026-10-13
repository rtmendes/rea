import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { reportToMarkdown } from '../shared/report-markdown.mjs'
import { BlueprintPanel, ContentPanel, DesignPanel, DiscoveryPanel, NetworkPanel, OverviewPanel, RawPanel, ScriptsPanel, SecurityPanel, StructurePanel, TechPanel } from './components/Panels.jsx'
import { Identity, LibraryGrid, SiteIcon } from './components/Visuals.jsx'
import { Toggle, download } from './components/ui.jsx'
import { clearAll, entryFromReport, listEntries, loadReport, parseUrlList, removeEntry, saveReport } from './store.js'

const TABS = [
  ['overview', 'Overview'], ['tech', 'Tech stack'], ['design', 'Design system'], ['structure', 'Structure'], ['content', 'Content'],
  ['scripts', 'Scripts & data'], ['network', 'Third parties'], ['security', 'Security'], ['discovery', 'Discovery'], ['blueprint', 'Rebuild blueprint'], ['raw', 'Raw JSON'],
]
const EXAMPLES = ['dvoracle.com', 'https://rea.tools/', 'https://vercel.com/']

async function analyze(url, options) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, ...options }) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function App() {
  const initialUrl = useMemo(() => new URLSearchParams(window.location.search).get('url') || '', [])
  const [input, setInput] = useState(initialUrl)
  const [discover, setDiscover] = useState(true)
  const [fetchScripts, setFetchScripts] = useState(true)
  const [screenshot, setScreenshot] = useState(true)
  const [report, setReport] = useState(null)
  const [tab, setTab] = useState('overview')
  const [view, setView] = useState('library') // library | report
  const [entries, setEntries] = useState([])
  const [queue, setQueue] = useState({ running: false, done: 0, total: 0, current: null, errors: [] })
  const cancelRef = useRef(false)

  const refreshEntries = useCallback(async () => setEntries(await listEntries()), [])
  useEffect(() => { refreshEntries() }, [refreshEntries])

  const showReport = useCallback((r) => {
    setReport(r); setTab('overview'); setView('report')
    const params = new URLSearchParams(window.location.search); params.set('url', r.target.finalUrl)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [])

  const runBatch = useCallback(async (urls) => {
    if (!urls.length || queue.running) return
    cancelRef.current = false
    const options = { discover, scripts: fetchScripts, screenshot }
    const errors = []
    setQueue({ running: true, done: 0, total: urls.length, current: urls[0], errors })
    let last = null
    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) break
      setQueue((q) => ({ ...q, current: urls[i] }))
      try {
        const r = await analyze(urls[i], options)
        await saveReport(r)
        last = r
        if (urls.length === 1) showReport(r)
      } catch (e) {
        errors.push({ url: urls[i], error: e.message })
      }
      setQueue((q) => ({ ...q, done: i + 1, errors: [...errors] }))
      await refreshEntries()
    }
    setQueue((q) => ({ ...q, running: false, current: null }))
    if (urls.length > 1) setView('library')
    else if (!last && errors.length) setView('library')
  }, [discover, fetchScripts, screenshot, queue.running, refreshEntries, showReport])

  const submit = (e) => { e.preventDefault(); runBatch(parseUrlList(input)) }

  const openEntry = useCallback(async (entry) => {
    const r = await loadReport(entry.url)
    if (r) showReport(r); else runBatch([entry.url])
  }, [runBatch, showReport])

  useEffect(() => {
    if (!initialUrl) return
    ;(async () => {
      const all = await listEntries()
      const hit = all.find((e) => e.url === initialUrl || e.url.replace(/\/$/, '') === initialUrl.replace(/^https?:\/\//, 'https://').replace(/\/$/, ''))
      if (hit) openEntry(hit); else runBatch([initialUrl])
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const slugName = report ? report.target.finalUrl.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_').replace(/_+$/, '') : 'report'
  const activeEntry = report ? entryFromReport(report) : null
  const pendingUrls = parseUrlList(input)

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Reverse Engineer Any App</h1>
          <p className="text-sm text-ink-400">Paste one URL or a list. Get the stack, design tokens, structure, scripts, third parties, security posture and a rebuild blueprint, with a screenshot and logo for every site.</p>
        </div>
        <a className="text-xs text-ink-400 hover:text-white" href="https://github.com/rtmendes/rea" target="_blank" rel="noopener noreferrer">rtmendes/rea · webapp</a>
      </header>

      <form className="card mb-4 space-y-3" onSubmit={submit}>
        <div className="flex flex-col gap-2 md:flex-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runBatch(parseUrlList(input)) } }}
            placeholder={'https://example.com\nhttps://another.com   (one per line, or comma separated; Shift+Enter for a new line)'}
            aria-label="URLs to analyze"
            rows={Math.min(6, Math.max(1, input.split('\n').length))}
            className="flex-1 resize-y rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-ink-600 focus:border-accent-500"
            autoFocus
          />
          <div className="flex gap-2 md:flex-col">
            <button type="submit" disabled={queue.running || !pendingUrls.length} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 disabled:opacity-60">
              {queue.running ? `Analyzing ${queue.done + 1}/${queue.total}…` : pendingUrls.length > 1 ? `Analyze ${pendingUrls.length} sites` : 'Analyze'}
            </button>
            {queue.running ? <button type="button" className="rounded-lg border border-ink-700 px-3 py-2 text-xs text-ink-200 hover:border-rose-400" onClick={() => { cancelRef.current = true }}>Stop after current</button> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle checked={screenshot} onChange={setScreenshot} label="Capture screenshot (local Chromium)" />
          <Toggle checked={discover} onChange={setDiscover} label="Probe robots, sitemap, manifest, security.txt" />
          <Toggle checked={fetchScripts} onChange={setFetchScripts} label="Fetch first-party and widget scripts" />
          <span className="text-xs text-ink-400">Try:</span>
          {EXAMPLES.map((ex) => <button key={ex} type="button" className="chip hover:border-accent-500" onClick={() => { setInput(ex); runBatch([ex]) }}>{ex}</button>)}
        </div>
        {queue.running ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded bg-ink-800"><div className="h-full bg-accent-500 transition-all" style={{ width: `${(queue.done / Math.max(1, queue.total)) * 100}%` }} /></div>
            <div className="text-xs text-ink-400">Working on <span className="font-mono text-ink-200">{queue.current}</span></div>
          </div>
        ) : null}
        {queue.errors.length ? (
          <ul className="space-y-1 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
            {queue.errors.map((e) => <li key={e.url}><span className="font-mono">{e.url}</span>: {e.error}</li>)}
          </ul>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="tab" aria-selected={view === 'library'} onClick={() => setView('library')}>Library ({entries.length})</button>
        {report ? <button type="button" className="tab flex items-center gap-2" aria-selected={view === 'report'} onClick={() => setView('report')}><SiteIcon icon={activeEntry.icon} host={activeEntry.host} brandColor={activeEntry.brandColor} size={16} />{activeEntry.host}</button> : null}
        {entries.length ? <button type="button" className="ml-auto text-[11px] text-ink-400 hover:text-rose-300" onClick={async () => { if (window.confirm('Remove every analyzed site from this browser?')) { await clearAll(); setReport(null); setView('library'); refreshEntries() } }}>Clear library</button> : null}
      </div>

      {view === 'library' ? (
        <LibraryGrid
          entries={entries}
          activeUrl={report?.target.finalUrl}
          onOpen={openEntry}
          onRemove={async (e) => { await removeEntry(e.url); if (report?.target.finalUrl === e.url) setReport(null); refreshEntries() }}
          onReanalyze={(e) => runBatch([e.url])}
        />
      ) : null}

      {view === 'report' && report ? (
        <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
          <aside className="space-y-3">
            <div className="card space-y-2">
              <Identity entry={activeEntry} size={36} />
              <div className="text-[11px] text-ink-400">Generated {new Date(report.generatedAt).toLocaleString()} in {report.durationMs} ms</div>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => runBatch([report.target.finalUrl])} disabled={queue.running}>Re-analyze</button>
            </div>
            <div className="card space-y-2">
              <div className="text-xs uppercase tracking-wide text-ink-400">Export</div>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.json`, JSON.stringify(report, null, 2))}>Download JSON</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.md`, reportToMarkdown(report), 'text/markdown')}>Download Markdown report</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.tokens.css`, report.blueprint.tokensCss, 'text/css')}>Download tokens.css</button>
              {report.visuals?.screenshot ? <a className="block w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-center text-xs text-ink-200 hover:border-accent-500" href={report.visuals.screenshot.dataUrl} download={`${slugName}.screenshot.jpg`}>Download screenshot</a> : null}
              {report.visuals?.icon ? <a className="block w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-center text-xs text-ink-200 hover:border-accent-500" href={report.visuals.icon.dataUrl} download={`${slugName}.icon`}>Download logo / icon</a> : null}
            </div>
            <div className="card">
              <div className="mb-2 text-xs uppercase tracking-wide text-ink-400">Recent</div>
              <ul className="space-y-1">
                {entries.slice(0, 12).map((e) => (
                  <li key={e.url}>
                    <button type="button" className={`w-full rounded px-1.5 py-1 text-left hover:bg-ink-800 ${e.url === report.target.finalUrl ? 'bg-ink-800' : ''}`} onClick={() => openEntry(e)}>
                      <Identity entry={e} size={22} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <main className="min-w-0">
            <nav role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-ink-700/70 bg-ink-900/70 p-1">
              {TABS.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className="tab" onClick={() => setTab(key)}>{label}</button>)}
            </nav>
            {tab === 'overview' && <OverviewPanel report={report} onOpenTab={setTab} />}
            {tab === 'tech' && <TechPanel report={report} />}
            {tab === 'design' && <DesignPanel report={report} />}
            {tab === 'structure' && <StructurePanel report={report} />}
            {tab === 'content' && <ContentPanel report={report} />}
            {tab === 'scripts' && <ScriptsPanel report={report} />}
            {tab === 'network' && <NetworkPanel report={report} />}
            {tab === 'security' && <SecurityPanel report={report} />}
            {tab === 'discovery' && <DiscoveryPanel report={report} />}
            {tab === 'blueprint' && <BlueprintPanel report={report} />}
            {tab === 'raw' && <RawPanel report={report} />}
          </main>
        </div>
      ) : null}
    </div>
  )
}
