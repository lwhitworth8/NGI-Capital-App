#!/usr/bin/env node
/*
 Predeploy check: builds both Next.js apps locally in CI-like mode and scans for non-ASCII.
 Usage: node tools/predeploy-check.mjs
*/
const { execSync } = require('node:child_process')
const { readdirSync, statSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

function run(cmd, cwd = process.cwd()) {
  console.log(`\n$ ${cmd}  (cwd=${cwd})`)
  execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, CI: 'true' } })
}

function scanAscii(dir) {
  const bad = []
  function walk(p) {
    for (const name of readdirSync(p)) {
      const full = join(p, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(name)) continue
        walk(full)
      } else if (/\.(ts|tsx|js|jsx|json|md|yml|yaml|css)$/.test(name)) {
        const buf = readFileSync(full)
        for (let i = 0; i < buf.length; i++) {
          const b = buf[i]
          if (b > 127) { bad.push(full); break }
        }
      }
    }
  }
  walk(dir)
  return [...new Set(bad)]
}

function ensureNode() {
  const v = process.versions.node.split('.')[0]
  if (parseInt(v, 10) < 18) {
    console.error(`Node ${process.versions.node} detected. Use Node 18+ for deploy parity.`)
    process.exit(1)
  }
}

async function main() {
  ensureNode()

  const apps = ['apps/student', 'apps/desktop']

  for (const app of apps) {
    const asciiIssues = scanAscii(join(process.cwd(), app))
    if (asciiIssues.length) {
      console.error(`Non-ASCII characters found in ${app} files:`)
      for (const f of asciiIssues) console.error('  - ' + f)
      console.error('Please replace with ASCII equivalents before deploying.')
      process.exit(1)
    }
  }

  // Install at root (workspaces)
  run('npm ci --workspaces')

  // Build each app
  for (const app of apps) {
    run('npm run build', app)
  }

  console.log('\nAll builds succeeded. Ready for Vercel deploy.')
}

main().catch((e) => { console.error(e); process.exit(1) })
