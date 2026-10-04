import { expect, test } from 'claude-code/testing'

import { compose, ENGINE_SECTIONS } from './probe'

test('no-em-dash: adds its section last, session scope, keeps the existing ones', async ($, on) => {
  const sections = await compose($, on)
  expect(sections.slice(0, ENGINE_SECTIONS.length)).toEqual(ENGINE_SECTIONS)
  expect(sections.length).toBe(ENGINE_SECTIONS.length + 1)
  const last = sections[sections.length - 1]
  expect(last?.id).toBe('no-em-dash:style')
  expect(last?.scope).toBe('session')
})

test('no-em-dash: the section says what the rule asks', async ($, on) => {
  const text = (await compose($, on)).at(-1)?.text ?? ''
  for (const phrase of ['U+2014', 'comma', 'colon', 'period', 'parentheses']) expect(text).toContain(phrase)
})

test('no-em-dash: the text does not contain the character it forbids', async ($, on) => {
  const text = (await compose($, on)).at(-1)?.text ?? ''
  expect(text.includes('\u2014')).toBe(false)
})
