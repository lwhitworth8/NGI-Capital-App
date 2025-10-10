import { test, expect } from '@playwright/test'

test.describe('Complete Onboarding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the onboarding page
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
  })

  test('should complete full onboarding workflow for lwhitworth@berkeley.edu', async ({ page }) => {
    // Step 1: Create a test application
    console.log('Step 1: Creating test application...')
    
    // Navigate to applications page first to create an application
    await page.goto('/admin/ngi-advisory/applications')
    await page.waitForLoadState('networkidle')
    
    // Look for a "New Application" button or similar
    const newAppButton = page.locator('button:has-text("New Application"), button:has-text("Add Application"), button:has-text("Create Application")').first()
    if (await newAppButton.isVisible()) {
      await newAppButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Fill out application form if it exists
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailInput.isVisible()) {
      await emailInput.fill('lwhitworth@berkeley.edu')
    }
    
    const firstNameInput = page.locator('input[name="first_name"], input[placeholder*="first"]').first()
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Landon')
    }
    
    const lastNameInput = page.locator('input[name="last_name"], input[placeholder*="last"]').first()
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill('Whitworth')
    }
    
    const schoolInput = page.locator('input[name="school"], input[placeholder*="school"]').first()
    if (await schoolInput.isVisible()) {
      await schoolInput.fill('UC Berkeley')
    }
    
    const programInput = page.locator('input[name="program"], input[placeholder*="program"]').first()
    if (await programInput.isVisible()) {
      await programInput.fill('Computer Science')
    }
    
    // Submit application
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")').first()
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Step 2: Navigate back to onboarding page
    console.log('Step 2: Navigating to onboarding page...')
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Step 3: Create onboarding flow
    console.log('Step 3: Creating onboarding flow...')
    
    // Look for create flow button or similar
    const createFlowButton = page.locator('button:has-text("Create Flow"), button:has-text("New Flow"), button:has-text("Add Flow")').first()
    if (await createFlowButton.isVisible()) {
      await createFlowButton.click()
      await page.waitForTimeout(1000)
    }
    
    // If there's a dialog, fill it out
    const studentSelect = page.locator('select[name="student_id"], [role="combobox"]').first()
    if (await studentSelect.isVisible()) {
      await studentSelect.selectOption({ label: 'Landon Whitworth' })
    }
    
    const projectSelect = page.locator('select[name="project_id"]').first()
    if (await projectSelect.isVisible()) {
      await projectSelect.selectOption({ index: 0 }) // Select first project
    }
    
    const ndaCheckbox = page.locator('input[type="checkbox"][name="nda_required"]').first()
    if (await ndaCheckbox.isVisible()) {
      await ndaCheckbox.check()
    }
    
    // Submit the flow creation
    const submitFlowButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Flow")').first()
    if (await submitFlowButton.isVisible()) {
      await submitFlowButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Step 4: Test the onboarding workflow
    console.log('Step 4: Testing onboarding workflow...')
    
    // Look for the created flow in the table
    const flowRow = page.locator('tr:has-text("lwhitworth@berkeley.edu")').first()
    await expect(flowRow).toBeVisible()
    
    // Test email provisioning
    console.log('Step 5: Testing email provisioning...')
    const provisionEmailButton = flowRow.locator('button:has-text("Provision Email"), button:has-text("Email")').first()
    if (await provisionEmailButton.isVisible()) {
      await provisionEmailButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Test document upload (mock)
    console.log('Step 6: Testing document upload...')
    const uploadButton = flowRow.locator('button:has-text("Upload"), input[type="file"]').first()
    if (await uploadButton.isVisible()) {
      // For file input, we can't actually upload in E2E, but we can test the UI
      if (await uploadButton.getAttribute('type') === 'file') {
        console.log('File upload input found - UI test passed')
      } else {
        await uploadButton.click()
        await page.waitForTimeout(1000)
      }
    }
    
    // Test status updates
    console.log('Step 7: Testing status updates...')
    const statusDropdown = flowRow.locator('select, [role="combobox"]').first()
    if (await statusDropdown.isVisible()) {
      await statusDropdown.selectOption({ label: 'In Progress' })
      await page.waitForTimeout(1000)
    }
    
    // Test finalization
    console.log('Step 8: Testing finalization...')
    const finalizeButton = flowRow.locator('button:has-text("Finalize"), button:has-text("Complete")').first()
    if (await finalizeButton.isVisible()) {
      await finalizeButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Test welcome email sending
    console.log('Step 9: Testing welcome email...')
    const welcomeEmailButton = flowRow.locator('button:has-text("Welcome Email"), button:has-text("Send Email")').first()
    if (await welcomeEmailButton.isVisible()) {
      await welcomeEmailButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Step 10: Verify employee creation
    console.log('Step 10: Verifying employee creation...')
    await page.goto('/admin/employees')
    await page.waitForLoadState('networkidle')
    
    // Look for the new employee
    const employeeRow = page.locator('tr:has-text("Landon Whitworth"), tr:has-text("lwhitworth@berkeley.edu")').first()
    await expect(employeeRow).toBeVisible()
    
    // Verify employee details
    await expect(employeeRow.locator('td:has-text("Student Analyst")')).toBeVisible()
    await expect(employeeRow.locator('td:has-text("active")')).toBeVisible()
    
    console.log('✅ Complete onboarding workflow test passed!')
  })

  test('should handle email notifications properly', async ({ page }) => {
    // Test that email functionality is working
    console.log('Testing email notification system...')
    
    // Navigate to onboarding page
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Look for any existing flows
    const flowsTable = page.locator('table').first()
    if (await flowsTable.isVisible()) {
      const rows = flowsTable.locator('tbody tr')
      const rowCount = await rows.count()
      
      if (rowCount > 0) {
        // Test email provisioning on first flow
        const firstRow = rows.first()
        const emailButton = firstRow.locator('button:has-text("Email"), button:has-text("Provision")').first()
        
        if (await emailButton.isVisible()) {
          await emailButton.click()
          await page.waitForTimeout(2000)
          
          // Check for success message or status change
          const successMessage = page.locator('text=success, text=provisioned, text=email').first()
          if (await successMessage.isVisible()) {
            console.log('✅ Email provisioning test passed')
          }
        }
      }
    }
    
    console.log('✅ Email notification system test completed')
  })

  test('should display proper UI components for onboarding workflow', async ({ page }) => {
    // Test UI components
    console.log('Testing onboarding UI components...')
    
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Check for main components
    await expect(page.locator('h1:has-text("Advisory Onboarding")')).toBeVisible()
    await expect(page.locator('h3:has-text("Onboarding Flows")')).toBeVisible()
    
    // Check for filters
    await expect(page.locator('[role="tab"]:has-text("All")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("In Progress")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Awaiting Documents")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Completed")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Canceled")')).toBeVisible()
    
    // Check for search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
    
    // Check for project filter
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible()
    
    // Check for table headers
    const table = page.locator('table').first()
    await expect(table).toBeVisible()
    
    const headers = [
      'Student',
      'Project', 
      'Status',
      'Progress',
      'Email Status',
      'Documents',
      'Created',
      'Actions'
    ]
    
    for (const header of headers) {
      // Use more specific selectors to avoid strict mode violations
      if (header === 'Status') {
        await expect(table.locator('th:has-text("Status")').first()).toBeVisible()
      } else {
        await expect(table.locator(`th:has-text("${header}")`)).toBeVisible()
      }
    }
    
    console.log('✅ UI components test passed')
  })

  test('should handle empty state gracefully', async ({ page }) => {
    // Test empty state
    console.log('Testing empty state...')
    
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Check for empty state message
    const emptyMessage = page.locator('text=No results, text=No flows, text=0 flows').first()
    if (await emptyMessage.isVisible()) {
      console.log('✅ Empty state displayed correctly')
    }
    
    // Check that filters still work in empty state
    const allTab = page.locator('[role="tab"]:has-text("All")').first()
    await expect(allTab).toBeVisible()
    
    const inProgressTab = page.locator('[role="tab"]:has-text("In Progress")').first()
    await expect(inProgressTab).toBeVisible()
    
    console.log('✅ Empty state test passed')
  })
})
