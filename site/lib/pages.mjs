import { html, raw, CATEGORY_NAMES } from './html.mjs'
import { faceplate } from './panel.mjs'
import { renderMarkdown } from './markdown.mjs'
import { SITE, icon, layout } from './layout.mjs'
import { homeInstall, modInstall, glance, RISK_WORDS } from './install.mjs'
import { RULES } from '../../lib/rules.mjs'
import { CATEGORIES } from '../../lib/entry.mjs'

export { SITE, layout }

// Roving tabindex: only the checked tab is in the Tab order; arrow keys move between tabs.
function categoryRail(mods) {
  const counts = new Map(CATEGORIES.map(c => [c, mods.filter(m => m.category === c).length]))
  const max = Math.max(...counts.values(), 1)
  const step = count => Math.max(1, Math.ceil((count / max) * 4))
  return html`<div class="tab-rail" role="radiogroup" aria-label="Category" data-filter="category">
  <button type="button" role="radio" aria-checked="true" tabindex="0" class="tab tab-all" data-value="">All <span class="count">${mods.length}</span></button>
  ${CATEGORIES.filter(c => counts.get(c) > 0).map(c => html`<button type="button" role="radio" aria-checked="false" tabindex="-1" class="tab tab-w${step(counts.get(c))} cat-${c}" data-value="${c}">${CATEGORY_NAMES[c]} <span class="count">${counts.get(c)}</span></button>`)}
</div>`
}

function controls(mods, hasStars) {
  return html`<div class="controls">
    <label class="search">${icon('search')}<span class="sr-only">Search mods by name, tag or what they do</span><input type="search" data-filter="q" placeholder="Search ${mods.length} mods" autocomplete="off" spellcheck="false" aria-keyshortcuts="/"><kbd class="search-key" aria-hidden="true">/</kbd></label>
    <label class="switch"><input type="checkbox" data-filter="verified"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>Verified only</span></label>
    <label class="sort"><span>Sort</span><select data-filter="sort"><option value="updated">Recently updated</option><option value="newest">Newest</option>${hasStars ? html`<option value="stars">Most stars</option>` : ''}<option value="name">Name</option></select></label>
  </div>`
}

export function browsePage({ base, mods, top }) {
  const body = html`<section class="utility" aria-labelledby="intro-title">
  <div class="utility-head">
    <div class="utility-intro">
      <h1 id="intro-title">Mods for Claude Code, checked and pinned.</h1>
      <p class="what">A mod is a small add-on that runs inside Claude Code: a pane, a band above the prompt, a slash command, a sound or a guard.</p>
      <p>Each one here passed ${RULES.length} automated checks and shows what it can do before you install it. <a href="${SITE.modsDocs}">How mods work</a></p>
    </div>
    ${homeInstall()}
  </div>
  ${controls(mods, top.length > 0)}
  ${categoryRail(mods)}
</section>
${top.length ? html`<section class="rack-section" aria-labelledby="top-title" data-top>
  <h2 id="top-title">Top mods</h2>
  <div class="rack rack-top">${top.map(mod => faceplate(mod, { base }))}</div>
</section>` : ''}
<section class="rack-section" aria-labelledby="all-title">
  <div class="rack-head">
    <h2 id="all-title">All mods <span class="count" data-count>${mods.length}</span></h2>
    <p class="rack-key"><b>IN</b> jacks: what a mod listens to. <b>OUT</b> jacks: what it does on your machine. A red label means high risk.</p>
  </div>
  <div class="rack" data-rack>${mods.map(mod => faceplate(mod, { base }))}</div>
  <div class="empty" data-empty hidden>
    <p><strong>No mod matches<span data-empty-query></span>.</strong> Try fewer words, another category, or clear the filters.</p>
    <button type="button" class="btn" data-clear>Clear the filters</button>
  </div>
</section>`
  return layout({ base, title: 'Baselane mods: Claude Code mods, checked and pinned', description: `${mods.length} Claude Code mods. Each one passed automated checks, is pinned to a checked commit, and shows what it can do before you install it.`, current: 'browse', body, path: '' })
}

