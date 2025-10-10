/**
 * E2E Tests for Complete Accounting Workflow
 * Tests the full document-to-posted workflow using real NGI Capital LLC documents
 */

import { test, expect } from '@playwright/test';
import { authenticateWithClerk, ADMIN_USER } from './helpers/clerk-auth';

test.describe('Accounting Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to accounting module
    await page.goto('/admin/accounting');
    
    // Check if we're on the sign-in page and handle authentication
    const pageTitle = await page.title();
    if (pageTitle.includes('Sign in') || pageTitle.includes('Authentication')) {
      console.log('Authentication required, signing in...');
      
      // Look for email input field
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('lwhitworth@ngicapitaladvisory.com');
        console.log('Email entered');
      }
      
      // Look for sign-in button
      const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Continue"), input[type="submit"]').first();
      if (await signInButton.isVisible()) {
        await signInButton.click();
        console.log('Sign-in button clicked');
      }
      
      // Wait for navigation after sign-in
      await page.waitForTimeout(3000);
      
      // Check if we need to handle any additional auth steps
      const currentUrl = page.url();
      console.log(`Current URL after sign-in: ${currentUrl}`);
      
      // If still on auth page, try to navigate to accounting
      if (currentUrl.includes('sign-in') || currentUrl.includes('auth')) {
        await page.goto('/admin/accounting');
        await page.waitForTimeout(2000);
      }
    }
    
    // Wait for page to load
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (error) {
      console.log('Network idle timeout, continuing with test...');
    }
  });

  test('Complete document processing workflow with real NGI Capital documents', async ({ page }) => {
    // Test 1: Formation Document Processing
    await test.step('Process formation document', async () => {
      // Navigate to documents tab
      await page.click('[data-testid="documents-tab"]');
      await page.waitForLoadState('networkidle');

      // Upload formation document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-formation.pdf');
      
      // Select formation category
      await page.selectOption('[data-testid="category-select"]', 'formation');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify journal entry creation
      await expect(page.locator('[data-testid="journal-entries"]')).toContainText('JE-001-000001');
      
      // Verify contributed capital classification
      await expect(page.locator('[data-testid="account-30510"]')).toContainText('Member Capital - Andre Nurmamade');
      await expect(page.locator('[data-testid="account-30520"]')).toContainText('Member Capital - Landon Whitworth');
    });

    // Test 2: Pre-Mercury Invoice Processing
    await test.step('Process pre-Mercury invoice as contributed capital', async () => {
      // Upload invoice with date before Mercury deposit
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-pre-mercury-invoice.pdf');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify contributed capital classification
      await expect(page.locator('[data-testid="account-30510"]')).toContainText('Member Capital - Andre Nurmamade');
      await expect(page.locator('[data-testid="account-30520"]')).toContainText('Member Capital - Landon Whitworth');
    });

    // Test 3: Post-Mercury Startup Cost Processing
    await test.step('Process post-Mercury startup cost', async () => {
      // Upload startup cost document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-startup-cost.pdf');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify startup cost classification (first $5k)
      await expect(page.locator('[data-testid="account-18200"]')).toContainText('Startup Costs - Deferred');
    });

    // Test 4: Post-$5k Regular Expense Processing
    await test.step('Process regular expense after $5k threshold', async () => {
      // Upload regular expense document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-regular-expense.pdf');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify regular expense classification
      await expect(page.locator('[data-testid="account-60100"]')).toContainText('General and Administrative');
    });

    // Test 5: Agent Validation Workflow
    await test.step('Test agent validation workflow', async () => {
      // Navigate to journal entries
      await page.click('[data-testid="journal-entries-tab"]');
      await page.waitForLoadState('networkidle');

      // Find a draft journal entry
      const draftEntry = page.locator('[data-testid="journal-entry-draft"]').first();
      await expect(draftEntry).toBeVisible();

      // Submit for agent review
      await draftEntry.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify agent validation results
      await expect(page.locator('[data-testid="gaap-compliance-score"]')).toContainText('95%');
      await expect(page.locator('[data-testid="agent-notes"]')).toContainText('ASC 720 compliance verified');
    });

    // Test 6: Dual Approval Workflow
    await test.step('Test dual approval workflow', async () => {
      // Find entry pending first approval
      const pendingEntry = page.locator('[data-testid="journal-entry-pending-first-approval"]').first();
      await expect(pendingEntry).toBeVisible();

      // First approval
      await pendingEntry.click('[data-testid="approve-button"]');
      await expect(page.locator('[data-testid="approval-status"]')).toContainText('Pending Final Approval');

      // Second approval
      await pendingEntry.click('[data-testid="approve-button"]');
      await expect(page.locator('[data-testid="approval-status"]')).toContainText('Approved');

      // Post to general ledger
      await pendingEntry.click('[data-testid="post-button"]');
      await expect(page.locator('[data-testid="approval-status"]')).toContainText('Posted');
    });

    // Test 7: Bank Reconciliation
    await test.step('Test Mercury bank reconciliation', async () => {
      // Navigate to banking tab
      await page.click('[data-testid="banking-tab"]');
      await page.waitForLoadState('networkidle');

      // Upload bank statement
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-bank-statement.pdf');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify reconciliation
      await expect(page.locator('[data-testid="reconciliation-status"]')).toContainText('Reconciled');
    });

    // Test 8: Financial Reporting
    await test.step('Test financial reporting', async () => {
      // Navigate to reporting tab
      await page.click('[data-testid="reporting-tab"]');
      await page.waitForLoadState('networkidle');

      // Generate trial balance
      await page.click('[data-testid="generate-trial-balance"]');
      await expect(page.locator('[data-testid="trial-balance"]')).toBeVisible();

      // Verify trial balance is balanced
      const totalDebits = await page.locator('[data-testid="total-debits"]').textContent();
      const totalCredits = await page.locator('[data-testid="total-credits"]').textContent();
      expect(totalDebits).toBe(totalCredits);

      // Generate P&L
      await page.click('[data-testid="generate-pl"]');
      await expect(page.locator('[data-testid="profit-loss"]')).toBeVisible();

      // Generate Balance Sheet
      await page.click('[data-testid="generate-balance-sheet"]');
      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
    });
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test invalid document upload
    await test.step('Handle invalid document upload', async () => {
      await page.click('[data-testid="documents-tab"]');
      
      // Upload invalid file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/invalid-file.txt');
      
      await page.click('[data-testid="upload-button"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid file type');
    });

    // Test self-approval prevention
    await test.step('Prevent self-approval', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Try to approve own entry
      const ownEntry = page.locator('[data-testid="journal-entry-own"]').first();
      await ownEntry.click('[data-testid="approve-button"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Cannot approve own entry');
    });

    // Test unbalanced journal entry
    await test.step('Handle unbalanced journal entry', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Create unbalanced entry
      await page.click('[data-testid="new-entry-button"]');
      await page.fill('[data-testid="debit-amount"]', '1000');
      await page.fill('[data-testid="credit-amount"]', '500');
      
      // Try to submit
      await page.click('[data-testid="submit-button"]');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Journal entry is not balanced');
    });
  });

  test('Performance and scalability', async ({ page }) => {
    // Test batch upload performance
    await test.step('Test batch upload performance', async () => {
      await page.click('[data-testid="documents-tab"]');
      
      const startTime = Date.now();
      
      // Upload multiple documents
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        'test-documents/ngi-capital-llc-doc1.pdf',
        'test-documents/ngi-capital-llc-doc2.pdf',
        'test-documents/ngi-capital-llc-doc3.pdf',
        'test-documents/ngi-capital-llc-doc4.pdf',
        'test-documents/ngi-capital-llc-doc5.pdf'
      ]);
      
      await page.click('[data-testid="upload-button"]');
      
      // Wait for all processing to complete
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Verify processing completed within reasonable time (5 minutes)
      expect(processingTime).toBeLessThan(300000);
    });

    // Test auto-refresh functionality
    await test.step('Test auto-refresh functionality', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Wait for auto-refresh
      await page.waitForTimeout(6000);
      
      // Verify data is refreshed
      await expect(page.locator('[data-testid="last-updated"]')).toContainText('Updated');
    });
  });
});
