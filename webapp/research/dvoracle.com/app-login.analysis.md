# Reverse-engineering report: https://app.dvoracle.com/login

Generated 2026-10-13T11:18:47.626Z in 4104 ms. HTTP 200, 75686 bytes, TTFB 477 ms.

Visuals: screenshot 640×400 captured 2026-10-13T11:18:47.618Z; icon https://app.dvoracle.com/favicon.ico (image/x-icon, 5036 B); og:image none; brand colour n/a (unknown).

## Summary

| Field | Value |
| --- | --- |
| Title | app.dvoracle.com |
| Description |  |
| Site type | authentication / login page |
| Language | en |
| Headline | Welcome back |
| Technologies | 4 |
| Third-party hosts | 4 |
| Sections | 0 |
| Forms | 1 |
| Word count | 32 |
| Prices found | 0 |
| Color mode | unknown |
| Primary fonts | Inter, IBM Plex Mono |
| Security header score | 58/100 |
| Developer comment language | portuguese (0.5) |

## Technology stack

| Technology | Category | Version / ID | Confidence | Evidence | Reference |
| --- | --- | --- | --- | --- | --- |
| Google Fonts | Web fonts |  | medium | html: `fonts.gstatic.com` | https://fonts.google.com/ |
| Custom embedded AI chat widget (DVChatConfig) | Chat / support |  | medium | html: `window.DVChatConfig` | https://chat.dvshipping.com/widget.js |
| nginx | Server / backend |  | medium | response header server: `nginx` | https://nginx.org/ |
| PHP | Server / backend |  | medium | set-cookie: `PHPSESSID=…` | https://www.php.net/ |

## Design system

Mode: **unknown**. Background n/a, foreground n/a, accent n/a (contrast bg/fg n/a).

| Color | Role | Uses | Alphas |
| --- | --- | --- | --- |
| #00b3dd | accent / surface | 12 | 0.18, 0.22, 0.24, 0.28, 0.3, 0.32, 0.38, 0.4, 0.45, 0.58, 0.62 |
| #000000 | background (dark) | 5 | 0.3, 0.34, 0.55 |
| #eef3f8 | text (light) | 3 | 0.7, 1 |
| #ffffff | overlay / border | 3 | 0.1, 0.16 |
| #111111 | background (dark) | 1 | 1 |
| #222222 | background (dark) | 1 | 1 |

### Typography

_none observed_

Google Fonts: Inter (wght@400;500;600;700), IBM Plex Mono (wght@400;500;600;700).
Self-hosted @font-face: none.
Type scale (px → uses): none.
Weights: none.

### Shape, motion, layout

- Border radius: none
- Shadows: 0 0 0 1px rgba(0,179,221,.28),
                           0 0 18px rgba(0,179,221,.45),
                           0 0 4 | 0 0 0 1px rgba(0,179,221,.45),
                                 0 0 26px rgba(0,179,221,.62),
                           | 0 0 0 1px rgba(0,179,221,.24),
                       0 0 16px rgba(0,179,221,.38),
                       0 0 40px rgba | 0 0 0 1px rgba(0,179,221,.40),
                       0 0 26px rgba(0,179,221,.58),
                       0 0 60px rgba | none | 0 18px 50px rgba(0,0,0,.55)
- Gradients: 0
- Easings: ease, ease-in-out
- Breakpoints: none
- Keyframes: dvo-zhou-pulso
- CSS variables: 0; reduced-motion: true; color-scheme: false

## Structure

Landmarks: form×1. DOM: 37 elements, depth 6.

### Heading outline

- # Welcome back

### Sections

_none observed_

### Calls to action

| Text | Occurrences | Kind | Targets |
| --- | --- | --- | --- |
| Tema | 1 | none |  |
| English | 1 | none |  |
| Português | 1 | none |  |
| Español | 1 | none |  |
| Forgot password? | 1 | internal | /forgot |
| Sign in | 1 | none |  |
| Create account | 1 | internal | /apply |

### Forms

| Action | Method | Fields |
| --- | --- | --- |
| (none) | post | hidden:csrf, email:email, password:password |

Images: 2 (2 with alt, 0 lazy, formats {"png":2}), inline SVG 3, iframes 0, video 0.

## Content inventory

- Canonical: none; robots meta: noindex, nofollow; generator: none
- Open Graph: {"title":null,"description":null,"type":null,"url":null,"image":null,"locale":null,"siteName":null}
- hreflang: none
- JSON-LD: none
- Emails: your.email@company.com; phones: none
- Social: none
- External link hosts: none

### Headlines

- Welcome back

### Prices

_none observed_

### Developer comments (sample)

2 HTML + 19 JS comments; language hint portuguese.

