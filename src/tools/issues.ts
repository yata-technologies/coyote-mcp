import { CoyoteClient } from '../lib/client.js'

export const issueTools = [
  {
    name: 'list_issues',
    description: 'List issues, optionally filtered by project or sprint.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        sprint_id:  { type: 'string', description: 'Filter by sprint ID (optional)' },
        status:     { type: 'string', description: 'Filter by status (optional)' },
      },
    },
  },
  {
    name: 'get_issue',
    description: 'Get full details of an issue by its slug (e.g. CHR-5).',
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
  priority: string | null; assignee_id: string | null
}

export async function handleIssue(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'list_issues') {
    const query: Record<string, string> = {}
    if (args.project_id) query.project_id = args.project_id
    if (args.sprint_id)  query.sprint_id  = args.sprint_id
    if (args.status)     query.status     = args.status

    const issues = await client.get<Issue[]>('/api/issues', query)
    if (issues.length === 0) return 'No issues found.'

    return issues.map(i =>
      `[${i.slug ?? i.id}] ${i.title} — status: ${i.status}${i.priority ? `, priority: ${i.priority}` : ''}`
    ).join('\n')
  }

  if (name === 'get_issue') {
    const issue = await client.get<Issue>(`/api/issues/${args.slug}`)
    return JSON.stringify(issue, null, 2)
  }

  throw new Error(`Unknown issue tool: ${name}`)
}
