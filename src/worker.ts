/**
 * DMLogWorker — Main Cloudflare Worker for DMLog.ai.
 *
 * Handles all HTTP requests and WebSocket connections.
 * Routes: static assets, campaign CRUD API, chat API, and real-time WebSocket game sessions.
 *
 * Environment bindings:
 *   WORLD_STATE  — KV namespace for world state data
 *   CAMPAIGNS    — KV namespace for campaign metadata
 *   SESSIONS     — KV namespace for session tokens / rate limiting
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Env {
  WORLD_STATE: KVNamespace;
  CAMPAIGNS: KVNamespace;
  SESSIONS: KVNamespace;
  LLM_PROVIDER: string;       // 'openai' | 'anthropic' | 'deepseek'
  LLM_API_KEY: string;
  LLM_MODEL: string;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

interface CampaignMeta {
  id: string;
  name: string;
  system: string;              // e.g. "D&D 5e", "Pathfinder 2e"
  createdAt: number;
  updatedAt: number;
  characterCount: number;
  sessionCount: number;
}

interface WorldState {
  campaignId: string;
  characters: Character[];
  npcs: Npc[];
  locations: Location[];
  quests: Quest[];
  combat: CombatState | null;
  narrativeLog: NarrativeEntry[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    turnCount: number;
    currentScene: string;
  };
}

interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  stats: Record<string, number>;
  inventory: string[];
}

interface Npc {
  id: string;
  name: string;
  race: string;
  disposition: string;
  hp?: number;
  maxHp?: number;
  ac?: number;
  notes: string;
}

interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  discovered: boolean;
}

interface Quest {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'complete' | 'failed';
  objectives: string[];
}

interface CombatState {
  active: boolean;
  round: number;
  turnOrder: string[];
  currentTurnIndex: number;
  participants: CombatParticipant[];
}

interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  conditions: string[];
}

interface NarrativeEntry {
  turn: number;
  timestamp: number;
  playerAction: string;
  dmNarration: string;
  stateChanges: string[];
}

interface ChatRequest {
  campaignId?: string;
  message: string;
  characterId?: string;
}

interface CanonFact {
  subject: string;
  fact: string;
  source: string;
  timestamp: number;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// DM Personality
// ---------------------------------------------------------------------------

const DM_PERSONALITY = `You are the Dungeon Master for a tabletop RPG campaign. You are:

- An immersive storyteller who paints vivid scenes
- A fair rules arbiter who knows the game system thoroughly
- Adaptive — you match the tone the players set (serious, humorous, heroic)
- Responsive to player agency — you never railroad, you react

You narrate in second person present tense ("You step into the chamber...").
You keep descriptions concise but evocative. You name NPCs, describe smells and sounds.
You track the rules but don't bog down gameplay — quick rulings, look up details later if needed.

Format entity mentions: @NPC for characters, *Location Name* for places, [Item Name] for objects.`;

// ---------------------------------------------------------------------------
// Intent Extraction
// ---------------------------------------------------------------------------

type PlayerIntent =
  | 'move'
  | 'attack'
  | 'cast_spell'
  | 'skill_check'
  | 'talk'
  | 'interact'
  | 'rest'
  | 'inventory'
  | 'explore'
  | 'meta';

const INTENT_KEYWORDS: Record<PlayerIntent, string[]> = {
  move:        ['go', 'walk', 'move', 'enter', 'leave', 'head', 'run', 'climb', 'travel', 'north', 'south', 'east', 'west'],
  attack:      ['attack', 'hit', 'strike', 'slash', 'stab', 'shoot', 'punch', 'kick', 'smite'],
  cast_spell:  ['cast', 'spell', 'fireball', 'heal', 'magic', 'invoke', 'channel'],
  skill_check: ['check', 'roll', 'perception', 'investigation', 'stealth', 'persuasion', 'deception', 'insight', 'athletics', 'acrobatics', 'arcana', 'history', 'nature', 'religion'],
  talk:        ['talk', 'speak', 'say', 'ask', 'tell', 'greet', 'shout', 'whisper', 'convince', 'intimidate', 'plead'],
  interact:    ['open', 'close', 'pick up', 'use', 'touch', 'pull', 'push', 'read', 'examine', 'search', 'lock', 'unlock', 'drink', 'eat'],
  rest:        ['rest', 'sleep', 'short rest', 'long rest', 'camp', 'meditate', 'recover'],
  inventory:   ['inventory', 'items', 'equipment', 'equip', 'unequip', 'drop', 'bag', 'pack'],
  explore:     ['look', 'examine', 'search', 'inspect', 'listen', 'investigate', 'scan', 'survey'],
  meta:        ['rules', 'help', 'undo', 'save', 'pause', 'who', 'status', 'hp'],
};

function extractIntent(message: string): PlayerIntent {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return intent as PlayerIntent;
    }
  }
  return 'explore';
}

// ---------------------------------------------------------------------------
// Rules Engine (simplified)
// ---------------------------------------------------------------------------

function resolveSkillCheck(difficulty: 'easy' | 'medium' | 'hard' | 'very_hard' | 'nearly_impossible'): number {
  const dcMap: Record<string, number> = {
    easy: 10,
    medium: 15,
    hard: 20,
    very_hard: 25,
    nearly_impossible: 30,
  };
  return dcMap[difficulty] ?? 15;
}

function resolveDamage(weaponDice: string, modifier: number, isCritical: boolean): { total: number; rolls: number[] } {
  const match = weaponDice.match(/^(\d+)d(\d+)$/);
  if (!match) return { total: modifier, rolls: [] };

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const multiplier = isCritical ? 2 : 1;
  const rolls: number[] = [];

  for (let i = 0; i < count * multiplier; i++) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    rolls.push((buffer[0] % sides) + 1);
  }

  return { total: rolls.reduce((s, r) => s + r, 0) + modifier, rolls };
}

// ---------------------------------------------------------------------------
// LLM Integration
// ---------------------------------------------------------------------------

async function callLLM(messages: LLMMessage[], env: Env, stream?: (chunk: string) => void): Promise<string> {
  const provider = (env.LLM_PROVIDER || 'openai').toLowerCase();
  const apiKey = env.LLM_API_KEY;
  const model = env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return generateFallbackNarration(messages);
  }

  try {
    if (provider === 'anthropic') {
      return await callAnthropic(messages, apiKey, model, stream);
    }
    // Default: OpenAI-compatible (covers OpenAI and DeepSeek)
    return await callOpenAICompatible(messages, apiKey, model, provider, stream);
  } catch (err) {
    console.error(`[DMLog] LLM call failed (${provider}):`, err);
    return generateFallbackNarration(messages);
  }
}

async function callOpenAICompatible(
  messages: LLMMessage[],
  apiKey: string,
  model: string,
  provider: string,
  stream?: (chunk: string) => void,
): Promise<string> {
  const baseUrl = provider === 'deepseek'
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.8,
    stream: !!stream,
  });

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`LLM API returned ${response.status}: ${await response.text()}`);
  }

  if (stream && response.body) {
    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content ?? '';
          if (content) {
            fullText += content;
            stream(content);
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
    return fullText;
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(
  messages: LLMMessage[],
  apiKey: string,
  model: string,
  stream?: (chunk: string) => void,
): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemMsg,
      messages: userMessages,
      stream: !!stream,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API returned ${response.status}: ${await response.text()}`);
  }

  if (stream && response.body) {
    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.type === 'content_block_delta') {
            const content = parsed.delta?.text ?? '';
            if (content) {
              fullText += content;
              stream(content);
            }
          }
        } catch { /* skip */ }
      }
    }
    return fullText;
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content?.[0]?.text ?? '';
}

