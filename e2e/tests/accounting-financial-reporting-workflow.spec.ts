/**
 * E2E Tests for Financial Reporting Workflow
 * Tests Income Statement, Balance Sheet, Cash Flow, Equity Statement
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Financial Reporting Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should generate Income Statement', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/income-statement')
    
    // Set date range
    await page.fill('[name="start_date"]', '2025-01-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify statement displays
    await expect(page.locator('h1:has-text("Income Statement")')).toBeVisible()
    await expect(page.locator('text=Statement of Operations')).toBeVisible()
    await expect(page.locator('text=For the Period')).toBeVisible()
    
    // Verify sections
    await expect(page.locator('text=Revenue')).toBeVisible()
    await expect(page.locator('text=Cost of Revenue')).toBeVisible()
    await expect(page.locator('text=Gross Profit')).toBeVisible()
    await expect(page.locator('text=Operating Expenses')).toBeVisible()
    await expect(page.locator('text=Operating Income')).toBeVisible()
    await expect(page.locator('text=Net Income')).toBeVisible()
  })

  test('should generate Balance Sheet', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/balance-sheet')
    
    // Set as-of date
    await page.fill('[name="as_of_date"]', '2025-10-31')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify statement displays
    await expect(page.locator('h1:has-text("Balance Sheet")')).toBeVisible()
    await expect(page.locator('text=Statement of Financial Position')).toBeVisible()
    await expect(page.locator('text=As of October 31, 2025')).toBeVisible()
    
    // Verify sections
    await expect(page.locator('text=ASSETS')).toBeVisible()
    await expect(page.locator('text=Current Assets')).toBeVisible()
    await expect(page.locator('text=Non-Current Assets')).toBeVisible()
    await expect(page.locator('text=Total Assets')).toBeVisible()
    
    await expect(page.locator('text=LIABILITIES')).toBeVisible()
    await expect(page.locator('text=Current Liabilities')).toBeVisible()
    await expect(page.locator('text=Non-Current Liabilities')).toBeVisible()
    await expect(page.locator('text=Total Liabilities')).toBeVisible()
    
    await expect(page.locator('text=EQUITY')).toBeVisible()
    await expect(page.locator('text=Total Equity')).toBeVisible()
  })

  test('should verify accounting equation balance', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/balance-sheet')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Get totals
    const totalAssets = await page.locator('[data-testid="total-assets"]').textContent()
    const totalLiabilities = await page.locator('[data-testid="total-liabilities"]').textContent()
    const totalEquity = await page.locator('[data-testid="total-equity"]').textContent()
    
    // Parse numbers
    const assets = parseFloat(totalAssets!.replace(/[$,]/g, ''))
    const liabilities = parseFloat(totalLiabilities!.replace(/[$,]/g, ''))
    const equity = parseFloat(totalEquity!.replace(/[$,]/g, ''))
    
    // Verify equation: Assets = Liabilities + Equity
    expect(Math.abs(assets - (liabilities + equity))).toBeLessThan(0.01)
  })

  test('should generate Cash Flow Statement', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/cash-flow')
    
    // Set date range
    await page.fill('[name="start_date"]', '2025-01-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify statement displays
    await expect(page.locator('h1:has-text("Cash Flow Statement")')).toBeVisible()
    await expect(page.locator('text=Statement of Cash Flows')).toBeVisible()
    await expect(page.locator('text=ASC 230')).toBeVisible()
    
    // Verify sections (ASC 230 categorization)
    await expect(page.locator('text=Cash Flows from Operating Activities')).toBeVisible()
    await expect(page.locator('text=Cash Flows from Investing Activities')).toBeVisible()
    await expect(page.locator('text=Cash Flows from Financing Activities')).toBeVisible()
    await expect(page.locator('text=Net Increase in Cash')).toBeVisible()
  })

  test('should generate Statement of Changes in Equity', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/equity-statement')
    
    // Set date range
    await page.fill('[name="start_date"]', '2025-01-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    
    // Generate
    await page.click('button:has-text("Generate")')
    
    // Verify statement displays
    await expect(page.locator('h1:has-text("Statement of Changes in Equity")')).toBeVisible()
    
    // Verify columns
    await expect(page.locator('text=Common Stock')).toBeVisible()
    await expect(page.locator('text=Retained Earnings')).toBeVisible()
    await expect(page.locator('text=Total Equity')).toBeVisible()
    
    // Verify rows
    await expect(page.locator('text=Beginning Balance')).toBeVisible()
    await expect(page.locator('text=Net Income')).toBeVisible()
    await expect(page.locator('text=Dividends')).toBeVisible()
    await expect(page.locator('text=Ending Balance')).toBeVisible()
  })

  test('should download PDF financial statements', async ({ page }) => {
    await page.goto('/accounting/financial-reporting')
    
    await page.fill('[name="period_end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate Statements")')
    
    // Download PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download PDF")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('financial-statements')
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should compare periods on Income Statement', async ({ page }) => {
    await page.goto('/accounting/financial-reporting/income-statement')
    
    // Enable comparison
    await page.check('[name="compare_periods"]')
    
    // Set periods
    await page.fill('[name="start_date"]', '2025-01-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    await page.fill('[name="compare_start_date"]', '2024-01-01')
    await page.fill('[name="compare_end_date"]', '2024-10-31')
    
    await page.click('button:has-text("Generate")')
    
    // Verify comparison columns
    await expect(page.locator('th:has-text("2025")')).toBeVisible()
    await expect(page.locator('th:has-text("2024")')).toBeVisible()
    await expect(page.locator('th:has-text("Change")')).toBeVisible()
    await expect(page.locator('th:has-text("%")')).toBeVisible()
  })

  test('should display financial ratios', async ({ page }) => {
    await page.goto('/accounting/financial-reporting')
    
    await page.fill('[name="period_end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate Statements")')
    
    // Click ratios tab
    await page.click('button:has-text("Key Ratios")')
    
    // Verify key ratios
    await expect(page.locator('text=Current Ratio')).toBeVisible()
    await expect(page.locator('text=Quick Ratio')).toBeVisible()
    await expect(page.locator('text=Debt-to-Equity')).toBeVisible()
    await expect(page.locator('text=Gross Profit Margin')).toBeVisible()
    await expect(page.locator('text=Net Profit Margin')).toBeVisible()
    await expect(page.locator('text=ROE (Return on Equity)')).toBeVisible()
  })

  test('should export statements to Excel', async ({ page }) => {
    await page.goto('/accounting/financial-reporting')
    
    await page.fill('[name="period_end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate Statements")')
    
    // Export to Excel
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export to Excel")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})

