/**
 * Session export — download conversation as markdown or JSON.
 */
import { Hono } from 'hono';
import type { Env, Variables } from '../../src/types.js';

const exportRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /v1/sessions/:id/export?format=md|json
exportRoutes.get('/:id/export', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');
  const format = c.req.query('format') || 'md';

  // Fetch session + messages
  const session = await c.env.DB.prepare(
    'SELECT id, summary, message_count, created_at, last_message_at FROM sessions WHERE id = ? AND user_id = ?',
  ).bind(sessionId, userId).first<{
    id: string; summary: string; message_count: number; created_at: string; last_message_at: string;
  }>();

  if (!session) {
    return c.json({ error: { message: 'Session not found' } }, 404);
  }

  const { results: messages } = await c.env.DB.prepare(
    'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
  ).bind(sessionId).all<{ role: string; content: string; created_at: string }>();

  const msgs = messages || [];

  if (format === 'json') {
    const data = {
      id: session.id,
      summary: session.summary,
      messageCount: session.message_count,
      createdAt: session.created_at,
      lastMessageAt: session.last_message_at,
      messages: msgs,
    };
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="session-${sessionId.slice(0, 8)}.json"`,
      },
    });
  }

  // Markdown format
  const lines: string[] = [];
  lines.push(`# ${session.summary || 'Untitled Session'}`);
  lines.push('');
  lines.push(`> Exported from DMlog.ai — ${new Date().toISOString()}`);
  lines.push(`> Messages: ${session.message_count} | Created: ${session.created_at}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of msgs) {
    const time = msg.created_at ? new Date(msg.created_at).toLocaleString() : '';
    if (msg.role === 'user') {
      lines.push(`### 👤 You${time ? ` — ${time}` : ''}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    } else if (msg.role === 'assistant') {
      lines.push(`### 🏰 DM${time ? ` — ${time}` : ''}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    } else {
      lines.push(`> *${msg.content}*`);
      lines.push('');
    }
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="session-${sessionId.slice(0, 8)}.md"`,
    },
  });
});

export default exportRoutes;
