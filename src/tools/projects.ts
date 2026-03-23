import { CoyoteClient } from '../lib/client.js'

export const projectTools = [
  {
    name: 'coyote_list_projects',
    description: 'List all Coyote projects accessible to the current user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'coyote_list_sprints',
    description: 'List sprints for a project, optionally filtered by type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id:  { type: 'string', description: 'Project ID' },
        sprint_type: { type: 'string', description: 'Filter by type: sprint | backlog | release (optional)' },
      },
      required: ['project_id'],
    },
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
type Sprint  = { id: string; name: string; sprint_type: string; start_date: string; end_date: string }
type Member  = { id: string; user_id: string; role: string; user_name: string; user_email: string; vendor_name: string | null }

export async function handleProject(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_projects') {
    const projects = await client.get<Project[]>('/api/projects')
    if (projects.length === 0) return 'No projects found.'
    return projects.map(p => `[${p.key}] ${p.name} (id: ${p.id})`).join('\n')
  }

  if (name === 'coyote_list_sprints') {
    const query: Record<string, string> = { project_id: args.project_id }
    if (args.sprint_type) query.sprint_type = args.sprint_type

    const sprints = await client.get<Sprint[]>('/api/sprints', query)
    if (sprints.length === 0) return 'No sprints found.'

    const today = new Date().toISOString().slice(0, 10)
    return sprints.map(s => {
      const isCurrent = s.sprint_type === 'sprint' && s.start_date <= today && today <= s.end_date
      return `[${s.id}] ${s.name} (${s.sprint_type}, ${s.start_date}〜${s.end_date})${isCurrent ? ' ← current' : ''}`
    }).join('\n')
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
