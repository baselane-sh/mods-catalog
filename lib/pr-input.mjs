import { execFileSync } from 'node:child_process'
import path from 'node:path'

const defaultGit = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function parseJsonOrNull(text) {
  if (text === null) return null
  try { return JSON.parse(text) } catch { return null }
}

function changedFiles(gitText, base, head) {
  return gitText(['diff', '--name-status', '--no-renames', `${base}...${head}`])
    .trim().split('\n').filter(Boolean)
    .map(line => {
      const [status, ...rest] = line.split('\t')
      return { status: status[0], path: rest.join('\t') }
    })
}

export function gatherInput({ base, head, author }, gitText = defaultGit) {
  const show = (ref, file) => { try { return gitText(['show', `${ref}:${file}`]) } catch { return null } }
  const files = changedFiles(gitText, base, head)
  const single = files.length === 1 ? files[0] : null
  const name = single ? path.basename(single.path, '.json') : null
  const listedNames = gitText(['ls-tree', '--name-only', base, 'lock/'])
    .trim().split('\n').filter(Boolean).map(file => path.basename(file, '.json'))
  return {
    changedFiles: files,
    entryText: single && single.status !== 'D' ? show(head, single.path) : null,
    prAuthor: author,
    listedNames,
    renamedNames: Object.keys(parseJsonOrNull(show(base, 'renames.json')) ?? {}),
    lockOnMain: name ? parseJsonOrNull(show(base, `lock/${name}.json`)) : null,
  }
}
