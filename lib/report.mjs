import { RULES } from './rules.mjs'

export const COMMENT_MARKER = '<!-- mods-catalog-check -->'
const ICON = { pass: '✔', fail: '✘', skip: '-' }

// Report text comes from untrusted mod output: keep it inside a fence it cannot close.
const fence = text => `~~~\n${String(text).replaceAll('~~~', '~ ~ ~')}\n~~~`

function table(report) {
  const byId = new Map(report.rules.map(rule => [rule.id, rule]))
  const rows = RULES.map(rule => `| ${rule.id} | ${rule.name} | ${ICON[byId.get(rule.id)?.status] ?? '-'} |`)
  return ['| Rule | Check | Result |', '| :- | :- | :- |', ...rows].join('\n')
}

function failureDetail(report) {
  const failure = report.rules.find(rule => rule.status === 'fail')
  if (!failure) return ''
  const rule = RULES.find(r => r.id === failure.id)
  return `\n\n**${failure.id} failed.**\n\n${fence(failure.message ?? '')}\n\n${rule?.hint ?? ''}`
}

function capabilities(result) {
  const list = items => items.map(item => `\`${item}\``).join(', ') || 'none'
  return `\n\nHooks: ${list(result.hooks)}\n\nCalls: ${list(result.calls)}\n\nTests run: ${result.testCount}`
}

export function renderComment(report) {
  const summary = report.ok
    ? `All checks passed for \`${report.result.name}\` ${report.result.version} at \`${report.result.sha.slice(0, 12)}\`.`
    : 'A check failed. Fix the item marked ✘, then push a new commit to this PR.'
  const detail = report.ok ? capabilities(report.result) : failureDetail(report)
  return `${COMMENT_MARKER}\n${summary}\n\n${table(report)}${detail}\n`
}