- A ZHOU vem de chat.dvshipping.com, um TERCEIRO dominio (o app e' app.dvoracle.com, as fontes sao do Google). Sem este aviso o navegador so' comeca a resolver esse nome quando o parser chega no <script
- Endereco IDENTICO ao @import que o oracle.css ja faz: com a mesma URL o navegador busca uma vez so', e aqui a busca comeca junto com o HTML — o @import so' e' descoberto depois que a folha inteira che
- Tema: classe .dv-dark no <html> + localStorage, mesma mecanica do Front v2. Roda no <head> (antes da pintura) pra nao piscar branco em quem usa escuro. Sem preferencia salva o padrao e' CLARO. O botao
- No EMBED quem manda e' a plataforma, e o tema ja' veio no HTML pelo PHP. Sem esta saida o toggle abaixo APAGARIA a classe dv-dark: dentro de um iframe de outro dominio o localStorage e' o do iframe (v
- A linha que estava aqui escrevia b.textContent = escuro ? '☼' : '☾'. Isso APAGAVA os dois <svg> de dentro do botao e punha um caractere no lugar — que herda font-size:14px do .ico e sai minusculo ao l
- HTML indentado gera quebras de linha DENTRO do no de texto; sem normalizar,
- a chave do dicionario nunca casa. NORM colapsa qualquer espaco em um so.
- [data-l] e' obrigatorio no seletor: o botao do globo agora mora no MESMO
- container e, sem o filtro, um clique nele gravaria ads_lang=undefined e
- recarregaria a pagina em ingles. A troca em si nao mudou.
- Fechar clicando fora: o teste de contencao, e NAO stopPropagation no
- globo — a barra inteira depende de clique delegado no document (tema,

## Scripts and data

| Script | Host | Party | Library | Version | Loading | SRI |
| --- | --- | --- | --- | --- | --- | --- |
| https://chat.dvshipping.com/widget.js | chat.dvshipping.com | third | Embedded widget |  | defer | no |

| Inline script | Bytes | Globals | Listeners | Element ids |
| --- | --- | --- | --- | --- |
| UI interaction | 1809 |  | click |  |
| UI interaction | 63697 |  | click, keydown | langsel |
| UI interaction | 1648 |  | click |  |
| configuration object | 1275 | DVChatConfig |  |  |

### Embedded data blobs

| Name | Kind | Bytes | Shape |
| --- | --- | --- | --- |
| DVChatConfig | object |  |  |

Tracking identifiers observed: {}

### Script bodies fetched (first-party and custom third-party)

| Script | Bytes | Minified | Source map | Endpoints | Storage keys | Header comment |
| --- | --- | --- | --- | --- | --- | --- |
| https://chat.dvshipping.com/widget.js | 34731 | false |  | https://SEUDOMINIO/dv-chat/chat.php, https://SEUDOMINIO/dv-chat/widget.js, https://chat.dvshipping.com/chat.php, https://chat.dvshipping.com/logo-bolinha.png?v=1, https://chat.dvshipping.com/logo.png, https://dvshipping.com/privacy-and-terms/, http://www.w3.org/2000/svg | dvchat_sid | DV Shipping — Widget de chat com IA  (incorporável) Estilo inspirado no agente do Jotform: cabeçalho claro com logo + selo "AI", botões de sugestão, campo lavanda com clipe e botão de enviar redondo,  |

### Behaviours detected

- Toggle / switch control (e.g. monthly ↔ yearly pricing)
- Accordion / FAQ expand-collapse
- Browser storage (localStorage/sessionStorage)
- Multi-language content switching

## Third-party surface

| Host | Category | Party | Refs | Used as |
| --- | --- | --- | --- | --- |
| chat.dvshipping.com | Chat / support | third | 4 | script, link:preconnect, literal |
| fonts.googleapis.com | Web fonts | third | 4 | link:preconnect, link:stylesheet, literal |
| fonts.gstatic.com | Web fonts | third | 2 | link:preconnect, literal |
| dvoracle.com | Other | third | 1 | literal |
| app.dvoracle.com | Other | first | 7 | link:icon, link:apple-touch-icon, link:stylesheet, media, anchor |

Preconnects: https://chat.dvshipping.com, https://fonts.googleapis.com, https://fonts.gstatic.com. Mixed content: none.

## Security posture

HTTPS: true. Header score 58/100. Server: nginx.

| Header | Present | Value |
| --- | --- | --- |
| HSTS | no |  |
| Content-Security-Policy | yes | frame-ancestors 'none' |
| X-Content-Type-Options | no |  |
| X-Frame-Options / frame-ancestors | yes | DENY |
| Referrer-Policy | yes | same-origin |
| Permissions-Policy | no |  |
| Cross-Origin-Opener-Policy | no |  |

- **medium** — HSTS header missing. Add Strict-Transport-Security with max-age ≥ 31536000.
- **low** — X-Content-Type-Options header missing. Set X-Content-Type-Options: nosniff.
- **low** — Permissions-Policy header missing. Set Permissions-Policy to disable unused browser features.
- **low** — Cross-Origin-Opener-Policy header missing. Consider COOP: same-origin.
- **medium** — 1 third-party script(s) load without Subresource Integrity: chat.dvshipping.com.
- **info** — 4 inline script block(s); a strict CSP would need nonces/hashes.

## Site discovery

| File | Status | Notes |
| --- | --- | --- |
| robots | 200  |  |
| sitemap | 200  |  |
| securityTxt | 403  |  |
| humans | 200  |  |
| manifest | 200  |  |

## Rebuild blueprint

> This blueprint describes structure, tokens and integrations observed in public HTML for research and competitive analysis. Copying text, images, logos, licensed fonts or code verbatim may infringe copyright or trademark rights; build an original implementation.

### Recommended stack

- Frontend: Vite + React + Tailwind CSS (static marketing page; replace fixed-canvas absolute positioning with responsive flex/grid sections)
- Animation: CSS transitions + IntersectionObserver reveals
- Hosting: Any static host (target uses nginx)
- Backend: No separate app origin observed from this page
- Analytics to configure: none

### Component tree

_none observed_

### Design tokens

```css
:root {
  --palette-1: #00b3dd; /* accent / surface, 12× */
  --palette-2: #000000; /* background (dark), 5× */
  --palette-3: #eef3f8; /* text (light), 3× */
  --palette-4: #ffffff; /* overlay / border, 3× */
  --palette-5: #111111; /* background (dark), 1× */
  --palette-6: #222222; /* background (dark), 1× */
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'IBM Plex Mono', system-ui, sans-serif;
  --shadow-1: 0 0 0 1px rgba(0,179,221,.28),
                           0 0 18px rgba(0,179,221,.45),
                           0 0 4;
  --shadow-2: 0 0 0 1px rgba(0,179,221,.45),
                                 0 0 26px rgba(0,179,221,.62),
                          ;
  --ease-1: ease;
  --ease-2: ease-in-out;
}
```

### Interactions to re-implement

- Toggle / switch control (e.g. monthly ↔ yearly pricing)
- Accordion / FAQ expand-collapse
- Browser storage (localStorage/sessionStorage)
- Multi-language content switching
- 1 form(s) to wire to your own backend

### Integrations

| Integration | Category | Observed ID | Reference |
| --- | --- | --- | --- |
| Google Fonts | Web fonts |  | https://fonts.google.com/ |
| Custom embedded AI chat widget (DVChatConfig) | Chat / support |  | https://chat.dvshipping.com/widget.js |

### Content model

```json
{
  "pages": [
    "https://app.dvoracle.com/login"
  ],
  "sections": [],
  "pricingTiers": null,
  "embeddedData": [
    {
      "name": "DVChatConfig",
      "shape": null
    }
  ],
  "faq": null,
  "locales": []
}
```

### Build checklist

1. Write original copy, imagery and brand assets; do not reuse the target's text, logos, fonts or screenshots.
2. Build 0 section components: none detected.
3. Apply the token sheet below and verify contrast (background/foreground ratio n/a).
4. Re-implement: Toggle / switch control (e.g. monthly ↔ yearly pricing).
5. Re-implement: Accordion / FAQ expand-collapse.
6. Re-implement: Browser storage (localStorage/sessionStorage).
7. Re-implement: Multi-language content switching.
8. Re-implement: 1 form(s) to wire to your own backend.
9. Set up your own Custom embedded AI chat widget (DVChatConfig) account and ID.
10. License or substitute the typefaces (self-hosted fonts observed on the target are not yours to redistribute).
11. Avoid the target's gap: HSTS header missing. Add Strict-Transport-Security with max-age ≥ 31536000.
12. Avoid the target's gap: X-Content-Type-Options header missing. Set X-Content-Type-Options: nosniff.
13. Avoid the target's gap: Permissions-Policy header missing. Set Permissions-Policy to disable unused browser features.
14. Avoid the target's gap: Cross-Origin-Opener-Policy header missing. Consider COOP: same-origin.

## Evidence and limitations

- Static analysis of the HTML response only; JavaScript was not executed, so client-rendered DOM, XHR/fetch traffic and runtime state are not observed.

Response headers observed: cache-control: no-store, no-cache, must-revalidate; content-encoding: br; content-security-policy: frame-ancestors 'none'; content-type: text/html; charset=UTF-8; date: Tue, 13 Oct 2026 11:18:44 GMT; expires: Thu, 19 Nov 1981 08:52:00 GMT; pragma: no-cache; referrer-policy: same-origin; server: nginx; set-cookie: PHPSESSID=b0ac1n68cogvn1rt5c2h9bln6i; path=/; secure; HttpOnly; SameSite=Lax; transfer-encoding: chunked; vary: Accept-Encoding; x-frame-options: DENY
