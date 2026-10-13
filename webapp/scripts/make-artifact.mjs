// Turns dist-artifact/ (Vite build with relative paths) into artifact/index.html, the page body
// published as a claude.ai artifact (the platform wraps it in its own document skeleton).
import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist-artifact'
const out = 'artifact'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const script = /<script[^>]+src="([^"]+)"[^>]*><\/script>/.exec(html)?.[1]
const css = /<link rel="stylesheet"[^>]+href="([^"]+)"/.exec(html)?.[1]
if (!script || !css) throw new Error('Could not find built asset references in dist-artifact/index.html')
const page = `<title>Reverse Engineer Any App</title>
<style>
  /* Single dark look by design; tokens live in the bundled stylesheet as well. */
  :root { --bg: #0b0f17; --fg: #e5e9f2; --accent: #22d3ee; color-scheme: dark; }
  body { background: var(--bg); color: var(--fg); margin: 0; font-family: Inter, system-ui, sans-serif; }
  #root { min-height: 100%; }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${script.replace(/^\.\//, '')}" hidden>
<link rel="stylesheet" href="${css.replace(/^\.\//, '')}">
<div id="root"></div>
<script type="module" src="${script.replace(/^\.\//, '')}"></script>
`.replace(/<link rel="stylesheet" href="assets\/[^"]+\.js" hidden>\n/, '')
mkdirSync(join(out, 'assets'), { recursive: true })
writeFileSync(join(out, 'index.html'), page)
for (const f of readdirSync(join(dist, 'assets'))) copyFileSync(join(dist, 'assets', f), join(out, 'assets', f))
console.log(`wrote ${out}/index.html with ${script} and ${css}`)
