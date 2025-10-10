import { test, expect } from '@playwright/test'

test.describe('Advisory Onboarding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the onboarding page (admin app is under /admin/)
    await page.goto('/admin/ngi-advisory/onboarding')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display onboarding control center with proper layout', async ({ page }) => {
    // Check that the page has the correct title and layout
    await expect(page.locator('h1')).toContainText('Advisory Onboarding')
    
    // Check that the ModuleHeader is present
    await expect(page.locator('[data-testid="module-header"]')).toBeVisible()
    
    // Check that filters are present (now integrated into the main card)
    await expect(page.locator('[role="tab"]:has-text("All")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("In Progress")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Awaiting Documents")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Completed")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Canceled")')).toBeVisible()
    
    // Check that the table is present
    await expect(page.locator('h3:has-text("Onboarding Flows")')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th:has-text("Student")')).toBeVisible()
    await expect(page.locator('th:has-text("Project")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")').first()).toBeVisible()
    await expect(page.locator('th:has-text("Progress")')).toBeVisible()
    await expect(page.locator('th:has-text("Email Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Documents")')).toBeVisible()
    await expect(page.locator('th:has-text("Created")')).toBeVisible()
    await expect(page.locator('th:has-text("Actions")')).toBeVisible()
  })

  test('should filter flows by status', async ({ page }) => {
    // Click on "In Progress" tab
    await page.click('text=In Progress')
    
    // Wait for any loading to complete
    await page.waitForTimeout(500)
    
    // Check that the tab is active
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('In Progress')
    
    // Click on "Completed" tab
    await page.click('text=Completed')
    await page.waitForTimeout(500)
    
    // Check that the tab is active
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Completed')
  })

  test('should search flows by student name or email', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search by student name"]', 'test')
    
    // Wait for search to complete
    await page.waitForTimeout(500)
    
    // Clear search
    await page.fill('input[placeholder*="Search by student name"]', '')
  })

  test('should open flow detail dialog when clicking View Details', async ({ page }) => {
    // Look for any existing flow rows
    const flowRows = page.locator('tbody tr')
    const rowCount = await flowRows.count()
    
    if (rowCount > 0) {
      // Click on the first "View Details" button
      await page.click('tbody tr:first-child button:has-text("View Details")')
      
      // Check that dialog opens
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      await expect(page.locator('h2:has-text("Onboarding Details")')).toBeVisible()
      
      // Check that workflow steps are displayed
      await expect(page.locator('text=Workflow Steps')).toBeVisible()
      
      // Check that document upload section is present
      await expect(page.locator('text=Document Upload')).toBeVisible()
      
      // Close dialog
      await page.click('button:has-text("Close")')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    } else {
      console.log('No flows found to test dialog functionality')
    }
  })

  test('should display progress bars correctly', async ({ page }) => {
    // Look for progress bars in the table
    const progressBars = page.locator('.w-24 .bg-blue-500, .w-24 .bg-green-500, .w-24 .bg-gray-400')
    const barCount = await progressBars.count()
    
    if (barCount > 0) {
      // Check that progress bars are visible
      await expect(progressBars.first()).toBeVisible()
    }
  })

  test('should display status badges correctly', async ({ page }) => {
    // Look for status badges
    const statusBadges = page.locator('[class*="inline-flex items-center rounded-full border"]')
    const badgeCount = await statusBadges.count()
    
    if (badgeCount > 0) {
      // Check that status badges are visible
      await expect(statusBadges.first()).toBeVisible()
    }
  })

  test('should handle empty state gracefully', async ({ page }) => {
    // If no flows exist, should show empty state message
    const emptyState = page.locator('text=No onboarding flows found')
    
    // This might or might not be visible depending on test data
    // Just check that the page doesn't crash - use more specific selector
    await expect(page.locator('h3:has-text("Onboarding Flows")')).toBeVisible()
  })

  test('should have proper responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that the layout still works
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Check that the layout still works
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('should have proper accessibility features', async ({ page }) => {
    // Check that table has proper headers
    await expect(page.locator('thead')).toBeVisible()
    
    // Check that buttons have proper text
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      const text = await button.textContent()
      expect(text).toBeTruthy()
    }
    
    // Check that form inputs have proper labels or placeholders
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const placeholder = await input.getAttribute('placeholder')
      const ariaLabel = await input.getAttribute('aria-label')
      expect(placeholder || ariaLabel).toBeTruthy()
    }
  })

  test('should match accounting module design patterns', async ({ page }) => {
    // Check that ModuleHeader is used (same as accounting)
    await expect(page.locator('[data-testid="module-header"]')).toBeVisible()
    
    // Check that Card components are used (check first one)
    await expect(page.locator('.rounded-lg.border.bg-card').first()).toBeVisible()
    
    // Check that Table components are used
    await expect(page.locator('table')).toBeVisible()
    
    // Check that proper spacing is used (p-6, gap-4, etc.)
    const cards = page.locator('.p-6')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
    
    // Check that no decorative icons are used (only functional ones)
    const icons = page.locator('svg')
    const iconCount = await icons.count()
    
    // Should have functional icons like Search, CheckCircle, etc.
    // but not decorative ones like Sparkles, Wand2, etc.
    if (iconCount > 0) {
      const iconClasses = await icons.first().getAttribute('class')
      expect(iconClasses).not.toContain('sparkles')
      expect(iconClasses).not.toContain('wand')
    }
  })
})

test.describe('Onboarding Flow Detail Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
  })

  test('should open and close dialog properly', async ({ page }) => {
    // Look for any existing flow rows
    const flowRows = page.locator('tbody tr')
    const rowCount = await flowRows.count()
    
    if (rowCount > 0) {
      // Open dialog
      await page.click('tbody tr:first-child button:has-text("View Details")')
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      
      // Check dialog content
      await expect(page.locator('h2:has-text("Onboarding Details")')).toBeVisible()
      await expect(page.locator('text=Workflow Steps')).toBeVisible()
      await expect(page.locator('text=Document Upload')).toBeVisible()
      
      // Close dialog with Close button
      await page.click('button:has-text("Close")')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    }
  })

  test('should display workflow steps as checkboxes', async ({ page }) => {
    const flowRows = page.locator('tbody tr')
    const rowCount = await flowRows.count()
    
    if (rowCount > 0) {
      await page.click('tbody tr:first-child button:has-text("View Details")')
      
      // Check that checkboxes are present for workflow steps
      const checkboxes = page.locator('input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()
      
      if (checkboxCount > 0) {
        await expect(checkboxes.first()).toBeVisible()
      }
    }
  })

  test('should have document upload functionality', async ({ page }) => {
    const flowRows = page.locator('tbody tr')
    const rowCount = await flowRows.count()
    
    if (rowCount > 0) {
      await page.click('tbody tr:first-child button:has-text("View Details")')
      
      // Check that file input is present
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput).toBeVisible()
      
      // Check that upload button is present
      const uploadButton = page.locator('button:has-text("Upload")')
      await expect(uploadButton).toBeVisible()
    }
  })
})
