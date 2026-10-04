export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/

// Two names that differ only in case or in -, _ and . read as the same mod.
export function nameKey(name) {
  return name.toLowerCase().replace(/[-_.]/g, '')
}

export function findNameClash(name, taken) {
  const key = nameKey(name)
  return taken.find(other => nameKey(other) === key) ?? null
}
