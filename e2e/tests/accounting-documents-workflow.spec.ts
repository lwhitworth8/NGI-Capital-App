/**
 * E2E Tests for Documents Workflow
 * Tests document upload, categorization, OCR extraction, and approval
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Documents Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should upload invoice document', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Click upload button
    await page.click('button:has-text("Upload Documents")')
    
    // Upload file
    await page.setInputFiles('input[type="file"]', {
      name: 'test-invoice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%Test Invoice\n$1,234.56')
    })
    
    // Select category
    await page.selectOption('[name="category"]', 'invoices')
    await page.fill('[name="effective_date"]', '2025-10-05')
    
    // Submit
    await page.click('button:has-text("Upload")')
    
    // Verify upload success
    await expect(page.locator('text=test-invoice.pdf')).toBeVisible()
    await expect(page.locator('text=uploaded successfully')).toBeVisible()
  })

  test('should upload receipt document', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    await page.click('button:has-text("Upload Documents")')
    
    // Upload receipt
    await page.setInputFiles('input[type="file"]', {
      name: 'office-supplies-receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%Office Depot Receipt\n$87.23')
    })
    
    await page.selectOption('[name="category"]', 'receipts')
    await page.fill('[name="effective_date"]', '2025-10-05')
    
    await page.click('button:has-text("Upload")')
    
    // Verify receipt uploaded
    await expect(page.locator('text=office-supplies-receipt.pdf')).toBeVisible()
  })

  test('should filter documents by category', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Filter by invoices
    await page.click('button:has-text("Category")')
    await page.click('text=Invoices')
    
    // Verify filtered
    await expect(page.locator('[data-category="invoices"]')).toBeVisible()
  })

  test('should search documents by filename', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Search
    await page.fill('input[placeholder*="Search documents"]', 'invoice')
    
    // Verify search results
    await expect(page.locator('text=invoice')).toBeVisible()
  })

  test('should view document details', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Click on a document
    await page.click('tr:has-text("test-invoice.pdf")')
    
    // Verify details modal
    await expect(page.locator('text=Document Details')).toBeVisible()
    await expect(page.locator('text=Category')).toBeVisible()
    await expect(page.locator('text=Effective Date')).toBeVisible()
  })

  test('should download document', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Click download button
    const downloadPromise = page.waitForEvent('download')
    await page.click('button[aria-label="Download document"]:first')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should approve document', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Find pending document
    await page.click('button:has-text("Status")')
    await page.click('text=Pending')
    
    // Approve
    await page.click('button:has-text("Approve"):first')
    await page.fill('[name="approval_notes"]', 'Approved for posting')
    await page.click('button:has-text("Confirm Approval")')
    
    // Verify approved
    await expect(page.locator('[data-status="approved"]')).toBeVisible()
  })

  test('should display document stats', async ({ page }) => {
    await page.goto('/accounting/documents')
    
    // Verify stats cards
    await expect(page.locator('text=Total Documents')).toBeVisible()
    await expect(page.locator('text=Pending Approval')).toBeVisible()
    await expect(page.locator('text=This Month')).toBeVisible()
  })
})

