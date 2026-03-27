// ─── TTRPG Session State Machine ────────────────────────────────────────────

export enum TTRPGPhase {
  SETUP = 'SETUP',
  INTRODUCTION = 'INTRODUCTION',
  EXPLORATION = 'EXPLORATION',
  COMBAT = 'COMBAT',
  ROLEPLAY = 'ROLEPLAY',
  CLIMAX = 'CLIMAX',
  RESOLUTION = 'RESOLUTION',
  WRAP_UP = 'WRAP_UP',
}

export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: string[];
  isPlayer: boolean;
  notes?: string;
}

export interface CombatState {
  active: boolean;
  initiative: CombatParticipant[];
  rounds: number;
  currentTurnIndex: number;
  surprise: string[];
}

export interface SceneState {
  id: string;
  name: string;
  description: string;
  atmosphere: string;
  npcsPresent: string[];
  mapUrl?: string;
}

export interface NPCState {
  id: string;
  name: string;
  race: string;
  disposition: 'hostile' | 'unfriendly' | 'indifferent' | 'friendly' | 'helpful';
  location: string;
  personality: string;
  speakingStyle?: string;
  hp?: number;
  maxHp?: number;
  ac?: number;
}

export interface CharacterState {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  abilityScores: Record<string, { score: number; modifier: number }>;
  conditions: string[];
  inventory: Array<{ id: string; name: string; qty: number; weight?: number }>;
  spellSlots: Record<string, number>;
  hitDice: { current: number; total: number };
  xp: number;
}

export interface WorldState {
  currentLocation: string;
  timeOfDay: string;
  weather: string;
  establishedFacts: string[];
  questLog: Array<{ id: string; title: string; status: string }>;
}

export interface TTRPGSessionState {
  id: string;
  phase: TTRPGPhase;
  scene: SceneState | null;
  activeNPCs: Map<string, NPCState>;
  combat: CombatState;
  characters: Map<string, CharacterState>;
  worldState: WorldState;
  turnCount: number;
  createdAt: number;
  updatedAt: number;
}

// Valid phase transitions
const VALID_TRANSITIONS: Record<TTRPGPhase, TTRPGPhase[]> = {
  [TTRPGPhase.SETUP]: [TTRPGPhase.INTRODUCTION],
  [TTRPGPhase.INTRODUCTION]: [TTRPGPhase.EXPLORATION, TTRPGPhase.ROLEPLAY],
  [TTRPGPhase.EXPLORATION]: [TTRPGPhase.COMBAT, TTRPGPhase.ROLEPLAY, TTRPGPhase.CLIMAX],
  [TTRPGPhase.COMBAT]: [TTRPGPhase.EXPLORATION, TTRPGPhase.ROLEPLAY, TTRPGPhase.CLIMAX, TTRPGPhase.RESOLUTION],
  [TTRPGPhase.ROLEPLAY]: [TTRPGPhase.EXPLORATION, TTRPGPhase.COMBAT, TTRPGPhase.CLIMAX],
  [TTRPGPhase.CLIMAX]: [TTRPGPhase.COMBAT, TTRPGPhase.RESOLUTION],
  [TTRPGPhase.RESOLUTION]: [TTRPGPhase.WRAP_UP, TTRPGPhase.EXPLORATION],
  [TTRPGPhase.WRAP_UP]: [TTRPGPhase.SETUP],
};

export type TTRPGEvent =
  | { type: 'phase_change'; phase: TTRPGPhase }
  | { type: 'scene_change'; scene: SceneState }
  | { type: 'combat_start'; participants: CombatParticipant[]; surprise?: string[] }
  | { type: 'combat_end' }
  | { type: 'combat_next_turn' }
  | { type: 'npc_add'; npc: NPCState }
  | { type: 'npc_update'; npc: Partial<NPCState> & { id: string } }
  | { type: 'npc_remove'; npcId: string }
  | { type: 'character_update'; character: Partial<CharacterState> & { id: string } }
  | { type: 'character_add'; character: CharacterState }
  | { type: 'world_update'; updates: Partial<WorldState> }
  | { type: 'combat_damage'; targetId: string; amount: number }
  | { type: 'combat_heal'; targetId: string; amount: number }
  | { type: 'combat_condition_add'; targetId: string; condition: string }
  | { type: 'combat_condition_remove'; targetId: string; condition: string }
  | { type: 'add_initiative'; participant: CombatParticipant };

