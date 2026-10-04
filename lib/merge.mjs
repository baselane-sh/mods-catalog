import { NAME_PATTERN } from './names.mjs'
import { parseSemver } from './semver.mjs'

const HEX40 = /^[0-9a-f]{40}$/
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isStringList = value => Array.isArray(value) && value.length <= 300 && value.every(item => typeof item === 'string' && item.length <= 300)

function resultErrors(result) {
  if (!isObject(result)) return ['result is missing']
  const errors = []
  if (!NAME_PATTERN.test(result.name ?? '')) errors.push('result.name is not a valid name')
  if (!HEX40.test(result.sha ?? '')) errors.push('result.sha is not a full SHA')
  if (typeof result.ref !== 'string' || !result.ref) errors.push('result.ref is missing')
  if (!parseSemver(result.version)) errors.push('result.version is not semver')
  if (!isStringList(result.hooks) || !isStringList(result.calls)) errors.push('result.hooks and result.calls must be lists of strings')
  if (!Number.isInteger(result.testCount) || result.testCount < 1) errors.push('result.testCount must be 1 or more')
  const m = result.manifest
  if (!isObject(m) || typeof m.description !== 'string' || m.description.length > 200 || typeof m.license !== 'string' || !isObject(m.author)) {
    errors.push('result.manifest is not valid')
  }
  return errors
}

// The report comes from a run that executed untrusted code: treat every field as data.
export function validateReport(report) {
  if (!isObject(report)) return ['the report is not an object']
  const errors = []
  if (typeof report.ok !== 'boolean') errors.push('ok must be true or false')
  if (!Number.isInteger(report.prNumber) || report.prNumber < 1) errors.push('prNumber must be a positive integer')
  if (!HEX40.test(report.headSha ?? '')) errors.push('headSha is not a full SHA')
  if (!Array.isArray(report.rules)) errors.push('rules must be a list')
  if (report.ok === true) errors.push(...resultErrors(report.result))
  return errors
}

export function prMatchesRun(pr, runHeadSha) {
  return pr?.head?.sha === runHeadSha
}

const STATUS = { added: 'A', modified: 'M', removed: 'D', renamed: 'R', copied: 'C', changed: 'M', unchanged: 'M' }

export function changedFilesFromApi(files) {
  return files.map(file => ({ status: STATUS[file.status] ?? '?', path: file.filename }))
}

// `recomputed` is the merge job's own runRules report (R9 skipped). The check report is
// untrusted: only its PR identity, its pass flag and the SHA its tests ran on are used.
export function verifyForMerge({ report, pr, recomputed }) {
  if (!report.ok) return ['the check did not pass']
  const errors = []
  if (pr.state !== 'open') errors.push('the PR is not open')
  if (pr.head.sha !== report.headSha) errors.push('the PR has commits that were not checked')
  const failure = recomputed.rules.find(rule => rule.status === 'fail')
  if (failure) errors.push(`${failure.id} ${failure.name} failed at merge: ${failure.message}`)
  else if (recomputed.result.sha !== report.result.sha) errors.push('the tag no longer points to the commit the tests ran on')
  return errors
}
