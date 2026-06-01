// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const issueTools = [
  {
    name: 'coyote_list_issues',
    description: 'List issues, optionally filtered by project, sprint, owner, status, or keyword.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        owner_id:   { type: 'string', description: 'Filter by owner user ID, or "me" for current user (optional)' },
        status:     { type: 'string', description: 'Filter by status (optional)' },
        vendor:     { type: 'string', description: 'Filter by vendor name (optional)' },
        category:   { type: 'string', description: 'Filter by category name (optional)' },
        q:          { type: 'string', description: 'Keyword search across title and description (optional). Multiple words AND-combine. Quote phrases like "login flow". Prefix - to exclude (e.g. auth -oauth, -"in progress"). Case-insensitive substring match. A single token matching <PROJECT_KEY>-<digits> (e.g. COY-42) is treated as an exact slug lookup. Combines with all other filters via AND.' },
      },
    },
  },
  {
    name: 'coyote_get_issue',
    description: 'Get full details of an issue by its slug (e.g. CHR-5).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Issue slug, e.g. CHR-5' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_create_issue',
    description: 'Create a new issue in a sprint. Strongly prefer setting start_date and end_date — they place the issue on the Timeline/Gantt view. If you omit both, they default to the parent sprint\'s dates.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sprint_id:   { type: 'string', description: 'Sprint ID to create the issue in' },
        title:       { type: 'string', description: 'Issue title' },
        category:    { type: 'string', description: 'Category name (optional)' },
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" (optional). Vendor is auto-set from owner.' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | review | pending | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional, defaults to Mid)' },
        level:       { type: 'string', description: 'Level (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
        url:         { type: 'string', description: 'Related URL (optional)' },
        start_date:  { type: 'string', description: 'Scheduled start date YYYY-MM-DD. STRONGLY RECOMMENDED: an issue without both start_date and end_date does NOT appear on the Timeline/Gantt view. Ask the user if unknown rather than leaving blank. If you omit both dates they default to the parent sprint\'s start_date.' },
        end_date:    { type: 'string', description: 'Scheduled end date YYYY-MM-DD. Must be on or after start_date. STRONGLY RECOMMENDED for the Timeline/Gantt view (see start_date). If you omit both dates they default to the parent sprint\'s end_date.' },
      },
      required: ['sprint_id', 'title'],
    },
  },
  {
    name: 'coyote_update_issue',
    description: 'Update an existing issue by slug.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug:        { type: 'string', description: 'Issue slug, e.g. CHR-5' },
        sprint_id:   { type: 'string', description: 'Move issue to a different sprint (optional)' },
        title:       { type: 'string', description: 'Issue title (optional)' },
        category:    { type: 'string', description: 'Category name (optional)' },
        owner_id:    { type: ['string', 'null'], description: 'Owner user ID, or "me"; pass null to unassign (optional). Vendor is auto-set from owner.' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | review | pending | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        level:       { type: 'string', description: 'Level (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
        url:         { type: ['string', 'null'], description: 'Related URL; pass null to clear (optional)' },
        start_date:  { type: ['string', 'null'], description: 'Scheduled start date YYYY-MM-DD; pass null to clear. Needed together with end_date for the issue to appear on the Timeline/Gantt view.' },
        end_date:    { type: ['string', 'null'], description: 'Scheduled end date YYYY-MM-DD; pass null to clear. Must be on or after start_date. Needed together with start_date for the Timeline/Gantt view.' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'coyote_delete_issue',
    description: 'Delete an issue by slug. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Issue slug, e.g. CHR-5' },
      },
      required: ['slug'],
    },
  },
]

type Issue = {
  id: string; slug: string | null; title: string; status: string
  priority: string | null; owner_id: string | null; vendor: string | null
  start_date: string | null; end_date: string | null
}

async function resolveMe(client: CoyoteClient, value: string | undefined): Promise<string | undefined> {
  if (value === 'me') {
    const me = await client.get<{ id: string }>('/api/me')
    return me.id
  }
  return value
}

export async function handleIssue(name: string, args: Record<string, string | number | null>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_issues') {
    const query: Record<string, string> = {}
    if (args.project_id)  query.project_id  = String(args.project_id)
    if (args.sprint_id)   query.sprint_id   = String(args.sprint_id)
    if (args.status)      query.status      = String(args.status)
    if (args.vendor)      query.vendor      = String(args.vendor)
    if (args.category)    query.category    = String(args.category)
    if (args.q)           query.q           = String(args.q)
    const ownerId = await resolveMe(client, args.owner_id as string | undefined)
    if (ownerId) query.owner_id = ownerId

    const issues = await client.get<Issue[]>('/api/issues', query)
    if (issues.length === 0) return 'No issues found.'

    return issues.map(i =>
      `[${i.slug ?? i.id}] ${i.title} — status: ${i.status}${i.priority ? `, priority: ${i.priority}` : ''}${i.vendor ? `, vendor: ${i.vendor}` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_get_issue') {
    const issue = await client.get<Issue>(`/api/issues/${args.slug}`)
    return JSON.stringify(issue, null, 2)
  }

  if (name === 'coyote_create_issue') {
    const ownerId = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {
      sprint_id: args.sprint_id,
      title: args.title,
    }
    if (args.category    !== undefined) body.category  = args.category
    if (ownerId          !== undefined) body.owner_id  = ownerId ?? null
    if (args.status      !== undefined) body.status    = args.status
    if (args.priority    !== undefined) body.priority    = args.priority
    if (args.level       !== undefined) body.level       = args.level
    if (args.description !== undefined) body.description = args.description
    if (args.url         !== undefined) body.url         = args.url
    if (args.start_date  !== undefined) body.start_date  = args.start_date
    if (args.end_date    !== undefined) body.end_date    = args.end_date

    const issue = await client.post<Issue>('/api/issues', body)
    const dateWarning = (issue.start_date && issue.end_date)
      ? ''
      : '\n⚠️ This issue has no start_date/end_date (its sprint had none to inherit), so it will NOT appear on the Timeline/Gantt view. Consider setting both with coyote_update_issue.'
    return `✅ Issue created: ${issue.slug ?? issue.id} — ${issue.title}${dateWarning}`
  }

  if (name === 'coyote_update_issue') {
    const ownerId = await resolveMe(client, args.owner_id as string | undefined)
    const body: Record<string, unknown> = {}
    if (args.sprint_id   !== undefined) body.sprint_id = args.sprint_id
    if (args.title       !== undefined) body.title     = args.title
    if (args.category    !== undefined) body.category  = args.category
    if (ownerId          !== undefined) body.owner_id  = ownerId ?? null
    if (args.status      !== undefined) body.status    = args.status
    if (args.priority    !== undefined) body.priority    = args.priority
    if (args.level       !== undefined) body.level       = args.level
    if (args.description !== undefined) body.description = args.description
    if (args.url         !== undefined) body.url         = args.url
    if (args.start_date  !== undefined) body.start_date  = args.start_date
    if (args.end_date    !== undefined) body.end_date    = args.end_date

    const issue = await client.put<Issue>(`/api/issues/${args.slug}`, body)
    return `✅ Issue updated: ${issue.slug ?? issue.id} — ${issue.title} (status: ${issue.status})`
  }

  if (name === 'coyote_delete_issue') {
    await client.delete(`/api/issues/${args.slug}`)
    return `✅ Issue deleted: ${args.slug}`
  }

  throw new Error(`Unknown issue tool: ${name}`)
}
