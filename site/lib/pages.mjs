import { html, raw, render, esc, CATEGORY_NAMES } from './html.mjs'
import { faceplate } from './panel.mjs'
import { renderMarkdown } from './markdown.mjs'
import { RULES } from '../../lib/rules.mjs'
import { CATEGORIES } from '../../lib/entry.mjs'

export const SITE = {
  name: 'Baselane mods',
  marketplace: 'baselane-mods',
  catalogRepo: 'baselane-sh/mods-catalog',
  modsDocs: 'https://code.claude.com/docs/en/plugins/mods/overview',
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' https://raw.githubusercontent.com https://avatars.githubusercontent.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"

const icon = name => html`<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`

const ICONS = raw(`<svg class="sprite" aria-hidden="true" focusable="false"><defs>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 5H5.5A1.5 1.5 0 0 0 4 6.5V16" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</defs></svg>`)

function header(base, current) {
  const link = (href, text, key) => html`<a href="${href}" ${current === key ? raw('aria-current="page"') : ''}>${text}</a>`
  return html`<header class="top-rail">
  <a class="brand" href="${base}"><span class="brand-led" aria-hidden="true"></span><span class="brand-word">BASELANE</span><span class="brand-sub">MODS</span></a>
  <nav class="nav" aria-label="Main">${link(base, 'Browse', 'browse')}${link(`${base}submit/`, 'Publish a mod', 'submit')}<a href="https://github.com/${SITE.catalogRepo}">GitHub</a></nav>
  <button class="palette-open" type="button" data-palette-open>${icon('search')}<span>Find a mod</span><kbd>⌘K</kbd></button>
</header>`
}

function footer(base) {
  return html`<footer class="bottom-rail">
  <p>Every mod here passed automated checks and is pinned to the commit that passed them. A mod runs with your permissions. <a href="${SITE.modsDocs}">How mods work</a>.</p>
  <p><a href="https://github.com/${SITE.catalogRepo}">Catalog source</a> <a href="https://github.com/${SITE.catalogRepo}/security/advisories/new">Report a security problem</a> <a href="https://baselane.sh">Baselane</a></p>
</footer>`
}

function palette() {
  return html`<dialog class="palette" data-palette aria-label="Find a mod">
  <div class="palette-box">
    <label class="palette-field">${icon('search')}<span class="sr-only">Find a mod</span><input type="search" data-palette-input placeholder="Find a mod by name or what it does" autocomplete="off" spellcheck="false" aria-controls="palette-results"></label>
    <ul class="palette-results" id="palette-results" role="listbox" data-palette-results></ul>
    <p class="palette-hint"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>esc</kbd> close</p>
  </div>
</dialog>`
}

export function layout({ base, title, description, current, body, path }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://mods.baselane.sh/${path}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}assets/fonts/BarlowCondensed-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/Barlow-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/site.css">
<script src="${base}assets/site.js" defer></script>
</head>
<body data-base="${base}">
${render(ICONS)}
<a class="skip" href="#main">Skip to content</a>
${render(header(base, current))}
<main id="main">
${render(body)}
</main>
${render(footer(base))}
${render(palette())}
</body>
</html>
`
}


function categoryRail(mods) {
  const counts = new Map(CATEGORIES.map(c => [c, mods.filter(m => m.category === c).length]))
  const max = Math.max(...counts.values(), 1)
  const step = count => Math.max(1, Math.ceil((count / max) * 4))
  return html`<div class="tab-rail" role="radiogroup" aria-label="Category" data-filter="category">
  <button type="button" role="radio" aria-checked="true" class="tab tab-all" data-value="">All <span class="count">${mods.length}</span></button>
  ${CATEGORIES.filter(c => counts.get(c) > 0).map(c => html`<button type="button" role="radio" aria-checked="false" class="tab tab-w${step(counts.get(c))} cat-${c}" data-value="${c}">${CATEGORY_NAMES[c]} <span class="count">${counts.get(c)}</span></button>`)}
</div>`
}

export function browsePage({ base, mods, top }) {
  const body = html`<section class="utility" aria-labelledby="intro-title">
  <div class="utility-intro">
    <h1 id="intro-title">Mods for Claude Code, checked and pinned.</h1>
    <p>A mod is code that runs inside Claude Code: a pane, a band above the prompt, a command, a sound or a guard. Every mod here passed ${RULES.length} automated checks, and each one shows what it can do before you install it. <a href="${SITE.modsDocs}">What is a mod?</a></p>
  </div>
  <div class="controls">
    <label class="search">${icon('search')}<span class="sr-only">Search mods</span><input type="search" data-filter="q" placeholder="Search ${mods.length} mods" autocomplete="off" spellcheck="false"></label>
    <label class="switch"><input type="checkbox" data-filter="verified"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span>Verified only</span></label>
    <label class="sort"><span>Sort</span><select data-filter="sort"><option value="updated">Recently updated</option><option value="newest">Newest</option><option value="stars">Most stars</option><option value="name">Name</option></select></label>
  </div>
  ${categoryRail(mods)}
  <div class="install-once">
    <span>Add the gallery to Claude Code once:</span>
    ${copyLine(`/plugin marketplace add ${SITE.catalogRepo}`, 'marketplace')}
  </div>
</section>
${top.length ? html`<section class="rack-section" aria-labelledby="top-title" data-top>
  <h2 id="top-title">Top mods</h2>
  <div class="rack rack-top">${top.map(mod => faceplate(mod, { base }))}</div>
</section>` : ''}
<section class="rack-section" aria-labelledby="all-title">
  <h2 id="all-title">All mods <span class="count" data-count>${mods.length}</span></h2>
  <div class="rack" data-rack>${mods.map(mod => faceplate(mod, { base }))}</div>
  <div class="empty" data-empty hidden>
    <p>No mod matches. Try fewer words, or clear the filters.</p>
    <button type="button" class="btn" data-clear>Clear the filters</button>
  </div>
</section>`
  return layout({ base, title: 'Baselane mods: Claude Code mods, checked and pinned', description: `${mods.length} Claude Code mods. Each one passed automated checks, is pinned to a checked commit, and shows what it can do before you install it.`, current: 'browse', body, path: '' })
}

function copyLine(text, id) {
  return html`<div class="copy-line"><code id="cmd-${id}">${text}</code><button type="button" class="copy" data-copy="cmd-${id}">${icon('copy')}<span data-copy-label>Copy</span></button></div>`
}

const RISK_WORDS = { high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }

function capabilityList(groups, title, empty) {
  return html`<div class="cap-col">
  <h3>${title}</h3>
  ${groups.length ? html`<ul class="caps">${groups.map(group => html`<li class="cap risk-${group.risk}"><span class="cap-risk">${RISK_WORDS[group.risk]}</span><span class="cap-words">${group.words}</span><span class="cap-raw">${group.raw.join(', ')}</span></li>`)}</ul>` : html`<p class="muted">${empty}</p>`}
</div>`
}

function versions(mod) {
  const rows = mod.history.length ? mod.history : [{ version: mod.version, date: mod.updatedAt, sha: mod.sha }]
  return html`<table class="versions"><thead><tr><th scope="col">Version</th><th scope="col">Date</th><th scope="col">Commit</th></tr></thead><tbody>
${rows.map(row => html`<tr><td>${row.version}</td><td>${row.date}</td><td><a href="https://github.com/${mod.repo}/tree/${row.sha}">${row.sha.slice(0, 12)}</a></td></tr>`)}
</tbody></table>`
}

function readmeBlock(mod) {
  if (!mod.readme) return html`<p class="muted">This mod has no README. Read its source at the pinned commit.</p>`
  return html`<div class="readme">${raw(renderMarkdown(mod.readme, { imageBase: mod.rawBase, linkBase: mod.blobBase }))}</div>`
}

function reportUrl(mod) {
  const params = new URLSearchParams({ template: 'report.yml', labels: 'report', title: `Report: ${mod.name}`, mod: mod.name })
  return `https://github.com/${SITE.catalogRepo}/issues/new?${params}`
}

export function modPage({ base, mod }) {
  const author = mod.author?.name ?? mod.submitter
  const body = html`<article class="mod-page">
  <div class="mod-plate">${faceplate(mod, { base, size: 'big' })}</div>
  <div class="mod-body">
    <p class="crumb"><a href="${base}">Browse</a> <span aria-hidden="true">/</span> <a href="${base}?category=${mod.category}">${CATEGORY_NAMES[mod.category]}</a></p>
    <h1>${mod.name}</h1>
    <p class="lede">${mod.description}</p>
    <dl class="facts">
      <div><dt>Author</dt><dd>${author}</dd></div>
      <div><dt>Version</dt><dd>${mod.version}</dd></div>
      <div><dt>Updated</dt><dd>${mod.updatedAt}</dd></div>
      <div><dt>License</dt><dd>${mod.license}</dd></div>
      ${mod.stars !== null ? html`<div><dt>Stars</dt><dd>${mod.stars}</dd></div>` : ''}
    </dl>
    ${mod.verified ? html`<p class="verified-note">${icon('check')}<span>Verified: Baselane reviewed the code at commit <code>${mod.sha.slice(0, 12)}</code>.</span></p>` : html`<p class="unreviewed-note" role="note">${icon('warn')}<span>Baselane has not reviewed this code. It runs with your permissions.</span></p>`}
    <section class="install" aria-labelledby="install-title">
      <h2 id="install-title">Install</h2>
      <ol class="install-steps">
        <li><span>Once, add the gallery:</span>${copyLine(`/plugin marketplace add ${SITE.catalogRepo}`, 'add')}</li>
        <li><span>Install this mod:</span>${copyLine(`/plugin install ${mod.name}@${SITE.marketplace}`, 'install')}</li>
      </ol>
      <p class="muted">Turn on auto-update in <code>/plugin</code>, Marketplaces, ${SITE.marketplace}, so that updates and removals reach you.</p>
    </section>
    <section class="capabilities" aria-labelledby="caps-title">
      <h2 id="caps-title">What this mod can do</h2>
      <p class="muted">Read by <code>claude plugin validate</code> from the code at the pinned commit. Riskiest first.</p>
      <div class="cap-grid">
        ${capabilityList(mod.caps.outputs, 'What it does', 'It makes no calls.')}
        ${capabilityList(mod.caps.inputs, 'What it listens to', 'It listens to no events.')}
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
    <li><h2>Add one file to the catalog</h2><p>Fork <a href="https://github.com/${SITE.catalogRepo}">${SITE.catalogRepo}</a> and add <code>entries/my-mod.json</code>. For a mod in a subfolder, use <code>"source": "git-subdir"</code> with <code>url</code> and <code>path</code>.</p><pre><code>${ENTRY_TEMPLATE}</code></pre><p>Categories: ${CATEGORIES.join(', ')}.</p></li>
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
