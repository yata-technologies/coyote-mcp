#!/usr/bin/env node
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const output = join(ROOT, `coyote-v${version}.mcpb`)

// Sync version in manifest.json from package.json
const manifestPath = join(ROOT, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (manifest.version !== version) {
  manifest.version = version
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Updated manifest.json version to ${version}`)
}

console.log('Building TypeScript...')
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })

// Remove previous output if it exists
try { rmSync(output) } catch { /* not present */ }

console.log(`Packaging ${output}...`)
const mcpb = join(ROOT, 'node_modules', '.bin', 'mcpb')
execSync(`"${mcpb}" pack "${ROOT}" "${output}"`, { cwd: ROOT, stdio: 'inherit' })

console.log(`\nDone: coyote-v${version}.mcpb (${getSize(output)})`)

function getSize(file) {
  try {
    const bytes = readFileSync(file).length
    return bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`
  } catch {
    return '?'
  }
}
