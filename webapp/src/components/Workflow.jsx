// Numbered workflow rail: the report is read as a guided sequence, not a pile of tabs.

export const STEPS = [
  { key: 'snapshot', n: 1, label: 'Snapshot', hint: 'what it is, live render' },
  { key: 'audience', n: 2, label: 'Who it sells to', hint: 'customer avatar' },
  { key: 'offer', n: 3, label: 'What it sells', hint: 'offer, prices, proof' },
  { key: 'keywords', n: 4, label: 'Messaging & keywords', hint: 'hooks, phrases, intents' },
  { key: 'reach', n: 5, label: 'Reach & traffic signals', hint: 'channels, pixels, SEO' },
  { key: 'pages', n: 6, label: 'Pages & flows', hint: 'site map, rendered pages' },
  { key: 'design', n: 7, label: 'Look & feel', hint: 'tokens, type, colour' },
  { key: 'build', n: 8, label: 'How it is built', hint: 'stack, scripts, security' },
  { key: 'blueprint', n: 9, label: 'Rebuild blueprint', hint: 'components, tokens, checklist' },
  { key: 'value', n: 10, label: 'Value check & hand-off', hint: 'agent verdict, pipeline' },
  { key: 'raw', n: 11, label: 'Evidence & raw data', hint: 'JSON, discovery' },
]

export function Stepper({ current, onPick, status = {} }) {
  return (
    <ol className="space-y-0.5" aria-label="Report workflow">
      {STEPS.map((s) => {
        const st = status[s.key]
        return (
          <li key={s.key}>
            <button type="button" aria-current={current === s.key ? 'step' : undefined} onClick={() => onPick(s.key)} className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-ink-800 ${current === s.key ? 'bg-ink-800 ring-1 ring-accent-500/50' : ''}`}>
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${st === 'done' ? 'bg-emerald-500/20 text-emerald-300' : st === 'todo' ? 'bg-amber-500/20 text-amber-200' : 'bg-ink-700 text-ink-200'}`}>{st === 'done' ? '✓' : s.n}</span>
              <span className="min-w-0">
                <span className={`block text-sm ${current === s.key ? 'text-white' : 'text-ink-200'}`}>{s.label}</span>
                <span className="block truncate text-[11px] text-ink-400">{st === 'todo' ? 'needs your input' : s.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function StepNav({ current, onPick }) {
  const i = STEPS.findIndex((s) => s.key === current)
  const prev = STEPS[i - 1]
  const next = STEPS[i + 1]
  return (
    <div className="mt-6 flex items-center justify-between border-t border-ink-800 pt-3 text-sm">
      {prev ? <button type="button" className="text-ink-400 hover:text-white" onClick={() => onPick(prev.key)}>← {prev.n}. {prev.label}</button> : <span />}
      {next ? <button type="button" className="rounded-md bg-accent-600 px-3 py-1.5 font-semibold text-ink-950 hover:bg-accent-400" onClick={() => onPick(next.key)}>Next: {next.n}. {next.label} →</button> : <span className="text-ink-400">End of workflow</span>}
    </div>
  )
}
