import { readToken } from './token.js'

const BASE_URL = 'https://coyote-api.yata-nakata.workers.dev'

export class CoyoteClient {
  private token: string | null

  constructor() {
    this.token = readToken()
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v)
      }
    }
    const res = await fetch(url.toString(), { headers: this.headers() })
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }
}
