import { NAME_PATTERN } from './names.mjs'
import { parseSemver, compareSemver } from './semver.mjs'

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

function ownerAndVersionErrors(report, pr, lockOnMain) {
  if (!lockOnMain) return []
  const errors = []
  if (lockOnMain.submitter !== pr.user.login) errors.push(`${lockOnMain.name} belongs to ${lockOnMain.submitter}`)
  if (compareSemver(report.result.version, lockOnMain.version) <= 0) errors.push('the version is not higher than the listed one')
  return errors
}

export function verifyForMerge({ report, pr, files, entry, lsRemoteSha, lockOnMain }) {
  if (!report.ok) return ['the check did not pass']
  const errors = []
  const name = report.result.name
  if (pr.state !== 'open') errors.push('the PR is not open')
  if (pr.head.sha !== report.headSha) errors.push('the PR has commits that were not checked')
  const onlyEntry = files.length === 1 && files[0].filename === `entries/${name}.json` && ['added', 'modified'].includes(files[0].status)
  if (!onlyEntry) errors.push(`the PR must change only entries/${name}.json`)
  if (entry?.name !== name) errors.push('the entry name differs from the checked name')
  if (entry?.source?.ref !== report.result.ref) errors.push('the entry ref differs from the checked ref')
  if (lsRemoteSha !== report.result.sha) errors.push('the tag no longer points to the checked commit')
  return [...errors, ...ownerAndVersionErrors(report, pr, lockOnMain)]
}
