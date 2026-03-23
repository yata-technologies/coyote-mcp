import { CoyoteClient } from '../lib/client.js'

export const taskTools = [
  {
    name: 'coyote_list_tasks',
    description: 'List tasks, optionally filtered by owner, issue, project, sprint, or status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner_id:   { type: 'string', description: 'Filter by owner user ID, or "me" for current user (optional)' },
        issue_id:   { type: 'string', description: 'Filter by issue ID (optional)' },
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        status:     { type: 'string', description: 'Filter by status (optional)' },
      },
    },
  },
  {
    name: 'coyote_get_task',
    description: 'Get full details of a task by its slug (e.g. CHR-T1).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Task slug, e.g. CHR-T1' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_create_task',
    description: 'Create a new task under an issue.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issue_id:    { type: 'string', description: 'Issue ID to create the task under' },
        title:       { type: 'string', description: 'Task title' },
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" (optional)' },
        reviewer_id: { type: 'string', description: 'Reviewer user ID (optional)' },
        category_id: { type: 'string', description: 'Category ID (optional)' },
        phase_id:    { type: 'string', description: 'Phase ID (optional)' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | review | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        weight:      { type: 'number', description: 'Effort weight (optional)' },
      },
      required: ['issue_id', 'title'],
    },
  },
  {
    name: 'coyote_update_task',
    description: 'Update an existing task by slug.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug:        { type: 'string', description: 'Task slug, e.g. CHR-T1' },
        title:       { type: 'string', description: 'Task title (optional)' },
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" (optional)' },
        reviewer_id: { type: 'string', description: 'Reviewer user ID (optional)' },
        category_id: { type: 'string', description: 'Category ID (optional)' },
        phase_id:    { type: 'string', description: 'Phase ID (optional)' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | review | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        weight:      { type: 'number', description: 'Effort weight (optional)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_delete_task',
    description: 'Delete a task by slug. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Task slug, e.g. CHR-T1' },
      },
      required: ['slug'],
    },
  },
]

type Task = {
  id: string; slug: string | null; title: string; status: string
  owner_id: string | null; phase: string | null; priority: string | null; weight: number
}

async function resolveMe(client: CoyoteClient, value: string | undefined): Promise<string | undefined> {
  if (value === 'me') {
    const me = await client.get<{ id: string }>('/api/me')
    return me.id
  }
  return value
}

export async function handleTask(name: string, args: Record<string, string | number>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_tasks') {
    const query: Record<string, string> = {}
    const ownerId = await resolveMe(client, args.owner_id as string | undefined)
    if (ownerId)        query.owner_id   = ownerId
    if (args.issue_id)  query.issue_id   = String(args.issue_id)
    if (args.sprint_id) query.sprint_id  = String(args.sprint_id)
    if (args.project_id) query.project_id = String(args.project_id)
    if (args.status)    query.status     = String(args.status)

    const tasks = await client.get<Task[]>('/api/tasks', query)
    if (tasks.length === 0) return 'No tasks found.'

    return tasks.map(t =>
      `[${t.slug ?? t.id}] ${t.title} — status: ${t.status}${t.priority ? `, priority: ${t.priority}` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_get_task') {
    const task = await client.get<Task & { issue_id: string }>(`/api/tasks/${args.slug}`)
    return JSON.stringify(task, null, 2)
  }

  if (name === 'coyote_create_task') {
    const ownerId    = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {
      issue_id: args.issue_id,
      title: args.title,
    }
    if (ownerId)          body.owner_id    = ownerId
    if (args.reviewer_id) body.reviewer_id = args.reviewer_id
    if (args.category_id) body.category_id = args.category_id
    if (args.phase_id)    body.phase_id    = args.phase_id
    if (args.status)      body.status      = args.status
    if (args.priority)    body.priority    = args.priority
    if (args.weight)      body.weight      = Number(args.weight)

    const task = await client.post<Task>('/api/tasks', body)
    return `✅ Task created: ${task.slug ?? task.id} — ${task.title}`
  }

  if (name === 'coyote_update_task') {
    const ownerId    = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {}
    if (args.title)       body.title       = args.title
    if (ownerId)          body.owner_id    = ownerId
    if (args.reviewer_id) body.reviewer_id = args.reviewer_id
    if (args.category_id) body.category_id = args.category_id
    if (args.phase_id)    body.phase_id    = args.phase_id
    if (args.status)      body.status      = args.status
    if (args.priority)    body.priority    = args.priority
    if (args.weight)      body.weight      = Number(args.weight)

    const task = await client.put<Task>(`/api/tasks/${args.slug}`, body)
    return `✅ Task updated: ${task.slug ?? task.id} — ${task.title} (status: ${task.status})`
  }

  if (name === 'coyote_delete_task') {
    await client.delete(`/api/tasks/${args.slug}`)
    return `✅ Task deleted: ${args.slug}`
  }

  throw new Error(`Unknown task tool: ${name}`)
}