function capabilityList(groups, title, hint, empty) {
  return html`<div class="cap-col">
  <h3>${title}</h3>
  <p class="cap-hint muted">${hint}</p>
  ${groups.length ? html`<ul class="caps">${groups.map(group => html`<li class="cap risk-${group.risk}"><span class="cap-risk">${RISK_WORDS[group.risk]}</span><span class="cap-words">${group.words}</span><span class="cap-raw">${group.raw.join(', ')}</span></li>`)}</ul>` : html`<p class="muted">${empty}</p>`}
</div>`
}

function versions(mod) {
  const rows = mod.history.length ? mod.history : [{ version: mod.version, date: mod.updatedAt, sha: mod.sha }]
  return html`<div class="table-well"><table class="versions"><thead><tr><th scope="col">Version</th><th scope="col">Date</th><th scope="col">Commit</th></tr></thead><tbody>
${rows.map(row => html`<tr><td>${row.version}</td><td>${row.date}</td><td><a href="https://github.com/${mod.repo}/tree/${row.sha}">${row.sha.slice(0, 12)}</a></td></tr>`)}
</tbody></table></div>`
}

function readmeBlock(mod) {
  if (!mod.readme) return html`<p class="muted">No README was loaded for this mod. <a href="${mod.sourceUrl}">Read its source at the pinned commit</a>.</p>`
  return html`<div class="readme">${raw(renderMarkdown(mod.readme, { imageBase: mod.rawBase, linkBase: mod.blobBase }))}</div>`
}

function reportUrl(mod) {
  const params = new URLSearchParams({ template: 'report.yml', labels: 'report', title: `Report: ${mod.name}`, mod: mod.name })
  return `https://github.com/${SITE.catalogRepo}/issues/new?${params}`
}

function trustNote(mod) {
  return mod.verified
    ? html`<p class="verified-note">${icon('check')}<span>Verified: Baselane reviewed the code at commit <code>${mod.sha.slice(0, 12)}</code>.</span></p>`
    : html`<p class="unreviewed-note" role="note">${icon('warn')}<span>Baselane has not reviewed this code. It runs with your permissions.</span></p>`
}

export function modPage({ base, mod }) {
  const author = mod.author?.name ?? mod.submitter
  const body = html`<article class="mod-page">
  <header class="mod-head">
    <p class="crumb"><a href="${base}">Browse</a> <span aria-hidden="true">/</span> <a href="${base}?category=${mod.category}">${CATEGORY_NAMES[mod.category]}</a></p>
    <h1>${mod.name}</h1>
    <p class="lede">${mod.description}</p>
  </header>
  <div class="mod-plate">${faceplate(mod, { base, size: 'big' })}</div>
  <div class="mod-body">
    ${trustNote(mod)}
    ${glance(mod)}
    ${modInstall(mod)}
    <dl class="facts">
      <div><dt>Author</dt><dd>${author}</dd></div>
      <div><dt>Version</dt><dd>${mod.version}</dd></div>
      <div><dt>Updated</dt><dd>${mod.updatedAt}</dd></div>
      <div><dt>License</dt><dd>${mod.license}</dd></div>
      ${mod.stars !== null ? html`<div><dt>Stars</dt><dd>${mod.stars}</dd></div>` : ''}
      <div><dt>Source</dt><dd><a href="${mod.sourceUrl}">${mod.repo}</a></dd></div>
    </dl>
    <section class="capabilities" aria-labelledby="caps-title">
      <h2 id="caps-title">What this mod can do</h2>
      <p class="muted">Read from the mod's code at the pinned commit by <code>claude plugin validate</code>. Riskiest first.</p>
      <div class="cap-grid">
        ${capabilityList(mod.caps.outputs, 'Actions it can take', 'OUT jacks: calls it makes on your machine.', 'It makes no calls.')}
        ${capabilityList(mod.caps.inputs, 'Events it listens to', 'IN jacks: hooks into Claude Code.', 'It listens to no events.')}
      </div>
    </section>
    <section aria-labelledby="readme-title"><h2 id="readme-title">README</h2>${readmeBlock(mod)}</section>
    <section aria-labelledby="versions-title"><h2 id="versions-title">Versions</h2>${versions(mod)}</section>
    <p class="mod-links"><a href="${mod.sourceUrl}">Source at ${mod.sha.slice(0, 12)} ${icon('arrow')}</a> <a href="${reportUrl(mod)}">Report this mod ${icon('arrow')}</a></p>
  </div>
</article>`
  return layout({ base, title: `${mod.name}: a Claude Code mod`, description: mod.description, current: '', body, path: `mods/${mod.name}/` })
}

