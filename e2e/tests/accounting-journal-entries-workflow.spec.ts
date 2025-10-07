/**
 * E2E Tests for Journal Entries Workflow
 * Tests JE creation, posting, reversal, and templates
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Journal Entries Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should create balanced journal entry', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Click New Entry
    await page.click('button:has-text("New Entry")')
    
    // Fill entry details
    await page.fill('[name="entry_number"]', 'JE-E2E-001')
    await page.fill('[name="entry_date"]', '2025-10-05')
    await page.fill('[name="memo"]', 'E2E Test Journal Entry')
    await page.selectOption('[name="entry_type"]', 'standard')
    
    // Add debit line
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[0].account_id"]', { label: /Cash/ })
    await page.fill('[name="lines[0].debit_amount"]', '1000.00')
    await page.fill('[name="lines[0].description"]', 'Cash deposit')
    
    // Add credit line
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[1].account_id"]', { label: /Service Revenue/ })
    await page.fill('[name="lines[1].credit_amount"]', '1000.00')
    await page.fill('[name="lines[1].description"]', 'Revenue earned')
    
    // Verify balance indicator
    await expect(page.locator('text=Balanced')).toBeVisible()
    await expect(page.locator('[data-balanced="true"]')).toBeVisible()
    
    // Save draft
    await page.click('button:has-text("Save Draft")')
    await expect(page.locator('text=Entry saved')).toBeVisible()
  })

  test('should prevent unbalanced entry from posting', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    await page.click('button:has-text("New Entry")')
    
    // Create unbalanced entry
    await page.fill('[name="entry_date"]', '2025-10-05')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[0].account_id"]', { label: /Cash/ })
    await page.fill('[name="lines[0].debit_amount"]', '500.00')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[1].account_id"]', { label: /Revenue/ })
    await page.fill('[name="lines[1].credit_amount"]', '300.00') // Unbalanced!
    
    // Try to post
    const postButton = page.locator('button:has-text("Post Entry")')
    await expect(postButton).toBeDisabled()
    await expect(page.locator('text=Out of Balance')).toBeVisible()
  })

  test('should post journal entry', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Find draft entry
    await page.click('button:has-text("Status")')
    await page.click('text=Draft')
    
    // Open first draft entry
    await page.click('tr[data-status="draft"]:first')
    
    // Post entry
    await page.click('button:has-text("Post Entry")')
    await page.click('button:has-text("Confirm Post")')
    
    // Verify posted
    await expect(page.locator('[data-status="posted"]')).toBeVisible()
    await expect(page.locator('text=Entry posted successfully')).toBeVisible()
  })

  test('should reverse journal entry', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Find posted entry
    await page.click('tr[data-status="posted"]:first')
    
    // Click reverse
    await page.click('button:has-text("Reverse Entry")')
    await page.fill('[name="reversal_date"]', '2025-10-06')
    await page.fill('[name="reversal_reason"]', 'E2E test reversal')
    await page.click('button:has-text("Confirm Reversal")')
    
    // Verify reversal created
    await expect(page.locator('text=Reversal entry created')).toBeVisible()
    await expect(page.locator('[data-is-reversal="true"]')).toBeVisible()
  })

  test('should filter entries by period', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Select period filter
    await page.click('button:has-text("All Periods")')
    await page.click('text=October 2025')
    
    // Verify filtered
    await expect(page.locator('text=Showing entries for')).toBeVisible()
  })

  test('should search entries by entry number', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Search
    await page.fill('input[placeholder*="Search entries"]', 'JE-E2E-001')
    
    // Verify result
    await expect(page.locator('text=JE-E2E-001')).toBeVisible()
  })

  test('should display entry summary with totals', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Verify stats cards
    await expect(page.locator('text=Total Entries')).toBeVisible()
    await expect(page.locator('text=Draft')).toBeVisible()
    await expect(page.locator('text=Pending Approval')).toBeVisible()
    await expect(page.locator('text=Posted')).toBeVisible()
  })

  test('should create recurring journal entry template', async ({ page }) => {
    await page.goto('/accounting/journal-entries')
    
    // Create entry and mark as template
    await page.click('button:has-text("New Entry")')
    
    await page.fill('[name="entry_date"]', '2025-10-05')
    await page.check('[name="is_template"]')
    await page.fill('[name="template_name"]', 'Monthly Depreciation')
    
    // Add lines
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[0].account_id"]', { label: /Depreciation Expense/ })
    await page.fill('[name="lines[0].debit_amount"]', '1500.00')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[1].account_id"]', { label: /Accumulated Depreciation/ })
    await page.fill('[name="lines[1].credit_amount"]', '1500.00')
    
    // Save template
    await page.click('button:has-text("Save Template")')
    await expect(page.locator('text=Template saved')).toBeVisible()
  })
})

