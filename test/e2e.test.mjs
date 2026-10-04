import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeLock } from '../lib/lock.mjs'
import { tempDir, writeTree, makeGitRepo } from './helpers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(here, 'fixtures/mods/no-em-dash')
const SCRIPTS = path.join(here, '../scripts')
const hasClaude = spawnSync('claude', ['--version']).status === 0

async function authorRepo(gitBase) {
  const version = JSON.parse(await readFile(path.join(FIXTURE, '.claude-plugin/plugin.json'), 'utf8')).version
  const author = await makeGitRepo(path.join(gitBase, 'acme/mods.git'))
  await cp(FIXTURE, path.join(author.dir, 'plugins/no-em-dash'), { recursive: true })
  author.run(['add', '.'])
  author.run(['commit', '-qm', 'add mod'])
  author.run(['tag', `no-em-dash--v${version}`])
  return { version, tag: `no-em-dash--v${version}` }
}

async function catalogWithPr(tag) {
  const catalog = await makeGitRepo()
  await writeTree(catalog.dir, { 'renames.json': {}, 'verified.json': [] })
  catalog.run(['add', '.'])
  catalog.run(['commit', '-qm', 'base'])
  const base = catalog.run(['rev-parse', 'HEAD']).trim()
  const entry = { name: 'no-em-dash', source: { source: 'git-subdir', url: 'acme/mods', path: 'plugins/no-em-dash', ref: tag }, category: 'guard' }
  await writeTree(catalog.dir, { 'entries/no-em-dash.json': entry })
  catalog.run(['add', '.'])
  catalog.run(['commit', '-qm', 'submit'])
  return { catalog, base, head: catalog.run(['rev-parse', 'HEAD']).trim() }
}

test('a submitted mod is checked, locked, published and installable', { skip: !hasClaude && 'claude is not on PATH', timeout: 300_000 }, async () => {
  const gitBase = await tempDir('git-')
  const { version, tag } = await authorRepo(gitBase)
  const { catalog, base, head } = await catalogWithPr(tag)
  const env = { ...process.env, MODS_CATALOG_GIT_BASE: `file://${gitBase}/`, PR_NUMBER: '1', PR_AUTHOR: 'alice', BASE_SHA: base, HEAD_SHA: head }

  execFileSync('node', [path.join(SCRIPTS, 'check-pr.mjs'), 'report.json'], { cwd: catalog.dir, env, stdio: 'pipe' })
  const report = JSON.parse(await readFile(path.join(catalog.dir, 'report.json'), 'utf8'))
  assert.equal(report.ok, true)
  assert.equal(report.result.version, version)

  const lock = makeLock(report.result, { previous: null, submitter: 'alice', now: '2026-10-05' })
  await mkdir(path.join(catalog.dir, 'lock'), { recursive: true })
  await writeFile(path.join(catalog.dir, 'lock/no-em-dash.json'), JSON.stringify(lock))
  execFileSync('node', [path.join(SCRIPTS, 'publish.mjs'), catalog.dir])

  // Point the published entry at the local author repo so the install needs no network.
  const file = path.join(catalog.dir, '.claude-plugin/marketplace.json')
  const marketplace = JSON.parse(await readFile(file, 'utf8'))
  marketplace.plugins[0].source.url = `file://${gitBase}/acme/mods.git`
  await writeFile(file, JSON.stringify(marketplace))

  const home = await tempDir('home-')
  const claudeEnv = { PATH: process.env.PATH, HOME: home, DISABLE_AUTOUPDATER: '1' }
  execFileSync('claude', ['plugin', 'marketplace', 'add', catalog.dir], { env: claudeEnv })
  execFileSync('claude', ['plugin', 'install', 'no-em-dash@baselane-mods'], { env: claudeEnv })
  const list = execFileSync('claude', ['plugin', 'list'], { env: claudeEnv, encoding: 'utf8' })
  assert.match(list, /no-em-dash@baselane-mods/)
})
