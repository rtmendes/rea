// Small, dependency-free chart pieces. One hue for magnitude; text in text tokens, never series colour.

export function Bars({ rows, max, unit = '', labelWidth = 'w-36', formatValue = (v) => v, onPick, picked }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-ink-400">Nothing to chart.</p>
  return (
    <div className="space-y-1" role="list">
      {rows.map((r) => (
        <div key={r.key ?? r.label} role="listitem" className={`group flex items-center gap-2 text-xs ${onPick ? 'cursor-pointer' : ''}`} onClick={onPick ? () => onPick(r) : undefined} title={r.title || `${r.label}: ${formatValue(r.value)}${unit}`}>
          <span className={`${labelWidth} shrink-0 truncate ${picked === (r.key ?? r.label) ? 'text-white' : 'text-ink-200'}`}>{r.label}</span>
          <span className="relative h-3 flex-1 overflow-hidden rounded-sm bg-ink-800">
            <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-accent-600 transition-[width] group-hover:bg-accent-500" style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </span>
          <span className="w-14 shrink-0 text-right font-mono text-ink-400">{formatValue(r.value)}{unit}</span>
        </div>
      ))}
    </div>
  )
}

/** Weighted word cloud: size follows score, colour stays one hue so weight reads from size alone. */
export function TagCloud({ items, onPick, picked, max = 40 }) {
  const rows = items.slice(0, max)
  if (!rows.length) return <p className="text-sm text-ink-400">No terms.</p>
  const top = Math.max(...rows.map((r) => r.score))
  const low = Math.min(...rows.map((r) => r.score))
  const size = (s) => 12 + ((s - low) / Math.max(1, top - low)) * 22
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 leading-tight">
      {rows.map((r) => (
        <button key={r.term} type="button" onClick={onPick ? () => onPick(r) : undefined} title={`${r.term}: score ${r.score}, ${r.count}× (${Object.entries(r.where).map(([k, v]) => `${k} ${v}`).join(', ')})`}
          className={`rounded px-0.5 transition hover:bg-ink-800 ${picked === r.term ? 'bg-ink-800 text-white' : 'text-accent-400'}`} style={{ fontSize: `${size(r.score)}px`, opacity: 0.6 + 0.4 * ((r.score - low) / Math.max(1, top - low)) }}>
          {r.term}
        </button>
      ))}
    </div>
  )
}

export function Meter({ value, max = 100, label, tone = 'accent' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = tone === 'good' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-400' : tone === 'bad' ? 'bg-rose-500' : 'bg-accent-500'
  return (
    <div className="space-y-1" title={label ? `${label}: ${value}/${max}` : undefined}>
      {label ? <div className="flex justify-between text-[11px] text-ink-400"><span>{label}</span><span className="font-mono">{value}/{max}</span></div> : null}
      <div className="h-2 w-full overflow-hidden rounded bg-ink-800"><div className={`h-full rounded-r-[4px] ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

/** Proportional strip for a categorical breakdown; labels carry identity, not only colour. */
export function Breakdown({ parts, total }) {
  const sum = total ?? parts.reduce((a, p) => a + p.value, 0)
  if (!sum) return null
  const shades = ['bg-accent-600', 'bg-accent-500/80', 'bg-accent-400/70', 'bg-sky-500/60', 'bg-sky-400/50', 'bg-ink-600', 'bg-ink-700']
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded">
        {parts.map((p, i) => <span key={p.label} className={`${shades[i % shades.length]} rounded-[3px]`} style={{ width: `${(p.value / sum) * 100}%` }} title={`${p.label}: ${p.value}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
        {parts.map((p, i) => <span key={p.label} className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-sm ${shades[i % shades.length]}`} />{p.label} <span className="font-mono text-ink-200">{p.value}</span></span>)}
      </div>
    </div>
  )
}
