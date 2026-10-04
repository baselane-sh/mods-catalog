#!/usr/bin/env node
// merge.yml entry point. Trusted: never runs PR code. Treats the check report as
// untrusted data and re-checks it against GitHub before it merges and writes the lock.
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { validateReport, prMatchesRun, verifyForMerge } from '../lib/merge.mjs'
import { renderComment, COMMENT_MARKER } from '../lib/report.mjs'
import { validateEntry, sourceRepo } from '../lib/entry.mjs'
import { resolveTag, repoUrl } from '../lib/git.mjs'
import { makeLock } from '../lib/lock.mjs'

const { GITHUB_REPOSITORY: repo, WORKFLOW_HEAD_SHA: runHeadSha, CHECK_CONCLUSION: conclusion } = process.env
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' })
const ghJson = args => JSON.parse(run('gh', ['api', ...args]))
const stop = message => { console.error(`merge: ${message}`); process.exit(1) }
const parseOrNull = text => { try { return JSON.parse(text) } catch { return null } }

function upsertComment(number, body) {
  const filter = `.[] | select(.user.type == "Bot" and (.body | contains("${COMMENT_MARKER}"))) | .id`
  const id = run('gh', ['api', '--paginate', `repos/${repo}/issues/${number}/comments`, '--jq', filter]).trim().split('\n')[0]
  if (id) run('gh', ['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${id}`, '-f', `body=${body}`])
  else run('gh', ['api', `repos/${repo}/issues/${number}/comments`, '-f', `body=${body}`])
}

async function entryAtHead(pr, name) {
  run('git', ['fetch', '-q', 'origin', `pull/${pr.number}/head`])
  let text = null
  try { text = run('git', ['show', `${pr.head.sha}:entries/${name}.json`]) } catch { return null }
  return parseOrNull(text)
}

async function writeLock(report, pr, lockOnMain) {
  run('git', ['pull', '-q', '--ff-only', 'origin', 'main'])
  const lock = makeLock(report.result, { previous: lockOnMain, submitter: pr.user.login, now: new Date().toISOString().slice(0, 10) })
  const file = `lock/${lock.name}.json`
  await mkdir('lock', { recursive: true })
  await writeFile(file, `${JSON.stringify(lock, null, 2)}\n`)
  run('git', ['add', file])
  run('git', ['commit', '-qm', `Lock ${lock.name} ${lock.version} at ${lock.sha.slice(0, 12)}`])
  run('git', ['push', '-q', 'origin', 'HEAD:main'])
}

const report = parseOrNull(await readFile(process.argv[2], 'utf8').catch(() => 'null'))
const shapeErrors = report ? validateReport(report) : ['the check report is missing or not JSON']
if (shapeErrors.length) stop(shapeErrors.join('; '))

const pr = ghJson([`repos/${repo}/pulls/${report.prNumber}`])
if (!prMatchesRun(pr, runHeadSha)) stop('the report names a PR whose head is not the checked commit')
upsertComment(report.prNumber, renderComment(report))
if (conclusion !== 'success' || !report.ok) process.exit(0)

const name = report.result.name
// Two files are enough to refuse the merge, so one small page is enough to decide.
const files = ghJson([`repos/${repo}/pulls/${report.prNumber}/files?per_page=3`])
const entry = await entryAtHead(pr, name)
const lockOnMain = parseOrNull(await readFile(`lock/${name}.json`, 'utf8').catch(() => 'null'))
const entryErrors = entry ? validateEntry(entry, `${name}.json`) : ['the entry cannot be read at the PR head']
const lsRemoteSha = entry ? await resolveTag(repoUrl(sourceRepo(entry.source)), entry.source.ref).catch(() => null) : null
const errors = [...entryErrors, ...verifyForMerge({ report, pr, files, entry, lsRemoteSha, lockOnMain })]
if (errors.length) stop(`not merging: ${errors.join('; ')}`)

run('gh', ['pr', 'merge', String(report.prNumber), '--repo', repo, '--squash', '--match-head-commit', pr.head.sha])
await writeLock(report, pr, lockOnMain)
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'merged=true\n')
console.log(`merge: merged #${report.prNumber} and locked ${name}`)
