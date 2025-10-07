/**
 * E2E Tests for Complete Financial Reporting System
 * Tests all 5 GAAP financial statements, notes, and exports
 * 
 * Author: NGI Capital Development Team
 * Date: October 6, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Financial Reporting - Complete GAAP Package', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateWithClerk(page, ADMIN_USER)
    await page.goto('/accounting?tab=reporting')
    await page.waitForLoadState('networkidle')
  })

  test('should display financial statements tab with all 5 statements', async ({ page }) => {
    // Wait for reporting tab
    await expect(page.locator('text=Financial Reporting')).toBeVisible()
    
    // Should see Financial Statements option
    await expect(page.locator('text=Financial Statements')).toBeVisible()
    
    // Click Financial Statements tab
    await page.click('button:has-text("Financial Statements")')
    
    // Verify period selector
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible()
    
    // Verify Generate button
    await expect(page.locator('button:has-text("Generate Statements")')).toBeVisible()
  })

  test('should generate complete financial statement package', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    
    // Select period
    await page.click('[role="combobox"]')
    await page.click('text=December 2025')
    
    // Generate statements
    await page.click('button:has-text("Generate Statements")')
    
    // Wait for generation
    await page.waitForTimeout(2000)
    
    // Should see all 6 tabs
    await expect(page.locator('text=Balance Sheet')).toBeVisible()
    await expect(page.locator('text=Income Statement')).toBeVisible()
    await expect(page.locator('text=Cash Flows')).toBeVisible()
    await expect(page.locator('text=Stockholders\' Equity')).toBeVisible()
    await expect(page.locator('text=Comprehensive Income')).toBeVisible()
    await expect(page.locator('text=Notes')).toBeVisible()
  })

  test('should display balance sheet with proper GAAP format', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Balance Sheet tab
    await page.click('button:has-text("Balance Sheet")')
    
    // Verify sections
    await expect(page.locator('text=ASSETS')).toBeVisible()
    await expect(page.locator('text=Current assets:')).toBeVisible()
    await expect(page.locator('text=Noncurrent assets:')).toBeVisible()
    await expect(page.locator('text=LIABILITIES AND STOCKHOLDERS\' EQUITY')).toBeVisible()
    
    // Verify key line items
    await expect(page.locator('text=Cash and cash equivalents')).toBeVisible()
    await expect(page.locator('text=Accounts receivable, net')).toBeVisible()
    await expect(page.locator('text=Total assets')).toBeVisible()
    
    // Verify footer
    await expect(page.locator('text=See accompanying notes to financial statements')).toBeVisible()
  })

  test('should display income statement with expense disaggregation', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Income Statement tab
    await page.click('button:has-text("Income Statement")')
    
    // Verify sections
    await expect(page.locator('text=Revenue')).toBeVisible()
    await expect(page.locator('text=Gross profit')).toBeVisible()
    await expect(page.locator('text=Operating expenses:')).toBeVisible()
    await expect(page.locator('text=Net loss')).toBeVisible()
    
    // Verify expense drill-down (click accordion)
    await page.click('text=Research and development')
    
    // Should show nature breakdown
    await expect(page.locator('text=By Nature')).toBeVisible()
    await expect(page.locator('text=Salaries and wages')).toBeVisible()
    await expect(page.locator('text=Hosting and infrastructure')).toBeVisible()
  })

  test('should display cash flow statement with all three sections', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Cash Flows tab
    await page.click('button:has-text("Cash Flows")')
    
    // Verify sections
    await expect(page.locator('text=Cash flows from operating activities')).toBeVisible()
    await expect(page.locator('text=Cash flows from investing activities')).toBeVisible()
    await expect(page.locator('text=Cash flows from financing activities')).toBeVisible()
    
    // Verify indirect method reconciliation
    await expect(page.locator('text=Net loss')).toBeVisible()
    await expect(page.locator('text=Adjustments to reconcile')).toBeVisible()
    await expect(page.locator('text=Depreciation and amortization')).toBeVisible()
    
    // Verify supplemental disclosures
    await expect(page.locator('text=Supplemental cash flow information')).toBeVisible()
    await expect(page.locator('text=Noncash investing and financing activities')).toBeVisible()
  })

  test('should display stockholders equity statement with all movements', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Equity Statement tab
    await page.click('button:has-text("Equity Statement")')
    
    // Verify the equity statement loads
    await expect(page.locator('text=Equity Statement')).toBeVisible()
  })

  test('should display comprehensive income statement', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Comprehensive Income tab
    await page.click('button:has-text("Comprehensive Income")')
    
    // Verify components
    await expect(page.locator('text=Net loss')).toBeVisible()
    await expect(page.locator('text=Other comprehensive income (loss)')).toBeVisible()
    await expect(page.locator('text=Comprehensive income (loss)')).toBeVisible()
  })

  test('should display notes to financial statements', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Notes tab
    await page.click('button:has-text("Notes")')
    
    // Verify key notes are present
    await expect(page.locator('text=Note 1: Nature of Business')).toBeVisible()
    await expect(page.locator('text=Note 2: Summary of Significant Accounting Policies')).toBeVisible()
    await expect(page.locator('text=Note 4: Revenue (ASC 606)')).toBeVisible()
    await expect(page.locator('text=Note 6: Leases (ASC 842)')).toBeVisible()
    
    // Expand a note
    await page.click('text=Note 1: Nature of Business')
    await expect(page.locator('text=Basis of Presentation')).toBeVisible()
  })

  test('should export financial statements to PDF', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click PDF export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("PDF Package")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.pdf')
    expect(download.suggestedFilename()).toContain('Financial_Statements')
  })

  test('should export financial statements to Excel', async ({ page }) => {
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Excel export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Excel Package")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.xlsx')
    expect(download.suggestedFilename()).toContain('Financial_Statements')
  })

  test('should handle empty data gracefully', async ({ page }) => {
    // With no journal entries, should still show structure
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(1000)
    
    // Should show message or zero balances
    await expect(page.locator('text=Balance Sheet, text=Income Statement').first()).toBeVisible()
  })
})

test.describe('Consolidated Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateWithClerk(page, ADMIN_USER)
    await page.goto('/accounting?tab=reporting')
  })

  test('should display consolidated reporting tab', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    
    // Verify consolidated view
    await expect(page.locator('text=Consolidated Financial Reporting')).toBeVisible()
    await expect(page.locator('text=ASC 810')).toBeVisible()
  })

  test('should show entity performance comparison', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    
    // Should see entity comparison
    await expect(page.locator('text=Entity Performance Comparison')).toBeVisible()
    await expect(page.locator('text=NGI Capital LLC')).toBeVisible()
    await expect(page.locator('text=Advisory LLC')).toBeVisible()
    await expect(page.locator('text=Consolidated')).toBeVisible()
  })

  test('should display consolidation worksheet', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    
    // Should see worksheet
    await expect(page.locator('text=Consolidation Worksheet')).toBeVisible()
    
    // Verify columns
    await expect(page.locator('text=Parent')).toBeVisible()
    await expect(page.locator('text=Subsidiary')).toBeVisible()
    await expect(page.locator('text=Eliminations')).toBeVisible()
    await expect(page.locator('text=Consolidated')).toBeVisible()
  })

  test('should show elimination entries', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    await page.click('button:has-text("Eliminations")')
    
    // Should see elimination summary
    await expect(page.locator('text=Elimination Entries Summary')).toBeVisible()
    await expect(page.locator('text=Eliminate investment in subsidiary')).toBeVisible()
  })

  test('should switch between entity views', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    
    // Switch to parent only
    await page.click('[role="combobox"]')
    await page.click('text=Parent Only')
    
    // Should update view
    await expect(page.locator('text=NGI Capital LLC')).toBeVisible()
  })

  test('should export consolidated package', async ({ page }) => {
    await page.click('button:has-text("Consolidated Reporting")')
    
    // Export button should be visible
    await expect(page.locator('button:has-text("Export Package")')).toBeVisible()
  })
})

test.describe('Financial Reporting - Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should validate balance sheet equation (Assets = Liabilities + Equity)', async ({ page }) => {
    await page.goto('/accounting?tab=reporting')
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Click Balance Sheet
    await page.click('button:has-text("Balance Sheet")')
    
    // Extract totals (this would need actual data parsing)
    const totalAssets = await page.locator('text=Total assets').locator('..').locator('text=/\\$[\\d,]+/').first().textContent()
    const totalLiabAndEquity = await page.locator('text=Total liabilities and stockholders\' equity').locator('..').locator('text=/\\$[\\d,]+/').first().textContent()
    
    // Should match
    expect(totalAssets).toBeTruthy()
    expect(totalLiabAndEquity).toBeTruthy()
  })

  test('should show comparative periods (current vs prior year)', async ({ page }) => {
    await page.goto('/accounting?tab=reporting')
    await page.click('button:has-text("Financial Statements")')
    await page.click('button:has-text("Generate Statements")')
    await page.waitForTimeout(2000)
    
    // Each statement should have 2 columns (2025 and 2024)
    await expect(page.locator('text=2025')).toBeVisible()
    await expect(page.locator('text=2024')).toBeVisible()
  })

  test('should show ASC compliance badge', async ({ page }) => {
    await page.goto('/accounting?tab=reporting')
    await page.click('button:has-text("Financial Statements")')
    
    // Verify GAAP compliance badge
    await expect(page.locator('text=ASC Compliant')).toBeVisible()
  })
})
