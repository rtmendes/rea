// Hand the research to OmniCanvas (the team's AI canvas) as a ready-to-run board.
import { useMemo, useState } from 'react'
import { ExternalLink, Section } from './ui.jsx'
import { OMNICANVAS_APP, importBoard, pushBoard, reportToBoard, validateBoard } from '../../shared/omnicanvas.mjs'

const TOKEN_STORAGE = 'rea-webapp:omnicanvas-token'
const KEY_STORAGE = 'rea-webapp:omnicanvas-import-key'
const read = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
const write = (k, v) => { try { if (v) localStorage.setItem(k, v.trim()); else localStorage.removeItem(k) } catch { /* blocked */ } }
const BLOCKED = 'The browser blocked the call to OmniCanvas. Download the board and use the command line below, or try again in a minute.'
const isBlocked = (e) => e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e.message)

const TONE = { source: 'var(--oc-source)', generator: 'var(--oc-generator)', structure: 'var(--oc-structure)' }

/** Small SVG map of the board: groups, cards by category, and the wires between them. */
function BoardMap({ graph }) {
  const { boxes, wires, view } = useMemo(() => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]))
    const abs = (n) => (n.parentId && byId.get(n.parentId) ? { x: n.position.x + byId.get(n.parentId).position.x, y: n.position.y + byId.get(n.parentId).position.y } : n.position)
    const size = (n) => ({ w: n.width || 384, h: n.type === 'group' ? n.height || 320 : n.height || (n.type === 'play' ? 70 : n.type === 'sticky' ? 220 : 170) })
    const boxes = graph.nodes.map((n) => ({ n, ...abs(n), ...size(n) }))
    const at = new Map(boxes.map((b) => [b.n.id, b]))
    const wires = graph.edges.map((e) => { const a = at.get(e.source); const b = at.get(e.target); return a && b ? { id: e.id, x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2 } : null }).filter(Boolean)
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)); const maxY = Math.max(...boxes.map((b) => b.y + b.h))
    return { boxes, wires, view: `-20 -20 ${maxX + 40} ${maxY + 40}` }
  }, [graph])
  return (
    <svg viewBox={view} role="img" aria-label="Map of the OmniCanvas board" className="h-auto w-full rounded-lg border border-ink-800 bg-ink-950" style={{ '--oc-source': '#34d399', '--oc-generator': '#818cf8', '--oc-structure': '#94a3b8', maxHeight: 340 }}>
      {boxes.filter((b) => b.n.type === 'group').map((b) => (
        <g key={b.n.id}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx="18" fill="none" stroke="#475569" strokeDasharray="12 10" strokeWidth="4" /><text x={b.x + 20} y={b.y + 38} fill="#94a3b8" fontSize="26">{b.n.data.content.label}</text></g>
      ))}
      {wires.map((w) => <path key={w.id} d={`M${w.x1},${w.y1} C${w.x1 + 120},${w.y1} ${w.x2 - 120},${w.y2} ${w.x2},${w.y2}`} fill="none" stroke="#64748b" strokeOpacity="0.55" strokeWidth="3" />)}
      {boxes.filter((b) => b.n.type !== 'group').map((b) => (
        <g key={b.n.id}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="14" fill="#0f172a" stroke={TONE[b.n.data.category]} strokeWidth="4" />
          <text x={b.x + 18} y={b.y + 40} fill="#e2e8f0" fontSize="26" fontWeight="600">{b.n.data.title.length > 26 ? `${b.n.data.title.slice(0, 25)}…` : b.n.data.title}</text>
          <text x={b.x + 18} y={b.y + 74} fill="#94a3b8" fontSize="20">{b.n.type}</text>
        </g>
      ))}
    </svg>
  )
}

