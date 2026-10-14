# Reverse Engineer Any App (web UI)

An interactive web app that reverse engineers any public web app or site from a URL and reads the result as a numbered workflow, from "who it sells to" to "does this add value to our offers". Every claim carries the evidence that produced it; nothing about visitors, revenue or rankings is guessed.

Live: **https://rtmendes.github.io/rea/** (static mode) · claude.ai artifact (connector mode, see below).

## The 11-step workflow

| # | Step | What you see |
| --- | --- | --- |
| 1 | **Snapshot** | identity, brand palette, the **full-page render** in a scrollable browser frame, mobile render, live iframe, KPI tiles that jump to each step |
| 2 | **Who it sells to** | customer avatar inferred from the copy: who the page names, wants, struggles, hesitations answered, proof devices, budget, channels, tone, with the sentences behind each field and a confidence label |
| 3 | **What it sells** | offer ladder with prices in context, CTAs grouped by intent, conversion path (forms, sign-up/login pages, app origins, payment tech) |
| 4 | **Messaging & keywords** | focus keyword, placement-weighted term cloud, top phrases, where the weight comes from, headline hierarchy |
| 5 | **Reach & traffic signals** | analytics, ad pixels, tag managers, email/CRM, social profiles, app stores, content footprint, indexing signals, plus live links to Similarweb, Semrush, Ahrefs, Wayback, BuiltWith, PageSpeed, the Facebook Ad Library (their estimates, not ours) |
| 6 | **Pages & flows** | site map (sections, page types, nav vs footer), in-page anchors, **rendered key pages** gallery (pricing, signup, about…), one click to analyze any page |
| 7 | **Look & feel** | design board: specimen rendered with the observed fonts/colours/radius/shadow, colour roles, type scale, radii, shadows, motion, `tokens.css` |
| 8 | **How it is built** | tech stack with evidence, structure, content inventory, scripts & data blobs, third parties, security posture |
| 9 | **Rebuild blueprint** | component tree, tokens, interactions, integrations to recreate, content model, checklist |
| 10 | **Value check & hand-off** | the agent judges whether the site adds new value to **your portfolio** (brands, offers, projects), proposes an original offer, sets the pipeline stage, and produces a hand-off brief (Markdown/JSON) or POSTs it to your pipeline webhook |
| 11 | **Evidence & raw data** | well-known files, full report JSON |

Views: **Library** (cards with thumbnail, logo, audience, budget, focus keyword, verdict, stage), **Offer pipeline** (board: Inbox → Evaluate → New offer / Enrich existing → In build → Archive, plus the portfolio editor), **Settings**.

## Where the data is saved

