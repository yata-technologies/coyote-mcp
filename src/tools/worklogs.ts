import { CoyoteClient } from '../lib/client.js'

export const worklogTools = [
  {
    name: 'coyote_list_worklogs',
    description: 'List worklogs, optionally filtered by user, task, project, or date range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        user_id:    { type: 'string', description: 'Filter by user ID, or "me" for current user (optional)' },
        task_slug:  { type: 'string', description: 'Filter by task slug, e.g. CHR-T1 (optional)' },
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        date:       { type: 'string', description: 'Filter by exact date YYYY-MM-DD (optional)' },
        date_from:  { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        date_to:    { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
      },
    },
  },
  {
    name: 'coyote_get_worklog',
    description: 'Get full details of a worklog by its slug (e.g. CHR-W3).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Worklog slug, e.g. CHR-W3' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_create_worklog',
    description: 'Record work time on a Coyote task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_slug:   { type: 'string', description: 'Task slug, e.g. CHR-T1' },
        minutes:     { type: 'number', description: 'Time spent in minutes' },
        date:        { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        start_time:  { type: 'string', description: 'HH:MM (optional)' },
        note:        { type: 'string', description: 'Work description (optional)' },
        activity_id: { type: 'string', description: 'Activity ID (optional)' },
      },
      required: ['task_slug', 'minutes'],
    },
  },
  {
    name: 'coyote_update_worklog',
    description: 'Update an existing worklog by slug.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug:        { type: 'string', description: 'Worklog slug, e.g. CHR-W3' },
        minutes:     { type: 'number', description: 'Time spent in minutes (optional)' },
        date:        { type: 'string', description: 'YYYY-MM-DD (optional)' },
        start_time:  { type: 'string', description: 'HH:MM (optional)' },
        end_time:    { type: 'string', description: 'HH:MM (optional)' },
        note:        { type: 'string', description: 'Work description (optional)' },
        activity_id: { type: 'string', description: 'Activity ID (optional)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_delete_worklog',
    description: 'Delete a worklog by slug. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Worklog slug, e.g. CHR-W3' },
      },
      required: ['slug'],
    },
  },
]

type Worklog = {
  id: string; slug: string | null; task_id: string; date: string
  minutes: number; start_time: string | null; note: string | null
}

export async function handleWorklog(name: string, args: Record<string, string | number | null>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_worklogs') {
    const query: Record<string, string> = {}
    if (args.user_id === 'me') {
      const me = await client.get<{ id: string }>('/api/me')
      query.user_id = me.id
    } else if (args.user_id) {
      query.user_id = String(args.user_id)
    }
    if (args.task_slug) {
      const task = await client.get<{ id: string }>(`/api/tasks/${args.task_slug}`)
      query.task_id = task.id
    }
    if (args.project_id) query.project_id = String(args.project_id)
    if (args.sprint_id)  query.sprint_id  = String(args.sprint_id)
    if (args.date)       query.date       = String(args.date)
    if (args.date_from)  query.date_from  = String(args.date_from)
    if (args.date_to)    query.date_to    = String(args.date_to)

    const worklogs = await client.get<Worklog[]>('/api/worklogs', query)
    if (worklogs.length === 0) return 'No worklogs found.'

    const total = worklogs.reduce((s, w) => s + w.minutes, 0)
    const lines = worklogs.map(w =>
      `[${w.slug ?? w.id}] ${w.date} — ${w.minutes} min${w.note ? `: ${w.note}` : ''}`
    )
    lines.push(`\nTotal: ${total} min (${(total / 60).toFixed(1)} h)`)
    return lines.join('\n')
  }

  if (name === 'coyote_get_worklog') {
    const wl = await client.get<Worklog>(`/api/worklogs/${args.slug}`)
    return JSON.stringify(wl, null, 2)
  }

  if (name === 'coyote_create_worklog') {
    const task = await client.get<{ id: string; title: string }>(`/api/tasks/${args.task_slug}`)
    const today = new Date().toISOString().slice(0, 10)
    const body: Record<string, unknown> = {
      task_id: task.id,
      minutes: Number(args.minutes),
      date: args.date ?? today,
    }
    if (args.start_time)  body.start_time  = args.start_time
    if (args.note)        body.note        = args.note
    if (args.activity_id) body.activity_id = args.activity_id

    const wl = await client.post<Worklog>('/api/worklogs', body)
    return `✅ Worklog recorded: ${wl.slug ?? wl.id} — ${wl.minutes} min on ${wl.date} (task: ${task.title})`
  }

  if (name === 'coyote_update_worklog') {
    const body: Record<string, unknown> = {}
    if (args.minutes     !== undefined) body.minutes     = Number(args.minutes)
    if (args.date        !== undefined) body.date        = args.date
    if (args.start_time  !== undefined) body.start_time  = args.start_time
    if (args.end_time    !== undefined) body.end_time    = args.end_time
    if (args.note        !== undefined) body.note        = args.note
    if (args.activity_id !== undefined) body.activity_id = args.activity_id

    const wl = await client.put<Worklog>(`/api/worklogs/${args.slug}`, body)
    return `✅ Worklog updated: ${wl.slug ?? wl.id} — ${wl.minutes} min on ${wl.date}`
  }

  if (name === 'coyote_delete_worklog') {
    await client.delete(`/api/worklogs/${args.slug}`)
    return `✅ Worklog deleted: ${args.slug}`
  }

  throw new Error(`Unknown worklog tool: ${name}`)
}
