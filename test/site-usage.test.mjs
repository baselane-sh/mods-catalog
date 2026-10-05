import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slashCommands, setupNote, riskiest } from '../site/lib/usage.mjs'
import { capabilities } from '../site/lib/capabilities.mjs'

const command = { hooks: ['command.run{command=?}'], calls: ['$.command.register'] }

test('slash commands come from the description when the mod registers a command', () => {
  assert.deepEqual(slashCommands({ ...command, description: 'A live pane. Open it with /firewall.' }), ['/firewall'])
  assert.deepEqual(slashCommands({ ...command, description: 'Every slash command: /receipt, /standup, /pr-description and /handoff.' }), ['/receipt', '/standup', '/pr-description', '/handoff'])
  assert.deepEqual(slashCommands({ hooks: ['command.run{command=hours}'], calls: [], description: 'Night owl.' }), ['/hours'])
})

test('paths and commands named by a mod that registers none are not slash commands', () => {
  assert.deepEqual(slashCommands({ ...command, description: 'Appends to ~/.claude/journal.log and a/b.' }), [])
  assert.deepEqual(slashCommands({ hooks: ['turn.complete'], calls: ['$.ui.toast'], description: 'Suggests /clear or /compact.' }), [])
})

test('a setup note is the author sentence that says the mod waits for setup', () => {
  assert.equal(setupNote('Sends a push through ntfy.sh. Does nothing until you set an ntfy topic.'), 'Does nothing until you set an ntfy topic.')
  assert.equal(setupNote('Asks before a live API key, token or private key is written.'), null)
})

test('riskiest returns the groups at the highest risk level, calls first', () => {
  const { risk, groups } = riskiest(capabilities({ hooks: ['tool.call', 'session.start'], calls: ['$.process.run', '$.ui.toast'] }))
  assert.equal(risk, 'high')
  assert.deepEqual(groups.map(group => group.words), ['Starts programs on your machine', 'Sees every tool call, and can change or answer it'])
  assert.deepEqual(riskiest(capabilities({ hooks: [], calls: [] })), { risk: 'info', groups: [] })
})
