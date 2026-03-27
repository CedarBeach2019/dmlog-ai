/**
 * Draft comparison — calls the provider with different system prompts
 * to generate multiple response variants for user selection.
 */
import { Hono } from 'hono';
import type { Env, Variables, ChatRequest, ProviderMessage } from '../../src/types.js';
import { chatStream, chat, ProviderError } from '../../src/providers/openai-compatible.js';
import { dehydrate, rehydrate } from '../../src/pii/engine.js';

const drafts = new Hono<{ Bindings: Env; Variables: Variables }>();

interface DraftProfile {
  id: string;
  name: string;
  systemSuffix: string;
  temperature: number;
}

const DEFAULT_PROFILES: DraftProfile[] = [
  {
    id: 'creative',
    name: 'Creative',
    systemSuffix: '\n\nAdditional instruction: Be creative, vivid, and detailed. Use rich descriptions and unexpected details. Take risks with the narrative.',
    temperature: 0.9,
  },
  {
    id: 'concise',
    name: 'Concise',
    systemSuffix: '\n\nAdditional instruction: Be concise and direct. Get to the point quickly. Use shorter descriptions. Focus on actionable information.',
    temperature: 0.5,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    systemSuffix: '\n\nAdditional instruction: Balance detail with brevity. Be vivid but efficient. Give the player clear options.',
    temperature: 0.7,
  },
];

drafts.post('/compare', async (c) => {
  const body = await c.req.json<ChatRequest & { profiles?: string[] }>().catch(() => null);
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: { message: 'messages array required' } }, 400);
  }

  const apiKey = c.env.DEEPSEEK_API_KEY;
  if (!apiKey) return c.json({ error: { message: 'DEEPSEEK_API_KEY not set' } }, 500);

  const userId = c.get('userId');
  const pids = Array.isArray(body.profiles) ? (body.profiles as string[]) : null;
  const profiles = pids
    ? DEFAULT_PROFILES.filter(p => pids.includes(p.id))
    : DEFAULT_PROFILES.slice(0, 2); // Default: creative + concise

  const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user');
  const maxTokens = body.max_tokens ?? 500;

  // Build base messages
  const baseMessages: ProviderMessage[] = [...body.messages];

  // Run providers in parallel
  const promises = profiles.map(async (profile) => {
    // Inject profile-specific system suffix
    const msgs: ProviderMessage[] = baseMessages.map(m => {
      if (m.role === 'system') {
        return { role: 'system' as const, content: m.content + profile.systemSuffix };
      }
      return m;
    });

    // If no system message, add one
    if (!msgs.find(m => m.role === 'system')) {
      msgs.unshift({ role: 'system' as const, content: profile.systemSuffix.trim() });
    }

    const startTime = Date.now();
    const result = await chat(msgs, undefined, c.env, {
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiKey,
      maxTokens,
      temperature: profile.temperature,
    });

    // PII rehydrate
    let content = result.content || '';
    const uid = typeof userId === 'string' ? userId : '';
    if (uid && c.env.DB) {
      content = await rehydrate(content, c.env.DB, uid);
    }

    return {
      id: `draft-${profile.id}-${Date.now()}`,
      profile: profile.id,
      profileName: profile.name,
      content,
      model: 'deepseek-chat',
      latencyMs: Date.now() - startTime,
      temperature: profile.temperature,
    };
  });

  const settled = await Promise.allSettled(promises);
  const draftResults: Array<{
    id: string; profile: string; profileName: string; content: string;
    model: string; latencyMs: number; temperature: number;
  }> = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') draftResults.push(r.value);
  }

  return c.json({ drafts: draftResults });
});

drafts.post('/winner/:draftId', async (c) => {
  const draftId = c.req.param('draftId');
  const body = await c.req.json<{ profile?: string; feedback?: string }>().catch(() => ({ profile: '' }));
  return c.json({ updated: draftId, profile: body.profile || 'unknown' });
});

export default drafts;
export { DEFAULT_PROFILES };
