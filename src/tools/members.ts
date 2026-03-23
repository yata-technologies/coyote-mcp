import { CoyoteClient } from '../lib/client.js'

export const memberTools = [
  {
    name: 'coyote_add_member',
    description: 'Add a user to a project. Requires project admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        user_id:    { type: 'string', description: 'User ID to add' },
        role:       { type: 'string', description: 'Role: admin | manager | member' },
      },
      required: ['project_id', 'user_id', 'role'],
    },
  },
  {
    name: 'coyote_update_member_role',
    description: 'Change a project member\'s role. Requires project admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        member_id: { type: 'string', description: 'Project member record ID (from list_members)' },
        role:      { type: 'string', description: 'New role: admin | manager | member' },
      },
      required: ['member_id', 'role'],
    },
  },
  {
    name: 'coyote_remove_member',
    description: 'Remove a user from a project. Requires project admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        member_id: { type: 'string', description: 'Project member record ID (from list_members)' },
      },
      required: ['member_id'],
    },
  },
]

type Member = {
  id: string; project_id: string; user_id: string; role: string
  user_name: string; user_email: string; vendor_name: string | null
}

export async function handleMember(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_add_member') {
    const member = await client.post<Member>('/api/project-members', {
      project_id: args.project_id,
      user_id:    args.user_id,
      role:       args.role,
    })
    return `✅ Member added: ${member.user_name} (${member.user_email}) as ${member.role}${member.vendor_name ? ` — ${member.vendor_name}` : ''} (member_id: ${member.id})`
  }

  if (name === 'coyote_update_member_role') {
    const member = await client.put<Member>(`/api/project-members/${args.member_id}`, {
      role: args.role,
    })
    return `✅ Role updated: ${member.user_name} is now ${member.role}`
  }

  if (name === 'coyote_remove_member') {
    await client.delete(`/api/project-members/${args.member_id}`)
    return `✅ Member removed: ${args.member_id}`
  }

  throw new Error(`Unknown member tool: ${name}`)
}
