import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

export const tempDir = (prefix = 'mc-') => mkdtemp(path.join(os.tmpdir(), prefix))

export async function writeTree(root, files) {
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`)
  }
  return root
}

const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }

export async function makeGitRepo(dir) {
  const root = dir ?? await tempDir('repo-')
  await mkdir(root, { recursive: true })
  const run = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', env: GIT_ENV })
  run(['init', '-q', '-b', 'main'])
  return { dir: root, url: `file://${root}`, run }
}
