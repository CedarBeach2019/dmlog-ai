export interface NPC {
  id: string;
  name: string;
  race: string;
  class: string;
  alignment: string;
  personality: string;
  appearance: string;
  voice: string;
  secret: string;
  questHook: string;
  inventory: string[];
  relationships: Array<{ target: string; type: string; description: string }>;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  mood: string;
  location: string;
}

export class NPCGenerator {
  private npcs = new Map<string, NPC>();

  // Procedural Generation Data
  private races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Dragonborn', 'Goblin', 'Orc', 'Fairy'];
  private classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Bard', 'Druid', 'Sorcerer', 'Warlock', 'Monk', 'Barbarian', 'Artificer', 'Commoner', 'Merchant', 'Guard', 'Noble', 'Priest', 'Sailor', 'Farmer'];
  private alignments = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
  private personalityTraits = ['friendly', 'grumpy', 'mysterious', 'cheerful', 'suspicious', 'nervous', 'arrogant', 'humble', 'sarcastic', 'earnest', 'eccentric', 'stoic'];
  private secrets = ['secretly a spy', 'hiding a magical item', 'running from the law', 'cursed', 'actually immortal', 'secretly royalty', 'possessed by a spirit', 'searching for lost family'];
  private appearances = ['scarred face', 'missing an eye', 'impeccably dressed', 'covered in dirt', 'wears oversized clothes', 'has a prominent tattoo', 'bald with a braided beard', 'strikingly beautiful', 'looks perpetually exhausted'];
  private voices = ['deep and raspy', 'high-pitched and fast', 'melodic and calm', 'booming and loud', 'whispers constantly', 'stutters when nervous', 'speaks in a monotone', 'thick regional accent'];
  private questHooks = ['needs an escort to a nearby town', 'lost a family heirloom in the ruins', 'looking for revenge against a local gang', 'wants to hire muscle for a heist', 'needs rare herbs for a cure', 'has a map leading to buried treasure'];
  private moods = ['happy', 'sad', 'angry', 'anxious', 'bored', 'excited', 'thoughtful', 'drunk'];
  private locations = ['Tavern', 'Market Square', 'City Gates', 'Temple', 'Docks', 'Slums', 'Noble District', 'Wilderness'];

  // --- Helper Methods ---

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private rollStat(): number {
    return Math.floor(Math.random() * 11) + 8; // Rolls 8-18 for decent baseline NPCs
  }

  private generateName(race: string): string {
    const prefixes = ['Thor', 'Gim', 'Ael', 'Fae', 'Brog', 'Kael', 'Syl', 'Mor', 'Drak', 'Zin', 'Lu', 'Orik'];
    const suffixes = ['in', 'li', 'as', 'wyn', 'gar', 'th', 'ia', 'gorn', 'dor', 'x', 'kas', 'us'];
    return this.pick(prefixes) + this.pick(suffixes);
  }

  // --- 1-4: Generation Methods ---

  public generate(race?: string, class_?: string, alignment?: string): NPC {
    const npcRace = race || this.pick(this.races);
    const npcClass = class_ || this.pick(this.classes);
    const npcAlignment = alignment || this.pick(this.alignments);

    const npc: NPC = {
      id: this.generateId(),
      name: this.generateName(npcRace),
      race: npcRace,
      class: npcClass,
      alignment: npcAlignment,
      personality: this.pick(this.personalityTraits),
      appearance: this.pick(this.appearances),
      voice: this.pick(this.voices),
      secret: this.pick(this.secrets),
      questHook: this.pick(this.questHooks),
      inventory: ['Pouch of coins', 'Dagger', 'Personal trinket'],
      relationships: [],
      stats: {
        str: this.rollStat(), dex: this.rollStat(), con: this.rollStat(),
        int: this.rollStat(), wis: this.rollStat(), cha: this.rollStat()
      },
      mood: this.pick(this.moods),
      location: this.pick(this.locations)
    };

    this.npcs.set(npc.id, npc);
    return npc;
  }

  public generateByName(name: string, race?: string, class_?: string): NPC {
    const npc = this.generate(race, class_);
    npc.name = name;
    this.npcs.set(npc.id, npc);
    return npc;
  }

  public generateByRole(role: string): NPC {
    let class_ = 'Commoner';
    let inventory = ['Pouch of copper'];
    let location = 'Market Square';

    switch (role.toLowerCase()) {
      case 'shopkeeper':
        class_ = 'Merchant'; inventory = ['Ledger', 'Abacus', 'Keys']; location = 'Market Square'; break;
      case 'guard':
        class_ = 'Guard'; inventory = ['Spear', 'Lantern', 'Badge']; location = 'City Gates'; break;
      case 'innkeeper':
        class_ = 'Commoner'; inventory = ['Rag', 'Keys', 'Ale mug']; location = 'Tavern'; break;
      case 'sage':
        class_ = 'Wizard'; inventory = ['Spellbook', 'Spectacles', 'Scrolls']; location = 'Temple'; break;
      case 'blacksmith':
        class_ = 'Artificer'; inventory = ['Smithing hammer', 'Tongs', 'Iron ingots']; location = 'Market Square'; break;
    }

    const npc = this.generate(undefined, class_);
    npc.inventory = inventory;
    npc.location = location;
    this.npcs.set(npc.id, npc);
    return npc;
  }

