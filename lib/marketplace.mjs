import { sourceRepo } from './entry.mjs'

export const MARKETPLACE_NAME = 'baselane-mods'
export const OWNER = Object.freeze({ name: 'Baselane', url: 'https://baselane.sh' })
export const GALLERY_URL = 'https://mods.baselane.sh'

export function isVerified(name, sha, verified) {
  return verified.some(item => item.name === name && item.sha === sha)
}

export function pairListings(entries, locks) {
  const pairs = []
  const warnings = []
  for (const [name, entry] of entries) {
    const lock = locks.get(name)
    if (lock) pairs.push({ entry, lock })
    else warnings.push(`entries/${name}.json has no lock file and is not listed`)
  }
  for (const name of locks.keys()) {
    if (!entries.has(name)) warnings.push(`lock/${name}.json has no entry and is not listed`)
  }
  return { pairs: pairs.sort((a, b) => a.entry.name.localeCompare(b.entry.name)), warnings }
}

// The version goes in metadata: the docs say not to set it in both the entry and plugin.json.
export function marketplaceEntry({ entry, lock }, verified) {
  const gallery = `${GALLERY_URL}/mods/${entry.name}/`
  const { manifest } = lock
  return {
    name: entry.name,
    source: { ...entry.source, sha: lock.sha },
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
    homepage: manifest.homepage ?? gallery,
    repository: manifest.repository ?? `https://github.com/${sourceRepo(entry.source)}`,
    category: entry.category,
    ...(entry.tags?.length ? { tags: entry.tags } : {}),
    metadata: {
      version: lock.version, submitter: lock.submitter, verified: isVerified(entry.name, lock.sha, verified),
      hooks: lock.hooks, calls: lock.calls, gallery,
    },
  }
}

export function buildMarketplace({ pairs, verified, renames }) {
  for (const { entry } of pairs) {
    if (Object.hasOwn(renames, entry.name)) throw new Error(`${entry.name} is listed and also in renames.json`)
  }
  return {
    name: MARKETPLACE_NAME,
    owner: { ...OWNER },
    description: `Claude Code mods, checked and pinned. Browse them at ${GALLERY_URL}`,
    forceRemoveDeletedPlugins: true,
    ...(Object.keys(renames).length ? { renames } : {}),
    plugins: pairs.map(pair => marketplaceEntry(pair, verified)),
  }
}
