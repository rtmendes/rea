import { useState } from 'react'

export function Section({ title, subtitle, children, actions }) {
  return (
    <section className="card space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-ink-400">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card !p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-white" title={typeof value === 'string' ? value : undefined}>{value ?? '—'}</div>
      {hint ? <div className="mt-0.5 truncate text-xs text-ink-400">{hint}</div> : null}
    </div>
  )
}

export function Table({ columns, rows, empty = 'Nothing observed.' }) {
  if (!rows?.length) return <p className="text-sm text-ink-400">{empty}</p>
  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border border-ink-800">
      <table className="data">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-ink-800/40">
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Chips({ items, empty = 'none' }) {
  if (!items?.length) return <span className="text-xs text-ink-400">{empty}</span>
  return <div className="flex flex-wrap gap-1.5">{items.map((i, k) => <span key={k} className="chip">{i}</span>)}</div>
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="rounded-md border border-ink-700 bg-ink-800 px-2 py-1 text-xs text-ink-200 hover:border-accent-500 hover:text-white"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) } catch { /* clipboard blocked */ } }}
    >
      {done ? 'Copied' : label}
    </button>
  )
}

export function Severity({ level }) {
  const map = { high: 'bg-rose-500/20 text-rose-300 border-rose-500/40', medium: 'bg-amber-500/20 text-amber-200 border-amber-500/40', low: 'bg-sky-500/20 text-sky-200 border-sky-500/40', info: 'bg-ink-800 text-ink-200 border-ink-700' }
  return <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium uppercase ${map[level] || map.info}`}>{level}</span>
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-200">
      <input type="checkbox" className="accent-cyan-400" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function ExternalLink({ href, children }) {
  return <a className="text-accent-400 underline decoration-accent-500/40 underline-offset-2 hover:text-white" href={href} target="_blank" rel="noopener noreferrer">{children || href}</a>
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
