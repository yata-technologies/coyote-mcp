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
    name: 'coyote_whoami',
    description: 'Return the currently authenticated Coyote user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
]

export async function handleAuth(name: string): Promise<string> {
  if (name === 'coyote_whoami') {
    const client = new CoyoteClient()
    const user = await client.get<{ name: string; email: string; system_role: string }>('/api/me')
    return `Authenticated as ${user.name} (${user.email}) — role: ${user.system_role}`
  }

  if (name === 'coyote_login') {
    return await runDeviceAuth()
  }

  throw new Error(`Unknown auth tool: ${name}`)
}

async function runDeviceAuth(): Promise<string> {
  const label = `Claude Code on ${hostname()} (${platform()})`

  // Step 1: Request device code
  const res = await fetch(`${BASE_URL}/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`Failed to start auth: ${await res.text()}`)

  const { device_code, user_code, verification_uri, interval } =
    await res.json() as { device_code: string; user_code: string; verification_uri: string; interval: number }

  // Step 2: Poll for approval
  const deadline = Date.now() + 15 * 60 * 1000
  const pollMs = (interval ?? 5) * 1000

  // Return the instruction first — Claude will display this while the tool runs
  let message = `Open ${verification_uri} and enter: ${user_code}\n\nWaiting for authorization...`

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
      message = `Open ${verification_uri} and enter: ${user_code}\n\n✅ Authenticated as ${label}. Token saved to ~/.coyote/token.`
      return message
    }
    if (data.error === 'expired_token') {
      throw new Error('Authorization code expired. Please run coyote_login again.')
    }
    // authorization_pending — keep polling
  }

  throw new Error('Login timed out. Please run coyote_login again.')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
