/**
 * E2E Tests for Entity Conversion Workflow
 * Tests LLC to C-Corp conversion tracking and setup
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Entity Conversion Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should start LLC to C-Corp conversion', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Start conversion
    await page.click('button:has-text("Start Conversion")')
    
    // Fill conversion details
    await page.selectOption('[name="entity_id"]', { label: /NGI Capital Advisory LLC/ })
    await page.fill('[name="conversion_date"]', '2025-11-01')
    await page.fill('[name="new_entity_name"]', 'NGI Capital Advisory Inc.')
    await page.selectOption('[name="target_structure"]', 'C-Corp')
    await page.fill('[name="state_of_incorporation"]', 'Delaware')
    
    // Save
    await page.click('button:has-text("Create Conversion")')
    
    // Verify created
    await expect(page.locator('text=Conversion created')).toBeVisible()
    await expect(page.locator('text=NGI Capital Advisory Inc.')).toBeVisible()
  })

  test('should display conversion checklist', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Verify checklist
    await expect(page.locator('text=Conversion Checklist')).toBeVisible()
    await expect(page.locator('text=Board Resolution')).toBeVisible()
    await expect(page.locator('text=Certificate of Formation')).toBeVisible()
    await expect(page.locator('text=EIN Application')).toBeVisible()
    await expect(page.locator('text=83(b) Elections Filed')).toBeVisible()
    await expect(page.locator('text=Stock Certificates Issued')).toBeVisible()
    await expect(page.locator('text=Accounting Records Updated')).toBeVisible()
    await expect(page.locator('text=Chart of Accounts Modified')).toBeVisible()
  })

  test('should check off conversion tasks', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Complete task
    await page.check('[name="task_board_resolution"]')
    await page.fill('[name="task_note"]', 'Board resolution signed on 10/15/2025')
    await page.click('button:has-text("Save Progress")')
    
    // Verify saved
    await expect(page.locator('[data-task="board_resolution"][data-completed="true"]')).toBeVisible()
  })

  test('should create conversion journal entries', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Create conversion entries
    await page.click('button:has-text("Generate Conversion Entries")')
    
    // Verify entries created
    await expect(page.locator('text=Conversion journal entries created')).toBeVisible()
    await expect(page.locator('text=Member Equity → Common Stock')).toBeVisible()
    await expect(page.locator('text=Member Equity → Additional Paid-in Capital')).toBeVisible()
  })

  test('should track conversion costs', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Add cost
    await page.click('button:has-text("Add Cost")')
    await page.fill('[name="cost_description"]', 'Legal Fees - Entity Formation')
    await page.fill('[name="cost_amount"]', '5000.00')
    await page.fill('[name="cost_date"]', '2025-10-20')
    await page.click('button:has-text("Add")')
    
    // Verify cost added
    await expect(page.locator('text=Legal Fees - Entity Formation')).toBeVisible()
    await expect(page.locator('text=$5,000.00')).toBeVisible()
  })

  test('should upload conversion documents', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Upload document
    await page.click('button:has-text("Upload Document")')
    await page.setInputFiles('input[type="file"]', {
      name: 'certificate-of-incorporation.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%Certificate of Incorporation')
    })
    await page.selectOption('[name="document_type"]', 'certificate_of_incorporation')
    await page.click('button:has-text("Upload")')
    
    // Verify uploaded
    await expect(page.locator('text=certificate-of-incorporation.pdf')).toBeVisible()
  })

  test('should complete conversion', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // Complete all required tasks
    const requiredTasks = await page.locator('input[type="checkbox"][required]').all()
    for (const task of requiredTasks) {
      await task.check()
    }
    
    await page.click('button:has-text("Save Progress")')
    
    // Mark complete
    await page.click('button:has-text("Complete Conversion")')
    await page.fill('[name="completion_date"]', '2025-11-01')
    await page.fill('[name="completion_notes"]', 'Conversion completed successfully')
    await page.click('button:has-text("Confirm Completion")')
    
    // Verify completed
    await expect(page.locator('[data-status="completed"]')).toBeVisible()
    await expect(page.locator('text=Conversion completed')).toBeVisible()
  })

  test('should display tax election information', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // View tax tab
    await page.click('button:has-text("Tax Elections")')
    
    // Verify tax information
    await expect(page.locator('text=83(b) Election Deadline')).toBeVisible()
    await expect(page.locator('text=S-Corp Election (Form 2553)')).toBeVisible()
    await expect(page.locator('text=State Tax Registration')).toBeVisible()
  })

  test('should show cap table preview', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="in_progress"]:first')
    
    // View cap table
    await page.click('button:has-text("Cap Table Preview")')
    
    // Verify cap table
    await expect(page.locator('text=Shareholder Name')).toBeVisible()
    await expect(page.locator('text=Common Shares')).toBeVisible()
    await expect(page.locator('text=Ownership %')).toBeVisible()
  })

  test('should export conversion summary', async ({ page }) => {
    await page.goto('/accounting/entity-conversion')
    
    // Open conversion
    await page.click('tr[data-status="completed"]:first')
    
    // Export summary
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export Summary")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('conversion-summary')
  })
})

