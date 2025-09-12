import { test, expect } from '@playwright/test'

test('admin availability page renders', async ({ page }) => {
  // Admin app served under /admin basePath
  await page.goto('/admin/ngi-advisory/availability')
  await expect(page.getByText('Coffee Chat Availability')).toBeVisible()
})

