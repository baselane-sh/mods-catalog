import { execFile } from 'node:child_process'

export function splitTopLevel(list) {
  const items = []
  let depth = 0
  let current = ''
  for (const char of list) {
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (char === ',' && depth === 0) {
      items.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  items.push(current.trim())
  return items.filter(Boolean)
}

// Lines look like "  ❯ ./register.ts hooks: a, b{c=1}". A mod can have several modules.
const LINE = /❯ \S+ (hooks|calls): (.*)$/

export function parseValidate(output) {
  const found = { hooks: new Set(), calls: new Set() }
  for (const line of output.split('\n')) {
    const match = LINE.exec(line)
    if (match) for (const item of splitTopLevel(match[2])) {
      if (!/^nothing on /.test(item)) found[match[1]].add(item)
    }
  }
  return {
    passed: /✔ Validation passed/.test(output),
    hooks: [...found.hooks].sort(),
    calls: [...found.calls].sort(),
  }
}

export function parseTestRun(output) {
  const ran = /Ran (\d+) tests? across/.exec(output)
  const failed = /^\s*(\d+) fail\b/m.exec(output)
  return { total: ran ? Number(ran[1]) : 0, failed: failed ? Number(failed[1]) : 0 }
}

export function runClaude(args, { timeoutMs = 240_000, env: baseEnv = process.env } = {}) {
  const env = { ...baseEnv, DISABLE_AUTOUPDATER: '1' }
  return new Promise(resolve => {
    execFile('claude', args, { env, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
      resolve({ code, output: `${stdout}${stderr}` })
    })
  })
}
