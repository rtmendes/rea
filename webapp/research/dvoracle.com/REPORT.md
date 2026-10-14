# Case study: dvoracle.com

First target analyzed with the web app. Everything below comes from the two generated reports in this folder; nothing was inferred from memory.

| Artifact | Target | Notes |
| --- | --- | --- |
| [analysis.md](analysis.md) / [report.json](report.json) | https://dvoracle.com/ | Marketing landing page |
| [app-login.analysis.md](app-login.analysis.md) / [app-login.report.json](app-login.report.json) | https://app.dvoracle.com/login | Product login page |

Regenerate with `npm run analyze -- https://dvoracle.com --md --out research/dvoracle.com/analysis.md`.

## What dvoracle.com is

A single-page SaaS landing for "DV Oracle", an AI tool for online sellers (ad library + Chrome extension that estimates a competitor store's traffic, catalog and revenue). It is a product of DV Shipping (https://dvshipping.com, Instagram https://instagram.com/dv.shipping). The app lives on a separate origin, https://app.dvoracle.com/login.

## How it is built (landing page)

- **Figma export, not a framework.** The desktop layout is a fixed 1920 × 10202 px "stage" scaled with `transform: scale(var(--k))`, where `--k = min(100vw, 1920px) / 1920px`. Every text node is absolutely positioned. Below 860 px a completely separate mobile DOM (`.mob`) is shown instead.
- **Sections** carry `data-sec` labels: Navbar, Hero, About Us, Achievement, Best featured, Question (FAQ), pricing-section, Footer.
- **Animation:** GSAP 3.12.5 + ScrollTrigger (https://gsap.com/) from cdnjs, Lenis 1.1.14 (https://lenis.darkroom.engineering/) from unpkg, IntersectionObserver reveals, `prefers-reduced-motion` respected.
- **Fonts:** self-hosted Prometo (commercial typeface, Regular + Bold woff2) for headings; Google Fonts Plus Jakarta Sans, Inter, Poppins, Space Grotesk.
- **Design tokens:** dark mode, background `#09101a`, text `#ffffff`, accent cyan `#00b3dd` (contrast on background 7.72:1). Mobile CSS variables: `--m-ciano`, `--m-fundo`, `--m-painel`, `--m-borda`, `--m-texto`, `--m-suave`.
- **Tracking:** Google Tag Manager `GTM-N7TLPBPF`, Reddit Pixel `a2_jpe9ofbt2021`, OpenAI Pixel `Jf2xESMk6VRh9ovoBDsAv5` (loaded from https://bzrcdn.openai.com/sdk/oaiq.min.js with `debug: true` left on). A MutationObserver removes stray GTM text nodes from the body.
- **Chat:** custom AI chat widget "ZHOU" from https://chat.dvshipping.com/widget.js (34.7 KB, unminified, Portuguese header comment). It posts to https://chat.dvshipping.com/chat.php and keeps a `dvchat_sid` session key in localStorage. The widget's domain lock is cosmetic by its own comment; the server-side `allowed_origins` list is the real guard.
- **Server:** nginx, `cache-control: public, max-age=300`. No robots.txt (404). Sitemap lists only `/` and `/terms/`.
- **Languages:** hreflang en, pt-BR (`?lang=pt`), es (`?lang=es`). All 47 developer comments are in Portuguese.

## Pricing captured

| Plan | Monthly | Yearly (per month) | Billed yearly |
| --- | --- | --- | --- |
| PRO | US$ 39 | US$ 31.20 | US$ 374.40 |
| GROWTH | US$ 97 | US$ 77.60 | US$ 931.20 |
| AGENCY | US$ 249 | US$ 199.20 | US$ 2,390.40 |

The desktop DOM and the embedded `window.__dvoPlanos` data disagree on plan features (desktop copy: 100 / 500 / 2000 "analysis credits", 3 / 10 "simultaneous logins"; `__dvoPlanos`: 10,000 / 30,000 / 80,000 "collection credits", 2 / 5 seats, leads by LinkedIn/CNAE/Instagram). The page is mid-transition between two offers.

## App login page

- PHP backend (`PHPSESSID` cookie: Secure, HttpOnly, SameSite=Lax), nginx, `/oracle.css?v=1791422553`, Inter + IBM Plex Mono.
- One POST form: hidden `csrf`, `email`, `password`; links to `/forgot`. Theme switch and EN / PT / ES language switch.
- Headers: `content-security-policy: frame-ancestors 'none'`, `x-frame-options: DENY`, `referrer-policy: same-origin`, `no-store` caching. Security header score 58/100 versus 33/100 for the landing (no HSTS, CSP, X-Frame-Options, Permissions-Policy on the landing; third-party scripts without SRI).

## Rebuild blueprint (for an original implementation)

See the "Rebuild blueprint" section of [analysis.md](analysis.md): 23 section components, a `tokens.css` sheet, 11 interactions (pricing toggle, FAQ accordion, smooth scroll, parallax, reveal, anchor scroll, reduced motion, JS responsive scaling, language switch, mobile variant), and the integrations to recreate with your own IDs. The recommended stack replaces the fixed-canvas export with responsive Vite + React + Tailwind sections.

Legal: the reports describe public HTML for research. Do not reuse DV Oracle's copy, logos, the Prometo font files or the widget code; the tracking IDs above belong to them.
