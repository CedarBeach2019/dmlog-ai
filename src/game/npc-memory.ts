// npc-memory.ts

export enum RelationType {
  Ally = 'ally',
  Enemy = 'enemy',
  Neutral = 'neutral',
  Romantic = 'romantic',
  Family = 'family',
  Rival = 'rival',
  Mentor = 'mentor',
}

export enum MemoryType {
  Dialogue = 'dialogue',
  Action = 'action',
  Observed = 'observed',
  Rumor = 'rumor',
}

export interface DialogueStyle {
  greetings: string[];
  farewells: string[];
  speechPatterns: string[];
  catchphrases: string[];
  tone: string;
}

export interface NPCRelation {
  npcId: string;
  type: RelationType;
  strength: number; // 0.0 to 1.0
  history: string[];
}

export interface NPC {
  id: string;
  name: string;
  race: string;
  class: string;
  appearance: string;
  personality: string;
  voice: string;
  secrets: string[];
  relationships: Record<string, NPCRelation>;
  firstAppearance: number;
  lastSeen: number;
  sessionsAppeared: number[];
  location: string;
  status: 'alive' | 'dead' | 'missing';
  dialogueStyle?: DialogueStyle;
}

export interface NPCMemory {
  npcId: string;
  event: string;
  session: number;
  timestamp: number;
  type: MemoryType;
}

export interface Faction {
  id: string;
  name: string;
  leader: string;
  members: string[];
  goals: string[];
  resources: string[];
  allies: string[];
  enemies: string[];
  reputation: number; // -100 to 100
}

export class NPCMemoryManager {
  private npcs: Map<string, NPC> = new Map();
  private memories: NPCMemory[] = [];
  private factions: Map<string, Faction> = new Map();

  // --- NPC Management ---
  
  public createNPC(data: Omit<NPC, 'relationships' | 'firstAppearance' | 'lastSeen' | 'sessionsAppeared' | 'status'>, session: number): NPC {
    const npc: NPC = {
      ...data,
      relationships: {},
      firstAppearance: session,
      lastSeen: session,
      sessionsAppeared: [session],
      status: 'alive',
    };
    this.npcs.set(npc.id, npc);
    return npc;
  }

  public getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  public getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  public getNPCsByLocation(location: string): NPC[] {
    return this.getAllNPCs().filter(npc => npc.location === location);
  }

  public getNPCsByStatus(status: NPC['status']): NPC[] {
    return this.getAllNPCs().filter(npc => npc.status === status);
  }

  public updateNPC(id: string, updates: Partial<NPC>, session: number): NPC | undefined {
    const npc = this.npcs.get(id);
    if (!npc) return undefined;

    Object.assign(npc, updates);
    npc.lastSeen = session;
    if (!npc.sessionsAppeared.includes(session)) {
      npc.sessionsAppeared.push(session);
    }

    this.npcs.set(id, npc);
    return npc;
  }

  public killNPC(id: string): boolean {
    const npc = this.npcs.get(id);
    if (!npc) return false;
    npc.status = 'dead';
    return true;
  }

  public resurrectNPC(id: string): boolean {
    const npc = this.npcs.get(id);
    if (!npc) return false;
    npc.status = 'alive';
    return true;
  }

  // --- Relationships ---

  public addRelation(fromNpcId: string, relation: NPCRelation): boolean {
    const npc = this.npcs.get(fromNpcId);
    if (!npc) return false;
    
    relation.strength = Math.max(0, Math.min(1, relation.strength));
    npc.relationships[relation.npcId] = relation;
    return true;
  }

  public getRelations(npcId: string): NPCRelation[] {
    return Object.values(this.npcs.get(npcId)?.relationships || {});
  }

  // --- Memory Management ---

  public addMemory(memory: NPCMemory): void {
    this.memories.push(memory);
  }

