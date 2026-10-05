import { test, expect } from '@playwright/test'

const PAGES = ['/', '/mods/secret-guard/', '/submit/']

for (const path of PAGES) {
  test(`no horizontal scroll on ${path} (phone only)`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone project only')
    await page.goto(path)
    await page.waitForLoadState('load')
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })

  test(`no horizontal scroll on ${path} in dark mode (phone only)`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone project only')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(path)
    await page.waitForLoadState('load')
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(14, 15, 16)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })

  test(`no console errors or CSP violations on ${path}`, async ({ page }) => {
    const problems = []
    page.on('console', msg => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`) })
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
    page.on('requestfailed', request => problems.push(`requestfailed: ${request.url()}`))
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', event => {
        window.__csp = [...(window.__csp ?? []), `${event.violatedDirective} ${event.blockedURI}`]
      })
    })
    const response = await page.goto(path)
    expect(response.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => window.__csp ?? [])).toEqual([])
    expect(problems).toEqual([])
  })
}
