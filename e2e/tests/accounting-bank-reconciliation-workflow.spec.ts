/**
 * E2E Tests for Bank Reconciliation Workflow
 * Tests Mercury sync, transaction matching, and reconciliation
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Bank Reconciliation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should sync transactions from Mercury', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Select bank account
    await page.click('[data-testid="bank-account-selector"]')
    await page.click('text=NGI Capital Operating Account')
    
    // Click sync
    await page.click('button:has-text("Sync Mercury")')
    
    // Wait for sync to complete
    await expect(page.locator('text=Sync complete')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=transactions synced')).toBeVisible()
  })

  test('should auto-match transactions', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Select account
    await page.click('[data-testid="bank-account-selector"]')
    await page.click('text=NGI Capital Operating Account')
    
    // Auto-match
    await page.click('button:has-text("Auto-Match")')
    
    // Verify matches
    await expect(page.locator('text=transactions auto-matched')).toBeVisible()
    await expect(page.locator('[data-matched="true"]')).toBeVisible()
  })

  test('should manually match transaction to journal entry', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Find unmatched transaction
    await page.click('button:has-text("Status")')
    await page.click('text=Unmatched')
    
    // Open transaction
    await page.click('tr[data-matched="false"]:first')
    
    // Click manual match
    await page.click('button:has-text("Match to Entry")')
    
    // Select journal entry
    await page.fill('input[placeholder*="Search entries"]', 'JE-')
    await page.click('text=JE-2025-001')
    
    // Confirm match
    await page.click('button:has-text("Confirm Match")')
    
    // Verify matched
    await expect(page.locator('text=Transaction matched')).toBeVisible()
  })

  test('should create reconciliation', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Click New Reconciliation
    await page.click('button:has-text("New Reconciliation")')
    
    // Fill details
    await page.fill('[name="reconciliation_date"]', '2025-10-31')
    await page.fill('[name="beginning_balance"]', '25000.00')
    await page.fill('[name="ending_balance_per_bank"]', '28500.00')
    await page.fill('[name="statement_reference"]', 'STMT-OCT-2025')
    
    // Add cleared transactions
    await page.click('button:has-text("Select Cleared Transactions")')
    await page.check('input[type="checkbox"][value="1"]')
    await page.check('input[type="checkbox"][value="2"]')
    
    // Calculate
    await page.click('button:has-text("Calculate")')
    
    // Verify balanced
    await expect(page.locator('[data-balanced="true"]')).toBeVisible()
    await expect(page.locator('text=Difference: $0.00')).toBeVisible()
    
    // Save reconciliation
    await page.click('button:has-text("Save Reconciliation")')
    await expect(page.locator('text=Reconciliation saved')).toBeVisible()
  })

  test('should approve bank reconciliation', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Find pending reconciliation
    await page.click('tr[data-status="pending"]:first')
    
    // Approve
    await page.click('button:has-text("Approve")')
    await page.fill('[name="approval_notes"]', 'Approved by Landon')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify approved
    await expect(page.locator('[data-status="approved"]')).toBeVisible()
  })

  test('should display reconciliation stats', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Verify stats cards
    await expect(page.locator('text=Total Transactions')).toBeVisible()
    await expect(page.locator('text=Matched')).toBeVisible()
    await expect(page.locator('text=Unmatched')).toBeVisible()
    await expect(page.locator('text=This Month')).toBeVisible()
  })

  test('should create matching rule', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Click Matching Rules
    await page.click('button:has-text("Matching Rules")')
    
    // Create new rule
    await page.click('button:has-text("Create Rule")')
    
    // Fill rule
    await page.fill('[name="rule_name"]', 'Amazon Purchases')
    await page.selectOption('[name="match_field"]', 'description')
    await page.selectOption('[name="match_operator"]', 'contains')
    await page.fill('[name="match_value"]', 'AMAZON')
    await page.selectOption('[name="target_account_id"]', { label: /Office Supplies/ })
    
    // Save rule
    await page.click('button:has-text("Save Rule")')
    await expect(page.locator('text=Rule created')).toBeVisible()
  })

  test('should unmatch transaction', async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation')
    
    // Find matched transaction
    await page.click('tr[data-matched="true"]:first')
    
    // Unmatch
    await page.click('button:has-text("Unmatch")')
    await page.fill('[name="unmatch_reason"]', 'Incorrect match')
    await page.click('button:has-text("Confirm Unmatch")')
    
    // Verify unmatched
    await expect(page.locator('text=Transaction unmatched')).toBeVisible()
  })
})

