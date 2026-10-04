import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { repoUrl, resolveTag, fetchTag } from '../lib/git.mjs'
import { tempDir, writeTree, makeGitRepo } from './helpers.mjs'

async function repoWithTags() {
  const repo = await makeGitRepo()
  await writeTree(repo.dir, { 'a.txt': 'one' })
  repo.run(['add', '.'])
  repo.run(['commit', '-qm', 'one'])
  const first = repo.run(['rev-parse', 'HEAD']).trim()
  repo.run(['tag', 'light-v1'])
  repo.run(['tag', '-a', 'annotated-v1', '-m', 'v1'])
  repo.run(['branch', 'branch-only'])
  await writeTree(repo.dir, { 'a.txt': 'two' })
  repo.run(['commit', '-qam', 'two'])
  const second = repo.run(['rev-parse', 'HEAD']).trim()
  return { ...repo, first, second }
}

test('repoUrl builds a github.com URL by default', () => {
  assert.equal(repoUrl('acme/x'), 'https://github.com/acme/x.git')
  assert.equal(repoUrl('acme/x', 'file:///tmp/git/'), 'file:///tmp/git/acme/x.git')
})

test('a lightweight tag resolves to its commit', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'light-v1'), repo.first)
})

test('an annotated tag resolves to its commit, not the tag object', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'annotated-v1'), repo.first)
})

test('a branch name or a missing tag resolves to null', async () => {
  const repo = await repoWithTags()
  assert.equal(await resolveTag(repo.url, 'branch-only'), null)
  assert.equal(await resolveTag(repo.url, 'main'), null)
  assert.equal(await resolveTag(repo.url, 'nope'), null)
})

test('a repo that cannot be read rejects', async () => {
  await assert.rejects(resolveTag('file:///does/not/exist', 'v1'))
})

test('fetchTag checks out the tagged commit', async () => {
  const repo = await repoWithTags()
  const dest = await tempDir('fetch-')
  await fetchTag(repo.url, 'annotated-v1', repo.first, dest)
  assert.equal(await readFile(path.join(dest, 'a.txt'), 'utf8'), 'one')
})

test('fetchTag rejects when the tag moved away from the checked SHA', async () => {
  const repo = await repoWithTags()
  const dest = await tempDir('fetch-')
  await assert.rejects(fetchTag(repo.url, 'light-v1', repo.second, dest), /now points to/)
})
