import { expect, test } from 'claude-code/testing'

import { compose, ENGINE_SECTIONS, OTHER_STYLE } from './probe'

// Two style mods installed together: the one beneath has already added its
// section, so the one on top must keep it and add its own after it.
test('style engine: a section another style mod added is kept and both apply', async ($, on) => {
  const sections = await compose($, on, [...ENGINE_SECTIONS, OTHER_STYLE])
  const ids = sections.map(section => section.id)
  expect(ids.slice(0, 4)).toEqual(['intro', 'tone', 'memory', 'other-style:style'])
  expect(ids.length).toBeGreaterThanOrEqual(5)
  expect(ids.slice(4).every(id => id.endsWith(':style'))).toBe(true)
})

test('style engine: shared sections stay ahead of session ones', async ($, on) => {
  const sections = await compose($, on)
  const firstSession = sections.findIndex(section => section.scope === 'session')
  expect(sections.slice(firstSession).every(section => section.scope === 'session')).toBe(true)
})

test('style engine: no rule writes the em-dash character', async ($, on) => {
  const sections = await compose($, on)
  const ours = sections.slice(ENGINE_SECTIONS.length)
  expect(ours.length).toBeGreaterThan(0)
  expect(ours.every(section => !section.text.includes('\u2014'))).toBe(true)
})

// A pack adds several sections: their ids stay unique, and only one of them
// sets the commit message form, so two styles cannot contradict each other.
test('style engine: a pack has unique ids and one owner of the commit form', async ($, on) => {
  const ours = (await compose($, on)).slice(ENGINE_SECTIONS.length)
  expect(new Set(ours.map(section => section.id)).size).toBe(ours.length)
  expect(ours.filter(section => section.text.includes('type(scope): subject')).length).toBeLessThanOrEqual(1)
})
