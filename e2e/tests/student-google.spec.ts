import { test, expect } from '@playwright/test'

const STUDENT_GOOGLE_EMAIL = process.env.CLERK_STUDENT_GOOGLE_EMAIL
const STUDENT_GOOGLE_PASSWORD = process.env.CLERK_STUDENT_GOOGLE_PASSWORD

test.skip(!STUDENT_GOOGLE_EMAIL || !STUDENT_GOOGLE_PASSWORD, 'Missing Google test account credentials')

test('student can sign in with Google and lands on projects', async ({ page, baseURL }) => {
  await page.goto(baseURL + '/sign-in')
  await expect(page.getByText(/sign in/i)).toBeVisible()

  // Click Google OAuth on the custom sign-in page
  const googleButton = page.getByRole('button', { name: /google/i })
  await expect(googleButton).toBeVisible()
  await googleButton.click()

  // Google auth page
  await page.waitForURL(/accounts\.google\.com/i, { timeout: 30000 })
  await page.getByLabel('Email or phone', { exact: false }).fill(STUDENT_GOOGLE_EMAIL!)
  await page.getByRole('button', { name: /next/i }).click()
  await page.getByLabel('Enter your password', { exact: false }).fill(STUDENT_GOOGLE_PASSWORD!)
  await page.getByRole('button', { name: /next/i }).click()

  // After redirect back and resolver, students land on /projects
  await page.waitForURL(/\/projects/i, { timeout: 60000 })
  expect(page.url()).toMatch(/\/projects/i)
})
