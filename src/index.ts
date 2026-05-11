#!/usr/bin/env node
// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

// Polyfill fetch for environments where it is not a global (e.g. Cowork's bundled Node.js < 18)
if (typeof globalThis.fetch === 'undefined') {
  const { fetch, Headers, Request, Response } = await import('undici')
  Object.assign(globalThis, { fetch, Headers, Request, Response })
}
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { execSync, spawnSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs'
import { homedir, hostname, platform } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { authTools, handleAuth } from './tools/auth.js'
import { taskTools, handleTask } from './tools/tasks.js'
import { issueTools, handleIssue } from './tools/issues.js'
import { worklogTools, handleWorklog } from './tools/worklogs.js'
import { projectTools, handleProject } from './tools/projects.js'
import { sprintTools, handleSprint } from './tools/sprints.js'
import { configTools, handleConfig } from './tools/config.js'
import { memberTools, handleMember } from './tools/members.js'
import { userTools, handleUser } from './tools/users.js'
import { createRequire } from 'module'
import { writeToken } from './lib/token.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_DIR = join(__dirname, '..')
const BUILD_PENDING_FILE = join(homedir(), '.coyote', 'build-pending')
const IS_GIT_REPO = existsSync(join(REPO_DIR, '.git'))
const VERSION: string = (createRequire(import.meta.url)('../package.json') as { version: string }).version
const BASE_URL = 'https://api.coyote-worklog.com'

// --- Auto-update helpers ---

type GitErrorKind = 'auth' | 'network' | 'timeout' | 'not_found' | 'diverged' | 'unknown'

function classifyGitError(err: unknown): GitErrorKind {
  // Spawn-level ENOENT (shell: false) or exit 127 (shell: true, command not found)
  if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') return 'not_found'
  if (err instanceof Error && (err as { status?: number }).status === 127) return 'not_found'
  if (err instanceof Error && ((err as { killed?: boolean }).killed === true || (err as { signal?: string }).signal != null)) return 'timeout'
  const stderr = err instanceof Error ? (err as { stderr?: Buffer }).stderr?.toString() ?? '' : ''
  if (/Authentication failed|Permission denied \(publickey\)|Permission denied.*publickey|could not read Username|Invalid username/i.test(stderr)) return 'auth'
  if (/Could not resolve host|Connection refused|Network is unreachable/i.test(stderr)) return 'network'
  if (/not possible to fast.forward|diverged/i.test(stderr)) return 'diverged'
  return 'unknown'
}

function writeBuildPending(commitHash: string): void {
  try {
    mkdirSync(join(homedir(), '.coyote'), { recursive: true })
    writeFileSync(BUILD_PENDING_FILE, commitHash, 'utf8')
  } catch { /* ignore */ }
}

function clearBuildPending(): void {
  try { unlinkSync(BUILD_PENDING_FILE) } catch { /* ignore */ }
}

// Invoke tsc directly via process.execPath to avoid PATH dependency (e.g. nvm environments)
function runBuild(pulledHash: string): boolean {
  const tscBin = join(REPO_DIR, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execSync(`"${process.execPath}" "${tscBin}"`, { cwd: REPO_DIR, stdio: 'pipe', timeout: 60000 })
    clearBuildPending()
    return true
  } catch {
    writeBuildPending(pulledHash)
    process.stderr.write(
      `[coyote-mcp] Auto-update failed: build error after git pull.\n` +
      `\u26a0\ufe0f  Source was updated but dist/ could not be rebuilt. Manual build required:\n` +
      `  npm install --prefix "${REPO_DIR}"\n` +
      `  npm run build --prefix "${REPO_DIR}"\n` +
      `  Restart Claude Code or run /mcp to reconnect\n`
    )
    return false
  }
}

// Retry a build that failed in a previous session (flag file approach)
function tryPendingBuild(): void {
  if (!existsSync(BUILD_PENDING_FILE)) return
  let pendingHash: string
  try {
    pendingHash = readFileSync(BUILD_PENDING_FILE, 'utf8').trim()
  } catch {
    clearBuildPending()
    return
  }
  let currentHash: string
  try {
    currentHash = execSync(`git -C "${REPO_DIR}" rev-parse HEAD`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 }).trim()
  } catch {
    return
  }
  if (pendingHash !== currentHash) {
    clearBuildPending()
    return
  }
  process.stderr.write('[coyote-mcp] Retrying pending build from previous update...\n')
  runBuild(currentHash)
}

