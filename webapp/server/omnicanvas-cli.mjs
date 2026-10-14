#!/usr/bin/env node
// CLI: node server/omnicanvas-cli.mjs <report.json|board.json> [--key <import key> | --token <board token>] [--out <board.json>]
// Builds an OmniCanvas board from a REA report, or takes a board downloaded from the app.
// --key creates a NEW board in "REA reports/<site>" (OmniCanvas Settings → Import).
// --token replaces an existing board (board Share dialog → API access).
// --out saves the board JSON. With none of these it prints the board JSON.

import { readFileSync, writeFileSync } from 'node:fs'
import { reportToBoard, validateBoard, pushBoard, importBoard, folderFromName, REA_LABEL, OMNICANVAS_API } from '../shared/omnicanvas.mjs'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--') && !['--token', '--key', '--out'].includes(args[args.indexOf(a) - 1]))
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
if (!file) {
  console.error('Usage: node server/omnicanvas-cli.mjs <report.json|board.json> [--key <import key> | --token <board token>] [--out <board.json>]')
  process.exit(2)
}
const input = JSON.parse(readFileSync(file, 'utf8'))
const board = input.graph && Array.isArray(input.graph.nodes)
  ? { name: input.name || 'REA board', folder: input.folder || folderFromName(input.name), labels: input.labels || [REA_LABEL], graph: input.graph }
  : reportToBoard(input)
const problems = validateBoard(board.graph)
if (problems.length) { console.error(`Invalid board: ${problems.join('; ')}`); process.exit(1) }
console.error(`${board.name}: ${board.graph.nodes.length} cards, ${board.graph.edges.length} connections`)
const out = opt('--out')
if (out) { writeFileSync(out, JSON.stringify(board, null, 2)); console.error(`wrote ${out}`) }
const key = opt('--key') || process.env.OMNICANVAS_IMPORT_KEY
const token = opt('--token') || process.env.OMNICANVAS_BOARD_TOKEN
if (key) {
  try {
    const r = await importBoard({ key, name: board.name, graph: board.graph, folder: board.folder, labels: board.labels, apiBase: process.env.OMNICANVAS_API || OMNICANVAS_API })
    console.error(`created in ${board.folder}: ${r.boardUrl}`)
  } catch (e) { console.error(e.message); process.exit(1) }
} else if (token) {
  try {
    const r = await pushBoard({ token, name: board.name, graph: board.graph, apiBase: process.env.OMNICANVAS_API || OMNICANVAS_API })
    console.error(`pushed: ${r.boardUrl}`)
  } catch (e) { console.error(e.message); process.exit(1) }
} else if (!out) process.stdout.write(JSON.stringify(board, null, 2) + '\n')
