#!/usr/bin/env node

/**
 * Debug Clerk auth against the NGI backend.
 *
 * Usage:
 *   node scripts/debug_clerk_auth.js --token "<CLERK_JWT>" [--origin http://localhost:8001]
 *
 * Notes:
 * - This script sends Authorization: Bearer <token> to the backend.
 * - It calls /api/auth/debug, /api/advisory/projects (GET), and attempts a minimal create (POST).
 */

const DEFAULT_ORIGIN = process.env.API_ORIGIN || 'http://localhost:8001'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { token: '', origin: DEFAULT_ORIGIN }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--token' || a === '-t') && i + 1 < args.length) {
      out.token = args[++i]
    } else if ((a === '--origin' || a === '-o') && i + 1 < args.length) {
      out.origin = args[++i]
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/debug_clerk_auth.js --token "<CLERK_JWT>" [--origin http://localhost:8001]')
      process.exit(0)
    }
  }
  if (!out.token) {
    console.error('Error: --token is required. Get it via window.Clerk.session.getToken({ template: "backend" })')
    process.exit(1)
  }
  return out
}

async function doFetchJSON(url, token, opts = {}) {
  const headers = Object.assign({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }, opts.headers || {})
  const res = await fetch(url, { ...opts, headers })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  return { status: res.status, ok: res.ok, json }
}

async function main() {
  const { token, origin } = parseArgs()
  const api = (p) => origin.replace(/\/$/, '') + p

  console.log('Origin:', origin)
  console.log('Token (first 20):', token.slice(0, 20) + '...')

  // 1) /api/auth/debug
  console.log('\n[1] GET /api/auth/debug')
  let r = await doFetchJSON(api('/api/auth/debug'), token)
  console.log('Status:', r.status, 'Body:', r.json)

  // 2) GET advisory/projects
  console.log('\n[2] GET /api/advisory/projects')
  r = await doFetchJSON(api('/api/advisory/projects'), token)
  console.log('Status:', r.status, 'Items:', Array.isArray(r.json) ? r.json.length : r.json)

  // 3) POST advisory/projects (minimal draft)
  console.log('\n[3] POST /api/advisory/projects (create draft)')
  r = await doFetchJSON(api('/api/advisory/projects'), token, {
    method: 'POST',
    body: JSON.stringify({
      project_name: 'Diag Project ' + new Date().toISOString(),
      client_name: 'UC',
      summary: 'This is a valid summary used by the debug script.'
    })
  })
  console.log('Status:', r.status, 'Body:', r.json)

  console.log('\nDone.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

