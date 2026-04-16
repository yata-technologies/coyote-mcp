import { readToken } from './token.js'
import { createRequire } from 'module'

const BASE_URL = 'https://api.coyote-worklog.com'
const VERSION: string = (createRequire(import.meta.url)('../../package.json') as { version: string }).version
const VERSION_MISMATCH_HINT = ' — If this is a version compatibility issue, call coyote_update to install the latest version.'

export class CoyoteClient {
  private token: string | null

  constructor() {
    this.token = readToken()
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-MCP-Version': VERSION,
    }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  private async throwOnError(res: Response): Promise<never> {
    const body = await res.text()
    const hint = res.status === 500 ? VERSION_MISMATCH_HINT : ''
    throw new Error(`API error ${res.status}: ${body}${hint}`)
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v)
      }
    }
    const res = await fetch(url.toString(), { headers: this.headers() })
    if (!res.ok) await this.throwOnError(res)
    return res.json() as Promise<T>
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) await this.throwOnError(res)
    return res.json() as Promise<T>
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) await this.throwOnError(res)
    return res.json() as Promise<T>
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok) await this.throwOnError(res)
  }
}
