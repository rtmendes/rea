#!/usr/bin/env node
// CLI: node server/omnicanvas-cli.mjs <report.json|board.json> [--token <board token>] [--out <board.json>]
// Builds an OmniCanvas board from a REA report, or takes a board downloaded from the app. With --token it writes the board through
// OmniCanvas's public board API (board Share dialog → API access). With --out it saves the
// graph JSON. With neither, it prints the graph JSON.

import { readFileSync, writeFileSync } from 'node:fs'
import { reportToBoard, validateBoard, pushBoard, OMNICANVAS_API } from '../shared/omnicanvas.mjs'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--') && !['--token', '--out'].includes(args[args.indexOf(a) - 1]))
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
if (!file) {
  console.error('Usage: node server/omnicanvas-cli.mjs <report.json|board.json> [--token <board token>] [--out <board.json>]')
  process.exit(2)
}
const input = JSON.parse(readFileSync(file, 'utf8'))
const board = input.graph && Array.isArray(input.graph.nodes) ? { name: input.name || 'REA board', graph: input.graph } : reportToBoard(input)
const problems = validateBoard(board.graph)
if (problems.length) { console.error(`Invalid board: ${problems.join('; ')}`); process.exit(1) }
console.error(`${board.name}: ${board.graph.nodes.length} cards, ${board.graph.edges.length} connections`)
const out = opt('--out')
if (out) { writeFileSync(out, JSON.stringify(board, null, 2)); console.error(`wrote ${out}`) }
const token = opt('--token') || process.env.OMNICANVAS_BOARD_TOKEN
if (token) {
  try {
    const r = await pushBoard({ token, name: board.name, graph: board.graph, apiBase: process.env.OMNICANVAS_API || OMNICANVAS_API })
    console.error(`pushed: ${r.boardUrl}`)
  } catch (e) { console.error(e.message); process.exit(1) }
} else if (!out) process.stdout.write(JSON.stringify(board, null, 2) + '\n')
