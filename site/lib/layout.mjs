// The page shell: CSP, head, top rail, footer rail, find palette and the icon sprite.
import { html, raw, render, esc } from './html.mjs'

export const SITE = {
  name: 'Baselane mods',
  marketplace: 'baselane-mods',
  catalogRepo: 'baselane-sh/mods-catalog',
  modsDocs: 'https://code.claude.com/docs/en/plugins/mods/overview',
  customDomain: 'mods.baselane.sh',
}

const CSP = "default-src 'self'; script-src 'self' https://gc.zgo.at/count.v4.js; style-src 'self'; font-src 'self'; img-src 'self' https://raw.githubusercontent.com https://avatars.githubusercontent.com; connect-src 'self' https://baselane.goatcounter.com; object-src 'none'; base-uri 'none'; form-action 'none'"

// The public URL of the site root: the custom domain at base "/", else the GitHub Pages
// project URL (https://<owner>.github.io/<repo>/). SITE_URL overrides both.
export function siteUrl(base) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/?$/, '/')
  if (base === '/') return `https://${SITE.customDomain}/`
  return `https://${SITE.catalogRepo.split('/')[0]}.github.io${base}`
}

export const icon = name => html`<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`

const ICONS = raw(`<svg class="sprite" aria-hidden="true" focusable="false"><defs>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 5H5.5A1.5 1.5 0 0 0 4 6.5V16" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
<symbol id="i-jack" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--nut)"/><circle cx="12" cy="12" r="9" fill="none" stroke="var(--nut-hi)" stroke-width="2" stroke-dasharray="1.6 1.6"/><circle cx="12" cy="12" r="6" fill="var(--nut-hi)"/><circle cx="12" cy="12" r="4.4" fill="var(--hole)"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</defs></svg>`)

function header(base, current) {
  const link = (href, text, key) => html`<a href="${href}" ${current === key ? raw('aria-current="page"') : ''}>${text}</a>`
  return html`<header class="top-rail">
  <a class="brand" href="${base}"><span class="brand-led" aria-hidden="true"></span><span class="brand-word">BASELANE</span><span class="brand-sub">MODS</span></a>
  <nav class="nav" aria-label="Main">${link(base, 'Browse', 'browse')}${link(`${base}submit/`, 'Publish a mod', 'submit')}<a href="https://github.com/${SITE.catalogRepo}">GitHub</a></nav>
  <button class="palette-open" type="button" data-palette-open aria-keyshortcuts="Control+K Meta+K">${icon('search')}<span>Find a mod</span><kbd data-shortcut>⌘K</kbd></button>
</header>`
}

function footer() {
  return html`<footer class="bottom-rail">
  <p>Every mod here passed automated checks and is pinned to the commit that passed them. A mod runs with your permissions. <a href="${SITE.modsDocs}">How mods work</a>. This site counts visits with GoatCounter: no cookies, no personal data stored.</p>
  <p class="rail-links"><a href="https://github.com/${SITE.catalogRepo}">Catalog source</a><a href="https://github.com/${SITE.catalogRepo}/security/advisories/new">Report a security problem</a><a href="https://baselane.sh">Baselane</a></p>
</footer>`
}

function palette() {
  return html`<dialog class="palette" data-palette aria-label="Find a mod">
  <div class="palette-box">
    <label class="palette-field">${icon('search')}<span class="sr-only">Find a mod</span><input type="search" data-palette-input placeholder="Find a mod by name, tag or what it does" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="palette-results"></label>
    <ul class="palette-results" id="palette-results" role="listbox" aria-label="Matching mods" data-palette-results></ul>
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
<link rel="canonical" href="${esc(siteUrl(base) + path)}">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}assets/fonts/BarlowCondensed-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/Barlow-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/site.css">
<script src="${base}assets/site.js" defer></script>
<script data-goatcounter="https://baselane.goatcounter.com/count" async src="https://gc.zgo.at/count.v4.js" integrity="sha384-nRw6qfbWyJha9LhsOtSb2YJDyZdKvvCFh0fJYlkquSFjUxp9FVNugbfy8q1jdxI+" crossorigin="anonymous"></script>
</head>
<body data-base="${base}">
${render(ICONS)}
<a class="skip" href="#main">Skip to content</a>
${render(header(base, current))}
<main id="main">
${render(body)}
</main>
${render(footer())}
${render(palette())}
<div class="sr-only" role="status" aria-live="polite" data-announce></div>
</body>
</html>
`
}
