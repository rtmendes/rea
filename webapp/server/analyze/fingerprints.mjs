// Technology fingerprint rules. Each rule lists where its evidence can appear.
// Every match records the exact evidence string so results stay auditable.

export const CATEGORIES = {
  framework: 'JavaScript framework',
  ssg: 'Site builder / CMS',
  animation: 'Animation / scrolling',
  ui: 'UI / CSS',
  analytics: 'Analytics',
  ads: 'Ad / marketing pixel',
  tagmanager: 'Tag manager',
  chat: 'Chat / support',
  cdn: 'CDN / hosting',
  server: 'Server / backend',
  fonts: 'Web fonts',
  payments: 'Payments',
  video: 'Video',
  maps: 'Maps',
  security: 'Security / bot protection',
  forms: 'Forms / email marketing',
  ecommerce: 'E-commerce',
  misc: 'Other',
}

/**
 * Rule shape:
 *  { name, category, website, scriptSrc?: RegExp[], html?: RegExp[], inlineJs?: RegExp[],
 *    headers?: {[header]: RegExp}, cookies?: RegExp[], meta?: {[name]: RegExp}, hosts?: RegExp[],
 *    version?: { from: 'scriptSrc'|'html'|'headers', pattern: RegExp } }
 */
export const RULES = [
  // Frameworks
  { name: 'React', category: 'framework', website: 'https://react.dev/', html: [/data-reactroot|data-reactid|<div id="root"><\/div>\s*<script type="module"/i], inlineJs: [/__REACT_DEVTOOLS_GLOBAL_HOOK__|React\.createElement|react-dom/], scriptSrc: [/react(\.production|\.development)?(\.min)?\.js|\/react-dom[./]/i] },
  { name: 'Next.js', category: 'framework', website: 'https://nextjs.org/', html: [/<script id="__NEXT_DATA__"|\/_next\/static\//i], headers: { 'x-powered-by': /next\.js/i } },
  { name: 'Nuxt', category: 'framework', website: 'https://nuxt.com/', html: [/window\.__NUXT__|\/_nuxt\//i] },
  { name: 'Vue.js', category: 'framework', website: 'https://vuejs.org/', html: [/data-v-[0-9a-f]{6,}|<div id="app"[^>]*data-server-rendered/i], scriptSrc: [/\/vue(\.runtime)?(\.global)?(\.prod)?(\.min)?\.js/i] },
  { name: 'Angular', category: 'framework', website: 'https://angular.dev/', html: [/ng-version="|<app-root/i] },
  { name: 'Svelte / SvelteKit', category: 'framework', website: 'https://svelte.dev/', html: [/svelte-[0-9a-z]{4,}|__sveltekit/i] },
  { name: 'Astro', category: 'framework', website: 'https://astro.build/', html: [/<astro-island|astro-[a-z0-9]{8}/i], meta: { generator: /astro/i } },
  { name: 'Gatsby', category: 'framework', website: 'https://www.gatsbyjs.com/', html: [/id="___gatsby"/i] },
  { name: 'Remix', category: 'framework', website: 'https://remix.run/', html: [/__remixContext|__remixManifest/i] },
  { name: 'jQuery', category: 'framework', website: 'https://jquery.com/', scriptSrc: [/jquery[-.]?([0-9.]+)?(\.slim)?(\.min)?\.js/i], version: { from: 'scriptSrc', pattern: /jquery[-/]([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i } },
  { name: 'Alpine.js', category: 'framework', website: 'https://alpinejs.dev/', html: [/\sx-data=/i], scriptSrc: [/alpinejs|\/alpine(\.min)?\.js/i] },
  { name: 'HTMX', category: 'framework', website: 'https://htmx.org/', html: [/\shx-(get|post|target|swap)=/i], scriptSrc: [/htmx(\.org)?[/@]|htmx(\.min)?\.js/i] },
  { name: 'Vite', category: 'framework', website: 'https://vite.dev/', html: [/<script type="module"[^>]+src="\/src\/main\.[jt]sx?"|\/@vite\/client|\/assets\/index-[A-Za-z0-9_-]{8}\.js/i] },

  // Site builders / CMS
  { name: 'WordPress', category: 'ssg', website: 'https://wordpress.org/', html: [/\/wp-content\/|\/wp-includes\//i], meta: { generator: /wordpress/i }, version: { from: 'html', pattern: /content="WordPress ([0-9.]+)"/i } },
  { name: 'Shopify', category: 'ecommerce', website: 'https://www.shopify.com/', html: [/cdn\.shopify\.com|Shopify\.theme|shopify-section/i], headers: { 'x-shopify-stage': /.+/, 'x-shopid': /.+/ } },
  { name: 'Webflow', category: 'ssg', website: 'https://webflow.com/', html: [/data-wf-page=|data-wf-site=|assets\.website-files\.com/i], meta: { generator: /webflow/i } },
  { name: 'Wix', category: 'ssg', website: 'https://www.wix.com/', html: [/static\.wixstatic\.com|wix-code|X-Wix/i], meta: { generator: /wix\.com/i } },
  { name: 'Squarespace', category: 'ssg', website: 'https://www.squarespace.com/', html: [/static1?\.squarespace\.com|squarespace-cdn/i] },
  { name: 'Framer', category: 'ssg', website: 'https://www.framer.com/', html: [/framerusercontent\.com|data-framer-/i], meta: { generator: /framer/i } },
  { name: 'HubSpot CMS', category: 'ssg', website: 'https://www.hubspot.com/', html: [/hs-scripts\.com|hubspotusercontent|hs-sites\.com/i] },
  { name: 'GoHighLevel', category: 'ssg', website: 'https://www.gohighlevel.com/', html: [/leadconnectorhq\.com|msgsndr\.com|gohighlevel/i] },
  { name: 'Figma-exported fixed canvas', category: 'ssg', website: 'https://www.figma.com/', html: [/transform:\s*scale\(var\(--k\)\)|width:\s*1920px;height:\s*\d{4,5}px/i, /\bFigma\b/] },
  { name: 'Carrd', category: 'ssg', website: 'https://carrd.co/', html: [/carrd\.co/i] },
  { name: 'ClickFunnels', category: 'ssg', website: 'https://www.clickfunnels.com/', html: [/clickfunnels\.com|cfcdn\.com/i] },

  // Animation / scrolling
  { name: 'GSAP', category: 'animation', website: 'https://gsap.com/', scriptSrc: [/\/gsap[/@.]|gsap(\.min)?\.js/i], inlineJs: [/\bgsap\.(to|from|timeline|registerPlugin)\(/], version: { from: 'scriptSrc', pattern: /gsap[/@]([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i } },
  { name: 'GSAP ScrollTrigger', category: 'animation', website: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/', scriptSrc: [/ScrollTrigger(\.min)?\.js/i], inlineJs: [/ScrollTrigger\.(update|create|refresh)/] },
  { name: 'Lenis smooth scroll', category: 'animation', website: 'https://lenis.darkroom.engineering/', scriptSrc: [/\/lenis[@/]|lenis(\.min)?\.js/i], inlineJs: [/new Lenis\(/], version: { from: 'scriptSrc', pattern: /lenis@([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i } },
  { name: 'Locomotive Scroll', category: 'animation', website: 'https://locomotivemtl.github.io/locomotive-scroll/', scriptSrc: [/locomotive-scroll/i] },
  { name: 'AOS (Animate On Scroll)', category: 'animation', website: 'https://michalsnik.github.io/aos/', scriptSrc: [/\/aos(\.min)?\.js|aos@/i], html: [/\sdata-aos=/i] },
  { name: 'Framer Motion', category: 'animation', website: 'https://motion.dev/', inlineJs: [/framer-motion/] },
  { name: 'Lottie', category: 'animation', website: 'https://airbnb.io/lottie/', scriptSrc: [/lottie(-player|-web)?(\.min)?\.js|lottiefiles/i] },
  { name: 'Swiper', category: 'ui', website: 'https://swiperjs.com/', scriptSrc: [/swiper(-bundle)?(\.min)?\.js|swiper@/i], html: [/class="[^"]*swiper[^"]*"/i] },
  { name: 'Three.js', category: 'animation', website: 'https://threejs.org/', scriptSrc: [/three(\.module)?(\.min)?\.js|three@/i] },

  // UI / CSS
  { name: 'Tailwind CSS', category: 'ui', website: 'https://tailwindcss.com/', html: [/class="[^"]*\b(flex|grid) [^"]*\b(items-center|justify-between|px-\d|py-\d|text-\w+-\d{3})\b/, /cdn\.tailwindcss\.com/i] },
  { name: 'Bootstrap', category: 'ui', website: 'https://getbootstrap.com/', scriptSrc: [/bootstrap(\.bundle)?(\.min)?\.js/i], html: [/bootstrap(\.min)?\.css|class="[^"]*\b(container|row|col-(xs|sm|md|lg)-\d+)\b/] },
  { name: 'Font Awesome', category: 'ui', website: 'https://fontawesome.com/', html: [/font-?awesome|kit\.fontawesome\.com/i] },
  { name: 'Material Icons', category: 'ui', website: 'https://fonts.google.com/icons', html: [/fonts\.googleapis\.com\/icon\?family=Material|Material\+Symbols/i] },

  // Fonts
  { name: 'Google Fonts', category: 'fonts', website: 'https://fonts.google.com/', html: [/fonts\.googleapis\.com\/css|fonts\.gstatic\.com/i] },
  { name: 'Adobe Fonts (Typekit)', category: 'fonts', website: 'https://fonts.adobe.com/', html: [/use\.typekit\.net/i] },
  { name: 'Self-hosted @font-face', category: 'fonts', website: 'https://developer.mozilla.org/docs/Web/CSS/@font-face', html: [/@font-face\s*\{[^}]*src:\s*url\((['"]?)(?!https?:\/\/fonts\.)/i] },

  // Tag managers / analytics
  { name: 'Google Tag Manager', category: 'tagmanager', website: 'https://tagmanager.google.com/', html: [/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/], version: { from: 'html', pattern: /(GTM-[A-Z0-9]{4,})/ } },
  { name: 'Google Analytics 4 / gtag', category: 'analytics', website: 'https://analytics.google.com/', html: [/googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]|G-[A-Z0-9]{8,}/], version: { from: 'html', pattern: /(G-[A-Z0-9]{8,})/ } },
  { name: 'Universal Analytics (legacy)', category: 'analytics', website: 'https://support.google.com/analytics/answer/11583528', html: [/google-analytics\.com\/analytics\.js|\bUA-\d{4,}-\d+\b/] },
  { name: 'Meta Pixel', category: 'ads', website: 'https://www.facebook.com/business/tools/meta-pixel', html: [/connect\.facebook\.net\/[a-z_]+\/fbevents\.js|fbq\(\s*['"]init['"]/i], version: { from: 'html', pattern: /fbq\(\s*['"]init['"]\s*,\s*['"](\d{6,})['"]/ } },
  { name: 'TikTok Pixel', category: 'ads', website: 'https://ads.tiktok.com/', html: [/analytics\.tiktok\.com|ttq\.load\(/i] },
  { name: 'Reddit Pixel', category: 'ads', website: 'https://advertising.reddithelp.com/', html: [/redditstatic\.com\/ads\/pixel\.js|rdt\(\s*['"]init['"]/i], version: { from: 'html', pattern: /rdt\(\s*['"]init['"]\s*,\s*['"]([a-z0-9_]+)['"]/i } },
  { name: 'OpenAI Pixel (oaiq)', category: 'ads', website: 'https://openai.com/', html: [/bzrcdn\.openai\.com\/sdk\/oaiq|oaiq\(\s*['"]init['"]/i], version: { from: 'html', pattern: /pixelId:\s*['"]([A-Za-z0-9]+)['"]/ } },
  { name: 'LinkedIn Insight Tag', category: 'ads', website: 'https://business.linkedin.com/marketing-solutions/insight-tag', html: [/snap\.licdn\.com|_linkedin_partner_id/i] },
  { name: 'Pinterest Tag', category: 'ads', website: 'https://ads.pinterest.com/', html: [/pintrk\(|s\.pinimg\.com\/ct/i] },
  { name: 'Snap Pixel', category: 'ads', website: 'https://forbusiness.snapchat.com/', html: [/sc-static\.net\/scevent|snaptr\(/i] },
  { name: 'Twitter/X Pixel', category: 'ads', website: 'https://ads.twitter.com/', html: [/static\.ads-twitter\.com|twq\(/i] },
  { name: 'Google Ads conversion', category: 'ads', website: 'https://ads.google.com/', html: [/AW-\d{6,}|googleadservices\.com/] },
  { name: 'Microsoft Clarity', category: 'analytics', website: 'https://clarity.microsoft.com/', html: [/clarity\.ms\/tag/i] },
  { name: 'Hotjar', category: 'analytics', website: 'https://www.hotjar.com/', html: [/static\.hotjar\.com|hjid:/i] },
  { name: 'Mixpanel', category: 'analytics', website: 'https://mixpanel.com/', html: [/cdn\.mxpnl\.com|mixpanel\.init/i] },
  { name: 'Segment', category: 'analytics', website: 'https://segment.com/', html: [/cdn\.segment\.com\/analytics\.js/i] },
  { name: 'Amplitude', category: 'analytics', website: 'https://amplitude.com/', html: [/cdn\.amplitude\.com/i] },
  { name: 'PostHog', category: 'analytics', website: 'https://posthog.com/', html: [/posthog\.init|i\.posthog\.com|app\.posthog\.com/i] },
  { name: 'Plausible', category: 'analytics', website: 'https://plausible.io/', scriptSrc: [/plausible\.io\/js/i] },
  { name: 'Fathom', category: 'analytics', website: 'https://usefathom.com/', scriptSrc: [/cdn\.usefathom\.com/i] },
  { name: 'Vercel Analytics', category: 'analytics', website: 'https://vercel.com/analytics', html: [/\/_vercel\/insights|va\.vercel-scripts\.com/i] },
  { name: 'Cloudflare Web Analytics', category: 'analytics', website: 'https://www.cloudflare.com/web-analytics/', scriptSrc: [/static\.cloudflareinsights\.com/i] },

  // Chat / support
  { name: 'Intercom', category: 'chat', website: 'https://www.intercom.com/', html: [/widget\.intercom\.io|intercomSettings/i] },
  { name: 'Crisp', category: 'chat', website: 'https://crisp.chat/', html: [/client\.crisp\.chat|\$crisp/i] },
  { name: 'Drift', category: 'chat', website: 'https://www.drift.com/', html: [/js\.driftt\.com/i] },
  { name: 'Tawk.to', category: 'chat', website: 'https://www.tawk.to/', html: [/embed\.tawk\.to/i] },
  { name: 'Zendesk', category: 'chat', website: 'https://www.zendesk.com/', html: [/static\.zdassets\.com|zendesk\.com\/embeddable/i] },
  { name: 'HubSpot chat / tracking', category: 'chat', website: 'https://www.hubspot.com/', scriptSrc: [/js(-\w+)?\.hs-scripts\.com|js\.hsforms\.net/i] },
  { name: 'Tidio', category: 'chat', website: 'https://www.tidio.com/', scriptSrc: [/code\.tidio\.co/i] },
  { name: 'WhatsApp click-to-chat', category: 'chat', website: 'https://faq.whatsapp.com/5913398998672934', html: [/wa\.me\/\d+|api\.whatsapp\.com\/send/i] },
  { name: 'Custom embedded AI chat widget (DVChatConfig)', category: 'chat', website: 'https://chat.dvshipping.com/widget.js', html: [/window\.DVChatConfig|chat\.dvshipping\.com\/widget\.js/i] },

  // Payments / forms / email
  { name: 'Stripe', category: 'payments', website: 'https://stripe.com/', html: [/js\.stripe\.com|buy\.stripe\.com|checkout\.stripe\.com/i] },
  { name: 'PayPal', category: 'payments', website: 'https://www.paypal.com/', html: [/paypal\.com\/sdk\/js|paypalobjects\.com/i] },
  { name: 'Lemon Squeezy', category: 'payments', website: 'https://www.lemonsqueezy.com/', html: [/lemonsqueezy\.com/i] },
  { name: 'Paddle', category: 'payments', website: 'https://www.paddle.com/', html: [/cdn\.paddle\.com/i] },
  { name: 'Typeform', category: 'forms', website: 'https://www.typeform.com/', html: [/embed\.typeform\.com|typeform\.com\/to\//i] },
  { name: 'Mailchimp', category: 'forms', website: 'https://mailchimp.com/', html: [/list-manage\.com|chimpstatic\.com/i] },
  { name: 'ConvertKit (Kit)', category: 'forms', website: 'https://kit.com/', html: [/convertkit\.com|kit\.com\/forms/i] },
  { name: 'Klaviyo', category: 'forms', website: 'https://www.klaviyo.com/', html: [/static\.klaviyo\.com|klaviyo\.js/i] },
  { name: 'Calendly', category: 'forms', website: 'https://calendly.com/', html: [/assets\.calendly\.com|calendly\.com\//i] },

  // Video / maps
  { name: 'YouTube embed', category: 'video', website: 'https://www.youtube.com/', html: [/youtube(-nocookie)?\.com\/embed\//i] },
  { name: 'Vimeo embed', category: 'video', website: 'https://vimeo.com/', html: [/player\.vimeo\.com\/video\//i] },
  { name: 'Wistia', category: 'video', website: 'https://wistia.com/', html: [/fast\.wistia\.(com|net)/i] },
  { name: 'Loom', category: 'video', website: 'https://www.loom.com/', html: [/loom\.com\/embed\//i] },
  { name: 'Google Maps', category: 'maps', website: 'https://developers.google.com/maps', html: [/maps\.googleapis\.com\/maps\/api|google\.com\/maps\/embed/i] },
  { name: 'Mapbox', category: 'maps', website: 'https://www.mapbox.com/', html: [/api\.mapbox\.com/i] },

  // CDN / hosting / server (headers)
  { name: 'Cloudflare', category: 'cdn', website: 'https://www.cloudflare.com/', headers: { server: /cloudflare/i, 'cf-ray': /.+/ } },
  { name: 'Vercel', category: 'cdn', website: 'https://vercel.com/', headers: { server: /vercel/i, 'x-vercel-id': /.+/ } },
  { name: 'Netlify', category: 'cdn', website: 'https://www.netlify.com/', headers: { server: /netlify/i, 'x-nf-request-id': /.+/ } },
  { name: 'Amazon CloudFront', category: 'cdn', website: 'https://aws.amazon.com/cloudfront/', headers: { via: /cloudfront/i, 'x-amz-cf-id': /.+/ } },
  { name: 'Fastly', category: 'cdn', website: 'https://www.fastly.com/', headers: { 'x-served-by': /cache-/i, via: /varnish/i } },
  { name: 'Akamai', category: 'cdn', website: 'https://www.akamai.com/', headers: { server: /akamai/i, 'x-akamai-transformed': /.+/ } },
  { name: 'GitHub Pages', category: 'cdn', website: 'https://pages.github.com/', headers: { server: /github\.com/i } },
  { name: 'Firebase Hosting', category: 'cdn', website: 'https://firebase.google.com/products/hosting', headers: { 'x-served-by': /firebase/i } },
  { name: 'cdnjs (Cloudflare)', category: 'cdn', website: 'https://cdnjs.com/', scriptSrc: [/cdnjs\.cloudflare\.com/i] },
  { name: 'unpkg', category: 'cdn', website: 'https://unpkg.com/', scriptSrc: [/unpkg\.com/i] },
  { name: 'jsDelivr', category: 'cdn', website: 'https://www.jsdelivr.com/', scriptSrc: [/cdn\.jsdelivr\.net/i] },
  { name: 'nginx', category: 'server', website: 'https://nginx.org/', headers: { server: /nginx/i }, version: { from: 'headers', pattern: /nginx\/([0-9.]+)/i } },
  { name: 'Apache HTTP Server', category: 'server', website: 'https://httpd.apache.org/', headers: { server: /apache/i } },
  { name: 'LiteSpeed', category: 'server', website: 'https://www.litespeedtech.com/', headers: { server: /litespeed/i } },
  { name: 'Microsoft IIS', category: 'server', website: 'https://www.iis.net/', headers: { server: /microsoft-iis/i } },
  { name: 'Caddy', category: 'server', website: 'https://caddyserver.com/', headers: { server: /caddy/i } },
  { name: 'Express (Node.js)', category: 'server', website: 'https://expressjs.com/', headers: { 'x-powered-by': /express/i } },
  { name: 'PHP', category: 'server', website: 'https://www.php.net/', headers: { 'x-powered-by': /php/i }, cookies: [/^PHPSESSID=/i], html: [/\.php(\?|["'])/i] },
  { name: 'ASP.NET', category: 'server', website: 'https://dotnet.microsoft.com/apps/aspnet', headers: { 'x-powered-by': /asp\.net/i, 'x-aspnet-version': /.+/ }, cookies: [/^ASP\.NET_SessionId=/i] },
  { name: 'Laravel', category: 'server', website: 'https://laravel.com/', cookies: [/^laravel_session=|^XSRF-TOKEN=/i] },
  { name: 'Django', category: 'server', website: 'https://www.djangoproject.com/', cookies: [/^csrftoken=|^sessionid=/i] },
  { name: 'Ruby on Rails', category: 'server', website: 'https://rubyonrails.org/', cookies: [/_session=/i], html: [/csrf-param|data-turbo/i] },
  { name: 'Cloudflare Turnstile / challenge', category: 'security', website: 'https://www.cloudflare.com/products/turnstile/', html: [/challenges\.cloudflare\.com/i] },
  { name: 'Google reCAPTCHA', category: 'security', website: 'https://www.google.com/recaptcha/', html: [/google\.com\/recaptcha|grecaptcha/i] },
  { name: 'hCaptcha', category: 'security', website: 'https://www.hcaptcha.com/', html: [/hcaptcha\.com/i] },
  { name: 'Supabase', category: 'server', website: 'https://supabase.com/', html: [/\.supabase\.co|supabase\.[a-z.]+\/storage\/v1/i] },
  { name: 'Firebase', category: 'server', website: 'https://firebase.google.com/', html: [/firebaseapp\.com|firebaseio\.com|gstatic\.com\/firebasejs/i] },
  { name: 'Sentry', category: 'misc', website: 'https://sentry.io/', html: [/browser\.sentry-cdn\.com|Sentry\.init/i] },
  { name: 'Cookie consent banner', category: 'misc', website: 'https://gdpr.eu/cookies/', html: [/cookieconsent|cookiebot|onetrust|iubenda|cookie-law-info|termly/i] },
  { name: 'PWA manifest', category: 'misc', website: 'https://developer.mozilla.org/docs/Web/Manifest', html: [/<link[^>]+rel="manifest"/i] },
  { name: 'Open Graph metadata', category: 'misc', website: 'https://ogp.me/', html: [/<meta property="og:/i] },
  { name: 'JSON-LD structured data', category: 'misc', website: 'https://json-ld.org/', html: [/<script[^>]+type="application\/ld\+json"/i] },
  { name: 'hreflang multi-language', category: 'misc', website: 'https://developers.google.com/search/docs/specialty/international/localized-versions', html: [/<link[^>]+hreflang=/i] },
]

function test(patterns, text) {
  if (!patterns || !text) return null
  for (const re of patterns) {
    const m = re.exec(text)
    if (m) return m[0].slice(0, 160)
  }
  return null
}

/**
 * @param {{html: string, scriptSrcs: string[], inlineJs: string, headers: Record<string,string>, cookies: string[], metas: Record<string,string>}} input
 */
export function detectTechnologies(input) {
  const { html = '', scriptSrcs = [], inlineJs = '', headers = {}, cookies = [], metas = {} } = input
  const joinedSrcs = scriptSrcs.join('\n')
  const results = []
  for (const rule of RULES) {
    const evidence = []
    const srcHit = test(rule.scriptSrc, joinedSrcs)
    if (srcHit) evidence.push({ where: 'script src', match: scriptSrcs.find((s) => rule.scriptSrc.some((re) => re.test(s))) || srcHit })
    const htmlHit = test(rule.html, html)
    if (htmlHit) evidence.push({ where: 'html', match: htmlHit })
    const jsHit = test(rule.inlineJs, inlineJs)
    if (jsHit) evidence.push({ where: 'inline script', match: jsHit })
    if (rule.headers) {
      for (const [header, re] of Object.entries(rule.headers)) {
        const value = headers[header.toLowerCase()]
        if (value && re.test(value)) evidence.push({ where: `response header ${header}`, match: value.slice(0, 160) })
      }
    }
    if (rule.cookies) {
      for (const cookie of cookies) {
        if (rule.cookies.some((re) => re.test(cookie))) evidence.push({ where: 'set-cookie', match: cookie.split(';')[0].replace(/=.*/, '=…') })
      }
    }
    if (rule.meta) {
      for (const [name, re] of Object.entries(rule.meta)) {
        const value = metas[name]
        if (value && re.test(value)) evidence.push({ where: `meta ${name}`, match: value.slice(0, 160) })
      }
    }
    if (!evidence.length) continue
    let version = null
    if (rule.version) {
      const source = rule.version.from === 'scriptSrc' ? joinedSrcs : rule.version.from === 'headers' ? Object.values(headers).join('\n') : html
      const m = rule.version.pattern.exec(source)
      if (m) version = m[1]
    }
    results.push({
      name: rule.name,
      category: rule.category,
      categoryLabel: CATEGORIES[rule.category] || rule.category,
      website: rule.website,
      version,
      confidence: evidence.length >= 2 ? 'high' : 'medium',
      evidence,
    })
  }
  return results
}
