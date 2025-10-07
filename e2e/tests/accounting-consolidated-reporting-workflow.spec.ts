/**
 * E2E Tests for Consolidated Reporting Workflow
 * Tests multi-entity consolidation and eliminations
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Consolidated Reporting Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should display entity hierarchy', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    // Verify hierarchy display
    await expect(page.locator('text=Entity Hierarchy')).toBeVisible()
    await expect(page.locator('text=NGI Capital LLC')).toBeVisible()
    await expect(page.locator('text=Parent')).toBeVisible()
    
    // Verify subsidiaries
    await expect(page.locator('text=NGI Capital Advisory LLC')).toBeVisible()
    await expect(page.locator('text=The Creator Terminal Inc.')).toBeVisible()
    await expect(page.locator('text=100% owned')).toBeVisible()
  })

  test('should generate consolidated Income Statement', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    // Set parameters
    await page.fill('[name="period_start"]', '2025-01-01')
    await page.fill('[name="period_end"]', '2025-10-31')
    
    // Select entities to consolidate
    await page.check('[name="entity_1"]') // Parent
    await page.check('[name="entity_2"]') // Advisory
    await page.check('[name="entity_3"]') // Creator Terminal
    
    // Generate
    await page.click('button:has-text("Generate Consolidated Report")')
    
    // Verify consolidated statement
    await expect(page.locator('text=Consolidated Income Statement')).toBeVisible()
    await expect(page.locator('text=Combined Total')).toBeVisible()
  })

  test('should apply intercompany eliminations', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    // Set parameters
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.check('[name="apply_eliminations"]')
    
    // Generate
    await page.click('button:has-text("Generate Report")')
    
    // Verify eliminations section
    await expect(page.locator('text=Intercompany Eliminations')).toBeVisible()
    await expect(page.locator('text=Intercompany Revenue')).toBeVisible()
    await expect(page.locator('text=Intercompany Expenses')).toBeVisible()
    await expect(page.locator('text=Intercompany Balances')).toBeVisible()
  })

  test('should generate consolidated Balance Sheet', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    // Set parameters
    await page.fill('[name="as_of_date"]', '2025-10-31')
    
    // Select report type
    await page.selectOption('[name="report_type"]', 'balance_sheet')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify consolidated balance sheet
    await expect(page.locator('text=Consolidated Balance Sheet')).toBeVisible()
    await expect(page.locator('text=Combined Assets')).toBeVisible()
    await expect(page.locator('text=Combined Liabilities')).toBeVisible()
    await expect(page.locator('text=Total Consolidated Equity')).toBeVisible()
  })

  test('should display column view by entity', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.selectOption('[name="view_mode"]', 'by_entity')
    await page.click('button:has-text("Generate")')
    
    // Verify columns for each entity
    await expect(page.locator('th:has-text("NGI Capital LLC")')).toBeVisible()
    await expect(page.locator('th:has-text("NGI Advisory LLC")')).toBeVisible()
    await expect(page.locator('th:has-text("Creator Terminal")')).toBeVisible()
    await expect(page.locator('th:has-text("Eliminations")')).toBeVisible()
    await expect(page.locator('th:has-text("Consolidated")')).toBeVisible()
  })

  test('should export consolidated statements to Excel', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.click('button:has-text("Generate Report")')
    
    // Export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export to Excel")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('consolidated')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('should show minority interest calculations', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.click('button:has-text("Generate Report")')
    
    // Verify minority interest section
    await expect(page.locator('text=Minority Interest')).toBeVisible()
    await expect(page.locator('text=Non-Controlling Interest')).toBeVisible()
  })

  test('should reconcile consolidated totals', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.click('button:has-text("Generate Report")')
    
    // Click reconciliation tab
    await page.click('button:has-text("Reconciliation")')
    
    // Verify reconciliation
    await expect(page.locator('text=Sum of Individual Entities')).toBeVisible()
    await expect(page.locator('text=Intercompany Eliminations')).toBeVisible()
    await expect(page.locator('text=Consolidated Total')).toBeVisible()
  })

  test('should save consolidation package', async ({ page }) => {
    await page.goto('/accounting/consolidated-reporting')
    
    await page.fill('[name="period_end"]', '2025-10-31')
    await page.click('button:has-text("Generate Report")')
    
    // Save package
    await page.click('button:has-text("Save Package")')
    await page.fill('[name="package_name"]', 'Q3 2025 Consolidation')
    await page.click('button:has-text("Save")')
    
    // Verify saved
    await expect(page.locator('text=Package saved')).toBeVisible()
  })
})

