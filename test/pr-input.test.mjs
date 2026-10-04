import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { gatherInput } from '../lib/pr-input.mjs'
import { makeGitRepo, writeTree } from './helpers.mjs'

async function catalog() {
  const repo = await makeGitRepo()
  await writeTree(repo.dir, {
    'renames.json': { gone: null },
    'entries/old.json': { name: 'old' },
    'lock/old.json': { name: 'old', version: '1.0.0', submitter: 'bob' },
  })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'base'])
  const base = repo.run(['rev-parse', 'HEAD']).trim()
  const gitText = args => execFileSync('git', ['-C', repo.dir, ...args], { encoding: 'utf8' })
  return { repo, base, gitText }
}

test('a new entry: one added file, its text, the listed and removed names, no lock', async () => {
  const { repo, base, gitText } = await catalog()
  await writeTree(repo.dir, { 'entries/new.json': '{"name":"new"}' })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'add new'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  assert.deepEqual(gatherInput({ base, head, author: 'carol' }, gitText), {
    changedFiles: [{ status: 'A', path: 'entries/new.json' }],
    entryText: '{"name":"new"}',
    prAuthor: 'carol',
    listedNames: ['old'],
    renamedNames: ['gone'],
    lockOnMain: null,
  })
})

test('an update reads the lock from the base commit', async () => {
  const { repo, base, gitText } = await catalog()
  await writeTree(repo.dir, { 'entries/old.json': { name: 'old', category: 'band' } })
  repo.run(['commit', '-qam', 'update old'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  const input = gatherInput({ base, head, author: 'bob' }, gitText)
  assert.deepEqual(input.changedFiles, [{ status: 'M', path: 'entries/old.json' }])
  assert.deepEqual(input.lockOnMain, { name: 'old', version: '1.0.0', submitter: 'bob' })
})

test('a removal has no entry text', async () => {
  const { repo, base, gitText } = await catalog()
  repo.run(['rm', '-q', 'entries/old.json'])
  repo.run(['commit', '-qm', 'remove'])
  const head = repo.run(['rev-parse', 'HEAD']).trim()
  const input = gatherInput({ base, head, author: 'bob' }, gitText)
  assert.deepEqual(input.changedFiles, [{ status: 'D', path: 'entries/old.json' }])
  assert.equal(input.entryText, null)
})
