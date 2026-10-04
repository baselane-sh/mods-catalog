#!/usr/bin/env node
// Builds the gallery into _site/. Usage: node site/build.mjs [--offline] [--base /path/]
// Reads entries/, lock/ and verified.json. Online, it also fetches each README at the
// locked SHA and GitHub star counts; offline, both are left out (tests, local preview).
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, topMods } from './lib/data.mjs'
import { browsePage, modPage, submitPage, notFoundPage } from './lib/pages.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const args = process.argv.slice(2)
const offline = args.includes('--offline')
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : process.env.SITE_BASE
const base = baseArg ?? '/'
const out = path.join(root, '_site')
const README_LIMIT = 200_000

async function fetchText(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

function history(name) {
  const log = execFileSync('git', ['-C', root, 'log', '--format=%H %cs', '--', `lock/${name}.json`], { encoding: 'utf8' })
  return log.trim().split('\n').filter(Boolean).flatMap(line => {
    const [commit, date] = line.split(' ')
    try {
      const lock = JSON.parse(execFileSync('git', ['-C', root, 'show', `${commit}:lock/${name}.json`], { encoding: 'utf8' }))
      return [{ version: lock.version, date, sha: lock.sha }]
    } catch {
      return []
    }
  }).filter((row, i, rows) => rows.findIndex(other => other.sha === row.sha) === i)
}

const githubHeaders = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}

const io = offline
  ? { readme: async () => null, stars: async () => null, history: async name => { try { return history(name) } catch { return [] } } }
  : {
      readme: async mod => {
        const text = await fetchText(`${mod.rawBase}README.md`)
        return text && text.length <= README_LIMIT ? text : null
      },
      stars: async repo => JSON.parse(await fetchText(`https://api.github.com/repos/${repo}`, { ...githubHeaders, accept: 'application/vnd.github+json' })).stargazers_count,
      history: async name => history(name),
    }

async function writePage(relative, content) {
  const file = path.join(out, relative)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, content)
}

const indexEntry = mod => ({
  name: mod.name, description: mod.description, category: mod.category, version: mod.version,
  verified: mod.verified, tags: mod.tags, updatedAt: mod.updatedAt, listedAt: mod.listedAt, stars: mod.stars,
})

const { mods, warnings } = await loadCatalog(root, io)
for (const warning of warnings) console.warn(`site: ${warning}`)
const sorted = [...mods].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name))

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })
await cp(path.join(here, 'assets'), path.join(out, 'assets'), { recursive: true })
await writePage('index.html', browsePage({ base, mods: sorted, top: topMods(mods) }))
await writePage('submit/index.html', submitPage({ base }))
await writePage('404.html', notFoundPage({ base }))
for (const mod of mods) await writePage(`mods/${mod.name}/index.html`, modPage({ base, mod }))
await writePage('index.json', JSON.stringify(sorted.map(indexEntry)))
await writePage('.nojekyll', '')
if (base === '/') await writePage('CNAME', 'mods.baselane.sh\n')
console.log(`site: ${mods.length} mods built into _site/ (base ${base}${offline ? ', offline' : ''})`)
