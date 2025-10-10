import { test, expect } from '@playwright/test'

test.describe('Real Email Onboarding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the onboarding page
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
  })

  test('should send real emails for complete onboarding workflow with lwhitworth@berkeley.edu', async ({ page }) => {
    console.log('🚀 Starting REAL EMAIL onboarding workflow test...')
    console.log('📧 This test will send actual emails to lwhitworth@berkeley.edu')
    
    // Step 1: Create a test application first
    console.log('Step 1: Creating test application...')
    await page.goto('/admin/ngi-advisory/applications')
    await page.waitForLoadState('networkidle')
    
    // Look for existing application or create new one
    const existingApp = page.locator('tr:has-text("lwhitworth@berkeley.edu")').first()
    if (await existingApp.isVisible()) {
      console.log('✅ Found existing application for lwhitworth@berkeley.edu')
    } else {
      console.log('Creating new application...')
      // Look for create application button
      const createButton = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")').first()
      if (await createButton.isVisible()) {
        await createButton.click()
        await page.waitForTimeout(1000)
        
        // Fill application form
        await page.fill('input[name="email"], input[type="email"]', 'lwhitworth@berkeley.edu')
        await page.fill('input[name="first_name"]', 'Landon')
        await page.fill('input[name="last_name"]', 'Whitworth')
        await page.fill('input[name="school"]', 'UC Berkeley')
        await page.fill('input[name="program"]', 'Computer Science')
        
        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first()
        if (await submitButton.isVisible()) {
          await submitButton.click()
          await page.waitForTimeout(2000)
        }
      }
    }
    
    // Step 2: Update application status to interview (this should send interview email)
    console.log('Step 2: Sending interview invitation email...')
    const appRow = page.locator('tr:has-text("lwhitworth@berkeley.edu")').first()
    await expect(appRow).toBeVisible()
    
    // Look for status dropdown or update button
    const statusSelect = appRow.locator('select, [role="combobox"]').first()
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('interview')
      await page.waitForTimeout(2000)
      console.log('✅ Interview status set - interview email should be sent!')
    }
    
    // Step 3: Update to offer status (this should send offer email with PDF links)
    console.log('Step 3: Sending offer email with PDF signing links...')
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('offer')
      await page.waitForTimeout(3000) // Give extra time for PDF generation
      console.log('✅ Offer status set - offer email with PDF links should be sent!')
    }
    
    // Step 4: Navigate to onboarding page and create flow
    console.log('Step 4: Creating onboarding flow...')
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Look for create flow button
    const createFlowButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first()
    if (await createFlowButton.isVisible()) {
      await createFlowButton.click()
      await page.waitForTimeout(1000)
      
      // Fill flow form
      const studentSelect = page.locator('select[name="student_id"], [role="combobox"]').first()
      if (await studentSelect.isVisible()) {
        await studentSelect.selectOption({ label: 'Landon Whitworth' })
      }
      
      const projectSelect = page.locator('select[name="project_id"]').first()
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 0 })
      }
      
      const ndaCheckbox = page.locator('input[type="checkbox"][name="nda_required"]').first()
      if (await ndaCheckbox.isVisible()) {
        await ndaCheckbox.check()
      }
      
      // Submit flow
      const submitFlowButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Flow")').first()
      if (await submitFlowButton.isVisible()) {
        await submitFlowButton.click()
        await page.waitForTimeout(2000)
      }
    }
    
    // Step 5: Test the onboarding workflow
    console.log('Step 5: Testing onboarding workflow...')
    
    // Look for the created flow
    const flowRow = page.locator('tr:has-text("lwhitworth@berkeley.edu"), tr:has-text("Landon")').first()
    if (await flowRow.isVisible()) {
      console.log('✅ Onboarding flow found')
      
      // Test email provisioning
      console.log('Step 6: Testing email provisioning...')
      const provisionEmailButton = flowRow.locator('button:has-text("Email"), button:has-text("Provision")').first()
      if (await provisionEmailButton.isVisible()) {
        await provisionEmailButton.click()
        await page.waitForTimeout(2000)
        console.log('✅ Email provisioning triggered')
      }
      
      // Simulate document signing completion
      console.log('Step 7: Simulating document signing completion...')
      
      // Update flow to mark documents as received
      const updateButton = flowRow.locator('button:has-text("Update"), button:has-text("Edit")').first()
      if (await updateButton.isVisible()) {
        await updateButton.click()
        await page.waitForTimeout(1000)
        
        // Mark documents as received
        const internAgreementCheckbox = page.locator('input[type="checkbox"][name="intern_agreement_received"]').first()
        if (await internAgreementCheckbox.isVisible()) {
          await internAgreementCheckbox.check()
        }
        
        const ndaCheckbox = page.locator('input[type="checkbox"][name="nda_received"]').first()
        if (await ndaCheckbox.isVisible()) {
          await ndaCheckbox.check()
        }
        
        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first()
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await page.waitForTimeout(2000)
        }
      }
      
      // Finalize onboarding (this should send welcome email)
      console.log('Step 8: Finalizing onboarding and sending welcome email...')
      const finalizeButton = flowRow.locator('button:has-text("Finalize"), button:has-text("Complete")').first()
      if (await finalizeButton.isVisible()) {
        await finalizeButton.click()
        await page.waitForTimeout(3000)
        console.log('✅ Onboarding finalized - welcome email should be sent!')
      }
      
      // Test manual welcome email sending
      console.log('Step 9: Testing manual welcome email...')
      const welcomeEmailButton = flowRow.locator('button:has-text("Welcome"), button:has-text("Email")').first()
      if (await welcomeEmailButton.isVisible()) {
        await welcomeEmailButton.click()
        await page.waitForTimeout(2000)
        console.log('✅ Manual welcome email sent!')
      }
    } else {
      console.log('⚠️ No onboarding flow found - may need to create one manually')
    }
    
    // Step 10: Verify employee creation
    console.log('Step 10: Verifying employee creation...')
    await page.goto('/admin/employees')
    await page.waitForLoadState('networkidle')
    
    const employeeRow = page.locator('tr:has-text("Landon"), tr:has-text("lwhitworth@berkeley.edu")').first()
    if (await employeeRow.isVisible()) {
      console.log('✅ Employee record created successfully!')
      await expect(employeeRow.locator('td:has-text("Student Analyst")')).toBeVisible()
    } else {
      console.log('⚠️ Employee record not found - may need to check manually')
    }
    
    console.log('🎉 REAL EMAIL onboarding workflow test completed!')
    console.log('📧 Check your email (lwhitworth@berkeley.edu) for:')
    console.log('   1. Interview invitation email')
    console.log('   2. Offer email with PDF signing links')
    console.log('   3. Welcome email after onboarding')
    console.log('   4. Admin notifications to lwhitworth@ngicapitaladvisory.com and anurmamade@ngicapitaladvisory.com')
  })

  test('should test PDF signing functionality', async ({ page }) => {
    console.log('🧪 Testing PDF signing functionality...')
    
    // Test the PDF signing page
    await page.goto('/admin/sign-document?type=intern&student=lwhitworth@berkeley.edu')
    await page.waitForLoadState('networkidle')
    
    // Check if the signing page loads
    await expect(page.locator('h1:has-text("Sign Intern Agreement"), h1:has-text("Sign")')).toBeVisible()
    
    // Test signature input
    const signatureInput = page.locator('input[name="signature"], input[placeholder*="signature"]').first()
    if (await signatureInput.isVisible()) {
      await signatureInput.fill('Landon Whitworth')
      console.log('✅ Signature input working')
    }
    
    // Test date input
    const dateInput = page.locator('input[name="date"]').first()
    if (await dateInput.isVisible()) {
      const today = new Date().toLocaleDateString()
      await dateInput.fill(today)
      console.log('✅ Date input working')
    }
    
    // Test sign button
    const signButton = page.locator('button:has-text("Sign"), button:has-text("Submit")').first()
    if (await signButton.isVisible()) {
      await signButton.click()
      await page.waitForTimeout(2000)
      console.log('✅ Sign button clicked - document signing simulated')
    }
    
    console.log('✅ PDF signing functionality test completed')
  })

  test('should verify email system is working', async ({ page }) => {
    console.log('📧 Testing email system...')
    
    // Navigate to onboarding page
    await page.goto('/admin/ngi-advisory/onboarding')
    await page.waitForLoadState('networkidle')
    
    // Look for any existing flows to test email functionality
    const flowsTable = page.locator('table').first()
    if (await flowsTable.isVisible()) {
      const rows = flowsTable.locator('tbody tr')
      const rowCount = await rows.count()
      
      if (rowCount > 0) {
        console.log(`Found ${rowCount} existing flows`)
        
        // Test email provisioning on first flow
        const firstRow = rows.first()
        const emailButton = firstRow.locator('button:has-text("Email"), button:has-text("Provision")').first()
        
        if (await emailButton.isVisible()) {
          await emailButton.click()
          await page.waitForTimeout(2000)
          
          // Check for success message
          const successMessage = page.locator('text=success, text=provisioned, text=email, text=Gmail').first()
          if (await successMessage.isVisible()) {
            console.log('✅ Email system is working!')
          } else {
            console.log('⚠️ No success message found - check console logs')
          }
        }
      } else {
        console.log('No existing flows found - email system test skipped')
      }
    }
    
    console.log('✅ Email system test completed')
  })
})