  public generateParty(level: number): NPC[] {
    const partyClasses = ['Fighter', 'Cleric', 'Rogue', 'Wizard'];
    const party = partyClasses.map(c => {
      const npc = this.generate(undefined, c);
      npc.inventory.push(`Level ${level} Adventuring Gear`, 'Healing Potion');
      return npc;
    });

    // Interlink party relationships
    for (let i = 0; i < party.length; i++) {
      for (let j = 0; j < party.length; j++) {
        if (i !== j) {
          this.addRelationship(party[i].id, party[j].id, 'Ally', 'Adventuring companion');
        }
      }
    }
    return party;
  }

  // --- 5-9: Retrieval & Search Methods ---

  public getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  public search(query: string): NPC[] {
    const q = query.toLowerCase();
    return Array.from(this.npcs.values()).filter(npc =>
      npc.name.toLowerCase().includes(q) ||
      npc.race.toLowerCase().includes(q) ||
      npc.class.toLowerCase().includes(q) ||
      npc.personality.toLowerCase().includes(q)
    );
  }

  public getByRace(race: string): NPC[] {
    return Array.from(this.npcs.values()).filter(n => n.race.toLowerCase() === race.toLowerCase());
  }

  public getByClass(class_: string): NPC[] {
    return Array.from(this.npcs.values()).filter(n => n.class.toLowerCase() === class_.toLowerCase());
  }

  public getByLocation(location: string): NPC[] {
    return Array.from(this.npcs.values()).filter(n => n.location.toLowerCase() === location.toLowerCase());
  }

  // --- 10-12: Updates & Relationships ---

  public updateNPC(id: string, updates: Partial<NPC>): void {
    const npc = this.npcs.get(id);
    if (npc) {
      Object.assign(npc, updates);
      this.npcs.set(id, npc);
    }
  }

  public addRelationship(id: string, target: string, type: string, description: string): void {
    const npc = this.npcs.get(id);
    if (npc) {
      // Prevent duplicate relationships to the same target
      const existing = npc.relationships.findIndex(r => r.target === target);
      if (existing >= 0) {
        npc.relationships[existing] = { target, type, description };
      } else {
        npc.relationships.push({ target, type, description });
      }
    }
  }

  public getRelationships(id: string): Array<{ target: string; type: string; description: string }> {
    return this.npcs.get(id)?.relationships || [];
  }

  // --- 13-15: Flavor & Interaction ---

  public getDialogueStyle(id: string): string {
    const npc = this.npcs.get(id);
    if (!npc) return '';
    return `${npc.name} speaks in a ${npc.voice} voice. They come across as ${npc.personality} and currently seem ${npc.mood}.`;
  }

  public getReaction(id: string, stimulus: string): string {
    const npc = this.npcs.get(id);
    if (!npc) return '';
    
    if (npc.mood === 'angry' || npc.personality === 'grumpy') {
      return `${npc.name} glares at the ${stimulus}, crossing their arms defensively.`;
    }
    if (npc.personality === 'nervous' || npc.mood === 'anxious') {
      return `${npc.name} flinches at the ${stimulus}, looking around for an exit.`;
    }
    if (npc.personality === 'cheerful' || npc.mood === 'happy') {
      return `${npc.name} smiles warmly at the ${stimulus}, clearly intrigued.`;
    }
    return `${npc.name} regards the ${stimulus} with a stoic, unreadable expression.`;
  }

  public getRumor(id: string): string {
    const npc = this.npcs.get(id);
    if (!npc) return '';
    
    const intro = this.pick([
      "I shouldn't be telling you this, but...",
      "Word around town is...",
      "If you're looking for work, I heard someone...",
      "Keep your voice down, but..."
    ]);

    // 50/50 chance to share their own quest hook or hint at their secret
    if (Math.random() > 0.5) {
      return `"${intro} ${npc.questHook}."`;
    } else {
      return `"${intro} there's someone in the ${npc.location} who is ${npc.secret}."`;
    }
  }

  // --- 16-17: Data Management ---

  public getAll(): NPC[] {
    return Array.from(this.npcs.values());
  }

  public serialize(): string {
    return JSON.stringify(Array.from(this.npcs.entries()));
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.npcs = new Map<string, NPC>(parsed);
    } catch (e) {
      console.error("Failed to deserialize NPC data", e);
    }
  }
}