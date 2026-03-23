import { CoyoteClient } from '../lib/client.js'

export const configTools = [
  // --- Categories ---
  {
    name: 'coyote_list_categories',
    description: 'List categories for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'coyote_create_category',
    description: 'Create a new category in a project. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name:       { type: 'string', description: 'Category name' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'coyote_update_category',
    description: 'Update a category. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:        { type: 'string', description: 'Category ID' },
        name:      { type: 'string', description: 'Category name (optional)' },
        is_active: { type: 'number', description: '1 = active, 0 = inactive (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_delete_category',
    description: 'Delete a category. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Category ID' },
      },
      required: ['id'],
    },
  },
  // --- Phases ---
  {
    name: 'coyote_list_phases',
    description: 'List phases for a project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'coyote_create_phase',
    description: 'Create a new phase in a project. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name:       { type: 'string', description: 'Phase name' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'coyote_update_phase',
    description: 'Update a phase. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:        { type: 'string', description: 'Phase ID' },
        name:      { type: 'string', description: 'Phase name (optional)' },
        is_active: { type: 'number', description: '1 = active, 0 = inactive (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_delete_phase',
    description: 'Delete a phase. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Phase ID' },
      },
      required: ['id'],
    },
  },
  // --- Activities ---
  {
    name: 'coyote_list_activities',
    description: 'List activities, optionally filtered by project or phase.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Filter by project ID (optional)' },
        phase_id:   { type: 'string', description: 'Filter by phase ID (optional)' },
      },
    },
  },
  {
    name: 'coyote_create_activity',
    description: 'Create a new activity under a phase. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        phase_id: { type: 'string', description: 'Phase ID' },
        name:     { type: 'string', description: 'Activity name' },
        phase:    { type: 'string', description: 'Phase label (e.g. コーディング)' },
        code:     { type: 'string', description: 'Activity code (e.g. CD01)' },
        role:     { type: 'string', description: 'Role (e.g. Dev, PM, BrSE)' },
        type:     { type: 'string', description: 'Activity type (e.g. development, review)' },
      },
      required: ['phase_id', 'name', 'phase', 'code', 'role', 'type'],
    },
  },
  {
    name: 'coyote_update_activity',
    description: 'Update an activity. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:       { type: 'string', description: 'Activity ID' },
        name:     { type: 'string', description: 'Activity name (optional)' },
        phase:    { type: 'string', description: 'Phase label (optional)' },
        code:     { type: 'string', description: 'Activity code (optional)' },
        role:     { type: 'string', description: 'Role (optional)' },
        type:     { type: 'string', description: 'Activity type (optional)' },
        phase_id: { type: 'string', description: 'Phase ID (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'coyote_delete_activity',
    description: 'Delete an activity. Requires project admin or manager role.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Activity ID' },
      },
      required: ['id'],
    },
  },
]

type Category = { id: string; name: string; sort_order: number; is_active: number }
type Phase     = { id: string; name: string; sort_order: number; is_active: number }
type Activity  = { id: string; name: string; phase: string | null; code: string | null; role: string | null; type: string | null; phase_id: string | null }

export async function handleConfig(name: string, args: Record<string, string | number | null>): Promise<string> {
  const client = new CoyoteClient()

  // Categories
  if (name === 'coyote_list_categories') {
    const items = await client.get<Category[]>('/api/categories', { project_id: String(args.project_id) })
    if (items.length === 0) return 'No categories found.'
    return items.map(c => `[${c.id}] ${c.name}${c.is_active === 0 ? ' (inactive)' : ''}`).join('\n')
  }

  if (name === 'coyote_create_category') {
    const item = await client.post<Category>('/api/categories', { project_id: args.project_id, name: args.name })
    return `✅ Category created: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_update_category') {
    const body: Record<string, unknown> = {}
    if (args.name !== undefined)      body.name      = args.name
    if (args.is_active !== undefined) body.is_active = Number(args.is_active)
    const item = await client.put<Category>(`/api/categories/${args.id}`, body)
    return `✅ Category updated: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_delete_category') {
    await client.delete(`/api/categories/${args.id}`)
    return `✅ Category deleted: ${args.id}`
  }

  // Phases
  if (name === 'coyote_list_phases') {
    const items = await client.get<Phase[]>('/api/phases', { project_id: String(args.project_id) })
    if (items.length === 0) return 'No phases found.'
    return items.map(p => `[${p.id}] ${p.name}${p.is_active === 0 ? ' (inactive)' : ''}`).join('\n')
  }

  if (name === 'coyote_create_phase') {
    const item = await client.post<Phase>('/api/phases', { project_id: args.project_id, name: args.name })
    return `✅ Phase created: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_update_phase') {
    const body: Record<string, unknown> = {}
    if (args.name !== undefined)      body.name      = args.name
    if (args.is_active !== undefined) body.is_active = Number(args.is_active)
    const item = await client.put<Phase>(`/api/phases/${args.id}`, body)
    return `✅ Phase updated: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_delete_phase') {
    await client.delete(`/api/phases/${args.id}`)
    return `✅ Phase deleted: ${args.id}`
  }

  // Activities
  if (name === 'coyote_list_activities') {
    const query: Record<string, string> = {}
    if (args.project_id) query.project_id = String(args.project_id)
    if (args.phase_id)   query.phase_id   = String(args.phase_id)
    const items = await client.get<Activity[]>('/api/activities', query)
    if (items.length === 0) return 'No activities found.'
    return items.map(a =>
      `[${a.id}] ${a.name}${a.code ? ` (${a.code})` : ''}${a.role ? ` [${a.role}]` : ''}${a.phase ? ` — ${a.phase}` : ''}${a.type ? ` (${a.type})` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_create_activity') {
    const body: Record<string, unknown> = { phase_id: args.phase_id, name: args.name }
    if (args.phase) body.phase = args.phase
    if (args.code)  body.code  = args.code
    if (args.role)  body.role  = args.role
    if (args.type)  body.type  = args.type
    const item = await client.post<Activity>('/api/activities', body)
    return `✅ Activity created: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_update_activity') {
    const body: Record<string, unknown> = {}
    if (args.name     !== undefined) body.name     = args.name
    if (args.phase    !== undefined) body.phase    = args.phase
    if (args.code     !== undefined) body.code     = args.code
    if (args.role     !== undefined) body.role     = args.role
    if (args.type     !== undefined) body.type     = args.type
    if (args.phase_id !== undefined) body.phase_id = args.phase_id
    const item = await client.put<Activity>(`/api/activities/${args.id}`, body)
    return `✅ Activity updated: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_delete_activity') {
    await client.delete(`/api/activities/${args.id}`)
    return `✅ Activity deleted: ${args.id}`
  }

  throw new Error(`Unknown config tool: ${name}`)
}
