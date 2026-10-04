import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { splitTopLevel, parseValidate, parseTestRun, runClaude } from '../lib/claude-cli.mjs'

const VALIDATE_TWO_MODULES = `Validating hooks: /x/hooks/hooks.json

  ❯ ./register.ts hooks: tool.call, session.start, command.run{command=?}, ui.render{component=AbovePrompt}
  ❯ ./register.ts calls: $.clock.every, $.session.usage, $.ui.toast
  ❯ ./register.ts state writes: cost-meter.reading
  ❯ ./extra.ts hooks: tool.call, ui.render{component=Pane,requestId=x}
  ❯ ./extra.ts calls: $.process.run

✔ Validation passed
`
const VALIDATE_FAILED = `
  ❯ modules../missing.js: empty: /x/hooks/missing.js: no such file

✘ Validation failed
`

test('splitTopLevel keeps commas inside braces', () => {
  assert.deepEqual(splitTopLevel('a, b{c=1,d=2}, e'), ['a', 'b{c=1,d=2}', 'e'])
})

test('parseValidate merges hooks and calls from every module, sorted and unique', () => {
  assert.deepEqual(parseValidate(VALIDATE_TWO_MODULES), {
    passed: true,
    hooks: ['command.run{command=?}', 'session.start', 'tool.call', 'ui.render{component=AbovePrompt}', 'ui.render{component=Pane,requestId=x}'],
    calls: ['$.clock.every', '$.process.run', '$.session.usage', '$.ui.toast'],
  })
})

test('parseValidate reports a failed validation', () => {
  assert.deepEqual(parseValidate(VALIDATE_FAILED), { passed: false, hooks: [], calls: [] })
})

test('parseTestRun reads the totals', () => {
  assert.deepEqual(parseTestRun(' 11 pass\n 0 fail\nRan 11 tests across 2 files. [0.47s]\n'), { total: 11, failed: 0 })
  assert.deepEqual(parseTestRun(' 2 pass\n 1 fail\nRan 3 tests across 1 files.\n'), { total: 3, failed: 1 })
  assert.deepEqual(parseTestRun(' 1 pass\n 0 fail\nRan 1 test across 1 file.\n'), { total: 1, failed: 0 })
  assert.deepEqual(parseTestRun('claude plugin test: no *.test.ts or *.test.tsx under /x'), { total: 0, failed: 0 })
})

const hasClaude = spawnSync('claude', ['--version']).status === 0
const FIXTURE = fileURLToPath(new URL('./fixtures/mods/no-em-dash', import.meta.url))

test('the real claude CLI validates and tests the fixture mod', { skip: !hasClaude && 'claude is not on PATH' }, async () => {
  const validate = await runClaude(['plugin', 'validate', FIXTURE])
  assert.equal(validate.code, 0, validate.output)
  const parsed = parseValidate(validate.output)
  assert.ok(parsed.passed)
  assert.ok(parsed.hooks.length > 0)
  const run = await runClaude(['plugin', 'test', FIXTURE])
  assert.equal(run.code, 0, run.output)
  assert.ok(parseTestRun(run.output).total > 0)
})

test('parseValidate drops the "nothing on $" placeholder', () => {
  const out = '  ❯ ./register.ts hooks: tool.call\n  ❯ ./register.ts calls: nothing on $\n\n✔ Validation passed\n'
  assert.deepEqual(parseValidate(out).calls, [])
})
