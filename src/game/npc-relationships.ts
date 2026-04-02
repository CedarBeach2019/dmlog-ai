/**
 * DMLog.ai
 * src/game/npc-relationships.ts
 *
 * Manages Non-Player Characters (NPCs), their relationships with players,
 * reputation, and faction affiliations. This system provides a comprehensive
 * way to track dynamic interactions within a game world.
 */

/**
 * Represents a Non-Player Character in the game world.
 */
export interface NPC {
  id: string;
  name: string;
  race: string;
  class: string;
  personality: string;
  location: string;
  disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
  faction: string;
  secrets: string[];
  /** A quick lookup map for player affinity scores. Key is playerId, value is affinity. */
  relationships: Map<string, number>;
}

/**
 * Represents the detailed relationship between a specific NPC and a player.
 */
export interface Relationship {
  npcId: string;
  playerId: string;
  /** A score from -100 (Hated) to 100 (Beloved) representing the NPC's opinion. */
  affinity: number;
  /** A log of events that have changed the affinity score. */
  history: Array<{ event: string; date: number; change: number }>;
  /** A list of gifts given by the player to the NPC. */
  gifts: Array<{ item: string; date: number }>;
  questsCompleted: number;
  questsFailed: number;
  /** A descriptive rank based on the affinity score. */
  rank: string;
}

/**
 * A serializable representation of the class's state.
 */
interface SerializableState {
  npcs: [string, NPC][];
  relationships: [string, Relationship][];
  factions: [string, string[]][];
}

/**
 * Manages all NPC data, relationships, and factions within the game.
 */
export class NPCRelationships {
  private npcs = new Map<string, NPC>();
  private relationships = new Map<string, Relationship>(); // Key: `${npcId}-${playerId}`
  private factions = new Map<string, Set<string>>(); // Key: factionName, Value: Set of npcIds

  constructor() {
    this._prepopulateNPCs();
  }

  // --- Private Helper Methods ---

  /** Generates a simple unique ID. */
  private _generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /** Creates a consistent key for the relationships map. */
  private _getRelationshipKey(npcId: string, playerId: string): string {
    return `${npcId}-${playerId}`;
  }

  /** Updates a relationship's rank based on its current affinity. */
  private _updateRelationshipRank(relationship: Relationship): void {
    relationship.rank = this.getRank(relationship.affinity);
  }

