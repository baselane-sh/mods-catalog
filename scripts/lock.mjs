#!/usr/bin/env node
// Maintainer path (spec 4.4): run R2 to R10 on entries already in the working tree
// and write their lock files. Usage: node scripts/lock.mjs --submitter <login> <name...>
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runRules } from '../lib/rules.mjs'
import { realIo } from '../lib/io.mjs'
import { makeLock } from '../lib/lock.mjs'

const args = process.argv.slice(2)
const at = args.indexOf('--submitter')
const submitter = at >= 0 ? args[at + 1] : null
const names = args.filter((_, i) => i !== at && i !== at + 1)
if (!submitter || !names.length) {
  console.error('usage: node scripts/lock.mjs --submitter <login> <name...>')
  process.exit(2)
}

const readOrNull = file => readFile(file, 'utf8').catch(() => null)
const today = new Date().toISOString().slice(0, 10)
const listedNames = (await readdir('lock').catch(() => [])).map(f => path.basename(f, '.json'))
const renamedNames = Object.keys(JSON.parse(await readFile('renames.json', 'utf8')))
let failures = 0

for (const name of names) {
  const lockText = await readOrNull(`lock/${name}.json`)
  const lockOnMain = lockText ? JSON.parse(lockText) : null
  const input = {
    changedFiles: [{ status: lockOnMain ? 'M' : 'A', path: `entries/${name}.json` }],
    entryText: await readOrNull(`entries/${name}.json`),
    prAuthor: lockOnMain?.submitter ?? submitter,
    listedNames: listedNames.filter(listed => listed !== name),
    renamedNames,
    lockOnMain,
  }
  const report = await runRules(input, realIo())
  const failure = report.rules.find(rule => rule.status === 'fail')
  if (failure) {
    failures += 1
    console.error(`${name}: ${failure.id} ${failure.name} failed\n${failure.message}`)
    continue
  }
  const lock = makeLock(report.result, { previous: lockOnMain, submitter, now: today })
  await mkdir('lock', { recursive: true })
  await writeFile(`lock/${name}.json`, `${JSON.stringify(lock, null, 2)}\n`)
  console.log(`${name}: locked ${lock.version} at ${lock.sha.slice(0, 12)}`)
}
process.exitCode = failures ? 1 : 0
