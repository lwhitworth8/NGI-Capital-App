import { test, expect, request as pwrequest } from '@playwright/test'

const API = process.env.API_ORIGIN || 'http://localhost:8001'

function isoIn(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60_000)
  // YYYY-MM-DDTHH:mm:ss
  const pad = (n: number) => String(n).padStart(2, '0')
  const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  return s
}

test('coffee chats lifecycle without Google env', async () => {
  const req = await pwrequest.newContext({ baseURL: API })

  // Login as both admins
  const an = await req.post('/api/auth/login', { data: { email: 'anurmamade@ngicapitaladvisory.com', password: 'TempPassword123!' } })
  expect(an.status()).toBe(200)
  const andre = await an.json()
  const lw = await req.post('/api/auth/login', { data: { email: 'lwhitworth@ngicapitaladvisory.com', password: 'TempPassword123!' } })
  expect(lw.status()).toBe(200)
  const landon = await lw.json()

  // Add overlapping availability blocks (Andre: 30m grid; Landon: 15m grid)
  const Astart = isoIn(60)
  const Aend = isoIn(120)
  const Lstart = isoIn(75)
  const Lend = isoIn(135)

  const addA = await req.post('/api/advisory/coffeechats/availability', {
    headers: { Authorization: `Bearer ${andre.access_token}` },
    data: { start_ts: Astart, end_ts: Aend, slot_len_min: 30 },
  })
  expect(addA.status()).toBe(200)

  const addL = await req.post('/api/advisory/coffeechats/availability', {
    headers: { Authorization: `Bearer ${landon.access_token}` },
    data: { start_ts: Lstart, end_ts: Lend, slot_len_min: 15 },
  })
  expect(addL.status()).toBe(200)

  // Public availability should include per-admin slots + an 'either' overlay of 15m chunks
  const pub = await req.get('/api/public/coffeechats/availability')
  expect(pub.status()).toBe(200)
  const av = await pub.json() as { slots: Array<{ start_ts: string; end_ts: string; type?: string; slot_len_min: number }> }
  expect(Array.isArray(av.slots)).toBeTruthy()
  expect(av.slots.some(s => s.type === 'either' && s.slot_len_min === 15)).toBeTruthy()

  // Student creates a request for the first available 'either' slot
  const either = av.slots.find(s => s.type === 'either')
  expect(either).toBeTruthy()
  const sreq = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: either!.start_ts, end_ts: either!.end_ts, slot_len_min: either!.slot_len_min },
  })
  expect(sreq.status()).toBe(200)
  const sbody = await sreq.json() as { id: number; status: string }
  expect(sbody.status).toBe('pending')

  // Admin accepts the request (mock Google event creation)
  const acc = await req.post(`/api/advisory/coffeechats/requests/${sbody.id}/accept`, {
    headers: { Authorization: `Bearer ${andre.access_token}` },
  })
  expect(acc.status()).toBe(200)
  const abody = await acc.json()
  expect(abody.status).toBe('accepted')

  // Create another request and exercise propose -> cancel -> no-show -> complete flows
  const another = av.slots.find(s => s.type !== 'either') || av.slots[0]
  const sreq2 = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  const rid2 = (await sreq2.json()).id

  const prop = await req.post(`/api/advisory/coffeechats/requests/${rid2}/propose`, {
    headers: { Authorization: `Bearer ${landon.access_token}` },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts },
  })
  expect(prop.status()).toBe(200)

  const can = await req.post(`/api/advisory/coffeechats/requests/${rid2}/cancel`, {
    headers: { Authorization: `Bearer ${landon.access_token}` },
    data: { reason: 'student' },
  })
  expect(can.status()).toBe(200)

  // Make a third request and mark no-show
  const sreq3 = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  const rid3 = (await sreq3.json()).id
  const ns = await req.post(`/api/advisory/coffeechats/requests/${rid3}/no-show`, {
    headers: { Authorization: `Bearer ${andre.access_token}` },
    data: { actor: 'student' },
  })
  expect(ns.status()).toBe(200)
  const blockedDuringCooldown = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  expect(blockedDuringCooldown.status()).toBe(400)

  // And a fourth to complete
  const sreq4 = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  const rid4 = (await sreq4.json()).id
  const cp = await req.post(`/api/advisory/coffeechats/requests/${rid4}/complete`, {
    headers: { Authorization: `Bearer ${andre.access_token}` },
  })
  expect(cp.status()).toBe(200)

  // Two student cancels should blacklist
  const mkReq1 = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  const br1 = (await mkReq1.json()).id
  await req.post(`/api/advisory/coffeechats/requests/${br1}/cancel`, { headers: { Authorization: `Bearer ${landon.access_token}` }, data: { reason: 'student' } })

  const mkReq2 = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  const br2 = (await mkReq2.json()).id
  await req.post(`/api/advisory/coffeechats/requests/${br2}/cancel`, { headers: { Authorization: `Bearer ${landon.access_token}` }, data: { reason: 'student' } })

  const blacklisted = await req.post('/api/public/coffeechats/requests', {
    headers: { 'X-Student-Email': 'student@berkeley.edu', 'Content-Type': 'application/json' },
    data: { start_ts: another!.start_ts, end_ts: another!.end_ts, slot_len_min: another!.slot_len_min },
  })
  expect(blacklisted.status()).toBe(400)
})
