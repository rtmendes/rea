// Offer-pipeline agent: judges whether an analyzed site adds new value to the user's own brands,
// offers and projects (the portfolio), routes it to a pipeline stage and writes a hand-off brief.
// Four ways to run the judgement, tried in this order:
//   1. the claude.ai artifact `sample` capability (connector mode, no key needed);
//   2. the Supabase edge function `offer-agent` (cloud sync signed in; key stays server-side);
//   3. the Anthropic SDK directly from the browser with a key kept in this browser;
//   4. a deterministic heuristic (always available; clearly labelled as such).

export const AGENT_CONFIG_STORAGE = 'rea-webapp:anthropic'
export const WEBHOOK_STORAGE = 'rea-webapp:pipeline-webhook'
export const DEFAULT_MODEL = 'claude-opus-5-5'
export const STAGES = [
  ['inbox', 'Inbox', 'Analyzed, not yet evaluated'],
  ['evaluate', 'Evaluate', 'Value check running or needs your review'],
  ['new-offer', 'New offer', 'Adds new value: draft an offer'],
  ['enrich', 'Enrich existing', 'Feeds an offer, brand or project you already have'],
  ['build', 'In build', 'Handed to the offer creation pipeline'],
  ['archive', 'Archive', 'No new value for now'],
]
export const VERDICT_STAGE = { new_offer: 'new-offer', enrich_existing: 'enrich', brand_angle: 'enrich', archive: 'archive' }

export function readAgentConfig() { try { return { model: DEFAULT_MODEL, ...JSON.parse(localStorage.getItem(AGENT_CONFIG_STORAGE) || '{}') } } catch { return { model: DEFAULT_MODEL } } }
export function writeAgentConfig(cfg) { try { if (cfg && (cfg.apiKey || cfg.model)) localStorage.setItem(AGENT_CONFIG_STORAGE, JSON.stringify(cfg)); else localStorage.removeItem(AGENT_CONFIG_STORAGE) } catch { /* blocked */ } }
export function readWebhook() { try { return localStorage.getItem(WEBHOOK_STORAGE) || '' } catch { return '' } }
export function writeWebhook(url) { try { if (url) localStorage.setItem(WEBHOOK_STORAGE, url.trim()); else localStorage.removeItem(WEBHOOK_STORAGE) } catch { /* blocked */ } }

/** The JSON the agent must return; shared by every provider so the UI renders one shape. */
export const EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'addsValue', 'score', 'reasons', 'mapsTo', 'offerIdea', 'brandLearnings', 'nextSteps'],
  properties: {
    verdict: { type: 'string', enum: ['new_offer', 'enrich_existing', 'brand_angle', 'archive'] },
    addsValue: { type: 'boolean' },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    reasons: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    mapsTo: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['portfolioId', 'name', 'how'], properties: { portfolioId: { type: 'string' }, name: { type: 'string' }, how: { type: 'string' } } } },
    offerIdea: {
      type: 'object', additionalProperties: false,
      required: ['name', 'promise', 'audience', 'problem', 'mechanism', 'deliverables', 'priceAnchor', 'ladder', 'hooks', 'objections', 'proofToGather', 'channels'],
      properties: {
        name: { type: 'string' }, promise: { type: 'string' }, audience: { type: 'string' }, problem: { type: 'string' }, mechanism: { type: 'string' },
        deliverables: { type: 'array', items: { type: 'string' }, maxItems: 8 },
        priceAnchor: { type: 'string' },
        ladder: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['tier', 'price', 'includes'], properties: { tier: { type: 'string' }, price: { type: 'string' }, includes: { type: 'string' } } } },
        hooks: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        objections: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['objection', 'answer'], properties: { objection: { type: 'string' }, answer: { type: 'string' } } } },
        proofToGather: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        channels: { type: 'array', items: { type: 'string' }, maxItems: 6 },
      },
    },
    brandLearnings: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    nextSteps: { type: 'array', items: { type: 'string' }, maxItems: 6 },
  },
}

