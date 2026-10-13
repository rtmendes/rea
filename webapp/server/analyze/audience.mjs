// Customer avatar inferred from the page's own copy: who it addresses, what it promises, which
// pains and objections it answers, how it proves itself and what it charges. Every field keeps
// the sentence(s) it was derived from, and the whole block is labelled as an inference.

function clean(t) { return (t || '').replace(/\s+/g, ' ').trim() }

const ROLE_WORDS = [
  // English
  'sellers', 'seller', 'marketers', 'marketer', 'founders', 'founder', 'developers', 'developer', 'designers', 'designer', 'agencies', 'agency', 'creators', 'creator', 'coaches', 'coach',
  'students', 'teachers', 'restaurants', 'dentists', 'lawyers', 'realtors', 'real estate', 'ecommerce', 'e-commerce', 'dropshipping', 'dropshippers', 'affiliates', 'affiliate', 'freelancers', 'freelancer',
  'small business', 'small businesses', 'startups', 'startup', 'enterprises', 'enterprise', 'teams', 'team', 'brands', 'brand', 'merchants', 'merchant', 'retailers', 'shop owners', 'store owners',
  'consultants', 'photographers', 'musicians', 'artists', 'writers', 'bloggers', 'podcasters', 'youtubers', 'influencers', 'traders', 'investors', 'parents', 'patients', 'clinics', 'doctors', 'nurses',
  'recruiters', 'hr teams', 'sales teams', 'support teams', 'product teams', 'engineers', 'data teams', 'analysts', 'accountants', 'nonprofits', 'schools', 'churches', 'gyms', 'trainers', 'nutritionists',
  // Portuguese
  'vendedores', 'vendedor', 'empreendedores', 'empreendedor', 'lojistas', 'lojista', 'afiliados', 'afiliado', 'infoprodutores', 'produtores', 'agências', 'agência', 'criadores', 'criador', 'coprodutores',
  'médicos', 'dentistas', 'advogados', 'contadores', 'nutricionistas', 'personal trainers', 'professores', 'alunos', 'estudantes', 'restaurantes', 'clínicas', 'imobiliárias', 'corretores', 'freelancers', 'autônomos',
  'pequenas empresas', 'empresas', 'negócios', 'marcas', 'startups', 'times', 'equipes', 'gestores', 'donos de loja', 'dropshippers', 'e-commerces', 'ecommerces', 'anunciantes', 'gestores de tráfego',
  // Spanish
  'vendedores', 'emprendedores', 'emprendedor', 'tiendas', 'afiliados', 'agencias', 'creadores', 'médicos', 'abogados', 'profesores', 'estudiantes', 'restaurantes', 'clínicas', 'inmobiliarias', 'pymes', 'empresas', 'negocios', 'marcas', 'equipos', 'anunciantes',
]

const B2B = /\b(team|teams|enterprise|company|companies|business|businesses|organization|organisation|workflow|roi|integration|integrations|api|soc ?2|sso|saml|sales|pipeline|crm|agency|agencies|clients|b2b|procurement|compliance|stakeholders|empresa|empresas|equipe|equipes|times|negócio|negócios|clientes|agência|agências|integração|integrações|gestão|gestor|empresarial|corporativo|negocio|negocios|equipo|equipos)\b/gi
const B2C = /\b(you|your|yourself|family|families|home|personal|everyday|lifestyle|kids|children|parents|wellness|hobby|fun|friends|yourself|você|sua família|família|casa|pessoal|dia a dia|filhos|amigos|usted|tu|tus|familia|hogar|personal)\b/gi

