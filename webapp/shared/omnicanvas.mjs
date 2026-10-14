// Turn a REA report into an OmniCanvas board graph.
// Contract: rtmendes/omnicanvas docs/TECH-REFERENCE.md section 1 (graph = {nodes, edges},
// node envelope {id,type,position,width,height,parentId,data:{title,category,content,output}},
// edges source->target with handles "out"/"in").
//
// Layout of the board:
//   1. Research group: one source card per research block. Source cards are not runnable,
//      so "run all" never overwrites the evidence, and their output.text feeds every card
//      wired after them (llm/context.py reads output.text first).
//   2. Live views: the live site and the full REA report as embeds.
//   3. A chat card wired to all research cards ("ask this research").
//   4. Strategy chain: Persona -> Desire -> Angles (5 awareness levels) -> Hooks -> Brief -> Output,
//      started by a Play card, plus an "Our original offer" card. These are editor cards
//      (AI generators) that run on the board owner's own keys and model routing.

export const OMNICANVAS_APP = 'https://canvas.insightprofit.live'
export const OMNICANVAS_API = 'https://canvas-api.insightprofit.live'
export const REA_APP = 'https://rtmendes.github.io/rea/'

const CARD_W = 384
const GAP = 40
const ROW = 260
const CATEGORY = { source: 'source', editor: 'generator', output: 'generator', imagegen: 'generator', chat: 'structure', embed: 'structure', mindmap: 'structure', play: 'structure', group: 'structure', sticky: 'structure', shape: 'structure' }

