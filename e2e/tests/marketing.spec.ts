import { test, expect } from '@playwright/test'

test.describe('Marketing Homepage', () => {
  test('renders and sets noindex', async ({ page }) => {
    await page.route('**/api/public/telemetry/event', route => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }))
    await page.goto('/')
    await expect(page.getByText('NGI Capital Advisory')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Launch your')
    // One of rotating words should appear
    const rotating = page.locator('h1 >> text=/Experiences|Opportunities|Impacts/').first()
    await expect(rotating).toBeVisible()
    // noindex meta
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots || '').toContain('noindex')
  })

  test('sticky subnav and anchor navigation', async ({ page }) => {
    await page.route('**/api/public/telemetry/event', route => route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }))
    await page.goto('/')
    // Scroll past hero and ensure subnav remains visible near top
    const subnav = page.locator('#subnav')
    await expect(subnav).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 1200))
    const box = await subnav.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.y).toBeLessThan(10)

    // Click Learning and assert hash and aria-current
    await page.locator('a[href="#learning"]').first().click()
    await page.waitForTimeout(200) // allow scroll
    expect(page.url()).toContain('#learning')
    await expect(page.locator('a[href="#learning"][aria-current="page"]').first()).toBeVisible()
  })

  test('CTA routes to sign-in', async ({ page }) => {
    const telemetryCalls: any[] = []
    await page.route('**/api/public/telemetry/event', async route => {
      telemetryCalls.push(await route.request().postDataJSON())
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).first().click()
    await page.waitForURL('**/sign-in**')
    expect(telemetryCalls.some(c => c?.event === 'cta_click')).toBeTruthy()
  })
})

