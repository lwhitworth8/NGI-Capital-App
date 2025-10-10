/**
 * E2E Tests for Accounting Agent Validation
 * Tests OpenAI Agent Builder integration for US GAAP compliance
 */

import { test, expect } from '@playwright/test';

test.describe('Accounting Agent Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting');
    await page.waitForLoadState('networkidle');
  });

  test('Agent validates journal entry for GAAP compliance', async ({ page }) => {
    await test.step('Create journal entry and validate with agent', async () => {
      // Navigate to journal entries
      await page.click('[data-testid="journal-entries-tab"]');
      await page.waitForLoadState('networkidle');

      // Create new journal entry
      await page.click('[data-testid="new-entry-button"]');
      
      // Fill in entry details
      await page.fill('[data-testid="entry-memo"]', 'Test expense for agent validation');
      await page.fill('[data-testid="entry-reference"]', 'TEST-001');
      
      // Add debit line
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-0"]', '60100'); // General and Administrative
      await page.fill('[data-testid="debit-amount-0"]', '1000');
      await page.fill('[data-testid="description-0"]', 'Test expense');
      
      // Add credit line
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-1"]', '10110'); // Cash - Operating Account
      await page.fill('[data-testid="credit-amount-1"]', '1000');
      await page.fill('[data-testid="description-1"]', 'Cash payment');
      
      // Submit for agent validation
      await page.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify agent validation results
      await expect(page.locator('[data-testid="gaap-compliance-score"]')).toContainText('95%');
      await expect(page.locator('[data-testid="agent-validation-notes"]')).toContainText('ASC 720 compliance verified');
      await expect(page.locator('[data-testid="asc-references"]')).toContainText('ASC 720');
    });
  });

  test('Agent catches GAAP errors and suggests corrections', async ({ page }) => {
    await test.step('Test agent error detection', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Create journal entry with GAAP error
      await page.click('[data-testid="new-entry-button"]');
      
      // Fill in entry with incorrect account classification
      await page.fill('[data-testid="entry-memo"]', 'Software expense incorrectly classified');
      
      // Add debit line with wrong account
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-0"]', '18200'); // Startup Costs (wrong for software)
      await page.fill('[data-testid="debit-amount-0"]', '500');
      await page.fill('[data-testid="description-0"]', 'Software subscription');
      
      // Add credit line
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-1"]', '10110'); // Cash
      await page.fill('[data-testid="credit-amount-1"]', '500');
      
      // Submit for agent validation
      await page.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify agent caught the error
      await expect(page.locator('[data-testid="gaap-compliance-score"]')).toContainText('60%');
      await expect(page.locator('[data-testid="agent-validation-notes"]')).toContainText('Incorrect account classification');
      await expect(page.locator('[data-testid="corrections-suggested"]')).toContainText('60210'); // Software Subscriptions
    });
  });

  test('Agent validates startup cost ASC 720 compliance', async ({ page }) => {
    await test.step('Test startup cost validation', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Create startup cost entry
      await page.click('[data-testid="new-entry-button"]');
      
      // Fill in startup cost entry
      await page.fill('[data-testid="entry-memo"]', 'Legal fees for entity formation');
      
      // Add debit line for startup costs
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-0"]', '18200'); // Startup Costs - Deferred
      await page.fill('[data-testid="debit-amount-0"]', '3000');
      await page.fill('[data-testid="description-0"]', 'Legal formation fees');
      
      // Add credit line
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-1"]', '10110'); // Cash
      await page.fill('[data-testid="credit-amount-1"]', '3000');
      
      // Submit for agent validation
      await page.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify ASC 720 compliance
      await expect(page.locator('[data-testid="gaap-compliance-score"]')).toContainText('98%');
      await expect(page.locator('[data-testid="asc-references"]')).toContainText('ASC 720');
      await expect(page.locator('[data-testid="agent-validation-notes"]')).toContainText('Startup costs properly classified per ASC 720');
    });
  });

  test('Agent validates contributed capital classification', async ({ page }) => {
    await test.step('Test contributed capital validation', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Create contributed capital entry
      await page.click('[data-testid="new-entry-button"]');
      
      // Fill in contributed capital entry
      await page.fill('[data-testid="entry-memo"]', 'Member capital contribution');
      
      // Add debit line for cash
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-0"]', '10110'); // Cash
      await page.fill('[data-testid="debit-amount-0"]', '10000');
      await page.fill('[data-testid="description-0"]', 'Member contribution');
      
      // Add credit lines for member capital (50/50 split)
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-1"]', '30510'); // Andre
      await page.fill('[data-testid="credit-amount-1"]', '5000');
      await page.fill('[data-testid="description-1"]', 'Andre Nurmamade capital');
      
      await page.click('[data-testid="add-line-button"]');
      await page.selectOption('[data-testid="account-select-2"]', '30520'); // Landon
      await page.fill('[data-testid="credit-amount-2"]', '5000');
      await page.fill('[data-testid="description-2"]', 'Landon Whitworth capital');
      
      // Submit for agent validation
      await page.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify contributed capital compliance
      await expect(page.locator('[data-testid="gaap-compliance-score"]')).toContainText('100%');
      await expect(page.locator('[data-testid="agent-validation-notes"]')).toContainText('Contributed capital properly classified');
      await expect(page.locator('[data-testid="asc-references"]')).toContainText('ASC 305');
    });
  });

  test('Agent web search for current GAAP standards', async ({ page }) => {
    await test.step('Test agent web search functionality', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Create entry that requires current GAAP research
      await page.click('[data-testid="new-entry-button"]');
      
      // Fill in entry requiring research
      await page.fill('[data-testid="entry-memo"]', 'Cryptocurrency transaction requiring current GAAP guidance');
      
      // Submit for agent validation
      await page.click('[data-testid="submit-button"]');
      
      // Wait for agent validation with web search
      await expect(page.locator('[data-testid="agent-validation-status"]')).toContainText('Agent Review');
      
      // Verify agent used web search
      await expect(page.locator('[data-testid="agent-validation-notes"]')).toContainText('Current GAAP guidance researched');
      await expect(page.locator('[data-testid="asc-references"]')).toContainText('ASC 350');
    });
  });

  test('Agent batch validation', async ({ page }) => {
    await test.step('Test batch validation of multiple entries', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Select multiple draft entries
      await page.check('[data-testid="select-entry-1"]');
      await page.check('[data-testid="select-entry-2"]');
      await page.check('[data-testid="select-entry-3"]');
      
      // Submit batch for agent validation
      await page.click('[data-testid="batch-validate-button"]');
      
      // Wait for batch validation
      await expect(page.locator('[data-testid="batch-validation-status"]')).toContainText('Validating 3 entries');
      
      // Verify all entries validated
      await expect(page.locator('[data-testid="validation-complete"]')).toContainText('3 entries validated');
    });
  });

  test('Agent validation history and audit trail', async ({ page }) => {
    await test.step('Test validation history tracking', async () => {
      await page.click('[data-testid="journal-entries-tab"]');
      
      // Find an entry with validation history
      const entryWithHistory = page.locator('[data-testid="journal-entry-with-history"]').first();
      await entryWithHistory.click('[data-testid="view-validation-history"]');
      
      // Verify validation history
      await expect(page.locator('[data-testid="validation-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-timeline"]')).toContainText('Agent validation completed');
      await expect(page.locator('[data-testid="validation-timeline"]')).toContainText('GAAP compliance verified');
    });
  });
});




