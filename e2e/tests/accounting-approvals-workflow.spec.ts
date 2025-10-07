/**
 * E2E Tests for Approvals Workflow
 * Tests dual-signature approval for journal entries and documents
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Approvals Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should display pending approvals dashboard', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Verify page loaded
    await expect(page.locator('h1:has-text("Approvals")')).toBeVisible()
    
    // Verify stats
    await expect(page.locator('text=Pending Approvals')).toBeVisible()
    await expect(page.locator('text=Approved This Month')).toBeVisible()
    await expect(page.locator('text=Your Pending Actions')).toBeVisible()
  })

  test('should approve journal entry', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Find pending JE
    await page.click('tr[data-type="journal_entry"][data-status="pending"]:first')
    
    // View details
    await expect(page.locator('text=Journal Entry Details')).toBeVisible()
    await expect(page.locator('text=Debit Total')).toBeVisible()
    await expect(page.locator('text=Credit Total')).toBeVisible()
    
    // Approve
    await page.click('button:has-text("Approve")')
    await page.fill('[name="approval_comments"]', 'Reviewed and approved - Landon')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify approved
    await expect(page.locator('text=Approval recorded')).toBeVisible()
  })

  test('should require dual signature for large entries', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Find entry requiring dual approval
    await page.click('tr[data-requires-dual="true"]:first')
    
    // First approval
    await page.click('button:has-text("Approve")')
    await page.fill('[name="approval_comments"]', 'First approval - Landon')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify still needs second approval
    await expect(page.locator('text=1 of 2 approvals')).toBeVisible()
    await expect(page.locator('[data-status="pending"]')).toBeVisible()
    
    // Logout and login as second approver
    await page.click('button:has-text("Sign Out")')
    await page.goto('/sign-in')
    await page.fill('[name="email"]', 'anurmamade@ngicapital.com')
    await page.fill('[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    
    // Go to approvals
    await page.goto('/accounting/approvals')
    
    // Second approval
    await page.click('tr[data-requires-dual="true"]:first')
    await page.click('button:has-text("Approve")')
    await page.fill('[name="approval_comments"]', 'Second approval - Andre')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify fully approved
    await expect(page.locator('text=2 of 2 approvals')).toBeVisible()
    await expect(page.locator('[data-status="approved"]')).toBeVisible()
  })

  test('should reject entry with reason', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Find pending entry
    await page.click('tr[data-status="pending"]:first')
    
    // Reject
    await page.click('button:has-text("Reject")')
    await page.fill('[name="rejection_reason"]', 'Missing supporting documentation')
    await page.click('button:has-text("Confirm Rejection")')
    
    // Verify rejected
    await expect(page.locator('text=Entry rejected')).toBeVisible()
    await expect(page.locator('[data-status="rejected"]')).toBeVisible()
  })

  test('should filter by approval type', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Filter by Journal Entries
    await page.click('button:has-text("Type")')
    await page.click('text=Journal Entries')
    
    // Verify filtered
    await expect(page.locator('[data-type="journal_entry"]')).toBeVisible()
  })

  test('should filter by status', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Filter by Pending
    await page.click('button:has-text("Status")')
    await page.click('text=Pending')
    
    // Verify filtered
    await expect(page.locator('[data-status="pending"]')).toBeVisible()
  })

  test('should display approval history', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Click on approved entry
    await page.click('tr[data-status="approved"]:first')
    
    // View history
    await page.click('button:has-text("View History")')
    
    // Verify history
    await expect(page.locator('text=Approval Timeline')).toBeVisible()
    await expect(page.locator('text=Submitted')).toBeVisible()
    await expect(page.locator('text=Approved by')).toBeVisible()
    await expect(page.locator('text=Approval Date')).toBeVisible()
  })

  test('should send approval notifications', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Verify notification indicator
    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible()
    
    // Click notifications
    await page.click('[data-testid="notifications"]')
    
    // Verify approval notifications
    await expect(page.locator('text=Pending your approval')).toBeVisible()
  })

  test('should approve document', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Find pending document
    await page.click('tr[data-type="document"][data-status="pending"]:first')
    
    // View document
    await expect(page.locator('text=Document Preview')).toBeVisible()
    
    // Approve
    await page.click('button:has-text("Approve Document")')
    await page.fill('[name="approval_comments"]', 'Document verified')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify approved
    await expect(page.locator('text=Document approved')).toBeVisible()
  })

  test('should bulk approve multiple items', async ({ page }) => {
    await page.goto('/accounting/approvals')
    
    // Select multiple items
    await page.check('input[type="checkbox"][value="1"]')
    await page.check('input[type="checkbox"][value="2"]')
    await page.check('input[type="checkbox"][value="3"]')
    
    // Bulk approve
    await page.click('button:has-text("Bulk Approve")')
    await page.fill('[name="bulk_approval_comments"]', 'Batch approved')
    await page.click('button:has-text("Confirm Bulk Approval")')
    
    // Verify approved
    await expect(page.locator('text=3 items approved')).toBeVisible()
  })
})