  /** Fills the system with 20 predefined NPC archetypes. */
  private _prepopulateNPCs(): void {
    const archetypes: Omit<NPC, 'id' | 'secrets' | 'relationships'>[] = [
      { name: 'Elara', race: 'Elf', class: 'Sage', personality: 'Wise, patient, knowledgeable', location: 'The Great Library', disposition: 'friendly', faction: '' },
      { name: 'Silas "Silky" Vane', race: 'Goblin', class: 'Rogue', personality: 'Shady, opportunistic, cunning', location: 'The Black Market', disposition: 'neutral', faction: "Thieves' Guild" },
      { name: 'Sir Kaelan', race: 'Human', class: 'Paladin', personality: 'Brave, honorable, righteous', location: 'The Citadel', disposition: 'friendly', faction: 'The Crown' },
      { name: 'Nyx', race: 'Tiefling', class: 'Warlock', personality: 'Mysterious, secretive, powerful', location: 'The Whispering Tavern', disposition: 'unknown', faction: '' },
      { name: 'Bram Ironhand', race: 'Dwarf', class: 'Commoner', personality: 'Friendly, boisterous, welcoming', location: 'The Hearth & Anvil Inn', disposition: 'friendly', faction: "Merchants' Guild" },
      { name: 'Sergeant Borr', race: 'Human', class: 'Fighter', personality: 'Corrupt, cynical, greedy', location: 'The City Gates', disposition: 'hostile', faction: 'The Crown' },
      { name: 'Lena Meadowlight', race: 'Halfling', class: 'Cleric', personality: 'Kind, compassionate, gentle', location: 'The Temple of Dawn', disposition: 'friendly', faction: 'The Church' },
      { name: 'Grunk Forgesmith', race: 'Dwarf', class: 'Artificer', personality: 'Gruff, proud, master craftsman', location: 'The Smithy', disposition: 'neutral', faction: "Merchants' Guild" },
      { name: 'Master Valerius', race: 'Gnome', class: 'Wizard', personality: 'Erudite, meticulous, forgetful', location: 'The Great Library', disposition: 'neutral', faction: '' },
      { name: 'Faelan Whisperwind', race: 'Half-Elf', class: 'Bard', personality: 'Charismatic, witty, loves stories', location: 'The Whispering Tavern', disposition: 'friendly', faction: '' },
      { name: 'Quill', race: 'Kenku', class: 'Rogue', personality: 'Mimic, cautious, loyal to the guild', location: "The Thieves' Guild", disposition: 'neutral', faction: "Thieves' Guild" },
      { name: 'Lady Seraphina', race: 'Human', class: 'Noble', personality: 'Arrogant, refined, influential', location: 'The Noble Quarter', disposition: 'neutral', faction: 'The Crown' },
      { name: 'Old Man Willow', race: 'Human', class: 'Commoner', personality: 'Simple, hardworking, kind', location: 'The Farmlands', disposition: 'friendly', faction: '' },
      { name: 'Finn', race: 'Human', class: 'Commoner', personality: 'Quiet, observant, patient', location: 'The Docks', disposition: 'neutral', faction: '' },
      { name: 'Zoltan the Star-Gazer', race: 'Elf', class: 'Wizard', personality: 'Philosophical, detached, insightful', location: 'The Observatory', disposition: 'neutral', faction: '' },
      { name: '"One-Eye" Mako', race: 'Orc', class: 'Barbarian', personality: 'Brutal, direct, surprisingly fair', location: 'The Pirate Ship "Sea Serpent"', disposition: 'hostile', faction: 'Pirates' },
      { name: 'Vesper', race: 'Changeling', class: 'Rogue', personality: 'Enigmatic, adaptable, deceptive', location: 'The Royal Embassy', disposition: 'unknown', faction: '' },
      { name: 'High Priestess Anaya', race: 'Aasimar', class: 'Cleric', personality: 'Pious, serene, commanding', location: 'The Grand Cathedral', disposition: 'friendly', faction: 'The Church' },
      { name: 'The Shadow', race: 'Drow', class: 'Ranger', personality: 'Silent, deadly, professional', location: 'The Shadow Alleys', disposition: 'hostile', faction: "Assassins' League" },
      { name: 'Pip', race: 'Human', class: 'Commoner', personality: 'Innocent, curious, hopeful', location: 'The Orphanage', disposition: 'friendly', faction: '' },
    ];

    archetypes.forEach(data => this.createNPC(data));

    // Create factions and assign some of the prepopulated NPCs
    const factionsToCreate = ["The Crown", "Merchants' Guild", "Thieves' Guild", "The Church", "Pirates", "Assassins' League"];
    factionsToCreate.forEach(f => this.createFaction(f));

    this.npcs.forEach(npc => {
      if (npc.faction && this.factions.has(npc.faction)) {
        this.joinFaction(npc.id, npc.faction);
      }
    });
  }

  // --- 1. NPC Management ---

  /** Creates a new NPC and adds them to the world. */
  public createNPC(data: Partial<Omit<NPC, 'id'>>): NPC {
    const id = this._generateId();
    const newNPC: NPC = {
      id,
      name: data.name || 'Unnamed NPC',
      race: data.race || 'Human',
      class: data.class || 'Commoner',
      personality: data.personality || 'Neutral',
      location: data.location || 'Unknown',
      disposition: data.disposition || 'neutral',
      faction: data.faction || '',
      secrets: data.secrets || [],
      relationships: data.relationships || new Map<string, number>(),
    };
    this.npcs.set(id, newNPC);
    return newNPC;
  }

  /** Retrieves an NPC by their unique ID. */
  public getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  /** Updates the properties of an existing NPC. */
  public updateNPC(id: string, updates: Partial<Omit<NPC, 'id'>>): void {
    const npc = this.npcs.get(id);
    if (npc) {
      // If faction is changed, update faction membership
      if (updates.faction !== undefined && npc.faction !== updates.faction) {
        this.joinFaction(id, updates.faction);
      }
      Object.assign(npc, updates);
    }
  }

