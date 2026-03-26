import { Hono } from 'hono';
import { createInitialState, transition, TTRPGPhase } from '../../src/orchestrator/session-state';
import type { TTRPGSessionState, TTRPGEvent, CombatParticipant } from '../../src/orchestrator/session-state';
import { routeToAgent } from '../../src/orchestrator/director';

// In-memory store (swap for D1/Durable Objects in production)
const sessions = new Map<string, TTRPGSessionState>();

const game = new Hono();

// POST /v1/game/start
game.post('/start', async (c) => {
  const body = await c.req.json<{
    campaignId?: string;
    title?: string;
    mode?: 'campaign' | 'oneshot';
  }>();

  const id = crypto.randomUUID();
  const state = createInitialState(id);
  sessions.set(id, state);

  return c.json({
    session_id: id,
    phase: state.phase,
    message: body.mode === 'oneshot' ? 'One-shot session created. Ready to begin!' : 'Campaign session created. Load your characters and begin!',
  });
});

// POST /v1/game/turn
game.post('/turn', async (c) => {
  const body = await c.req.json<{
    sessionId: string;
    input: string;
    characterId?: string;
  }>();

  const state = sessions.get(body.sessionId);
  if (!state) return c.json({ error: 'Session not found' }, 404);

  const decision = routeToAgent(body.input, state, {
    recentActions: [],
    activeNPCNames: Array.from(state.activeNPCs.values()).map(n => n.name),
  });

  // Apply phase transition if suggested
  if (decision.phase && decision.phase !== state.phase) {
    transition(state, { type: 'phase_change', phase: decision.phase });
  }

  return c.json({
    session_id: body.sessionId,
    decision,
    state: serializeState(state),
  });
});

// GET /v1/game/session/:id
game.get('/session/:id', async (c) => {
  const state = sessions.get(c.req.param('id'));
  if (!state) return c.json({ error: 'Session not found' }, 404);
  return c.json(serializeState(state));
});

// POST /v1/game/session/:id/npc
game.post('/session/:id/npc', async (c) => {
  const id = c.req.param('id');
  const state = sessions.get(id);
  if (!state) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{
    name: string;
    race?: string;
    disposition?: string;
    location?: string;
    personality?: string;
    speakingStyle?: string;
    hp?: number;
    maxHp?: number;
    ac?: number;
  }>();

  const npcId = `npc-${crypto.randomUUID().slice(0, 8)}`;
  transition(state, {
    type: 'npc_add',
    npc: {
      id: npcId,
      name: body.name,
      race: body.race ?? 'Unknown',
      disposition: (body.disposition as any) ?? 'indifferent',
      location: body.location ?? state.worldState.currentLocation,
      personality: body.personality ?? '',
      speakingStyle: body.speakingStyle,
      hp: body.hp,
      maxHp: body.maxHp,
      ac: body.ac,
    },
  });

  return c.json({ npc_id: npcId, message: `${body.name} has entered the scene.` });
});

// POST /v1/game/session/:id/combat
game.post('/session/:id/combat', async (c) => {
  const id = c.req.param('id');
  const state = sessions.get(id);
  if (!state) return c.json({ error: 'Session not found' }, 404);

  const body = await c.req.json<{
    action: 'start' | 'end' | 'next_turn';
    participants?: CombatParticipant[];
    surprise?: string[];
  }>();

  switch (body.action) {
    case 'start': {
      if (!body.participants) return c.json({ error: 'participants required' }, 400);
      transition(state, {
        type: 'combat_start',
        participants: body.participants,
        surprise: body.surprise,
      });
      return c.json({ message: 'Combat has begun!', combat: state.combat });
    }
    case 'end': {
      transition(state, { type: 'combat_end' });
      return c.json({ message: 'Combat has ended.' });
    }
    case 'next_turn': {
      transition(state, { type: 'combat_next_turn' });
      const current = state.combat.initiative[state.combat.currentTurnIndex];
      return c.json({
        round: state.combat.rounds,
        current_turn: current?.name ?? null,
        order: state.combat.initiative,
      });
    }
    default:
      return c.json({ error: 'Invalid combat action' }, 400);
  }
});

// GET /v1/game/session/:id/stream
game.get('/session/:id/stream', async (c) => {
  const id = c.req.param('id');
  const state = sessions.get(id);
  if (!state) return c.json({ error: 'Session not found' }, 404);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      controller.enqueue(encoder.encode(`event: session_meta\ndata: ${JSON.stringify({ session_id: id, phase: state.phase })}\n\n`));

      // Send a heartbeat every 15s to keep connection alive
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: {"ts":${Date.now()}}\n\n`));
      }, 15000);

      // Store cleanup
      (stream as any)._cleanup = () => clearInterval(interval);
    },
    cancel() {
      (stream as any)._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// POST /v1/game/character
game.post('/character', async (c) => {
  const body = await c.req.json<{
    sessionId?: string;
    name: string;
    race: string;
    className: string;
    level: number;
    hp: number;
    maxHp: number;
    ac: number;
    speed?: number;
    abilityScores?: Record<string, { score: number; modifier: number }>;
  }>();

  const charId = `pc-${crypto.randomUUID().slice(0, 8)}`;
  const character = {
    id: charId,
    name: body.name,
    race: body.race,
    className: body.className,
    level: body.level,
    hp: body.hp,
    maxHp: body.maxHp,
    tempHp: 0,
    ac: body.ac,
    speed: body.speed ?? 30,
    abilityScores: body.abilityScores ?? {
      str: { score: 10, modifier: 0 },
      dex: { score: 10, modifier: 0 },
      con: { score: 10, modifier: 0 },
      int: { score: 10, modifier: 0 },
      wis: { score: 10, modifier: 0 },
      cha: { score: 10, modifier: 0 },
    },
    conditions: [] as string[],
    inventory: [] as Array<{ id: string; name: string; qty: number }>,
    spellSlots: {},
    hitDice: { current: body.level, total: body.level },
    xp: 0,
  };

  if (body.sessionId) {
    const state = sessions.get(body.sessionId);
    if (state) {
      transition(state, { type: 'character_add', character });
    }
  }

  return c.json({ character_id: charId, character });
});

function serializeState(state: TTRPGSessionState) {
  return {
    id: state.id,
    phase: state.phase,
    scene: state.scene,
    activeNPCs: Object.fromEntries(state.activeNPCs),
    combat: state.combat,
    characters: Object.fromEntries(state.characters),
    worldState: state.worldState,
    turnCount: state.turnCount,
  };
}

export default game;
