// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const taskTools = [
  {
    name: 'coyote_list_tasks',
    description: 'List tasks, optionally filtered by owner, issue, project, sprint, status, or keyword.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        owner_id:   { type: 'string', description: 'Filter by owner user ID, or "me" for current user (optional)' },
        issue_id:   { type: 'string', description: 'Filter by issue slug (e.g. POY-10) or UUID (optional)' },
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        status:      { type: 'string', description: 'Filter by status (optional)' },
        category_id: { type: 'string', description: 'Filter by category ID (optional)' },
        q:           { type: 'string', description: 'Keyword search across title and description (optional). Multiple words AND-combine. Quote phrases like "login flow". Prefix - to exclude (e.g. auth -oauth, -"in progress"). Case-insensitive substring match. A single token matching <PROJECT_KEY>-T<digits> (e.g. COY-T42) is treated as an exact slug lookup. Combines with all other filters via AND.' },
      },
    },
  },
  {
    name: 'coyote_get_task',
    description: 'Get full details of a task by its slug (e.g. CHR-T1). Response includes associated activities and derived phases.',
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
        issue_id:     { type: 'string', description: 'Issue slug (e.g. POY-10) or UUID to create the task under' },
        title:        { type: 'string', description: 'Task title' },
        owner_id:     { type: 'string', description: 'Owner user ID, or "me" (optional)' },
        reviewer_id:  { type: 'string', description: 'Reviewer user ID (optional)' },
        category_id:  { type: 'string', description: 'Category ID (optional)' },
        activity_ids: { type: 'array', items: { type: 'string' }, description: 'Activity IDs to associate with the task (optional). Use coyote_list_activities to find IDs.' },
        status:       { type: 'string', description: 'Status: not_started | in_progress | review | complete | cancelled (optional)' },
        priority:     { type: 'string', description: 'Priority: Low | Mid | High (optional, defaults to Mid)' },
        description:  { type: 'string', description: 'Task description (optional)' },
        url:          { type: 'string', description: 'Related URL, e.g. PR link (optional)' },
        weight:       { type: 'number', description: 'Effort weight (optional)' },
        pattern_id:   { type: 'string', description: 'Pattern ID (optional). Use coyote_list_patterns to find IDs.' },
        category:     { type: 'string', description: 'Category name (optional, alternative to category_id)' },
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
        slug:         { type: 'string', description: 'Task slug, e.g. CHR-T1' },
        title:        { type: 'string', description: 'Task title (optional)' },
        owner_id:     { type: ['string', 'null'], description: 'Owner user ID, or "me"; pass null to unassign (optional)' },
        reviewer_id:  { type: ['string', 'null'], description: 'Reviewer user ID; pass null to clear (optional)' },
        category_id:  { type: ['string', 'null'], description: 'Category ID; pass null to clear (optional)' },
        activity_ids: { type: 'array', items: { type: 'string' }, description: 'Activity IDs (full replacement). Omit to leave unchanged; pass [] to clear all (optional).' },
        status:       { type: 'string', description: 'Status: not_started | in_progress | review | complete | cancelled (optional)' },
        priority:     { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        description:  { type: ['string', 'null'], description: 'Task description; pass null to clear (optional)' },
        url:          { type: ['string', 'null'], description: 'Related URL; pass null to clear (optional)' },
        weight:       { type: 'number', description: 'Effort weight (optional)' },
        pattern_id:   { type: ['string', 'null'], description: 'Pattern ID; pass null to clear (optional). Use coyote_list_patterns to find IDs.' },
        category:     { type: ['string', 'null'], description: 'Category name; pass null to clear (optional)' },
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

async function resolveIssueId(client: CoyoteClient, value: string): Promise<string> {
  if (/^[A-Z]+-\d+$/.test(value)) {
    const issue = await client.get<{ id: string }>(`/api/issues/${value}`)
    return issue.id
  }
  return value
}

export async function handleTask(name: string, args: Record<string, string | number | string[] | null | undefined>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_tasks') {
    const query: Record<string, string> = {}
    const ownerId = await resolveMe(client, args.owner_id as string | undefined)
    if (ownerId)        query.owner_id   = ownerId
    if (args.issue_id)  query.issue_id   = await resolveIssueId(client, String(args.issue_id))
    if (args.sprint_id)   query.sprint_id   = String(args.sprint_id)
    if (args.project_id)  query.project_id  = String(args.project_id)
    if (args.status)      query.status      = String(args.status)
    if (args.category_id) query.category_id = String(args.category_id)
    if (args.q)           query.q           = String(args.q)

    const tasks = await client.get<Task[]>('/api/tasks', query)
    if (tasks.length === 0) return 'No tasks found.'

    return tasks.map(t =>
      `[${t.slug ?? t.id}] ${t.title} — status: ${t.status}${t.priority ? `, priority: ${t.priority}` : ''}${t.phase ? `, phase: ${t.phase}` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_get_task') {
    const task = await client.get<Task & { issue_id: string }>(`/api/tasks/${args.slug}`)
    return JSON.stringify(task, null, 2)
  }

  if (name === 'coyote_create_task') {
    const ownerId    = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {
      issue_id: await resolveIssueId(client, String(args.issue_id)),
      title: args.title,
    }
    if (ownerId)              body.owner_id     = ownerId
    if (args.reviewer_id)     body.reviewer_id  = args.reviewer_id
    if (args.category_id)     body.category_id  = args.category_id
    if (args.activity_ids)    body.activity_ids = args.activity_ids
    if (args.status)          body.status       = args.status
    if (args.priority)        body.priority     = args.priority
    if (args.weight)          body.weight       = Number(args.weight)
    if (args.description)     body.description  = args.description
    if (args.url)             body.url          = args.url
    if (args.pattern_id)      body.pattern_id   = args.pattern_id
    if (args.category)        body.category     = args.category

    const task = await client.post<Task>('/api/tasks', body)
    return `✅ Task created: ${task.slug ?? task.id} — ${task.title}`
  }

  if (name === 'coyote_update_task') {
    const ownerId    = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {}
    if (args.title        !== undefined) body.title        = args.title
    if (ownerId           !== undefined) body.owner_id     = ownerId ?? null
    if (args.reviewer_id  !== undefined) body.reviewer_id  = args.reviewer_id
    if (args.category_id  !== undefined) body.category_id  = args.category_id
    if (args.activity_ids !== undefined) body.activity_ids = args.activity_ids
    if (args.status       !== undefined) body.status       = args.status
    if (args.priority     !== undefined) body.priority     = args.priority
    if (args.weight       !== undefined) body.weight       = Number(args.weight)
    if (args.description  !== undefined) body.description  = args.description
    if (args.url          !== undefined) body.url          = args.url
    if (args.pattern_id   !== undefined) body.pattern_id   = args.pattern_id
    if (args.category     !== undefined) body.category     = args.category

    const task = await client.put<Task>(`/api/tasks/${args.slug}`, body)
    return `✅ Task updated: ${task.slug ?? task.id} — ${task.title} (status: ${task.status})`
  }

  if (name === 'coyote_delete_task') {
    await client.delete(`/api/tasks/${args.slug}`)
    return `✅ Task deleted: ${args.slug}`
  }

  throw new Error(`Unknown task tool: ${name}`)
}
