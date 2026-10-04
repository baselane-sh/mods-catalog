import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateReport, prMatchesRun, verifyForMerge } from '../lib/merge.mjs'

const HEAD = 'c'.repeat(40)
const SHA = 'a'.repeat(40)
const REPORT = {
  ok: true, prNumber: 7, headSha: HEAD, prAuthor: 'alice',
  rules: [{ id: 'R1', status: 'pass' }],
  result: { name: 'xmod', sha: SHA, ref: 'v1', version: '1.0.0', hooks: ['tool.call'], calls: [], testCount: 1, manifest: { description: 'd', author: { name: 'a' }, license: 'MIT' } },
}
const PR = { state: 'open', head: { sha: HEAD }, user: { login: 'alice' } }
const FILES = [{ filename: 'entries/xmod.json', status: 'added' }]
const ENTRY = { name: 'xmod', source: { source: 'github', repo: 'alice/xmod', ref: 'v1' }, category: 'band' }
const good = change => ({ report: REPORT, pr: PR, files: FILES, entry: ENTRY, lsRemoteSha: SHA, lockOnMain: null, ...change })

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

test('a good PR verifies with no errors', () => {
  assert.deepEqual(verifyForMerge(good()), [])
})

test('each broken condition stops the merge', () => {
  const cases = {
    closed: { pr: { ...PR, state: 'closed' } },
    'new commit': { pr: { ...PR, head: { sha: 'd'.repeat(40) } } },
    'two files': { files: [...FILES, { filename: 'entries/y.json', status: 'added' }] },
    'workflow file': { files: [{ filename: '.github/workflows/check.yml', status: 'modified' }] },
    'other entry': { files: [{ filename: 'entries/y.json', status: 'added' }] },
    removal: { files: [{ filename: 'entries/xmod.json', status: 'removed' }] },
    'tag moved': { lsRemoteSha: 'b'.repeat(40) },
    'tag gone': { lsRemoteSha: null },
    'ref differs': { entry: { ...ENTRY, source: { ...ENTRY.source, ref: 'v2' } } },
    'name differs': { entry: { ...ENTRY, name: 'y' } },
    'other owner': { lockOnMain: { name: 'xmod', version: '0.9.0', submitter: 'bob' } },
    'no version bump': { lockOnMain: { name: 'xmod', version: '1.0.0', submitter: 'alice' } },
    'failed report': { report: { ...REPORT, ok: false } },
  }
  for (const [label, change] of Object.entries(cases)) {
    assert.ok(verifyForMerge(good(change)).length > 0, label)
  }
})
