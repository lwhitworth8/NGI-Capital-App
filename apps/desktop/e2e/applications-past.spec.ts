import { test, expect } from '@playwright/test'

test('past applications page renders', async ({ page }) => {
  await page.goto('/admin/ngi-advisory/applications/past')
  await expect(page.getByText('Past Applications')).toBeVisible()
})

