import { spawn } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { homedir, hostname, platform } from 'os'
import { join } from 'path'
import { createRequire } from 'module'
import { writeToken, readToken } from '../lib/token.js'
import { CoyoteClient } from '../lib/client.js'

const BASE_URL = 'https://coyote-api.yata-nakata.workers.dev'
const PENDING_AUTH_FILE = join(homedir(), '.coyote', 'pending-auth.json')
const VERSION: string = (createRequire(import.meta.url)('../../package.json') as { version: string }).version

interface PendingAuth {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_at: number
}

export const authTools = [
  {
    name: 'coyote_login',
    description: 'Start Coyote authentication. Opens a browser to the verification page and returns the code to enter there. After completing authentication in the browser, call coyote_login_complete.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_login_complete',
    description: 'Complete Coyote authentication after the user has approved the request in the browser. Call this after coyote_login once the browser authentication is done.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_get_me',
    description: 'Return the currently authenticated Coyote user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_update',
    description: 'Check for a new version of Coyote MCP and download it if available. Call this when any Coyote tool returns a 500 error, as that often indicates a version incompatibility between the MCP and the Coyote API.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
]

export async function handleAuth(name: string): Promise<string> {
  if (name === 'coyote_get_me') {
    const client = new CoyoteClient()
    const [user, updateNotice] = await Promise.all([
      client.get<{ name: string; email: string; system_role: string }>('/api/me'),
      checkUpdateNotice(),
    ])
    let result = `Authenticated as ${user.name} (${user.email}) — role: ${user.system_role}`
    if (updateNotice) result += `\n\n---\n${updateNotice}`
    return result
  }

  if (name === 'coyote_login') {
    return await startDeviceAuth()
  }

  if (name === 'coyote_login_complete') {
    return await completeDeviceAuth()
  }

  if (name === 'coyote_update') {
    return await handleUpdate()
  }

  throw new Error(`Unknown auth tool: ${name}`)
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
  }
  return false
}

async function fetchLatestVersion(): Promise<string | null> {
  const token = readToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE_URL}/api/mcp/version`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const { version } = await res.json() as { version: string }
    return version
  } catch {
    return null
  }
}

// Returns nudge string if update available, empty string otherwise (3s timeout)
async function checkUpdateNotice(): Promise<string> {
  try {
    const latest = await Promise.race([
      fetchLatestVersion(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
    ])
    if (latest && semverGt(latest, VERSION)) {
      return (
        `🆕 A new version of Coyote MCP (v${latest}) is available.\n` +
        `Run \`coyote_update\` to download it and get installation instructions.`
      )
    }
  } catch { /* ignore */ }
  return ''
}

async function handleUpdate(): Promise<string> {
  const latest = await fetchLatestVersion()
  if (!latest) {
    return '⚠️ Could not reach the Coyote server to check for updates. Please try again later.'
  }

  if (!semverGt(latest, VERSION)) {
    return `✅ Coyote MCP is up to date (v${VERSION}).`
  }

  // Download the new .mcpb
  const token = readToken()
  if (!token) return '⚠️ Not authenticated. Please call coyote_login first.'

  let binary: Buffer
  try {
    const res = await fetch(`${BASE_URL}/api/mcp/download`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    binary = Buffer.from(await res.arrayBuffer())
  } catch {
    return (
      `⚠️ Download failed (v${latest} is available).\n` +
      `Please download manually from the Coyote app settings.`
    )
  }

  // Save to ~/Downloads/
  const downloadsDir = join(homedir(), 'Downloads')
  const filePath = join(downloadsDir, `coyote-v${latest}.mcpb`)
  try {
    mkdirSync(downloadsDir, { recursive: true })
    writeFileSync(filePath, binary)
  } catch {
    return (
      `⚠️ Download failed (v${latest} is available) — could not write to Downloads folder.\n` +
      `Please download manually from the Coyote app settings.`
    )
  }

  return (
    `🆕 New version v${latest} downloaded.\n\n` +
    `To install:\n` +
    `1. Open Claude Desktop\n` +
    `2. Go to Settings → Extensions → Details → Install Extension\n` +
    `3. Select the downloaded file\n\n` +
    `After installation, fully quit and relaunch Claude Desktop. The new version will not be recognized without a restart.`
  )
}

function openBrowser(url: string): void {
  const p = platform()
  try {
    const child = p === 'win32'
      ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' })
      : spawn(p === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' })
    child.on('error', () => { /* ignore — user opens manually */ })
    child.unref()
  } catch { /* ignore — user opens manually */ }
}

function writePendingAuth(auth: PendingAuth): void {
  mkdirSync(join(homedir(), '.coyote'), { recursive: true })
  writeFileSync(PENDING_AUTH_FILE, JSON.stringify(auth), 'utf8')
}

function readPendingAuth(): PendingAuth | null {
  try {
    return JSON.parse(readFileSync(PENDING_AUTH_FILE, 'utf8')) as PendingAuth
  } catch {
    return null
  }
}

function clearPendingAuth(): void {
  try { unlinkSync(PENDING_AUTH_FILE) } catch { /* ignore */ }
}

async function startDeviceAuth(): Promise<string> {
  const label = `Coyote MCP on ${hostname()} (${platform()})`

  const res = await fetch(`${BASE_URL}/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`Failed to start auth: ${await res.text()}`)

  const { device_code, user_code, verification_uri, interval } =
    await res.json() as { device_code: string; user_code: string; verification_uri: string; interval: number }

  writePendingAuth({
    device_code,
    user_code,
    verification_uri,
    interval: interval ?? 5,
    expires_at: Date.now() + 15 * 60 * 1000,
  })

  openBrowser(verification_uri)

  return (
    `Your browser has been opened to: ${verification_uri}\n\n` +
    `Enter this code on the page:\n  ${user_code}\n\n` +
    `Once you have approved the request in the browser, call coyote_login_complete.`
  )
}

async function completeDeviceAuth(): Promise<string> {
  const pending = readPendingAuth()
  if (!pending) {
    return 'No pending login found. Please call coyote_login first.'
  }
  if (Date.now() > pending.expires_at) {
    clearPendingAuth()
    return 'The login code has expired. Please call coyote_login to start again.'
  }

  const pollMs = pending.interval * 1000
  const deadline = Math.min(pending.expires_at, Date.now() + 55 * 1000)

  while (Date.now() < deadline) {
    await sleep(pollMs)
    const pollRes = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: pending.device_code }),
    })
    const data = await pollRes.json() as { access_token?: string; error?: string }

    if (data.access_token) {
      writeToken(data.access_token)
      clearPendingAuth()
      return `✅ Authentication complete. Logged in as ${pending.user_code} session. Token saved to ~/.coyote/token.`
    }
    if (data.error === 'expired_token') {
      clearPendingAuth()
      throw new Error('Authorization code expired. Please call coyote_login to start again.')
    }
  }

  return (
    `Still waiting for browser approval. Please complete the authentication at:\n` +
    `  ${pending.verification_uri}\n\n` +
    `Then call coyote_login_complete again.`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
