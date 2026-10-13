// Keyword and phrase extraction from the page's own copy, weighted by where each term appears.
// Everything here is observed text: no search-volume or ranking data is fetched or guessed.

const STOP = new Set(`
a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your yours yourself yourselves
get got one two new via per
o a os as um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre e ou mas que se seu sua seus suas meu minha nosso nossa ele ela eles elas eu nós você vocês isso isto esse essa este esta aquele aquela ao aos à às pelo pela pelos pelas já não sim mais menos muito muita muitos muitas como quando onde qual quais também até são foi ser está estão tem têm ter
el la los las un una unos unas de del en por para con sin sobre y o pero que si su sus mi mis nuestro nuestra ellos ellas yo nosotros usted ustedes eso esto ese esa este esta al lo le les ya no sí más menos muy como cuando donde cual cuales también hasta son fue ser está están tiene tienen tener
le la les un une des du de en au aux et ou mais que qui si son sa ses mon ma mes notre nos vous nous il elle ils elles ce cet cette ces pour par sur sous avec sans dans est sont été être plus moins très comme quand où aussi
der die das ein eine einen einem einer des dem den und oder aber dass wenn sie er es wir ihr ich mein meine unser unsere für mit ohne über unter auf aus bei nach von zu zum zur ist sind war sein mehr weniger sehr wie wann wo auch bis
`.split(/\s+/).filter(Boolean))

