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
        title:       { type: 'string', description: 'Issue title (optional)' },
        title_en:    { type: 'string', description: 'English title (optional)' },
        category:    { type: 'string', description: 'Category name (optional)' },
        vendor:      { type: 'string', description: 'Vendor name (optional)' },
        assignee_id: { type: 'string', description: 'Assignee user ID, or "me" (optional)' },
        status:      { type: 'string', description: 'Status: not_started | in_progress | complete | cancelled (optional)' },
        priority:    { type: 'string', description: 'Priority: Low | Mid | High (optional)' },
        weight:      { type: 'number', description: 'Effort weight (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
      },
      required: ['slug'],
    },
  },
]

type Issue = {
  id: string; slug: string | null; title: string; status: string
  priority: string | null; assignee_id: string | null
}

async function resolveMe(client: CoyoteClient, value: string | undefined): Promise<string | undefined> {
  if (value === 'me') {
    const me = await client.get<{ id: string }>('/api/me')
    return me.id
  }
  return value
}

export async function handleIssue(name: string, args: Record<string, string | number>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_issues') {
    const query: Record<string, string> = {}
    if (args.project_id)  query.project_id  = String(args.project_id)
    if (args.sprint_id)   query.sprint_id   = String(args.sprint_id)
    if (args.status)      query.status      = String(args.status)
    const assigneeId = await resolveMe(client, args.assignee_id as string | undefined)
    if (assigneeId) query.assignee_id = assigneeId

    const issues = await client.get<Issue[]>('/api/issues', query)
    if (issues.length === 0) return 'No issues found.'

    return issues.map(i =>
      `[${i.slug ?? i.id}] ${i.title} — status: ${i.status}${i.priority ? `, priority: ${i.priority}` : ''}`
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
    if (args.title_en)   body.title_en   = args.title_en
    if (args.category)   body.category   = args.category
    if (args.vendor)     body.vendor     = args.vendor
    if (assigneeId)      body.assignee_id = assigneeId
    if (args.status)     body.status     = args.status
    if (args.priority)   body.priority   = args.priority
    if (args.weight)     body.weight     = Number(args.weight)
    if (args.description) body.description = args.description

    const issue = await client.post<Issue>('/api/issues', body)
    return `✅ Issue created: ${issue.slug ?? issue.id} — ${issue.title}`
  }

  if (name === 'coyote_update_issue') {
    const assigneeId = await resolveMe(client, args.assignee_id as string | undefined)
    const body: Record<string, unknown> = {}
    if (args.title)       body.title       = args.title
    if (args.title_en)    body.title_en    = args.title_en
    if (args.category)    body.category    = args.category
    if (args.vendor)      body.vendor      = args.vendor
    if (assigneeId)       body.assignee_id = assigneeId
    if (args.status)      body.status      = args.status
    if (args.priority)    body.priority    = args.priority
    if (args.weight)      body.weight      = Number(args.weight)
    if (args.description) body.description = args.description

    const issue = await client.put<Issue>(`/api/issues/${args.slug}`, body)
    return `✅ Issue updated: ${issue.slug ?? issue.id} — ${issue.title} (status: ${issue.status})`
  }

  throw new Error(`Unknown issue tool: ${name}`)
}
