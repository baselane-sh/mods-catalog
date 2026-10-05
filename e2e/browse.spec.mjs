import { test, expect } from '@playwright/test'

const visible = page => page.locator('[data-rack] .module:not([hidden])')
const count = page => page.locator('[data-count]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(visible(page).first()).toBeVisible()
})

test('search narrows the rack and the count, and survives a reload', async ({ page }) => {
  const total = Number(await count(page).textContent())
  expect(total).toBeGreaterThan(10)

  await page.locator('[data-filter="q"]').fill('guard')
  await expect(page).toHaveURL(/\?q=guard$/)
  await expect(count(page)).not.toHaveText(String(total))

  const shown = Number(await count(page).textContent())
  expect(shown).toBeGreaterThan(0)
  expect(shown).toBeLessThan(total)
  await expect(visible(page)).toHaveCount(shown)
  for (const search of await visible(page).evaluateAll(els => els.map(el => el.dataset.search))) {
    expect(search).toContain('guard')
  }

  await page.reload()
  await expect(page.locator('[data-filter="q"]')).toHaveValue('guard')
  await expect(count(page)).toHaveText(String(shown))
  await expect(visible(page)).toHaveCount(shown)
})

test('category tab filters to sound modules, arrow keys move selection', async ({ page }) => {
  const rail = page.locator('[data-filter="category"]')
  await rail.getByRole('radio', { name: /^Sounds/ }).click()
  await expect(page).toHaveURL(/category=sound/)
  const cats = await visible(page).evaluateAll(els => els.map(el => el.dataset.category))
  expect(cats.length).toBeGreaterThan(0)
  expect(new Set(cats)).toEqual(new Set(['sound']))
  await expect(count(page)).toHaveText(String(cats.length))

  const checked = rail.locator('[aria-checked="true"]')
  await expect(checked).toHaveAttribute('data-value', 'sound')
  await page.keyboard.press('ArrowRight')
  await expect(checked).toHaveCount(1)
  await expect(checked).toHaveAttribute('data-value', 'style')
  await expect(checked).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(checked).toHaveAttribute('data-value', 'command')
})

test('empty state offers Clear the filters, which restores everything', async ({ page }) => {
  const total = Number(await count(page).textContent())
  await page.locator('[data-filter="q"]').fill('zzzz')
  await expect(count(page)).toHaveText('0')
  const empty = page.locator('[data-empty]')
  await expect(empty).toBeVisible()
  await empty.getByRole('button', { name: 'Clear the filters' }).click()
  await expect(empty).toBeHidden()
  await expect(page.locator('[data-filter="q"]')).toHaveValue('')
  await expect(count(page)).toHaveText(String(total))
  await expect(visible(page)).toHaveCount(total)
  await expect(page.locator('[data-filter="category"] [aria-checked="true"]')).toHaveAttribute('data-value', '')
})

test('Verified toggle keeps only verified modules and sets the URL', async ({ page }) => {
  const total = Number(await count(page).textContent())
  const verifiedTotal = (await visible(page).evaluateAll(els => els.filter(el => el.dataset.verified === '1'))).length
  await page.locator('label.switch').click()
  await expect(page.locator('[data-filter="verified"]')).toBeChecked()
  await expect(page).toHaveURL(/verified=1/)
  const flags = await visible(page).evaluateAll(els => els.map(el => el.dataset.verified))
  expect(new Set(flags)).toEqual(new Set(['1']))
  await expect(count(page)).toHaveText(String(verifiedTotal))
  await page.locator('label.switch').click()
  await expect(page.locator('[data-filter="verified"]')).not.toBeChecked()
  await expect(page).not.toHaveURL(/verified/)
  await expect(count(page)).toHaveText(String(total))
})

test('Sort by Name orders modules alphabetically', async ({ page }) => {
  await page.locator('[data-filter="sort"]').selectOption('name')
  await expect(page).toHaveURL(/sort=name/)
  const names = await visible(page).evaluateAll(els => els.map(el => el.dataset.name))
  expect(names.length).toBeGreaterThan(10)
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
})
