// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'
import { localToUtc, utcToLocal, todayLocal } from '../lib/worklog-tz.js'

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
        date:       { type: 'string', description: 'Filter by exact date YYYY-MM-DD in caller\'s local TZ (optional). MCP widens the underlying query by ±1 UTC day to catch worklogs near midnight.' },
        date_from:  { type: 'string', description: 'Start date YYYY-MM-DD in caller\'s local TZ (optional)' },
        date_to:    { type: 'string', description: 'End date YYYY-MM-DD in caller\'s local TZ (optional)' },
        q:          { type: 'string', description: 'Keyword search across description (optional). Worklogs have no title field. Multiple words AND-combine. Quote phrases like "login flow". Prefix - to exclude (e.g. auth -oauth, -"in progress"). Case-insensitive substring match. A single token matching <PROJECT_KEY>-W<digits> (e.g. COY-W3) is treated as an exact slug lookup. Combines with all other filters via AND.' },
      },
    },
  },
  {
    name: 'coyote_get_worklog',
    description: 'Get full details of a worklog by its slug (e.g. CHR-W3). Times are returned in the caller\'s local TZ.',
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
    description: 'Record work time on a Coyote task. `date` / `start_time` / `end_time` are interpreted as the caller\'s local time and stored as UTC alongside the recorder\'s offset. `start_time` is required and must be the actual work start — the MCP does not default it to the current clock.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_slug:   { type: 'string', description: 'Task slug, e.g. CHR-T1' },
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" for current user (defaults to "me")' },
        seconds:     { type: 'number', description: 'Time spent in seconds' },
        date:        { type: 'string', description: 'YYYY-MM-DD in caller\'s local TZ, defaults to today (local)' },
        start_time:  { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'Required. HH:MM or HH:MM:SS in caller\'s local TZ — the actual work start. No default: the MCP will not fall back to the current clock. In a Coyote Tracker session, use the canonical value the pre-worklog hook reports.' },
        end_time:    { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS in caller\'s local TZ (optional)' },
        description:        { type: 'string', description: 'Work description' },
        activity_id:        { type: 'string', description: 'Activity ID (optional)' },
        url:                { type: 'string', description: 'Related URL, e.g. PR link (optional)' },
        time_human_seconds: { type: 'number', description: 'Human work time in seconds (optional). If provided with time_ai_seconds, they should sum to total seconds.' },
        time_ai_seconds:    { type: 'number', description: 'AI work time in seconds (optional). If provided with time_human_seconds, they should sum to total seconds.' },
      },
      required: ['task_slug', 'seconds', 'description', 'start_time'],
    },
  },
  {
    name: 'coyote_update_worklog',
    description: 'Update an existing worklog by slug. When `date` / `start_time` / `end_time` are provided they are interpreted as local time and converted to UTC. If any of those are touched, the worklog is normalized to UTC storage even if it was a legacy row.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug:        { type: 'string', description: 'Worklog slug, e.g. CHR-W3' },
        task_slug:   { type: 'string', description: 'Move worklog to a different task by slug, e.g. CHR-T2 (optional)' },
        seconds:     { type: 'number', description: 'Time spent in seconds (optional)' },
        date:        { type: 'string', description: 'YYYY-MM-DD in caller\'s local TZ (optional)' },
        start_time:  { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS in caller\'s local TZ (optional)' },
        end_time:    { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', description: 'HH:MM or HH:MM:SS in caller\'s local TZ (optional)' },
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
  id: string
  slug: string | null
  task_id: string
  date: string
  seconds: number
  start_time: string | null
  end_time: string | null
  description: string | null
  tz_offset_min: number | null
}

function localizeForDisplay(w: Worklog): Worklog {
  const local = utcToLocal({
    date: w.date,
    start_time: w.start_time,
    end_time: w.end_time,
    tz_offset_min: w.tz_offset_min,
  })
  return {
    ...w,
    date: local.date ?? w.date,
    start_time: local.start_time,
    end_time: local.end_time,
  }
}

