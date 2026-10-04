import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/mods/secret-guard/')
})

test('install lines name the plugin and marketplace', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('secret-guard')
  await expect(page.locator('#cmd-install')).toHaveText('/plugin install secret-guard@baselane-mods')
  await expect(page.locator('.install')).toContainText('/plugin install secret-guard@baselane-mods')
})

test('capabilities section lists what the mod can do', async ({ page }) => {
  const section = page.locator('section[aria-labelledby="caps-title"]')
  await expect(section.getByRole('heading', { name: 'What this mod can do' })).toBeVisible()
  await expect(section).toContainText('Can approve or block tool calls before they run')
})

test('a jack is focusable and shows its label', async ({ page }) => {
  const label = 'Can approve or block tool calls before they run'
  const jack = page.locator('.jack[data-label]').first()
  await expect(jack).toHaveAttribute('data-label', label)
  await jack.focus()
  await expect(jack).toBeFocused()
  const content = await jack.evaluate(el => getComputedStyle(el, '::after').content + getComputedStyle(el, '::before').content)
  expect(content).toContain(label)
})

test('Copy button reports Copied and puts the command on the clipboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'clipboard permissions are granted for the desktop project only')
  const button = page.locator('[data-copy="cmd-install"]')
  await button.click()
  await expect(button.locator('[data-copy-label]')).toHaveText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/plugin install secret-guard@baselane-mods')
  await expect(button.locator('[data-copy-label]')).toHaveText('Copy')
})
