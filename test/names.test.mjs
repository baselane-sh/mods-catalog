import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NAME_PATTERN, nameKey, findNameClash } from '../lib/names.mjs'

test('the name pattern accepts kebab names of 2 to 48 characters', () => {
  for (const ok of ['cost-meter', 'a1', 'x'.repeat(48)]) assert.ok(NAME_PATTERN.test(ok), ok)
})

test('the name pattern refuses other names', () => {
  for (const bad of ['', 'a', 'Cost-Meter', '-cost', 'cost_meter', 'cost.meter', 'x'.repeat(49)]) {
    assert.ok(!NAME_PATTERN.test(bad), bad)
  }
})

test('nameKey ignores case, hyphens, underscores and dots', () => {
  assert.equal(nameKey('Cost-Meter'), 'costmeter')
  assert.equal(nameKey('cost_me.ter'), 'costmeter')
})

test('findNameClash returns the taken name that a new name collides with', () => {
  assert.equal(findNameClash('costmeter', ['pomodoro', 'cost-meter']), 'cost-meter')
  assert.equal(findNameClash('cost-meters', ['cost-meter']), null)
})
