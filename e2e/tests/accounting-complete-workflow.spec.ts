/**
 * E2E Test for Complete End-to-End Accounting Workflow
 * Tests the entire accounting cycle from setup through financial statements
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Complete Accounting Workflow - Full Cycle', () => {
  test('complete accounting cycle: setup → transactions → close → reporting', async ({ page }) => {
    // ===================
    // STEP 1: Setup Authentication
    // ===================
    await authenticateWithClerk(page, ADMIN_USER)
    await page.goto('/dashboard')
    
    // ===================
    // STEP 2: Setup Chart of Accounts
    // ===================
    await page.goto('/accounting/chart-of-accounts')
    
    // Seed COA if needed
    const seedButton = page.locator('button:has-text("Seed US GAAP Chart of Accounts")')
    if (await seedButton.isVisible()) {
      await seedButton.click()
      await page.waitForSelector('text=successfully seeded', { timeout: 10000 })
    }
    
    await expect(page.locator('text=Cash')).toBeVisible()
    
    // ===================
    // STEP 3: Upload Supporting Documents
    // ===================
    await page.goto('/accounting/documents')
    
    // Upload invoice
    await page.click('button:has-text("Upload Documents")')
    await page.setInputFiles('input[type="file"]', {
      name: 'client-invoice-001.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%Invoice $5,000')
    })
    await page.selectOption('[name="category"]', 'invoices')
    await page.fill('[name="effective_date"]', '2025-10-15')
    await page.click('button:has-text("Upload")')
    
    await expect(page.locator('text=client-invoice-001.pdf')).toBeVisible()
    
    // Upload receipt
    await page.click('button:has-text("Upload Documents")')
    await page.setInputFiles('input[type="file"]', {
      name: 'office-supplies.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%Receipt $250')
    })
    await page.selectOption('[name="category"]', 'receipts')
    await page.fill('[name="effective_date"]', '2025-10-18')
    await page.click('button:has-text("Upload")')
    
    await expect(page.locator('text=office-supplies.pdf')).toBeVisible()
    
    // ===================
    // STEP 4: Create Journal Entries
    // ===================
    await page.goto('/accounting/journal-entries')
    
    // Create revenue entry
    await page.click('button:has-text("New Entry")')
    await page.fill('[name="entry_number"]', 'JE-2025-OCT-001')
    await page.fill('[name="entry_date"]', '2025-10-15')
    await page.fill('[name="memo"]', 'Client services rendered')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[0].account_id"]', { label: /Cash/ })
    await page.fill('[name="lines[0].debit_amount"]', '5000.00')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[1].account_id"]', { label: /Service Revenue/ })
    await page.fill('[name="lines[1].credit_amount"]', '5000.00')
    
    await expect(page.locator('text=Balanced')).toBeVisible()
    await page.click('button:has-text("Save Draft")')
    await page.click('button:has-text("Post Entry")')
    await page.click('button:has-text("Confirm")')
    
    // Create expense entry
    await page.click('button:has-text("New Entry")')
    await page.fill('[name="entry_number"]', 'JE-2025-OCT-002')
    await page.fill('[name="entry_date"]', '2025-10-18')
    await page.fill('[name="memo"]', 'Office supplies purchase')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[0].account_id"]', { label: /Office Supplies/ })
    await page.fill('[name="lines[0].debit_amount"]', '250.00')
    
    await page.click('button:has-text("Add Line")')
    await page.selectOption('[name="lines[1].account_id"]', { label: /Cash/ })
    await page.fill('[name="lines[1].credit_amount"]', '250.00')
    
    await page.click('button:has-text("Save Draft")')
    await page.click('button:has-text("Post Entry")')
    await page.click('button:has-text("Confirm")')
    
    // ===================
    // STEP 5: Bank Reconciliation
    // ===================
    await page.goto('/accounting/bank-reconciliation')
    
    // Sync Mercury transactions
    await page.click('[data-testid="bank-account-selector"]')
    await page.click('text=NGI Capital Operating Account')
    await page.click('button:has-text("Sync Mercury")')
    await expect(page.locator('text=Sync complete')).toBeVisible({ timeout: 15000 })
    
    // Auto-match transactions
    await page.click('button:has-text("Auto-Match")')
    await expect(page.locator('text=matched')).toBeVisible()
    
    // Create reconciliation
    await page.click('button:has-text("New Reconciliation")')
    await page.fill('[name="reconciliation_date"]', '2025-10-31')
    await page.fill('[name="ending_balance_per_bank"]', '32000.00')
    await page.click('button:has-text("Save Reconciliation")')
    
    // Approve
    await page.click('button:has-text("Approve")')
    await page.fill('[name="approval_notes"]', 'October reconciliation approved')
    await page.click('button:has-text("Confirm Approval")')
    
    // ===================
    // STEP 6: Generate Trial Balance
    // ===================
    await page.goto('/accounting/trial-balance')
    
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    // Verify balanced
    await expect(page.locator('[data-balanced="true"]')).toBeVisible()
    await expect(page.locator('text=Difference: $0.00')).toBeVisible()
    
    // ===================
    // STEP 7: Period Close
    // ===================
    await page.goto('/accounting/period-close')
    
    await page.selectOption('[name="period"]', { label: /October 2025/ })
    
    // Complete checklist items
    await page.check('[name="checklist_item_1"]') // Bank Rec
    await page.check('[name="checklist_item_9"]') // JE Review
    await page.check('[name="checklist_item_10"]') // TB Review
    
    await page.click('button:has-text("Save Progress")')
    
    // Close period (if all required items complete)
    const closeButton = page.locator('button:has-text("Close Period")')
    if (await closeButton.isEnabled()) {
      await closeButton.click()
      await page.fill('[name="closing_notes"]', 'October 2025 closed')
      await page.click('button:has-text("Confirm Close")')
      await expect(page.locator('text=Period closed')).toBeVisible()
    }
    
    // ===================
    // STEP 8: Generate Financial Statements
    // ===================
    await page.goto('/accounting/financial-reporting')
    
    // Generate Income Statement
    await page.goto('/accounting/financial-reporting/income-statement')
    await page.fill('[name="start_date"]', '2025-10-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    await expect(page.locator('text=Income Statement')).toBeVisible()
    await expect(page.locator('text=Revenue')).toBeVisible()
    await expect(page.locator('text=Net Income')).toBeVisible()
    
    // Generate Balance Sheet
    await page.goto('/accounting/financial-reporting/balance-sheet')
    await page.fill('[name="as_of_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    await expect(page.locator('text=Balance Sheet')).toBeVisible()
    await expect(page.locator('text=ASSETS')).toBeVisible()
    await expect(page.locator('text=LIABILITIES')).toBeVisible()
    await expect(page.locator('text=EQUITY')).toBeVisible()
    
    // Generate Cash Flow Statement
    await page.goto('/accounting/financial-reporting/cash-flow')
    await page.fill('[name="start_date"]', '2025-10-01')
    await page.fill('[name="end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate")')
    
    await expect(page.locator('text=Cash Flow Statement')).toBeVisible()
    await expect(page.locator('text=Operating Activities')).toBeVisible()
    
    // ===================
    // STEP 9: Export Financial Package
    // ===================
    await page.goto('/accounting/financial-reporting')
    await page.fill('[name="period_end_date"]', '2025-10-31')
    await page.click('button:has-text("Generate Statements")')
    
    // Download PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download PDF")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('financial-statements')
    expect(download.suggestedFilename()).toContain('.pdf')
    
    // ===================
    // VERIFICATION: Complete cycle success
    // ===================
    await expect(page.locator('text=Financial statements generated')).toBeVisible()
  })
})

