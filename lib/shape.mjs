import { lstat, readdir, readlink } from 'node:fs/promises'
import path from 'node:path'

export const MAX_PLUGIN_BYTES = 10 * 1024 * 1024
export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024

const isInside = (root, target) => target === root || target.startsWith(root + path.sep)

async function walk(dir, root) {
  let bytes = 0
  const errors = []
  for (const name of await readdir(dir)) {
    if (dir === root && name === '.git') continue
    const full = path.join(dir, name)
    const info = await lstat(full)
    if (info.isSymbolicLink()) {
      const target = path.resolve(path.dirname(full), await readlink(full))
      if (!isInside(root, target)) errors.push(`${path.relative(root, full)} points outside the mod`)
    } else if (info.isDirectory()) {
      const inner = await walk(full, root)
      bytes += inner.bytes
      errors.push(...inner.errors)
    } else {
      bytes += info.size
    }
  }
  return { bytes, errors }
}

async function infoOrNull(file) {
  try {
    return await lstat(file)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function screenshotErrors(root, screenshots) {
  const errors = []
  for (const shot of screenshots) {
    const info = await infoOrNull(path.join(root, shot))
    if (!info || !info.isFile()) errors.push(`screenshot ${shot} does not exist`)
    else if (info.size > MAX_SCREENSHOT_BYTES) errors.push(`screenshot ${shot} is over 2 MB`)
  }
  return errors
}

export async function checkLinks(dir) {
  const root = path.resolve(dir)
  return (await walk(root, root)).errors
}

export async function checkShape(dir, screenshots = []) {
  const root = path.resolve(dir)
  const { bytes, errors } = await walk(root, root)
  const sizeErrors = bytes > MAX_PLUGIN_BYTES ? [`the mod is ${(bytes / 1048576).toFixed(1)} MB; the limit is 10 MB`] : []
  const bin = await infoOrNull(path.join(root, 'bin'))
  const binErrors = bin?.isDirectory() ? ['the mod has a top-level bin/ folder; move executables to scripts/'] : []
  return [...errors, ...sizeErrors, ...binErrors, ...await screenshotErrors(root, screenshots)]
}
