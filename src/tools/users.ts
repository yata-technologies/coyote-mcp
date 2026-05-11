// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const userTools = [
  {
    name: 'coyote_list_vendors',
    description: 'List all vendors. Useful for resolving vendor IDs when creating or filtering issues.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_create_vendor',
    description: 'Create a new vendor. Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Vendor name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'coyote_update_vendor',
    description: 'Update a vendor. Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:   { type: 'string', description: 'Vendor ID' },
        name: { type: 'string', description: 'Vendor name' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'coyote_delete_vendor',
    description: 'Delete a vendor. Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Vendor ID' },
      },
      required: ['id'],
    },
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
  {
    name: 'coyote_get_user',
    description: 'Get details of a user by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'User ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_create_user',
    description: 'Create a new user. Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name:        { type: 'string', description: 'User name' },
        email:       { type: 'string', description: 'User email' },
        system_role: { type: 'string', description: 'System role: admin | member (default: member)' },
        title:       { type: 'string', description: 'Job title (optional)' },
        vendor_id:   { type: 'string', description: 'Vendor ID (optional)' },
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'coyote_update_user',
    description: 'Update a user. Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:          { type: 'string', description: 'User ID' },
        name:        { type: 'string', description: 'User name (optional)' },
        email:       { type: 'string', description: 'User email (optional)' },
        system_role: { type: 'string', description: 'System role: admin | member (optional)' },
        title:       { type: 'string', description: 'Job title (optional)' },
        vendor_id:   { type: ['string', 'null'], description: 'Vendor ID; pass null to clear (optional)' },
        import_key:  { type: 'string', description: 'Import key (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_deactivate_user',
    description: 'Deactivate a user (sets active=0 and removes from all projects). Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'User ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_reactivate_user',
    description: 'Reactivate a deactivated user (sets active=1). Requires system admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'User ID' },
      },
      required: ['id'],
    },
  },
]

type Vendor = { id: string; name: string }
type User   = { id: string; name: string; email: string; system_role: string; title: string | null; vendor_id: string | null; active: number }

export async function handleUser(name: string, args: Record<string, unknown>): Promise<string> {
  const client = new CoyoteClient()

  // Vendors
  if (name === 'coyote_list_vendors') {
    const vendors = await client.get<Vendor[]>('/api/vendors')
    if (vendors.length === 0) return 'No vendors found.'
    return vendors.map(v => `[${v.id}] ${v.name}`).join('\n')
  }

  if (name === 'coyote_create_vendor') {
    const vendor = await client.post<Vendor>('/api/vendors', { name: args.name })
    return `✅ Vendor created: [${vendor.id}] ${vendor.name}`
  }

  if (name === 'coyote_update_vendor') {
    const vendor = await client.put<Vendor>(`/api/vendors/${args.id}`, { name: args.name })
    return `✅ Vendor updated: [${vendor.id}] ${vendor.name}`
  }

  if (name === 'coyote_delete_vendor') {
    await client.delete(`/api/vendors/${args.id}`)
    return `✅ Vendor deleted: ${args.id}`
  }

  // Users
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

  if (name === 'coyote_get_user') {
    const user = await client.get<User>(`/api/users/${args.id}`)
    return JSON.stringify(user, null, 2)
  }

  if (name === 'coyote_create_user') {
    const body: Record<string, unknown> = { name: args.name, email: args.email }
    if (args.system_role) body.system_role = args.system_role
    if (args.title)       body.title       = args.title
    if (args.vendor_id)   body.vendor_id   = args.vendor_id
    const user = await client.post<User>('/api/users', body)
    return `✅ User created: [${user.id}] ${user.name} (${user.email}) — ${user.system_role}`
  }

  if (name === 'coyote_update_user') {
    const body: Record<string, unknown> = {}
    if (args.name        !== undefined) body.name        = args.name
    if (args.email       !== undefined) body.email       = args.email
    if (args.system_role !== undefined) body.system_role = args.system_role
    if (args.title       !== undefined) body.title       = args.title
    if (args.vendor_id   !== undefined) body.vendor_id   = args.vendor_id
    if (args.import_key  !== undefined) body.import_key  = args.import_key
    const user = await client.put<User>(`/api/users/${args.id}`, body)
    return `✅ User updated: [${user.id}] ${user.name} (${user.email}) — ${user.system_role}`
  }

  if (name === 'coyote_deactivate_user') {
    await client.delete(`/api/users/${args.id}`)
    return `✅ User deactivated: ${args.id}`
  }

  if (name === 'coyote_reactivate_user') {
    const user = await client.post<User>(`/api/users/${args.id}/reactivate`, {})
    return `✅ User reactivated: [${user.id}] ${user.name} (${user.email})`
  }

  throw new Error(`Unknown user tool: ${name}`)
}