// Shift a YYYY-MM-DD date string by ±N days, treating the calendar value at
// noon so DST never moves the boundary.
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
    if (args.q)          query.q          = String(args.q)

    // Widen date filters by ±1 day so we catch worklogs whose UTC date is
    // off-by-one from the caller's local date. We then filter client-side
    // after localizing.
    const targetDate = args.date ? String(args.date) : null
    const dateFrom = args.date_from ? String(args.date_from) : null
    const dateTo   = args.date_to   ? String(args.date_to)   : null
    if (targetDate) {
      query.date_from = shiftDate(targetDate, -1)
      query.date_to   = shiftDate(targetDate,  1)
    } else {
      if (dateFrom) query.date_from = shiftDate(dateFrom, -1)
      if (dateTo)   query.date_to   = shiftDate(dateTo,    1)
    }

    const raw = await client.get<Worklog[]>('/api/worklogs', query)
    const worklogs = raw
      .map(localizeForDisplay)
      .filter(w => {
        if (targetDate && w.date !== targetDate) return false
        if (dateFrom && w.date < dateFrom) return false
        if (dateTo   && w.date > dateTo)   return false
        return true
      })

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
    const raw = await client.get<Worklog>(`/api/worklogs/${args.slug}`)
    return JSON.stringify(localizeForDisplay(raw), null, 2)
  }

  if (name === 'coyote_create_worklog') {
    const ownerRaw = (args.owner_id as string | undefined) ?? 'me'
    const [task, ownerId] = await Promise.all([
      client.get<{ id: string; title: string }>(`/api/tasks/${args.task_slug}`),
      ownerRaw === 'me'
        ? client.get<{ id: string }>('/api/me').then(u => u.id)
        : Promise.resolve(ownerRaw),
    ])
    const localDate  = (args.date as string | undefined)       ?? todayLocal()
    // start_time is required and intentionally has no fallback. Defaulting to
    // the current clock (the old behavior) silently stamped the worklog at
    // submission time rather than when the work actually happened (COY-206).
    const localStart = (args.start_time as string | undefined)?.trim()
    if (!localStart) {
      throw new Error(
        'start_time is required (HH:MM or HH:MM:SS, caller local TZ). The MCP no longer '
        + 'defaults to the current clock, which mis-stamped the worklog at submission time '
        + 'instead of when the work happened. Pass the actual work start — in a Coyote '
        + 'Tracker session the pre-worklog hook reports the canonical value to use verbatim.'
      )
    }
    const localEnd   = (args.end_time as string | undefined)   ?? null

    const utc = localToUtc({ date: localDate, start_time: localStart, end_time: localEnd })

    const body: Record<string, unknown> = {
      task_id: task.id,
      owner_id: ownerId,
      seconds: Number(args.seconds),
      date: utc.date,
      start_time: utc.start_time,
      tz_offset_min: utc.tz_offset_min,
    }
    if (utc.end_time)     body.end_time    = utc.end_time
    if (args.description) body.description = args.description
    if (args.activity_id)               body.activity_id        = args.activity_id
    if (args.url)                       body.url                = args.url
    if (args.time_human_seconds !== undefined) body.time_human_seconds = Number(args.time_human_seconds)
    if (args.time_ai_seconds    !== undefined) body.time_ai_seconds    = Number(args.time_ai_seconds)

    const wl = localizeForDisplay(await client.post<Worklog>('/api/worklogs', body))
    const mins = Math.round((wl.seconds as unknown as number) / 60)
    return `✅ Worklog recorded: ${wl.slug ?? wl.id} — ${mins} min on ${wl.date} (task: ${task.title})`
  }

  if (name === 'coyote_update_worklog') {
    const body: Record<string, unknown> = {}
    if (args.task_slug) {
      const task = await client.get<{ id: string }>(`/api/tasks/${args.task_slug}`)
      body.task_id = task.id
    }
    if (args.seconds            !== undefined) body.seconds            = Number(args.seconds)
    if (args.description        !== undefined) body.description        = args.description
    if (args.activity_id        !== undefined) body.activity_id        = args.activity_id
    if (args.url                !== undefined) body.url                = args.url
    if (args.time_human_seconds !== undefined) body.time_human_seconds = Number(args.time_human_seconds)
    if (args.time_ai_seconds    !== undefined) body.time_ai_seconds    = Number(args.time_ai_seconds)

    const touchesTime = args.date !== undefined
      || args.start_time !== undefined
      || args.end_time !== undefined

    if (touchesTime) {
      // Fetch the existing row so we can fill in any field the caller didn't
      // supply, then convert the merged local-TZ values to UTC. This also
      // normalizes legacy (NULL tz_offset_min) rows on edit.
      const existing = await client.get<Worklog>(`/api/worklogs/${args.slug}`)
      const existingLocal = utcToLocal({
        date: existing.date,
        start_time: existing.start_time,
        end_time: existing.end_time,
        tz_offset_min: existing.tz_offset_min,
      })
      const mergedLocal = {
        date:       (args.date       as string | undefined) ?? existingLocal.date,
        start_time: (args.start_time as string | undefined) ?? existingLocal.start_time,
        end_time:   args.end_time !== undefined
          ? (args.end_time as string | null)
          : existingLocal.end_time,
      }
      const utc = localToUtc(mergedLocal)
      body.date          = utc.date
      body.start_time    = utc.start_time
      body.end_time      = utc.end_time
      body.tz_offset_min = utc.tz_offset_min
    }

    const wl = localizeForDisplay(await client.put<Worklog>(`/api/worklogs/${args.slug}`, body))
    const mins = Math.round(wl.seconds / 60)
    return `✅ Worklog updated: ${wl.slug ?? wl.id} — ${mins} min on ${wl.date}`
  }

  if (name === 'coyote_delete_worklog') {
    await client.delete(`/api/worklogs/${args.slug}`)
    return `✅ Worklog deleted: ${args.slug}`
  }

  throw new Error(`Unknown worklog tool: ${name}`)
}
