import { CoyoteClient } from '../lib/client.js'

export const worklogTools = [
  {
    name: 'create_worklog',
    description: 'Record work time on a Coyote task.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_slug:  { type: 'string', description: 'Task slug, e.g. CHR-42' },
        minutes:    { type: 'number', description: 'Time spent in minutes' },
        date:       { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        start_time: { type: 'string', description: 'HH:MM, optional' },
        note:       { type: 'string', description: 'Work description, optional' },
      },
      required: ['task_slug', 'minutes'],
    },
  },
  {
    name: 'list_my_worklogs',
    description: 'List worklogs recorded by the current user, optionally filtered by date range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        date_to:   { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
      },
    },
  },
]

type Worklog = {
  id: string; slug: string | null; task_id: string; date: string
  minutes: number; start_time: string | null; note: string | null
}

export async function handleWorklog(name: string, args: Record<string, string | number>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'create_worklog') {
    // Resolve task slug to task ID
    const task = await client.get<{ id: string; slug: string | null; title: string }>(`/api/tasks/${args.task_slug}`)

    const today = new Date().toISOString().slice(0, 10)
    const body: Record<string, unknown> = {
      task_id: task.id,
      minutes: Number(args.minutes),
      date: args.date ?? today,
    }
    if (args.start_time) body.start_time = args.start_time
    if (args.note)       body.note       = args.note

    const wl = await client.post<Worklog>('/api/worklogs', body)
    return `✅ Worklog recorded: ${wl.slug ?? wl.id} — ${wl.minutes} min on ${wl.date} (task: ${task.title})`
  }

  if (name === 'list_my_worklogs') {
    const me = await client.get<{ id: string }>('/api/me')
    const query: Record<string, string> = { user_id: me.id }
    if (args.date_from) query.date_from = String(args.date_from)
    if (args.date_to)   query.date_to   = String(args.date_to)

    const worklogs = await client.get<Worklog[]>('/api/worklogs', query)
    if (worklogs.length === 0) return 'No worklogs found.'

    const total = worklogs.reduce((s, w) => s + w.minutes, 0)
    const lines = worklogs.map(w =>
      `[${w.slug ?? w.id}] ${w.date} — ${w.minutes} min${w.note ? `: ${w.note}` : ''}`
    )
    lines.push(`\nTotal: ${total} min (${(total / 60).toFixed(1)} h)`)
    return lines.join('\n')
  }

  throw new Error(`Unknown worklog tool: ${name}`)
}
