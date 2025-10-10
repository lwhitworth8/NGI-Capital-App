import { test, expect } from '@playwright/test'

test.describe('Entity Selector', () => {
  test('entity selector works identically in all modules', async ({ page }) => {
    // Test in Dashboard
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Click entity selector badge
    await page.click('button:has-text("NGI Capital LLC")')
    await expect(page.locator('text=Switch Entity')).toBeVisible()
    await expect(page.locator('text=NGI Capital Advisory LLC')).toBeVisible()
    
    // Locked entities should be disabled
    const advisoryButton = page.locator('button:has-text("NGI Capital Advisory LLC")')
    await expect(advisoryButton).toBeDisabled()
    
    // Close dialog
    await page.keyboard.press('Escape')
    
    // Same in Accounting
    await page.goto('/admin/accounting')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("NGI Capital LLC")')
    await expect(page.locator('text=Switch Entity')).toBeVisible()
    await page.keyboard.press('Escape')
    
    // Same in Finance
    await page.goto('/admin/finance')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("NGI Capital LLC")')
    await expect(page.locator('text=Switch Entity')).toBeVisible()
    await page.keyboard.press('Escape')
    
    // Same in Employees
    await page.goto('/admin/employees')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("NGI Capital LLC")')
    await expect(page.locator('text=Switch Entity')).toBeVisible()
  })

  test('keyboard shortcut Ctrl+E opens selector', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Press Ctrl+E
    await page.keyboard.press('Control+e')
    
    // Should open dialog
    await expect(page.locator('text=Switch Entity')).toBeVisible()
    await expect(page.locator('text=Select which entity to manage')).toBeVisible()
  })

  test('entity selection persists across page navigation', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verify default entity is selected
    await expect(page.locator('button:has-text("NGI Capital LLC")')).toBeVisible()
    
    // Navigate to accounting
    await page.goto('/admin/accounting')
    await page.waitForLoadState('networkidle')
    
    // Should still show same entity
    await expect(page.locator('button:has-text("NGI Capital LLC")')).toBeVisible()
  })

  test('locked entities show lock icon and pending conversion status', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Open entity selector
    await page.click('button:has-text("NGI Capital LLC")')
    
    // Check locked entities
    await expect(page.locator('text=NGI Capital Advisory LLC')).toBeVisible()
    await expect(page.locator('text=🔒').first()).toBeVisible()
    await expect(page.locator('text=Pending Conversion')).toBeVisible()
    
    // Check Creator Terminal, Inc
    await expect(page.locator('text=Creator Terminal, Inc')).toBeVisible()
  })

  test('selected entity shows checkmark', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Open entity selector
    await page.click('button:has-text("NGI Capital LLC")')
    
    // Selected entity should have checkmark
    const selectedButton = page.locator('button:has-text("NGI Capital LLC")').last()
    await expect(selectedButton.locator('text=✓')).toBeVisible()
  })
})

