// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const sprintTools = [
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
    name: 'coyote_create_sprint',
    description: 'Create a new sprint. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id:  { type: 'string', description: 'Project ID' },
        name:        { type: 'string', description: 'Sprint name' },
        sprint_type: { type: 'string', description: 'Type: sprint | backlog | release (default: sprint)' },
        start_date:  { type: 'string', description: 'Start date YYYY-MM-DD (optional for backlog)' },
        end_date:    { type: 'string', description: 'End date YYYY-MM-DD (optional for backlog)' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'coyote_update_sprint',
    description: 'Update an existing sprint. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:          { type: 'string', description: 'Sprint ID' },
        name:        { type: 'string', description: 'Sprint name (optional)' },
        sprint_type: { type: 'string', description: 'Type: sprint | backlog | release (optional)' },
        start_date:  { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        end_date:    { type: 'string', description: 'End date YYYY-MM-DD (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_delete_sprint',
    description: 'Delete a sprint. Requires project admin role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Sprint ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_get_sprint',
    description: 'Get details of a single sprint by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Sprint ID' },
      },
      required: ['id'],
    },
  },
]

type Sprint = {
  id: string; name: string; sprint_type: string
  start_date: string | null; end_date: string | null
}

export async function handleSprint(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_sprints') {
    const query: Record<string, string> = { project_id: args.project_id }
    if (args.sprint_type) query.sprint_type = args.sprint_type

    const sprints = await client.get<Sprint[]>('/api/sprints', query)
    if (sprints.length === 0) return 'No sprints found.'

    const today = new Date().toISOString().slice(0, 10)
    return sprints.map(s => {
      const isCurrent = s.sprint_type === 'sprint' && s.start_date != null && s.end_date != null
        && s.start_date <= today && today <= s.end_date
      const dateRange = s.start_date && s.end_date ? `${s.start_date}〜${s.end_date}` : 'no dates'
      return `[${s.id}] ${s.name} (${s.sprint_type}, ${dateRange})${isCurrent ? ' ← current' : ''}`
    }).join('\n')
  }

  if (name === 'coyote_create_sprint') {
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      name: args.name,
    }
    if (args.sprint_type) body.sprint_type = args.sprint_type
    if (args.start_date)  body.start_date  = args.start_date
    if (args.end_date)    body.end_date    = args.end_date

    const sprint = await client.post<Sprint>('/api/sprints', body)
    return `✅ Sprint created: [${sprint.id}] ${sprint.name} (${sprint.sprint_type})`
  }

  if (name === 'coyote_update_sprint') {
    const body: Record<string, unknown> = {}
    if (args.name)        body.name        = args.name
    if (args.sprint_type) body.sprint_type = args.sprint_type
    if (args.start_date)  body.start_date  = args.start_date
    if (args.end_date)    body.end_date    = args.end_date

    const sprint = await client.put<Sprint>(`/api/sprints/${args.id}`, body)
    return `✅ Sprint updated: [${sprint.id}] ${sprint.name} (${sprint.sprint_type})`
  }

  if (name === 'coyote_delete_sprint') {
    await client.delete(`/api/sprints/${args.id}`)
    return `✅ Sprint deleted: ${args.id}`
  }

  if (name === 'coyote_get_sprint') {
    const sprint = await client.get<Sprint>(`/api/sprints/${args.id}`)
    const dateRange = sprint.start_date && sprint.end_date ? `${sprint.start_date}〜${sprint.end_date}` : 'no dates'
    return `[${sprint.id}] ${sprint.name} (${sprint.sprint_type}, ${dateRange})`
  }

  throw new Error(`Unknown sprint tool: ${name}`)
}
