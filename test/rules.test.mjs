import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RULES, runRules } from '../lib/rules.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const SHA = 'a'.repeat(40)
const MANIFEST = { name: 'cost-meter', version: '0.2.0', description: 'A band.', author: { name: 'Baselane' }, license: 'MIT' }
const ENTRY = {
  name: 'cost-meter',
  source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' },
  category: 'band',
}
const VALIDATE_OK = '  ❯ ./register.ts hooks: tool.call\n  ❯ ./register.ts calls: $.ui.toast\n\n✔ Validation passed\n'
const TEST_OK = ' 3 pass\n 0 fail\nRan 3 tests across 1 files.\n'
const LOCK = { name: 'cost-meter', version: '0.1.0', submitter: 'alice' }

async function checkout({ manifest = MANIFEST, hooks = true } = {}) {
  const files = { 'plugins/cost-meter/.claude-plugin/plugin.json': manifest }
  if (hooks) files['plugins/cost-meter/hooks/hooks.json'] = { modules: ['./register.js'] }
  return writeTree(await tempDir(), files)
}

const makeIo = (root, change = {}) => ({
  repoUrl: repo => `https://github.com/${repo}.git`,
  resolveTag: async () => SHA,
  fetchMod: async () => root,
  validate: async () => ({ code: 0, output: VALIDATE_OK }),
  test: async () => ({ code: 0, output: TEST_OK }),
  checkShape: async () => [],
  ...change,
})

const makeInput = (change = {}) => ({
  changedFiles: [{ status: 'A', path: 'entries/cost-meter.json' }],
  entryText: JSON.stringify(ENTRY),
  prAuthor: 'alice',
  listedNames: [],
  renamedNames: [],
  lockOnMain: null,
  ...change,
})

const statuses = report => Object.fromEntries(report.rules.map(rule => [rule.id, rule.status]))
const failed = report => report.rules.find(rule => rule.status === 'fail')

test('RULES run in the order R1 to R10', () => {
  assert.deepEqual(RULES.map(rule => rule.id), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'])
})

test('a good new entry passes every rule and returns the result', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout()))
  assert.equal(report.ok, true)
  assert.deepEqual(report.result, {
    name: 'cost-meter', sha: SHA, ref: 'cost-meter--v0.2.0', version: '0.2.0',
    hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3,
    manifest: { description: 'A band.', author: { name: 'Baselane' }, license: 'MIT' },
  })
})

test('a failure stops the run and skips the later rules', async () => {
  const report = await runRules(makeInput({ changedFiles: [{ status: 'A', path: 'entries/a.json' }, { status: 'A', path: 'entries/b.json' }] }), makeIo(await checkout()))
  assert.equal(report.ok, false)
  assert.equal(report.result, null)
  assert.equal(statuses(report).R1, 'fail')
  assert.ok(RULES.slice(1).every(rule => statuses(report)[rule.id] === 'skip'))
  assert.match(failed(report).hint, /exactly one file/)
})

test('R1 refuses a removal and a file outside entries/', async () => {
  const root = await checkout()
  for (const file of [{ status: 'D', path: 'entries/cost-meter.json' }, { status: 'M', path: 'lock/cost-meter.json' }]) {
    const report = await runRules(makeInput({ changedFiles: [file] }), makeIo(root))
    assert.equal(failed(report).id, 'R1', file.path)
  }
})

test('R2 refuses bad JSON and a bad entry', async () => {
  const root = await checkout()
  for (const entryText of ['{"name":', JSON.stringify({ ...ENTRY, category: 'games' })]) {
    assert.equal(failed(await runRules(makeInput({ entryText }), makeIo(root))).id, 'R2')
  }
})

test('R2 refuses a new name that clashes with a listed or removed name', async () => {
  const root = await checkout()
  assert.equal(failed(await runRules(makeInput({ listedNames: ['costmeter'] }), makeIo(root))).id, 'R2')
  assert.equal(failed(await runRules(makeInput({ renamedNames: ['cost_meter'] }), makeIo(root))).id, 'R2')
})

test('R2 lets an existing entry keep its own name', async () => {
  const report = await runRules(makeInput({ listedNames: ['cost-meter'], lockOnMain: LOCK }), makeIo(await checkout()))
  assert.equal(report.ok, true)
})

test('R3 refuses an update by someone other than the submitter', async () => {
  const report = await runRules(makeInput({ prAuthor: 'mallory', lockOnMain: LOCK }), makeIo(await checkout()))
  assert.equal(failed(report).id, 'R3')
  assert.match(failed(report).message, /belongs to alice/)
})

test('R4 refuses a missing tag and an unreadable repo', async () => {
  const root = await checkout()
  assert.equal(failed(await runRules(makeInput(), makeIo(root, { resolveTag: async () => null }))).id, 'R4')
  const unreadable = makeIo(root, { resolveTag: async () => { throw new Error('auth') } })
  assert.match(failed(await runRules(makeInput(), unreadable)).message, /must be a public repo/)
})

