import { test, expect } from '@playwright/test'

// Stubs window.goatcounter before the page runs, and records each event.
const stubCounter = page => page.addInitScript(() => {
  window.__events = []
  window.goatcounter = { count: event => window.__events.push(event) }
})

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(isMobile, 'clipboard permissions are granted for the desktop project only')
  // The real counter script would replace the stub (and phone home), so keep it out.
  await page.route('https://gc.zgo.at/**', route => route.abort())
})

test('a marketplace copy sends the copy/marketplace event', async ({ page }) => {
  await stubCounter(page)
  await page.goto('/')
  await page.locator('[data-copy="cmd-marketplace"]').click()
  await expect(page.locator('[data-copy="cmd-marketplace"] [data-copy-label]')).toHaveText('Copied')
  expect(await page.evaluate(() => window.__events)).toEqual([{ path: 'copy/marketplace', title: 'copy/marketplace', event: true }])
})

test('a mod install copy sends install/<mod-name>', async ({ page }) => {
  await stubCounter(page)
  await page.goto('/mods/agent-firewall/')
  await page.locator('[data-copy="cmd-install"]').click()
  await expect(page.locator('[data-copy="cmd-install"] [data-copy-label]')).toHaveText('Copied')
  expect(await page.evaluate(() => window.__events)).toEqual([{ path: 'install/agent-firewall', title: 'install/agent-firewall', event: true }])
  await page.locator('[data-copy="cmd-add"]').click()
  await expect(page.locator('[data-copy="cmd-add"] [data-copy-label]')).toHaveText('Copied')
  expect((await page.evaluate(() => window.__events)).at(-1).path).toBe('copy/marketplace')
})

test('copying still works when goatcounter is missing or throws', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => typeof window.goatcounter)).toBe('undefined')
  const button = page.locator('[data-copy="cmd-marketplace"]')
  await button.click()
  await expect(button.locator('[data-copy-label]')).toHaveText('Copied')
  await page.addInitScript(() => { window.goatcounter = { count: () => { throw new Error('boom') } } })
  await page.reload()
  await button.click()
  await expect(button.locator('[data-copy-label]')).toHaveText('Copied')
})
