import { CoyoteClient } from '../lib/client.js'

export const userTools = [
  {
    name: 'coyote_list_vendors',
    description: 'List all vendors. Useful for resolving vendor IDs when creating or filtering issues.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_list_users',
    description: 'List all users. Useful for resolving user IDs when assigning task owners or issue owners.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        include_inactive: { type: 'boolean', description: 'Include inactive users (admin only, optional)' },
      },
    },
  },
]

type Vendor = { id: string; name: string }
type User   = { id: string; name: string; email: string; system_role: string; title: string | null; vendor_id: string | null; active: number }

export async function handleUser(name: string, args: Record<string, unknown>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_vendors') {
    const vendors = await client.get<Vendor[]>('/api/vendors')
    if (vendors.length === 0) return 'No vendors found.'
    return vendors.map(v => `[${v.id}] ${v.name}`).join('\n')
  }

  if (name === 'coyote_list_users') {
    const query: Record<string, string> = {}
    if (args.include_inactive) query.include_inactive = 'true'

    const users = await client.get<User[]>('/api/users', query)
    if (users.length === 0) return 'No users found.'
    return users.map(u => {
      const status = u.active ? '' : ' [inactive]'
      const title  = u.title ? ` — ${u.title}` : ''
      return `[${u.id}] ${u.name} (${u.email})${title} role: ${u.system_role}${status}`
    }).join('\n')
  }

  throw new Error(`Unknown user tool: ${name}`)
}
