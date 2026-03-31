#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const manifestPath = join(ROOT, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.version !== version) {
  manifest.version = version
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Synced manifest.json version to ${version}`)
}