function generateFallbackNarration(messages: LLMMessage[]): string {
  const userMsg = messages.findLast(m => m.role === 'user');
  const action = userMsg?.content ?? 'take an action';

  const templates = [
    `The air shifts as you ${action}. Shadows dance along the stone walls, and the faint scent of old parchment reaches your nose. Something about this moment feels significant — the weight of a decision yet to unfold hangs before you.`,
    `You ${action}. The world responds in kind — a distant echo, a flickering torch, the feeling of unseen eyes upon you. The path ahead branches, and your instincts tell you to choose carefully.`,
    `With purpose, you ${action}. The dungeon breathes around you, ancient and patient. @A mysterious voice echoes from the darkness ahead: "Another soul ventures forth... how delightful."`,
  ];

  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return templates[buffer[0] % templates.length];
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

async function checkRateLimit(sessionId: string, env: Env): Promise<boolean> {
  const key = `rate:${sessionId}`;
  const current = parseInt(await env.SESSIONS.get(key) ?? '0', 10);
  if (current >= 30) return false; // 30 requests per minute
  await env.SESSIONS.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}

// ---------------------------------------------------------------------------
// Campaign Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, b => b.toString(16).padStart(2, '0')).join('');
}

async function getCampaignList(env: Env): Promise<CampaignMeta[]> {
  const raw = await env.CAMPAIGNS.get('index');
  return raw ? JSON.parse(raw) as CampaignMeta[] : [];
}

