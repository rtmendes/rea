# Case study: Fully Loopy (strategy canvas for ads)

Second target analyzed with the web app. Facts below come from the generated reports in this folder and from the app's public JavaScript bundle. Lines marked **Inference** or **Recommendation** are not observed facts.

| Artifact | Target | Notes |
| --- | --- | --- |
| [site.analysis.md](site.analysis.md) / [site.report.json](site.report.json) | https://fullyloopy.com/ | Marketing homepage, with robots.txt and sitemap discovery |
| [features-strategy.analysis.md](features-strategy.analysis.md) | https://fullyloopy.com/features/strategy | The strategy canvas ("Flow lanes") |
| [features-canvas.analysis.md](features-canvas.analysis.md) | https://fullyloopy.com/features/canvas | Canvas & Studio node editor |
| [features-loops.analysis.md](features-loops.analysis.md) | https://fullyloopy.com/features/loops | "Loops" AI strategist |
| [features-agents.analysis.md](features-agents.analysis.md) | https://fullyloopy.com/features/agents | Agents |
| [features-research.analysis.md](features-research.analysis.md) | https://fullyloopy.com/features/research | Research Lab |
| [first-40-b.analysis.md](first-40-b.analysis.md) | https://fullyloopy.com/first-40-b | Lifetime-deal pricing page |
| [app-login.analysis.md](app-login.analysis.md) / [app-login.report.json](app-login.report.json) | https://app.fullyloopy.com/login | Product login page |
| [app.report.json](app.report.json) | https://app.fullyloopy.com/ | App root; renders an "Opening your workspace" loader, no content without an account |

Open any of these in the web app: https://rtmendes.github.io/rea/?url=https://fullyloopy.com

Regenerate with `npm run analyze -- https://fullyloopy.com --md --out research/fullyloopy.com/site.analysis.md`.

## What it is

- **Positioning:** "Stop guessing. Build ads on proven messaging." An all-in-one Meta ad platform built on hand-picked proven ads and the messaging behind them.
- **The loop:** research feeds strategy, strategy feeds creative, creative feeds Meta, and Meta's results feed the next round.
- **Eight modules share one workspace:** Strategy, Ad Library, Research Lab, Canvas & Studio, Video Editor, Paid Media & Fatigue, Agents, Loops.
- **Owner:** the footer reads "© 2026 AdGrit™".
- **Stage:** "Lifetime beta — opening to the first 40 only", plus a waitlist form.

## The strategy canvas (the part to reverse engineer)

Every ad is one chain on one canvas. Each card knows its parent, and clicking a card lights up its whole lineage.

```
Persona -> Desire -> Creative idea -> Angle (1 of 5 awareness levels) -> Hook -> Brief -> Creative
```

| Object | Fields shown on the site |
| --- | --- |
| Persona | Name, age, awareness level, one-line description, core pain, surface desire, higher-order goal, beliefs, false beliefs, objections, common phrases kept verbatim, words to avoid |
| Desire | Text plus a priority tag such as "High" |
| Creative idea | Picked from proven concepts and execution formats, split into image and video |
| Angle | One of five awareness levels: Unaware, Problem aware, Solution aware, Product aware, Most aware. Includes "the belief to break" |
| Hook | Inherits persona, desire and angle. Typed by format, for example Static or UGC |
| Brief | Ready-to-paste image prompt with the hook as headline, plus a "Ready" status |
| Creative | Format, aspect ratio and engine, for example "Static · 9:16 · GPT Image 2.5" |

**How the canvas behaves, as stated on the site:**

- **Lanes:** desires, ideas, angles, hooks and briefs sit in columns ("Flow lanes"), each with an "+ Add" button.
- **Four views of the same rows:** Flow, Cards, Table nodes and Table.
- **Scoped fan-out:** angles fan out across the five awareness levels, so "50 creatives are 50 different bets". Angles can be anchored to one creative idea.
- **Human approval:** AI drafts one level at a time, or Loops proposes the whole chain in one card. Nothing is saved until the user confirms. Agent output waits in an approval queue.
- **Your own words:** a desire or angle can be saved exactly as typed under a persona.
- **One hub:** a Strategy area has tabs for messaging, personas, creative ideas and projects. The same rows appear on the canvas.

**Canvas & Studio node types:** Prompt, Image, Video, Analyze, Storyboard, Takes and Cut, plus an Image grid that compares concepts against engines side by side.

