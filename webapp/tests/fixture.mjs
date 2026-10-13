// Synthetic page that exercises the detectors without shipping third-party HTML.
export const FIXTURE_URL = 'https://example-target.test/'
export const FIXTURE_HEADERS = {
  'content-type': 'text/html; charset=UTF-8',
  server: 'nginx',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cache-control': 'public, max-age=300',
  'set-cookie': 'PHPSESSID=abc; path=/; secure; HttpOnly; SameSite=Lax',
}
export const FIXTURE_HTML = `<!doctype html>
<html lang="en"><head>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;})(window,document,'script','dataLayer','GTM-TEST123');</script>
<script>rdt('init','a2_testpixel');rdt('track','PageVisit');</script>
<script>oaiq("init",{pixelId:"TestPixelId123",debug:true});</script>
<title>Example SaaS</title>
<meta name="description" content="Example description for a pricing landing page.">
<meta property="og:title" content="Example SaaS">
<meta name="theme-color" content="#09101A">
<link rel="canonical" href="https://example-target.test/">
<link rel="alternate" hreflang="en" href="https://example-target.test/">
<link rel="alternate" hreflang="pt-BR" href="https://example-target.test/?lang=pt">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  html,body{background:#09101A}
  @font-face{font-family:'Brand';src:url('assets/fonts/Brand.woff2') format('woff2');font-weight:700}
  :root{--k:calc(min(100vw, 1920px) / 1920px);--accent:#00b3dd}
  .stage{position:relative;width:1920px;height:10202px;background:#09101A;transform:scale(var(--k));transform-origin:top left}
  .t{color:#ffffff;font-size:20px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:500}
  .h{font-size:64px;font-weight:700;font-family:'Brand',sans-serif;color:#fff}
  .btn{background:#00b3dd;border-radius:25px;box-shadow:0 8px 26px rgba(0,0,0,.34);transition:all .2s cubic-bezier(.2,.8,.2,1)}
  .muted{color:rgba(255,255,255,.7);font-size:16px}
  @media (max-width:860px){.stage{display:none}}
  @media (prefers-reduced-motion: reduce){.t{transition:none}}
</style>
</head><body>
<div class="stage">
<header data-sec="Navbar"><nav><a href="#precos">Pricing</a><a href="#faq">FAQ</a><a href="https://app.example-target.test/login">Start now</a></nav></header>
<section data-sec="Hero"><h1 class="h">Intelligence for sellers</h1><p class="t">Hero body copy with enough words to count as content for the analyzer.</p><a class="btn" href="https://app.example-target.test/login">Start now</a><a href="#how">See how it works</a></section>
<section data-sec="pricing-section" id="precos"><h2>Pricing</h2><div>PRO US$ 39 /mo</div><div>GROWTH US$ 97 /mo</div><div>AGENCY US$ 249 /mo</div><a href="https://app.example-target.test/login">Start now</a></section>
<section data-sec="Question" id="faq"><h2>Frequently Asked Questions</h2><div aria-expanded="false">Can I cancel any time?</div></section>
<footer data-sec="Footer"><a href="mailto:contact@example-target.test">contact@example-target.test</a><a href="https://instagram.com/example">Instagram</a></footer>
</div>
<img src="assets/logo.svg" alt="logo"><img src="assets/bg.webp">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js"></script>
<script src="https://chat.vendor-widget.test/widget.js" defer></script>
<script>window.__faq=["a","b","c"];window.__plans=[["x","y"],["z"]];</script>
<script>window.WidgetConfig = { title: 'Bot', brandColor: '#00b3dd', endpoint: 'https://chat.vendor-widget.test/chat.php' };</script>
<script>
/* comentário do desenvolvedor: o toggle mensal/anual não funcionava em inglês, então agora cada link tem um id */
window.addEventListener('load', function () {
  var toggle = document.getElementById('dvo-toggle');
  toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-checked', 'false');
  toggle.addEventListener('click', function(){});
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.Lenis) { var lenis = new Lenis({ duration: 1.05 }); }
  gsap.registerPlugin(ScrollTrigger); gsap.to('.hero', { yPercent: 6, scrollTrigger: { trigger: '.hero' } });
  new IntersectionObserver(function(){}).observe(document.body);
});
</script>
</body></html>`
