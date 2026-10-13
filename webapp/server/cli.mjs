#!/usr/bin/env node
// CLI: node server/cli.mjs <url> [--md] [--out <file>] [--no-discover] [--no-scripts] [--no-screenshot]
// With --out, the screenshot and icon are also written next to the output file (<name>.screenshot.jpg, <name>.icon.<ext>).

import { writeFileSync } from 'node:fs'
import { closeBrowser } from './screenshot.mjs'
import { analyzeUrl } from './analyze/index.mjs'
import { reportToMarkdown } from '../shared/report-markdown.mjs'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
if (!url) {
  console.error('Usage: node server/cli.mjs <url> [--md] [--out <file>] [--no-discover] [--no-scripts] [--no-screenshot]')
  process.exit(2)
}
const outIndex = args.indexOf('--out')
const out = outIndex >= 0 ? args[outIndex + 1] : null
try {
  const report = await analyzeUrl(url, { discover: !args.includes('--no-discover'), fetchFirstPartyScripts: !args.includes('--no-scripts'), screenshot: !args.includes('--no-screenshot') })
  const text = args.includes('--md') ? reportToMarkdown(report) : JSON.stringify(report, null, 2)
  if (out) {
    writeFileSync(out, text); console.error(`wrote ${out}`)
    const base = out.replace(/\.(json|md)$/i, '')
    if (report.visuals.screenshot) { writeFileSync(`${base}.screenshot.jpg`, Buffer.from(report.visuals.screenshot.dataUrl.split(',')[1], 'base64')); console.error(`wrote ${base}.screenshot.jpg`) }
    if (report.visuals.icon) { const ext = { 'image/png': 'png', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[report.visuals.icon.type] || 'bin'; writeFileSync(`${base}.icon.${ext}`, Buffer.from(report.visuals.icon.dataUrl.split(',')[1], 'base64')); console.error(`wrote ${base}.icon.${ext}`) }
  } else process.stdout.write(text + '\n')
  await closeBrowser()
} catch (error) {
  console.error(error.message)
  if (error.details) console.error(JSON.stringify(error.details))
  await closeBrowser()
  process.exit(1)
}
