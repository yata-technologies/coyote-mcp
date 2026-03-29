import { spawn } from 'child_process'
import { hostname, platform } from 'os'
import { writeToken } from '../lib/token.js'
import { CoyoteClient } from '../lib/client.js'

const BASE_URL = 'https://coyote-api.yata-nakata.workers.dev'

export const authTools = [
  {
    name: 'coyote_login',
    description: 'Authenticate with Coyote via Device Authorization Grant. Opens a browser URL where you enter a code to authorize this session.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_get_me',
    description: 'Return the currently authenticated Coyote user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
]

export async function handleAuth(name: string): Promise<string> {
  if (name === 'coyote_get_me') {
    const client = new CoyoteClient()
    const user = await client.get<{ name: string; email: string; system_role: string }>('/api/me')
    return `Authenticated as ${user.name} (${user.email}) — role: ${user.system_role}`
  }

  if (name === 'coyote_login') {
    return await runDeviceAuth()
  }

  throw new Error(`Unknown auth tool: ${name}`)
}

function openBrowser(url: string): void {
  const p = platform()
  try {
    if (p === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn(p === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch { /* ignore — user opens manually */ }
}

async function runDeviceAuth(): Promise<string> {
  const label = `Claude Code on ${hostname()} (${platform()})`

  const res = await fetch(`${BASE_URL}/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`Failed to start auth: ${await res.text()}`)

  const { device_code, user_code, verification_uri, interval } =
    await res.json() as { device_code: string; user_code: string; verification_uri: string; interval: number }

  openBrowser(verification_uri)

  const deadline = Date.now() + 15 * 60 * 1000
  const pollMs = (interval ?? 5) * 1000

  while (Date.now() < deadline) {
    await sleep(pollMs)
    const pollRes = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code }),
    })
    const data = await pollRes.json() as { access_token?: string; error?: string }

    if (data.access_token) {
      writeToken(data.access_token)
      return `Your browser has been opened to: ${verification_uri}\nEnter code: ${user_code}\n\n✅ Authenticated as ${label}. Token saved to ~/.coyote/token.`
    }
    if (data.error === 'expired_token') {
      throw new Error('Authorization code expired. Please run coyote_login again.')
    }
  }

  throw new Error('Login timed out. Please run coyote_login again.')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
