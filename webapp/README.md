# Reverse Engineer Any App (web UI)

An interactive web app that reverse engineers any public web app or site from a URL. Paste a URL and get, with the exact evidence for each claim:

- **Tech stack**: frameworks, site builders, animation libraries, tag managers, ad pixels, chat widgets, CDNs, servers, backend hints (120+ fingerprint rules in [`server/analyze/fingerprints.mjs`](server/analyze/fingerprints.mjs)).
- **Design system**: palette with inferred roles and WCAG contrast, Google/self-hosted fonts, type scale, weights, radii, shadows, gradients, easings, breakpoints, keyframes, CSS variables.
- **Structure**: landmarks, heading outline, sections (from `data-sec`/semantic tags), CTAs, navigation, forms, media.
- **Content inventory**: metadata, Open Graph, hreflang, JSON-LD, copy blocks, prices, contacts, social links, developer comments and the language they were written in.
- **Scripts and data**: external libraries with versions, inline script purposes, exposed `window` globals, embedded data blobs with their shape, tracking IDs, fetched first-party/custom-widget script bodies with endpoints and storage keys.
- **Third-party surface** grouped by purpose, plus subdomains of the target that reveal separate apps/APIs.
- **Security posture**: header audit with score, cookie flags, SRI coverage, mixed content.
- **Site discovery**: `robots.txt`, `sitemap.xml`, `manifest.json`, `security.txt`, `humans.txt`.
- **Rebuild blueprint**: component tree, `tokens.css`, interactions to re-implement, integrations to recreate with your own IDs, content model, build checklist.

Exports: JSON, Markdown report, `tokens.css`. Analyses are kept in browser history; `?url=` deep links re-run an analysis.

This UI is a companion to the [REA CLI/MCP](../README.md). It performs **static analysis only**: the HTML response is parsed without executing JavaScript, so client-rendered DOM and runtime network traffic are not observed. For runtime observation use REA's `inspect-web-page` / `analyze-web-bundle` against a Chromium CDP endpoint, as documented in [`docs/browser-observation.md`](../docs/browser-observation.md).

## Run

Requires Node.js ≥ 20.

```bash
cd webapp
npm install
npm run dev        # API on http://127.0.0.1:8787, UI on http://localhost:5173 (proxies /api)
```

Production:

```bash
npm run build      # writes dist/
npm start          # serves dist/ and /api/analyze on http://127.0.0.1:8787 (PORT/HOST env to change)
```

CLI (same engine, no UI):

```bash
npm run analyze -- https://dvoracle.com --out report.json
npm run analyze -- https://dvoracle.com --md --out REPORT.md
```

Tests:

```bash
npm test
```

## API

`POST /api/analyze` with `{"url": "...", "discover": true, "scripts": true}` or `GET /api/analyze?url=...`. Returns the full report (`reportVersion: 1`). Errors are `400` for blocked/invalid targets and `500` for analysis failures.

Deployable to Vercel as-is: [`vercel.json`](vercel.json) builds the Vite UI and [`api/analyze.js`](api/analyze.js) wraps the same handler as a serverless function.

## Safety

- Only `http(s)` URLs are fetched. Every hop, including redirects, is resolved first and refused when it points at loopback, private, link-local, multicast, cloud-metadata or other non-public ranges (see [`server/analyze/fetch.mjs`](server/analyze/fetch.mjs)).
- Bodies are capped (3 MB page, 1 MB per asset) and requests time out (20 s page, 12 s assets).
- Tracking IDs, pixel IDs and endpoints observed on a target belong to that target. The blueprint says so and tells you to create your own.

## Research notes

[`research/`](research/) holds reports produced with this tool. The first case study is [dvoracle.com](research/dvoracle.com/REPORT.md).

## Legal

The reports describe structure, tokens and integrations observed in public HTML for research and competitive analysis. Copying a target's text, images, logos, licensed fonts or code verbatim may infringe copyright or trademark rights. Build an original implementation.