const PAIN = /\b(without|no more|stop|tired of|struggl\w*|hard to|difficult|wast\w*|los(e|ing)|frustrat\w*|problem\w*|pain\w*|manual\w*|slow|expensive|confus\w*|overwhelm\w*|headache|guesswork|guessing|stuck|chaos|messy|boring|risk\w*|late|miss\w*|fail\w*|sem|pare de|parar de|cansad\w*|difícil|dificil|perd\w*|problema\w*|manual\w*|lento|caro|demorad\w*|confus\w*|dor de cabeça|achismo|travad\w*|bagunça|erro\w*|deja de|cansad\w*|difícil|perd\w*|problema\w*|lento|caro|confus\w*)\b/i
const OUTCOME = /\b(increase|boost|grow|growth|save|faster|quicker|more|double|triple|\d+x|scale|automat\w*|convert\w*|earn|profit\w*|revenue|results|win|unlock|maximize|optimi[sz]e|improve|simplif\w*|effortless|easy|easily|instantly|predict\w*|discover|find|track|monitor|aumente|aumentar|aumento|cresç\w*|crescimento|economi[sz]e|economizar|mais|rápido|rapido|dobr\w*|escal\w*|automatiz\w*|convers\w*|lucr\w*|faturamento|vendas|resultados|ganh\w*|otimiz\w*|melhor\w*|simplific\w*|fácil|facil|descubra|encontre|acompanhe|monitore|previs\w*|aumenta|crecer|ahorr\w*|más|rápido|automatiz\w*|convertir|ganar|ganancias|ingresos|resultados|optimiz\w*|mejor\w*|fácil|descubre|encuentra)\b/i
const OBJECTION = /\b(free trial|trial|no credit card|cancel any ?time|money[- ]back|guarantee\w*|refund\w*|secure|security|encrypted|gdpr|lgpd|ccpa|hipaa|soc ?2|ssl|privacy|trusted by|used by|loved by|rated|reviews?|testimonials?|support 24\/7|24\/7|live chat|onboarding|setup in|minutes|no code|no-code|no commitment|risk[- ]free|teste gr[aá]tis|gr[aá]tis|sem cart[aã]o|cancele quando quiser|garantia|reembolso|seguro|segurança|criptograf\w*|privacidade|confiado por|usado por|avaliações|depoimentos|suporte|em minutos|sem compromisso|sem risco|prueba gratis|gratis|sin tarjeta|cancela cuando quieras|garantía|reembolso|seguro|seguridad|privacidad|reseñas|testimonios|soporte|en minutos|sin compromiso)\b/i
const PROOF_NUMBER = /(\+?\d[\d.,]*\s?(?:\+|%|k\b|m\b|mil\b|milh[õo]es|million|billion|bilh[õo]es)|\b\d[\d.,]*\s+(?:users|customers|clients|companies|businesses|stores|sellers|members|students|downloads|reviews|countries|usuários|clientes|empresas|lojas|vendedores|alunos|membros|downloads|avaliações|países|usuarios|tiendas|miembros|reseñas|países))/i
const SOCIAL_PLATFORMS = [['instagram.com', 'Instagram'], ['facebook.com', 'Facebook'], ['twitter.com', 'X / Twitter'], ['x.com', 'X / Twitter'], ['linkedin.com', 'LinkedIn'], ['youtube.com', 'YouTube'], ['tiktok.com', 'TikTok'], ['github.com', 'GitHub'], ['discord', 'Discord'], ['t.me', 'Telegram'], ['wa.me', 'WhatsApp'], ['whatsapp.com', 'WhatsApp'], ['threads.net', 'Threads'], ['pinterest.com', 'Pinterest'], ['reddit.com', 'Reddit'], ['medium.com', 'Medium'], ['substack.com', 'Substack']]

function sentences(blocks) {
  const out = []
  for (const b of blocks) {
    for (const s of b.text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý0-9"“])/)) {
      const t = clean(s)
      if (t.length >= 12 && t.length <= 260) out.push({ text: t, tag: b.tag })
    }
  }
  return out
}

function topN(map, n) { return [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, n).map(([key, v]) => ({ ...v, key })) }

