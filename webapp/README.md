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
- **Visual identity**: a rendered screenshot thumbnail (local Chromium, 640×400 JPEG), the site's logo/icon (apple-touch-icon, SVG/PNG favicon or `/favicon.ico`), the `og:image` preview and the brand colours. Every analyzed site gets a card in the library grid, so a long list stays scannable.

Exports: JSON, Markdown report, `tokens.css`, screenshot and icon. Paste many URLs (one per line or comma separated) to queue a batch. Reports and thumbnails are kept in the browser (IndexedDB) and open instantly from the library; `?url=` deep links open the stored report or run a new analysis.

This UI is a companion to the [REA CLI/MCP](../README.md). It performs **static analysis only**: the HTML response is parsed without executing JavaScript, so client-rendered DOM and runtime network traffic are not observed. For runtime observation use REA's `inspect-web-page` / `analyze-web-bundle` against a Chromium CDP endpoint, as documented in [`docs/browser-observation.md`](../docs/browser-observation.md).

## Three ways to run it

| Mode | Where | How pages are fetched | Screenshots / logos |
| --- | --- | --- | --- |
| **API** | `npm start`, `npm run dev`, Vercel | the app's own server (direct fetch, SSRF-guarded) | local Chromium, or Firecrawl's API when `FIRECRAWL_API_KEY` is set / keyless |
| **Static** | GitHub Pages or any static host | the browser calls Firecrawl's REST API directly (keyless free tier, or your own key kept in the browser) | Firecrawl screenshot, downloaded and resized into the library |
| **Connector** | claude.ai artifact | the viewer's Firecrawl connector via the artifact `mcp` capability | links only (artifact sandbox cannot embed remote images) |

The page detects its mode at load: an artifact runtime → connector; `api/health` answers → API; otherwise static.

### GitHub Pages (static mode)

[`.github/workflows/webapp-pages.yml`](../.github/workflows/webapp-pages.yml) builds `webapp/` with `VITE_BASE=/<repo>/`, enables Pages on first run and deploys on every push to `main` or the feature branch that touches `webapp/`. GitHub Actions must be enabled on the repository (a fork starts with workflows disabled: open the repository's **Actions** tab once and enable them). The site is then at `https://<owner>.github.io/<repo>/`.

## Use it without hosting: the claude.ai artifact (connector mode)

The same UI is published as a claude.ai artifact. There the page cannot fetch pages itself, so it calls your **Firecrawl** connector (added in claude.ai Settings → Connectors) through the artifact's `mcp` capability: Firecrawl returns the rendered DOM, a screenshot link and branding, and the analyzer runs in the browser. Differences from the self-hosted app: response headers, cookies, robots.txt/sitemap and script bodies are not observed, the security header audit reads "not observed", and screenshots/icons are links rather than embedded thumbnails because an artifact cannot display images from other hosts. Build it with:

```bash
npm run build:artifact   # writes artifact/index.html + artifact/assets/*
```

and publish `artifact/index.html` with its assets as artifact files, declaring `capabilities: {mcp: {servers: [{server: "Firecrawl", tools: ["firecrawl_scrape"]}]}, downloads: true}`.

## Run

Requires Node.js ≥ 20. Screenshots use a local Chromium when present, else Firecrawl's API (`FIRECRAWL_API_KEY` recommended; keyless calls are rate limited). Chromium lookup: the app looks for Playwright's browsers (`PLAYWRIGHT_BROWSERS_PATH`, `~/.cache/ms-playwright`, `/opt/pw-browsers`), then system `chromium` / `google-chrome`; set `REA_CHROMIUM_PATH=/path/to/chrome` to point at one, or `REA_DISABLE_SCREENSHOTS=1` to skip. Without a browser the report still completes and says why no screenshot was taken; the `og:image` is used as the preview when present. Install Playwright's browser with `npx playwright install chromium` if you have none.

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

`POST /api/analyze` with `{"url": "...", "discover": true, "scripts": true, "screenshot": true}` or `GET /api/analyze?url=...`. Returns the full report (`reportVersion: 2`); `visuals.screenshot.dataUrl` and `visuals.icon.dataUrl` carry the images inline. Errors are `400` for blocked/invalid targets and `500` for analysis failures.

Deployable to Vercel as-is: [`vercel.json`](vercel.json) builds the Vite UI and [`api/analyze.js`](api/analyze.js) wraps the same handler as a serverless function. Vercel functions have no Chromium, so screenshots are skipped there (the `og:image` fallback still works); run `npm start` on a machine with Chromium for full visuals.

## Safety

- Only `http(s)` URLs are fetched. Every hop, including redirects, is resolved first and refused when it points at loopback, private, link-local, multicast, cloud-metadata or other non-public ranges (see [`server/analyze/fetch.mjs`](server/analyze/fetch.mjs)).
- Bodies are capped (3 MB page, 1 MB per asset, 200 KB icon, 600 KB og:image) and requests time out (20 s page, 12 s assets, 15 s screenshot navigation).
- The screenshot browser runs with request interception: every subresource host is resolved and must be public, so a page cannot pull the renderer into private networks. Downloads are refused and motion is reduced.
- Tracking IDs, pixel IDs and endpoints observed on a target belong to that target. The blueprint says so and tells you to create your own.

## Research notes

[`research/`](research/) holds reports produced with this tool. The first case study is [dvoracle.com](research/dvoracle.com/REPORT.md).

## Legal

The reports describe structure, tokens and integrations observed in public HTML for research and competitive analysis. Copying a target's text, images, logos, licensed fonts or code verbatim may infringe copyright or trademark rights. Build an original implementation.
