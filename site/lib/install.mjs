// The install path: the two install lines with copy buttons, what to type after install,
// setup notes, and the short "it can" summary that sits above the lines on a mod page.
import { html } from './html.mjs'
import { SITE, icon } from './layout.mjs'
import { slashCommands, registersCommand, setupNote, riskiest } from './usage.mjs'

export const MARKETPLACE_LINE = `/plugin marketplace add ${SITE.catalogRepo}`
export const installLine = name => `/plugin install ${name}@${SITE.marketplace}`

export const RISK_WORDS = { high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }

// `mod` (optional) names the mod an install line belongs to; the copy counter reads it.
export function copyLine(text, id, mod) {
  const modAttr = mod ? html` data-mod="${mod}"` : ''
  return html`<div class="copy-line"><code id="cmd-${id}">${text}</code><button type="button" class="copy" data-copy="cmd-${id}"${modAttr} aria-describedby="cmd-${id}">${icon('copy')}<span data-copy-label>Copy</span></button></div>`
}

function step(n, label, content) {
  return html`<li class="step"><span class="step-n" aria-hidden="true">${n}</span><div class="step-body"><p class="step-label">${label}</p>${content}</div></li>`
}

// Home page: step 1 is copyable, step 2 is the pattern every mod page fills in.
export function homeInstall() {
  return html`<section class="howto" aria-labelledby="howto-title">
  <h2 id="howto-title">Install in two steps</h2>
  <ol class="install-steps">
    ${step(1, 'Add the gallery to Claude Code. Do this once.', copyLine(MARKETPLACE_LINE, 'marketplace'))}
    ${step(2, 'Open a mod below and copy its install line:', html`<p class="pattern"><code>/plugin install <var>&lt;name&gt;</var>@${SITE.marketplace}</code></p>`)}
  </ol>
</section>`
}

function useStep(mod) {
  const commands = slashCommands(mod)
  if (commands.length) {
    return html`<p class="step-label">Use it: type ${commands.map((command, i) => html`${i ? (i === commands.length - 1 ? ' or ' : ', ') : ''}<code>${command}</code>`)} in Claude Code.</p>`
  }
  if (registersCommand(mod)) return html`<p class="step-label">Use it: it adds a slash command. Its README names it.</p>`
  return null
}

export function modInstall(mod) {
  const use = useStep(mod)
  const setup = setupNote(mod.description)
  return html`<section class="install" id="install" aria-labelledby="install-title">
  <h2 id="install-title">Install</h2>
  <ol class="install-steps">
    ${step(1, 'Add the gallery to Claude Code. Skip this if you did it before.', copyLine(MARKETPLACE_LINE, 'add'))}
    ${step(2, 'Install this mod.', copyLine(installLine(mod.name), 'install', mod.name))}
    ${use ? html`<li class="step"><span class="step-n" aria-hidden="true">3</span><div class="step-body">${use}</div></li>` : ''}
  </ol>
  ${setup ? html`<p class="setup-note">${icon('warn')}<span><strong>Needs setup.</strong> ${setup}</span></p>` : ''}
  <p class="muted">To get updates and removals, turn on auto-update: in Claude Code, open <code>/plugin</code>, then Marketplaces, then ${SITE.marketplace}.</p>
</section>`
}

// Plain words for the riskiest things the mod can do, shown before the install lines.
export function glance(mod) {
  const { risk, groups } = riskiest(mod.caps)
  if (!groups.length) return html`<p class="glance risk-info"><span class="glance-risk">Info</span><span>It declares no hooks and no calls. <a href="#caps-title">Details</a></span></p>`
  const shown = groups.slice(0, 3)
  const more = groups.length - shown.length
  return html`<div class="glance risk-${risk}">
  <p class="glance-lead"><span class="glance-risk">${RISK_WORDS[risk]}</span><span>Its riskiest abilities:</span></p>
  <ul>${shown.map(group => html`<li>${group.words}</li>`)}</ul>
  <p><a href="#caps-title">${more > 0 ? `See ${more} more and everything else it can do` : 'See everything it can do'}</a></p>
</div>`
}
