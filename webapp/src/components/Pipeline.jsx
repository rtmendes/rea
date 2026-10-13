// Pipeline board, portfolio editor and settings (keys, cloud sync, agent, webhook, backups).
import { useEffect, useState } from 'react'
import { Section, Toggle } from './ui.jsx'
import { Identity, SiteIcon, Thumbnail } from './Visuals.jsx'
import { STAGES, newPortfolioItem, DEFAULT_MODEL } from '../agent.js'

export function PipelineBoard({ entries, onOpen, onStage, onEvaluate }) {
  const [q, setQ] = useState('')
  const rows = entries.filter((e) => !q || `${e.host} ${e.title} ${e.audience} ${e.focusKeyword}`.toLowerCase().includes(q.toLowerCase()))
  const byStage = Object.fromEntries(STAGES.map(([k]) => [k, rows.filter((e) => (e.pipeline?.stage || 'inbox') === k)]))
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" aria-label="Filter pipeline" className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs" />
        <span className="text-xs text-ink-400">{rows.length} sites · move a card with its stage menu; the agent suggests a stage after each value check.</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map(([key, label, hint]) => (
          <section key={key} className="rounded-xl border border-ink-800 bg-ink-900/40 p-2" aria-label={`${label} column`}>
            <header className="mb-2 px-1"><div className="flex items-center justify-between text-sm font-semibold text-white"><span>{label}</span><span className="chip !py-0 text-[10px]">{byStage[key].length}</span></div><div className="text-[11px] text-ink-400">{hint}</div></header>
            <div className="space-y-2">
              {byStage[key].map((e) => (
                <article key={e.url} className="rounded-lg border border-ink-800 bg-ink-950 p-2">
                  <button type="button" className="block w-full text-left" onClick={() => onOpen(e)}>
                    <Thumbnail src={e.thumb} kind={e.thumbKind} host={e.host} brandColor={e.brandColor} backgroundColor={e.backgroundColor} palette={e.palette} remoteUrl={e.thumbRemoteUrl} className="!aspect-[2/1]" />
                    <div className="mt-1.5"><Identity entry={e} size={20} /></div>
                  </button>
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                    {e.evaluation ? <span className={`chip !py-0 ${e.evaluation.addsValue ? 'border-emerald-500/40 text-emerald-200' : 'border-rose-500/40 text-rose-200'}`}>{e.evaluation.verdict.replace('_', ' ')} · {e.evaluation.score}</span> : <button type="button" className="chip !py-0 hover:border-accent-500" onClick={() => onEvaluate(e)}>run value check</button>}
                    {e.evaluation?.mapsTo?.[0] ? <span className="chip !py-0" title={e.evaluation.mapsTo[0].how}>→ {e.evaluation.mapsTo[0].name}</span> : null}
                    {e.audience ? <span className="chip !py-0" title="audience">{e.audience}</span> : null}
                  </div>
                  <select value={e.pipeline?.stage || 'inbox'} onChange={(ev) => onStage(e, ev.target.value)} aria-label={`Stage for ${e.host}`} className="mt-1.5 w-full rounded-md border border-ink-700 bg-ink-900 px-1.5 py-1 text-[11px] text-ink-200">{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </article>
              ))}
              {!byStage[key].length ? <p className="px-1 py-3 text-center text-[11px] text-ink-600">empty</p> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function PortfolioEditor({ portfolio, onSave, syncLabel }) {
  const [items, setItems] = useState(portfolio?.items || [])
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setItems(portfolio?.items || []); setDirty(false) }, [portfolio?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const update = (id, patch) => { setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); setDirty(true) }
  const add = (type) => { setItems((xs) => [newPortfolioItem({ type }), ...xs]); setDirty(true) }
  const remove = (id) => { setItems((xs) => xs.filter((x) => x.id !== id)); setDirty(true) }
  return (
    <Section title="Your portfolio" subtitle={`Brands, offers and projects the agent compares every analyzed site against. ${syncLabel}`}
      actions={<div className="flex gap-2"><button type="button" className="chip hover:border-accent-500" onClick={() => add('brand')}>+ brand</button><button type="button" className="chip hover:border-accent-500" onClick={() => add('offer')}>+ offer</button><button type="button" className="chip hover:border-accent-500" onClick={() => add('project')}>+ project</button><button type="button" className="rounded-md bg-accent-600 px-3 py-1 text-xs font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-50" disabled={!dirty} onClick={() => { onSave(items.filter((x) => x.name.trim())); setDirty(false) }}>Save</button></div>}>
      {items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className="space-y-2 rounded-lg border border-ink-800 bg-ink-950 p-3">
              <div className="flex items-center gap-2">
                <select value={it.type} onChange={(e) => update(it.id, { type: e.target.value })} className="rounded-md border border-ink-700 bg-ink-900 px-1.5 py-1 text-xs text-ink-200"><option value="brand">brand</option><option value="offer">offer</option><option value="project">project</option></select>
                <input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} placeholder="Name" aria-label="Name" className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-sm text-white" />
                <button type="button" className="text-xs text-ink-400 hover:text-rose-300" onClick={() => remove(it.id)}>remove</button>
              </div>
              <input value={it.audience} onChange={(e) => update(it.id, { audience: e.target.value })} placeholder="Audience (who it is for)" aria-label="Audience" className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200" />
              <input value={it.promise} onChange={(e) => update(it.id, { promise: e.target.value })} placeholder="Promise / outcome" aria-label="Promise" className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200" />
              <div className="flex gap-2">
                <input value={it.price} onChange={(e) => update(it.id, { price: e.target.value })} placeholder="Price / ladder" aria-label="Price" className="w-1/3 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200" />
                <input value={it.keywords} onChange={(e) => update(it.id, { keywords: e.target.value })} placeholder="Keywords, comma separated" aria-label="Keywords" className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200" />
              </div>
              <textarea value={it.notes} onChange={(e) => update(it.id, { notes: e.target.value })} placeholder="Notes (positioning, what already exists, what you want next)" aria-label="Notes" rows={2} className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200" />
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-ink-400">Empty. Add at least your brands and current offers; the value check then says whether a site enriches one of them or opens a new one.</p>}
    </Section>
  )
}

function KeyField({ id, label, value, onChange, placeholder, help }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-ink-400">{label}</label>
      <div className="flex gap-2"><input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-white" /><button type="button" className="chip" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button></div>
      {help ? <div className="text-[11px] text-ink-400">{help}</div> : null}
    </div>
  )
}

export function SettingsPanel({ runtime, apiKey, onApiKey, cloudCfg, onCloudCfg, cloudState, onSignIn, onSignOut, onPushAll, agentCfg, onAgentCfg, webhook, onWebhook, onExportLibrary, onImportLibrary, pushing }) {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState(null)
  const [cloudUrl, setCloudUrl] = useState(cloudCfg.source === 'browser' ? cloudCfg.url : '')
  const [cloudKey, setCloudKey] = useState(cloudCfg.source === 'browser' ? cloudCfg.anonKey : '')
  const inArtifact = runtime.mode === 'connector' || runtime.mode === 'unavailable'
  return (
    <div className="space-y-4">
      {!inArtifact ? (
        <Section title="Fetching: Firecrawl" subtitle="Static mode calls Firecrawl's API from this browser. Without a key the keyless free tier applies (capped per day, slower). A free key gives 10 scrapes/minute.">
          <KeyField id="fc-key" label="Firecrawl API key (kept in this browser only)" value={apiKey} onChange={onApiKey} placeholder="fc-… (optional)" help={<span>Create one at <a className="text-accent-400 underline" href="https://www.firecrawl.dev/app/api-keys" target="_blank" rel="noopener noreferrer">firecrawl.dev/app/api-keys</a>. With cloud sync and the proxy function deployed, signed-in users use the server-side key instead.</span>} />
        </Section>
      ) : null}
      <Section title="Library persistence" subtitle={inArtifact ? 'Inside claude.ai the library is saved in this artifact\'s database (private to your account) and in this browser.' : 'The library lives in this browser (IndexedDB). Connect a Supabase project to keep it across browsers and devices.'}>
        {!inArtifact ? (
          <div className="space-y-3">
            <div className="text-xs text-ink-200">Status: <b className={cloudState.signedIn ? 'text-emerald-300' : 'text-ink-200'}>{cloudState.label}</b>{cloudState.stats ? ` · ${cloudState.stats.sites} sites in the cloud · ${cloudState.stats.email}` : ''}{cloudState.proxy ? ' · Firecrawl proxy active' : ''}</div>
            {cloudCfg.configured ? (
              cloudState.signedIn ? (
                <div className="flex flex-wrap gap-2"><button type="button" className="chip hover:border-accent-500" onClick={onSignOut}>Sign out</button><button type="button" className="chip hover:border-accent-500" disabled={pushing} onClick={onPushAll}>{pushing ? 'Uploading…' : 'Upload everything local to the cloud'}</button></div>
              ) : (
                <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); try { await onSignIn(email); setSentTo(email) } catch (err) { setSentTo(`error: ${err.message}`) } }}>
                  <div><label htmlFor="cloud-email" className="text-xs text-ink-400">Email for the magic link</label><input id="cloud-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-64 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-sm text-white" /></div>
                  <button type="submit" className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-accent-400">Send sign-in link</button>
                  {sentTo ? <span className="text-xs text-ink-200">{sentTo.startsWith('error') ? sentTo : `Link sent to ${sentTo}. Open it on this device to finish.`}</span> : null}
                </form>
              )
            ) : null}
            <details className="rounded-lg border border-ink-800 bg-ink-950 p-3" open={!cloudCfg.configured}>
              <summary className="cursor-pointer text-xs text-ink-200">{cloudCfg.configured ? `Supabase project (${cloudCfg.source === 'build' ? 'set at build time' : 'set in this browser'})` : 'Connect a Supabase project'}</summary>
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-ink-400">Run <code>webapp/supabase/migrations/0001_rea_library.sql</code> in the project's SQL editor, add this page's URL to Authentication → URL configuration, then paste the project URL and anon key here. Full steps in <code>webapp/supabase/README.md</code>.</p>
                <input value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="https://xxxx.supabase.co" aria-label="Supabase URL" className="w-full rounded-md border border-ink-700 bg-ink-900 px-2 py-1 font-mono text-xs text-white" />
                <KeyField id="sb-key" label="anon / publishable key" value={cloudKey} onChange={setCloudKey} placeholder="sb_publishable_… or eyJ…" />
                <div className="flex gap-2"><button type="button" className="rounded-md bg-accent-600 px-3 py-1 text-xs font-semibold text-ink-950 hover:bg-accent-400" onClick={() => onCloudCfg({ url: cloudUrl, anonKey: cloudKey })}>Save connection</button>{cloudCfg.source === 'browser' ? <button type="button" className="chip" onClick={() => { setCloudUrl(''); setCloudKey(''); onCloudCfg({ url: '', anonKey: '' }) }}>Disconnect</button> : null}</div>
              </div>
            </details>
          </div>
        ) : <p className="text-xs text-ink-400">Open the same library on GitHub Pages for cloud sync with embedded renders.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
          <span className="text-xs text-ink-400">Backup:</span>
          <button type="button" className="chip hover:border-accent-500" onClick={onExportLibrary}>Export library (.json)</button>
          <label className="chip cursor-pointer hover:border-accent-500">Import library<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportLibrary(f); e.target.value = '' }} /></label>
          <span className="text-[11px] text-ink-400">Moves every report and render between devices without any backend.</span>
        </div>
      </Section>
      <Section title="Value-check agent" subtitle="Who judges whether a site adds value to your portfolio. Tried in order: claude.ai artifact (connector mode) → cloud function (needs ANTHROPIC_API_KEY secret) → your own key below → built-in heuristic.">
        <div className="grid gap-3 md:grid-cols-2">
          <KeyField id="an-key" label="Anthropic API key (kept in this browser only)" value={agentCfg.apiKey || ''} onChange={(v) => onAgentCfg({ ...agentCfg, apiKey: v })} placeholder="sk-ant-… (optional)" help="Calls go straight from this browser to api.anthropic.com." />
          <div className="space-y-1"><label htmlFor="an-model" className="text-xs text-ink-400">Model</label><input id="an-model" value={agentCfg.model || DEFAULT_MODEL} onChange={(e) => onAgentCfg({ ...agentCfg, model: e.target.value })} className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-white" /><div className="text-[11px] text-ink-400">Default {DEFAULT_MODEL}.</div></div>
        </div>
      </Section>
      <Section title="Offer creation pipeline webhook" subtitle="Each hand-off can be POSTed as JSON to your own endpoint (Make, n8n, Zapier catch hook, your API). The endpoint must accept cross-origin requests from this page.">
        <input value={webhook} onChange={(e) => onWebhook(e.target.value)} placeholder="https://hook.example.com/…" aria-label="Webhook URL" className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-white" />
      </Section>
      <Section title="This session" subtitle="How this page fetches and stores."><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs"><dt className="text-ink-400">Mode</dt><dd>{runtime.mode}</dd><dt className="text-ink-400">Artifact database</dt><dd>{runtime.dbctx ? 'available' : 'not in this view'}</dd><dt className="text-ink-400">Artifact agent (sample)</dt><dd>{runtime.sample ? 'available' : 'not in this view'}</dd></dl></Section>
    </div>
  )
}

export { Toggle, SiteIcon }
