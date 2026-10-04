// Filters, URL state, the find palette and copy buttons. Pages work without this file,
// except search and copy.
const base = document.body.dataset.base || '/'
const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

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
    rack.append(...[...modules].sort(SORTS[s.sort] ?? SORTS.updated))
    count.textContent = String(shown)
    empty.hidden = shown > 0
    if (top) top.hidden = Boolean(s.q || s.category || s.verified)
    if (write) {
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
    for (const tab of tabs) tab.setAttribute('aria-checked', String(tab.dataset.value === value))
  }

  const params = new URLSearchParams(location.search)
  q.value = params.get('q') ?? ''
  verified.checked = params.get('verified') === '1'
  if (SORTS[params.get('sort')]) sort.value = params.get('sort')
  selectTab(tabs.some(tab => tab.dataset.value === params.get('category')) ? params.get('category') : '')

  let timer
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(apply, 60) })
  verified.addEventListener('change', () => apply())
  sort.addEventListener('change', () => apply())
  for (const tab of tabs) tab.addEventListener('click', () => { selectTab(tab.dataset.value); apply() })
  $('[data-filter="category"]').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    const index = tabs.findIndex(tab => tab.getAttribute('aria-checked') === 'true')
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    selectTab(next.dataset.value)
    next.focus()
    apply()
  })
  $('[data-clear]').addEventListener('click', () => { q.value = ''; verified.checked = false; selectTab(''); apply(); q.focus() })
  apply({ write: false })
}

function setupCopy() {
  const led = $('.brand-led')
  for (const button of $$('[data-copy]')) {
    const label = $('[data-copy-label]', button)
    button.addEventListener('click', async () => {
      const text = document.getElementById(button.dataset.copy)?.textContent ?? ''
      try {
        await navigator.clipboard.writeText(text)
        button.dataset.state = 'copied'
        label.textContent = 'Copied'
        led?.classList.add('lit')
        setTimeout(() => { delete button.dataset.state; label.textContent = 'Copy'; led?.classList.remove('lit') }, 1800)
      } catch {
        label.textContent = 'Select and copy'
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
  let results = []
  let active = 0

  async function load() {
    if (index) return index
    try {
      index = await (await fetch(`${base}index.json`)).json()
    } catch {
      index = []
    }
    return index
  }

  function draw() {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
    results = (index ?? []).filter(mod => {
      const hay = `${mod.name} ${mod.description} ${mod.category} ${mod.tags.join(' ')}`.toLowerCase()
      return words.every(word => hay.includes(word))
    }).slice(0, 12)
    active = Math.min(active, Math.max(0, results.length - 1))
    list.replaceChildren(...(results.length ? results.map((mod, i) => {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = `${base}mods/${mod.name}/`
      a.id = `p-${i}`
      a.setAttribute('role', 'option')
      a.setAttribute('aria-selected', String(i === active))
      for (const [cls, text] of [['p-name', mod.name], ['p-cat', mod.category], ['p-desc', mod.description]]) {
        const span = document.createElement('span')
        span.className = cls
        span.textContent = text
        a.append(span)
      }
      li.append(a)
      return li
    }) : [Object.assign(document.createElement('li'), { className: 'p-empty', textContent: 'No mod matches.' })]))
    input.setAttribute('aria-activedescendant', results.length ? `p-${active}` : '')
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

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open() }
    else if (event.key === '/' && !event.target.closest('input, textarea, select')) { event.preventDefault(); open() }
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
