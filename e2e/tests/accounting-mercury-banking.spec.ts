/**
 * E2E Tests for Mercury Banking Integration
 * Tests bank reconciliation and transaction processing
 */

import { test, expect } from '@playwright/test';

test.describe('Mercury Banking Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting');
    await page.waitForLoadState('networkidle');
  });

  test('Mercury bank statement processing and reconciliation', async ({ page }) => {
    await test.step('Process Mercury bank statement', async () => {
      // Navigate to banking tab
      await page.click('[data-testid="banking-tab"]');
      await page.waitForLoadState('networkidle');

      // Upload Mercury bank statement
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-mercury-statement.pdf');
      
      // Submit upload
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify bank statement data extraction
      await expect(page.locator('[data-testid="bank-account-number"]')).toContainText('1234567890');
      await expect(page.locator('[data-testid="statement-period"]')).toContainText('2025-10-01 to 2025-10-31');
      await expect(page.locator('[data-testid="ending-balance"]')).toContainText('$25,000.00');
    });

    await test.step('Verify transaction extraction', async () => {
      // Check individual transactions
      await expect(page.locator('[data-testid="transaction-1"]')).toContainText('Initial Member Capital Contribution');
      await expect(page.locator('[data-testid="transaction-1-amount"]')).toContainText('$10,000.00');
      await expect(page.locator('[data-testid="transaction-1-type"]')).toContainText('Deposit');

      await expect(page.locator('[data-testid="transaction-2"]')).toContainText('Software Subscription - OpenAI');
      await expect(page.locator('[data-testid="transaction-2-amount"]')).toContainText('-$200.00');
      await expect(page.locator('[data-testid="transaction-2-type"]')).toContainText('Withdrawal');
    });

    await test.step('Test bank reconciliation', async () => {
      // Start reconciliation process
      await page.click('[data-testid="start-reconciliation"]');
      
      // Verify reconciliation matches
      await expect(page.locator('[data-testid="reconciliation-status"]')).toContainText('Reconciled');
      await expect(page.locator('[data-testid="reconciliation-difference"]')).toContainText('$0.00');
      
      // Verify journal entries created
      await expect(page.locator('[data-testid="reconciliation-entries"]')).toContainText('2 journal entries created');
    });
  });

  test('First deposit date detection and contributed capital classification', async ({ page }) => {
    await test.step('Verify first deposit date detection', async () => {
      await page.click('[data-testid="banking-tab"]');
      
      // Check first deposit date
      await expect(page.locator('[data-testid="first-deposit-date"]')).toContainText('2025-08-15');
      await expect(page.locator('[data-testid="first-deposit-amount"]')).toContainText('$10,000.00');
    });

    await test.step('Test pre-deposit expense classification', async () => {
      // Navigate to documents tab
      await page.click('[data-testid="documents-tab"]');
      
      // Upload pre-deposit expense
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-pre-deposit-expense.pdf');
      
      await page.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await expect(page.locator('[data-testid="processing-status"]')).toContainText('GPT-5 Extracted');
      
      // Verify contributed capital classification
      await expect(page.locator('[data-testid="account-classification"]')).toContainText('Member Capital');
      await expect(page.locator('[data-testid="classification-reason"]')).toContainText('Pre-Mercury deposit');
    });
  });

  test('Bank transaction categorization', async ({ page }) => {
    await test.step('Test automatic transaction categorization', async () => {
      await page.click('[data-testid="banking-tab"]');
      
      // View transaction details
      await page.click('[data-testid="transaction-1"]');
      
      // Verify automatic categorization
      await expect(page.locator('[data-testid="transaction-category"]')).toContainText('Capital Contribution');
      await expect(page.locator('[data-testid="suggested-accounts"]')).toContainText('30510, 30520');
      
      // Test manual categorization override
      await page.selectOption('[data-testid="category-override"]', 'Other Income');
      await page.click('[data-testid="save-categorization"]');
      
      // Verify override saved
      await expect(page.locator('[data-testid="transaction-category"]')).toContainText('Other Income');
    });
  });

  test('Bank reconciliation workflow', async ({ page }) => {
    await test.step('Complete reconciliation workflow', async () => {
      await page.click('[data-testid="banking-tab"]');
      
      // Start reconciliation
      await page.click('[data-testid="start-reconciliation"]');
      
      // Match transactions
      await page.click('[data-testid="match-transaction-1"]');
      await page.click('[data-testid="match-transaction-2"]');
      
      // Complete reconciliation
      await page.click('[data-testid="complete-reconciliation"]');
      
      // Verify reconciliation complete
      await expect(page.locator('[data-testid="reconciliation-status"]')).toContainText('Reconciled');
      await expect(page.locator('[data-testid="reconciliation-date"]')).toContainText('2025-10-31');
    });
  });

  test('Bank error handling and exceptions', async ({ page }) => {
    await test.step('Handle bank statement errors', async () => {
      await page.click('[data-testid="banking-tab"]');
      
      // Upload corrupted bank statement
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/corrupted-bank-statement.pdf');
      
      await page.click('[data-testid="upload-button"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to process bank statement');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    await test.step('Handle reconciliation discrepancies', async () => {
      // Upload statement with discrepancy
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-documents/ngi-capital-llc-discrepancy-statement.pdf');
      
      await page.click('[data-testid="upload-button"]');
      
      // Start reconciliation
      await page.click('[data-testid="start-reconciliation"]');
      
      // Verify discrepancy detection
      await expect(page.locator('[data-testid="reconciliation-status"]')).toContainText('Discrepancy Found');
      await expect(page.locator('[data-testid="discrepancy-amount"]')).toContainText('$50.00');
      
      // Resolve discrepancy
      await page.click('[data-testid="resolve-discrepancy"]');
      await page.fill('[data-testid="discrepancy-note"]', 'Bank fee not recorded in system');
      await page.click('[data-testid="save-resolution"]');
      
      // Verify resolution
      await expect(page.locator('[data-testid="reconciliation-status"]')).toContainText('Reconciled');
    });
  });

  test('Bank reporting and analytics', async ({ page }) => {
    await test.step('Generate bank reports', async () => {
      await page.click('[data-testid="banking-tab"]');
      
      // Generate cash flow report
      await page.click('[data-testid="generate-cash-flow"]');
      await expect(page.locator('[data-testid="cash-flow-report"]')).toBeVisible();
      
      // Verify cash flow data
      await expect(page.locator('[data-testid="cash-inflow"]')).toContainText('$10,000.00');
      await expect(page.locator('[data-testid="cash-outflow"]')).toContainText('$200.00');
      await expect(page.locator('[data-testid="net-cash-flow"]')).toContainText('$9,800.00');
      
      // Generate bank reconciliation report
      await page.click('[data-testid="generate-reconciliation-report"]');
      await expect(page.locator('[data-testid="reconciliation-report"]')).toBeVisible();
    });
  });
});




