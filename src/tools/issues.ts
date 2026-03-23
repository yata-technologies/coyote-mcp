import { CoyoteClient } from '../lib/client.js'

export const issueTools = [
  {
    name: 'coyote_list_issues',
    description: 'List issues, optionally filtered by project, sprint, assignee, or status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id:  { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:   { type: 'string', description: 'Filter by sprint ID (optional)' },
        assignee_id: { type: 'string', description: 'Filter by assignee user ID, or "me" for current user (optional)' },
        status:      { type: 'string', description: 'Filter by status (optional)' },
        vendor:      { type: 'string', description: 'Filter by vendor name (optional)' },
        category:    { type: 'string', description: 'Filter by category name (optional)' },
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
        title_en:    { type: 'string', description: 'English title (optional)' },
        category:    { type: 'string', description: 'Category name (optional)' },
        vendor:      { type: 'string', description: 'Vendor name (optional)' },
        assignee_id: { type: 'string', description: 'Assignee user ID, or "me" (optional)' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        level:       { type: 'string', description: 'Level (optional)' },
        weight:      { type: 'number', description: 'Effort weight (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
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
        title_en:    { type: 'string', description: 'English title (optional)' },
        category:    { type: 'string', description: 'Category name (optional)' },
        vendor:      { type: 'string', description: 'Vendor name (optional)' },
        assignee_id: { type: ['string', 'null'], description: 'Assignee user ID, or "me"; pass null to unassign (optional)' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        level:       { type: 'string', description: 'Level (optional)' },
        weight:      { type: 'number', description: 'Effort weight (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
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
  priority: string | null; assignee_id: string | null; vendor: string | null
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
    const assigneeId = await resolveMe(client, args.assignee_id as string | undefined)
    if (assigneeId) query.assignee_id = assigneeId

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
    const assigneeId = await resolveMe(client, args.assignee_id as string | undefined)
    const body: Record<string, unknown> = {
      sprint_id: args.sprint_id,
      title: args.title,
    }
    if (args.title_en    !== undefined) body.title_en    = args.title_en
    if (args.category    !== undefined) body.category    = args.category
    if (args.vendor      !== undefined) body.vendor      = args.vendor
    if (assigneeId       !== undefined) body.assignee_id = assigneeId ?? null
    if (args.status      !== undefined) body.status      = args.status
    if (args.priority    !== undefined) body.priority    = args.priority
    if (args.level       !== undefined) body.level       = args.level
    if (args.weight      !== undefined) body.weight      = Number(args.weight)
    if (args.description !== undefined) body.description = args.description

    const issue = await client.post<Issue>('/api/issues', body)
    return `✅ Issue created: ${issue.slug ?? issue.id} — ${issue.title}`
  }

  if (name === 'coyote_update_issue') {
    const assigneeId = await resolveMe(client, args.assignee_id as string | undefined)
    const body: Record<string, unknown> = {}
    if (args.sprint_id   !== undefined) body.sprint_id   = args.sprint_id
    if (args.title       !== undefined) body.title       = args.title
    if (args.title_en    !== undefined) body.title_en    = args.title_en
    if (args.category    !== undefined) body.category    = args.category
    if (args.vendor      !== undefined) body.vendor      = args.vendor
    if (assigneeId       !== undefined) body.assignee_id = assigneeId ?? null
    if (args.status      !== undefined) body.status      = args.status
    if (args.priority    !== undefined) body.priority    = args.priority
    if (args.level       !== undefined) body.level       = args.level
    if (args.weight      !== undefined) body.weight      = Number(args.weight)
    if (args.description !== undefined) body.description = args.description

    const issue = await client.put<Issue>(`/api/issues/${args.slug}`, body)
    return `✅ Issue updated: ${issue.slug ?? issue.id} — ${issue.title} (status: ${issue.status})`
  }

  if (name === 'coyote_delete_issue') {
    await client.delete(`/api/issues/${args.slug}`)
    return `✅ Issue deleted: ${args.slug}`
  }

  throw new Error(`Unknown issue tool: ${name}`)
}
