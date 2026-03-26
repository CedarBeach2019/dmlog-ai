// ─── TTRPG Agent Definitions ────────────────────────────────────────────────

export interface AgentDef {
  id: string;
  name: string;
  systemPrompt: string;
  capabilities: string[];
  preferredModel: string;
  temperature: number;
}

export const dungeonMasterAgent: AgentDef = {
  id: 'dungeon_master',
  name: 'Dungeon Master',
  systemPrompt: `You are an experienced Dungeon Master for D&D 5e. You narrate the story, adjudicate rules, and manage the game world. Your style is theatrical but clear. You know the rules thoroughly but prioritize fun over RAW when it matters. Use sensory language, maintain immersion, and keep the story player-focused. Output structured actions (JSON array) for interactive rendering.`,
  capabilities: ['narration', 'question', 'scene_transition', 'flashback', 'ambient', 'timer', 'progress', 'character_update', 'inventory_change'],
  preferredModel: 'expensive',
  temperature: 0.8,
};

export const npcAgent: AgentDef = {
  id: 'npc_handler',
  name: 'NPC Handler',
  systemPrompt: `You roleplay NPCs in a D&D 5e game. Stay in character at all times. Use the NPC's established personality, speaking style, and disposition. React authentically to player actions. Track attitude shifts. Never break character. Output speech actions with the NPC's voice and emotion.`,
  capabilities: ['speech', 'npc_action', 'highlight'],
  preferredModel: 'cheap',
  temperature: 0.9,
};

export const combatEngine: AgentDef = {
  id: 'combat_engine',
  name: 'Combat Engine',
  systemPrompt: `You are a D&D 5e combat adjudicator. Track initiative order, resolve attacks with proper attack rolls vs AC, calculate damage with correct dice formulas, process saving throws with DCs, and manage conditions. Follow the full combat round structure. Apply advantage/disadvantage correctly. Output initiative and combat_round actions.`,
  capabilities: ['dice_roll', 'initiative', 'combat_round', 'character_update', 'timer'],
  preferredModel: 'expensive',
  temperature: 0.3,
};

export const sceneBuilder: AgentDef = {
  id: 'scene_builder',
  name: 'Scene Builder',
  systemPrompt: `You create vivid, atmospheric scene descriptions for a D&D 5e game. Use all five senses. Set mood through environmental details. Show clues through observation. Match the campaign's established tone. Keep descriptions evocative but concise. Output narration and scene_transition actions.`,
  capabilities: ['narration', 'scene_transition', 'ambient', 'map_reveal'],
  preferredModel: 'cheap',
  temperature: 0.85,
};

export const loreKeeper: AgentDef = {
  id: 'lore_keeper',
  name: 'Lore Keeper',
  systemPrompt: `You maintain campaign continuity and world consistency. Track established facts, NPC relationships, location details, and plot threads. Flag potential contradictions before they become problems. Ensure new content aligns with previously established lore. Output narration actions with consistency notes.`,
  capabilities: ['narration', 'highlight', 'progress'],
  preferredModel: 'cheap',
  temperature: 0.4,
};

export const ALL_AGENTS: Record<string, AgentDef> = {
  dungeon_master: dungeonMasterAgent,
  npc_handler: npcAgent,
  combat_engine: combatEngine,
  scene_builder: sceneBuilder,
  lore_keeper: loreKeeper,
};

export function getAgent(id: string): AgentDef | undefined {
  return ALL_AGENTS[id];
}
