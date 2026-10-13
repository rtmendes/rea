#!/usr/bin/env node
// CLI: node server/cli.mjs <url> [--md] [--out <file>] [--no-discover] [--no-scripts]

import { writeFileSync } from 'node:fs'
import { analyzeUrl } from './analyze/index.mjs'
import { reportToMarkdown } from '../shared/report-markdown.mjs'

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
if (!url) {
  console.error('Usage: node server/cli.mjs <url> [--md] [--out <file>] [--no-discover] [--no-scripts]')
  process.exit(2)
}
const outIndex = args.indexOf('--out')
const out = outIndex >= 0 ? args[outIndex + 1] : null
try {
  const report = await analyzeUrl(url, { discover: !args.includes('--no-discover'), fetchFirstPartyScripts: !args.includes('--no-scripts') })
  const text = args.includes('--md') ? reportToMarkdown(report) : JSON.stringify(report, null, 2)
  if (out) { writeFileSync(out, text); console.error(`wrote ${out}`) } else process.stdout.write(text + '\n')
} catch (error) {
  console.error(error.message)
  if (error.details) console.error(JSON.stringify(error.details))
  process.exit(1)
}