function parseAmount(raw) {
  const m = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/.exec(raw)
  if (!m) return null
  let s = m[1]
  // 1.234,56 (pt/es) vs 1,234.56 (en): the last separator followed by two digits is the decimal mark.
  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (lastSep > -1 && s.length - lastSep - 1 === 2) s = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1)
  else s = s.replace(/[.,]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object} input
 * @param {object} input.content   analyzeContent() output
 * @param {object} input.structure analyzeStructure() output
 * @param {object} input.technologies detectTechnologies() output
 * @param {any} input.$ cheerio
 */
export function analyzeAudience({ $, content, structure, technologies }) {
  const blocks = content.textBlocks || []
  const sents = sentences(blocks)
  const headings = structure.outline.map((h) => h.text)
  const allText = `${content.title || ''} ${content.description || ''} ${headings.join(' ')} ${blocks.map((b) => b.text).join(' ')}`
  const lower = allText.toLowerCase()

  // Who: explicit "for <audience>" phrases and known role words.
  const mentions = new Map()
  const FOR_RE = /\b(?:for|built for|designed for|made for|perfect for|ideal for|helps?|para|feito para|ideal para|ajuda(?:mos)?|pour|für)\s+(?:the\s+|os\s+|as\s+|los\s+|las\s+|les\s+|die\s+)?([\p{L}][\p{L}\s&-]{2,40}?(?:\s+(?:who|that|which|que|qui)\s+[\p{L}\s]{3,30}?)?)(?=[.,;:!?)]|\s+(?:to|and|e|y|et|und|all|tudo|todo)\b|$)/giu
  const PRONOUNS = /^(you|your|yourself|me|us|them|everyone|anyone|all|free|more|less|good|now|today|life|that|this|those|these|it|you all|você|vocês|voce|seu|sua|todos|todas|mim|nós|ti|usted|ustedes|tu|tus|vous|toi|nous|dich|sie)$/i
  for (const s of [...headings, content.title || '', content.description || '', ...sents.map((x) => x.text)]) {
    for (const m of s.matchAll(FOR_RE)) {
      const phrase = clean(m[1]).toLowerCase().replace(/\s+(?:who|that|which|que|qui)\s*$/, '')
      if (phrase.split(' ').length > 8 || PRONOUNS.test(phrase)) continue
      const e = mentions.get(phrase) || { count: 0, evidence: [] }
      e.count++
      if (e.evidence.length < 3) e.evidence.push(s.slice(0, 160))
      mentions.set(phrase, e)
    }
  }
  const roles = new Map()
  for (const role of ROLE_WORDS) {
    const re = new RegExp(`\\b${role.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')
    const hits = lower.match(re)
    if (!hits) continue
    const e = roles.get(role) || { count: 0, evidence: [] }
    e.count += hits.length
    const ev = sents.find((x) => re.test(x.text))
    if (ev && e.evidence.length < 2) e.evidence.push(ev.text)
    roles.set(role, e)
  }

  const b2b = (allText.match(B2B) || []).length
  const b2c = (allText.match(B2C) || []).length
  const model = b2b + b2c < 4 ? 'unclear' : b2b > b2c * 1.5 ? 'B2B' : b2c > b2b * 1.5 ? 'B2C' : 'mixed'

  const pick = (re, limit) => {
    const seen = new Set()
    const out = []
    for (const s of sents) {
      if (!re.test(s.text)) continue
      const key = s.text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ text: s.text, tag: s.tag, marker: (re.exec(s.text) || [''])[0] })
      if (out.length >= limit) break
    }
    return out
  }
  const pains = pick(PAIN, 8)
  const outcomes = pick(OUTCOME, 10)
  const objections = pick(OBJECTION, 8)

  // Proof: numbers, testimonial/review sections, logos, ratings.
  const proof = []
  for (const s of sents) { const m = PROOF_NUMBER.exec(s.text); if (m) proof.push({ kind: 'number', text: s.text, match: m[0] }); if (proof.length >= 8) break }
  const testimonialSections = structure.sections.filter((x) => /testimon|depoiment|review|avalia|resen|customer|client|case stud|hist[oó]ria|results|resultados/i.test(`${x.label || ''} ${x.heading || ''} ${x.id || ''}`))
  for (const x of testimonialSections.slice(0, 4)) proof.push({ kind: 'section', text: x.heading || x.label || x.id, match: x.source })
  const quotes = $('blockquote, q, [class*="testimonial"], [class*="review"], [class*="depoimento"]').length
  if (quotes) proof.push({ kind: 'quotes', text: `${quotes} quote/testimonial element(s) in the DOM`, match: 'blockquote/testimonial/review class' })
  const logoImgs = $('img[alt*="logo" i], img[src*="logo" i]').length
  if (logoImgs > 2) proof.push({ kind: 'logos', text: `${logoImgs} logo images (likely a client/partner logo strip)`, match: 'img alt/src contains "logo"' })
  const stars = (lower.match(/★|⭐|\b[45][.,]\d\s?(?:\/\s?5|stars|estrelas|estrellas)|\b5 stars\b/g) || []).length
  if (stars) proof.push({ kind: 'rating', text: `${stars} star-rating marker(s) in copy`, match: '★ / x.x/5' })

  // Pricing from observed amounts.
  const visiblePrices = (content.prices || []).filter((p) => p.context !== 'inline script literal')
  const amounts = visiblePrices.map((p) => ({ raw: p.amount, value: parseAmount(p.amount), context: p.context })).filter((p) => p.value != null && p.value > 0)
  const cadence = /\/\s?(mo|month|mês|mes)|per month|por mês|mensal|monthly/i.test(visiblePrices.map((p) => `${p.amount} ${p.context}`).join(' ')) ? 'monthly' : /\/\s?(yr|year|ano)|annual|anual|yearly/i.test(visiblePrices.map((p) => p.context).join(' ')) ? 'yearly' : visiblePrices.length ? 'one-off / unspecified' : null
  const currency = (visiblePrices[0]?.amount || '').match(/US\$|R\$|USD|EUR|GBP|BRL|CAD|AUD|[$€£¥₹]/)?.[0] || null
  const freePlan = /\b(free plan|free forever|plano gr[aá]tis|gr[aá]tis para sempre|plan gratis|freemium|\$0|r\$ ?0)\b/i.test(lower)
  const pricing = {
    observed: amounts.length,
    min: amounts.length ? Math.min(...amounts.map((a) => a.value)) : null,
    max: amounts.length ? Math.max(...amounts.map((a) => a.value)) : null,
    currency,
    cadence,
    freePlan,
    tiers: amounts.slice(0, 6).map((a) => ({ amount: a.raw, context: a.context })),
    band: amounts.length ? (Math.max(...amounts.map((a) => a.value)) >= 500 ? 'high-ticket' : Math.max(...amounts.map((a) => a.value)) >= 50 ? 'mid-range subscription' : 'low-ticket') : null,
  }

  // Tone and sophistication.
  const words = allText.split(/\s+/).filter(Boolean)
  const sentCount = Math.max(1, sents.length)
  const avgSentence = Math.round((words.length / sentCount) * 10) / 10
  const avgWord = Math.round((words.join('').length / Math.max(1, words.length)) * 10) / 10
  const exclaim = (allText.match(/!/g) || []).length
  const questions = (allText.match(/\?/g) || []).length
  const secondPerson = (lower.match(/\b(you|your|você|voce|seu|sua|tu|usted|vous|du|sie)\b/g) || []).length
  const firstPlural = (lower.match(/\b(we|our|nós|nosso|nossa|nosotros|nuestro|nous|notre|wir|unser)\b/g) || []).length
  const emoji = (allText.match(/\p{Extended_Pictographic}/gu) || []).length
  const caps = blocks.filter((b) => b.text.length > 6 && b.text === b.text.toUpperCase() && /[A-Z]/.test(b.text)).length
  const tone = {
    avgSentenceWords: avgSentence,
    avgWordChars: avgWord,
    exclamations: exclaim,
    questions,
    secondPersonHits: secondPerson,
    firstPersonPluralHits: firstPlural,
    emoji,
    allCapsBlocks: caps,
    register: avgSentence > 22 || avgWord > 6 ? 'formal / technical' : exclaim > 3 || emoji > 0 || caps > 3 ? 'energetic / sales-driven' : 'plain / conversational',
    voice: secondPerson > firstPlural * 1.5 ? 'speaks to "you"' : firstPlural > secondPerson * 1.5 ? 'speaks as "we"' : 'balanced you/we',
    urgency: /\b(now|today|limited|only \d+|last chance|hurry|ends|agora|hoje|vagas|últim\w*|limitad\w*|ahora|hoy|última|limitado)\b/i.test(allText) ? 'uses urgency / scarcity cues' : 'no urgency cues observed',
  }

  // Channels.
  const social = new Map()
  for (const url of content.socialLinks || []) { const p = SOCIAL_PLATFORMS.find(([h]) => url.includes(h)); if (p) { const e = social.get(p[1]) || { platform: p[1], urls: [] }; if (!e.urls.includes(url)) e.urls.push(url); social.set(p[1], e) } }
  const emailForms = structure.forms.filter((f) => f.fields.some((x) => x.type === 'email')).length
  const appStores = [...new Set((content.externalLinkHosts || []).map((h) => h.host).filter((h) => /apps\.apple\.com|play\.google\.com/.test(h)))]
  const chat = technologies.filter((t) => t.category === 'chat').map((t) => t.name)
  const channels = {
    social: [...social.values()],
    emailCaptureForms: emailForms,
    appStores,
    chatWidgets: chat,
    phones: content.phones || [],
    emails: content.emails || [],
    whatsapp: (content.socialLinks || []).some((u) => /wa\.me|whatsapp/.test(u)),
  }

  const who = [...topN(mentions, 4).map((m) => ({ label: m.key, count: m.count, evidence: m.evidence, kind: 'explicit "for …" phrase' })), ...topN(roles, 6).map((r) => ({ label: r.key, count: r.count, evidence: r.evidence, kind: 'role word' }))]
  const evidenceCount = who.length + pains.length + outcomes.length + objections.length + proof.length + amounts.length
  const confidence = evidenceCount >= 20 ? 'medium' : evidenceCount >= 8 ? 'low' : 'very low'

  return {
    disclaimer: 'Inferred from the page\'s own copy and markup. It describes who the page is written for, not measured visitors. Verify with real customer data before acting on it.',
    confidence,
    evidenceCount,
    model: { label: model, b2bHits: b2b, b2cHits: b2c },
    who,
    wants: outcomes,
    struggles: pains,
    hesitations: objections,
    proof,
    pricing,
    tone,
    channels,
    locale: { lang: content.lang || null, hreflang: (content.hreflang || []).map((h) => h.lang), currency, textLanguage: content.languageHint?.language || null },
    summary: {
      who: who[0]?.label || (model === 'B2B' ? 'businesses / teams (no explicit audience phrase found)' : model === 'B2C' ? 'individual consumers (no explicit audience phrase found)' : 'not stated on this page'),
      model,
      wants: outcomes.slice(0, 3).map((o) => o.text),
      struggles: pains.slice(0, 3).map((p) => p.text),
      hesitations: objections.slice(0, 3).map((o) => o.marker.toLowerCase()),
      convincedBy: [...new Set(proof.map((p) => p.kind))],
      budget: pricing.observed ? `${pricing.currency || ''}${pricing.min}${pricing.max !== pricing.min ? `–${pricing.max}` : ''} ${pricing.cadence || ''}`.trim() : freePlan ? 'free plan advertised' : 'no prices on this page',
      reaches: [...channels.social.map((s) => s.platform), channels.emailCaptureForms ? 'email list' : null, channels.whatsapp ? 'WhatsApp' : null, ...channels.chatWidgets, ...(appStores.length ? ['mobile app'] : [])].filter(Boolean),
      tone: `${tone.register}; ${tone.voice}; ${tone.urgency}`,
    },
  }
}