/** Compact, evidence-first digest of a report for the agent (no HTML, no images). */
export function digestReport(report) {
  const s = report.summary || {}
  const a = report.audience || {}
  const k = report.keywords || {}
  const p = report.pages || {}
  const r = report.reach || {}
  const d = report.design || {}
  return {
    url: report.target?.finalUrl,
    title: s.title, description: s.description, siteType: s.siteType, language: s.language, headline: s.headline,
    audience: a.summary || null,
    who: (a.who || []).slice(0, 6).map((w) => ({ label: w.label, count: w.count, evidence: (w.evidence || [])[0] })),
    wants: (a.wants || []).slice(0, 6).map((x) => x.text),
    struggles: (a.struggles || []).slice(0, 6).map((x) => x.text),
    hesitations: (a.hesitations || []).slice(0, 6).map((x) => x.text),
    proof: (a.proof || []).slice(0, 6).map((x) => x.text),
    pricing: a.pricing || null,
    tone: a.tone ? { register: a.tone.register, voice: a.tone.voice, urgency: a.tone.urgency } : null,
    focusKeyword: k.focus?.term || null,
    keywords: (k.terms || []).slice(0, 20).map((t) => t.term),
    phrases: (k.phrases || []).slice(0, 12).map((t) => t.term),
    ctaIntents: (k.intents || []).map((i) => `${i.intent}: ${i.examples.join(' / ')}`),
    ctas: (report.structure?.ctas || []).slice(0, 8).map((c) => c.text),
    headlines: ((report.structure?.outline || []).map((h) => h.text).filter(Boolean).length ? (report.structure.outline || []).map((h) => h.text).filter(Boolean) : (report.content?.headlines || [])).slice(0, 15),
    pages: { count: p.internalCount, byType: p.byType, sections: (p.sections || []).slice(0, 8).map((x) => x.name), keyPages: (p.keyPages || []).map((x) => `${x.type}: ${x.path}`) },
    reach: { analytics: (r.analytics || []).map((x) => x.name), ads: (r.ads || []).map((x) => x.name), social: Object.keys(r.socialByPlatform || {}), paidAcquisitionLikely: r.paidAcquisitionLikely, organicContentLikely: r.organicContentLikely },
    stack: Object.entries(s.technologiesByCategory || {}).map(([c, n]) => `${c}: ${n.join(', ')}`),
    design: { mode: d.colors?.mode, accent: d.colors?.roles?.accent, fonts: s.primaryFonts },
    prices: (report.content?.prices || []).filter((x) => x.context !== 'inline script literal').slice(0, 8).map((x) => x.amount),
  }
}

export function buildPrompt(report, portfolio) {
  const digest = digestReport(report)
  const items = (portfolio?.items || []).map((i) => ({ id: i.id, type: i.type, name: i.name, audience: i.audience || '', promise: i.promise || '', price: i.price || '', keywords: i.keywords || '', notes: i.notes || '' }))
  return `You are the offer strategist for an enterprise that runs several brands, offers and projects. A reverse-engineering tool analyzed a competitor or reference website. Decide whether what it reveals adds NEW value to this enterprise, and turn it into pipeline-ready material.

Rules:
- Use only the analysis below as facts about the site. Do not invent traffic, revenue or customer numbers.
- "new_offer": the site reveals an audience, problem or offer shape the portfolio does not cover and that fits the enterprise.
- "enrich_existing": it mainly strengthens an existing portfolio item (name it in mapsTo). "brand_angle": it mainly informs positioning, voice or design of a brand. "archive": nothing actionable.
- Write the offerIdea as an ORIGINAL offer for this enterprise (never copy the site's name, copy or assets). Price anchors come from observed prices when present.
- Keep every string short (one sentence). Return only the JSON object.

PORTFOLIO (${items.length} items):
${JSON.stringify(items, null, 1)}

SITE ANALYSIS:
${JSON.stringify(digest, null, 1)}`
}

// ------------------------------------------------------------------------------------------
// Heuristic (no model): keyword/audience overlap with the portfolio, price band, evidence count.

function tokens(s) { return new Set(String(s || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 3)) }
function jaccard(a, b) { if (!a.size || !b.size) return 0; let inter = 0; for (const t of a) if (b.has(t)) inter++; return inter / (a.size + b.size - inter) }

