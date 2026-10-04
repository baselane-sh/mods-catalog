import { execFile } from 'node:child_process'

// Never prompt for credentials: a private repo must fail, not hang.
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }

function git(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { env: GIT_ENV, timeout: 120_000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`git ${args[0]} failed: ${stderr.trim() || error.message}`))
      else resolve(stdout)
    })
  })
}

export function repoUrl(repo, base = 'https://github.com/') {
  return `${base}${repo}.git`
}

export async function resolveTag(url, tag) {
  const out = await git(['ls-remote', '--tags', url])
  const refs = new Map(out.trim().split('\n').filter(Boolean).map(line => {
    const [sha, ref] = line.split('\t')
    return [ref, sha]
  }))
  // "^{}" is the commit an annotated tag points to.
  return refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`) ?? null
}

export async function fetchTag(url, tag, sha, dest) {
  await git(['init', '-q', dest])
  await git(['-C', dest, 'fetch', '-q', '--depth', '1', url, `refs/tags/${tag}`])
  const fetched = (await git(['-C', dest, 'rev-parse', 'FETCH_HEAD^{commit}'])).trim()
  if (fetched !== sha) throw new Error(`tag ${tag} now points to ${fetched}, not ${sha}`)
  await git(['-C', dest, 'checkout', '-q', 'FETCH_HEAD'])
  return dest
}
