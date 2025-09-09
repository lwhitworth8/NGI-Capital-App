import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.CLERK_ADMIN_EMAIL || 'lwhitworth@ngicapitaladvisory.com'
const ADMIN_PASSWORD = process.env.CLERK_ADMIN_PASSWORD || 'FlashJayz2002!$'

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Missing admin credentials in env')

test('admin can sign in with password and lands on admin dashboard', async ({ page, baseURL }) => {
  await page.goto(baseURL + '/sign-in')
  await expect(page.getByText(/sign in/i)).toBeVisible()

  // Custom student sign-in page: fill email and password directly
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Resolver should route admin to /admin/dashboard
  await page.waitForURL(/\/admin\/dashboard/i, { timeout: 30000 })
  expect(page.url()).toMatch(/\/admin\/dashboard/i)
})
