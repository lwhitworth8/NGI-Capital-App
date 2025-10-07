/**
 * E2E Tests for Trial Balance Workflow
 * Tests TB generation, validation, and export
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Trial Balance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should generate trial balance', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    // Select date
    await page.fill('[name="as_of_date"]', '2025-10-31')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify TB displays
    await expect(page.locator('h2:has-text("Trial Balance")')).toBeVisible()
    await expect(page.locator('text=As of October 31, 2025')).toBeVisible()
  })

  test('should verify debits equal credits', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Verify balance
    await expect(page.locator('[data-testid="total-debits"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-credits"]')).toBeVisible()
    
    // Get totals
    const totalDebits = await page.locator('[data-testid="total-debits"]').textContent()
    const totalCredits = await page.locator('[data-testid="total-credits"]').textContent()
    
    // Verify equal
    expect(totalDebits).toBe(totalCredits)
    await expect(page.locator('[data-balanced="true"]')).toBeVisible()
    await expect(page.locator('text=Difference: $0.00')).toBeVisible()
  })

  test('should display all account types', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Verify account types
    await expect(page.locator('text=Assets')).toBeVisible()
    await expect(page.locator('text=Liabilities')).toBeVisible()
    await expect(page.locator('text=Equity')).toBeVisible()
    await expect(page.locator('text=Revenue')).toBeVisible()
    await expect(page.locator('text=Expenses')).toBeVisible()
  })

  test('should export trial balance to Excel', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('trial-balance')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('should filter by account type', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Filter by Assets
    await page.click('button:has-text("Filter")')
    await page.click('text=Assets Only')
    
    // Verify filtered
    await expect(page.locator('text=Assets')).toBeVisible()
  })

  test('should show zero balance accounts', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    
    // Check show zero balances
    await page.check('[name="show_zero_balances"]')
    
    await page.click('button:has-text("Generate")')
    
    // Verify zero balance accounts shown
    await expect(page.locator('text=$0.00')).toBeVisible()
  })

  test('should compare periods', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    // Enable comparison
    await page.check('[name="compare_periods"]')
    
    // Set dates
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.fill('[name="compare_to_date"]', '2025-09-30')
    
    await page.click('button:has-text("Generate")')
    
    // Verify comparison columns
    await expect(page.locator('th:has-text("Current")')).toBeVisible()
    await expect(page.locator('th:has-text("Prior")')).toBeVisible()
    await expect(page.locator('th:has-text("Change")')).toBeVisible()
  })

  test('should drill down to account detail', async ({ page }) => {
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Click account to drill down
    await page.click('text=Cash - Operating')
    
    // Verify detail view
    await expect(page.locator('text=Account Detail')).toBeVisible()
    await expect(page.locator('text=Transaction History')).toBeVisible()
  })
})

