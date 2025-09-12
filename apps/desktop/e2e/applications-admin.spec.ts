import { test, expect } from '@playwright/test'

test('applications admin page renders', async ({ page }) => {
  await page.goto('/admin/ngi-advisory/applications')
  await expect(page.getByText('Applications')).toBeVisible()
})