const ENTRY_TEMPLATE = `{
  "name": "my-mod",
  "source": { "source": "github", "repo": "you/my-mod", "ref": "v1.0.0" },
  "category": "pane",
  "tags": ["git"],
  "screenshots": ["docs/screenshot.png"]
}`

export function submitPage({ base }) {
  const body = html`<article class="prose-page">
  <h1>Publish a mod</h1>
  <p class="lede">Open one pull request. A bot runs the checks and comments the result. When every check passes, it merges, and your mod is listed within minutes.</p>
  <ol class="steps">
    <li><h2>Put your mod on GitHub</h2><p>Use a public github.com repo. Set <code>name</code>, <code>version</code>, <code>description</code> (200 characters or fewer), <code>author</code> and <code>license</code> in <code>.claude-plugin/plugin.json</code>. Add at least one test. Push a tag, for example <code>v1.0.0</code>.</p></li>
    <li><h2>Add one file to the catalog</h2><p>Fork <a href="https://github.com/${SITE.catalogRepo}">${SITE.catalogRepo}</a> and add <code>entries/my-mod.json</code>. For a mod in a subfolder, use <code>"source": "git-subdir"</code> with <code>url</code> and <code>path</code>.</p><pre tabindex="0"><code>${ENTRY_TEMPLATE}</code></pre><p>Categories: ${CATEGORIES.join(', ')}.</p></li>
    <li><h2>Open a pull request</h2><p>Your first pull request waits until a maintainer approves the run. After that, your pull requests run at once. To update a mod, raise <code>version</code>, push a new tag and change <code>ref</code>.</p></li>
  </ol>
  <h2>The checks</h2>
  <ol class="rules">${RULES.map(rule => html`<li><strong>${rule.name}.</strong> ${rule.hint}</li>`)}</ol>
  <h2>Verified</h2>
  <p>A maintainer reads the code at the pinned commit and adds the mod to the verified list. When the mod updates to a new commit, the badge drops until someone reviews it again. Mods without the badge passed the automated checks only.</p>
  <h2>Removal</h2>
  <p>A maintainer can remove a mod from the catalog. Claude Code then uninstalls it at the next session start, but only for people whose copy of the gallery is current. Auto-update is off by default, so ask your users to turn it on.</p>
</article>`
  return layout({ base, title: 'Publish a mod: Baselane mods', description: 'How to list a Claude Code mod in the Baselane mods gallery: one pull request, automated checks, pinned installs.', current: 'submit', body, path: 'submit/' })
}

export function notFoundPage({ base }) {
  const body = html`<article class="prose-page not-found"><h1>No module in this slot.</h1><p class="lede">The page you asked for is not here. The mod may have been removed, or the link has a typo.</p><p><a class="btn" href="${base}">Browse all mods</a></p></article>`
  return layout({ base, title: 'Not found: Baselane mods', description: 'Page not found.', current: '', body, path: '404.html' })
}
