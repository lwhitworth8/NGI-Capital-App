import { test, expect } from '@playwright/test'

const ADMIN_STUDENTS = '/admin/ngi-advisory/students'

test.describe('Students Admin', () => {
  test('loads list and toggles Archived', async ({ page }) => {
    await page.goto(ADMIN_STUDENTS)
    await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()
    // Toggle archived and back
    await page.getByRole('button', { name: 'Archived' }).click({ force: true })
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Active' }).click({ force: true })
    await page.waitForTimeout(200)
  })

  test('archive and restore first available student', async ({ page }) => {
    await page.goto(ADMIN_STUDENTS)
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return
    const first = rows.first()
    const emailCell = first.locator('td').nth(1)
    const email = (await emailCell.textContent())?.trim() || ''
    // Archive
    const archiveBtn = first.locator('button', { hasText: 'Archive' }).first()
    await archiveBtn.click({ force: true })
    await page.waitForTimeout(300)
    // Restore from archived
    await page.getByRole('button', { name: 'Archived' }).click({ force: true })
    await page.getByRole('button', { name: 'Refresh' }).click({ force: true })
    const archRow = page.locator('tbody tr', { hasText: email }).first()
    await archRow.locator('button', { hasText: 'Restore' }).click({ force: true })
    await page.getByRole('button', { name: 'Active' }).click({ force: true })
  })
})