const CTA_INTENTS = [
  ['buy', /\b(buy|purchase|order|checkout|add to cart|comprar|compre|pedir|acheter|kaufen|shop now|get yours)\b/i],
  ['try', /\b(try|start free|free trial|get started|start now|começar|começe|comece|teste|experimente|essayer|probieren|start today|começar agora)\b/i],
  ['signup', /\b(sign ?up|register|create (an )?account|join|cadastr|inscrever|registrar|s'inscrire|registrieren|subscribe|assine|subscrib)\b/i],
  ['login', /\b(log ?in|sign ?in|entrar|acessar|iniciar sess|connexion|anmelden|my account|minha conta)\b/i],
  ['learn', /\b(learn more|read more|see how|how it works|discover|explore|saiba mais|veja como|conheça|leia|descubra|en savoir plus|mehr erfahren|watch|assista|docs|documentation)\b/i],
  ['contact', /\b(contact|talk to|book a (demo|call)|schedule|request a demo|get a quote|fale|falar|agende|agendar|contato|contacto|whatsapp|demo|demonstra)\b/i],
  ['download', /\b(download|baixar|baixe|descargar|télécharger|herunterladen|install|app store|google play)\b/i],
  ['pricing', /\b(pricing|plans|preços|planos|precios|tarifs|preise|see plans|ver planos)\b/i],
]

const WEIGHTS = { title: 6, h1: 5, description: 4, h2: 3, h3: 2, nav: 2, cta: 2, alt: 1.5, url: 2, body: 1 }

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length >= 2 && !/^\d+([.,]\d+)?$/.test(t) && !/^[-+#.]+$/.test(t))
}

function isStop(t) { return STOP.has(t) || t.length < 3 }

/**
 * @param {object} input
 * @param {any} input.$ cheerio instance
 * @param {object} input.content   analyzeContent() output
 * @param {object} input.structure analyzeStructure() output
 * @param {string} input.pageUrl
 */
export function analyzeKeywords({ $, content, structure, pageUrl }) {
  const terms = new Map()
  const phrases = new Map()
  const bump = (map, key, where, weight, sample) => {
    const e = map.get(key) || { key, score: 0, count: 0, where: {}, sample: null }
    e.score += weight
    e.count++
    e.where[where] = (e.where[where] || 0) + 1
    if (!e.sample && sample) e.sample = sample.slice(0, 120)
    map.set(key, e)
  }
  const ingest = (text, where, weight, { maxTokens = 400 } = {}) => {
    if (!text) return
    const toks = tokenize(text).slice(0, maxTokens)
    for (const t of toks) if (!isStop(t)) bump(terms, t, where, weight, text)
    // n-grams keep inner stop words ("intelligence for sellers") but never start or end on one.
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i + n <= toks.length; i++) {
        const gram = toks.slice(i, i + n)
        if (isStop(gram[0]) || isStop(gram[n - 1])) continue
        if (gram.filter((g) => !isStop(g)).length < 2) continue
        bump(phrases, gram.join(' '), where, weight * (n === 3 ? 1.15 : 1), text)
      }
    }
  }

  ingest(content.title, 'title', WEIGHTS.title)
  ingest(content.description, 'description', WEIGHTS.description)
  ingest(content.openGraph?.title, 'title', WEIGHTS.title / 2)
  ingest(content.openGraph?.description, 'description', WEIGHTS.description / 2)
  for (const h of structure.outline) ingest(h.text, h.level === 1 ? 'h1' : h.level === 2 ? 'h2' : 'h3', h.level === 1 ? WEIGHTS.h1 : h.level === 2 ? WEIGHTS.h2 : WEIGHTS.h3)
  for (const n of structure.navLinks) ingest(n.text, 'nav', WEIGHTS.nav, { maxTokens: 8 })
  for (const c of structure.ctas.slice(0, 20)) ingest(c.text, 'cta', WEIGHTS.cta, { maxTokens: 8 })
  $('img[alt]').each((_, el) => ingest($(el).attr('alt'), 'alt', WEIGHTS.alt, { maxTokens: 12 }))
  try { ingest(new URL(pageUrl).pathname.replace(/[/_-]+/g, ' '), 'url', WEIGHTS.url, { maxTokens: 12 }) } catch { /* ignore */ }
  for (const b of content.textBlocks) if (!/^h[1-4]$/.test(b.tag)) ingest(b.text, 'body', WEIGHTS.body, { maxTokens: 60 })

  const metaKeywords = (content.metas?.keywords || '').split(',').map((k) => k.trim()).filter(Boolean)
  for (const k of metaKeywords) ingest(k, 'title', WEIGHTS.description)

  const totalTermHits = [...terms.values()].reduce((a, t) => a + t.count, 0) || 1
  const rank = (map, limit) => [...map.values()]
    .filter((e) => e.count >= 1)
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map((e) => ({ term: e.key, score: Math.round(e.score * 10) / 10, count: e.count, where: e.where, sample: e.sample }))
  const topTerms = rank(terms, 40)
  const topPhrases = rank(phrases, 30).filter((p) => p.count >= 2 || p.where.title || p.where.h1 || p.where.description)

  // Primary keyword: the best phrase that the title or h1 contains; else the top term.
  const headline = `${content.title || ''} ${structure.outline.find((h) => h.level === 1)?.text || ''}`.toLowerCase()
  const focus = topPhrases.find((p) => headline.includes(p.term)) || topPhrases[0] || topTerms[0] || null

  const intents = {}
  for (const c of structure.ctas) {
    const hit = CTA_INTENTS.find(([, re]) => re.test(c.text))
    const intent = hit ? hit[0] : 'other'
    const e = intents[intent] || { intent, count: 0, examples: [] }
    e.count += c.occurrences
    if (e.examples.length < 4 && !e.examples.includes(c.text)) e.examples.push(c.text)
    intents[intent] = e
  }

  return {
    focus: focus ? { term: focus.term, score: focus.score, where: focus.where } : null,
    terms: topTerms.map((t) => ({ ...t, share: Math.round((t.count / totalTermHits) * 1000) / 10 })),
    phrases: topPhrases,
    metaKeywords,
    intents: Object.values(intents).sort((a, b) => b.count - a.count),
    totals: { distinctTerms: terms.size, termHits: totalTermHits, distinctPhrases: phrases.size },
    method: 'Terms weighted by placement (title 6, h1 5, meta description 4, h2 3, h3/nav/CTA 2, alt 1.5, body 1). Stop words removed for en/pt/es/fr/de. No external search data.',
  }
}
