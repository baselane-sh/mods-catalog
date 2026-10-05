import { test } from 'node:test'
import assert from 'node:assert/strict'
import { browsePage, modPage, submitPage, notFoundPage } from '../site/lib/pages.mjs'
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

const allPages = base => [
  browsePage({ base, mods: [fakeMod()], top: [] }),
  modPage({ base, mod: fakeMod() }),
  submitPage({ base }),
  notFoundPage({ base }),
]

test('the home page shows both install steps, the first one copyable', () => {
  const page = browsePage({ base: '/', mods: [fakeMod()], top: [] })
  assert.match(page, /Install in two steps/)
  assert.match(page, /<code id="cmd-marketplace">\/plugin marketplace add baselane-sh\/mods-catalog<\/code><button type="button" class="copy" data-copy="cmd-marketplace"/)
  assert.match(page, /\/plugin install <var>&lt;name&gt;<\/var>@baselane-mods/)
  assert.match(page, /A mod is a small add-on that runs inside Claude Code/)
})

test('a mod page shows its riskiest abilities, then numbered install steps, then how to use it', () => {
  const page = modPage({ base: '/', mod: fakeMod({ description: 'A guard. Open it with /demo.', hooks: ['tool.call', 'command.run{command=?}'], calls: ['$.process.run', '$.command.register'] }) })
  const risk = page.indexOf('Its riskiest abilities')
  const add = page.indexOf('data-copy="cmd-add"')
  const install = page.indexOf('data-copy="cmd-install"')
  assert.ok(risk > 0 && risk < add && add < install, 'risk summary, step 1, step 2 in order')
  assert.match(page, /Use it: type <code>\/demo<\/code> in Claude Code\./)
})

test('a mod that waits for setup says so beside the install lines', () => {
  const page = modPage({ base: '/', mod: fakeMod({ description: 'Sends a push. Does nothing until you set an ntfy topic.' }) })
  assert.match(page, /Needs setup\.<\/strong> Does nothing until you set an ntfy topic\./)
})

test('under a sub-path every root-relative link and asset carries the base', () => {
  for (const page of allPages('/mods-catalog/')) {
    const urls = [...page.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map(match => match[1])
    assert.ok(urls.length > 3)
    for (const url of urls) assert.ok(url.startsWith('/mods-catalog/'), url)
    assert.match(page, /data-base="\/mods-catalog\/"/)
    assert.match(page, /<link rel="canonical" href="https:\/\/baselane-sh\.github\.io\/mods-catalog\//)
  }
  assert.match(modPage({ base: '/', mod: fakeMod() }), /<link rel="canonical" href="https:\/\/mods\.baselane\.sh\/mods\/demo-mod\/">/)
})

test('no page text carries an em-dash, and pages carry no inline script or style', () => {
  for (const page of allPages('/')) {
    assert.doesNotMatch(page, /\u2014/)
    assert.doesNotMatch(page, /<script>|<script [^>]*>[^<]|style="|<style/)
  }
})

test('every page loads the pinned GoatCounter script and the CSP allows only its two hosts', () => {
  const page = modPage({ base: '/', mod: fakeMod() })
  assert.match(page, /<script data-goatcounter="https:\/\/baselane\.goatcounter\.com\/count" async src="https:\/\/gc\.zgo\.at\/count\.v4\.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"><\/script>/)
  const csp = page.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]
  assert.match(csp, /script-src 'self' https:\/\/gc\.zgo\.at\/count\.v4\.js;/)
  assert.match(csp, /connect-src 'self' https:\/\/baselane\.goatcounter\.com;/)
  assert.doesNotMatch(csp, /img-src [^;]*goatcounter/)
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/)
})

test('the footer links the Baselane mods source repo', () => {
  const page = modPage({ base: '/', mod: fakeMod() })
  assert.match(page, /<a href="https:\/\/github\.com\/baselane-sh\/mods">Baselane mods source<\/a>/)
})
