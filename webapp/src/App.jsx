import { useCallback, useEffect, useMemo, useState } from 'react'
import { reportToMarkdown } from '../shared/report-markdown.mjs'
import { BlueprintPanel, ContentPanel, DesignPanel, DiscoveryPanel, NetworkPanel, OverviewPanel, RawPanel, ScriptsPanel, SecurityPanel, StructurePanel, TechPanel } from './components/Panels.jsx'
import { Toggle, download } from './components/ui.jsx'

const TABS = [
  ['overview', 'Overview'], ['tech', 'Tech stack'], ['design', 'Design system'], ['structure', 'Structure'], ['content', 'Content'],
  ['scripts', 'Scripts & data'], ['network', 'Third parties'], ['security', 'Security'], ['discovery', 'Discovery'], ['blueprint', 'Rebuild blueprint'], ['raw', 'Raw JSON'],
]
const HISTORY_KEY = 'rea-webapp:history'
const EXAMPLES = ['dvoracle.com', 'https://rea.tools/', 'https://vercel.com/']

function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
function saveHistory(items) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20))) } catch { /* ignore */ } }

export default function App() {
  const initialUrl = useMemo(() => new URLSearchParams(window.location.search).get('url') || '', [])
  const [url, setUrl] = useState(initialUrl)
  const [discover, setDiscover] = useState(true)
  const [fetchScripts, setFetchScripts] = useState(true)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [tab, setTab] = useState('overview')
  const [history, setHistory] = useState(loadHistory)

  const run = useCallback(async (target) => {
    const value = (target ?? url).trim()
    if (!value) return
    setStatus('loading'); setError(null)
    const started = performance.now()
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: value, discover, scripts: fetchScripts }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setReport(data); setStatus('done'); setTab('overview')
      const next = [{ url: data.target.finalUrl, title: data.summary.title, at: data.generatedAt, tech: data.summary.technologyCount }, ...history.filter((h) => h.url !== data.target.finalUrl)]
      setHistory(next); saveHistory(next)
      const params = new URLSearchParams(window.location.search); params.set('url', value)
      window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    } catch (e) {
      setError(`${e.message} (${Math.round(performance.now() - started)} ms)`); setStatus('error')
    }
  }, [url, discover, fetchScripts, history])

  useEffect(() => { if (initialUrl) run(initialUrl) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const slugName = report ? report.target.finalUrl.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_').replace(/_+$/, '') : 'report'

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Reverse Engineer Any App</h1>
          <p className="text-sm text-ink-400">Paste a URL. Get the stack, design tokens, structure, scripts, third parties, security posture and a rebuild blueprint, each claim with its evidence.</p>
        </div>
        <a className="text-xs text-ink-400 hover:text-white" href="https://github.com/rtmendes/rea" target="_blank" rel="noopener noreferrer">rtmendes/rea · webapp</a>
      </header>

      <form className="card mb-4 space-y-3" onSubmit={(e) => { e.preventDefault(); run() }}>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            aria-label="URL to analyze"
            className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-ink-600 focus:border-accent-500"
            autoFocus
          />
          <button type="submit" disabled={status === 'loading'} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-accent-400 disabled:opacity-60">
            {status === 'loading' ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Toggle checked={discover} onChange={setDiscover} label="Probe robots.txt, sitemap, manifest, security.txt" />
          <Toggle checked={fetchScripts} onChange={setFetchScripts} label="Fetch first-party and custom widget scripts" />
          <span className="text-xs text-ink-400">Try:</span>
          {EXAMPLES.map((ex) => <button key={ex} type="button" className="chip hover:border-accent-500" onClick={() => { setUrl(ex); run(ex) }}>{ex}</button>)}
        </div>
        {status === 'loading' ? <div className="progress relative h-1 overflow-hidden rounded bg-ink-800" /> : null}
        {status === 'error' ? <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</div> : null}
      </form>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <div className="card">
            <div className="mb-2 text-xs uppercase tracking-wide text-ink-400">History</div>
            {history.length ? (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.url}>
                    <button type="button" className="w-full truncate rounded px-2 py-1 text-left text-xs text-ink-200 hover:bg-ink-800" title={h.url} onClick={() => { setUrl(h.url); run(h.url) }}>
                      <span className="block truncate text-white">{h.title || h.url}</span>
                      <span className="block truncate text-ink-400">{h.url.replace(/^https?:\/\//, '')} · {h.tech} tech</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-ink-400">Analyses you run are kept in this browser.</p>}
            {history.length ? <button type="button" className="mt-2 text-[11px] text-ink-400 hover:text-white" onClick={() => { setHistory([]); saveHistory([]) }}>Clear history</button> : null}
          </div>
          {report ? (
            <div className="card space-y-2">
              <div className="text-xs uppercase tracking-wide text-ink-400">Export</div>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.json`, JSON.stringify(report, null, 2))}>Download JSON</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.md`, reportToMarkdown(report), 'text/markdown')}>Download Markdown report</button>
              <button type="button" className="w-full rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500" onClick={() => download(`${slugName}.tokens.css`, report.blueprint.tokensCss, 'text/css')}>Download tokens.css</button>
              <div className="text-[11px] text-ink-400">Generated {new Date(report.generatedAt).toLocaleString()} in {report.durationMs} ms</div>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0">
          {!report && status !== 'loading' ? (
            <div className="card text-sm text-ink-200">
              <p className="mb-2 font-semibold text-white">What you get for any public URL</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Technology fingerprints with the exact evidence string for each (frameworks, builders, animation libs, pixels, tag managers, chat widgets, CDNs, servers).</li>
                <li>Design system: palette with inferred roles and contrast, fonts, type scale, radii, shadows, easings, breakpoints, CSS variables.</li>
                <li>Structure: landmarks, heading outline, sections, CTAs, navigation, forms, media.</li>
                <li>Content inventory: metadata, copy blocks, prices, contacts, locales, developer comments and their language.</li>
                <li>Scripts and data: inline behaviour, exposed globals, embedded data blobs, fetched first-party scripts with endpoints and storage keys.</li>
                <li>Third-party surface and a security header audit.</li>
                <li>A rebuild blueprint: component tree, tokens.css, interactions, integrations, content model and checklist for an original implementation.</li>
              </ul>
              <p className="mt-3 text-xs text-ink-400">Static analysis only: the HTML response is parsed without executing JavaScript. Only public http(s) hosts are fetched; private and local addresses are refused.</p>
            </div>
          ) : null}
          {report ? (
            <>
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
            </>
          ) : null}
        </main>
      </div>
    </div>
  )
}
