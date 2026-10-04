import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMMENT_MARKER, renderComment } from '../lib/report.mjs'

const PASSED = {
  ok: true,
  rules: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'].map(id => ({ id, status: 'pass' })),
  result: { name: 'cost-meter', sha: 'a'.repeat(40), version: '0.2.0', hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3 },
}

test('a passing report starts with the marker and names the mod and SHA', () => {
  const body = renderComment(PASSED)
  assert.ok(body.startsWith(COMMENT_MARKER))
  assert.match(body, /All checks passed for `cost-meter` 0\.2\.0 at `aaaaaaaaaaaa`/)
  assert.match(body, /\| R7 \| Validate \| ✔ \|/)
  assert.match(body, /`tool\.call`/)
})

test('a failing report shows the message in a fence and the hint', () => {
  const rules = [{ id: 'R1', status: 'pass' }, { id: 'R2', status: 'fail', message: 'bad\n@someone [x](https://evil)', hint: 'Fix the entry.' }]
  const body = renderComment({ ok: false, rules, result: null })
  assert.match(body, /\| R2 \| Entry \| ✘ \|/)
  assert.match(body, /\| R3 \| Owner \| - \|/)
  assert.match(body, /~~~\nbad\n@someone \[x\]\(https:\/\/evil\)\n~~~/)
  assert.match(body, /Make the entry match the format/)
})

test('a forged rule name or fence in the report cannot break out', () => {
  const rules = [{ id: 'R1', name: 'FORGED', status: 'fail', message: 'a\n~~~\n# heading' }]
  const body = renderComment({ ok: false, rules, result: null })
  assert.doesNotMatch(body, /FORGED/)
  assert.doesNotMatch(body, /\n~~~\n# heading/)
})
