// What a visitor needs around the install lines: the slash commands a mod adds, any setup
// its author names, and the riskiest things it can do. All of it comes from the lock file
// (hooks, calls) and the author's own description; nothing is invented.
import { RISK_ORDER } from './capabilities.mjs'

// "/firewall" in "Open it with /firewall." but not "~/.claude/journal.log" or "a/b".
const SLASH = /(?:^|[\s("'])(\/[a-z][a-z0-9-]*)(?=$|[\s),;:"'!?]|\.(?:\s|$))/g

export function registersCommand({ hooks = [], calls = [] }) {
  return hooks.some(hook => hook.startsWith('command.run')) || calls.includes('$.command.register')
}

// Command names only count when the mod registers a command, so a nudge that mentions
// "/clear" in its description does not claim to add it.
export function slashCommands({ description = '', hooks = [], calls = [] }) {
  if (!registersCommand({ hooks, calls })) return []
  const fromHooks = hooks.flatMap(hook => [...hook.matchAll(/command=([a-z][a-z0-9-]*)/g)].map(match => `/${match[1]}`))
  const fromText = [...description.matchAll(SLASH)].map(match => match[1])
  return [...new Set([...fromHooks, ...fromText])]
}

// A sentence ends at a period followed by space or the end, so "v1.2" and "~/.config" stay whole.
// The author's own sentence when the description says the mod needs setup first.
export function setupNote(description = '') {
  const sentence = description.match(/(?:^|(?<=\.\s+))(?:(?!\.\s).)*?\buntil you (?:set|add|configure|create)\b.*?\.(?=\s|$)/i)
  return sentence ? sentence[0].trim() : null
}

// The groups at the mod's highest risk level, for a short summary above the install lines.
export function riskiest({ inputs, outputs }) {
  const all = [...outputs, ...inputs]
  const risk = RISK_ORDER.find(level => all.some(group => group.risk === level)) ?? 'info'
  return { risk, groups: all.filter(group => group.risk === risk) }
}
