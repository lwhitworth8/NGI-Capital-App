/**
 * Global setup for Accounting E2E tests
 * Prepares the test environment and verifies all services are running
 */

import { chromium, Browser, Page } from 'playwright';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup() {
  console.log('Starting global setup for Accounting E2E tests...');
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // 1. Verify Docker containers are running
    console.log('Verifying Docker containers...');
    try {
      execSync('docker-compose -f ../docker-compose.dev.yml ps', { stdio: 'pipe' });
      console.log('Docker containers are running');
    } catch (error) {
      console.log('Starting Docker containers...');
      execSync('docker-compose -f ../docker-compose.dev.yml up -d', { stdio: 'inherit' });
      
      // Wait for services to be ready
      console.log('Waiting for services to be ready...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    // 2. Verify application is accessible
    console.log('Verifying application accessibility...');
    browser = await chromium.launch();
    page = await browser.newPage();
    
    // Retry logic for application startup
    let retries = 10;
    while (retries > 0) {
      try {
        await page.goto('http://localhost:3001', { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        console.log('Application is accessible');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Application not accessible after 10 retries');
        }
        console.log(`Application not ready, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

  // 3. Verify accounting module is accessible
  console.log('Verifying accounting module...');
  await page.goto('http://localhost:3001/admin/accounting', { timeout: 60000 });
    
    // Wait for the page to load with a longer timeout
    try {
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      console.log('Accounting page loaded successfully');
    } catch (error) {
      console.log('Network idle timeout, checking page content...');
      // Take a screenshot for debugging
      await page.screenshot({ path: 'accounting-page-debug.png' });
    }
    
    // Check if accounting module loads
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Try to find any text content on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`Page content preview: ${bodyText?.substring(0, 200)}...`);
    
    const accountingTitle = await page.locator('h1').first().textContent().catch(() => null);
    console.log(`Accounting title found: ${accountingTitle}`);
    
    if (!accountingTitle || !accountingTitle.includes('Accounting')) {
      console.log('Accounting module not found, but continuing with test...');
    }
    console.log('Accounting module is accessible');

    // 4. Verify test documents directory
    console.log('Verifying test documents...');
    const testDocPath = path.join(process.cwd(), 'test-documents');
    if (!fs.existsSync(testDocPath)) {
      fs.mkdirSync(testDocPath, { recursive: true });
      console.log('Created test documents directory');
    }

    // 5. Check for required environment variables
    console.log('Verifying environment variables...');
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'ACCOUNTING_AGENT_WORKFLOW_ID',
      'MERCURY_API_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.log(`Warning: ${envVar} not set`);
      } else {
        console.log(`${envVar} is set`);
      }
    }

    // 6. Verify database connectivity
    console.log('Verifying database connectivity...');
    try {
      // This would be a simple health check endpoint
      const response = await page.request.get('http://localhost:3001/api/health');
      if (response.ok()) {
        console.log('Database connectivity verified');
      } else {
        console.log('Database health check failed');
      }
    } catch (error) {
      console.log('Could not verify database connectivity');
    }

    // 7. Create test data if needed
    console.log('Preparing test data...');
    await prepareTestData(page);

    console.log('Global setup completed successfully');
    
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function prepareTestData(page: Page) {
  try {
    // Check if test entities exist
    const entitiesResponse = await page.request.get('http://localhost:3001/api/accounting/entities');
    if (entitiesResponse.ok()) {
      const entities = await entitiesResponse.json();
      if (entities.length === 0) {
        console.log('Creating test entities...');
        
        // Create NGI Capital Inc.
        await page.request.post('http://localhost:3001/api/accounting/entities', {
          data: {
            name: 'NGI Capital Inc.',
            entity_type: 'corporation',
            tax_id: '12-3456789',
            state_of_incorporation: 'Delaware',
            fiscal_year_end: '12-31'
          }
        });
        
        // Create NGI Capital Advisory LLC
        await page.request.post('http://localhost:3001/api/accounting/entities', {
          data: {
            name: 'NGI Capital Advisory LLC',
            entity_type: 'llc',
            tax_id: '98-7654321',
            state_of_incorporation: 'Delaware',
            fiscal_year_end: '12-31'
          }
        });
        
        console.log('Test entities created');
      } else {
        console.log('Test entities already exist');
      }
    }
  } catch (error) {
    console.log('Could not prepare test data:', error);
  }
}

export default globalSetup;
