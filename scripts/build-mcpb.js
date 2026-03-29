#!/usr/bin/env node
import { execSync } from 'child_process'
import { readFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const output = `coyote-v${version}.mcpb`

console.log('Building TypeScript...')
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' })

// Remove previous output if it exists
try { rmSync(join(ROOT, output)) } catch { /* not present */ }

console.log(`Packaging ${output}...`)
execSync(
  `zip -r "${output}" manifest.json dist/ node_modules/`,
  { cwd: ROOT, stdio: 'inherit' }
)

console.log(`\nDone: ${output} (${getSize(join(ROOT, output))})`)

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
