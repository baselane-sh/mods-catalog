import { test } from 'node:test'
import assert from 'node:assert/strict'
import { browsePage, modPage } from '../site/lib/pages.mjs'
import { capabilities, topRisk } from '../site/lib/capabilities.mjs'
import { topMods } from '../site/lib/data.mjs'

function fakeMod(change = {}) {
  const caps = capabilities({ hooks: ['tool.call'], calls: ['$.process.run'] })
  return {
    name: 'demo-mod', description: 'A demo <b>mod</b>.', author: { name: 'Ada' }, license: 'MIT', version: '1.0.0',
    category: 'guard', tags: [], screenshots: [], verified: false, sha: 'a'.repeat(40), ref: 'v1.0.0', repo: 'ada/demo',
    dir: '.', submitter: 'ada', listedAt: '2026-10-01', updatedAt: '2026-10-02', hooks: ['tool.call'], calls: ['$.process.run'],
    caps, risk: topRisk(caps), hp: 6, rawBase: 'https://raw.githubusercontent.com/ada/demo/sha/', blobBase: 'https://github.com/ada/demo/blob/sha/',
    sourceUrl: 'https://github.com/ada/demo/tree/sha', stars: 3, readme: '<script>x</script>', history: [], ...change,
  }
}

test('an unverified mod page warns before install and escapes author text', () => {
  const page = modPage({ base: '/', mod: fakeMod() })
  assert.match(page, /Baselane has not reviewed this code\. It runs with your permissions\./)
  assert.ok(page.indexOf('has not reviewed') < page.indexOf('/plugin install demo-mod@baselane-mods'))
  assert.doesNotMatch(page, /<b>mod<\/b>|<script>x<\/script>/)
  assert.match(page, /Starts programs on your machine/)
})

test('pages carry no inline script or style', () => {
  for (const page of [modPage({ base: '/', mod: fakeMod() }), browsePage({ base: '/', mods: [fakeMod()], top: [] })]) {
    assert.doesNotMatch(page, /<script>|<script [^>]*>[^<]|style="|<style/)
  }
})

test('the Top row needs a star signal', () => {
  assert.deepEqual(topMods([fakeMod({ stars: 5 }), fakeMod({ name: 'b', stars: 5 })]), [])
  assert.deepEqual(topMods([fakeMod({ stars: 1 }), fakeMod({ name: 'b', stars: 5 })]).map(m => m.name), ['b', 'demo-mod'])
  assert.doesNotMatch(browsePage({ base: '/', mods: [fakeMod()], top: [] }), /Top mods/)
})
