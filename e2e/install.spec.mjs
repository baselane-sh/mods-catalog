import { test, expect } from '@playwright/test'

test('home page shows the two install steps and copies step 1', async ({ page, isMobile }) => {
  await page.goto('/')
  const howto = page.locator('section.howto')
  await expect(howto.getByRole('heading', { name: 'Install in two steps' })).toBeVisible()
  await expect(howto.locator('#cmd-marketplace')).toHaveText('/plugin marketplace add baselane-sh/mods-catalog')
  await expect(howto).toContainText('/plugin install <name>@baselane-mods')
  test.skip(isMobile, 'clipboard permissions are granted for the desktop project only')
  const button = howto.locator('[data-copy="cmd-marketplace"]')
  await button.click()
  await expect(button.locator('[data-copy-label]')).toHaveText('Copied')
  await expect(page.locator('[data-announce]')).toHaveText('Copied: /plugin marketplace add baselane-sh/mods-catalog')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('/plugin marketplace add baselane-sh/mods-catalog')
})

test('a mod page names its slash command after the install steps', async ({ page }) => {
  await page.goto('/mods/agent-firewall/')
  const install = page.locator('section.install')
  await expect(install.locator('.step')).toHaveCount(3)
  await expect(install).toContainText('Use it: type /firewall in Claude Code.')
})

test('a mod that needs setup says so in the install section', async ({ page }) => {
  await page.goto('/mods/ntfy-notify/')
  await expect(page.locator('.setup-note')).toContainText('Does nothing until you set an ntfy topic.')
})

test('the riskiest abilities sit above the install lines', async ({ page }) => {
  await page.goto('/mods/secret-guard/')
  const glance = page.locator('.glance')
  await expect(glance).toContainText('Starts programs on your machine')
  const glanceBox = await glance.boundingBox()
  const installBox = await page.locator('#cmd-install').boundingBox()
  expect(glanceBox.y).toBeLessThan(installBox.y)
})

test('only the checked category tab is in the Tab order', async ({ page }) => {
  await page.goto('/?category=sound')
  const rail = page.locator('[data-filter="category"]')
  await expect(rail.locator('[tabindex="0"]')).toHaveCount(1)
  await expect(rail.locator('[tabindex="0"]')).toHaveAttribute('data-value', 'sound')
})

test('the empty state repeats the search words', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-filter="q"]').fill('zzzz')
  await expect(page.locator('[data-empty]')).toContainText('No mod matches "zzzz".')
})