test('R4 fetches the resolved SHA at the tag', async () => {
  const root = await checkout()
  let args
  await runRules(makeInput(), makeIo(root, { fetchMod: async (...a) => { args = a; return root } }))
  assert.deepEqual(args, ['https://github.com/baselane-sh/mods.git', 'cost-meter--v0.2.0', SHA])
})

test('R5 refuses a manifest with a wrong name, version, description, author or license', async () => {
  const cases = [
    { ...MANIFEST, name: 'other' },
    { ...MANIFEST, version: '1.0' },
    { ...MANIFEST, description: 'x'.repeat(201) },
    { ...MANIFEST, author: undefined },
    { ...MANIFEST, license: '' },
  ]
  for (const manifest of cases) {
    const report = await runRules(makeInput(), makeIo(await checkout({ manifest })))
    assert.equal(failed(report).id, 'R5', JSON.stringify(manifest))
  }
})

test('R5 refuses a missing plugin.json', async () => {
  const root = await tempDir()
  assert.match(failed(await runRules(makeInput(), makeIo(root))).message, /plugin\.json does not exist/)
})

test('R6 refuses a plugin without hooks/hooks.json', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout({ hooks: false })))
  assert.equal(failed(report).id, 'R6')
})

test('R7 refuses a failed validation and one with no hooks', async () => {
  const root = await checkout()
  const failing = makeIo(root, { validate: async () => ({ code: 1, output: '✘ Validation failed\n' }) })
  assert.equal(failed(await runRules(makeInput(), failing)).id, 'R7')
  const noHooks = makeIo(root, { validate: async () => ({ code: 0, output: '✔ Validation passed\n' }) })
  assert.match(failed(await runRules(makeInput(), noHooks)).message, /no hooks/)
})

test('R8 reports the shape errors', async () => {
  const report = await runRules(makeInput(), makeIo(await checkout(), { checkShape: async () => ['too big'] }))
  assert.equal(failed(report).id, 'R8')
  assert.equal(failed(report).message, 'too big')
})

test('R9 refuses failed tests and zero tests', async () => {
  const root = await checkout()
  const failing = makeIo(root, { test: async () => ({ code: 1, output: ' 1 pass\n 1 fail\nRan 2 tests across 1 files.\n' }) })
  assert.equal(failed(await runRules(makeInput(), failing)).id, 'R9')
  const none = makeIo(root, { test: async () => ({ code: 0, output: 'Ran 0 tests across 0 files.\n' }) })
  assert.match(failed(await runRules(makeInput(), none)).message, /no tests ran/)
})

test('R10 needs a higher version than the listed one', async () => {
  const root = await checkout()
  for (const version of ['0.2.0', '0.3.0-beta.1']) {
    const report = await runRules(makeInput({ lockOnMain: { ...LOCK, version } }), makeIo(root))
    assert.equal(failed(report).id, 'R10', version)
  }
  const higher = await runRules(makeInput({ lockOnMain: { ...LOCK, version: '0.1.9' } }), makeIo(root))
  assert.equal(higher.ok, true)
})

test('an unexpected IO error fails the current rule instead of crashing', async () => {
  const io = makeIo(await checkout(), { test: async () => { throw new Error('spawn claude ENOENT') } })
  const report = await runRules(makeInput(), io)
  assert.equal(failed(report).id, 'R9')
  assert.match(failed(report).message, /internal error: spawn claude ENOENT/)
})

test('R3 refuses a change to an entry that has no lock', async () => {
  const input = makeInput({ changedFiles: [{ status: 'M', path: 'entries/cost-meter.json' }], listedNames: [] })
  const report = await runRules(input, makeIo(await checkout()))
  assert.equal(failed(report).id, 'R3')
  assert.match(failed(report).message, /has no lock/)
})

test('a skipped rule does not run, and its count comes from the option', async () => {
  let ran = false
  const io = makeIo(await checkout(), { test: async () => { ran = true; return { code: 1, output: '' } } })
  const report = await runRules(makeInput(), io, { skip: ['R9'], testCount: 5 })
  assert.equal(ran, false)
  assert.equal(report.ok, true)
  assert.equal(report.rules.find(rule => rule.id === 'R9').status, 'skip')
  assert.equal(report.result.testCount, 5)
})

test('only https homepage and repository URLs reach the result', async () => {
  const manifest = { ...MANIFEST, homepage: 'javascript:alert(1)', repository: 'https://github.com/a/b' }
  const report = await runRules(makeInput(), makeIo(await checkout({ manifest })))
  assert.equal(report.result.manifest.homepage, undefined)
  assert.equal(report.result.manifest.repository, 'https://github.com/a/b')
})
