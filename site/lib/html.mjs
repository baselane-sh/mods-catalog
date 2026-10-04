const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char])

// Tagged template: interpolated values are escaped unless wrapped with raw().
const RAW = Symbol('raw')
export const raw = html => ({ [RAW]: html })

function piece(value) {
  if (value === null || value === undefined || value === false) return ''
  if (Array.isArray(value)) return value.map(piece).join('')
  if (typeof value === 'object' && RAW in value) return value[RAW]
  return esc(value)
}

export function html(strings, ...values) {
  return raw(strings.reduce((out, string, i) => out + string + (i < values.length ? piece(values[i]) : ''), ''))
}

export const render = node => piece(node)

export const CATEGORY_NAMES = {
  guard: 'Guards', pane: 'Panes', band: 'Bands', command: 'Commands', sound: 'Sounds',
  style: 'Styles', stats: 'Stats', nudge: 'Nudges', lifecycle: 'Lifecycle', render: 'Render',
}
