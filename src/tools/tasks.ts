import { CoyoteClient } from '../lib/client.js'

export const taskTools = [
  {
    name: 'list_my_tasks',
    description: 'List tasks owned by the current user. Optionally filter by sprint or project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        status:     { type: 'string', description: 'Filter by status, e.g. open, in_progress, done (optional)' },
      },
    },
  },
  {
    name: 'get_task',
    description: 'Get full details of a task by its slug (e.g. CHR-42).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Task slug, e.g. CHR-42' },
      },
      required: ['slug'],
    },
  },
]

type Task = {
  id: string; slug: string | null; title: string; status: string
  owner_id: string | null; phase: string | null; priority: string | null; weight: number
}

export async function handleTask(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'list_my_tasks') {
    // Get current user to know their ID
    const me = await client.get<{ id: string; name: string }>('/api/me')
    const query: Record<string, string> = { owner_id: me.id }
    if (args.sprint_id)  query.sprint_id  = args.sprint_id
    if (args.project_id) query.project_id = args.project_id
    if (args.status)     query.status     = args.status

    const tasks = await client.get<Task[]>('/api/tasks', query)
    if (tasks.length === 0) return 'No tasks found.'

    return tasks.map(t =>
      `[${t.slug ?? t.id}] ${t.title} — status: ${t.status}${t.priority ? `, priority: ${t.priority}` : ''}`
    ).join('\n')
  }

  if (name === 'get_task') {
    const task = await client.get<Task & { issue_id: string }>(`/api/tasks/${args.slug}`)
    return JSON.stringify(task, null, 2)
  }

  throw new Error(`Unknown task tool: ${name}`)
}