- **Image engines named:** Nano Banana, Seedream, Imagen, Flux, Ideogram, Recraft, GPT Image.
- **Video engines named:** Kling, Seedance, Veo, Sora 2, Hailuo, Luma.
- **Templates:** a node or branch can be saved as a template for one workspace, all workspaces, or public.
- **Research canvas:** source nodes for Product, YouTube, TikTok, Instagram, Website, Meta Ads and Document feed a "Context Filter". A Loops node answers only from what the filter passes.

## Offer and pricing (one-time, lifetime, first 40 buyers)

| Plan | Workspaces | Price |
| --- | --- | --- |
| Business | 3 | $297 |
| Entrepreneur | 10 | $397 |
| Agency Starter ("Best value") | 25 | $547 |
| Agency Pro | 50 | $897 |
| Agency Unlimited | Unlimited, 20 users included | $1,497 |

- **Bring your own AI keys:** the site estimates about $2–7 a month in usage. Its example month is OpenRouter $2.90 plus Fal $0.40, about $3.30. Magnific and Higgsfield run on the user's own plans through MCP.
- **Comparison anchor:** "Typical AI ad tool $99/mo, $199/mo".
- **Checkout URLs:** `https://app.fullyloopy.com/checkout/start?plan=ltd-business&source=marketing_site`, with `ltd-entrepreneur`, `ltd-agency-starter`, `ltd-agency-pro` and `ltd-agency-unlimited`.
- **Shipping next, per the pricing page:** Telegram agent chat (marked Live), Meta ads through Zernio, bulk Meta publishing, Slack agent approvals, YouTube breakdowns in Canvas.

## Customer avatar

- **Analyzer output:** "any market", B2C, one-time / lifetime pricing, plain conversational tone with scarcity cues.
- **Inference from the copy:** the buyer is a Meta media buyer, creative strategist, ecommerce or DTC owner, or agency. The evidence is the five agency-sized tiers, the "Spend less time in ads manager" call to action and the Meta fatigue tooling. The analyzer's B2C label does not fit this case.
- **Pain they name:** "The hardest part of ads isn't the asset. It's the idea." Also: chat-thread research that disappears, and too many tool subscriptions.

## How it is built

| Layer | Observed | Source |
| --- | --- | --- |
| Framework | Next.js built with Turbopack, on Vercel | Response headers, chunk names |
| Backend | Convex, deployment `beloved-parakeet-908.convex.cloud` | Login bundle |
| Auth | Better Auth with email and password, plus an emailed sign-in link through the Convex action `buyerAccounts.requestSignInLink` | Login bundle |
| UI | Tailwind CSS, Radix UI, Sonner toasts, Lucide icons, Inter font | Bundle strings, font preloads |
| Tracking | Meta Pixel `216965143491911` on the site. Google Tag Manager `GTM-TWPFVJW` on the app | HTML |
| SEO | robots.txt allows all and points to a sitemap. 27 internal pages in 10 sections | Discovery |

- **Not identified:** the canvas library. The login bundle does not include canvas code, and the app requires an account.
- **Unconfirmed:** the homepage fingerprint also flagged Bootstrap. It is likely a false positive next to Tailwind.
- **Security headers:** both origins score 33 of 100. HSTS is present. CSP and the other headers are missing.

## Rebuild blueprint (for an original implementation)

**Recommendation.** These are my design choices, not observations.

1. **Data model.** Create tables `personas`, `desires`, `ideas`, `angles` (with `awareness_level` 1–5 and `belief_to_break`), `hooks`, `briefs` and `creatives`. Each has a `parent_id` and a `workspace_id`. Add `sources` and `context_filters` for the research canvas.
2. **Canvas.** Use React Flow (https://reactflow.dev/) for the lanes and the node editor. Lane layout is a fixed x per object type. Lineage highlight is a walk up and down the `parent_id` edges.
3. **AI steps.** Create one structured-output call per level with the parent chain in the prompt. Add a "propose whole ladder" call that returns all five objects for confirmation. Nothing persists until the user approves.
4. **Backend.** Use Supabase, already wired into this web app, or Convex as they did. Use bring-your-own model keys through OpenRouter (https://openrouter.ai/) to copy their pricing model.
5. **First release.** Ship personas, desires, angles, hooks and briefs with the Flow and Table views. Research canvas, Studio and Meta publishing come later.

## Limitations

- **App interior not inspected:** everything after sign-in is described only from the marketing pages and their product captures.
- **No traffic numbers:** reach shows observed signals only. The Meta Pixel suggests paid acquisition.
- **Collapsed FAQ:** the homepage FAQ answers sit in collapsed elements and were not captured.