// --- Auto-update ---

function tryAutoUpdate(): void {
  tryPendingBuild()

  let autoUpdate = true
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.coyote', 'config.json'), 'utf8'))
    if (cfg.auto_update === false) autoUpdate = false
  } catch { /* no config — default true */ }

  // Step 1: fetch
  try {
    execSync(`git -C "${REPO_DIR}" fetch origin main --quiet`, { stdio: 'pipe', timeout: 15000 })
  } catch (err) {
    const kind = classifyGitError(err)
    if (kind === 'not_found') {
      process.stderr.write('[coyote-mcp] Update check failed: git not found. Please install git. Starting with existing build.\n')
    } else if (kind === 'auth') {
      process.stderr.write(
        `[coyote-mcp] Update check failed: git authentication error.\n` +
        `To update manually:\n` +
        `  1. Pull the latest code (git pull or your GUI git client)\n` +
        `  2. npm run build --prefix "${REPO_DIR}"\n` +
        `  3. Restart Claude Code or run /mcp to reconnect\n`
      )
    } else if (kind === 'timeout') {
      process.stderr.write('[coyote-mcp] Update check failed: git fetch timed out (15s). Check your network or git credentials. Starting with existing build.\n')
    } else {
      process.stderr.write('[coyote-mcp] Update check failed: cannot reach remote (network error). Starting with existing build.\n')
    }
    return
  }

  // Step 2: check if behind
  let behind: string
  try {
    behind = execSync(`git -C "${REPO_DIR}" rev-list HEAD..origin/main --count`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 }).trim()
  } catch {
    return
  }

  if (behind === '0') return

  if (!autoUpdate) {
    process.stderr.write(`[coyote-mcp] Update available. Run: git -C "${REPO_DIR}" pull && npm run build --prefix "${REPO_DIR}"\n`)
    return
  }

  process.stderr.write('[coyote-mcp] Updating to latest version...\n')

  // Step 3: pull
  try {
    execSync(`git -C "${REPO_DIR}" pull --ff-only origin main`, { stdio: 'pipe', timeout: 15000 })
  } catch (err) {
    const kind = classifyGitError(err)
    if (kind === 'auth') {
      process.stderr.write(
        `[coyote-mcp] Update check failed: git authentication error.\n` +
        `To update manually:\n` +
        `  1. Pull the latest code (git pull or your GUI git client)\n` +
        `  2. npm run build --prefix "${REPO_DIR}"\n` +
        `  3. Restart Claude Code or run /mcp to reconnect\n`
      )
    } else if (kind === 'diverged') {
      process.stderr.write(
        `[coyote-mcp] Auto-update failed: local branch has diverged from origin/main.\n` +
        `To update manually:\n` +
        `  git -C "${REPO_DIR}" reset --hard origin/main\n` +
        `  npm run build --prefix "${REPO_DIR}"\n` +
        `  Restart Claude Code or run /mcp to reconnect\n`
      )
    } else {
      process.stderr.write('[coyote-mcp] Auto-update failed: git pull error. Starting with existing build.\n')
    }
    return
  }

  // Step 4: record HEAD for flag file
  let pulledHash = ''
  try {
    pulledHash = execSync(`git -C "${REPO_DIR}" rev-parse HEAD`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 }).trim()
  } catch { /* proceed without hash — flag file won't be used */ }

  // Step 5: build
  if (!runBuild(pulledHash)) return

  // Step 6: restart
  process.stderr.write('[coyote-mcp] Updated. Restarting...\n')
  try {
    const result = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit' })
    process.exit(result.status ?? 0)
  } catch {
    process.stderr.write('[coyote-mcp] Restart failed after update. Please restart Claude Code manually.\n')
  }
}

