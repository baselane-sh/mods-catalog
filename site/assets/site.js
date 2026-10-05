// Filters, URL state, the find palette and copy buttons. Pages work without this file,
// except search and copy.
const base = document.body.dataset.base || '/'
const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

// One polite live region per page, for copy results and filter counts.
function announce(text) {
  const region = $('[data-announce]')
  if (!region) return
  region.textContent = ''
  setTimeout(() => { region.textContent = text }, 30)
}

function setupFilters() {
  const rack = $('[data-rack]')
  if (!rack) return
  const modules = $$('.module', rack)
  const q = $('[data-filter="q"]')
  const verified = $('[data-filter="verified"]')
  const sort = $('[data-filter="sort"]')
  const tabs = $$('[data-filter="category"] .tab')
  const top = $('[data-top]')
  const count = $('[data-count]')
  const empty = $('[data-empty]')
  const emptyQuery = $('[data-empty-query]')
  const hasSort = value => [...sort.options].some(option => option.value === value)
  const state = () => ({
    q: q.value.trim().toLowerCase(),
    category: tabs.find(tab => tab.getAttribute('aria-checked') === 'true')?.dataset.value ?? '',
    verified: verified.checked,
    sort: sort.value,
  })
  const SORTS = {
    updated: (a, b) => b.dataset.updated.localeCompare(a.dataset.updated) || a.dataset.name.localeCompare(b.dataset.name),
    newest: (a, b) => b.dataset.listed.localeCompare(a.dataset.listed) || a.dataset.name.localeCompare(b.dataset.name),
    stars: (a, b) => Number(b.dataset.stars) - Number(a.dataset.stars) || a.dataset.name.localeCompare(b.dataset.name),
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  }

  function apply({ write = true } = {}) {
    const s = state()
    const words = s.q.split(/\s+/).filter(Boolean)
    let shown = 0
    for (const module of modules) {
      const match = (!s.category || module.dataset.category === s.category) &&
        (!s.verified || module.dataset.verified === '1') &&
        words.every(word => module.dataset.search.includes(word))
      module.hidden = !match
      if (match) shown += 1
    }
    // The page is served sorted by update date; reorder only for another sort.
    if (write || s.sort !== 'updated') rack.append(...[...modules].sort(SORTS[s.sort] ?? SORTS.updated))
    count.textContent = String(shown)
    empty.hidden = shown > 0
    emptyQuery.textContent = s.q ? ` "${q.value.trim()}"` : ''
    if (top) top.hidden = Boolean(s.q || s.category || s.verified)
    if (write) {
      announce(shown === 1 ? '1 mod shown' : `${shown} mods shown`)
      const params = new URLSearchParams()
      if (s.q) params.set('q', s.q)
      if (s.category) params.set('category', s.category)
      if (s.verified) params.set('verified', '1')
      if (s.sort !== 'updated') params.set('sort', s.sort)
      const query = params.toString()
      history.replaceState(null, '', query ? `?${query}` : location.pathname)
    }
  }

  function selectTab(value) {
    for (const tab of tabs) {
      const on = tab.dataset.value === value
      tab.setAttribute('aria-checked', String(on))
      tab.tabIndex = on ? 0 : -1
    }
  }

  const params = new URLSearchParams(location.search)
  q.value = params.get('q') ?? ''
  verified.checked = params.get('verified') === '1'
  if (SORTS[params.get('sort')] && hasSort(params.get('sort'))) sort.value = params.get('sort')
  selectTab(tabs.some(tab => tab.dataset.value === params.get('category')) ? params.get('category') : '')

  let timer
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(apply, 60) })
  verified.addEventListener('change', () => apply())
  sort.addEventListener('change', () => apply())
  for (const tab of tabs) tab.addEventListener('click', () => { selectTab(tab.dataset.value); apply() })
  $('[data-filter="category"]').addEventListener('keydown', event => {
    const keys = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }
    if (!(event.key in keys) && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const index = tabs.findIndex(tab => tab.getAttribute('aria-checked') === 'true')
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + keys[event.key] + tabs.length) % tabs.length
    const next = tabs[nextIndex]
    selectTab(next.dataset.value)
    next.focus()
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    apply()
  })
  $('[data-clear]').addEventListener('click', () => { q.value = ''; verified.checked = false; selectTab(''); apply(); q.focus() })
  apply({ write: false })
}

// The signature moment: a copied install line patches a cable from the button to the LED.
function patchCable(button, led) {
  if (!led || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const from = button.getBoundingClientRect()
  const to = led.getBoundingClientRect()
  if (to.bottom < 0 || to.top > innerHeight) return
  const x1 = from.left + from.width / 2
  const y1 = from.top + from.height / 2
  const x2 = to.left + to.width / 2
  const y2 = to.top + to.height / 2
  const sag = Math.max(90, Math.abs(x2 - x1) * 0.3)
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  const path = document.createElementNS(ns, 'path')
  svg.setAttribute('class', 'cable')
  svg.setAttribute('aria-hidden', 'true')
  path.setAttribute('d', `M${x1} ${y1} C ${x1} ${y1 + sag}, ${x2} ${y2 + sag}, ${x2} ${y2}`)
  svg.append(path)
  document.body.append(svg)
  requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('drawn')))
  setTimeout(() => svg.classList.add('done'), 1100)
  setTimeout(() => svg.remove(), 1700)
}

