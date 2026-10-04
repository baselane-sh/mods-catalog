import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateReport, prMatchesRun, verifyForMerge, changedFilesFromApi } from '../lib/merge.mjs'

const HEAD = 'c'.repeat(40)
const SHA = 'a'.repeat(40)
const REPORT = {
  ok: true, prNumber: 7, headSha: HEAD, prAuthor: 'alice',
  rules: [{ id: 'R1', status: 'pass' }],
  result: { name: 'xmod', sha: SHA, ref: 'v1', version: '1.0.0', hooks: ['tool.call'], calls: [], testCount: 1, manifest: { description: 'd', author: { name: 'a' }, license: 'MIT' } },
}
const PR = { state: 'open', head: { sha: HEAD }, user: { login: 'alice' } }

test('a well-formed report has no shape errors', () => {
  assert.deepEqual(validateReport(REPORT), [])
  assert.deepEqual(validateReport({ ...REPORT, ok: false, result: null }), [])
})

test('a malformed report is refused', () => {
  const cases = [null, [], { ...REPORT, headSha: 'short' }, { ...REPORT, prNumber: '7' }, { ...REPORT, result: { ...REPORT.result, sha: 'x' } },
    { ...REPORT, result: { ...REPORT.result, name: '../x' } }, { ...REPORT, result: { ...REPORT.result, testCount: 0 } },
    { ...REPORT, result: { ...REPORT.result, hooks: 'tool.call' } }, { ...REPORT, result: { ...REPORT.result, version: 'one' } }]
  for (const report of cases) assert.ok(validateReport(report).length > 0, JSON.stringify(report))
})

test('prMatchesRun needs the PR head to be the checked commit', () => {
  assert.equal(prMatchesRun(PR, HEAD), true)
  assert.equal(prMatchesRun({ ...PR, head: { sha: 'd'.repeat(40) } }, HEAD), false)
})

const passed = (change = {}) => ({ ok: true, rules: [], result: { ...REPORT.result, ...change } })
const good = change => ({ report: REPORT, pr: PR, recomputed: passed(), ...change })

test('changedFilesFromApi maps GitHub file statuses', () => {
  assert.deepEqual(changedFilesFromApi([{ filename: 'entries/a.json', status: 'added' }, { filename: 'b', status: 'removed' }]),
    [{ status: 'A', path: 'entries/a.json' }, { status: 'D', path: 'b' }])
})

test('a good PR verifies with no errors', () => {
  assert.deepEqual(verifyForMerge(good()), [])
})

test('each broken condition stops the merge', () => {
  const cases = {
    closed: { pr: { ...PR, state: 'closed' } },
    'new commit': { pr: { ...PR, head: { sha: 'd'.repeat(40) } } },
    'failed report': { report: { ...REPORT, ok: false } },
    'rule fails at merge': { recomputed: { ok: false, rules: [{ id: 'R1', name: 'Scope', status: 'fail', message: 'two files' }], result: null } },
    'tag moved after the tests': { recomputed: passed({ sha: 'b'.repeat(40) }) },
  }
  for (const [label, change] of Object.entries(cases)) {
    assert.ok(verifyForMerge(good(change)).length > 0, label)
  }
})
