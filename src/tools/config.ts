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
  // --- Patterns ---
  {
    name: 'coyote_list_patterns',
    description: 'List patterns, optionally filtered by category or level.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        level:    { type: 'string', description: 'Filter by level (optional)' },
      },
    },
  },
  {
    name: 'coyote_get_pattern',
    description: 'Get full details of a pattern by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Pattern ID' },
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
        role:     { type: 'string', description: 'Role (e.g. Dev, PM, BrSE) (optional)' },
        type:     { type: 'string', description: 'Activity type (e.g. development, review) (optional)' },
      },
      required: ['phase_id', 'name', 'phase'],
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
type Activity  = { id: string; name: string; phase: string | null; role: string | null; type: string | null; phase_id: string | null }
type Pattern   = { id: string; pattern: string; pattern_ja?: string | null; category?: string | null; level?: string | null; description?: string | null; sample_url?: string | null }

export async function handleConfig(name: string, args: Record<string, string | number | null>): Promise<string> {
  const client = new CoyoteClient()

  // Patterns
  if (name === 'coyote_list_patterns') {
    const query: Record<string, string> = {}
    if (args.category) query.category = String(args.category)
    if (args.level)    query.level    = String(args.level)
    const items = await client.get<Pattern[]>('/api/patterns', query)
    if (items.length === 0) return 'No patterns found.'
    return items.map(p =>
      `[${p.id}] ${p.pattern}${p.pattern_ja ? ` (${p.pattern_ja})` : ''}${p.category ? ` — ${p.category}` : ''}${p.level ? ` [${p.level}]` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_get_pattern') {
    const pattern = await client.get<Pattern>(`/api/patterns/${args.id}`)
    return JSON.stringify(pattern, null, 2)
  }

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
      `[${a.id}] ${a.name}${a.role ? ` [${a.role}]` : ''}${a.phase ? ` — ${a.phase}` : ''}${a.type ? ` (${a.type})` : ''}`
    ).join('\n')
  }

  if (name === 'coyote_create_activity') {
    const body: Record<string, unknown> = { phase_id: args.phase_id, name: args.name }
    if (args.phase) body.phase = args.phase
    if (args.role)  body.role  = args.role
    if (args.type)  body.type  = args.type
    const item = await client.post<Activity>('/api/activities', body)
    return `✅ Activity created: [${item.id}] ${item.name}`
  }

  if (name === 'coyote_update_activity') {
    const body: Record<string, unknown> = {}
    if (args.name     !== undefined) body.name     = args.name
    if (args.phase    !== undefined) body.phase    = args.phase
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
