import { test, expect, request as pwrequest } from '@playwright/test'

const API = process.env.API_ORIGIN || 'http://localhost:8001'

test('admin creates project and student sees it', async () => {
  const req = await pwrequest.newContext({ baseURL: API })
  // Login as Andre (uses default seeded password)
  const login = await req.post('/api/auth/login', { data: { email: 'anurmamade@ngicapitaladvisory.com', password: 'TempPassword123!' } })
  expect(login.status()).toBe(200)

  // Create draft
  const create = await req.post('/api/advisory/projects', { data: { project_name: 'E2E Project', client_name: 'UC Investments', summary: 'A valid summary for e2e testing', status: 'draft' } })
  expect(create.status()).toBe(200)

  // Get created id
  const list = await req.get('/api/advisory/projects')
  const items = await list.json()
  const pid = items[0]?.id
  expect(typeof pid).toBe('number')

  // Set a lead
  const leads = await req.put(`/api/advisory/projects/${pid}/leads`, { data: { emails: ['anurmamade@ngicapitaladvisory.com'] } })
  expect(leads.status()).toBe(200)

  // Publish with required fields
  const pub = await req.put(`/api/advisory/projects/${pid}`, { data: { description: 'Detailed description for publish. '.repeat(5), team_size: 3, commitment_hours_per_week: 10, duration_weeks: 8, start_date: '2025-01-01', end_date: '2025-02-28', status: 'active', allow_applications: 1 } })
  expect(pub.status()).toBe(200)

  // Student sees it via public endpoint
  const pubList = await req.get('/api/public/projects')
  expect(pubList.status()).toBe(200)
  const pubItems = await pubList.json()
  expect(Array.isArray(pubItems)).toBeTruthy()
  expect(pubItems.some((p: any) => p.project_name === 'E2E Project')).toBeTruthy()
})

