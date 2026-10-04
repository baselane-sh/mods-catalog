import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { repoUrl, resolveTag, fetchTag } from './git.mjs'
import { runClaude } from './claude-cli.mjs'
import { checkShape } from './shape.mjs'

// MODS_CATALOG_GIT_BASE lets the end-to-end test serve repos from file:// URLs.
// cleanEnv: the merge job validates with no tokens in the environment.
export function realIo({ gitBase = process.env.MODS_CATALOG_GIT_BASE ?? 'https://github.com/', cleanEnv = false } = {}) {
  return {
    repoUrl: repo => repoUrl(repo, gitBase),
    resolveTag,
    fetchMod: async (url, tag, sha) => fetchTag(url, tag, sha, await mkdtemp(path.join(os.tmpdir(), 'mod-'))),
    validate: dir => runClaude(['plugin', 'validate', dir], { env: cleanEnv ? { PATH: process.env.PATH, HOME: os.tmpdir() } : process.env }),
    test: dir => runClaude(['plugin', 'test', dir]),
    checkShape,
  }
}
