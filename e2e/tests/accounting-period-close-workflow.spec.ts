/**
 * E2E Tests for Period Close Workflow
 * Tests month-end close with validation checklist
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Period Close Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should display close checklist', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    // Select period
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Verify checklist items
    await expect(page.locator('text=Bank Reconciliation')).toBeVisible()
    await expect(page.locator('text=Accounts Receivable Aging')).toBeVisible()
    await expect(page.locator('text=Accounts Payable Verification')).toBeVisible()
    await expect(page.locator('text=Fixed Asset Review')).toBeVisible()
    await expect(page.locator('text=Prepaid Expenses Amortization')).toBeVisible()
    await expect(page.locator('text=Accrued Expenses')).toBeVisible()
    await expect(page.locator('text=Revenue Recognition Review')).toBeVisible()
    await expect(page.locator('text=Journal Entry Review')).toBeVisible()
    await expect(page.locator('text=Trial Balance Review')).toBeVisible()
    await expect(page.locator('text=Financial Statement Preparation')).toBeVisible()
  })

  test('should check off checklist items', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Check off item
    await page.check('[name="checklist_item_1"]')
    await page.fill('[name="checklist_notes_1"]', 'Bank rec completed and approved')
    await page.click('button:has-text("Save Progress")')
    
    // Verify saved
    await expect(page.locator('[data-item="1"][data-completed="true"]')).toBeVisible()
  })

  test('should show progress bar', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Verify progress indicator
    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    await expect(page.locator('text=% Complete')).toBeVisible()
  })

  test('should prevent close if checklist incomplete', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Try to close with incomplete checklist
    const closeButton = page.locator('button:has-text("Close Period")')
    
    if (await page.locator('[data-completed="false"]').isVisible()) {
      await expect(closeButton).toBeDisabled()
      await expect(page.locator('text=Complete all required items')).toBeVisible()
    }
  })

  test('should close period after checklist complete', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Complete all required items
    const checkboxes = await page.locator('input[type="checkbox"][required]').all()
    for (const checkbox of checkboxes) {
      await checkbox.check()
    }
    
    await page.click('button:has-text("Save Progress")')
    
    // Close period
    await page.click('button:has-text("Close Period")')
    
    // Confirm
    await page.fill('[name="closing_notes"]', 'October 2025 period closed')
    await page.click('button:has-text("Confirm Close")')
    
    // Verify closed
    await expect(page.locator('[data-status="Closed"]')).toBeVisible()
    await expect(page.locator('text=Period closed successfully')).toBeVisible()
  })

  test('should reopen closed period', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    // Find closed period
    await page.click('tr[data-status="Closed"]:first')
    
    // Reopen
    await page.click('button:has-text("Reopen Period")')
    await page.fill('[name="reopen_reason"]', 'Adjustment needed')
    await page.click('button:has-text("Confirm Reopen")')
    
    // Verify reopened
    await expect(page.locator('[data-status="Open"]')).toBeVisible()
  })

  test('should lock period', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    // Find closed period
    await page.click('tr[data-status="Closed"]:first')
    
    // Lock
    await page.click('button:has-text("Lock Period")')
    await page.fill('[name="lock_password"]', 'test_password')
    await page.click('button:has-text("Confirm Lock")')
    
    // Verify locked
    await expect(page.locator('[data-status="Locked"]')).toBeVisible()
    await expect(page.locator('text=Period locked')).toBeVisible()
  })

  test('should display close history', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    // Click history tab
    await page.click('button:has-text("Close History")')
    
    // Verify history
    await expect(page.locator('text=Closed By')).toBeVisible()
    await expect(page.locator('text=Closed Date')).toBeVisible()
    await expect(page.locator('text=Reopened By')).toBeVisible()
  })

  test('should generate standard adjusting entries', async ({ page }) => {
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Click generate adjustments
    await page.click('button:has-text("Generate Standard Adjustments")')
    
    // Select adjustment types
    await page.check('[name="depreciation"]')
    await page.check('[name="prepaid_amortization"]')
    await page.check('[name="accruals"]')
    
    await page.click('button:has-text("Generate Entries")')
    
    // Verify entries created
    await expect(page.locator('text=3 adjusting entries created')).toBeVisible()
  })
})

