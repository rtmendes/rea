// Hand the research to OmniCanvas (the team's AI canvas) as a ready-to-run board.
import { useMemo, useState } from 'react'
import { ExternalLink, Section } from './ui.jsx'
import { OMNICANVAS_APP, pushBoard, reportToBoard, validateBoard } from '../../shared/omnicanvas.mjs'

const TOKEN_STORAGE = 'rea-webapp:omnicanvas-token'
const readToken = () => { try { return localStorage.getItem(TOKEN_STORAGE) || '' } catch { return '' } }
const writeToken = (t) => { try { if (t) localStorage.setItem(TOKEN_STORAGE, t.trim()); else localStorage.removeItem(TOKEN_STORAGE) } catch { /* blocked */ } }

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
  const [token, setToken] = useState(readToken)
  const [state, setState] = useState(null)
  const counts = board.graph.nodes.reduce((m, n) => { m[n.data.category] = (m[n.data.category] || 0) + 1; return m }, {})

  async function push() {
    writeToken(token)
    setState({ busy: true })
    try {
      let result
      if (mode === 'api') {
        const res = await fetch('/api/omnicanvas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: token.trim(), name: board.name, graph: board.graph }) })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`)
        result = body
      } else {
        result = await pushBoard({ token: token.trim(), name: board.name, graph: board.graph })
      }
      setState({ ok: true, url: result.boardUrl })
    } catch (e) {
      const blocked = e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e.message)
      setState({ error: blocked ? 'The browser blocked the call: the OmniCanvas API only accepts requests from its own sites. Download the board and push it with the command below, or add this site to CORS_ORIGINS on the OmniCanvas API.' : e.message })
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
            <li>In <ExternalLink href={OMNICANVAS_APP}>OmniCanvas</ExternalLink>, create a new board.</li>
            <li>Open Share, turn on API access, and copy the board token.</li>
            <li>Paste it here and push. This replaces that board's cards.</li>
          </ol>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Board token" autoComplete="off" spellCheck={false} className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-white" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!token.trim() || state?.busy || problems.length > 0} onClick={push} className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-60">{state?.busy ? 'Pushing…' : 'Push to OmniCanvas'}</button>
            <button type="button" onClick={() => onDownload(JSON.stringify(board, null, 2))} className="rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:border-accent-500">Download board (.json)</button>
          </div>
          {state?.ok ? <div className="text-xs text-emerald-300">Board written. <ExternalLink href={state.url}>Open it in OmniCanvas</ExternalLink></div> : null}
          {state?.error ? <div className="text-xs text-rose-300">{state.error}</div> : null}
          <div className="text-[11px] text-ink-400">The token stays in this browser. Command line:</div>
          <pre className="overflow-x-auto rounded-md bg-ink-950 p-2 text-[11px] text-ink-200">cd webapp &amp;&amp; npm run omnicanvas -- board.json --token &lt;token&gt;</pre>
        </div>
      </div>
    </Section>
  )
}
