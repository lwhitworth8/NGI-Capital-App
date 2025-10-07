/**
 * Authentication helper for E2E tests
 * In dev mode, auth guards are disabled (DISABLE_ACCOUNTING_GUARD=1)
 * So we just need to navigate to pages directly
 * 
 * Author: NGI Capital Development Team
 * Date: October 5, 2025
 */

import { Page } from '@playwright/test'

export const ADMIN_USER = {
  email: 'lwhitworth@ngicapitaladvisory.com',
  name: 'Landon Whitworth'
}

export const SECONDARY_APPROVER = {
  email: 'anurmamade@ngicapitaladvisory.com',
  name: 'Andre Nurmamade'
}

/**
 * Authenticate user for E2E tests
 * In dev mode with DISABLE_ACCOUNTING_GUARD=1, this is a no-op
 * The function exists to maintain test structure compatibility
 */
export async function authenticateWithClerk(page: Page, user: typeof ADMIN_USER): Promise<void> {
  // In development mode, accounting guards are disabled
  // Auth is handled by the frontend Clerk integration
  // E2E tests can navigate directly to accounting pages
  
  // Optional: Set cookies/localStorage if needed in future
  // await page.context().addCookies([...])
  
  return Promise.resolve()
}

/**
 * Navigate to accounting dashboard
 */
export async function gotoAccountingDashboard(page: Page): Promise<void> {
  await page.goto('/accounting')
  // Wait for page to load
  await page.waitForLoadState('networkidle')
}

/**
 * Navigate to specific accounting page
 */
export async function gotoAccountingPage(page: Page, path: string): Promise<void> {
  const fullPath = path.startsWith('/') ? path : `/accounting/${path}`
  await page.goto(fullPath)
  await page.waitForLoadState('networkidle')
}
