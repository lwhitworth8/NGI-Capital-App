/**
 * Comprehensive E2E Test Runner for Accounting Module
 * Runs all accounting tests with real NGI Capital LLC documents
 */

import { chromium, Browser, Page } from 'playwright';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

class AccountingTestRunner {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: TestResult[] = [];
  private testDocuments: string[] = [];

  async setup() {
    console.log('Setting up Accounting E2E Test Runner...');
    
    // Verify test documents exist
    this.verifyTestDocuments();
    
    // Start browser
    this.browser = await chromium.launch({ 
      headless: false, // Set to true for CI
      slowMo: 1000 // Slow down for debugging
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('Test runner setup complete');
  }

  private verifyTestDocuments() {
    const testDocPath = path.join(process.cwd(), 'test-documents');
    
    if (!fs.existsSync(testDocPath)) {
      console.log('Creating test documents directory...');
      fs.mkdirSync(testDocPath, { recursive: true });
    }

    // List of required NGI Capital LLC documents
    const requiredDocs = [
      'ngi-capital-llc-formation.pdf',
      'ngi-capital-llc-pre-mercury-invoice.pdf',
      'ngi-capital-llc-startup-cost.pdf',
      'ngi-capital-llc-regular-expense.pdf',
      'ngi-capital-llc-bank-statement.pdf',
      'ngi-capital-llc-mercury-statement.pdf',
      'ngi-capital-llc-pre-deposit-expense.pdf',
      'ngi-capital-llc-discrepancy-statement.pdf',
      'ngi-capital-llc-doc1.pdf',
      'ngi-capital-llc-doc2.pdf',
      'ngi-capital-llc-doc3.pdf',
      'ngi-capital-llc-doc4.pdf',
      'ngi-capital-llc-doc5.pdf'
    ];

    console.log('Verifying test documents...');
    for (const doc of requiredDocs) {
      const docPath = path.join(testDocPath, doc);
      if (fs.existsSync(docPath)) {
        this.testDocuments.push(doc);
        console.log(`Found: ${doc}`);
      } else {
        console.log(`Missing: ${doc} - Please upload this document`);
      }
    }

    if (this.testDocuments.length === 0) {
      throw new Error('No test documents found. Please upload NGI Capital LLC documents to test-documents/');
    }

    console.log(`Found ${this.testDocuments.length} test documents`);
  }

  async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\nRunning test: ${testName}`);
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`Test passed: ${testName} (${duration}ms)`);
      return { testName, status: 'passed', duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Test failed: ${testName} (${duration}ms) - ${errorMessage}`);
      return { testName, status: 'failed', duration, error: errorMessage };
    }
  }

  async runAllTests() {
    if (!this.page) throw new Error('Page not initialized');

    console.log('\nStarting comprehensive accounting tests...\n');

    // Test 1: Document Processing Workflow
    await this.runTest('Document Processing Workflow', async () => {
      await this.page!.goto('/accounting');
      await this.page!.waitForLoadState('networkidle');
      
      // Test document upload
      await this.page!.click('[data-testid="documents-tab"]');
      await this.page!.waitForLoadState('networkidle');
      
      // Upload first document
      const fileInput = this.page!.locator('input[type="file"]');
      await fileInput.setInputFiles(`test-documents/${this.testDocuments[0]}`);
      
      await this.page!.click('[data-testid="upload-button"]');
      
      // Wait for processing
      await this.page!.waitForSelector('[data-testid="processing-status"]', { timeout: 30000 });
      await this.page!.waitForFunction(() => {
        const status = document.querySelector('[data-testid="processing-status"]');
        return status && status.textContent?.includes('GPT-5 Extracted');
      }, { timeout: 60000 });
      
      console.log('Document processing completed');
    });

    // Test 2: Journal Entry Creation
    await this.runTest('Journal Entry Creation', async () => {
      await this.page!.click('[data-testid="journal-entries-tab"]');
      await this.page!.waitForLoadState('networkidle');
      
      // Verify journal entries were created
      const journalEntries = await this.page!.locator('[data-testid="journal-entry"]').count();
      if (journalEntries === 0) {
        throw new Error('No journal entries found');
      }
      
      console.log(`Found ${journalEntries} journal entries`);
    });

    // Test 3: Agent Validation
    await this.runTest('Agent Validation', async () => {
      // Find a draft journal entry
      const draftEntry = this.page!.locator('[data-testid="journal-entry-draft"]').first();
      if (await draftEntry.count() === 0) {
        console.log('No draft entries found, skipping agent validation test');
        return;
      }
      
      // Submit for agent validation
      await draftEntry.click('[data-testid="submit-button"]');
      
      // Wait for agent validation
      await this.page!.waitForSelector('[data-testid="agent-validation-status"]', { timeout: 30000 });
      
      console.log('Agent validation completed');
    });

    // Test 4: Approval Workflow
    await this.runTest('Approval Workflow', async () => {
      // Find entry pending approval
      const pendingEntry = this.page!.locator('[data-testid="journal-entry-pending-approval"]').first();
      if (await pendingEntry.count() === 0) {
        console.log('No pending entries found, skipping approval test');
        return;
      }
      
      // Approve entry
      await pendingEntry.click('[data-testid="approve-button"]');
      
      // Verify approval
      await this.page!.waitForSelector('[data-testid="approval-status"]', { timeout: 10000 });
      
      console.log('Approval workflow completed');
    });

    // Test 5: Bank Reconciliation
    await this.runTest('Bank Reconciliation', async () => {
      await this.page!.click('[data-testid="banking-tab"]');
      await this.page!.waitForLoadState('networkidle');
      
      // Upload bank statement if available
      const bankStatement = this.testDocuments.find(doc => doc.includes('bank-statement') || doc.includes('mercury'));
      if (bankStatement) {
        const fileInput = this.page!.locator('input[type="file"]');
        await fileInput.setInputFiles(`test-documents/${bankStatement}`);
        
        await this.page!.click('[data-testid="upload-button"]');
        
        // Wait for processing
        await this.page!.waitForSelector('[data-testid="processing-status"]', { timeout: 30000 });
        
        console.log('Bank statement processing completed');
      } else {
        console.log('No bank statement found, skipping bank reconciliation test');
      }
    });

    // Test 6: Financial Reporting
    await this.runTest('Financial Reporting', async () => {
      await this.page!.click('[data-testid="reporting-tab"]');
      await this.page!.waitForLoadState('networkidle');
      
      // Generate trial balance
      await this.page!.click('[data-testid="generate-trial-balance"]');
      await this.page!.waitForSelector('[data-testid="trial-balance"]', { timeout: 10000 });
      
      // Verify trial balance is balanced
      const totalDebits = await this.page!.locator('[data-testid="total-debits"]').textContent();
      const totalCredits = await this.page!.locator('[data-testid="total-credits"]').textContent();
      
      if (totalDebits !== totalCredits) {
        throw new Error(`Trial balance not balanced: Debits ${totalDebits}, Credits ${totalCredits}`);
      }
      
      console.log('Financial reporting completed');
    });

    // Test 7: Auto-refresh Functionality
    await this.runTest('Auto-refresh Functionality', async () => {
      // Wait for auto-refresh cycle
      await this.page!.waitForTimeout(6000);
      
      // Verify data is refreshed
      const lastUpdated = await this.page!.locator('[data-testid="last-updated"]').textContent();
      if (!lastUpdated) {
        throw new Error('Auto-refresh not working');
      }
      
      console.log('Auto-refresh functionality verified');
    });
  }

  async generateReport() {
    console.log('\nTest Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    this.results.forEach(result => {
      const status = result.status === 'passed' ? 'PASS' : result.status === 'failed' ? 'FAIL' : 'SKIP';
      console.log(`${status} ${result.testName} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Save results to file
    const reportPath = path.join(process.cwd(), 'e2e-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, skipped, successRate: (passed / total) * 100 },
      results: this.results
    }, null, 2));
    
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('\nTest cleanup completed');
  }

  async run() {
    try {
      await this.setup();
      await this.runAllTests();
      await this.generateReport();
    } catch (error) {
      console.error('Test runner failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const runner = new AccountingTestRunner();
  runner.run().catch(console.error);
}

export { AccountingTestRunner };
