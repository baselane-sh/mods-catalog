#!/usr/bin/env node
// check.yml entry point. Runs untrusted mod code, so the job has no secrets and a
// read-only token. Writes the report even when a rule fails, then exits 1.
import { writeFile } from 'node:fs/promises'
import { gatherInput } from '../lib/pr-input.mjs'
import { runRules } from '../lib/rules.mjs'
import { realIo } from '../lib/io.mjs'

const [outPath] = process.argv.slice(2)
const { PR_NUMBER, PR_AUTHOR, HEAD_SHA, BASE_SHA } = process.env
if (!outPath || !PR_NUMBER || !PR_AUTHOR || !HEAD_SHA || !BASE_SHA) {
  console.error('usage: PR_NUMBER PR_AUTHOR HEAD_SHA BASE_SHA node scripts/check-pr.mjs <out.json>')
  process.exit(2)
}

const input = gatherInput({ base: BASE_SHA, head: HEAD_SHA, author: PR_AUTHOR })
const report = await runRules(input, realIo())
const full = { ...report, prNumber: Number(PR_NUMBER), headSha: HEAD_SHA, prAuthor: PR_AUTHOR }
await writeFile(outPath, `${JSON.stringify(full, null, 2)}\n`)
for (const rule of report.rules) console.log(`${rule.id} ${rule.name}: ${rule.status}${rule.message ? `\n${rule.message}` : ''}`)
process.exitCode = report.ok ? 0 : 1
