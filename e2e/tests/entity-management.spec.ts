/**
 * E2E Test for Entity Management Module
 * Tests organizational structure tree and entity conversion workflow
 * 
 * Author: NGI Capital Development Team
 * Date: October 4, 2025
 */

import { test, expect } from '@playwright/test'

test.describe('Entity Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.fill('[name="email"]', 'lwhitworth@ngicapitaladvisory.com')
    await page.fill('[name="password"]', 'test_password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Navigate to entity management
    await page.goto('/entities')
  })
  
  test('displays entity organizational tree structure', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1:has-text("Entity Management")')).toBeVisible()
    
    // Verify parent entity displayed
    await expect(page.locator('[data-entity-id="1"]')).toBeVisible()
    await expect(page.locator('text=NGI Capital LLC')).toBeVisible()
    
    // Verify entity type shown
    await expect(page.locator('[data-entity-id="1"] >> text=LLC')).toBeVisible()
    
    // Verify subsidiaries displayed
    await expect(page.locator('text=NGI Capital Advisory LLC')).toBeVisible()
    await expect(page.locator('text=The Creator Terminal Inc.')).toBeVisible()
    
    // Verify tree lines connecting entities
    const treeLines = page.locator('[data-testid="tree-line"]')
    await expect(treeLines).toHaveCount(3) // Vertical, horizontal, and subsidiary lines
  })
  
  test('shows correct entity status and icons', async ({ page }) => {
    // Active entity should not have lock icon
    const ngiCapitalCard = page.locator('[data-entity-id="1"]')
    await expect(ngiCapitalCard.locator('[data-icon="lock"]')).not.toBeVisible()
    
    // Pending entities should have lock icons
    const advisoryCard = page.locator('[data-entity-id="2"]')
    await expect(advisoryCard.locator('[data-icon="lock"]')).toBeVisible()
    
    const creatorCard = page.locator('[data-entity-id="3"]')
    await expect(creatorCard.locator('[data-icon="lock"]')).toBeVisible()
  })
  
  test('opens employee org chart modal', async ({ page }) => {
    // Click on NGI Capital LLC to open employee chart
    await page.click('[data-entity-id="1"]')
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="employee-org-chart-modal"]')).toBeVisible()
    
    // Verify modal title
    await expect(page.locator('text=NGI Capital LLC Organization')).toBeVisible()
    
    // Verify Board of Directors section
    await expect(page.locator('text=Board of Directors')).toBeVisible()
    
    // Verify partners/employees shown
    await expect(page.locator('text=Landon Whitworth')).toBeVisible()
    await expect(page.locator('text=lwhitworth@ngicapitaladvisory.com')).toBeVisible()
    await expect(page.locator('text=50%')).toBeVisible()
    
    await expect(page.locator('text=Andre Nurmamade')).toBeVisible()
    await expect(page.locator('text=anurmamade@ngicapital.com')).toBeVisible()
    
    // Verify Executive Team section
    await expect(page.locator('text=Executive Team')).toBeVisible()
    
    // Close modal
    await page.click('button:has-text("Close")')
    await expect(page.locator('[data-testid="employee-org-chart-modal"]')).not.toBeVisible()
  })
  
  test('employee org chart has tree structure', async ({ page }) => {
    await page.click('[data-entity-id="1"]')
    
    await page.waitForSelector('[data-testid="employee-org-chart-modal"]')
    
    // Verify tree structure exists
    const employeeTreeLines = page.locator('[data-testid="employee-tree-line"]')
    await expect(employeeTreeLines.first()).toBeVisible()
    
    // Verify employee cards positioned correctly
    const employeeCards = page.locator('[data-testid="employee-card"]')
    await expect(employeeCards).toHaveCount(2)
  })
  
  test('expands and collapses org chart sections', async ({ page }) => {
    await page.click('[data-entity-id="1"]')
    await page.waitForSelector('[data-testid="employee-org-chart-modal"]')
    
    // Collapse Board of Directors
    await page.click('[data-testid="collapse-board"]')
    
    // Verify section collapsed
    await expect(page.locator('[data-testid="board-members"]')).not.toBeVisible()
    
    // Expand again
    await page.click('[data-testid="collapse-board"]')
    await expect(page.locator('[data-testid="board-members"]')).toBeVisible()
  })
  
  test('opens entity conversion modal', async ({ page }) => {
    // Click "Convert Entity" button
    await page.click('button:has-text("Convert Entity")')
    
    // Wait for modal
    await expect(page.locator('[data-testid="conversion-modal"]')).toBeVisible()
    
    // Verify 6 conversion steps shown
    const steps = page.locator('[data-testid="conversion-step"]')
    await expect(steps).toHaveCount(6)
    
    // Verify step titles
    await expect(page.locator('text=Upload Formation Documents')).toBeVisible()
    await expect(page.locator('text=Document Processing')).toBeVisible()
    await expect(page.locator('text=Review & Approve')).toBeVisible()
    await expect(page.locator('text=IRS Filings')).toBeVisible()
    await expect(page.locator('text=Conversion Complete')).toBeVisible()
    await expect(page.locator('text=Activate Subsidiaries')).toBeVisible()
  })
  
  test('conversion modal is streamlined', async ({ page }) => {
    await page.click('button:has-text("Convert Entity")')
    await page.waitForSelector('[data-testid="conversion-modal"]')
    
    // Verify no extraneous text
    await expect(page.locator('text=Automated Document-Based Conversion')).not.toBeVisible()
    await expect(page.locator('text=Note:')).not.toBeVisible()
    
    // Only Close button, no "Go to Entity Conversion Module"
    await expect(page.locator('button:has-text("Close")')).toBeVisible()
    await expect(page.locator('button:has-text("Go to Entity Conversion Module")')).not.toBeVisible()
  })
  
  test('close conversion modal', async ({ page }) => {
    await page.click('button:has-text("Convert Entity")')
    await page.waitForSelector('[data-testid="conversion-modal"]')
    
    // Close modal
    await page.click('button:has-text("Close")')
    
    // Verify modal closed
    await expect(page.locator('[data-testid="conversion-modal"]')).not.toBeVisible()
  })
  
  test('entity cards display correct information', async ({ page }) => {
    // NGI Capital LLC card
    const ngiCard = page.locator('[data-entity-id="1"]')
    await expect(ngiCard).toBeVisible()
    await expect(ngiCard.locator('text=NGI Capital LLC')).toBeVisible()
    await expect(ngiCard.locator('text=LLC')).toBeVisible()
    await expect(ngiCard.locator('text=Active')).toBeVisible()
    
    // Advisory LLC card
    const advisoryCard = page.locator('[data-entity-id="2"]')
    await expect(advisoryCard).toBeVisible()
    await expect(advisoryCard.locator('text=NGI Capital Advisory LLC')).toBeVisible()
    await expect(advisoryCard.locator('text=100% owned')).toBeVisible()
    await expect(advisoryCard.locator('text=Pending Conversion')).toBeVisible()
    
    // Creator Terminal card
    const creatorCard = page.locator('[data-entity-id="3"]')
    await expect(creatorCard).toBeVisible()
    await expect(creatorCard.locator('text=The Creator Terminal Inc.')).toBeVisible()
    await expect(creatorCard.locator('text=C-Corp')).toBeVisible()
    await expect(creatorCard.locator('text=100% owned')).toBeVisible()
  })
  
  test('tree structure is properly centered', async ({ page }) => {
    // Get bounding boxes
    const parentCard = page.locator('[data-entity-id="1"]')
    const parentBox = await parentCard.boundingBox()
    
    const subsidiary1 = page.locator('[data-entity-id="2"]')
    const sub1Box = await subsidiary1.boundingBox()
    
    const subsidiary2 = page.locator('[data-entity-id="3"]')
    const sub2Box = await subsidiary2.boundingBox()
    
    // Verify parent is centered above subsidiaries
    const parentCenter = parentBox!.x + parentBox!.width / 2
    const subsCenter = (sub1Box!.x + sub2Box!.x + sub2Box!.width) / 2
    
    // Allow 5px tolerance for centering
    expect(Math.abs(parentCenter - subsCenter)).toBeLessThan(5)
  })
  
  test('no grid view toggle present', async ({ page }) => {
    // Grid View toggle should be removed
    await expect(page.locator('button:has-text("Grid View")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Tree View")')).not.toBeVisible()
  })
  
  test('no Add Entity button present', async ({ page }) => {
    // Add Entity button should be replaced by Convert Entity
    await expect(page.locator('button:has-text("Add Entity")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Convert Entity")')).toBeVisible()
  })
  
  test('animations present on load', async ({ page }) => {
    // Reload page to see animations
    await page.reload()
    
    // Check for animation classes
    const entityCards = page.locator('[data-testid="entity-card"]')
    const firstCard = entityCards.first()
    
    // Verify animation classes applied
    await expect(firstCard).toHaveClass(/animate-in|fade-in|zoom-in/)
  })
  
  test('employee emails fit within cards', async ({ page }) => {
    await page.click('[data-entity-id="1"]')
    await page.waitForSelector('[data-testid="employee-org-chart-modal"]')
    
    // Get employee card
    const employeeCard = page.locator('[data-testid="employee-card"]').first()
    const cardBox = await employeeCard.boundingBox()
    
    // Get email text element
    const emailText = employeeCard.locator('[data-testid="employee-email"]')
    const emailBox = await emailText.boundingBox()
    
    // Verify email doesn't overflow card
    expect(emailBox!.x + emailBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width)
    
    // Verify email doesn't wrap (single line)
    expect(emailBox!.height).toBeLessThan(30) // Single line height
  })
})