export function heuristicEvaluation(report, portfolio) {
  const d = digestReport(report)
  const siteTokens = new Set([...tokens(d.keywords.join(' ')), ...tokens(d.phrases.join(' ')), ...tokens(d.audience?.who), ...tokens(d.title), ...tokens(d.description)])
  const items = portfolio?.items || []
  const scored = items.map((i) => ({ item: i, overlap: jaccard(siteTokens, tokens(`${i.name} ${i.audience} ${i.promise} ${i.keywords} ${i.notes}`)) })).sort((a, b) => b.overlap - a.overlap)
  const best = scored[0]
  const evidence = (report.audience?.evidenceCount || 0)
  const hasOffer = (d.pricing?.observed || 0) > 0 || d.ctaIntents.some((c) => /^(buy|try|signup|pricing)/.test(c))
  let verdict = 'archive'
  let reasons = []
  if (!hasOffer && evidence < 6) { reasons.push('No prices, sign-up or trial CTAs and little audience copy were observed on this page.') }
  else if (best && best.overlap >= 0.12) { verdict = 'enrich_existing'; reasons.push(`Keyword/audience overlap ${Math.round(best.overlap * 100)}% with "${best.item.name}".`) }
  else if (items.length === 0) { verdict = 'new_offer'; reasons.push('No portfolio items yet: every analyzed offer is a candidate until you add your brands and offers.') }
  else { verdict = 'new_offer'; reasons.push(`Low overlap with every portfolio item (best ${Math.round((best?.overlap || 0) * 100)}%): audience or problem not covered yet.`) }
  if (d.pricing?.observed) reasons.push(`Observed price band: ${d.pricing.currency || ''}${d.pricing.min}–${d.pricing.max} ${d.pricing.cadence || ''} (${d.pricing.band}).`)
  if (d.reach.paidAcquisitionLikely) reasons.push(`Ad pixels present (${d.reach.ads.join(', ')}): the site is buying traffic for this offer.`)
  const score = Math.min(100, Math.round(20 + (hasOffer ? 25 : 0) + Math.min(25, evidence) + (d.reach.paidAcquisitionLikely ? 10 : 0) + (verdict === 'enrich_existing' ? 10 : 0) + Math.min(10, (d.pages.count || 0))))
  const who = d.audience?.who || 'the audience this page addresses'
  return {
    verdict, addsValue: verdict !== 'archive', score, reasons,
    mapsTo: best && best.overlap >= 0.12 ? [{ portfolioId: best.item.id, name: best.item.name, how: 'Highest keyword and audience overlap in the portfolio.' }] : [],
    offerIdea: {
      name: `${(d.focusKeyword || d.siteType || 'offer').replace(/\b\w/g, (c) => c.toUpperCase())} offer (working title)`,
      promise: d.wants[0] || d.headline || d.description || 'Promise to be written from the observed outcomes.',
      audience: who,
      problem: d.struggles[0] || 'Problem statement to be written (no pain sentence observed on this page).',
      mechanism: d.phrases.slice(0, 3).join(', ') || d.focusKeyword || 'mechanism to define',
      deliverables: d.headlines.slice(0, 5),
      priceAnchor: d.pricing?.observed ? `${d.pricing.currency || ''}${d.pricing.min}–${d.pricing.max} ${d.pricing.cadence || ''}`.trim() : 'no prices observed; set from your own ladder',
      ladder: (d.pricing?.tiers || []).slice(0, 3).map((t, i) => ({ tier: `Tier ${i + 1}`, price: t.amount, includes: t.context.slice(0, 100) })),
      hooks: [...d.headlines.slice(0, 3), ...d.wants.slice(0, 2)].slice(0, 5),
      objections: d.hesitations.slice(0, 4).map((h) => ({ objection: h, answer: 'Answer with your own guarantee, proof or policy.' })),
      proofToGather: d.proof.length ? ['Match or beat the observed proof: ' + d.proof[0]] : ['Collect testimonials, numbers and logos before launch.'],
      channels: [...d.reach.social, d.reach.paidAcquisitionLikely ? 'paid social (observed pixels)' : 'organic / content'].slice(0, 5),
    },
    brandLearnings: [d.tone ? `Tone: ${d.tone.register}; ${d.tone.voice}; ${d.tone.urgency}.` : null, d.design?.mode ? `Design: ${d.design.mode} mode, accent ${d.design.accent || 'n/a'}, fonts ${(d.design.fonts || []).join(', ') || 'n/a'}.` : null].filter(Boolean),
    nextSteps: verdict === 'archive' ? ['Keep in the library for reference; re-evaluate if the site changes.'] : ['Review the avatar and pricing evidence.', 'Send the hand-off brief to the offer creation pipeline.', 'Add the resulting offer to the portfolio so future sites are compared against it.'],
    agent: 'heuristic',
    model: null,
    evaluatedAt: new Date().toISOString(),
  }
}

