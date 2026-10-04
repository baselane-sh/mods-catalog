import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSemver, compareSemver } from '../lib/semver.mjs'

test('compareSemver orders release versions numerically', () => {
  assert.equal(compareSemver('0.2.0', '0.1.9'), 1)
  assert.equal(compareSemver('1.10.0', '1.9.0'), 1)
  assert.equal(compareSemver('1.0.0', '1.0.0'), 0)
  assert.equal(compareSemver('1.0.0', '1.0.1'), -1)
})

test('a prerelease is lower than its release', () => {
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0'), -1)
  assert.equal(compareSemver('1.0.0', '1.0.0-beta.2'), 1)
})

test('prerelease identifiers compare numerically, then by text', () => {
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0-beta.10'), -1)
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-beta'), -1)
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-alpha.1'), -1)
  assert.equal(compareSemver('1.0.0-1', '1.0.0-alpha'), -1)
})

test('build metadata is ignored', () => {
  assert.equal(compareSemver('1.0.0+abc', '1.0.0'), 0)
})

test('parseSemver refuses strings that are not semver', () => {
  for (const bad of ['1.0', 'v1.0.0', '01.0.0', '1.0.0.0', '', undefined]) assert.equal(parseSemver(bad), null)
})

test('compareSemver throws on a version that is not semver', () => {
  assert.throws(() => compareSemver('1.0', '1.0.0'), /not a semver: 1\.0/)
})
