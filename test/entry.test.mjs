import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, parseEntryText, validateEntry, sourceRepo, sourcePath } from '../lib/entry.mjs'

const VALID = {
  name: 'cost-meter',
  source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' },
  category: 'band',
  tags: ['cost', 'usage'],
  screenshots: ['docs/band.png'],
}
const withChange = change => ({ ...VALID, ...change })
const errorsFor = (entry, file = 'cost-meter.json') => validateEntry(entry, file)

test('a valid entry has no errors', () => {
  assert.deepEqual(errorsFor(VALID), [])
})

test('a github source with only repo and ref is valid', () => {
  assert.deepEqual(errorsFor(withChange({ source: { source: 'github', repo: 'acme/cost-meter', ref: 'v1.0.0' } })), [])
})

test('the categories list matches the spec', () => {
  assert.deepEqual([...CATEGORIES], ['guard', 'pane', 'band', 'command', 'sound', 'style', 'stats', 'nudge', 'lifecycle', 'render'])
})

test('the file name must equal the entry name', () => {
  assert.match(errorsFor(VALID, 'other.json').join(), /file name must be cost-meter\.json/)
})

test('unknown top-level fields are refused', () => {
  assert.match(errorsFor(withChange({ version: '1.0.0' })).join(), /not allowed: version/)
})

test('an author-set sha is refused with a clear message', () => {
  const source = { ...VALID.source, sha: 'a'.repeat(40) }
  assert.match(errorsFor(withChange({ source })).join(), /sha is set by the catalog/)
})

test('a source that is not on github.com is refused', () => {
  const source = { source: 'url', url: 'https://gitlab.com/a/b.git', ref: 'v1' }
  assert.match(errorsFor(withChange({ source })).join(), /git-subdir" or "github/)
})

test('a git-subdir path that leaves the repo is refused', () => {
  for (const path of ['../x', '/abs', 'a/../../b', '']) {
    assert.match(errorsFor(withChange({ source: { ...VALID.source, path } })).join(), /relative path/, path)
  }
})

test('a missing ref is refused', () => {
  const { ref, ...source } = VALID.source
  assert.match(errorsFor(withChange({ source })).join(), /ref must be the tag/)
})

test('a category outside the list is refused', () => {
  assert.match(errorsFor(withChange({ category: 'games' })).join(), /category must be one of/)
})

test('tags must be at most 8 unique valid items', () => {
  for (const tags of [Array.from({ length: 9 }, (_, i) => `t${i}`), ['Cost'], ['a'], ['x', 'x'], 'cost']) {
    assert.match(errorsFor(withChange({ tags })).join(), /tags must be/, JSON.stringify(tags))
  }
})

test('screenshots must be at most 6 relative image paths', () => {
  for (const screenshots of [['a.svg'], ['../a.png'], Array.from({ length: 7 }, (_, i) => `s${i}.png`)]) {
    assert.match(errorsFor(withChange({ screenshots })).join(), /screenshots must be/, JSON.stringify(screenshots))
  }
})

test('an entry that is not an object gives one clear error', () => {
  for (const value of [null, [], 'text', 3]) assert.deepEqual(validateEntry(value, 'x.json'), ['the entry must be a JSON object'])
})

test('parseEntryText reports bad JSON without throwing', () => {
  for (const text of ['{"name": "a",}', '﻿{"name":"a"}', '', null]) {
    const { entry, error } = parseEntryText(text)
    assert.equal(entry, null)
    assert.match(error, /not valid JSON|is missing/)
  }
})

test('parseEntryText returns the object for valid JSON', () => {
  assert.deepEqual(parseEntryText(JSON.stringify(VALID)), { entry: VALID, error: null })
})

test('sourceRepo and sourcePath read both source types', () => {
  assert.equal(sourceRepo(VALID.source), 'baselane-sh/mods')
  assert.equal(sourcePath(VALID.source), 'plugins/cost-meter')
  const github = { source: 'github', repo: 'acme/x', ref: 'v1' }
  assert.equal(sourceRepo(github), 'acme/x')
  assert.equal(sourcePath(github), '.')
})
