import { test, expect } from '@playwright/test'

const dialog = page => page.locator('[data-palette]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-rack] .module').first()).toBeVisible()
})

for (const chord of ['Meta+K', 'Control+K']) {
  test(`${chord} opens the find palette`, async ({ page }) => {
    await expect(dialog(page)).toBeHidden()
    await page.keyboard.press(chord)
    await expect(dialog(page)).toBeVisible()
    await expect(page.locator('[data-palette-input]')).toBeFocused()
  })
}

test('typing lists matches, arrows and Enter navigate, Escape closes', async ({ page }) => {
  await page.keyboard.press('Control+K')
  const input = page.locator('[data-palette-input]')
  await expect(input).toBeFocused()
  await input.fill('cost')
  const names = page.locator('[data-palette-results] .p-name')
  await expect(names.filter({ hasText: /^cost-meter$/ })).toHaveCount(1)
  expect(await names.count()).toBeGreaterThan(1)

  await input.press('ArrowDown')
  const second = page.locator('[data-palette-results] a[aria-selected="true"] .p-name')
  await expect(second).toHaveText(await names.nth(1).textContent())
  const target = (await second.textContent()).trim()
  await input.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/mods/${target}/$`))
  await expect(page.locator('h1')).toHaveText(target)
})

test('aria-expanded follows whether the palette lists matches', async ({ page }) => {
  const input = page.locator('[data-palette-input]')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Control+K')
  await input.fill('cost')
  await expect(input).toHaveAttribute('aria-expanded', 'true')
  await input.fill('zzzzqqqq')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
})

test('Escape closes the palette', async ({ page }) => {
  await page.keyboard.press('Control+K')
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
})

test('the header button opens the palette, and the palette input is a combobox', async ({ page }) => {
  await page.locator('[data-palette-open]').first().click()
  const input = page.locator('[data-palette-input]')
  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute('role', 'combobox')
  await expect(page.locator('[data-palette-results] [role="option"]').first()).toHaveAttribute('aria-selected', 'true')
})

test('"/" focuses the search on the browse page and opens the palette elsewhere', async ({ page }) => {
  await page.keyboard.press('/')
  await expect(page.locator('[data-filter="q"]')).toBeFocused()
  await expect(dialog(page)).toBeHidden()
  await page.goto('/mods/secret-guard/')
  await page.keyboard.press('/')
  await expect(dialog(page)).toBeVisible()
  await expect(page.locator('[data-palette-input]')).toBeFocused()
})
