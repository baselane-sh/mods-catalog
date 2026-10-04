// The module faceplate: a mod drawn as a Eurorack panel. Inputs are the hooks it
// listens to, outputs are the calls it makes. Widths come from classes (hp-N), never
// inline styles, because the CSP allows no inline style.
import { html, CATEGORY_NAMES } from './html.mjs'

const jack = (group, kind) => html`<span class="jack jack-${kind} risk-${group.risk}" title="${group.words}"><i aria-hidden="true"></i><b>${group.label}</b></span>`

function jackRow(groups, kind, limit) {
  const shown = groups.slice(0, limit)
  const more = groups.length - shown.length
  return html`<span class="jacks jacks-${kind}">${shown.map(group => jack(group, kind))}${more > 0 ? html`<span class="jack-more">+${more}</span>` : ''}</span>`
}

export function faceplate(mod, { base, size = 'rack' } = {}) {
  const limit = size === 'rack' ? Math.max(2, mod.hp / 2) : 20
  const tag = size === 'rack' ? 'a' : 'div'
  const href = size === 'rack' ? `${base}mods/${mod.name}/` : null
  const label = `${mod.name}, ${CATEGORY_NAMES[mod.category]}, version ${mod.version}${mod.verified ? ', verified' : ', not verified'}`
  return html`<${tag} class="module hp-${size === 'rack' ? mod.hp : 'big'} cat-${mod.category}" ${href ? html`href="${href}"` : ''} data-name="${mod.name}" data-category="${mod.category}" data-verified="${mod.verified ? '1' : '0'}" data-listed="${mod.listedAt}" data-updated="${mod.updatedAt}" data-stars="${mod.stars ?? 0}" data-search="${[mod.name, mod.description, ...mod.tags, mod.category].join(' ').toLowerCase()}" aria-label="${label}">
  <span class="screw s-tl" aria-hidden="true"></span><span class="screw s-tr" aria-hidden="true"></span>
  <span class="plate-head">
    <span class="led" aria-hidden="true"></span>
    <span class="plate-name">${mod.name}</span>
    <span class="plate-stripe" aria-hidden="true"><span>${CATEGORY_NAMES[mod.category]}</span></span>
  </span>
  <span class="plate-silk">${mod.description}</span>
  <span class="plate-io">
    <span class="io-label" aria-hidden="true">IN</span>${jackRow(mod.caps.inputs, 'in', limit)}
    <span class="io-label" aria-hidden="true">OUT</span>${jackRow(mod.caps.outputs, 'out', limit)}
  </span>
  <span class="plate-foot"><span>v${mod.version}</span>${mod.verified ? html`<span class="seal">VERIFIED</span>` : html`<span class="sticker">UNREVIEWED</span>`}</span>
  <span class="screw s-bl" aria-hidden="true"></span><span class="screw s-br" aria-hidden="true"></span>
</${tag}>`
}