// Clipboard API first; on plain http or a denied permission, select the text and try the
// older copy command; if that fails too, leave the text selected and say how to copy it.
async function copyText(code) {
  const text = code.textContent ?? ''
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const range = document.createRange()
    range.selectNodeContents(code)
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    try { return document.execCommand('copy') } catch { return false }
  }
}

function setupCopy() {
  for (const button of $$('[data-copy]')) {
    const label = $('[data-copy-label]', button)
    let reset
    button.addEventListener('click', async () => {
      const code = document.getElementById(button.dataset.copy)
      if (!code) return
      const led = $('.mod-plate .led') ?? $('.brand-led')
      clearTimeout(reset)
      if (await copyText(code)) {
        patchCable(button, led)
        button.dataset.state = 'copied'
        label.textContent = 'Copied'
        led?.classList.add('lit')
        announce(`Copied: ${code.textContent}`)
        reset = setTimeout(() => { delete button.dataset.state; label.textContent = 'Copy'; led?.classList.remove('lit') }, 1800)
      } else {
        label.textContent = isMac ? 'Press ⌘C' : 'Press Ctrl+C'
        announce('Could not copy. The line is selected: press the copy keys.')
        reset = setTimeout(() => { label.textContent = 'Copy' }, 4000)
      }
    })
  }
}

function setupPalette() {
  const dialog = $('[data-palette]')
  const input = $('[data-palette-input]')
  const list = $('[data-palette-results]')
  if (!dialog || !input || !list) return
  let index = null
  let failed = false
  let results = []
  let active = 0

  for (const key of $$('[data-shortcut]')) key.textContent = isMac ? '⌘K' : 'Ctrl K'

  async function load() {
    if (index) return index
    try {
      const response = await fetch(`${base}index.json`)
      if (!response.ok) throw new Error(String(response.status))
      index = await response.json()
      failed = false
    } catch {
      failed = true
      return []
    }
    return index
  }

  function message(text, href) {
    const li = document.createElement('li')
    li.className = 'p-empty'
    li.setAttribute('role', 'none')
    li.textContent = text
    if (href) {
      const a = document.createElement('a')
      a.href = href
      a.textContent = 'Browse all mods'
      li.append(' ', a)
    }
    return li
  }

  function draw() {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
    results = (index ?? []).filter(mod => {
      const hay = `${mod.name} ${mod.description} ${mod.category} ${mod.tags.join(' ')}`.toLowerCase()
      return words.every(word => hay.includes(word))
    }).slice(0, 12)
    active = Math.min(active, Math.max(0, results.length - 1))
    const rows = results.map((mod, i) => {
      const li = document.createElement('li')
      li.setAttribute('role', 'none')
      const a = document.createElement('a')
      a.href = `${base}mods/${mod.name}/`
      a.id = `p-${i}`
      a.tabIndex = -1
      a.setAttribute('role', 'option')
      a.setAttribute('aria-selected', String(i === active))
      for (const [cls, text] of [['p-name', mod.name], ['p-cat', mod.category], ['p-desc', mod.description]]) {
        const span = document.createElement('span')
        span.className = cls
        span.textContent = text
        a.append(span)
      }
      a.addEventListener('mousemove', () => {
        if (active === i) return
        active = i
        for (const option of $$('[role="option"]', list)) option.setAttribute('aria-selected', String(option === a))
        input.setAttribute('aria-activedescendant', a.id)
      })
      li.append(a)
      return li
    })
    const fallback = failed ? message('Search could not load.', base) : message('No mod matches. Try fewer words.')
    list.replaceChildren(...(rows.length ? rows : [fallback]))
    input.setAttribute('aria-expanded', String(results.length > 0))
    if (results.length) input.setAttribute('aria-activedescendant', `p-${active}`)
    else input.removeAttribute('aria-activedescendant')
    $(`#p-${active}`, list)?.scrollIntoView({ block: 'nearest' })
  }

  async function open() {
    if (dialog.open) return
    dialog.showModal()
    input.value = ''
    active = 0
    await load()
    draw()
    input.focus()
  }

  // "/" focuses the page's own search on the browse page, and opens the palette elsewhere.
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open() }
    else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable]')) {
      event.preventDefault()
      const search = $('[data-filter="q"]')
      if (search && !dialog.open) { search.focus(); search.select() } else open()
    }
  })
  for (const button of $$('[data-palette-open]')) button.addEventListener('click', open)
  input.addEventListener('input', () => { active = 0; draw() })
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); active = Math.min(active + 1, results.length - 1); draw() }
    else if (event.key === 'ArrowUp') { event.preventDefault(); active = Math.max(active - 1, 0); draw() }
    else if (event.key === 'Enter' && results[active]) { event.preventDefault(); location.href = `${base}mods/${results[active].name}/` }
  })
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
}

setupFilters()
setupCopy()
setupPalette()
