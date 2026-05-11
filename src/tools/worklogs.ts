// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const worklogTools = [
  {
    name: 'coyote_list_worklogs',
    description: 'List worklogs, optionally filtered by user, task, project, date range, or keyword.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner_id:   { type: 'string', description: 'Filter by owner user ID, or "me" for current user (optional)' },
        task_slug:  { type: 'string', description: 'Filter by task slug, e.g. CHR-T1 (optional)' },
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        date:       { type: 'string', description: 'Filter by exact date YYYY-MM-DD (optional)' },
        date_from:  { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        date_to:    { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
        q:          { type: 'string', description: 'Keyword search across description (optional). Worklogs have no title field. Multiple words AND-combine. Quote phrases like "login flow". Prefix - to exclude (e.g. auth -oauth, -"in progress"). Case-insensitive substring match. A single token matching <PROJECT_KEY>-W<digits> (e.g. COY-W3) is treated as an exact slug lookup. Combines with all other filters via AND.' },
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
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" for current user (defaults to "me")' },
        seconds:     { type: 'number', description: 'Time spent in seconds' },
        date:        { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        start_time:  { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS, defaults to current time' },
        end_time:    { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS (optional)' },
        description:        { type: 'string', description: 'Work description' },
        activity_id:        { type: 'string', description: 'Activity ID (optional)' },
        url:                { type: 'string', description: 'Related URL, e.g. PR link (optional)' },
        time_human_seconds: { type: 'number', description: 'Human work time in seconds (optional). If provided with time_ai_seconds, they should sum to total seconds.' },
        time_ai_seconds:    { type: 'number', description: 'AI work time in seconds (optional). If provided with time_human_seconds, they should sum to total seconds.' },
      },
      required: ['task_slug', 'seconds', 'description'],
    },
  },
  {
    name: 'coyote_update_worklog',
    description: 'Update an existing worklog by slug.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug:        { type: 'string', description: 'Worklog slug, e.g. CHR-W3' },
        task_slug:   { type: 'string', description: 'Move worklog to a different task by slug, e.g. CHR-T2 (optional)' },
        seconds:     { type: 'number', description: 'Time spent in seconds (optional)' },
        date:        { type: 'string', description: 'YYYY-MM-DD (optional)' },
        start_time:  { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS (optional)' },
        end_time:    { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS (optional)' },
        description:        { type: 'string', description: 'Work description (optional)' },
        activity_id:        { type: 'string', description: 'Activity ID (optional)' },
        url:                { type: 'string', description: 'Related URL, e.g. PR link (optional)' },
        time_human_seconds: { type: 'number', description: 'Human work time in seconds (optional).' },
        time_ai_seconds:    { type: 'number', description: 'AI work time in seconds (optional).' },
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
  seconds: number; start_time: string | null; description: string | null
}

export async function handleWorklog(name: string, args: Record<string, string | number | null>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_worklogs') {
    const query: Record<string, string> = {}
    if (args.owner_id === 'me') {
      const me = await client.get<{ id: string }>('/api/me')
      query.owner_id = me.id
    } else if (args.owner_id) {
      query.owner_id = String(args.owner_id)
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
    if (args.q)          query.q          = String(args.q)

    const worklogs = await client.get<Worklog[]>('/api/worklogs', query)
    if (worklogs.length === 0) return 'No worklogs found.'

    const totalSecs = worklogs.reduce((s, w) => s + w.seconds, 0)
    const lines = worklogs.map(w => {
      const mins = Math.round(w.seconds / 60)
      return `[${w.slug ?? w.id}] ${w.date} — ${mins} min${w.description ? `: ${w.description}` : ''}`
    })
    const totalMins = Math.round(totalSecs / 60)
    lines.push(`\nTotal: ${totalMins} min (${(totalMins / 60).toFixed(1)} h)`)
    return lines.join('\n')
  }

  if (name === 'coyote_get_worklog') {
    const wl = await client.get<Worklog>(`/api/worklogs/${args.slug}`)
    return JSON.stringify(wl, null, 2)
  }

  if (name === 'coyote_create_worklog') {
    const ownerRaw = (args.owner_id as string | undefined) ?? 'me'
    const [task, ownerId] = await Promise.all([
      client.get<{ id: string; title: string }>(`/api/tasks/${args.task_slug}`),
      ownerRaw === 'me'
        ? client.get<{ id: string }>('/api/me').then(u => u.id)
        : Promise.resolve(ownerRaw),
    ])
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const hhmmss = `${hh}:${mm}:${ss}`
    const body: Record<string, unknown> = {
      task_id: task.id,
      owner_id: ownerId,
      seconds: Number(args.seconds),
      date: args.date ?? today,
      start_time: args.start_time ?? hhmmss,
    }
    if (args.end_time)    body.end_time    = args.end_time
    if (args.description) body.description = args.description
    if (args.activity_id)               body.activity_id       = args.activity_id
    if (args.url)                       body.url               = args.url
    if (args.time_human_seconds !== undefined) body.time_human_seconds = Number(args.time_human_seconds)
    if (args.time_ai_seconds    !== undefined) body.time_ai_seconds    = Number(args.time_ai_seconds)

    const wl = await client.post<Worklog>('/api/worklogs', body)
    const mins = Math.round((wl.seconds as unknown as number) / 60)
    return `✅ Worklog recorded: ${wl.slug ?? wl.id} — ${mins} min on ${wl.date} (task: ${task.title})`
  }

  if (name === 'coyote_update_worklog') {
    const body: Record<string, unknown> = {}
    if (args.task_slug) {
      const task = await client.get<{ id: string }>(`/api/tasks/${args.task_slug}`)
      body.task_id = task.id
    }
    if (args.seconds     !== undefined) body.seconds     = Number(args.seconds)
    if (args.date        !== undefined) body.date        = args.date
    if (args.start_time  !== undefined) body.start_time  = args.start_time
    if (args.end_time    !== undefined) body.end_time    = args.end_time
    if (args.description !== undefined) body.description = args.description
    if (args.activity_id        !== undefined) body.activity_id       = args.activity_id
    if (args.url                !== undefined) body.url               = args.url
    if (args.time_human_seconds !== undefined) body.time_human_seconds = Number(args.time_human_seconds)
    if (args.time_ai_seconds    !== undefined) body.time_ai_seconds    = Number(args.time_ai_seconds)

    const wl = await client.put<Worklog>(`/api/worklogs/${args.slug}`, body)
    const mins = Math.round(wl.seconds / 60)
    return `✅ Worklog updated: ${wl.slug ?? wl.id} — ${mins} min on ${wl.date}`
  }

  if (name === 'coyote_delete_worklog') {
    await client.delete(`/api/worklogs/${args.slug}`)
    return `✅ Worklog deleted: ${args.slug}`
  }

  throw new Error(`Unknown worklog tool: ${name}`)
}
