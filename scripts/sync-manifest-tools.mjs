#!/usr/bin/env node
// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT
//
// Sync the manifest.json "tools" array with the actual tool definitions
// exported from dist/tools/*.js. Claude Desktop relies on this array to
// recognize the bundle's tools as declared; without it the tools default
// to "blocked" on install/update (see COY-157).
//
// Usage:
//   node scripts/sync-manifest-tools.mjs           — write tools into manifest.json
//   node scripts/sync-manifest-tools.mjs --check   — exit non-zero if drifted

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CHECK = process.argv.includes('--check')

const modules = [
  ['auth',     'authTools'],
  ['issues',   'issueTools'],
  ['tasks',    'taskTools'],
  ['worklogs', 'worklogTools'],
  ['projects', 'projectTools'],
  ['sprints',  'sprintTools'],
  ['config',   'configTools'],
  ['members',  'memberTools'],
  ['users',    'userTools'],
]

const tools = []
for (const [file, exportName] of modules) {
  const mod = await import(join(ROOT, 'dist', 'tools', `${file}.js`))
  const arr = mod[exportName]
  if (!Array.isArray(arr)) throw new Error(`${file}.js: export ${exportName} is not an array`)
  for (const t of arr) {
    if (!t.name) throw new Error(`${file}.js: tool entry missing name`)
    tools.push({ name: t.name, description: t.description ?? '' })
  }
}

const manifestPath = join(ROOT, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

// Place "tools" right before "license" (or append) to keep schema fields grouped.
const ordered = {}
for (const k of Object.keys(manifest)) {
  if (k === 'license') ordered.tools = tools
  if (k !== 'tools') ordered[k] = manifest[k]
}
if (!('tools' in ordered)) ordered.tools = tools

const next = JSON.stringify(ordered, null, 2) + '\n'

if (CHECK) {
  const current = readFileSync(manifestPath, 'utf8')
  if (current !== next) {
    process.stderr.write(
      'manifest.json "tools" array is out of sync with dist/tools/*.js.\n' +
      'Run: npm run sync-manifest\n'
    )
    process.exit(1)
  }
  console.log(`manifest.json tools array in sync (${tools.length} tools)`)
} else {
  writeFileSync(manifestPath, next, 'utf8')
  console.log(`Wrote ${tools.length} tools to manifest.json`)
}