export function transition(state: TTRPGSessionState, event: TTRPGEvent): TTRPGSessionState {
  const next = structuredClone(state);
  next.updatedAt = Date.now();

  switch (event.type) {
    case 'phase_change': {
      const allowed = VALID_TRANSITIONS[next.phase] ?? [];
      if (!allowed.includes(event.phase)) {
        throw new Error(`Invalid transition: ${next.phase} → ${event.phase}`);
      }
      next.phase = event.phase;
      if (event.phase !== TTRPGPhase.COMBAT) {
        next.combat = { active: false, initiative: [], rounds: 0, currentTurnIndex: 0, surprise: [] };
      }
      break;
    }

    case 'scene_change':
      next.scene = event.scene;
      break;

    case 'combat_start': {
      const sorted = [...event.participants].sort((a, b) => b.initiative - a.initiative);
      next.combat = {
        active: true,
        initiative: sorted,
        rounds: 1,
        currentTurnIndex: 0,
        surprise: event.surprise ?? [],
      };
      if (next.phase !== TTRPGPhase.COMBAT) {
        const allowed = VALID_TRANSITIONS[next.phase] ?? [];
        if (allowed.includes(TTRPGPhase.COMBAT)) {
          next.phase = TTRPGPhase.COMBAT;
        }
      }
      break;
    }

    case 'combat_end':
      next.combat = { active: false, initiative: [], rounds: 0, currentTurnIndex: 0, surprise: [] };
      break;

    case 'combat_next_turn': {
      const combat = next.combat;
      if (!combat.active || combat.initiative.length === 0) break;
      combat.currentTurnIndex = (combat.currentTurnIndex + 1) % combat.initiative.length;
      if (combat.currentTurnIndex === 0) {
        combat.rounds++;
      }
      break;
    }

    case 'npc_add':
      next.activeNPCs.set(event.npc.id, event.npc);
      break;

    case 'npc_update': {
      const existing = next.activeNPCs.get(event.npc.id);
      if (existing) {
        next.activeNPCs.set(event.npc.id, { ...existing, ...event.npc });
      }
      break;
    }

    case 'npc_remove':
      next.activeNPCs.delete(event.npcId);
      break;

    case 'character_add':
      next.characters.set(event.character.id, event.character);
      break;

    case 'character_update': {
      const existing = next.characters.get(event.character.id);
      if (existing) {
        next.characters.set(event.character.id, { ...existing, ...event.character });
      }
      break;
    }

    case 'world_update':
      next.worldState = { ...next.worldState, ...event.updates };
      break;

    case 'combat_damage': {
      const p = next.combat.initiative.find(x => x.id === event.targetId);
      if (p) p.hp = Math.max(0, p.hp - event.amount);
      const ch = next.characters.get(event.targetId);
      if (ch) ch.hp = Math.max(0, ch.hp - event.amount);
      break;
    }

    case 'combat_heal': {
      const p = next.combat.initiative.find(x => x.id === event.targetId);
      if (p) p.hp = Math.min(p.maxHp, p.hp + event.amount);
      const ch = next.characters.get(event.targetId);
      if (ch) ch.hp = Math.min(ch.maxHp, ch.hp + event.amount);
      break;
    }

    case 'combat_condition_add': {
      const p = next.combat.initiative.find(x => x.id === event.targetId);
      if (p && !p.conditions.includes(event.condition)) p.conditions.push(event.condition);
      const ch = next.characters.get(event.targetId);
      if (ch && !ch.conditions.includes(event.condition)) ch.conditions.push(event.condition);
      break;
    }

    case 'combat_condition_remove': {
      const p = next.combat.initiative.find(x => x.id === event.targetId);
      if (p) p.conditions = p.conditions.filter(c => c !== event.condition);
      const ch = next.characters.get(event.targetId);
      if (ch) ch.conditions = ch.conditions.filter(c => c !== event.condition);
      break;
    }

    case 'add_initiative': {
      if (next.combat.active) {
        next.combat.initiative.push(event.participant);
        next.combat.initiative.sort((a, b) => b.initiative - a.initiative);
      }
      break;
    }
  }

  next.turnCount++;
  return next;
}

export function createInitialState(id: string): TTRPGSessionState {
  return {
    id,
    phase: TTRPGPhase.SETUP,
    scene: null,
    activeNPCs: new Map(),
    combat: { active: false, initiative: [], rounds: 0, currentTurnIndex: 0, surprise: [] },
    characters: new Map(),
    worldState: {
      currentLocation: 'Unknown',
      timeOfDay: 'dawn',
      weather: 'clear',
      establishedFacts: [],
      questLog: [],
    },
    turnCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
