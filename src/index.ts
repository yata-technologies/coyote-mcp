#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { execSync, spawnSync } from 'child_process'
import { readFileSync } from 'fs'
import { homedir, hostname, platform } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { authTools, handleAuth } from './tools/auth.js'
import { taskTools, handleTask } from './tools/tasks.js'
import { issueTools, handleIssue } from './tools/issues.js'
import { worklogTools, handleWorklog } from './tools/worklogs.js'
import { writeToken } from './lib/token.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_DIR = join(__dirname, '..', '..')

// --- Auto-update ---

function tryAutoUpdate(): void {
  let autoUpdate = true
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.coyote', 'config.json'), 'utf8'))
    if (cfg.auto_update === false) autoUpdate = false
  } catch { /* no config — default true */ }

  try {
    execSync(`git -C ${REPO_DIR} fetch origin main --quiet`, { stdio: 'ignore' })
    const behind = execSync(
      `git -C ${REPO_DIR} rev-list HEAD..origin/main --count`,
      { encoding: 'utf8' }
    ).trim()

    if (behind === '0') return

    if (!autoUpdate) {
      process.stderr.write(`[coyote-mcp] Update available. Run: git -C ${REPO_DIR} pull && npm run build --prefix ${join(REPO_DIR, 'mcp')}\n`)
      return
    }

    process.stderr.write('[coyote-mcp] Updating to latest version...\n')
    execSync(`git -C ${REPO_DIR} pull --ff-only`, { stdio: 'ignore' })
    execSync(`npm run build --prefix ${join(REPO_DIR, 'mcp')}`, { stdio: 'ignore' })
    process.stderr.write('[coyote-mcp] Updated. Restarting...\n')

    const result = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit' })
    process.exit(result.status ?? 0)
  } catch {
    process.stderr.write('[coyote-mcp] Auto-update failed, continuing with existing build.\n')
  }
}

// --- CLI login mode ---

async function runLogin(): Promise<void> {
  const BASE_URL = 'https://coyote-api.yata-nakata.workers.dev'
  const label = `Claude Code on ${hostname()} (${platform()})`

  console.log('🐺 Coyote — Device Authorization\n')

  const res = await fetch(`${BASE_URL}/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`Failed to start auth: ${await res.text()}`)

  const { device_code, user_code, verification_uri, interval } =
    await res.json() as { device_code: string; user_code: string; verification_uri: string; interval: number }

  console.log(`Open this URL in your browser:\n  ${verification_uri}\n`)
  console.log(`Then enter the code:\n  ${user_code}\n`)

  const pollMs = (interval ?? 5) * 1000
  const deadline = Date.now() + 15 * 60 * 1000

  process.stdout.write('Waiting for authorization')
  while (Date.now() < deadline) {
    await sleep(pollMs)
    process.stdout.write('.')

    const pollRes = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code }),
    })
    const data = await pollRes.json() as { access_token?: string; error?: string }

    if (data.access_token) {
      writeToken(data.access_token)
      console.log(`\n\n✅ Authenticated — token saved to ~/.coyote/token`)
      console.log('Restart Claude Code to start using Coyote tools.')
      return
    }
    if (data.error === 'expired_token') {
      console.log('\n\n❌ Code expired. Please run login again.')
      process.exit(1)
    }
    // authorization_pending — keep polling
  }

  console.log('\n\n❌ Login timed out. Please run login again.')
  process.exit(1)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- MCP Server ---

const ALL_TOOLS = [...authTools, ...taskTools, ...issueTools, ...worklogTools]

async function startServer(): Promise<void> {
  tryAutoUpdate()

  const server = new Server(
    { name: 'coyote', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params
    const a = args as Record<string, string | number>

    try {
      let text: string
      if (name === 'coyote_login' || name === 'coyote_whoami') {
        text = await handleAuth(name)
      } else if (name === 'list_my_tasks' || name === 'get_task') {
        text = await handleTask(name, a as Record<string, string>)
      } else if (name === 'list_issues' || name === 'get_issue') {
        text = await handleIssue(name, a as Record<string, string>)
      } else if (name === 'create_worklog' || name === 'list_my_worklogs') {
        text = await handleWorklog(name, a)
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }
      return { content: [{ type: 'text', text }] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Entry point
const command = process.argv[2]
if (command === 'login') {
  runLogin().catch(err => { console.error(err.message); process.exit(1) })
} else {
  startServer().catch(err => { process.stderr.write(String(err) + '\n'); process.exit(1) })
}
