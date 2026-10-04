import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pairListings, buildMarketplace, isVerified } from '../lib/marketplace.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const SHA = 'a'.repeat(40)
const ENTRY = { name: 'cost-meter', source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0' }, category: 'band', tags: ['cost'] }
const LOCK = {
  name: 'cost-meter', sha: SHA, ref: 'cost-meter--v0.2.0', version: '0.2.0', hooks: ['tool.call'], calls: ['$.ui.toast'], testCount: 3,
  manifest: { description: 'A band.', author: { name: 'Baselane', url: 'https://baselane.sh' }, license: 'MIT' },
  submitter: 'mohammad0omar', listedAt: '2026-10-05', updatedAt: '2026-10-05',
}

test('pairListings pairs entries with locks and warns about the rest', () => {
  const entries = new Map([['cost-meter', ENTRY], ['new', { name: 'new' }]])
  const locks = new Map([['cost-meter', LOCK], ['orphan', { name: 'orphan' }]])
  const { pairs, warnings } = pairListings(entries, locks)
  assert.deepEqual(pairs, [{ entry: ENTRY, lock: LOCK }])
  assert.deepEqual(warnings, ['entries/new.json has no lock file and is not listed', 'lock/orphan.json has no entry and is not listed'])
})

test('buildMarketplace writes the golden marketplace', () => {
  const marketplace = buildMarketplace({ pairs: [{ entry: ENTRY, lock: LOCK }], verified: [{ name: 'cost-meter', sha: SHA, reviewer: 'm', date: '2026-10-05' }], renames: { gone: null } })
  assert.deepEqual(marketplace, {
    name: 'baselane-mods',
    owner: { name: 'Baselane', url: 'https://baselane.sh' },
    description: 'Claude Code mods, checked and pinned. Browse them at https://mods.baselane.sh',
    forceRemoveDeletedPlugins: true,
    renames: { gone: null },
    plugins: [{
      name: 'cost-meter',
      source: { source: 'git-subdir', url: 'baselane-sh/mods', path: 'plugins/cost-meter', ref: 'cost-meter--v0.2.0', sha: SHA },
      description: 'A band.',
      author: { name: 'Baselane', url: 'https://baselane.sh' },
      license: 'MIT',
      homepage: 'https://mods.baselane.sh/mods/cost-meter/',
      repository: 'https://github.com/baselane-sh/mods',
      category: 'band',
      tags: ['cost'],
      metadata: {
        version: '0.2.0', submitter: 'mohammad0omar', verified: true,
        hooks: ['tool.call'], calls: ['$.ui.toast'], gallery: 'https://mods.baselane.sh/mods/cost-meter/',
      },
    }],
  })
})

test('verification is tied to the SHA', () => {
  assert.equal(isVerified('cost-meter', SHA, [{ name: 'cost-meter', sha: 'b'.repeat(40) }]), false)
})

test('a listed name that is also in renames is an error', () => {
  assert.throws(() => buildMarketplace({ pairs: [{ entry: ENTRY, lock: LOCK }], verified: [], renames: { 'cost-meter': null } }), /also in renames\.json/)
})

const SCRIPT = fileURLToPath(new URL('../scripts/publish.mjs', import.meta.url))
const hasClaude = (() => { try { execFileSync('claude', ['--version']); return true } catch { return false } })()

test('the publish script writes a marketplace that claude plugin validate accepts', { skip: !hasClaude && 'claude is not on PATH' }, async () => {
  const root = await writeTree(await tempDir(), {
    'entries/cost-meter.json': ENTRY, 'lock/cost-meter.json': LOCK, 'verified.json': [], 'renames.json': {},
  })
  execFileSync('node', [SCRIPT, root])
  const written = JSON.parse(await readFile(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'))
  assert.equal(written.plugins[0].metadata.verified, false)
  const out = execFileSync('claude', ['plugin', 'validate', root], { encoding: 'utf8' })
  assert.match(out, /Validation passed/)
})
