import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../site/lib/markdown.mjs'
import { capabilities, topRisk } from '../site/lib/capabilities.mjs'

const BASES = { imageBase: 'https://raw.githubusercontent.com/a/b/sha/dir/', linkBase: 'https://github.com/a/b/blob/sha/dir/' }

test('raw HTML in a README is escaped, not rendered', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', BASES)
  assert.doesNotMatch(html, /<script|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
})

test('javascript: and data: links are not links', () => {
  const html = renderMarkdown('[a](javascript:alert(1)) [b](data:text/html,x) [c](vbscript:x)', BASES)
  assert.doesNotMatch(html, /href="(javascript|data|vbscript):/)
})

test('a data: image is dropped and only https images remain', () => {
  const html = renderMarkdown('![x](data:image/png;base64,AAAA) ![y](http://e.com/a.png) ![z](https://e.com/z.png)', BASES)
  assert.doesNotMatch(html, /src="data:|src="http:/)
  assert.match(html, /src="https:\/\/e\.com\/z\.png"/)
})

test('relative images resolve to the pinned raw URL, relative links to the pinned blob', () => {
  const html = renderMarkdown('![s](docs/s.png) [guide](docs/guide.md)', BASES)
  assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/a\/b\/sha\/dir\/docs\/s\.png"/)
  assert.match(html, /href="https:\/\/github\.com\/a\/b\/blob\/sha\/dir\/docs\/guide\.md"/)
})

test('links get rel nofollow noopener', () => {
  assert.match(renderMarkdown('[x](https://e.com)', BASES), /rel="nofollow noopener noreferrer"/)
})

test('capabilities group calls in plain words, riskiest first', () => {
  const { inputs, outputs } = capabilities({
    hooks: ['ui.render{component=Pane}', 'tool.call', 'ui.render{component=AbovePrompt}'],
    calls: ['$.ui.toast', '$.process.run', '$.fs.exists', '$.fs.stat'],
  })
  assert.deepEqual(outputs.map(group => group.words), ['Starts programs on your machine', 'Looks at file names, sizes and dates', 'Shows short notices'])
  assert.deepEqual(outputs[1].raw, ['$.fs.exists', '$.fs.stat'])
  assert.equal(inputs[0].label, 'TOOL')
  assert.equal(inputs[1].raw.length, 2)
})

test('an unknown call shows as raw text with medium risk', () => {
  const { outputs } = capabilities({ hooks: [], calls: ['$.future.thing'] })
  assert.deepEqual(outputs, [{ kind: 'call', label: 'THING', words: '$.future.thing', risk: 'medium', known: false, raw: ['$.future.thing'] }])
})

test('a call made through a helper keeps its risk and words', () => {
  const { outputs } = capabilities({ hooks: [], calls: ['$.process.run (via liveOf)', '$.session.cwd (via liveOf)'] })
  assert.deepEqual(outputs.map(group => [group.label, group.words, group.risk, group.raw]), [
    ['RUN', 'Starts programs on your machine', 'high', ['$.process.run (via liveOf)']],
    ['SESS', 'Reads session details: folder, model, usage and turns', 'low', ['$.session.cwd (via liveOf)']],
  ])
})

test('topRisk is the highest risk across inputs and outputs', () => {
  assert.equal(topRisk(capabilities({ hooks: ['session.start'], calls: ['$.http.fetch'] })), 'high')
  assert.equal(topRisk(capabilities({ hooks: [], calls: [] })), 'info')
})