  public getMemories(npcId: string, limit?: number): NPCMemory[] {
    const npcMems = this.memories.filter(m => m.npcId === npcId);
    return limit ? npcMems.slice(-limit) : npcMems;
  }

  // --- LLM Context Generation ---

  public getDialogueStyle(npcId: string): string {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.dialogueStyle) return "Standard conversational tone.";

    const ds = npc.dialogueStyle;
    return `Tone: ${ds.tone}. Common greetings: ${ds.greetings.join(', ')}. 
      Farewells: ${ds.farewells.join(', ')}. Catchphrases: ${ds.catchphrases.join(', ')}. 
      Speech patterns: ${ds.speechPatterns.join('; ')}`;
  }

  public getNPCContext(npcId: string): string {
    const npc = this.npcs.get(npcId);
    if (!npc) return "Error: NPC not found.";

    const memories = this.getMemories(npcId, 5).map(m => `[Session ${m.session}] ${m.type}: ${m.event}`).join('\n');
    const relations = this.getRelations(npcId).map(r => `${this.getNPC(r.npcId)?.name || r.npcId} (${r.type}, strength: ${r.strength.toFixed(2)})`).join(', ');
    const factions = Array.from(this.factions.values()).filter(f => f.members.includes(npcId)).map(f => f.name).join(', ');

    return `
      NPC Context Profile: ${npc.name} (${npc.race} ${npc.class})
      Status: ${npc.status} | Current Location: ${npc.location} | First Seen: Session ${npc.firstAppearance}
      Appearance: ${npc.appearance}
      Personality: ${npc.personality}
      Voice: ${npc.voice}
      Secrets: ${npc.secrets.length > 0 ? npc.secrets.join('; ') : 'None known'}
      Associated Factions: ${factions || 'None'}
      Key Relationships: ${relations || 'None'}
      Dialogue Style: ${this.getDialogueStyle(npcId)}
      Recent Memories:\n${memories || 'No recent memories.'}
    `.replace(/^\s+/gm, '').trim();
  }

  // --- Factions Subsystem ---

  public addFaction(faction: Faction): void {
    this.factions.set(faction.id, faction);
  }

  public getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }

  public addMember(factionId: string, npcId: string): boolean {
    const faction = this.factions.get(factionId);
    if (!faction) return false;
    if (!faction.members.includes(npcId)) faction.members.push(npcId);
    return true;
  }

  public setRelations(factionId: string, type: 'allies' | 'enemies', targetFactionId: string): boolean {
    const faction = this.factions.get(factionId);
    const target = this.factions.get(targetFactionId);
    if (!faction || !target) return false;

    if (!faction[type].includes(targetFactionId)) faction[type].push(targetFactionId);
    const reciprocalType = type === 'allies' ? 'allies' : 'enemies';
    if (!target[reciprocalType].includes(factionId)) target[reciprocalType].push(factionId);
    
    return true;
  }

  public getFactionContext(factionId: string): string {
    const faction = this.factions.get(factionId);
    if (!faction) return "Error: Faction not found.";

    const memberNames = faction.members.map(id => this.getNPC(id)?.name || id).join(', ');
    return `
      Faction Profile: ${faction.name}
      Leader: ${this.getNPC(faction.leader)?.name || faction.leader}
      Members: ${memberNames}
      Goals: ${faction.goals.join('; ')}
      Resources: ${faction.resources.join('; ')}
      Reputation: ${faction.reputation}/100
    `.replace(/^\s+/gm, '').trim();
  }

  // --- Serialization ---

  public serialize(): string {
    return JSON.stringify({
      npcs: Array.from(this.npcs.entries()),
      memories: this.memories,
      factions: Array.from(this.factions.entries()),
    }, null, 2);
  }

  public deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.npcs = new Map(data.npcs);
      this.memories = data.memories || [];
      this.factions = new Map(data.factions);
    } catch (error) {
      console.error("Failed to deserialize NPC Memory data:", error);
    }
  }
}