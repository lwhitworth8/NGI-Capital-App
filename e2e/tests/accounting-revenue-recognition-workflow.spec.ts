/**
 * E2E Tests for Revenue Recognition Workflow (ASC 606)
 * Tests contract setup, performance obligations, and recognition schedules
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { test, expect } from '@playwright/test'
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth'

test.describe('Revenue Recognition Workflow (ASC 606)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication (bypasses Clerk OAuth)
    await authenticateWithClerk(page, ADMIN_USER)
  })

  test('should create revenue contract', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Create new contract
    await page.click('button:has-text("New Contract")')
    
    // Fill contract details
    await page.fill('[name="contract_number"]', 'CONT-E2E-001')
    await page.fill('[name="customer_name"]', 'Acme Corporation')
    await page.fill('[name="contract_date"]', '2025-10-01')
    await page.fill('[name="contract_start_date"]', '2025-10-01')
    await page.fill('[name="contract_end_date"]', '2026-09-30')
    await page.fill('[name="total_contract_value"]', '120000.00')
    
    // Save contract
    await page.click('button:has-text("Create Contract")')
    
    // Verify created
    await expect(page.locator('text=CONT-E2E-001')).toBeVisible()
    await expect(page.locator('text=Acme Corporation')).toBeVisible()
  })

  test('should add performance obligations to contract', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Open contract
    await page.click('tr:has-text("CONT-E2E-001")')
    
    // Add performance obligation
    await page.click('button:has-text("Add Performance Obligation")')
    
    // Fill details
    await page.fill('[name="description"]', 'Software License - Year 1')
    await page.fill('[name="standalone_selling_price"]', '60000.00')
    await page.fill('[name="allocated_amount"]', '60000.00')
    await page.selectOption('[name="recognition_method"]', 'over_time')
    await page.selectOption('[name="recognition_pattern"]', 'straight_line')
    
    await page.click('button:has-text("Add Obligation")')
    
    // Verify added
    await expect(page.locator('text=Software License - Year 1')).toBeVisible()
  })

  test('should generate recognition schedule', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Open contract
    await page.click('tr:has-text("CONT-E2E-001")')
    
    // Generate schedule
    await page.click('button:has-text("Generate Schedule")')
    
    // Verify schedule displays
    await expect(page.locator('text=Recognition Schedule')).toBeVisible()
    await expect(page.locator('text=Monthly Revenue')).toBeVisible()
    
    // Verify monthly amounts
    const monthlyAmount = await page.locator('[data-testid="monthly-revenue"]:first').textContent()
    expect(monthlyAmount).toContain('$5,000.00') // $60,000 / 12 months
  })

  test('should post recognized revenue entries', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Open contract
    await page.click('tr:has-text("CONT-E2E-001")')
    
    // Post current month revenue
    await page.click('button:has-text("Post October Revenue")')
    
    // Verify journal entry created
    await expect(page.locator('text=Revenue entry posted')).toBeVisible()
    await expect(page.locator('[data-posted="true"]')).toBeVisible()
  })

  test('should display deferred revenue balance', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Verify stats cards
    await expect(page.locator('text=Total Contract Value')).toBeVisible()
    await expect(page.locator('text=Recognized Revenue')).toBeVisible()
    await expect(page.locator('text=Deferred Revenue')).toBeVisible()
    
    // Verify deferred calculation
    const totalValue = await page.locator('[data-testid="total-value"]').textContent()
    const recognized = await page.locator('[data-testid="recognized"]').textContent()
    const deferred = await page.locator('[data-testid="deferred"]').textContent()
    
    // Parse values
    const total = parseFloat(totalValue!.replace(/[$,]/g, ''))
    const recog = parseFloat(recognized!.replace(/[$,]/g, ''))
    const defer = parseFloat(deferred!.replace(/[$,]/g, ''))
    
    // Verify: Deferred = Total - Recognized
    expect(Math.abs(defer - (total - recog))).toBeLessThan(0.01)
  })

  test('should handle contract modifications', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Open contract
    await page.click('tr:has-text("CONT-E2E-001")')
    
    // Modify contract
    await page.click('button:has-text("Modify Contract")')
    
    // Add amendment
    await page.fill('[name="modification_description"]', 'Added consulting services')
    await page.fill('[name="additional_amount"]', '24000.00')
    await page.fill('[name="modification_date"]', '2025-11-01')
    
    await page.click('button:has-text("Apply Modification")')
    
    // Verify modified
    await expect(page.locator('text=Contract modified')).toBeVisible()
    await expect(page.locator('text=$144,000.00')).toBeVisible() // Updated total
  })

  test('should export recognition report', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Export report
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export Report")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('revenue-recognition')
  })

  test('should display ASC 606 compliance notes', async ({ page }) => {
    await page.goto('/accounting/revrec')
    
    // Open contract
    await page.click('tr:has-text("CONT-E2E-001")')
    
    // View compliance tab
    await page.click('button:has-text("ASC 606 Compliance")')
    
    // Verify 5-step model documented
    await expect(page.locator('text=Step 1: Identify the Contract')).toBeVisible()
    await expect(page.locator('text=Step 2: Identify Performance Obligations')).toBeVisible()
    await expect(page.locator('text=Step 3: Determine Transaction Price')).toBeVisible()
    await expect(page.locator('text=Step 4: Allocate Price to Obligations')).toBeVisible()
    await expect(page.locator('text=Step 5: Recognize Revenue')).toBeVisible()
  })
})

