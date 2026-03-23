import { CoyoteClient } from '../lib/client.js'

export const projectTools = [
  {
    name: 'coyote_list_projects',
    description: 'List all Coyote projects accessible to the current user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_list_members',
    description: 'List members of a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
]

type Project = { id: string; key: string; name: string; description: string | null }
type Member  = { id: string; user_id: string; role: string; user_name: string; user_email: string; vendor_name: string | null }

export async function handleProject(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_projects') {
    const projects = await client.get<Project[]>('/api/projects')
    if (projects.length === 0) return 'No projects found.'
    return projects.map(p => `[${p.key}] ${p.name} (id: ${p.id})`).join('\n')
  }

  if (name === 'coyote_list_members') {
    const members = await client.get<Member[]>('/api/project-members', { project_id: args.project_id })
    if (members.length === 0) return 'No members found.'
    return members.map(m =>
      `[${m.role}] ${m.user_name} (${m.user_email})${m.vendor_name ? ` — ${m.vendor_name}` : ''} (id: ${m.user_id})`
    ).join('\n')
  }

  throw new Error(`Unknown project tool: ${name}`)
}