function clean(text, max = 400) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
function list(items, fmt = (x) => x, max = 8) {
  return (items || []).slice(0, max).map((x) => `- ${clean(fmt(x), 220)}`).filter((l) => l.length > 2).join('\n')
}
function host(report) {
  try { return new URL(report.target?.finalUrl || report.target?.url).hostname.replace(/^www\./, '') } catch { return 'site' }
}
function slug(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x' }

function section(title, lines) {
  const body = lines.filter((l) => l != null && String(l).trim() !== '').join('\n')
  return body ? `${title}\n${body}` : ''
}

/** Plain-text research blocks, one per card. Each line says where it came from. */
export function researchBlocks(report) {
  const s = report.summary || {}
  const a = report.audience || {}
  const sum = a.summary || {}
  const p = a.pricing || {}
  const k = report.keywords || {}
  const pages = report.pages || {}
  const reach = report.reach || {}
  const url = report.target?.finalUrl || report.target?.url || ''
  const tech = report.technologies || []
  const palette = report.design?.colors?.palette || []
  const fonts = report.design?.typography?.families || []
  const ctas = report.structure?.ctas || []
  const blocks = []

  blocks.push({
    key: 'snapshot', title: 'Snapshot',
    text: [
      section('What it is (observed)', [
        `URL: ${url}`,
        s.title && `Title: ${clean(s.title)}`,
        s.description && `Description: ${clean(s.description)}`,
        s.headline && `Main headline: ${clean(s.headline)}`,
        s.siteType && `Page type: ${s.siteType}`,
        s.pageCount != null && `Internal pages linked: ${s.pageCount}`,
      ]),
      section('Analyzer read', [
        s.businessModel && `Business model (inferred): ${s.businessModel}`,
        s.focusKeyword && `Focus keyword: ${s.focusKeyword}`,
        report.generatedAt && `Captured: ${report.generatedAt}`,
      ]),
    ].filter(Boolean).join('\n\n'),
  })

  blocks.push({
    key: 'avatar', title: 'Customer avatar (inferred)',
    text: [
      a.disclaimer && `Note: ${clean(a.disclaimer, 300)}`,
      a.confidence && `Confidence: ${a.confidence}${a.evidenceCount != null ? ` (${a.evidenceCount} evidence lines)` : ''}`,
      sum.who && `Who: ${clean(sum.who)}`,
      sum.model && `Model: ${sum.model}`,
      section('Wants', [list(sum.wants)]),
      section('Struggles', [list(sum.struggles)]),
      section('Hesitations', [list(sum.hesitations)]),
      sum.convincedBy?.length && `Convinced by: ${sum.convincedBy.join(', ')}`,
      sum.budget && `Budget: ${sum.budget}`,
      sum.reaches?.length && `Reached through: ${sum.reaches.join(', ')}`,
      sum.tone && `Tone: ${sum.tone}`,
      section('Evidence (copy on the page)', [list(a.who, (w) => `${w.label}: "${clean(w.evidence?.[0] || w.label, 160)}"`, 5)]),
    ].filter(Boolean).join('\n'),
  })

  const tiers = (p.tiers || []).map((t) => t.amount)
  blocks.push({
    key: 'offer', title: 'Offer & pricing',
    text: [
      p.observed ? `Prices seen: ${p.observed} (${p.currency || ''}${p.min}–${p.max}), cadence: ${p.cadence || 'unspecified'}, band: ${p.band || 'n/a'}` : 'No prices on this page.',
      tiers.length && `Price points: ${tiers.join(', ')}`,
      p.freePlan != null && `Free plan advertised: ${p.freePlan ? 'yes' : 'no'}`,
      section('Calls to action (most repeated first)', [list(ctas, (c) => `${c.text}${c.hrefs?.[0] ? ` → ${c.hrefs[0]}` : ''}`, 8)]),
      section('Intent of the calls to action', [list(k.intents, (i) => `${i.intent}: ${i.count} (${(i.examples || []).slice(0, 3).join(', ')})`, 6)]),
    ].filter(Boolean).join('\n'),
  })

  blocks.push({
    key: 'keywords', title: 'Messaging & keywords',
    text: [
      k.focus && `Focus: ${typeof k.focus === 'string' ? k.focus : k.focus.term || JSON.stringify(k.focus)}`,
      section('Top terms (placement-weighted score)', [list(k.terms, (t) => `${t.term} — score ${t.score}, ${t.count}×`, 12)]),
      section('Phrases', [list(k.phrases, (t) => (typeof t === 'string' ? t : `${t.phrase || t.term} (${t.count}×)`), 8)]),
      k.metaKeywords?.length && `Meta keywords: ${k.metaKeywords.join(', ')}`,
    ].filter(Boolean).join('\n'),
  })

  blocks.push({
    key: 'pages', title: 'Pages & funnel',
    text: [
      `Internal pages: ${pages.internalCount ?? 0} across ${(pages.sections || []).length} sections; source: ${pages.source || 'links on the page'}`,
      pages.subdomains?.length && `Subdomains: ${pages.subdomains.join(', ')}`,
      section('Key pages', [list(pages.keyPages, (x) => `${x.type}: ${x.url}`, 8)]),
      section('By type', [list(Object.entries(pages.byType || {}), ([t, n]) => `${t}: ${Array.isArray(n) ? n.length : n}`, 12)]),
    ].filter(Boolean).join('\n'),
  })

  blocks.push({
    key: 'reach', title: 'Reach signals (observed, no traffic numbers)',
    text: [
      reach.disclaimer && `Note: ${clean(reach.disclaimer, 240)}`,
      list((reach.signals || []).filter((x) => (Array.isArray(x.value) ? x.value.length : x.value)), (x) => `${x.group} · ${x.label}: ${Array.isArray(x.value) ? x.value.join(', ') : x.value}`, 10),
      reach.paidAcquisitionLikely != null && `Paid acquisition likely: ${reach.paidAcquisitionLikely ? 'yes' : 'no'}`,
      section('Look up traffic yourself', [list(reach.lookups, (l) => `${l.name}: ${l.url}`, 6)]),
    ].filter(Boolean).join('\n'),
  })

  blocks.push({
    key: 'design', title: 'Design & stack',
    text: [
      section('Technologies (observed, with evidence in REA)', [list(tech, (t) => `${t.name}${t.version ? ` ${t.version}` : ''} — ${t.categoryLabel || t.category}`, 12)]),
      palette.length && `Colors: ${palette.slice(0, 6).map((c) => c.hex).join(', ')}`,
      fonts.length && `Fonts: ${fonts.slice(0, 4).map((f) => (typeof f === 'string' ? f : f.family || f.name)).join(', ')}`,
      report.design?.colors?.mode && `Color mode: ${report.design.colors.mode}`,
    ].filter(Boolean).join('\n'),
  })

  const ev = report.evaluation
  if (ev && ev.verdict) {
    const idea = ev.offerIdea || {}
    blocks.push({
      key: 'value', title: 'Value check (REA agent)',
      text: [
        `Verdict: ${ev.verdict}, score ${ev.score}/100, adds value: ${ev.addsValue ? 'yes' : 'no'}${ev.agent ? ` (by ${ev.agent})` : ''}`,
        section('Reasons', [list(ev.reasons)]),
        section('Maps to our portfolio', [list(ev.mapsTo, (m) => `${m.name}: ${m.how}`)]),
        idea.name && `Offer idea: ${idea.name} — ${clean(idea.promise, 200)}`,
        section('Hooks', [list(idea.hooks)]),
        section('Next steps', [list(ev.nextSteps)]),
      ].filter(Boolean).join('\n'),
    })
  }
  return blocks.filter((b) => b.text && b.text.trim())
}

const STRATEGY = [
  { key: 'persona', title: 'Persona', from: ['avatar', 'snapshot', 'keywords', 'offer'], text: 'Using ONLY the connected research cards, write 1–3 buyer personas in the buyers\' own words. For each: a short name, one-line description, awareness level (Unaware, Problem aware, Solution aware, Product aware or Most aware), core pain, surface desire, higher-order goal, one false belief, top objections, 4 phrases they would actually say, and words to avoid. Label anything the research does not support as an assumption.' },
  { key: 'desire', title: 'Desires', from: ['persona', 'avatar'], text: 'For the strongest persona upstream, list 5 desires ranked by intensity. For each desire give the pain it answers and one line of proof from the research, or mark it as an assumption.' },
  { key: 'angles', title: 'Angles (5 awareness levels)', from: ['desire', 'persona', 'offer'], text: 'For the top desire, write one angle per awareness level: Unaware, Problem aware, Solution aware, Product aware, Most aware. For each: the belief to break and a one-line angle. Keep them as five different bets, not variations of one line.' },
  { key: 'hooks', title: 'Hooks', from: ['angles', 'keywords'], text: 'Write 2 hooks per angle upstream. Tag each as Static or UGC. Reuse the buyers\' own phrases where they fit. Keep each under 12 words.' },
  { key: 'brief', title: 'Briefs', from: ['hooks', 'persona', 'design'], text: 'Turn the 3 strongest hooks into ready-to-use creative briefs: scene, on-screen headline (the hook), visual direction, format and aspect ratio (default 9:16), and the angle and persona it traces back to.' },
]

/**
 * @param {object} report REA report (version 3)
 * @param {{ reaUrl?: string }} [options]
 * @returns {{ name: string, graph: { nodes: object[], edges: object[] } }}
 */
export function reportToBoard(report, options = {}) {
  const h = host(report)
  const site = slug(h)
  const id = (k) => `n_rea_${site}_${k}`
  const nodes = []
  const edges = []
  const edge = (from, to) => { edges.push({ id: `e_${from}__${to}`, source: from, target: to, sourceHandle: 'out', targetHandle: 'in' }) }
  const node = (type, key, position, title, content, extra = {}) => {
    const n = { id: id(key), type, position, width: extra.width ?? CARD_W, height: extra.height ?? null, parentId: extra.parentId ?? null, data: { title, category: CATEGORY[type], content, output: extra.output ?? null } }
    nodes.push(n)
    return n
  }
  const url = report.target?.finalUrl || report.target?.url || ''
  const now = report.generatedAt || new Date().toISOString()

  // 1. Research group (parents must come before children for xyflow).
  const blocks = researchBlocks(report)
  const rows = Math.ceil(blocks.length / 2)
  const groupW = CARD_W * 2 + GAP * 3
  const groupH = 60 + rows * ROW + GAP
  node('group', 'research', { x: 0, y: 0 }, `Research · ${h}`, { label: `1 · Research — ${h} (from REA)` }, { width: groupW, height: groupH })
  for (const [i, b] of blocks.entries()) {
    node('source', b.key, { x: GAP + (i % 2) * (CARD_W + GAP), y: 60 + Math.floor(i / 2) * ROW }, b.title,
      { kind: 'website', origin: url, title: `${b.title} · ${h}`, status: 'ready' },
      { parentId: id('research'), output: { kind: 'text', text: b.text, generatedAt: now } })
  }

  // 2. Live views under the research group.
  const liveY = groupH + GAP * 2
  node('embed', 'live-site', { x: 0, y: liveY }, `Live site · ${h}`, { url, title: h }, { width: CARD_W })
  const reaUrl = options.reaUrl ?? `${REA_APP}?url=${encodeURIComponent(url)}`
  node('embed', 'rea-report', { x: CARD_W + GAP, y: liveY }, 'Full visual report (REA)', { url: reaUrl, title: 'REA report' }, { width: CARD_W })

  // 3. Ask the research.
  const chatX = groupW + GAP * 3
  node('sticky', 'how-to', { x: chatX, y: 0 }, 'How to use this board', {
    text: `From REA, ${now.slice(0, 10)}.\n1. Research cards on the left are evidence. Avatar and value check are inferences.\n2. Ask the research in the chat card.\n3. Press Play to run the strategy chain on your own keys.\n4. Edit any prompt before running.`,
    color: '#FDE68A',
  }, { width: 300, height: 220 })
  node('chat', 'ask', { x: chatX, y: 280 }, `Ask the research · ${h}`, { provider: '', model: '', messages: [] })
  for (const b of blocks) edge(id(b.key), id('ask'))

  // 4. Strategy chain.
  const chainX = chatX + CARD_W + GAP * 3
  node('play', 'play', { x: chainX, y: 0 }, 'Run strategy chain', {}, { width: 160 })
  STRATEGY.forEach((st, i) => {
    node('editor', st.key, { x: chainX + i * (CARD_W + GAP), y: 140 }, st.title, { text: st.text, provider: '', model: '', system: '' })
  })
  node('output', 'final', { x: chainX + STRATEGY.length * (CARD_W + GAP), y: 140 }, 'Final briefs', {})
  edge(id('play'), id('persona'))
  const have = new Set(blocks.map((b) => b.key).concat(STRATEGY.map((s) => s.key)))
  for (const st of STRATEGY) for (const from of st.from) if (have.has(from)) edge(id(from), id(st.key))
  edge(id('brief'), id('final'))

  node('editor', 'our-offer', { x: chainX + CARD_W + GAP, y: 140 + ROW * 2 }, 'Our original offer', {
    text: 'Design an ORIGINAL offer for our portfolio that serves the same buyer better. Do not copy the competitor\'s name, copy or design. Give: name, one-line promise, mechanism, 3-tier ladder with prices anchored to the research, the proof we need to gather, and the first 3 channels to test.',
    provider: '', model: '', system: '',
  })
  for (const from of ['snapshot', 'offer', 'value', 'persona', 'desire']) if (have.has(from)) edge(id(from), id('our-offer'))

  return { name: `REA · ${h} · ${now.slice(0, 10)}`, graph: { nodes, edges } }
}

/** Structural checks matching OmniCanvas's own rules (ids, endpoints, parents, no cycles). */
export function validateBoard(graph) {
  const errors = []
  const ids = new Set()
  for (const [i, n] of graph.nodes.entries()) {
    if (ids.has(n.id)) errors.push(`duplicate node id ${n.id}`)
    ids.add(n.id)
    if (!CATEGORY[n.type]) errors.push(`unknown node type ${n.type}`)
    if (n.data?.category !== CATEGORY[n.type]) errors.push(`wrong category on ${n.id}`)
    if (n.parentId) {
      const pi = graph.nodes.findIndex((p) => p.id === n.parentId)
      if (pi < 0 || graph.nodes[pi].type !== 'group') errors.push(`${n.id} has a missing or non-group parent`)
      else if (pi > i) errors.push(`${n.id} comes before its parent`)
    }
  }
  const seen = new Set()
  const out = new Map()
  for (const e of graph.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) errors.push(`edge ${e.id} points at a missing node`)
    if (e.source === e.target) errors.push(`self-loop ${e.id}`)
    const key = `${e.source}>${e.target}`
    if (seen.has(key)) errors.push(`duplicate edge ${key}`)
    seen.add(key)
    if (!out.has(e.source)) out.set(e.source, [])
    out.get(e.source).push(e.target)
  }
  const state = new Map()
  const visit = (v) => {
    if (state.get(v) === 1) return true
    if (state.get(v) === 2) return false
    state.set(v, 1)
    for (const w of out.get(v) || []) if (visit(w)) return true
    state.set(v, 2)
    return false
  }
  for (const v of ids) if (visit(v)) { errors.push('graph has a cycle'); break }
  return errors
}

/**
 * Write a board through OmniCanvas's public board API (PATCH /api/v1/boards/{token}).
 * The token comes from the board's Share dialog with "API access" turned on.
 */
export async function pushBoard({ token, name, graph, apiBase = OMNICANVAS_API, fetchImpl = fetch, signal }) {
  if (!token || !/^[\w-]{8,}$/.test(token)) throw new Error('Paste the board token from OmniCanvas: Share → API access.')
  const res = await fetchImpl(`${apiBase}/api/v1/boards/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-board-token': token },
    body: JSON.stringify({ name, graph }),
    signal,
  })
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* not JSON */ }
  if (!res.ok) {
    const detail = body?.detail || text.slice(0, 200) || res.statusText
    const err = new Error(res.status === 403 ? `OmniCanvas refused the write: ${detail}. Turn on "API access" in the board's Share dialog.` : res.status === 404 ? 'OmniCanvas does not know this board token.' : `OmniCanvas returned ${res.status}: ${detail}`)
    err.status = res.status
    throw err
  }
  return { id: body?.id, ok: true, boardUrl: body?.id ? `${OMNICANVAS_APP}/?board=${body.id}` : OMNICANVAS_APP }
}
