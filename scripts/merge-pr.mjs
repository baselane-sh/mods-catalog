#!/usr/bin/env node
// merge.yml entry point. Trusted: never runs PR code. The check report is untrusted data
// (the PR's own tests ran in that job), so this script recomputes every rule except R9
// from the tag itself, with no tokens in the environment of the claude CLI.
import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { validateReport, prMatchesRun, verifyForMerge, changedFilesFromApi } from '../lib/merge.mjs'
import { renderComment, COMMENT_MARKER } from '../lib/report.mjs'
import { runRules } from '../lib/rules.mjs'
import { realIo } from '../lib/io.mjs'
import { makeLock } from '../lib/lock.mjs'

const { GITHUB_REPOSITORY: repo, WORKFLOW_HEAD_SHA: runHeadSha, CHECK_CONCLUSION: conclusion, GH_TOKEN: token } = process.env
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' })
const ghJson = args => JSON.parse(run('gh', ['api', ...args]))
const stop = message => { console.error(`merge: ${message}`); process.exit(1) }
const parseOrNull = text => { try { return JSON.parse(text) } catch { return null } }
const readOrNull = file => readFile(file, 'utf8').catch(() => null)
const fence = text => `~~~\n${String(text).replaceAll('~~~', '~ ~ ~')}\n~~~`

function upsertComment(number, body) {
  const filter = `.[] | select(.user.type == "Bot" and (.body | contains("${COMMENT_MARKER}"))) | .id`
  const id = run('gh', ['api', '--paginate', `repos/${repo}/issues/${number}/comments`, '--jq', filter]).trim().split('\n')[0]
  if (id) run('gh', ['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${id}`, '-f', `body=${body}`])
  else run('gh', ['api', `repos/${repo}/issues/${number}/comments`, '-f', `body=${body}`])
}

function entryTextAtHead(pr, file) {
  run('git', ['fetch', '-q', 'origin', `pull/${pr.number}/head`])
  try { return run('git', ['show', `${pr.head.sha}:${file}`]) } catch { return null }
}

async function gatherMergeInput(pr, files) {
  const changedFiles = changedFilesFromApi(files)
  const single = changedFiles.length === 1 ? changedFiles[0] : null
  const name = single ? path.basename(single.path, '.json') : null
  const lockText = name ? await readOrNull(`lock/${name}.json`) : null
  return {
    changedFiles,
    entryText: single && single.status !== 'D' ? entryTextAtHead(pr, single.path) : null,
    prAuthor: pr.user.login,
    listedNames: (await readdir('lock').catch(() => [])).map(f => path.basename(f, '.json')),
    renamedNames: Object.keys(parseOrNull(await readOrNull('renames.json')) ?? {}),
    lockOnMain: lockText ? parseOrNull(lockText) : null,
  }
}

// The checkout keeps no credentials, so the token is given to git only for the push.
function pushMain() {
  const auth = Buffer.from(`x-access-token:${token}`).toString('base64')
  const withAuth = ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${auth}`]
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      run('git', [...withAuth, 'pull', '-q', '--rebase', 'origin', 'main'])
      run('git', [...withAuth, 'push', '-q', 'origin', 'HEAD:main'])
      return
    } catch (error) {
      if (attempt === 3) throw error
    }
  }
}

async function writeLock(result, pr, lockOnMain) {
  const lock = makeLock(result, { previous: lockOnMain, submitter: pr.user.login, now: new Date().toISOString().slice(0, 10) })
  run('git', ['pull', '-q', '--ff-only', 'origin', 'main'])
  const file = `lock/${lock.name}.json`
  await mkdir('lock', { recursive: true })
  await writeFile(file, `${JSON.stringify(lock, null, 2)}\n`)
  run('git', ['add', file])
  run('git', ['commit', '-qm', `Lock ${lock.name} ${lock.version} at ${lock.sha.slice(0, 12)}`])
  pushMain()
}

const report = parseOrNull(await readOrNull(process.argv[2]))
const shapeErrors = report ? validateReport(report) : ['the check report is missing or not JSON']
if (shapeErrors.length) stop(shapeErrors.join('; '))

const pr = ghJson([`repos/${repo}/pulls/${report.prNumber}`])
if (!prMatchesRun(pr, runHeadSha)) stop('the report names a PR whose head is not the checked commit')
upsertComment(report.prNumber, renderComment(report))
if (conclusion !== 'success' || !report.ok) process.exit(0)

// Two files are enough to refuse the merge, so one small page is enough to decide.
const files = ghJson([`repos/${repo}/pulls/${report.prNumber}/files?per_page=3`])
const input = await gatherMergeInput(pr, files)
const recomputed = await runRules(input, realIo({ cleanEnv: true }), { skip: ['R9'], testCount: report.result.testCount })
const errors = verifyForMerge({ report, pr, recomputed })
if (errors.length) {
  upsertComment(report.prNumber, `${renderComment(report)}\n**Not merged.** The merge job found:\n\n${fence(errors.join('\n'))}\n`)
  stop(`not merging: ${errors.join('; ')}`)
}

run('gh', ['pr', 'merge', String(report.prNumber), '--repo', repo, '--squash', '--match-head-commit', pr.head.sha])
await writeLock(recomputed.result, pr, input.lockOnMain)
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'merged=true\n')
console.log(`merge: merged #${report.prNumber} and locked ${recomputed.result.name}`)
