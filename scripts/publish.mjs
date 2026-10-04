#!/usr/bin/env node
// Writes .claude-plugin/marketplace.json from entries/, lock/, verified.json and renames.json.
// Reads only files in the repo; needs no network.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pairListings, buildMarketplace } from '../lib/marketplace.mjs'

const root = path.resolve(process.argv[2] ?? '.')

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`publish: cannot read ${path.relative(root, file)}: ${error.message}`)
  }
}

async function readJsonDir(dir) {
  const names = await readdir(path.join(root, dir)).catch(() => [])
  const pairs = await Promise.all(names.filter(n => n.endsWith('.json'))
    .map(async n => [path.basename(n, '.json'), await readJson(path.join(root, dir, n))]))
  return new Map(pairs)
}

const { pairs, warnings } = pairListings(await readJsonDir('entries'), await readJsonDir('lock'))
for (const warning of warnings) console.warn(`publish: ${warning}`)
const marketplace = buildMarketplace({
  pairs,
  verified: await readJson(path.join(root, 'verified.json')),
  renames: await readJson(path.join(root, 'renames.json')),
})
await mkdir(path.join(root, '.claude-plugin'), { recursive: true })
await writeFile(path.join(root, '.claude-plugin', 'marketplace.json'), `${JSON.stringify(marketplace, null, 2)}\n`)
console.log(`publish: ${marketplace.plugins.length} mods listed`)
