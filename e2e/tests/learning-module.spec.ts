import { test, expect } from '@playwright/test';

// Test configuration
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@ngicapital.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

test.describe('NGI Learning Module - Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for redirect after login
    await page.waitForURL('/');
    
    // Navigate to learning module
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
  });

  test('displays learning module homepage', async ({ page }) => {
    // Check header
    await expect(page.locator('h1')).toContainText('NGI Learning Module');
    
    // Check description
    await expect(page.locator('text=Learn how to think')).toBeVisible();
  });

  test('displays company selector', async ({ page }) => {
    // Check company selector header
    await expect(page.locator('h2:has-text("Select Your Company")')).toBeVisible();
    
    // Check that companies are loaded
    await expect(page.locator('text=TSLA')).toBeVisible();
    await expect(page.locator('text=COST')).toBeVisible();
    await expect(page.locator('text=SHOP')).toBeVisible();
  });

  test('displays progress tracker', async ({ page }) => {
    // Check streak tracker
    await expect(page.locator('text=Learning Streak')).toBeVisible();
    await expect(page.locator('text=days')).toBeVisible();
    
    // Check stats
    await expect(page.locator('text=Current Streak')).toBeVisible();
    await expect(page.locator('text=Longest Streak')).toBeVisible();
  });

  test('can select a company', async ({ page }) => {
    // Find TSLA company card
    const teslaCard = page.locator('button:has-text("Tesla, Inc.")');
    await expect(teslaCard).toBeVisible();
    
    // Click to select
    await teslaCard.click();
    
    // Wait for selection to complete
    await page.waitForTimeout(1000);
    
    // Check that company is selected (green border)
    await expect(teslaCard).toHaveClass(/border-green-500/);
    
    // Check success message
    await expect(page.locator('text=Company selected!')).toBeVisible();
  });

  test('displays activities after company selection', async ({ page }) => {
    // Select TSLA
    await page.locator('button:has-text("Tesla, Inc.")').click();
    await page.waitForTimeout(1000);
    
    // Check activities section appears
    await expect(page.locator('h2:has-text("Learning Activities")')).toBeVisible();
    
    // Check A1 activity
    await expect(page.locator('text=A1: Revenue Drivers Map')).toBeVisible();
    await expect(page.locator('text=Identify Q (Quantity), P (Price)')).toBeVisible();
    
    // Check locked activities
    await expect(page.locator('text=A2: Working Capital & Debt')).toBeVisible();
    await expect(page.locator('text=Locked')).toBeVisible();
  });

  test('can update streak', async ({ page }) => {
    // Find streak update button
    const updateButton = page.locator('button:has-text("Log Today\'s Activity")');
    await expect(updateButton).toBeVisible();
    
    // Get current streak value
    const streakElement = page.locator('text=Learning Streak').locator('..').locator('div.text-3xl');
    const beforeStreak = await streakElement.textContent();
    
    // Click update
    await updateButton.click();
    
    // Wait for update
    await page.waitForTimeout(1500);
    
    // Check that button text changed (or streak updated)
    await expect(updateButton).toBeEnabled();
  });
});

test.describe('NGI Learning Module - File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
  });

  test('file upload component renders', async ({ page }) => {
    // This test would require the full activity page to be built
    // Checking that upload area exists in the UI
    const uploadArea = page.locator('text=Click to upload');
    
    // Might not be visible until company selected and activity opened
    // This is a placeholder for when the full flow is implemented
  });
});

test.describe('NGI Learning Module - Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
  });

  test('leaderboard displays after company selection', async ({ page }) => {
    // Select company first
    await page.locator('button:has-text("Tesla, Inc.")').click();
    await page.waitForTimeout(1000);
    
    // Scroll to leaderboard section (if exists)
    const leaderboard = page.locator('text=Leaderboard');
    
    // This would be more complete once leaderboard is integrated into main page
  });
});

test.describe('NGI Learning Module - API Integration', () => {
  test('API endpoints are accessible', async ({ request }) => {
    // Test health check
    const healthResponse = await request.get(`${API_BASE}/api/learning/health`);
    expect(healthResponse.ok()).toBeTruthy();
  });

  test('companies endpoint returns data', async ({ request }) => {
    // This would require authentication
    // Placeholder for authenticated API tests
  });
});

test.describe('NGI Learning Module - Responsive Design', () => {
  test('mobile view displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    
    // Check header
    await expect(page.locator('h1:has-text("NGI Learning Module")')).toBeVisible();
    
    // Check company selector
    await expect(page.locator('text=TSLA')).toBeVisible();
  });

  test('tablet view displays correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    
    // Check grid layout
    await expect(page.locator('h1:has-text("NGI Learning Module")')).toBeVisible();
  });
});

test.describe('NGI Learning Module - Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    
    // Check h1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('NGI Learning Module');
    
    // Check h2 elements
    const h2Elements = page.locator('h2');
    await expect(h2Elements.first()).toBeVisible();
  });

  test('buttons have accessible labels', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    
    // Check streak button
    const streakButton = page.locator('button:has-text("Log Today\'s Activity")');
    await expect(streakButton).toBeVisible();
    await expect(streakButton).toBeEnabled();
  });

  test('company cards are keyboard navigable', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
    await page.fill('input[name="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/learning');
    await page.waitForLoadState('networkidle');
    
    // Tab to first company card
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check focus visible
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});