  /** Searches for NPCs based on a query string (name, race, class, location). */
  public searchNPCs(query: string): NPC[] {
    const lowerCaseQuery = query.toLowerCase();
    const results: NPC[] = [];
    for (const npc of this.npcs.values()) {
      if (
        npc.name.toLowerCase().includes(lowerCaseQuery) ||
        npc.race.toLowerCase().includes(lowerCaseQuery) ||
        npc.class.toLowerCase().includes(lowerCaseQuery) ||
        npc.location.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push(npc);
      }
    }
    return results;
  }

  /** Gets all NPCs at a specific location. */
  public getNPCsByLocation(location: string): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => npc.location === location);
  }

  /** Gets all NPCs belonging to a specific faction. */
  public getNPCsByFaction(faction: string): NPC[] {
    const memberIds = this.factions.get(faction);
    if (!memberIds) return [];
    return Array.from(memberIds).map(id => this.npcs.get(id)!).filter(Boolean);
  }

  /** Gets all NPCs with a specific disposition. */
  public getNPCsByDisposition(disposition: NPC['disposition']): NPC[] {
    return Array.from(this.npcs.values()).filter(npc => npc.disposition === disposition);
  }

  // --- 2. Secrets ---

  /** Adds a secret to an NPC's knowledge. */
  public addSecret(npcId: string, secret: string): void {
    const npc = this.npcs.get(npcId);
    if (npc && !npc.secrets.includes(secret)) {
      npc.secrets.push(secret);
    }
  }

  /** Retrieves all known secrets for an NPC. */
  public getSecrets(npcId: string): string[] {
    return this.npcs.get(npcId)?.secrets || [];
  }

  // --- 3. Relationship Management ---

  /** Creates a new relationship between an NPC and a player. */
  public createRelationship(npcId: string, playerId: string): Relationship {
    const key = this._getRelationshipKey(npcId, playerId);
    if (this.relationships.has(key)) {
      return this.relationships.get(key)!;
    }

    const npc = this.getNPC(npcId);
    if (!npc) {
      throw new Error(`Cannot create relationship: NPC with id ${npcId} not found.`);
    }

    const newRelationship: Relationship = {
      npcId,
      playerId,
      affinity: 0,
      history: [],
      gifts: [],
      questsCompleted: 0,
      questsFailed: 0,
      rank: this.getRank(0),
    };

    this.relationships.set(key, newRelationship);
    npc.relationships.set(playerId, 0);
    return newRelationship;
  }

  /** Retrieves the relationship between an NPC and a player. */
  public getRelationship(npcId: string, playerId: string): Relationship | undefined {
    return this.relationships.get(this._getRelationshipKey(npcId, playerId));
  }

  /** Changes the affinity between an NPC and a player and logs the event. */
  public changeAffinity(npcId: string, playerId: string, amount: number, event: string): void {
    const relationship = this.getRelationship(npcId, playerId) || this.createRelationship(npcId, playerId);
    const npc = this.getNPC(npcId);
    if (!relationship || !npc) return;

    relationship.affinity = Math.max(-100, Math.min(100, relationship.affinity + amount));
    relationship.history.push({ event, date: Date.now(), change: amount });
    this._updateRelationshipRank(relationship);
    npc.relationships.set(playerId, relationship.affinity);
  }

  /** Records a gift from a player to an NPC, affecting affinity. */
  public giveGift(npcId: string, playerId: string, item: string): void {
    const relationship = this.getRelationship(npcId, playerId) || this.createRelationship(npcId, playerId);
    relationship.gifts.push({ item, date: Date.now() });
    // The value of a gift is subjective, but let's add a small, positive amount.
    this.changeAffinity(npcId, playerId, 5, `Received gift: ${item}`);
  }

  /** Records a completed quest for an NPC, boosting affinity. */
  public completeQuest(npcId: string, playerId: string): void {
    const relationship = this.getRelationship(npcId, playerId) || this.createRelationship(npcId, playerId);
    relationship.questsCompleted++;
    this.changeAffinity(npcId, playerId, 15, `Completed a quest.`);
  }

  /** Records a failed quest for an NPC, reducing affinity. */
  public failQuest(npcId: string, playerId: string): void {
    const relationship = this.getRelationship(npcId, playerId) || this.createRelationship(npcId, playerId);
    relationship.questsFailed++;
    this.changeAffinity(npcId, playerId, -10, `Failed a quest.`);
  }

  /** Converts an affinity score into a descriptive rank. */
  public getRank(affinity: number): string {
    if (affinity <= -75) return 'Hated';
    if (affinity <= -50) return 'Enemy';
    if (affinity <= -25) return 'Unfriendly';
    if (affinity < 25) return 'Neutral';
    if (affinity < 50) return 'Friendly';
    if (affinity < 75) return 'Trusted';
    if (affinity < 100) return 'Ally';
    return 'Beloved';
  }

  /** Retrieves the event history for a specific relationship. */
  public getRelationshipHistory(npcId: string, playerId: string): Array<{ event: string; date: number; change: number }> {
    return this.getRelationship(npcId, playerId)?.history || [];
  }

  // --- 4. Faction Management ---

  /** Creates a new faction. */
  public createFaction(name: string): void {
    if (!this.factions.has(name)) {
      this.factions.set(name, new Set<string>());
    }
  }

  /** Assigns an NPC to a faction, removing them from any previous one. */
  public joinFaction(npcId: string, factionName: string): void {
    const npc = this.getNPC(npcId);
    if (!npc) return;

    // Remove from old faction
    if (npc.faction && this.factions.has(npc.faction)) {
      this.factions.get(npc.faction)?.delete(npcId);
    }

    // Add to new faction
    if (!this.factions.has(factionName)) {
      this.createFaction(factionName);
    }
    this.factions.get(factionName)?.add(npcId);
    npc.faction = factionName;
  }

  /** Calculates a player's average affinity with all members of a faction. */
  public getFactionRelationship(playerId: string, factionName: string): number {
    const memberIds = this.factions.get(factionName);
    if (!memberIds || memberIds.size === 0) return 0;

    let totalAffinity = 0;
    let membersWithRelationship = 0;

    for (const npcId of memberIds) {
      const relationship = this.getRelationship(npcId, playerId);
      if (relationship) {
        totalAffinity += relationship.affinity;
        membersWithRelationship++;
      }
    }

    return membersWithRelationship > 0 ? totalAffinity / membersWithRelationship : 0;
  }

  // --- 5. Interaction ---

  /** Generates a simple line of dialogue based on the NPC's opinion of a player. */
  public getNPCOpinion(npcId: string, playerId: string): string {
    const relationship = this.getRelationship(npcId, playerId);
    const rank = relationship ? relationship.rank : this.getRank(0);

    switch (rank) {
      case 'Hated': return "I want you gone. Now.";
      case 'Enemy': return "Don't speak to me.";
      case 'Unfriendly': return "What do you want?";
      case 'Neutral': return "Can I help you?";
      case 'Friendly': return "Good to see you, friend.";
      case 'Trusted': return "It's an honor to have you here.";
      case 'Ally': return "Whatever you need, I'm with you.";
      case 'Beloved': return "My friend! Your presence is a blessing.";
      default: return "Hmm.";
    }
  }

  // --- 6. Serialization ---

  /** Serializes the entire state of the class to a JSON string. */
  public serialize(): string {
    const state: SerializableState = {
      npcs: Array.from(this.npcs.entries()),
      relationships: Array.from(this.relationships.entries()),
      factions: Array.from(this.factions.entries()).map(([name, members]) => [name, Array.from(members)]),
    };
    // Need to handle Map serialization within NPC objects
    state.npcs.forEach(([_, npc]) => {
      // @ts-ignore - Temporarily re-assigning for serialization
      npc.relationships = Array.from(npc.relationships.entries());
    });
    return JSON.stringify(state);
  }

  /** Deserializes a JSON string to restore the class's state. */
  public deserialize(json: string): void {
    const state: SerializableState = JSON.parse(json);

    this.npcs.clear();
    state.npcs.forEach(([id, npcData]) => {
      // @ts-ignore - Re-hydrating Map from array
      npcData.relationships = new Map(npcData.relationships);
      this.npcs.set(id, npcData);
    });

    this.relationships.clear();
    this.relationships = new Map(state.relationships);

    this.factions.clear();
    state.factions.forEach(([name, members]) => {
      this.factions.set(name, new Set(members));
    });
  }
}