// ------------------------------------------------------------------------------------------
// Model-backed providers.

function parseEvaluation(text) {
  const m = /\{[\s\S]*\}/.exec(text || '')
  if (!m) throw new Error('The agent returned no JSON.')
  const obj = JSON.parse(m[0])
  if (!obj.verdict || !obj.offerIdea) throw new Error('The agent returned an incomplete evaluation.')
  return obj
}

export async function evaluateWithSample(sample, report, portfolio) {
  const value = await sample.json(`${buildPrompt(report, portfolio)}\n\nReturn a JSON object matching this schema exactly: ${JSON.stringify(EVALUATION_SCHEMA)}`, { modelTier: 'complex', cache: false })
  const obj = typeof value === 'string' ? parseEvaluation(value) : value
  return { ...obj, agent: 'claude.ai (artifact)', model: null, evaluatedAt: new Date().toISOString() }
}

export async function evaluateWithProxy(proxy, report, portfolio, model) {
  const res = await fetch(proxy.url, { method: 'POST', headers: { 'content-type': 'application/json', ...proxy.headers }, body: JSON.stringify({ prompt: buildPrompt(report, portfolio), schema: EVALUATION_SCHEMA, model }) })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error || `offer-agent HTTP ${res.status}`)
  return { ...parseEvaluation(typeof body.text === 'string' ? body.text : JSON.stringify(body.evaluation || body)), agent: 'Claude via cloud function', model: body.model || model || null, evaluatedAt: new Date().toISOString() }
}

export async function evaluateWithAnthropic(apiKey, report, portfolio, model = DEFAULT_MODEL) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    output_config: { format: { type: 'json_schema', schema: EVALUATION_SCHEMA } },
    messages: [{ role: 'user', content: buildPrompt(report, portfolio) }],
  })
  if (response.stop_reason === 'refusal') throw new Error('The model declined this request.')
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  return { ...parseEvaluation(text), agent: 'Claude (your API key)', model: response.model || model, evaluatedAt: new Date().toISOString(), usage: response.usage ? { input: response.usage.input_tokens, output: response.usage.output_tokens } : null }
}

/**
 * Runs the best available judgement. `ctx` = { sample?, proxy?, apiKey?, model? }. The heuristic
 * is the floor so the pipeline always moves; `used` says which path produced the result.
 */
export async function evaluate(report, portfolio, ctx = {}) {
  const errors = []
  if (ctx.sample) { try { return await evaluateWithSample(ctx.sample, report, portfolio) } catch (e) { errors.push(`artifact: ${e.message || e.code || e}`) } }
  if (ctx.proxy) { try { return await evaluateWithProxy(ctx.proxy, report, portfolio, ctx.model) } catch (e) { errors.push(`cloud: ${e.message}`) } }
  if (ctx.apiKey) { try { return await evaluateWithAnthropic(ctx.apiKey, report, portfolio, ctx.model || DEFAULT_MODEL) } catch (e) { errors.push(`api: ${e.message}`) } }
  const h = heuristicEvaluation(report, portfolio)
  return { ...h, fallbackErrors: errors }
}

// ------------------------------------------------------------------------------------------
// Hand-off: what leaves the app and enters the offer creation pipeline.

export function handoffPayload(report, evaluation, portfolio) {
  return {
    format: 'rea-webapp-handoff', version: 1, createdAt: new Date().toISOString(),
    source: { url: report.target?.finalUrl, title: report.summary?.title, analyzedAt: report.generatedAt, reportVersion: report.reportVersion },
    pipeline: report.pipeline || null,
    evaluation,
    digest: digestReport(report),
    portfolioMatches: (evaluation?.mapsTo || []).map((m) => ({ ...m, item: (portfolio?.items || []).find((i) => i.id === m.portfolioId) || null })),
    designTokensCss: report.blueprint?.tokensCss || null,
  }
}

