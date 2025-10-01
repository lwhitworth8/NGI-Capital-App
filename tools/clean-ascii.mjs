#!/usr/bin/env node
/*
 Replace common non-ASCII glyphs across app sources with ASCII equivalents.
 Targets: apps/desktop, apps/student
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const roots = ['apps/desktop', 'apps/student']
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.yml', '.yaml', '.txt'])

const map = new Map([
  ['\u2013', '-'], // en dash –
  ['\u2014', '-'], // em dash —
  ['\u2026', '...'], // ellipsis …
  ['\u00A0', ' '], // nbsp
  ['\u2018', "'"], // ‘
  ['\u2019', "'"], // ’
  ['\u201C', '"'], // “
  ['\u201D', '"'], // ”
  ['\u2022', '-'], // •
  ['\u2713', 'OK'], // ✓
  ['\u2705', 'OK'], // ✅
  ['\u274C', 'X'], // ❌
  ['\u26A0', 'WARN'], // ⚠
  ['\u2715', 'x'], // ✕
])

function toAscii(s) {
  let out = s
  for (const [k, v] of map.entries()) {
    const re = new RegExp(k, 'g')
    out = out.replace(re, v)
  }
  // Best-effort sweep of any remaining non-ASCII
  out = out.replace(/[\u0080-\uFFFF]/g, '?')
  return out
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', '.next', 'dist', 'build', 'coverage'].includes(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

let changed = 0
for (const root of roots) {
  const files = walk(root).filter(f => exts.has(extname(f)))
  for (const f of files) {
    const orig = readFileSync(f, 'utf8')
    const next = toAscii(orig)
    if (next !== orig) {
      writeFileSync(f, next, 'utf8')
      changed++
      console.log('ASCII cleaned:', f)
    }
  }
}
console.log(`\nDone. Files changed: ${changed}`)

