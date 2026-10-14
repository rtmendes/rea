import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reportToBoard, researchBlocks, validateBoard, pushBoard, OMNICANVAS_API } from '../shared/omnicanvas.mjs'

const report = JSON.parse(readFileSync(new URL('../research/fullyloopy.com/site.report.json', import.meta.url), 'utf8'))
const RUNNABLE = new Set(['editor', 'chat', 'imagegen']) // omnicanvas backend/app/flow/engine.py RUNNABLE_TYPES

test('board graph follows the OmniCanvas node and edge contract', () => {
  const { name, graph } = reportToBoard(report)
  assert.match(name, /^REA · fullyloopy\.com · \d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(validateBoard(graph), [])
  for (const n of graph.nodes) {
    assert.match(n.id, /^n_/)
    assert.ok(n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y))
    assert.ok(n.data && typeof n.data.title === 'string' && n.data.content)
  }
  for (const e of graph.edges) { assert.equal(e.sourceHandle, 'out'); assert.equal(e.targetHandle, 'in') }
  assert.ok(JSON.stringify(graph).length < 200_000, 'graph stays small (no embedded images)')
})

test('research cards are non-runnable sources whose text feeds the chat and the chain', () => {
  const { graph } = reportToBoard(report)
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const research = graph.nodes.filter((n) => n.parentId)
  assert.ok(research.length >= 7)
  for (const n of research) {
    assert.equal(n.type, 'source')
    assert.ok(!RUNNABLE.has(n.type), 'run-all must not overwrite evidence')
    assert.equal(n.data.output.kind, 'text')
    assert.ok(n.data.output.text.length > 20, `${n.data.title} has text`)
  }
  const into = (id) => graph.edges.filter((e) => e.target === id).map((e) => byId.get(e.source).data.title)
  const chat = graph.nodes.find((n) => n.type === 'chat')
  assert.equal(into(chat.id).length, research.length)
  const persona = graph.nodes.find((n) => n.data.title === 'Persona')
  assert.ok(into(persona.id).includes('Customer avatar (inferred)'))
  for (const n of graph.nodes.filter((x) => RUNNABLE.has(x.type))) assert.ok(into(n.id).length > 0, `${n.data.title} has upstream context`)
})

test('research text carries the observed facts from the report', () => {
  const blocks = Object.fromEntries(researchBlocks(report).map((b) => [b.key, b.text]))
  assert.match(blocks.snapshot, /https:\/\/fullyloopy\.com\//)
  assert.match(blocks.offer, /\$297/)
  assert.match(blocks.offer, /one-time \/ lifetime/)
  assert.match(blocks.design, /Next\.js/)
  assert.match(blocks.avatar, /Confidence:/)
  assert.ok(!('value' in blocks), 'no value-check card without an evaluation')
  const withEval = researchBlocks({ ...report, evaluation: { verdict: 'new_offer', score: 80, addsValue: true, reasons: ['gap'], mapsTo: [], offerIdea: { name: 'X', promise: 'Y', hooks: ['h'] }, nextSteps: [] } })
  assert.ok(withEval.some((b) => b.key === 'value' && /Verdict: new_offer/.test(b.text)))
})

test('validateBoard catches cycles, bad parents and dangling edges', () => {
  const n = (id, type = 'editor', parentId = null) => ({ id, type, position: { x: 0, y: 0 }, parentId, data: { title: id, category: type === 'group' ? 'structure' : 'generator', content: {} } })
  const g = { nodes: [n('a'), n('b'), n('c', 'editor', 'a')], edges: [{ id: '1', source: 'a', target: 'b' }, { id: '2', source: 'b', target: 'a' }, { id: '3', source: 'a', target: 'zz' }] }
  const errors = validateBoard(g).join('\n')
  assert.match(errors, /cycle/)
  assert.match(errors, /non-group parent/)
  assert.match(errors, /missing node/)
})

test('pushBoard sends the public board API request and explains refusals', async () => {
  const calls = []
  const ok = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ id: 'p1', ok: true }), { status: 200 }) }
  const r = await pushBoard({ token: 'tok_12345678', name: 'n', graph: { nodes: [], edges: [] }, fetchImpl: ok })
  assert.equal(calls[0].url, `${OMNICANVAS_API}/api/v1/boards/tok_12345678`)
  assert.equal(calls[0].init.method, 'PATCH')
  assert.equal(calls[0].init.headers['x-board-token'], 'tok_12345678')
  assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body)), ['name', 'graph'])
  assert.equal(r.boardUrl, 'https://canvas.insightprofit.live/?board=p1')
  const denied = async () => new Response(JSON.stringify({ detail: 'API access is disabled for this board' }), { status: 403 })
  await assert.rejects(pushBoard({ token: 'tok_12345678', name: 'n', graph: { nodes: [], edges: [] }, fetchImpl: denied }), /Turn on "API access"/)
  await assert.rejects(pushBoard({ token: 'bad', name: 'n', graph: {}, fetchImpl: ok }), /board token/)
})