export function handoffMarkdown(report, evaluation, portfolio) {
  const d = digestReport(report)
  const o = evaluation?.offerIdea || {}
  const L = []
  L.push(`# Offer pipeline hand-off: ${d.title || d.url}`)
  L.push('')
  L.push(`Source: ${d.url}  \nAnalyzed: ${report.generatedAt}  \nJudged by: ${evaluation?.agent || 'n/a'}${evaluation?.model ? ` (${evaluation.model})` : ''}  \nVerdict: **${evaluation?.verdict}** · adds value: **${evaluation?.addsValue ? 'yes' : 'no'}** · score ${evaluation?.score}/100`)
  L.push('')
  L.push('## Why')
  for (const r of evaluation?.reasons || []) L.push(`- ${r}`)
  if (evaluation?.mapsTo?.length) { L.push(''); L.push('## Maps to portfolio'); for (const m of evaluation.mapsTo) L.push(`- **${m.name}** (${m.portfolioId}): ${m.how}`) }
  L.push('')
  L.push('## Offer idea (original, for us)')
  L.push(`| Field | Value |\n| --- | --- |`)
  for (const [k, v] of [['Name', o.name], ['Promise', o.promise], ['Audience', o.audience], ['Problem', o.problem], ['Mechanism', o.mechanism], ['Price anchor', o.priceAnchor]]) L.push(`| ${k} | ${String(v || '').replace(/\|/g, '\\|')} |`)
  if (o.ladder?.length) { L.push(''); L.push('### Ladder'); L.push('| Tier | Price | Includes |\n| --- | --- | --- |'); for (const t of o.ladder) L.push(`| ${t.tier} | ${t.price} | ${String(t.includes || '').replace(/\|/g, '\\|')} |`) }
  for (const [title, arr] of [['Deliverables', o.deliverables], ['Hooks', o.hooks], ['Channels', o.channels], ['Proof to gather', o.proofToGather]]) if (arr?.length) { L.push(''); L.push(`### ${title}`); for (const x of arr) L.push(`- ${x}`) }
  if (o.objections?.length) { L.push(''); L.push('### Objections to answer'); for (const x of o.objections) L.push(`- **${x.objection}** — ${x.answer}`) }
  if (evaluation?.brandLearnings?.length) { L.push(''); L.push('## Brand learnings'); for (const x of evaluation.brandLearnings) L.push(`- ${x}`) }
  L.push(''); L.push('## Next steps'); for (const x of evaluation?.nextSteps || []) L.push(`- ${x}`)
  L.push('')
  L.push('## Evidence digest')
  L.push('```json'); L.push(JSON.stringify({ audience: d.audience, pricing: d.pricing, keywords: d.keywords, phrases: d.phrases, ctas: d.ctas, reach: d.reach, pages: d.pages, stack: d.stack }, null, 2)); L.push('```')
  L.push('')
  L.push('## Prompt for the offer creation assistant')
  L.push('```')
  L.push(`Use the hand-off above. Build an original ${evaluation?.verdict === 'enrich_existing' ? 'enrichment of ' + (evaluation.mapsTo?.[0]?.name || 'the matched offer') : 'offer'} for our enterprise: product outline, sales page sections, email/DM sequence and a week of content. Do not reuse the source site's copy, name or assets. Keep claims to what the evidence supports.`)
  L.push('```')
  L.push('')
  L.push(`_Generated by the REA webapp. ${report.audience?.disclaimer || ''}_`)
  return L.join('\n')
}

/** POSTs the hand-off to a user-owned endpoint (Make, n8n, Zapier catch hook, your own API). */
export async function sendToWebhook(url, payload) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(`Webhook answered HTTP ${res.status}`)
  return res.status
}

export function newPortfolioItem(partial = {}) {
  return { id: `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, type: 'offer', name: '', audience: '', promise: '', price: '', keywords: '', notes: '', createdAt: new Date().toISOString(), ...partial }
}
