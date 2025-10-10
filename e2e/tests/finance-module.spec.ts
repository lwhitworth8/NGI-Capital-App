/**
 * E2E tests for the Finance Module Complete Redesign
 */
import { test, expect } from '@playwright/test'

test.describe('Finance Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to finance module
    await page.goto('/finance')
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="finance-dashboard"]', { timeout: 10000 })
  })

  test('displays finance dashboard with all sections', async ({ page }) => {
    // Check main title
    await expect(page.getByText('Financial Dashboard')).toBeVisible()
    
    // Check performance metrics section
    await expect(page.getByText('Revenue (TTM)')).toBeVisible()
    await expect(page.getByText('EBITDA')).toBeVisible()
    await expect(page.getByText('EBITDA Margin')).toBeVisible()
    await expect(page.getByText('Rule of 40')).toBeVisible()
    
    // Check second row metrics
    await expect(page.getByText('FCF (TTM)')).toBeVisible()
    await expect(page.getByText('Burn Multiple')).toBeVisible()
    await expect(page.getByText('Cash Runway')).toBeVisible()
    await expect(page.getByText('Quick Ratio')).toBeVisible()
    
    // Check health score section
    await expect(page.getByText('Three-Statement Health Score')).toBeVisible()
    await expect(page.getByText('Unit Economics (SaaS)')).toBeVisible()
    
    // Check waterfall chart
    await expect(page.getByText('Income Statement Waterfall (TTM)')).toBeVisible()
    
    // Check cash flow and balance sheet
    await expect(page.getByText('Cash Flow Bridge (MoM)')).toBeVisible()
    await expect(page.getByText('Balance Sheet Snapshot')).toBeVisible()
    
    // Check cap table
    await expect(page.getByText('Cap Table & Ownership')).toBeVisible()
  })

  test('navigates to forecasting tab', async ({ page }) => {
    // Click on forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    
    // Wait for forecasting content to load
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Check forecasting elements
    await expect(page.getByText('Financial Model Builder')).toBeVisible()
    await expect(page.getByText('Scenario Management')).toBeVisible()
    await expect(page.getByText('Income Statement')).toBeVisible()
    await expect(page.getByText('Balance Sheet')).toBeVisible()
    await expect(page.getByText('Cash Flow')).toBeVisible()
    await expect(page.getByText('Assumptions')).toBeVisible()
  })

  test('creates new scenario in forecasting', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Click new scenario button
    await page.click('text=New Scenario')
    
    // Fill scenario form
    await page.fill('[name="scenario-name"]', 'Series A Raise Plan')
    await page.selectOption('[name="stage"]', 'series-a')
    
    // Submit form
    await page.click('text=Create Scenario')
    
    // Verify scenario was created
    await expect(page.getByText('Series A Raise Plan')).toBeVisible()
  })

  test('uses AI assistant for expense input', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Click AI assistant button
    await page.click('text=AI Assistant')
    
    // Fill AI input
    await page.fill('textarea', 'Hire 2 software engineers at $150K each starting in March 2026, plus 15% benefits and payroll taxes')
    
    // Click analyze
    await page.click('text=Analyze')
    
    // Wait for AI response
    await page.waitForSelector('text=Employee Salaries', { timeout: 10000 })
    
    // Verify AI detected the expense
    await expect(page.getByText('Employee Salaries')).toBeVisible()
    await expect(page.getByText('Employee Benefits')).toBeVisible()
  })

  test('navigates to investor management tab', async ({ page }) => {
    // Click on investor management tab
    await page.click('[data-testid="investors-tab"]')
    
    // Wait for investor content to load
    await page.waitForSelector('[data-testid="investors-content"]')
    
    // Check investor management elements
    await expect(page.getByText('Investor Management')).toBeVisible()
    await expect(page.getByText('Total Investors')).toBeVisible()
    await expect(page.getByText('In Pipeline')).toBeVisible()
    await expect(page.getByText('Won Deals')).toBeVisible()
    await expect(page.getByText('Active (30d)')).toBeVisible()
    
    // Check capital raise overview
    await expect(page.getByText('Capital Raise Overview')).toBeVisible()
    await expect(page.getByText('Funding Rounds')).toBeVisible()
    await expect(page.getByText('Recent Activity')).toBeVisible()
    
    // Check investor pipeline
    await expect(page.getByText('Investor Pipeline')).toBeVisible()
    await expect(page.getByText('Kanban View')).toBeVisible()
    await expect(page.getByText('Table View')).toBeVisible()
  })

  test('filters investor pipeline', async ({ page }) => {
    // Navigate to investor management tab
    await page.click('[data-testid="investors-tab"]')
    await page.waitForSelector('[data-testid="investors-content"]')
    
    // Search for investors
    await page.fill('input[placeholder="Search investors..."]', 'test')
    
    // Filter by stage
    await page.selectOption('select', 'in_progress')
    
    // Verify filter is applied
    await expect(page.locator('select')).toHaveValue('in_progress')
  })

  test('switches between kanban and table view', async ({ page }) => {
    // Navigate to investor management tab
    await page.click('[data-testid="investors-tab"]')
    await page.waitForSelector('[data-testid="investors-content"]')
    
    // Switch to table view
    await page.click('text=Table View')
    
    // Verify table view is active
    await expect(page.locator('text=Table View')).toHaveClass(/active/)
    
    // Switch back to kanban view
    await page.click('text=Kanban View')
    
    // Verify kanban view is active
    await expect(page.locator('text=Kanban View')).toHaveClass(/active/)
  })

  test('opens CASE AI assistant', async ({ page }) => {
    // Click on CASE assistant button (bottom right)
    await page.click('[data-testid="case-assistant-button"]')
    
    // Wait for chat window to open
    await page.waitForSelector('[data-testid="case-chat-window"]')
    
    // Check chat window elements
    await expect(page.getByText('CASE')).toBeVisible()
    await expect(page.getByText('AI Financial Assistant')).toBeVisible()
    await expect(page.getByPlaceholderText('Ask CASE about your financials...')).toBeVisible()
    
    // Type a message
    await page.fill('textarea', 'What is our current revenue?')
    
    // Send message
    await page.click('[data-testid="send-button"]')
    
    // Wait for response (mock response)
    await page.waitForSelector('text=Your revenue is', { timeout: 10000 })
    
    // Verify response
    await expect(page.getByText('What is our current revenue?')).toBeVisible()
  })

  test('displays health score with proper colors', async ({ page }) => {
    // Check health score section
    const healthScore = page.locator('[data-testid="health-score"]')
    await expect(healthScore).toBeVisible()
    
    // Check health score value
    await expect(page.getByText('87/100')).toBeVisible()
    
    // Check health status badge
    await expect(page.getByText('HEALTHY')).toBeVisible()
    
    // Check component scores
    await expect(page.getByText('P&L Quality:')).toBeVisible()
    await expect(page.getByText('Balance Sheet:')).toBeVisible()
    await expect(page.getByText('Cash Flow:')).toBeVisible()
  })

  test('displays unit economics correctly', async ({ page }) => {
    // Check unit economics section
    await expect(page.getByText('Unit Economics (SaaS)')).toBeVisible()
    
    // Check individual metrics
    await expect(page.getByText('CAC:')).toBeVisible()
    await expect(page.getByText('LTV:')).toBeVisible()
    await expect(page.getByText('LTV/CAC:')).toBeVisible()
    await expect(page.getByText('Payback:')).toBeVisible()
    await expect(page.getByText('Net Dollar Ret:')).toBeVisible()
    
    // Check status indicators
    await expect(page.getByText('✓ > 3.0x')).toBeVisible()
    await expect(page.getByText('✓ < 12 mo')).toBeVisible()
    await expect(page.getByText('✓ > 100%')).toBeVisible()
  })

  test('shows trend indicators correctly', async ({ page }) => {
    // Check trend indicators on metric cards
    await expect(page.getByText('↑ 145%')).toBeVisible()
    await expect(page.getByText('↑ 280%')).toBeVisible()
    await expect(page.getByText('↑ 185K')).toBeVisible()
    
    // Check status badges
    await expect(page.getByText('✓ GOOD')).toBeVisible()
    await expect(page.getByText('✓ HEALTHY')).toBeVisible()
  })

  test('displays three-statement model correctly', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Check income statement tab
    await expect(page.getByText('Income Statement')).toBeVisible()
    
    // Check table structure
    await expect(page.getByText('Line Item')).toBeVisible()
    await expect(page.getByText('Oct\'25')).toBeVisible()
    await expect(page.getByText('Nov\'25')).toBeVisible()
    await expect(page.getByText('Dec\'25')).toBeVisible()
    
    // Check key line items
    await expect(page.getByText('REVENUE')).toBeVisible()
    await expect(page.getByText('COST OF REVENUE')).toBeVisible()
    await expect(page.getByText('Gross Profit')).toBeVisible()
    await expect(page.getByText('EBITDA')).toBeVisible()
    await expect(page.getByText('Net Income')).toBeVisible()
    
    // Check key metrics summary
    await expect(page.getByText('Gross Margin')).toBeVisible()
    await expect(page.getByText('EBITDA Margin')).toBeVisible()
    await expect(page.getByText('Net Margin')).toBeVisible()
  })

  test('handles responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that content is still visible and properly laid out
    await expect(page.getByText('Financial Dashboard')).toBeVisible()
    
    // Check that metric cards stack properly
    const metricCards = page.locator('[data-testid="metric-card"]')
    await expect(metricCards.first()).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Check that content adapts
    await expect(page.getByText('Financial Dashboard')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Check that content uses full width
    await expect(page.getByText('Financial Dashboard')).toBeVisible()
  })

  test('exports forecast data', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Export to Excel')
    ])
    
    // Verify download was triggered
    expect(download).toBeTruthy()
  })

  test('validates form inputs', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('[data-testid="forecasting-tab"]')
    await page.waitForSelector('[data-testid="forecasting-content"]')
    
    // Try to create scenario without name
    await page.click('text=New Scenario')
    await page.click('text=Create Scenario')
    
    // Should show validation error
    await expect(page.getByText('Scenario name is required')).toBeVisible()
  })

  test('displays loading states', async ({ page }) => {
    // Check that loading indicators are shown initially
    const loadingElements = page.locator('[data-testid="loading"]')
    await expect(loadingElements.first()).toBeVisible()
    
    // Wait for content to load
    await page.waitForSelector('text=Revenue (TTM)', { timeout: 10000 })
    
    // Loading indicators should be gone
    await expect(loadingElements.first()).not.toBeVisible()
  })
})