async function saveCampaignList(list: CampaignMeta[], env: Env): Promise<void> {
  await env.CAMPAIGNS.put('index', JSON.stringify(list));
}

function createDefaultWorldState(campaignId: string): WorldState {
  return {
    campaignId,
    characters: [],
    npcs: [],
    locations: [{
      id: generateId(),
      name: 'The Starting Point',
      description: 'A dimly lit chamber with stone walls. A single torch flickers, casting long shadows. Two passages lead deeper into darkness.',
      connections: [],
      discovered: true,
    }],
    quests: [],
    combat: null,
    narrativeLog: [],
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      turnCount: 0,
      currentScene: 'The Starting Point',
    },
  };
}

// ---------------------------------------------------------------------------
// Canon System — DM Consistency
// ---------------------------------------------------------------------------

async function getCanon(campaignId: string, env: Env): Promise<CanonFact[]> {
  const raw = await env.WORLD_STATE.get(`campaign:${campaignId}:canon`);
  return raw ? JSON.parse(raw) as CanonFact[] : [];
}

async function saveCanon(campaignId: string, canon: CanonFact[], env: Env): Promise<void> {
  await env.WORLD_STATE.put(`campaign:${campaignId}:canon`, JSON.stringify(canon));
}

function extractFactsFromNarration(narration: string): CanonFact[] {
  const facts: CanonFact[] = [];
  // Extract named entity facts: "Grimjaw is a troll", "Eldrin lives in Brindenford"
  const namedFactPattern = /([A-Z][a-zA-Z\s]+?)\s+(?:is|was|has|owns|lives|wields|wears|carries|killed|died|gave|took)\s+([^.]+)/g;
  let match;
  while ((match = namedFactPattern.exec(narration)) !== null) {
    const subject = match[1].trim();
    if (subject.length < 2 || subject.length > 40) continue;
    facts.push({
      subject,
      fact: `${subject} ${match[0].slice(subject.length).trim()}`,
      source: 'dm_narration',
      timestamp: Date.now(),
    });
  }
  return facts;
}

async function checkCanonConsistency(
  campaignId: string,
  playerMessage: string,
  proposedNarration: string,
  env: Env,
): Promise<string | null> {
  const canon = await getCanon(campaignId, env);
  if (canon.length === 0) return null;

  // Check if the proposed narration contradicts any established canon
  const lowerNarration = proposedNarration.toLowerCase();
  for (const fact of canon) {
    const subject = fact.subject.toLowerCase();
    // If the narration mentions a canon subject, verify it doesn't contradict
    if (lowerNarration.includes(subject)) {
      const canonFact = fact.fact.toLowerCase();
      // Simple contradiction detection: death, location change, identity change
      const deathWords = ['dies', 'is killed', 'falls dead', 'slain'];
      const wasDead = deathWords.some(w => canonFact.includes(w));
      if (wasDead && !lowerNarration.includes('ghost') && !lowerNarration.includes('spirit') && !lowerNarration.includes('undead')) {
        // Check if the narration treats a dead character as alive
        const aliveIndicators = ['smiles', 'nods', 'speaks', 'walks', 'runs', 'attacks'];
        if (aliveIndicators.some(a => lowerNarration.includes(subject) && lowerNarration.includes(a))) {
          return `Canon violation: ${fact.subject} is established as dead (${fact.fact}) but narrated as alive.`;
        }
      }
    }
  }
  return null;
}

async function updateCanonFromNarration(campaignId: string, narration: string, env: Env): Promise<void> {
  const newFacts = extractFactsFromNarration(narration);
  if (newFacts.length === 0) return;

  const canon = await getCanon(campaignId, env);
  // Merge: update existing subjects, add new ones (max 200 facts)
  for (const fact of newFacts) {
    const existing = canon.findIndex(f => f.subject.toLowerCase() === fact.subject.toLowerCase());
    if (existing >= 0) {
      // Only update if the new fact is more recent and not identical
      if (fact.timestamp > canon[existing].timestamp) {
        canon[existing] = fact;
      }
    } else {
      canon.push(fact);
    }
  }

  // Keep canon bounded
  while (canon.length > 200) {
    canon.shift();
  }

  await saveCanon(campaignId, canon, env);
}

