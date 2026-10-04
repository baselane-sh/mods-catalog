import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeLock } from '../lib/lock.mjs'

const RESULT = { name: 'x', sha: 'a'.repeat(40), ref: 'x--v1.0.0', version: '1.0.0', hooks: ['tool.call'], calls: [], testCount: 2, manifest: { description: 'd', author: { name: 'a' }, license: 'MIT' } }

test('a new lock records the submitter and today as both dates', () => {
  assert.deepEqual(makeLock(RESULT, { previous: null, submitter: 'alice', now: '2026-10-05' }), {
    ...RESULT, submitter: 'alice', listedAt: '2026-10-05', updatedAt: '2026-10-05',
  })
})

test('an update keeps the first submitter and listing date', () => {
  const previous = { ...RESULT, submitter: 'alice', listedAt: '2026-01-01', updatedAt: '2026-01-01' }
  const lock = makeLock({ ...RESULT, version: '1.1.0' }, { previous, submitter: 'maintainer', now: '2026-10-05' })
  assert.equal(lock.submitter, 'alice')
  assert.equal(lock.listedAt, '2026-01-01')
  assert.equal(lock.updatedAt, '2026-10-05')
  assert.equal(lock.version, '1.1.0')
})