export function OmniCanvasCard({ report, mode, onDownload }) {
  const board = useMemo(() => reportToBoard(report), [report])
  const problems = useMemo(() => validateBoard(board.graph), [board])
  const [key, setKey] = useState(() => read(KEY_STORAGE))
  const [token, setToken] = useState(() => read(TOKEN_STORAGE))
  const [state, setState] = useState(null)
  const counts = board.graph.nodes.reduce((m, n) => { m[n.data.category] = (m[n.data.category] || 0) + 1; return m }, {})

  // Send = create a NEW board in "REA reports/<site>" (import key). Replace = overwrite one
  // existing board (board token). In API mode the app's own server makes the call.
  async function deliver(how) {
    const body = how === 'send'
      ? { key: key.trim(), name: board.name, graph: board.graph, folder: board.folder, labels: board.labels }
      : { token: token.trim(), name: board.name, graph: board.graph }
    if (how === 'send') write(KEY_STORAGE, key); else write(TOKEN_STORAGE, token)
    setState({ busy: how })
    try {
      let result
      if (mode === 'api') {
        const res = await fetch('/api/omnicanvas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        const out = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(out.error || `Server returned ${res.status}`)
        result = out
      } else {
        result = how === 'send' ? await importBoard(body) : await pushBoard(body)
      }
      setState({ ok: how, url: result.boardUrl })
    } catch (e) {
      setState({ error: isBlocked(e) ? BLOCKED : e.message })
    }
  }

  return (
    <Section title="Open as an OmniCanvas board" subtitle="Research cards on the left feed a chat and a strategy chain (persona → desires → angles → hooks → briefs) that runs on your own keys in OmniCanvas.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <BoardMap graph={board.graph} />
          <div className="flex flex-wrap gap-3 text-[11px] text-ink-400">
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#34d399' }} /> {counts.source || 0} research sources</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#818cf8' }} /> {counts.generator || 0} AI cards</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#94a3b8' }} /> {counts.structure || 0} chat, play, embeds and notes</span>
            <span>{board.graph.edges.length} connections</span>
          </div>
          {problems.length ? <div className="text-xs text-rose-300">Board check failed: {problems.join('; ')}</div> : null}
        </div>
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-ink-300">
            <li>Once: in <ExternalLink href={OMNICANVAS_APP}>OmniCanvas</ExternalLink>, open Settings → Import and create an import key.</li>
            <li>Paste it here. It stays in this browser.</li>
            <li>Send. Each report becomes a new board in <span className="text-white">{board.folder.replace('/', ' › ')}</span>, labelled {board.labels.join(', ')}. Nothing is overwritten.</li>
          </ol>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Import key (oc_imp_…)" aria-label="OmniCanvas import key" autoComplete="off" spellCheck={false} className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-white" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!key.trim() || !!state?.busy || problems.length > 0} onClick={() => deliver('send')} className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">{state?.busy === 'send' ? 'Sending…' : 'Send to OmniCanvas'}</button>
            <button type="button" onClick={() => onDownload(JSON.stringify(board, null, 2))} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500">Download board (.json)</button>
          </div>
          {state?.ok ? <div className="text-xs text-emerald-300">{state.ok === 'send' ? 'New board created.' : 'Board replaced.'} <ExternalLink href={state.url}>Open it in OmniCanvas</ExternalLink></div> : null}
          {state?.error ? <div className="text-xs text-rose-300">{state.error}</div> : null}
          <details className="text-xs text-ink-300">
            <summary className="cursor-pointer text-ink-400 hover:text-ink-200">Replace an existing board instead</summary>
            <div className="mt-2 space-y-2">
              <div className="text-[11px] text-ink-400">In the board's Share dialog turn on API access and copy its token. This overwrites that board's cards.</div>
              <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Board token" aria-label="OmniCanvas board token" autoComplete="off" spellCheck={false} className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-white" />
              <button type="button" disabled={!token.trim() || !!state?.busy || problems.length > 0} onClick={() => deliver('replace')} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500 disabled:opacity-60">{state?.busy === 'replace' ? 'Replacing…' : 'Replace board'}</button>
            </div>
          </details>
          <div className="text-[11px] text-ink-400">Command line:</div>
          <pre className="overflow-x-auto rounded-md bg-ink-950 p-2 text-[11px] text-ink-200">cd webapp &amp;&amp; npm run omnicanvas -- board.json --key &lt;import key&gt;</pre>
        </div>
      </div>
    </Section>
  )
}
