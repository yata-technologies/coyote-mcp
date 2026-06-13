// Copyright (c) 2026 YATA Technologies
// SPDX-License-Identifier: MIT

import { CoyoteClient } from '../lib/client.js'

export const commentTools = [
  {
    name: 'coyote_list_comments',
    description: 'List the comment thread for a single Issue or Task (flat, chronological). Any project member may read.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entity_type: { type: 'string', description: 'Parent entity type: issue | task' },
        entity_id:   { type: 'string', description: 'Parent entity UUID (issues.id or tasks.id)' },
      },
      required: ['entity_type', 'entity_id'],
    },
  },
  {
    name: 'coyote_create_comment',
    description: 'Add a comment to an Issue or Task. Any project member. The author is the authenticated user.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        entity_type: { type: 'string', description: 'Parent entity type: issue | task' },
        entity_id:   { type: 'string', description: 'Parent entity UUID (issues.id or tasks.id)' },
        body:        { type: 'string', description: 'Comment text' },
      },
      required: ['entity_type', 'entity_id', 'body'],
    },
  },
  {
    name: 'coyote_update_comment',
    description: 'Edit a comment body. Owner-or-manager only. Backlog-sourced comments are read-only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id:   { type: 'string', description: 'Comment UUID' },
        body: { type: 'string', description: 'New comment text' },
      },
      required: ['id', 'body'],
    },
  },
  {
    name: 'coyote_delete_comment',
    description: 'Delete a comment. Owner-or-manager only. Backlog-sourced comments are read-only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'Comment UUID' },
      },
      required: ['id'],
    },
  },
]

type Comment = {
  id: string
  created_at: string
  entity_type: string
  entity_id: string
  author_id: string | null
  body: string
  source: string
  author_name: string | null
}

function formatComment(c: Comment): string {
  const author = c.author_name ?? '(unknown)'
  const ro = c.source !== 'coyote' ? ` [${c.source}, read-only]` : ''
  return `[${c.id}] ${author} @ ${c.created_at}${ro}\n${c.body}`
}

export async function handleComment(name: string, args: Record<string, string>): Promise<string> {
  const client = new CoyoteClient()

  if (name === 'coyote_list_comments') {
    const comments = await client.get<Comment[]>('/api/comments', {
      entity_type: args.entity_type,
      entity_id: args.entity_id,
    })
    if (comments.length === 0) return 'No comments found.'
    return comments.map(formatComment).join('\n\n')
  }

  if (name === 'coyote_create_comment') {
    const comment = await client.post<Comment>('/api/comments', {
      entity_type: args.entity_type,
      entity_id: args.entity_id,
      body: args.body,
    })
    return `✅ Comment added: [${comment.id}] on ${comment.entity_type} ${comment.entity_id}`
  }

  if (name === 'coyote_update_comment') {
    const comment = await client.put<Comment>(`/api/comments/${args.id}`, { body: args.body })
    return `✅ Comment updated: [${comment.id}]`
  }

  if (name === 'coyote_delete_comment') {
    await client.delete(`/api/comments/${args.id}`)
    return `✅ Comment deleted: ${args.id}`
  }

  throw new Error(`Unknown comment tool: ${name}`)
}
