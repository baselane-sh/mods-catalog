import { test } from 'node:test'
import assert from 'node:assert/strict'
import { symlink, truncate, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { checkShape, MAX_PLUGIN_BYTES, MAX_SCREENSHOT_BYTES } from '../lib/shape.mjs'
import { tempDir, writeTree } from './helpers.mjs'

const smallMod = async () => writeTree(await tempDir(), { 'hooks/hooks.json': '{}', 'docs/shot.png': 'png' })

test('a small mod with a real screenshot passes', async () => {
  assert.deepEqual(await checkShape(await smallMod(), ['docs/shot.png']), [])
})

test('a mod over 10 MB fails', async () => {
  const dir = await smallMod()
  await writeTree(dir, { 'big.bin': '' })
  await truncate(path.join(dir, 'big.bin'), MAX_PLUGIN_BYTES + 1)
  assert.match((await checkShape(dir)).join(), /limit is 10 MB/)
})

test('a top-level bin folder fails', async () => {
  const dir = await smallMod()
  await mkdir(path.join(dir, 'bin'))
  assert.match((await checkShape(dir)).join(), /top-level bin/)
})

test('a symlink that leaves the mod fails, one inside it passes', async () => {
  const dir = await smallMod()
  await symlink('docs/shot.png', path.join(dir, 'inside.png'))
  assert.deepEqual(await checkShape(dir), [])
  await symlink('../../etc', path.join(dir, 'outside'))
  assert.match((await checkShape(dir)).join(), /outside points outside the mod/)
})

test('a missing or large screenshot fails', async () => {
  const dir = await smallMod()
  assert.match((await checkShape(dir, ['docs/none.png'])).join(), /does not exist/)
  await truncate(path.join(dir, 'docs/shot.png'), MAX_SCREENSHOT_BYTES + 1)
  assert.match((await checkShape(dir, ['docs/shot.png'])).join(), /over 2 MB/)
})

test('a .git folder at the root does not count toward the size', async () => {
  const dir = await smallMod()
  await writeTree(dir, { '.git/big': '' })
  await truncate(path.join(dir, '.git/big'), MAX_PLUGIN_BYTES + 1)
  assert.deepEqual(await checkShape(dir), [])
})
