// The module faceplate: a mod drawn as a Eurorack panel. Inputs are the hooks it
// listens to, outputs are the calls it makes. Widths come from classes (hp-N), never
// inline styles, because the CSP allows no inline style.
import { html, CATEGORY_NAMES } from './html.mjs'

const RISK_LABEL = { high: 'high risk', medium: 'medium risk', low: 'low risk', info: 'no risky abilities' }

const ring = html`<svg class="jack-ring" aria-hidden="true" focusable="false"><use href="#i-jack"></use></svg>`

// On the big plate a jack is focusable and draws its plain-words label on hover or focus.
// Rack modules are links, so their jacks stay plain (no focusable element inside a link).
function jack(group, kind, interactive) {
  return interactive
    ? html`<span class="jack jack-${kind} risk-${group.risk} jack-live" tabindex="0" role="img" aria-label="${group.words}" data-label="${group.words}">${ring}<b aria-hidden="true">${group.label}</b></span>`
    : html`<span class="jack jack-${kind} risk-${group.risk}">${ring}<b>${group.label}</b></span>`
}

function jackRow(groups, kind, limit, interactive) {
  const shown = groups.slice(0, limit)
  const more = groups.length - shown.length
  return html`<span class="jacks jacks-${kind}">${shown.map(group => jack(group, kind, interactive))}${more > 0 ? html`<span class="jack-more">+${more}</span>` : ''}</span>`
}

export function faceplate(mod, { base, size = 'rack' } = {}) {
  const limit = size === 'rack' ? mod.hp / 2 - 1 : 20
  const tag = size === 'rack' ? 'a' : 'div'
  const href = size === 'rack' ? `${base}mods/${mod.name}/` : null
  return html`<${tag} class="module hp-${size === 'rack' ? mod.hp : 'big'} cat-${mod.category}" ${href ? html`href="${href}"` : ''} data-name="${mod.name}" data-category="${mod.category}" data-verified="${mod.verified ? '1' : '0'}" data-listed="${mod.listedAt}" data-updated="${mod.updatedAt}" data-stars="${mod.stars ?? 0}" data-search="${[mod.name, mod.description, ...mod.tags, mod.category].join(' ').toLowerCase()}">
  <span class="screw s-tl" aria-hidden="true"></span><span class="screw s-tr" aria-hidden="true"></span>
  <span class="plate-head">
    <span class="led" aria-hidden="true"></span>
    <span class="plate-name">${mod.name}</span>${size === 'rack' ? html`<span class="sr-only">, ${CATEGORY_NAMES[mod.category]}, ${RISK_LABEL[mod.risk]}.</span>` : ''}
    <span class="plate-stripe" aria-hidden="true"><span>${CATEGORY_NAMES[mod.category]}</span></span>
  </span>
  <span class="plate-silk">${mod.description}</span>
  <span class="plate-io" ${size === 'rack' ? html`aria-hidden="true"` : ''}>
    <span class="io-label" aria-hidden="true">IN</span>${jackRow(mod.caps.inputs, 'in', limit, size !== 'rack')}
    <span class="io-label" aria-hidden="true">OUT</span>${jackRow(mod.caps.outputs, 'out', limit, size !== 'rack')}
  </span>
  <span class="plate-foot"><span>v${mod.version}</span>${mod.verified ? html`<span class="seal">VERIFIED</span>` : html`<span class="sticker">UNREVIEWED</span>`}</span>
  <span class="screw s-bl" aria-hidden="true"></span><span class="screw s-br" aria-hidden="true"></span>
</${tag}>`
}
