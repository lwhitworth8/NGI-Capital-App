import { test, expect } from '@playwright/test'

test('onboarding admin page renders', async ({ page }) => {
  await page.goto('/admin/ngi-advisory/onboarding')
  await expect(page.getByText('Onboarding')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Instances' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible()
})

