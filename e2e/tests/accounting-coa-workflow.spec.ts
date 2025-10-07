/**
 * E2E Tests for Chart of Accounts Workflow
 * Tests COA setup, account creation, hierarchy management, and seeding
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Chart of Accounts Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate with Clerk using admin account
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should seed US GAAP Chart of Accounts', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Verify page loaded
    await expect(page.locator('h1:has-text("Chart of Accounts")')).toBeVisible()
    
    // Seed COA if empty
    const seedButton = page.locator('button:has-text("Seed US GAAP Chart of Accounts")')
    if (await seedButton.isVisible()) {
      await seedButton.click()
      await page.waitForSelector('text=successfully seeded', { timeout: 10000 })
    }
    
    // Verify accounts loaded
    await expect(page.locator('text=CURRENT ASSETS')).toBeVisible()
    await expect(page.locator('text=Cash')).toBeVisible()
  })

  test('should create new GL account', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Click Add Account
    await page.click('button:has-text("Add Account")')
    
    // Fill form
    await page.fill('[name="account_number"]', '10150')
    await page.fill('[name="account_name"]', 'E2E Test Petty Cash')
    await page.selectOption('[name="account_type"]', 'Asset')
    await page.selectOption('[name="normal_balance"]', 'debit')
    await page.check('[name="allow_posting"]')
    await page.check('[name="is_active"]')
    
    await page.click('button:has-text("Create")')
    
    // Verify account created
    await expect(page.locator('text=E2E Test Petty Cash')).toBeVisible()
  })

  test('should filter accounts by type', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Click Asset filter tab
    await page.click('button[role="tab"]:has-text("Assets")')
    
    // Verify only asset accounts shown
    await expect(page.locator('text=Cash')).toBeVisible()
    
    // Click Revenue filter
    await page.click('button[role="tab"]:has-text("Revenue")')
    
    // Verify revenue accounts shown
    await expect(page.locator('text=Service Revenue')).toBeVisible()
  })

  test('should search accounts', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Search for Cash
    await page.fill('input[placeholder*="search"]', 'Cash')
    
    // Verify filtered results
    await expect(page.locator('text=Cash')).toBeVisible()
  })

  test('should export COA to CSV', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Click export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('should edit existing account', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Find and edit an account
    await page.click('button[aria-label="Edit account"]:first')
    
    // Update description
    await page.fill('[name="description"]', 'Updated E2E description')
    await page.click('button:has-text("Update")')
    
    // Verify update
    await expect(page.locator('text=Account updated')).toBeVisible()
  })

  test('should display account balances and activity', async ({ page }) => {
    await page.goto('/accounting/chart-of-accounts')
    
    // Verify balance columns visible
    await expect(page.locator('th:has-text("Current Balance")')).toBeVisible()
    await expect(page.locator('th:has-text("YTD Activity")')).toBeVisible()
  })
})
