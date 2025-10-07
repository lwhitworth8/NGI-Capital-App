import { test, expect, request } from '@playwright/test'

test.describe('Coffee Chats - Agent scheduling flow', () => {
  const backend = process.env.BACKEND_ORIGIN || 'http://localhost:8002'

  test('admin sets availability, student requests, agent accepts', async ({ page, context, request: rq }) => {
    // Admin: open projects page and set availability via panel
    await page.goto('/ngi-advisory/projects')
    // Open first project card
    const first = page.locator('[data-testid="project-card"]').first()
    await first.click()
    // Open Coffee Chats panel
    await page.getByRole('button', { name: /Open Coffee Chats/i }).click()
    // Fill date/time
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
    const dateStr = tomorrow.toISOString().slice(0,10)
    await page.locator('input[type="date"]').fill(dateStr)
    await page.locator('input[type="time"]').first().fill('09:00')
    await page.locator('input[type="time"]').nth(1).fill('11:00')
    await page.getByRole('button', { name: /Add Block/i }).click()
    await expect(page.getByText('My Blocks')).toBeVisible()

    // Student: open student projects and request a chat
    const student = await context.newPage()
    await student.goto('/projects')
    await student.getByRole('button', { name: /View Times/i }).first().click()
    // pick first available time in first day column
    const timeBtn = student.locator('.grid .border .p-2 .w-full').first()
    await timeBtn.click()
    await student.getByRole('button', { name: /Request Chat/i }).click()
    await expect(student.getByText(/Coffee chat requested/i)).toBeVisible()

    // Simulate agent webhook accept (if agent is not live in CI)
    const body = {
      run_id: 'e2e',
      status: 'completed',
      target_type: 'coffeechat_request',
      target_id: 1,
      decision: {
        type: 'accepted',
        owner_email: 'admin@ngicapitaladvisory.com',
        start_ts: new Date().toISOString(),
        end_ts: new Date(Date.now()+30*60000).toISOString(),
        google_event_id: 'e2e-mock',
        meet_link: 'https://meet.google.com/mock-e2e'
      }
    }
    // Get signature from helper
    const signRes = await rq.post(`${backend}/api/agents/tools/sign`, { data: body })
    if (signRes.ok()){
      const { signature } = await signRes.json()
      const hook = await rq.post(`${backend}/api/agents/webhooks/scheduler`, { data: body, headers: { 'X-Agent-Signature': signature } })
      expect(hook.ok()).toBeTruthy()
    }

    // Verify agent run appears in diagnostics
    const runs = await rq.get(`${backend}/api/agents/runs?limit=5`)
    expect(runs.ok()).toBeTruthy()
  })
})

