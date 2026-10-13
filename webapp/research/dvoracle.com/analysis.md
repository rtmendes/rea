# Reverse-engineering report: https://dvoracle.com/

Generated 2026-10-13T10:58:15.053Z in 1651 ms. HTTP 200, 137286 bytes, TTFB 475 ms.

## Summary

| Field | Value |
| --- | --- |
| Title | dvoracle.com |
| Description | DV Oracle is the artificial intelligence for people who sell online: it finds the ads that are already performing and analyzes any competing store, all in one place. |
| Site type | landing page |
| Language | en |
| Headline | Intelligence for your ecommerce |
| Technologies | 15 |
| Third-party hosts | 11 |
| Sections | 23 |
| Forms | 0 |
| Word count | 1467 |
| Prices found | 3 |
| Color mode | dark |
| Primary fonts | Prometo, Plus Jakarta Sans, Inter, Poppins, Space Grotesk |
| Security header score | 33/100 |
| Developer comment language | portuguese (0.5) |

## Technology stack

| Technology | Category | Version / ID | Confidence | Evidence | Reference |
| --- | --- | --- | --- | --- | --- |
| Figma-exported fixed canvas | Site builder / CMS |  | medium | html: `width:1920px;height:10202px` | https://www.figma.com/ |
| GSAP | Animation / scrolling | 3.12.5 | high | script src: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js`; inline script: `gsap.registerPlugin(` | https://gsap.com/ |
| GSAP ScrollTrigger | Animation / scrolling |  | high | script src: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js`; inline script: `ScrollTrigger.update` | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ |
| Lenis smooth scroll | Animation / scrolling | 1.1.14 | high | script src: `https://unpkg.com/lenis@1.1.14/dist/lenis.min.js`; inline script: `new Lenis(` | https://lenis.darkroom.engineering/ |
| Google Fonts | Web fonts |  | medium | html: `fonts.gstatic.com` | https://fonts.google.com/ |
| Self-hosted @font-face | Web fonts |  | medium | html: `@font-face{font-family:'Prometo';src:url('` | https://developer.mozilla.org/docs/Web/CSS/@font-face |
| Google Tag Manager | Tag manager | GTM-N7TLPBPF | medium | html: `googletagmanager.com/gtm.js` | https://tagmanager.google.com/ |
| Reddit Pixel | Ad / marketing pixel | a2_jpe9ofbt2021 | medium | html: `redditstatic.com/ads/pixel.js` | https://advertising.reddithelp.com/ |
| OpenAI Pixel (oaiq) | Ad / marketing pixel | Jf2xESMk6VRh9ovoBDsAv5 | medium | html: `bzrcdn.openai.com/sdk/oaiq` | https://openai.com/ |
| Custom embedded AI chat widget (DVChatConfig) | Chat / support |  | medium | html: `window.DVChatConfig` | https://chat.dvshipping.com/widget.js |
| cdnjs (Cloudflare) | CDN / hosting |  | medium | script src: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` | https://cdnjs.com/ |
| unpkg | CDN / hosting |  | medium | script src: `https://unpkg.com/lenis@1.1.14/dist/lenis.min.js` | https://unpkg.com/ |
| nginx | Server / backend |  | medium | response header server: `nginx` | https://nginx.org/ |
| Open Graph metadata | Other |  | medium | html: `<meta property="og:` | https://ogp.me/ |
| hreflang multi-language | Other |  | medium | html: `<link rel="alternate" hreflang=` | https://developers.google.com/search/docs/specialty/international/localized-versions |

## Design system

Mode: **dark**. Background #09101a, foreground #ffffff, accent #00b3dd (contrast bg/fg 19.08).

| Color | Role | Uses | Alphas |
| --- | --- | --- | --- |
| #ffffff | text (light) | 140 | 0, 0.082, 0.09, 0.1, 0.12, 0.14, 0.16, 0.55, 0.7, 0.72, 0.76, 0.82, 1 |
| #00b3dd | accent / surface | 52 | 0, 0.18, 0.22, 0.24, 0.28, 0.3, 0.31, 0.32, 0.35, 0.38, 0.4, 0.45, 0.5, 0.558, 0.58, 0.62, 0.684, 0.76, 0.9, 1 |
| #000000 | background (dark) | 48 | 0, 0.05, 0.2, 0.3, 0.34, 0.38, 1 |
| #181818 | overlay / border | 22 | 0.09 |
| #00b7e1 | overlay / border | 18 | 0.08, 0.26 |
| #1a1a1a | text (dark) | 12 | 1 |
| #09101a | background (dark) | 8 | 0.34, 0.42, 0.62, 0.86, 0.88, 1 |
| #888888 | text (accent) | 6 | 1 |
| #eef3f8 | text (light) | 5 | 0.62, 0.7, 1 |
| #06222c | text (dark) | 3 | 1 |
| #1f1f1f | background (dark) | 3 | 1 |
| #f8f9fb | text (light) | 3 | 0.314, 0.502 |
| #064456 | background (dark) | 2 | 0.92 |
| #0c121c | background (dark) | 2 | 0, 0.72 |
| #d9d9d9 | accent / surface | 2 | 1 |
| #111a26 | background (dark) | 1 | 1 |

### Typography

| Family | Uses | Fallbacks |
| --- | --- | --- |
| Plus Jakarta Sans | 54 | -apple-system, BlinkMacSystemFont, sans-serif |
| Prometo | 40 | Space Grotesk, sans-serif |
| Inter | 33 | sans-serif |
| Poppins | 5 | sans-serif |

Google Fonts: Plus Jakarta Sans (wght@400;500;600;700;800), Inter (wght@400;500;600;700), Poppins (wght@400;500;600), Space Grotesk (wght@400;500;600;700).
Self-hosted @font-face: Prometo 400 → assets/fonts/Prometo-Regular.woff2; Prometo 700 → assets/fonts/Prometo-Bold.woff2.
Type scale (px → uses): 11→2, 12→3, 13→3, 14→16, 15→6, 16→25, 19→2, 20→30, 21→1, 22→2, 24→21, 30→1, 32→16, 34→2, 40→10, 48→2, 64→11, 96→1.
Weights: 400×75, 500×38, 600×1, 700×19.

### Shape, motion, layout

- Border radius: 25.0px 0.0px 25.0px 0.0px, 25.0px, 50%, 999px, 15.0px 0.0px 15.0px 0.0px, 14px, 20.0px, 10.0px, 999.0px, 100.0px, 10px, 12px
- Shadows: 0 8px 26px rgba(0,0,0,.34) | 0 0 0 1px rgba(0,179,221,.35) | 0 0 0 rgba(0,0,0,0) | 0 14px 44px rgba(0,0,0,.38) | 0 0 0 1px rgba(0,179,221,.28),
                     0 0 18px rgba(0,179,221,.45),
                     0 0 44px rgba(0,1 | 0 0 0 1px rgba(0,179,221,.45),
                            0 0 26px rgba(0,179,221,.62),
                            0 0 | 0 0 0 1px rgba(0,179,221,.24),
                       0 0 16px rgba(0,179,221,.38),
                       0 0 40px rgba | 0 0 0 1px rgba(0,179,221,.40),
                       0 0 26px rgba(0,179,221,.58),
                       0 0 60px rgba | none !important
- Gradients: 12
- Easings: linear, ease, ease-in-out
- Breakpoints: 860px
- Keyframes: m-vento, dvo-vento, dvo-zhou-pulso
- CSS variables: 7; reduced-motion: true; color-scheme: false

## Structure

Landmarks: header×1, nav×2, footer×1, section×11, role=switch×1. DOM: 673 elements, depth 13.

### Heading outline

- # Intelligence for your ecommerce
- ### Two fronts, one intelligence
- ## What DV Oracle does
- ### An AI shows what already works before you invest
- ### Access any competitor in one click
- ### Everything in one place, on the same account
- ## Our Products
- ### Ad Library
- ### Chrome Extension
- ## Proof
- ### Nothing here is static.
- ## How It Works
- ### Open DV Oracle
- ### Filter or analyze
- ### Decide on real data
- ## Why DV Oracle
- ## Frequently Asked Questions
- ## Unlock the full intelligence
- ### PRO
- ### GROWTH
- ### AGENCY
- ## Get access to DV Oracle
- #### Product
- #### Support
- #### DV Shipping

### Sections

| Label | Source | Heading | Text chars | Links | Buttons | Images |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | data attribute | Intelligence for your ecommerce DV Oracle is the artificial intelligence for people who sell online: it finds the ads that are already perfo | 238 | 0 | 0 | 0 |
| About Us | data attribute | Two fronts, one intelligence DV Oracle works on two fronts: the Ad Library, which shows what is already performing before you invest, and th | 303 | 0 | 0 | 1 |
| Achievement | data attribute | 50,000 ads monitored 3,000 stores analyzed ∞ Continuous updates 24/7 AI running 24/7 Data working for you, around the clock. | 124 | 0 | 0 | 0 |
| Best featured | data attribute | What DV Oracle does Two tools, one intelligence. An AI shows what already works before you invest Our AI scans thousands of live ads and sep | 534 | 0 | 0 | 0 |
| Best featured | data attribute | Our Products Two tools that work together so you sell more. Thousands of live ads, filtered by an AI that separates what is actually perform | 365 | 0 | 0 | 0 |
| About Us | data attribute | Proof What you can expect from DV Oracle. A continuously updated ad catalog, with product and creative side by side. One-click extension ins | 460 | 0 | 0 | 4 |
| Best featured | data attribute | How It Works Three steps to get started. Open DV Oracle Through your dashboard or by installing the Chrome extension. Filter or analyze Filt | 350 | 0 | 0 | 3 |
| About Us | data attribute | Why DV Oracle What makes the difference. All in one system Ad library and extension, with no separate tools to open. AI, not guesswork Every | 391 | 0 | 0 | 4 |
| Footer | data attribute | Intelligence for people who sell online Product Ad Library Chrome Extension Pricing Support FAQ Contact Terms of Use DV Shipping contact@dvo | 149 | 2 | 0 | 4 |
| Question | data attribute | Frequently Asked Questions Do I need to be a DV Shipping client to use DV Oracle? No. DV Shipping clients get free access to the Ad Library. | 316 | 0 | 0 | 4 |
| pricing-section | data attribute | Unlock the full intelligence Unlimited ad library, plus the AI that analyzes any competing store. Monthly Yearly SAVE 20% PRO Ideal for thos | 788 | 0 | 0 | 14 |
| Group 2 | data attribute | Instant Access Get access to DV Oracle Put the artificial intelligence of online sellers to work analyzing your competitors and finding prof | 186 | 0 | 0 | 1 |
| Navbar | data attribute | Home Library Extension Pricing FAQ | 34 | 3 | 0 | 4 |
| idioma | semantic tag |  | 0 | 3 | 0 | 3 |
| header | semantic tag |  | 0 | 3 | 0 | 4 |
| idioma | semantic tag |  | 0 | 3 | 0 | 3 |
| section | semantic tag | Intelligence for your ecommerce | 238 | 2 | 0 | 0 |
| section | semantic tag | Data working for you, around the clock. 50,000ads monitored 3,000stores analyzed ∞Continuous updates 24/7AI running 24/7 | 120 | 0 | 0 | 0 |
| section | semantic tag | Two fronts, one intelligence | 303 | 0 | 0 | 1 |
| section | semantic tag | What DV Oracle does | 534 | 0 | 0 | 0 |
| section | semantic tag | Our Products | 365 | 0 | 0 | 0 |
| section | semantic tag | Proof | 460 | 0 | 0 | 1 |
| section | semantic tag | How It Works | 347 | 0 | 0 | 0 |
| section | semantic tag | Why DV Oracle | 387 | 1 | 0 | 1 |
| m-faq | semantic tag | Frequently Asked Questions | 595 | 0 | 0 | 0 |
| m-precos | semantic tag | Unlock the full intelligence | 850 | 3 | 0 | 0 |
| section | semantic tag | Get access to DV Oracle | 186 | 1 | 0 | 1 |
| footer | semantic tag | Intelligence for people who sell online Product Ad Library Chrome Extension Pricing Support FAQ Contact Terms of Use DV Shipping contact@dvo | 149 | 9 | 0 | 3 |

### Calls to action

| Text | Occurrences | Kind | Targets |
| --- | --- | --- | --- |
| DV Shipping | 4 | external | https://dvshipping.com |
| Start now | 3 | external | https://app.dvoracle.com/login |
| Instagram | 2 | external | https://instagram.com/dv.shipping |
| Get access to DV Oracle | 2 | external | https://app.dvoracle.com/login |
| See how it works | 1 | anchor | #m-escuro |
| Ad Library | 1 | anchor | #m-precos |
| Chrome Extension | 1 | anchor | #m-precos |
| Pricing | 1 | anchor | #m-precos |
| FAQ | 1 | anchor | #m-faq |
| Contact | 1 | mailto | mailto:contact@dvoracle.com |
| Terms of Use | 1 | internal | /terms/ |
| contact@dvoracle.com | 1 | mailto | mailto:contact@dvoracle.com |

### Forms

_none observed_

Images: 15 (5 with alt, 0 lazy, formats {"webp":5,"svg":10}), inline SVG 38, iframes 0, video 0.

## Content inventory

- Canonical: https://dvoracle.com/; robots meta: none; generator: none
- Open Graph: {"title":"dvoracle.com","description":"DV Oracle is the artificial intelligence for people who sell online: it finds the ads that are already performing and analyzes any competing store, all in one place.","type":"website","url":"https://dvoracle.com/","image":null,"locale":"en","siteName":null}
- hreflang: en → https://dvoracle.com/, pt-BR → https://dvoracle.com/?lang=pt, es → https://dvoracle.com/?lang=es, x-default → https://dvoracle.com/
- JSON-LD: none
- Emails: contact@dvoracle.com; phones: none
- Social: https://instagram.com/dv.shipping
- External link hosts: app.dvoracle.com×5, dvshipping.com×4, instagram.com×2, ×2

### Headlines

_none observed_

### Prices

| Amount | Context |
| --- | --- |
| US$ 39/mo | arly SAVE 20% PRO Ideal for those starting to validate ads. US$ 39/mo Unlimited cached ad library10,000 collection credits / mont |
| US$ 97/mo | pular GROWTH The best-selling plan for operations at scale. US$ 97/mo Everything in PRO30,000 collection credits / month2 seats, |
| US$ 249/mo | Y Perfect for large agencies and multiple ecommerce brands. US$ 249/mo Everything in GROWTH80,000 collection credits / month5 seat |
| US$ 374.40 | inline script literal |
| US$ 931.20 | inline script literal |
| US$ 2,390.40 | inline script literal |
| US$ 39 | inline script literal |
| US$ 31.20 | inline script literal |
| US$ 97 | inline script literal |
| US$ 77.60 | inline script literal |
| US$ 249 | inline script literal |
| US$ 199.20 | inline script literal |
| R$ 97 | inline script literal |

### Developer comments (sample)

5 HTML + 42 JS comments; language hint portuguese.

- Reddit Pixel
- DO NOT MODIFY UNLESS TO REPLACE A USER IDENTIFIER
- OpenAI Pixel
- o Safari do iPhone usa o apple-touch-icon; sem ele a guia fica sem icone
- dv: hide stray GTM text
- seletor mensal/anual do celular
- fator de escala da prancha. Nao da pra ler o --k do CSS: ele guarda uma EXPRESSAO calc(), e getComputedStyle devolve o texto cru. Calculo aqui.
- ========================================================== 1) Seletor Mensal / Anual O mock do Figma mostra a bolinha a direita mas com "Mensal" em destaque e os precos mensais — comeco em Mensal, que
- O "/mes" fica numa coluna fixa no Figma, calibrada para "R$ 97". Com os valores reais em dolar (mais largos, e mais largos ainda no anual) ele cobria os digitos. Recoloco logo apos o texto — e como a 
- caixa encolhe ate o texto
- posicoes da bolinha dentro do trilho, medidas do Figma: trilho 52px de largura, bolinha 24px, folga de 2px de cada lado
- agora sim, com a largura nova

## Scripts and data

| Script | Host | Party | Library | Version | Loading | SRI |
| --- | --- | --- | --- | --- | --- | --- |
| https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js | cdnjs.cloudflare.com | third | GSAP | 3.12.5 | defer | no |
| https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js | cdnjs.cloudflare.com | third | GSAP | 3.12.5 | defer | no |
| https://unpkg.com/lenis@1.1.14/dist/lenis.min.js | unpkg.com | third | Lenis | 1.1.14 | defer | no |
| https://chat.dvshipping.com/widget.js | chat.dvshipping.com | third | Embedded widget |  | defer | no |

| Inline script | Bytes | Globals | Listeners | Element ids |
| --- | --- | --- | --- | --- |
| Google Tag Manager loader | 342 |  |  |  |
| Reddit Pixel | 404 |  |  |  |
| OpenAI Pixel | 329 |  |  |  |
| OpenAI Pixel | 398 |  |  |  |
| embedded data | 909 | __dvoFAQ, __dvoAnual, __dvoPlanos |  |  |
| UI interaction | 943 |  | click, keydown | m-toggle, m-lbl-mes, m-lbl-ano |
| animation / scroll behaviour | 15778 | __dvoLenis | load, click, keydown, scroll, resize | dvo-toggle, dvo-knob, dvo-mensal, dvo-anual, dvo-preco-pro, dvo-sufixo-pro, dvo-preco-growth, dvo-sufixo-growth |
| animation / scroll behaviour | 3013 |  | load, click, keydown |  |
| configuration object | 913 | DVChatConfig |  |  |

### Embedded data blobs

| Name | Kind | Bytes | Shape |
| --- | --- | --- | --- |
| __dvoFAQ | array | 286 | array(3) of string |
| __dvoAnual | array | 84 | array(3) of string |
| __dvoPlanos | array | 483 | array(3) of array(5) of string |
| DVChatConfig | object | 877 | { title, subtitle, welcome, footerText, termsText, termsUrl, headerBg, launcherBg, inputBg, userBg, userText, sendColor, sendActiveColor } |

Tracking identifiers observed: {"gtm":["GTM-N7TLPBPF"],"redditPixel":["a2_jpe9ofbt2021"],"openaiPixel":["Jf2xESMk6VRh9ovoBDsAv5"]}

### Script bodies fetched (first-party and custom third-party)

| Script | Bytes | Minified | Source map | Endpoints | Storage keys | Header comment |
| --- | --- | --- | --- | --- | --- | --- |
| https://chat.dvshipping.com/widget.js | 34731 | false |  | https://SEUDOMINIO/dv-chat/chat.php, https://SEUDOMINIO/dv-chat/widget.js, https://chat.dvshipping.com/chat.php, https://chat.dvshipping.com/logo-bolinha.png?v=1, https://chat.dvshipping.com/logo.png, https://dvshipping.com/privacy-and-terms/, http://www.w3.org/2000/svg | dvchat_sid | DV Shipping — Widget de chat com IA  (incorporável) Estilo inspirado no agente do Jotform: cabeçalho claro com logo + selo "AI", botões de sugestão, campo lavanda com clipe e botão de enviar redondo,  |

### Behaviours detected

- Toggle / switch control (e.g. monthly ↔ yearly pricing)
- Accordion / FAQ expand-collapse
- Smooth scrolling
- Scroll-linked parallax / reveal animation
- Reveal-on-scroll via IntersectionObserver
- Anchor navigation with programmatic scroll
- Respects prefers-reduced-motion
- Responsive scaling computed in JS
- Multi-language content switching

## Third-party surface

| Host | Category | Party | Refs | Used as |
| --- | --- | --- | --- | --- |
| dvshipping.com | Other | third | 8 | anchor, literal |
| www.w3.org | Other | third | 5 | literal |
| cdnjs.cloudflare.com | Public JS CDN | third | 4 | script, literal |
| fonts.googleapis.com | Web fonts | third | 4 | link:preconnect, link:stylesheet, literal |
| instagram.com | Social profile | third | 4 | anchor, literal |
| unpkg.com | Public JS CDN | third | 2 | script, literal |
| chat.dvshipping.com | Chat / support | third | 2 | script, literal |
| fonts.gstatic.com | Web fonts | third | 2 | link:preconnect, literal |
| www.googletagmanager.com | Tag manager | third | 2 | literal |
| www.redditstatic.com | Ad pixel | third | 1 | literal |
| bzrcdn.openai.com | Ad pixel | third | 1 | literal |
| dvoracle.com | Other | first | 44 | link:canonical, link:alternate, link:icon, link:apple-touch-icon, media, anchor, literal |
| app.dvoracle.com | Other | first | 11 | anchor, literal |

Preconnects: https://fonts.googleapis.com, https://fonts.gstatic.com. Mixed content: none.

## Security posture

HTTPS: true. Header score 33/100. Server: nginx.

| Header | Present | Value |
| --- | --- | --- |
| HSTS | no |  |
| Content-Security-Policy | no |  |
| X-Content-Type-Options | yes | nosniff |
| X-Frame-Options / frame-ancestors | no |  |
| Referrer-Policy | yes | strict-origin-when-cross-origin |
| Permissions-Policy | no |  |
| Cross-Origin-Opener-Policy | no |  |

- **medium** — HSTS header missing. Add Strict-Transport-Security with max-age ≥ 31536000.
- **medium** — Content-Security-Policy header missing. Define a CSP; inline scripts will need nonces or hashes.
- **low** — X-Frame-Options / frame-ancestors header missing. Set X-Frame-Options: DENY or CSP frame-ancestors.
- **low** — Permissions-Policy header missing. Set Permissions-Policy to disable unused browser features.
- **low** — Cross-Origin-Opener-Policy header missing. Consider COOP: same-origin.
- **medium** — 4 third-party script(s) load without Subresource Integrity: cdnjs.cloudflare.com, cdnjs.cloudflare.com, unpkg.com, chat.dvshipping.com.
- **info** — 9 inline script block(s); a strict CSP would need nonces/hashes.

## Site discovery

| File | Status | Notes |
| --- | --- | --- |
| robots | 404  |  |
| sitemap | 200 ok | 2 URLs: https://dvoracle.com/, https://dvoracle.com/terms/ |
| securityTxt | 404  |  |
| humans | 404  |  |
| manifest | 404  |  |

## Rebuild blueprint

> This blueprint describes structure, tokens and integrations observed in public HTML for research and competitive analysis. Copying text, images, logos, licensed fonts or code verbatim may infringe copyright or trademark rights; build an original implementation.

### Recommended stack

- Frontend: Vite + React + Tailwind CSS (static marketing page; replace fixed-canvas absolute positioning with responsive flex/grid sections)
- Animation: GSAP + ScrollTrigger, Lenis smooth scroll (or native CSS scroll-behavior)
- Hosting: Any static host (target uses nginx)
- Backend: Separate app origin(s) observed: app.dvoracle.com — plan an authenticated app shell apart from the marketing site
- Analytics to configure: Google Tag Manager, Reddit Pixel, OpenAI Pixel (oaiq)

### Component tree

| Component | Observed label | Heading | Props | Hints |
| --- | --- | --- | --- | --- |
| Hero | Hero |  | body |  |
| AboutUs | About Us |  | body, media | long copy, image gallery / cards |
| Achievement | Achievement |  | body |  |
| BestFeatured | Best featured |  | body, media | long copy, image gallery / cards |
| Footer | Footer |  | body, cta, media | image gallery / cards |
| Question | Question |  | body, media | image gallery / cards |
| PricingSection | pricing-section |  | body, media | long copy, image gallery / cards |
| Group2 | Group 2 |  | body, media |  |
| Navbar | Navbar |  | body, cta, media | image gallery / cards |
| Idioma | idioma |  | cta, media | link list, image gallery / cards |
| Header | header |  | cta, media | image gallery / cards |
| IntelligenceForYourEcommerce | Intelligence for your ecommerce | Intelligence for your ecommerce | title, body, cta |  |
| Section | section |  | body |  |
| TwoFrontsOneIntelligence | Two fronts, one intelligence | Two fronts, one intelligence | title, body, media |  |
| WhatDvOracleDoes | What DV Oracle does | What DV Oracle does | title, body |  |
| OurProducts | Our Products | Our Products | title, body |  |
| Proof | Proof | Proof | title, body, media |  |
| HowItWorks | How It Works | How It Works | title, body |  |
| WhyDvOracle | Why DV Oracle | Why DV Oracle | title, body, cta, media |  |
| FrequentlyAskedQuestions | Frequently Asked Questions | Frequently Asked Questions | title, body |  |
| UnlockTheFullIntelligence | Unlock the full intelligence | Unlock the full intelligence | title, body, cta | long copy |
| GetAccessToDvOracle | Get access to DV Oracle | Get access to DV Oracle | title, body, cta, media |  |
| Footer | footer |  | body, cta, media | link list, image gallery / cards |

### Design tokens

```css
:root {
  --color-background: #09101a;
  --color-foreground: #ffffff;
  --color-accent: #00b3dd;
  --palette-1: #ffffff; /* text (light), 140× */
  --palette-2: #00b3dd; /* accent / surface, 52× */
  --palette-3: #000000; /* background (dark), 48× */
  --palette-4: #181818; /* overlay / border, 22× */
  --palette-5: #00b7e1; /* overlay / border, 18× */
  --palette-6: #1a1a1a; /* text (dark), 12× */
  --palette-7: #09101a; /* background (dark), 8× */
  --palette-8: #888888; /* text (accent), 6× */
  --palette-9: #eef3f8; /* text (light), 5× */
  --palette-10: #06222c; /* text (dark), 3× */
  --palette-11: #1f1f1f; /* background (dark), 3× */
  --palette-12: #f8f9fb; /* text (light), 3× */
  --font-heading: 'Prometo', system-ui, sans-serif;
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --text-1: 14px;
  --text-2: 15px;
  --text-3: 16px;
  --text-4: 20px;
  --text-5: 24px;
  --text-6: 32px;
  --text-7: 40px;
  --text-8: 64px;
  --radius-1: 25.0px 0.0px 25.0px 0.0px;
  --radius-2: 25.0px;
  --radius-3: 50%;
  --shadow-1: 0 8px 26px rgba(0,0,0,.34);
  --shadow-2: 0 0 0 1px rgba(0,179,221,.35);
  --ease-1: linear;
  --ease-2: ease;
}
```

### Interactions to re-implement

- Toggle / switch control (e.g. monthly ↔ yearly pricing)
- Accordion / FAQ expand-collapse
- Smooth scrolling
- Scroll-linked parallax / reveal animation
- Reveal-on-scroll via IntersectionObserver
- Anchor navigation with programmatic scroll
- Respects prefers-reduced-motion
- Responsive scaling computed in JS
- Multi-language content switching
- Language switcher for: en, pt-BR, es, x-default
- Separate mobile layout variant (target ships a distinct mobile DOM)

### Integrations

| Integration | Category | Observed ID | Reference |
| --- | --- | --- | --- |
| Google Fonts | Web fonts |  | https://fonts.google.com/ |
| Self-hosted @font-face | Web fonts |  | https://developer.mozilla.org/docs/Web/CSS/@font-face |
| Google Tag Manager | Tag manager | GTM-N7TLPBPF | https://tagmanager.google.com/ |
| Reddit Pixel | Ad / marketing pixel | a2_jpe9ofbt2021 | https://advertising.reddithelp.com/ |
| OpenAI Pixel (oaiq) | Ad / marketing pixel | Jf2xESMk6VRh9ovoBDsAv5 | https://openai.com/ |
| Custom embedded AI chat widget (DVChatConfig) | Chat / support |  | https://chat.dvshipping.com/widget.js |

### Content model

```json
{
  "pages": [
    "https://dvoracle.com/",
    "https://dvoracle.com/terms/"
  ],
  "sections": [
    "Hero",
    "AboutUs",
    "Achievement",
    "BestFeatured",
    "Footer",
    "Question",
    "PricingSection",
    "Group2",
    "Navbar",
    "Idioma",
    "Header",
    "IntelligenceForYourEcommerce",
    "Section",
    "TwoFrontsOneIntelligence",
    "WhatDvOracleDoes",
    "OurProducts",
    "Proof",
    "HowItWorks",
    "WhyDvOracle",
    "FrequentlyAskedQuestions",
    "UnlockTheFullIntelligence",
    "GetAccessToDvOracle",
    "Footer"
  ],
  "pricingTiers": "Pricing table detected (see Content → prices); model tiers as data, not markup.",
  "embeddedData": [
    {
      "name": "__dvoFAQ",
      "shape": "array(3) of string"
    },
    {
      "name": "__dvoAnual",
      "shape": "array(3) of string"
    },
    {
      "name": "__dvoPlanos",
      "shape": "array(3) of array(5) of string"
    },
    {
      "name": "DVChatConfig",
      "shape": "{ title, subtitle, welcome, footerText, termsText, termsUrl, headerBg, launcherBg, inputBg, userBg, userText, sendColor, sendActiveColor }"
    }
  ],
  "faq": "FAQ section detected; model as an array of {question, answer}.",
  "locales": [
    "en",
    "pt-BR",
    "es",
    "x-default"
  ]
}
```

### Build checklist

1. Write original copy, imagery and brand assets; do not reuse the target's text, logos, fonts or screenshots.
2. Build 23 section components: Hero, AboutUs, Achievement, BestFeatured, Footer, Question, PricingSection, Group2, Navbar, Idioma, Header, IntelligenceForYourEcommerce, Section, TwoFrontsOneIntelligence, WhatDvOracleDoes, OurProducts, Proof, HowItWorks, WhyDvOracle, FrequentlyAskedQuestions, UnlockTheFullIntelligence, GetAccessToDvOracle, Footer.
3. Apply the token sheet below and verify contrast (background/foreground ratio 19.08).
4. Re-implement: Toggle / switch control (e.g. monthly ↔ yearly pricing).
5. Re-implement: Accordion / FAQ expand-collapse.
6. Re-implement: Smooth scrolling.
7. Re-implement: Scroll-linked parallax / reveal animation.
8. Re-implement: Reveal-on-scroll via IntersectionObserver.
9. Re-implement: Anchor navigation with programmatic scroll.
10. Re-implement: Respects prefers-reduced-motion.
11. Re-implement: Responsive scaling computed in JS.
12. Re-implement: Multi-language content switching.
13. Re-implement: Language switcher for: en, pt-BR, es, x-default.
14. Re-implement: Separate mobile layout variant (target ships a distinct mobile DOM).
15. Set up your own Google Tag Manager account and ID.
16. Set up your own Reddit Pixel account and ID.
17. Set up your own OpenAI Pixel (oaiq) account and ID.
18. Set up your own Custom embedded AI chat widget (DVChatConfig) account and ID.
19. License or substitute the typefaces (self-hosted fonts observed on the target are not yours to redistribute).
20. Avoid the target's gap: HSTS header missing. Add Strict-Transport-Security with max-age ≥ 31536000.
21. Avoid the target's gap: Content-Security-Policy header missing. Define a CSP; inline scripts will need nonces or hashes.
22. Avoid the target's gap: X-Frame-Options / frame-ancestors header missing. Set X-Frame-Options: DENY or CSP frame-ancestors.
23. Avoid the target's gap: Permissions-Policy header missing. Set Permissions-Policy to disable unused browser features.

## Evidence and limitations

- Static analysis of the HTML response only; JavaScript was not executed, so client-rendered DOM, XHR/fetch traffic and runtime state are not observed.

Response headers observed: cache-control: public, max-age=300, must-revalidate; content-encoding: br; content-type: text/html; charset=UTF-8; date: Tue, 13 Oct 2026 10:58:13 GMT; referrer-policy: strict-origin-when-cross-origin; server: nginx; transfer-encoding: chunked; vary: Accept-Encoding; x-content-type-options: nosniff