| Store | Scope | Set-up |
| --- | --- | --- |
| Browser (IndexedDB) | always; instant, offline | none |
| **Supabase cloud sync** | across browsers and devices, per signed-in user (email magic link); reports as JSON, renders in a private bucket | [`supabase/README.md`](supabase/README.md): run the migration, set the site URL, paste project URL + anon key in Settings (or build with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) |
| **claude.ai artifact database** | connector mode; private per claude.ai account | none (declared as the artifact's `db` + `user` capabilities) |
| Library export / import | manual move between devices, backups | Settings → Export / Import |

Pipeline stage, value-check result and the portfolio travel with the same stores.

## The value-check agent

Step 10 compares the analysis with your portfolio and returns a fixed JSON shape (verdict `new_offer` / `enrich_existing` / `brand_angle` / `archive`, score, reasons, portfolio matches, an original offer idea with ladder, hooks, objections, proof to gather, channels, brand learnings, next steps). Providers, tried in order:

1. **claude.ai artifact** (`sample` capability): no key needed when the app runs as an artifact.
2. **Supabase edge function `offer-agent`** with the `ANTHROPIC_API_KEY` secret, for signed-in cloud users.
3. **Anthropic SDK from the browser** with a key kept only in that browser (Settings → Value-check agent; default model `claude-opus-5-5`).
4. **Built-in heuristic** (keyword/audience overlap, price band, evidence count), always available and labelled as such.

The hand-off brief (`<site>.handoff.md` / `.json`) carries the verdict, the offer idea, the evidence digest, the design tokens and a ready prompt for an offer-creation assistant. Set a webhook URL in Settings to POST the JSON hand-off to Make, n8n, Zapier or your own API.

## Open the research in OmniCanvas

Step 10 also turns the report into a board for [OmniCanvas](https://canvas.insightprofit.live), the team's AI canvas ([rtmendes/omnicanvas](https://github.com/rtmendes/omnicanvas)). The board follows OmniCanvas's node contract (`docs/TECH-REFERENCE.md` §1 in that repo):

| Lane | Cards | Why this card type |
| --- | --- | --- |
| Research | Snapshot, customer avatar, offer & pricing, messaging & keywords, pages & funnel, reach signals, design & stack, value check | `source` cards: never re-run, and their text feeds every card wired after them |
| Live views | The live site and this report | `embed` cards |
| Ask | A chat card wired to every research card | Answers from the research only |
| Strategy chain | Play → Persona → Desires → Angles (five awareness levels) → Hooks → Briefs → Final briefs, plus "Our original offer" | `editor` cards that run on the board owner's own keys and model routing |

To send: once, in OmniCanvas open **Settings → Import** and create an import key (shown once, starts with `oc_imp_`). Paste it in step 10 and press **Send to OmniCanvas**. Every send creates a **new** board in the folder **REA reports › &lt;site&gt;** (created on demand) with the **REA** label; nothing is overwritten. The key stays in your browser; revoke it in OmniCanvas any time.

To overwrite one existing board instead, open "Replace an existing board instead": in that board's Share dialog turn on API access and paste its board token.

From a server or the command line:

```bash
npm run omnicanvas -- research/fullyloopy.com/site.report.json --key <import key>     # new board in "REA reports/fullyloopy.com"
npm run omnicanvas -- board.json --token <board token>                                # replace an existing board
npm run omnicanvas -- report.json --out board.json                                    # just write the graph
```

`OMNICANVAS_IMPORT_KEY` / `OMNICANVAS_BOARD_TOKEN` work in place of the flags. The server route `POST /api/omnicanvas` accepts `{key, name, graph, folder?, labels?}` (new board through `POST /api/v1/import/boards`) or `{token, name, graph}` (replace through `PATCH /api/v1/boards/{token}`) on `OMNICANVAS_API` (default `https://canvas-api.insightprofit.live`), after validating the graph (ids, endpoints, parents, no cycles). The OmniCanvas API accepts browser calls from `https://rtmendes.github.io`, so the GitHub Pages build sends directly.

## Three ways to run it

| Mode | Where | How pages are fetched | Screenshots / logos |
| --- | --- | --- | --- |
| **API** | `npm start`, `npm run dev`, Vercel | the app's own server (direct fetch, SSRF-guarded) | local Chromium, or Firecrawl's API when `FIRECRAWL_API_KEY` is set / keyless |
| **Static** | GitHub Pages or any static host | the browser calls Firecrawl's REST API directly (keyless free tier, your own key kept in the browser, or the Supabase `firecrawl-proxy` function with a server-side key) | Firecrawl full-page screenshot and per-page renders, downloaded and resized into the library |
| **Connector** | claude.ai artifact | the viewer's Firecrawl connector via the artifact `mcp` capability | links only (artifact sandbox cannot embed remote images) |

The page detects its mode at load: an artifact runtime → connector; `api/health` answers → API; otherwise static.

### GitHub Pages (static mode)

[`.github/workflows/webapp-pages.yml`](../.github/workflows/webapp-pages.yml) builds `webapp/` with `VITE_BASE=/<repo>/` and pushes the result to the `gh-pages` branch on every push to `main` or the feature branch that touches `webapp/`. GitHub serves that branch at `https://<owner>.github.io/<repo>/` (live: https://rtmendes.github.io/rea/). The page ships a web app manifest, so it can be added to a phone's home screen. For a custom domain, add `cname: your.domain` to the `peaceiris/actions-gh-pages` step and point the domain's DNS at GitHub Pages. Repository *Variables* named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` bake cloud sync into the build.

## Use it without hosting: the claude.ai artifact (connector mode)

The same UI is published as a claude.ai artifact. There the page cannot fetch pages itself, so it calls your **Firecrawl** connector (added in claude.ai Settings → Connectors) through the artifact's `mcp` capability: Firecrawl returns the rendered DOM, a screenshot link and branding, and the analyzer runs in the browser. Differences from the self-hosted app: response headers, cookies, robots.txt/sitemap and script bodies are not observed, the security header audit reads "not observed", and screenshots/icons are links rather than embedded thumbnails because an artifact cannot display images from other hosts. Build it with:

```bash
npm run build:artifact   # writes artifact/index.html + artifact/assets/*
```

and publish `artifact/index.html` with its assets as artifact files, declaring `capabilities: {mcp: {servers: [{server: "Firecrawl", tools: ["firecrawl_scrape"]}]}, downloads: true, db: {}, user: {}, sample: {}}` (connector fetching, file downloads, the private per-viewer library database, and the on-platform value-check agent).

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

`POST /api/omnicanvas` with `{"key": "oc_imp_...", "name": "...", "graph": {"nodes": [], "edges": []}}` creates a board in OmniCanvas, or with `{"token": ...}` replaces one (see above).

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
