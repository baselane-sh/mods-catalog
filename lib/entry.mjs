import { NAME_PATTERN } from './names.mjs'

export const CATEGORIES = Object.freeze(['guard', 'pane', 'band', 'command', 'sound', 'style', 'stats', 'nudge', 'lifecycle', 'render'])

const ENTRY_KEYS = new Set(['$schema', 'name', 'source', 'category', 'tags', 'screenshots'])
const SOURCE_KEYS = { 'git-subdir': ['source', 'url', 'path', 'ref'], github: ['source', 'repo', 'ref'] }
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/
const REF = /^[A-Za-z0-9._\/-]{1,100}$/
const TAG = /^[a-z0-9-]{2,24}$/
const IMAGE = /\.(png|jpe?g|webp|gif)$/i

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

// Plain characters only: no %, ?, # or spaces, and no "." or ".." segments, so a path
// cannot be re-read as a URL that leaves the pinned commit.
function isRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 &&
    /^[A-Za-z0-9._\/-]+$/.test(value) && !value.startsWith('/') &&
    value.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..')
}

function sourceErrors(source) {
  if (!isObject(source)) return ['source must be an object']
  const allowed = SOURCE_KEYS[source.source]
  if (!allowed) return ['source.source must be "git-subdir" or "github"']
  const errors = []
  if ('sha' in source) errors.push('source.sha is set by the catalog; remove it')
  const extra = Object.keys(source).filter(key => !allowed.includes(key) && key !== 'sha')
  if (extra.length) errors.push(`source fields not allowed: ${extra.join(', ')}`)
  const repo = source.source === 'github' ? source.repo : source.url
  if (!REPO.test(repo ?? '') || /\/\.\.?$/.test(repo)) errors.push(`source.${source.source === 'github' ? 'repo' : 'url'} must be a GitHub repo in owner/repo form`)
  if (source.source === 'git-subdir' && !isRelativePath(source.path)) {
    errors.push('source.path must be a relative path inside the repo, without ".."')
  }
  if (typeof source.ref !== 'string' || !REF.test(source.ref)) errors.push('source.ref must be the tag to publish')
  return errors
}

function listErrors(entry) {
  const errors = []
  const { tags, screenshots } = entry
  if (tags !== undefined && !(Array.isArray(tags) && tags.length <= 8 && tags.every(t => TAG.test(t)) && new Set(tags).size === tags.length)) {
    errors.push('tags must be up to 8 unique items of 2 to 24 characters: a-z, 0-9 and "-"')
  }
  if (screenshots !== undefined && !(Array.isArray(screenshots) && screenshots.length <= 6 && screenshots.every(p => isRelativePath(p) && IMAGE.test(p)))) {
    errors.push('screenshots must be up to 6 relative paths to .png, .jpg, .webp or .gif files')
  }
  return errors
}

export function validateEntry(entry, fileName) {
  if (!isObject(entry)) return ['the entry must be a JSON object']
  const errors = []
  const extra = Object.keys(entry).filter(key => !ENTRY_KEYS.has(key))
  if (extra.length) errors.push(`fields not allowed: ${extra.join(', ')}`)
  if (!NAME_PATTERN.test(entry.name ?? '')) {
    errors.push('name must be 2 to 48 characters: a-z, 0-9 and "-", starting with a letter or digit')
  } else if (fileName !== `${entry.name}.json`) {
    errors.push(`the file name must be ${entry.name}.json`)
  }
  errors.push(...sourceErrors(entry.source))
  if (!CATEGORIES.includes(entry.category)) errors.push(`category must be one of: ${CATEGORIES.join(', ')}`)
  return [...errors, ...listErrors(entry)]
}

export function parseEntryText(text) {
  if (typeof text !== 'string' || text.length === 0) return { entry: null, error: 'the entry file is missing or empty' }
  try {
    return { entry: JSON.parse(text), error: null }
  } catch {
    return { entry: null, error: 'the entry file is not valid JSON (no comments, no trailing commas, no byte order mark)' }
  }
}

export function sourceRepo(source) {
  return source.source === 'github' ? source.repo : source.url
}

export function sourcePath(source) {
  return source.source === 'github' ? '.' : source.path
}