// ---------------------------------------------------------------------------
// Snapshot Helpers
// ---------------------------------------------------------------------------

function generateSnapshotSummary(state: WorldState): string {
  const chars = state.characters.map(c => `${c.name} (Lv${c.level} ${c.race} ${c.class})`).join(', ') || 'No characters';
  const quests = state.quests.filter(q => q.status === 'active').map(q => q.name).join(', ') || 'None';
  const npcs = state.npcs.map(n => n.name).join(', ') || 'None';
  return `Scene: ${state.metadata.currentScene} | Characters: ${chars} | Quests: ${quests} | NPCs: ${npcs} | Turn: ${state.metadata.turnCount}`;
}

function formatSnapshotText(snapshot: { campaignId: string; capturedAt: number; worldState: WorldState; canon: CanonFact[]; summary: string }): string {
  const s = snapshot.worldState;
  const lines = [
    `=== DMLog.ai Campaign Snapshot ===`,
    `Campaign: ${snapshot.campaignId}`,
    `Captured: ${new Date(snapshot.capturedAt).toISOString()}`,
    ``,
    `--- World State ---`,
    `Scene: ${s.metadata.currentScene}`,
    `Turn: ${s.metadata.turnCount}`,
    ``,
    `--- Characters ---`,
    ...s.characters.map(c => `  ${c.name}: Lv${c.level} ${c.race} ${c.class} | HP ${c.hp}/${c.maxHp} | AC ${c.ac}`),
    s.characters.length === 0 ? '  (none)' : '',
    ``,
    `--- Active Quests ---`,
    ...s.quests.filter(q => q.status === 'active').map(q => `  ${q.name}: ${q.description}`),
    ``,
    `--- NPCs ---`,
    ...s.npcs.map(n => `  ${n.name} (${n.race}) - ${n.disposition}`),
    ``,
    `--- Recent Narrative ---`,
    ...s.narrativeLog.slice(-3).map(e => `[Turn ${e.turn}] Player: ${e.playerAction}\n  DM: ${e.dmNarration.slice(0, 200)}`),
    ``,
    `--- Canon (${snapshot.canon.length} facts) ---`,
    ...snapshot.canon.slice(-10).map(f => `  - ${f.fact}`),
    ``,
    `=== End Snapshot ===`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Fantasy-Themed Error Messages
// ---------------------------------------------------------------------------

const FANTASY_ERRORS: Record<string, string> = {
  not_found:      'The ancient scrolls reveal no such path. This route does not exist in this realm.',
  no_campaign:    'The campaign chronicles are empty. No such tale has been recorded.',
  bad_request:    'The spell fizzles. Your request lacks the proper incantation.',
  rate_limited:   'The spirits grow weary of your rapid queries. Pause, and try again in a moment.',
  internal:       'A disturbance in the arcane weave! Something went wrong in the aether.',
  no_character:   'No hero steps forward from the shadows. Please specify a character.',
};

function errorResponse(status: number, key: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: FANTASY_ERRORS[key] ?? key, code: key }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ---------------------------------------------------------------------------
// HTTP Handler
// ---------------------------------------------------------------------------

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // ----- Static asset routes -----

  if (path === '/' && request.method === 'GET') {
    return serveStatic('index.html', 'text/html');
  }
  if (path === '/app' && request.method === 'GET') {
    return serveStatic('app.html', 'text/html');
  }
  if (path === '/css/style.css' && request.method === 'GET') {
    return serveStatic('style.css', 'text/css');
  }
  if (path === '/js/app.js' && request.method === 'GET') {
    return serveStatic('app.js', 'application/javascript');
  }

  // ----- API: Campaign list (GET) and create (POST) -----

  if (path === '/api/campaign' && request.method === 'GET') {
    const campaigns = await getCampaignList(env);
    return new Response(JSON.stringify({ campaigns }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  if (path === '/api/campaign' && request.method === 'POST') {
    try {
      const body = await request.json() as { name?: string; system?: string };
      if (!body.name) return errorResponse(400, 'bad_request');

      const id = generateId();
      const campaign: CampaignMeta = {
        id,
        name: body.name,
        system: body.system ?? 'D&D 5e',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        characterCount: 0,
        sessionCount: 0,
      };

      const list = await getCampaignList(env);
      list.push(campaign);
      await saveCampaignList(list, env);

      const state = createDefaultWorldState(id);
      await env.WORLD_STATE.put(`campaign:${id}`, JSON.stringify(state));

      return new Response(JSON.stringify({ campaign, state }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    } catch {
      return errorResponse(400, 'bad_request');
    }
  }

  // ----- API: Campaign by ID -----

  const campaignMatch = path.match(/^\/api\/campaign\/([a-f0-9]+)$/);
  if (campaignMatch) {
    const campaignId = campaignMatch[1];

    if (request.method === 'GET') {
      const raw = await env.WORLD_STATE.get(`campaign:${campaignId}`);
      if (!raw) return errorResponse(404, 'no_campaign');
      return new Response(raw, {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    if (request.method === 'DELETE') {
      const list = await getCampaignList(env);
      const filtered = list.filter(c => c.id !== campaignId);
      await saveCampaignList(filtered, env);
      await env.WORLD_STATE.delete(`campaign:${campaignId}`);
      return new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }
  }

  // ----- API: Campaign Snapshot -----

  const snapshotMatch = path.match(/^\/api\/campaign\/([a-f0-9]+)\/snapshot$/);
  if (snapshotMatch && request.method === 'POST') {
    const campaignId = snapshotMatch[1];
    try {
      const raw = await env.WORLD_STATE.get(`campaign:${campaignId}`);
      if (!raw) return errorResponse(404, 'no_campaign');
      const state: WorldState = JSON.parse(raw);

      // Load canon
      const canon = await getCanon(campaignId, env);

      // Build snapshot
      const snapshot = {
        campaignId,
        capturedAt: Date.now(),
        worldState: state,
        canon,
        summary: generateSnapshotSummary(state),
      };

      // Persist snapshot
      const snapshotId = generateId();
      await env.WORLD_STATE.put(`snapshot:${snapshotId}`, JSON.stringify(snapshot));

      // Return both JSON and formatted text
      const formatted = formatSnapshotText(snapshot);

      return new Response(JSON.stringify({
        snapshotId,
        snapshot,
        formatted,
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    } catch {
      return errorResponse(500, 'internal');
    }
  }

  // ----- API: Chat (with streaming support) -----

  if (path === '/api/chat' && request.method === 'POST') {
    try {
      const body = await request.json() as ChatRequest;
      if (!body.message) {
        return errorResponse(400, 'bad_request');
      }

      // Determine campaign — create ephemeral if not provided
      let campaignId = body.campaignId;
      let worldState: WorldState;

      if (!campaignId) {
        // No campaign specified — use a fallback or create ephemeral
        return errorResponse(400, 'bad_request');
      }

      // Rate limit
      const sessionId = campaignId;
      const allowed = await checkRateLimit(sessionId, env);
      if (!allowed) return errorResponse(429, 'rate_limited');

      // Load world state
      const raw = await env.WORLD_STATE.get(`campaign:${campaignId}`);
      if (!raw) return errorResponse(404, 'no_campaign');
      worldState = JSON.parse(raw);

      // Resolve character reference
      const characterRef = body.characterId
        ? worldState.characters.find(c => c.id === body.characterId)?.name ?? body.characterId
        : (worldState.characters[0]?.name ?? 'Adventurer');

      // Extract intent
      const intent = extractIntent(body.message);

      // Canon check: load established facts
      const canon = await getCanon(campaignId, env);
      const canonContext = canon.length > 0
        ? '\n\n## Established Canon (DO NOT contradict these facts)\n' + canon.map(f => `- ${f.fact}`).join('\n')
        : '';

      // Build LLM messages
      const systemPrompt = buildSystemPrompt(worldState, characterRef, intent) + canonContext;
      const recentNarrative = worldState.narrativeLog.slice(-5).map(e =>
        `Player: ${e.playerAction}\nDM: ${e.dmNarration}`
      ).join('\n\n');

      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...parseHistoryMessages(recentNarrative),
        { role: 'user', content: body.message },
      ];

      // Check if client wants streaming (Accept: text/event-stream or ?stream=true)
      const wantsStream = url.searchParams.get('stream') === 'true'
        || request.headers.get('Accept') === 'text/event-stream';

      if (wantsStream) {
        // Streaming response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Stream in background
        const streamPromise = (async () => {
          try {
            const narration = await callLLM(messages, env, async (chunk) => {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`));
            });

            // Canon check on the full narration
            const contradiction = await checkCanonConsistency(campaignId, body.message, narration, env);
            if (contradiction) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'canon_warning', warning: contradiction })}\n\n`));
            }

            // Update canon from narration
            await updateCanonFromNarration(campaignId, narration, env);

            // Update world state
            worldState.metadata.turnCount++;
            worldState.metadata.updatedAt = Date.now();
            worldState.narrativeLog.push({
              turn: worldState.metadata.turnCount,
              timestamp: Date.now(),
              playerAction: body.message,
              dmNarration: narration,
              stateChanges: [`intent:${intent}`],
            });

            await env.WORLD_STATE.put(`campaign:${campaignId}`, JSON.stringify(worldState));

            // Update campaign meta
            const list = await getCampaignList(env);
            const meta = list.find(c => c.id === campaignId);
            if (meta) {
              meta.updatedAt = Date.now();
              meta.sessionCount++;
              await saveCampaignList(list, env);
            }

            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done', narration, intent })}\n\n`));
          } catch (err) {
            console.error('[DMLog] Stream error:', err);
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'An arcane disturbance disrupted the weaving.' })}\n\n`));
          } finally {
            await writer.close();
          }
        })();

        // Prevent unhandled rejection
        streamPromise.catch(() => {});

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders(),
          },
        });
      }

      // Non-streaming: call LLM and return JSON
      const narration = await callLLM(messages, env);

      // Canon check
      const contradiction = await checkCanonConsistency(campaignId, body.message, narration, env);

      // Update canon from narration
      await updateCanonFromNarration(campaignId, narration, env);

      // Update world state
      worldState.metadata.turnCount++;
      worldState.metadata.updatedAt = Date.now();
      worldState.narrativeLog.push({
        turn: worldState.metadata.turnCount,
        timestamp: Date.now(),
        playerAction: body.message,
        dmNarration: narration,
        stateChanges: [`intent:${intent}`],
      });

      await env.WORLD_STATE.put(`campaign:${campaignId}`, JSON.stringify(worldState));

      // Update campaign meta
      const list = await getCampaignList(env);
      const meta = list.find(c => c.id === campaignId);
      if (meta) {
        meta.updatedAt = Date.now();
        meta.sessionCount++;
        await saveCampaignList(list, env);
      }

      return new Response(JSON.stringify({
        narration,
        intent,
        canonWarning: contradiction,
        worldState,
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    } catch (err) {
      console.error('[DMLog] Chat error:', err);
      return errorResponse(500, 'internal');
    }
  }

  // ----- WebSocket upgrade -----

  if (path === '/ws') {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    handleWebSocket(server, env);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  return errorResponse(404, 'not_found');
}

// ---------------------------------------------------------------------------
// WebSocket Handler
// ---------------------------------------------------------------------------

function handleWebSocket(ws: WebSocket, env: Env): void {
  let campaignId: string | null = null;

  ws.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data as string) as { type: string; payload: Record<string, unknown> };

      switch (data.type) {
        case 'join': {
          campaignId = data.payload.campaignId as string;
          ws.send(JSON.stringify({ type: 'joined', campaignId }));
          break;
        }

        case 'chat': {
          if (!campaignId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Join a campaign first.' }));
            return;
          }

          const message = data.payload.message as string;
          const character = data.payload.character as string;

          // Load state
          const raw = await env.WORLD_STATE.get(`campaign:${campaignId}`);
          if (!raw) {
            ws.send(JSON.stringify({ type: 'error', message: 'Campaign not found.' }));
            return;
          }
          const worldState: WorldState = JSON.parse(raw);

          // Build messages and stream
          const intent = extractIntent(message);
          const systemPrompt = buildSystemPrompt(worldState, character, intent);
          const recentNarrative = worldState.narrativeLog.slice(-5).map(e =>
            `Player: ${e.playerAction}\nDM: ${e.dmNarration}`
          ).join('\n\n');

          const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            ...parseHistoryMessages(recentNarrative),
            { role: 'user', content: message },
          ];

          // Stream narration
          ws.send(JSON.stringify({ type: 'start', intent }));
          const narration = await callLLM(messages, env, (chunk) => {
            ws.send(JSON.stringify({ type: 'chunk', text: chunk }));
          });
          ws.send(JSON.stringify({ type: 'done', narration }));

          // Update state
          worldState.metadata.turnCount++;
          worldState.metadata.updatedAt = Date.now();
          worldState.narrativeLog.push({
            turn: worldState.metadata.turnCount,
            timestamp: Date.now(),
            playerAction: message,
            dmNarration: narration,
            stateChanges: [`intent:${intent}`],
          });
          await env.WORLD_STATE.put(`campaign:${campaignId}`, JSON.stringify(worldState));

          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
      }
    } catch (err) {
      console.error('[DMLog] WebSocket error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'An arcane disturbance disrupted the connection.' }));
    }
  });

  ws.addEventListener('close', () => {
    campaignId = null;
  });

  // Accept the connection
  ws.accept();
}

// ---------------------------------------------------------------------------
// Prompt Building
// ---------------------------------------------------------------------------

function buildSystemPrompt(state: WorldState, character: string, intent: PlayerIntent): string {
  const currentScene = state.metadata.currentScene ?? 'Unknown location';
  const activeChars = state.characters.map(c => `${c.name} (${c.race} ${c.class} Lv${c.level}, HP: ${c.hp}/${c.maxHp}, AC: ${c.ac})`).join('; ');
  const activeNpcs = state.npcs.map(n => `${n.name} (${n.disposition})`).join('; ');
  const activeQuests = state.quests.filter(q => q.status === 'active').map(q => q.name).join(', ') ?? 'None';
  const inCombat = state.combat?.active ? `In combat — Round ${state.combat.round}` : 'Not in combat';

  return [
    DM_PERSONALITY,
    '',
    '## Campaign State',
    `Scene: ${currentScene}`,
    `Combat: ${inCombat}`,
    `Characters: ${activeChars || 'None yet'}`,
    `NPCs present: ${activeNpcs || 'None visible'}`,
    `Active quests: ${activeQuests}`,
    `Turn: ${state.metadata.turnCount}`,
    '',
    `Active character: ${character}`,
    `Player intent detected: ${intent}`,
    '',
    'Respond as the DM. Narrate the result of the player\'s action. Keep it concise but vivid.',
  ].join('\n');
}

function parseHistoryMessages(history: string): LLMMessage[] {
  if (!history) return [];
  const messages: LLMMessage[] = [];
  const lines = history.split('\n');
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent = '';

  for (const line of lines) {
    if (line.startsWith('Player: ')) {
      if (currentRole && currentContent) {
        messages.push({ role: currentRole, content: currentContent.trim() });
      }
      currentRole = 'user';
      currentContent = line.slice(8);
    } else if (line.startsWith('DM: ')) {
      if (currentRole && currentContent) {
        messages.push({ role: currentRole, content: currentContent.trim() });
      }
      currentRole = 'assistant';
      currentContent = line.slice(4);
    } else {
      currentContent += '\n' + line;
    }
  }

  if (currentRole && currentContent) {
    messages.push({ role: currentRole, content: currentContent.trim() });
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Static Asset Serving
// ---------------------------------------------------------------------------

function serveStatic(filename: string, contentType: string): Response {
  // Placeholder: In production these would come from ASSETS binding or bundled HTML
  const placeholder: Record<string, string> = {
    'index.html': `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DMLog.ai — Your AI Dungeon Master</title><link rel="stylesheet" href="/css/style.css"></head><body><div id="app"><h1>DMLog.ai</h1><p>Your AI-powered Dungeon Master awaits.</p><a href="/app">Enter the Realm</a></div></body></html>`,
    'app.html': `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DMLog.ai — Game</title><link rel="stylesheet" href="/css/style.css"></head><body><div id="game"></div><script src="/js/app.js"></script></body></html>`,
    'style.css': `/* DMLog.ai Styles */\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: Georgia, 'Times New Roman', serif; background: #1a1a2e; color: #e0e0e0; }\n#app { max-width: 800px; margin: 2rem auto; padding: 2rem; text-align: center; }\nh1 { color: #d4af37; font-size: 2.5rem; margin-bottom: 1rem; }\na { color: #d4af37; }\n`,
    'app.js': `/* DMLog.ai Client */\nconsole.log('DMLog.ai loaded');\n`,
  };

  const content = placeholder[filename] ?? `/* ${filename} */`;
  return new Response(content, {
    headers: { 'Content-Type': contentType, ...corsHeaders() },
  });
}

// ---------------------------------------------------------------------------
// Worker Export
// ---------------------------------------------------------------------------

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env);
  },
};
