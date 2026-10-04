import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { parseEntryText, validateEntry, sourceRepo, sourcePath } from './entry.mjs'
import { findNameClash } from './names.mjs'
import { parseSemver, compareSemver } from './semver.mjs'
import { parseValidate, parseTestRun } from './claude-cli.mjs'

export const RULES = Object.freeze([
  { id: 'R1', name: 'Scope', hint: 'Change exactly one file, under entries/. A maintainer handles removals and every other file.' },
  { id: 'R2', name: 'Entry', hint: 'Make the entry match the format on the submit page, and pick a name that is not taken.' },
  { id: 'R3', name: 'Owner', hint: 'Only the first submitter can update a mod. Ask a maintainer to move the mod to you.' },
  { id: 'R4', name: 'Tag', hint: 'Push the tag to a public github.com repo and put the tag name in source.ref.' },
  { id: 'R5', name: 'Manifest', hint: 'In .claude-plugin/plugin.json set name (equal to the entry name), version (semver), description (200 characters or fewer), author and license.' },
  { id: 'R6', name: 'Is a mod', hint: 'A mod has hooks/hooks.json that points to its hooks module.' },
  { id: 'R7', name: 'Validate', hint: 'Run claude plugin validate on the mod folder and fix what it reports.' },
  { id: 'R8', name: 'Size and shape', hint: 'Keep the mod at 10 MB or less, with no top-level bin/ and no symlink that leaves the mod. Each screenshot is 2 MB or less.' },
  { id: 'R9', name: 'Tests', hint: 'Run claude plugin test on the mod folder. At least one test must run and every test must pass.' },
  { id: 'R10', name: 'Version', hint: 'Raise version in plugin.json. Users get new code only when the version changes.' },
])

class RuleFailure extends Error {}
const failWith = message => { throw new RuleFailure(message) }
const lastLines = (text, count = 30) => text.trim().split('\n').slice(-count).join('\n')
const ENTRY_FILE = /^entries\/[^/]+\.json$/

async function readJson(file) {
  let text
  try { text = await readFile(file, 'utf8') } catch { failWith(`${path.basename(file)} does not exist`) }
  try { return JSON.parse(text) } catch { failWith(`${path.basename(file)} is not valid JSON`) }
}

function manifestErrors(manifest, name) {
  const errors = []
  if (manifest?.name !== name) errors.push(`plugin.json name is ${JSON.stringify(manifest?.name)}, not ${name}`)
  if (!parseSemver(manifest?.version)) errors.push('plugin.json version must be semver, for example 1.0.0')
  const description = manifest?.description
  if (typeof description !== 'string' || !description.trim() || description.length > 200) errors.push('plugin.json description must be 1 to 200 characters')
  const author = manifest?.author
  if (!(typeof author === 'string' && author.trim()) && !(typeof author?.name === 'string' && author.name.trim())) errors.push('plugin.json author must be set')
  if (typeof manifest?.license !== 'string' || !manifest.license.trim()) errors.push('plugin.json license must be set')
  return errors
}