// --- CLI login mode ---

async function runLogin(): Promise<void> {
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
  }

  console.log('\n\n❌ Login timed out. Please run login again.')
  process.exit(1)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- MCP Server ---

const ALL_TOOLS = [...authTools, ...issueTools, ...taskTools, ...worklogTools, ...projectTools, ...sprintTools, ...configTools, ...memberTools, ...userTools]

const AUTH_TOOLS    = new Set(['coyote_login', 'coyote_login_complete', 'coyote_get_me', 'coyote_update_me', 'coyote_upgrade'])
const ISSUE_TOOLS   = new Set(['coyote_list_issues', 'coyote_get_issue', 'coyote_create_issue', 'coyote_update_issue', 'coyote_delete_issue'])
const TASK_TOOLS    = new Set(['coyote_list_tasks', 'coyote_get_task', 'coyote_create_task', 'coyote_update_task', 'coyote_delete_task'])
const WORKLOG_TOOLS = new Set(['coyote_list_worklogs', 'coyote_get_worklog', 'coyote_create_worklog', 'coyote_update_worklog', 'coyote_delete_worklog'])
const PROJECT_TOOLS = new Set(['coyote_list_projects', 'coyote_list_members', 'coyote_get_project', 'coyote_create_project', 'coyote_update_project', 'coyote_delete_project'])
const SPRINT_TOOLS  = new Set(['coyote_list_sprints', 'coyote_create_sprint', 'coyote_update_sprint', 'coyote_delete_sprint', 'coyote_get_sprint'])
const USER_TOOLS    = new Set(['coyote_list_vendors', 'coyote_create_vendor', 'coyote_update_vendor', 'coyote_delete_vendor', 'coyote_list_users', 'coyote_get_user', 'coyote_create_user', 'coyote_update_user', 'coyote_deactivate_user', 'coyote_reactivate_user'])
const CONFIG_TOOLS  = new Set([
  'coyote_list_patterns', 'coyote_get_pattern', 'coyote_create_pattern', 'coyote_update_pattern', 'coyote_delete_pattern',
  'coyote_list_categories', 'coyote_create_category', 'coyote_update_category', 'coyote_delete_category',
  'coyote_list_phases', 'coyote_create_phase', 'coyote_update_phase', 'coyote_delete_phase',
  'coyote_list_activities', 'coyote_get_activity', 'coyote_create_activity', 'coyote_update_activity', 'coyote_delete_activity',
])
const MEMBER_TOOLS  = new Set(['coyote_add_member', 'coyote_update_member_role', 'coyote_remove_member'])

async function startServer(): Promise<void> {
  if (IS_GIT_REPO) {
    tryAutoUpdate()
  }

  const server = new Server(
    { name: 'coyote', version: VERSION },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params
    const a = args as Record<string, string | number | null>

    try {
      let text: string
      if (AUTH_TOOLS.has(name)) {
        text = await handleAuth(name, a as Record<string, string | null>)
      } else if (ISSUE_TOOLS.has(name)) {
        text = await handleIssue(name, a)
      } else if (TASK_TOOLS.has(name)) {
        text = await handleTask(name, a)
      } else if (WORKLOG_TOOLS.has(name)) {
        text = await handleWorklog(name, a)
      } else if (PROJECT_TOOLS.has(name)) {
        text = await handleProject(name, a as Record<string, string>)
      } else if (SPRINT_TOOLS.has(name)) {
        text = await handleSprint(name, a as Record<string, string>)
      } else if (CONFIG_TOOLS.has(name)) {
        text = await handleConfig(name, a)
      } else if (MEMBER_TOOLS.has(name)) {
        text = await handleMember(name, a as Record<string, string>)
      } else if (USER_TOOLS.has(name)) {
        text = await handleUser(name, a)
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
