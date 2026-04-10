import { CoyoteClient } from '../lib/client.js'

export const issueTools = [
  {
    name: 'coyote_list_issues',
    description: 'List issues, optionally filtered by project, sprint, owner, or status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        owner_id:   { type: 'string', description: 'Filter by owner user ID, or "me" for current user (optional)' },
        status:     { type: 'string', description: 'Filter by status (optional)' },
        vendor:     { type: 'string', description: 'Filter by vendor name (optional)' },
        category:   { type: 'string', description: 'Filter by category name (optional)' },
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
    description: 'Create a new issue in a sprint.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sprint_id:   { type: 'string', description: 'Sprint ID to create the issue in' },
        title:       { type: 'string', description: 'Issue title' },
        category:    { type: 'string', description: 'Category name (optional)' },
        owner_id:    { type: 'string', description: 'Owner user ID, or "me" (optional). Vendor is auto-set from owner.' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | review | pending | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        level:       { type: 'string', description: 'Level (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
        url:         { type: 'string', description: 'Related URL (optional)' },
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

    const issue = await client.post<Issue>('/api/issues', body)
    return `✅ Issue created: ${issue.slug ?? issue.id} — ${issue.title}`
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

    const issue = await client.put<Issue>(`/api/issues/${args.slug}`, body)
    return `✅ Issue updated: ${issue.slug ?? issue.id} — ${issue.title} (status: ${issue.status})`
  }

  if (name === 'coyote_delete_issue') {
    await client.delete(`/api/issues/${args.slug}`)
    return `✅ Issue deleted: ${args.slug}`
  }

  throw new Error(`Unknown issue tool: ${name}`)
}