const STEPS = {
  async R1(input) {
    const files = input.changedFiles
    if (files.length !== 1) failWith(`the PR changes ${files.length} files`)
    const [file] = files
    if (!['A', 'M'].includes(file.status)) failWith(`the PR removes or renames ${file.path}`)
    if (!ENTRY_FILE.test(file.path)) failWith(`${file.path} is not under entries/`)
  },
  async R2(input, io, state) {
    const { entry, error } = parseEntryText(input.entryText)
    if (error) failWith(error)
    const errors = validateEntry(entry, path.basename(input.changedFiles[0].path))
    if (errors.length) failWith(errors.join('\n'))
    const clash = input.lockOnMain ? null : findNameClash(entry.name, [...input.listedNames, ...input.renamedNames])
    if (clash) failWith(`the name ${entry.name} is too close to ${clash}, which is taken`)
    state.entry = entry
  },
  async R3(input) {
    const lock = input.lockOnMain
    // An entry on main without a lock has no recorded owner: only a maintainer may fix it.
    if (!lock && input.changedFiles[0].status !== 'A') failWith('this entry has no lock; a maintainer must fix it first')
    if (lock && lock.submitter !== input.prAuthor) failWith(`${lock.name} belongs to ${lock.submitter}`)
  },
  async R4(input, io, state) {
    const { source } = state.entry
    const url = io.repoUrl(sourceRepo(source))
    let sha
    try { sha = await io.resolveTag(url, source.ref) } catch { failWith(`cannot read ${sourceRepo(source)}; it must be a public repo on github.com`) }
    if (!sha) failWith(`the repo has no tag named ${source.ref}`)
    try { state.root = await io.fetchMod(url, source.ref, sha) } catch (error) { failWith(`cannot fetch tag ${source.ref}: ${error.message}`) }
    // A symlink that leaves the checkout could make later rules read files outside it.
    const linkErrors = await io.checkLinks(state.root)
    if (linkErrors.length) failWith(linkErrors.join('\n'))
    state.sha = sha
    state.dir = path.join(state.root, sourcePath(source))
  },
  async R5(input, io, state) {
    const manifest = await readJson(path.join(state.dir, '.claude-plugin', 'plugin.json'))
    const errors = manifestErrors(manifest, state.entry.name)
    if (errors.length) failWith(errors.join('\n'))
    state.manifest = manifest
  },
  async R6(input, io, state) {
    const info = await stat(path.join(state.dir, 'hooks', 'hooks.json')).catch(() => null)
    if (!info?.isFile()) failWith('hooks/hooks.json does not exist')
  },
  async R7(input, io, state) {
    const run = await io.validate(state.dir)
    const parsed = parseValidate(run.output)
    if (run.code !== 0 || !parsed.passed) failWith(`claude plugin validate failed:\n${lastLines(run.output)}`)
    if (!parsed.hooks.length) failWith('validate found no hooks; a mod registers at least one hook')
    state.hooks = parsed.hooks
    state.calls = parsed.calls
  },
  async R8(input, io, state) {
    const errors = await io.checkShape(state.dir, state.entry.screenshots ?? [])
    if (errors.length) failWith(errors.join('\n'))
  },
  async R9(input, io, state) {
    const run = await io.test(state.dir)
    const counts = parseTestRun(run.output)
    if (run.code !== 0 || counts.failed > 0) failWith(`claude plugin test failed:\n${lastLines(run.output)}`)
    if (counts.total < 1) failWith('no tests ran; add at least one *.test.ts file')
    state.testCount = counts.total
  },
  async R10(input, io, state) {
    const lock = input.lockOnMain
    if (lock && compareSemver(state.manifest.version, lock.version) <= 0) {
      failWith(`version ${state.manifest.version} is not higher than the listed ${lock.version}`)
    }
  },
}

function pickManifest(manifest) {
  const author = typeof manifest.author === 'string' ? { name: manifest.author } : manifest.author
  const optional = Object.fromEntries(['homepage', 'repository']
    .filter(key => typeof manifest[key] === 'string' && /^https:\/\/[^\s"<>]+$/.test(manifest[key]))
    .map(key => [key, manifest[key]]))
  return { description: manifest.description, author, license: manifest.license, ...optional }
}

function resultFrom(state) {
  return {
    name: state.entry.name, sha: state.sha, ref: state.entry.source.ref, version: state.manifest.version,
    hooks: state.hooks, calls: state.calls, testCount: state.testCount, manifest: pickManifest(state.manifest),
  }
}

// options.skip lists rules not to run, for the merge job, which must never run mod code (R9).
// options.testCount then stands in for the count R9 would have read.
export async function runRules(input, io, { skip = [], testCount } = {}) {
  const state = { testCount }
  const outcomes = []
  let failure = null
  for (const rule of RULES) {
    if (failure || skip.includes(rule.id)) { outcomes.push({ id: rule.id, name: rule.name, status: 'skip' }); continue }
    try {
      await STEPS[rule.id](input, io, state)
      outcomes.push({ id: rule.id, name: rule.name, status: 'pass' })
    } catch (error) {
      if (!(error instanceof RuleFailure)) console.error(error)
      const message = error instanceof RuleFailure ? error.message : `internal error: ${error.message}`
      failure = { id: rule.id, name: rule.name, status: 'fail', message, hint: rule.hint }
      outcomes.push(failure)
    }
  }
  return { ok: !failure, rules: outcomes, result: failure ? null : resultFrom(state) }
}
