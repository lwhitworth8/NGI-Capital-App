import { test, expect } from '@playwright/test'

async function ensureServer(page) {
  try {
    const res = await page.goto('/')
    if (!res) throw new Error('No response')
    return true
  } catch {
    test.skip(true, 'Student app not running at baseURL; skipping nav checks')
    return false
  }
}

test.describe('Student Nav (public)', () => {
  test('Projects page shows Projects/Learning and hides Applications/My Projects when signed out', async ({ page }) => {
    if (!(await ensureServer(page))) return
    await page.goto('/projects')
    // Sidebar visible items
    await expect(page.getByText('Projects')).toBeVisible()
    await expect(page.getByText('Learning')).toBeVisible()
    // Applications (signed-in only)
    await expect(page.getByText('Applications')).toHaveCount(0)
    // My Projects (requires active membership)
    await expect(page.getByText('My Projects')).toHaveCount(0)
  })

  test('Learning page renders the placeholder', async ({ page }) => {
    if (!(await ensureServer(page))) return
    await page.goto('/learning')
    const content = await page.content()
    expect(content.toLowerCase()).toContain('coming soon')
  })
})

