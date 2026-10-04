// Loads the catalog (entries, locks, verified list) and enriches each mod with what the
// site shows: capabilities, README at the locked SHA, GitHub stars and version history.
// Network and git access come in through `io`, so tests can run offline.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pairListings, isVerified } from '../../lib/marketplace.mjs'
import { sourceRepo, sourcePath } from '../../lib/entry.mjs'
import { capabilities, topRisk } from './capabilities.mjs'

async function readJsonDir(root, dir) {
  const names = await readdir(path.join(root, dir)).catch(() => [])
  const pairs = await Promise.all(names.filter(n => n.endsWith('.json'))
    .map(async n => [path.basename(n, '.json'), JSON.parse(await readFile(path.join(root, dir, n), 'utf8'))]))
  return new Map(pairs)
}

// Width follows the longer jack row, like a real module: more jacks, more HP.
function hpFor(widestRow) {
  if (widestRow <= 2) return 6
  if (widestRow <= 3) return 8
  if (widestRow <= 5) return 10
  return 12
}

const joinPath = (...parts) => parts.filter(part => part && part !== '.').join('/')

function toMod({ entry, lock }, verified) {
  const repo = sourceRepo(entry.source)
  const dir = sourcePath(entry.source)
  const caps = capabilities(lock)
  const author = typeof lock.manifest.author === 'string' ? { name: lock.manifest.author } : lock.manifest.author
  return {
    name: entry.name,
    description: lock.manifest.description,
    author,
    license: lock.manifest.license,
    version: lock.version,
    category: entry.category,
    tags: entry.tags ?? [],
    screenshots: entry.screenshots ?? [],
    verified: isVerified(entry.name, lock.sha, verified),
    sha: lock.sha,
    ref: lock.ref,
    repo,
    dir,
    submitter: lock.submitter,
    listedAt: lock.listedAt,
    updatedAt: lock.updatedAt,
    hooks: lock.hooks,
    calls: lock.calls,
    caps,
    risk: topRisk(caps),
    hp: hpFor(Math.max(caps.inputs.length, caps.outputs.length)),
    rawBase: `https://raw.githubusercontent.com/${repo}/${lock.sha}/${joinPath(dir)}${dir === '.' ? '' : '/'}`,
    blobBase: `https://github.com/${repo}/blob/${lock.sha}/${joinPath(dir)}${dir === '.' ? '' : '/'}`,
    sourceUrl: `https://github.com/${repo}/tree/${lock.sha}/${joinPath(dir)}`,
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export async function loadCatalog(root, io) {
  const { pairs, warnings } = pairListings(await readJsonDir(root, 'entries'), await readJsonDir(root, 'lock'))
  const verified = JSON.parse(await readFile(path.join(root, 'verified.json'), 'utf8'))
  const base = pairs.map(pair => toMod(pair, verified))
  const repos = [...new Set(base.map(mod => mod.repo))]
  const starList = await mapLimit(repos, 4, repo => io.stars(repo).catch(() => null))
  const stars = new Map(repos.map((repo, i) => [repo, starList[i]]))
  const mods = await mapLimit(base, 8, async mod => ({
    ...mod,
    stars: stars.get(mod.repo) ?? null,
    readme: await io.readme(mod).catch(() => null),
    history: await io.history(mod.name).catch(() => []),
  }))
  return { mods, warnings }
}

// Ranked by GitHub stars. With no stars, or when every mod has the same count (one shared
// repo), there is no signal, so there is no Top row.
export function topMods(mods, count = 8) {
  if (new Set(mods.map(mod => mod.stars ?? -1)).size < 2) return []
  return [...mods]
    .sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name))
    .slice(0, count)
}
