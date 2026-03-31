/**
 * NPC generation and relationship tracking — D&D 5e inspired.
 *
 * Random NPC generation with name tables by race, personality traits,
 * backstory templates, relationship tracking with trust scores, and
 * dynamic disposition changes based on interactions.
 */

import { DiceRoller } from "./dice.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NPCRace = "human" | "elf" | "dwarf" | "halfling" | "gnome" | "half-orc" | "half-elf" | "tiefling" | "dragonborn";

export type Disposition = "friendly" | "neutral" | "wary" | "hostile";

export type Occupation =
  | "blacksmith" | "merchant" | "guard" | "innkeeper" | "farmer"
  | "healer" | "scholar" | "thief" | "soldier" | "sailor"
  | "hunter" | "priest" | "bard" | "alchemist" | "baker"
  | "carpenter" | "fisher" | "librarian" | "noble" | "beggar";

export interface PersonalityTraits {
  traits: string[];     // 1-2 personality traits
  ideals: string;       // core ideal
  bonds: string;        // emotional bond
  flaws: string;        // character flaw
}

export interface Relationship {
  targetId: string;           // player or NPC ID
  disposition: Disposition;
  trust: number;              // -100 to +100
  interactionCount: number;
  lastInteraction: number;    // timestamp
  notes: string;              // freeform notes
}

export interface NPCInteraction {
  npcId: string;
  playerId: string;
  action: string;
  outcome: "positive" | "negative" | "neutral";
  trustChange: number;
  timestamp: number;
  summary: string;
}

export interface NPCMemory {
  playerId: string;
  facts: string[];             // what the NPC knows about this player
  promises: string[];          // outstanding promises
  grievances: string[];        // unresolved conflicts
}

export interface NPC {
  id: string;
  name: string;
  race: NPCRace;
  occupation: Occupation;
  personality: PersonalityTraits;
  backstory: string;
  motivation: string;
  relationships: Map<string, Relationship>;
  memories: Map<string, NPCMemory>;
  location: string;            // location ID
  isAlive: boolean;
  knowledge: string[];         // topics this NPC can share information about
  questGiver: boolean;         // whether this NPC can give quests
  shopInventory: string[];     // item IDs if this NPC is a merchant
}

// ---------------------------------------------------------------------------
// Name tables
// ---------------------------------------------------------------------------

const NAMES_BY_RACE: Record<NPCRace, { first: string[]; last: string[] }> = {
  human: {
    first: ["Aldric", "Brenna", "Cedric", "Dara", "Edmund", "Fiona", "Gareth", "Helena", "Ivan", "Johana", "Karl", "Lyra", "Marcus", "Nora", "Oscar", "Petra"],
    last: ["Ashwood", "Blackstone", "Copperfield", "Darkwater", "Easthaven", "Fairchild", "Goldsmith", "Hartley", "Ironfoot", "Knightly", "Lakeshore", "Marshfield"],
  },
  elf: {
    first: ["Aeliana", "Braenil", "Caelum", "Daelia", "Erandil", "Faelar", "Gildor", "Haldir", "Ithilwen", "Laeriel", "Mithrandir", "Nimrodel"],
    last: ["Starwhisper", "Moonshadow", "Sunweaver", "Dawnblade", "Eveninggale", "Leafsong", "Silverleaf", "Goldpetal"],
  },
  dwarf: {
    first: ["Adrik", "Bruenor", "Dagnal", "Eberk", "Flint", "Gardain", "Harbek", "Kildrak", "Morgran", "Orsik", "Thorin", "Ulfgar"],
    last: ["Ironforge", "Stonehelm", "Copperbeard", "Anvilbane", "Deepdelver", "Goldcrusher", "Steelfist", "Hammerfall"],
  },
  halfling: {
    first: ["Alton", "Bramwell", "Cora", "Dunstan", "Elda", "Finn", "Gemma", "Harlin", "Ivy", "Jasper", "Kithri", "Lidda"],
    last: ["Goodbarrel", "Tealeaf", "Gathergood", "Hilltopple", "Honeywell", "Lightfoot", "Nimblefingers", "Quickwhistle"],
  },
  gnome: {
    first: ["Alvyn", "Bimpnottin", "Caramip", "Dubbledam", "Erbil", "Fonkin", "Glim", "Hugin", "Jasper", "Kellen", "Lupin", "Murdle"],
    last: ["Clocksworth", "Gearnackle", "Fizzwrench", "Brambleberry", "Tinkerdoodle", "Wafflefingers", "Sparkcrank", "Cogsworth"],
  },
  "half-orc": {
    first: ["Brug", "Drog", "Gorbag", "Krug", "Mug", "Narg", "Rhogar", "Shagrat", "Thok", "Ugrok", "Varg", "Zug"],
    last: ["Skullcrusher", "Bonebreaker", "Ironhide", "Stoneskin", "Warfang", "Bloodfang", "Fellhammer", "Doomchopper"],
  },
  "half-elf": {
    first: ["Arannis", "Belorin", "Cerys", "Drystan", "Elara", "Finnian", "Galenna", "Halrian", "Isolde", "Jareth", "Kaelen", "Lirien"],
    last: ["Twilight", "Breeze", "Moonrise", "Duskwalker", "Starling", "Halford", "Graymane", "Silverblood"],
  },
  tiefling: {
    first: ["Akmenos", "Barakas", "Damakos", "Ezreal", "Iados", "Kallista", "Levanna", "Mekarios", "Mortos", "Peleps", "Skamos", "Teos"],
    last: ["Ashborn", "Hellfire", "Dreadscale", "Shadowmere", "Nighthollow", "Voidwhisper", "Emberheart", "Grimveil"],
  },
  dragonborn: {
    first: ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Nadarr", "Pandjed", "Rhogar", "Torrin"],
    last: ["Clan Draconis", "Clan Ember", "Clan Scale", "Clan Fang", "Clan Stormwing", "Clan Ironscale", "Clan Blazeborn", "Clan Frostclaw"],
  },
};

// ---------------------------------------------------------------------------
// Personality tables
// ---------------------------------------------------------------------------

const PERSONALITY_TRAITS: string[] = [
  "I am always polite and respectful.",
  "I am haunted by memories of war. I can't get the images of violence out of my mind.",
  "I always have a plan for when things go wrong.",
  "I am incredibly slow to trust. Those who seem the fairest often have the most to hide.",
  "I would rather make a new friend than a new enemy.",
  "I have a joke for every occasion, especially occasions where humor is inappropriate.",
  "I am always calm, no matter the situation.",
  "I am confident that my abilities will see me through any challenge.",
  "I take great pains to always look my best and follow the latest fashions.",
  "I am rough around the edges but have a heart of gold.",
  "I am fiercely independent and resent being told what to do.",
  "I have a curious mind and am always seeking new knowledge.",
];

const IDEALS: string[] = [
  "Aspiration. I seek to prove myself worthy of something greater.",
  "Generosity. My talents were given to me so I could use them to benefit the world.",
  "Freedom. Tyrants must not be allowed to oppress the people.",
  "Might. The strongest survive, and I intend to be the strongest.",
  "Tradition. The ancient traditions must be preserved and upheld.",
  "Balance. All things must exist in harmony.",
  "Knowledge. The path to power is through knowledge.",
  "Redemption. I seek to atone for past wrongs.",
  "Community. I owe my strength to those who raised me.",
  "Nature. The natural world must be protected.",
];

const BONDS: string[] = [
  "I would die to recover an ancient relic of my faith.",
  "I will do anything to protect the people I love.",
  "Someone I loved died because of a mistake I made. It haunts me still.",
  "I owe my life to the person who took me in as an orphan.",
  "I am seeking revenge against those who destroyed my home.",
  "I must protect a sacred site that no one else knows about.",
  "An ancient artifact holds the key to my family's history.",
  "I must honor a promise made to a dying friend.",
  "I dream of one day returning to my homeland in glory.",
  "I seek a mentor who can teach me the secrets of my craft.",
];

const FLAWS: string[] = [
  "I am quick to anger and slow to forgive.",
  "I have a secret that could ruin my reputation.",
  "I am overly fond of strong drink.",
  "I am arrogant and believe I am superior to others.",
  "I am greedy and can't resist a shiny coin.",
  "I hold grudges and never forget a slight.",
  "I am suspicious of strangers and slow to trust.",
  "I have a terrible fear of something most people consider harmless.",
  "I am indecisive and struggle to commit to a course of action.",
  "I tend to exaggerate my accomplishments.",
];

const BACKSTORY_TEMPLATES: string[] = [
  "Once a respected member of the community, {name} fell on hard times after {event}. Now {pronoun} works as a {occupation}, hoping to one day reclaim {possessive} former standing.",
  "Born into poverty, {name} learned the ways of the {occupation} trade from a young age. {pronoun_cap} has always dreamed of something more than this humble life.",
  "{name} traveled from distant lands carrying nothing but {possessive} skills as a {occupation}. {pronoun_cap} seeks a new beginning far from the troubles of {possessive} past.",
  "A veteran of many battles, {name} retired to become a {occupation}. The scars of war still linger, both visible and hidden.",
  "{name} was raised by {guardian} after being orphaned at a young age. {pronoun_cap} became a {occupation} to honor {possessive} benefactor's memory.",
  "Mysterious and reserved, {name} the {occupation} has lived in this area for years, yet few know anything about {possessive} past.",
];

const MOTIVATIONS: string[] = [
  "To find a lost family heirloom.",
  "To earn enough gold to start a new life elsewhere.",
  "To protect the innocent from harm.",
  "To uncover the truth behind a local mystery.",
  "To repay a life debt to someone who saved them.",
  "To gain revenge against those who wronged them.",
  "To master their craft and become the best in the land.",
  "To find a cure for a loved one's illness.",
  "To amass power and influence.",
  "To travel the world and see everything it has to offer.",
];

// ---------------------------------------------------------------------------
// NPC Manager
// ---------------------------------------------------------------------------

let nextNpcId = 1;

export class NPCManager {
  private npcs: Map<string, NPC> = new Map();
  private interactionLog: NPCInteraction[] = [];
  private dice = new DiceRoller();

  // -----------------------------------------------------------------------
  // Generation
  // -----------------------------------------------------------------------

  /**
   * Generate a random NPC.
   */
  generate(opts?: {
    race?: NPCRace;
    occupation?: Occupation;
    location?: string;
    questGiver?: boolean;
  }): NPC {
    const race = opts?.race ?? this.randomRace();
    const occupation = opts?.occupation ?? this.randomOccupation();
    const name = this.generateName(race);
    const personality = this.generatePersonality();

    const backstory = this.fillTemplate(
      BACKSTORY_TEMPLATES[Math.floor(this.dice.d100() / 100 * BACKSTORY_TEMPLATES.length)],
      { name, occupation }
    );

    const motivation = MOTIVATIONS[Math.floor(this.dice.d100() / 100 * MOTIVATIONS.length)];

    const npc: NPC = {
      id: `npc_${nextNpcId++}_${Date.now().toString(36)}`,
      name,
      race,
      occupation,
      personality,
      backstory,
      motivation,
      relationships: new Map(),
      memories: new Map(),
      location: opts?.location ?? "",
      isAlive: true,
      knowledge: this.generateKnowledge(occupation),
      questGiver: opts?.questGiver ?? false,
      shopInventory: [],
    };

    this.npcs.set(npc.id, npc);
    return npc;
  }

  private randomRace(): NPCRace {
    const races: NPCRace[] = ["human", "human", "elf", "dwarf", "halfling", "gnome", "half-orc", "half-elf", "tiefling", "dragonborn"];
    return races[this.dice.d10() - 1] ?? "human";
  }

  private randomOccupation(): Occupation {
    const occupations: Occupation[] = [
      "blacksmith", "merchant", "guard", "innkeeper", "farmer",
      "healer", "scholar", "thief", "soldier", "sailor",
      "hunter", "priest", "bard", "alchemist", "baker",
      "carpenter", "fisher", "librarian", "noble", "beggar",
    ];
    return occupations[this.dice.d20() - 1] ?? "farmer";
  }

  private generateName(race: NPCRace): string {
    const table = NAMES_BY_RACE[race];
    const firstIdx = this.dice.roll(`1d${table.first.length}`)?.total ?? 0;
    const lastIdx = this.dice.roll(`1d${table.last.length}`)?.total ?? 0;
    return `${table.first[firstIdx - 1] ?? table.first[0]} ${table.last[lastIdx - 1] ?? table.last[0]}`;
  }

  private generatePersonality(): PersonalityTraits {
    const traitCount = 2;
    const traits: string[] = [];
    const usedIndices = new Set<number>();

    while (traits.length < traitCount) {
      const idx = Math.floor(this.dice.d100() / 100 * PERSONALITY_TRAITS.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        traits.push(PERSONALITY_TRAITS[idx]);
      }
    }

    return {
      traits,
      ideals: IDEALS[Math.floor(this.dice.d100() / 100 * IDEALS.length)],
      bonds: BONDS[Math.floor(this.dice.d100() / 100 * BONDS.length)],
      flaws: FLAWS[Math.floor(this.dice.d100() / 100 * FLAWS.length)],
    };
  }

  private fillTemplate(template: string, vars: { name: string; occupation: Occupation }): string {
    return template
      .replace(/{name}/g, vars.name)
      .replace(/{occupation}/g, vars.occupation)
      .replace(/{pronoun}/g, "they")
      .replace(/{pronoun_cap}/g, "They")
      .replace(/{possessive}/g, "their")
      .replace(/{event}/g, "a devastating fire")
      .replace(/{guardian}/g, "a kind stranger");
  }

  private generateKnowledge(occupation: Occupation): string[] {
    const base = ["local rumors", "nearby locations"];
    const occupational: Record<Occupation, string[]> = {
      blacksmith:  ["metalworking", "weapon quality", "local miners"],
      merchant:    ["trade routes", "item prices", "distant cities"],
      guard:       ["town defenses", "local criminals", "shift schedules"],
      innkeeper:   ["traveler gossip", "local events", "food and drink"],
      farmer:      ["crop cycles", "weather patterns", "local wildlife"],
      healer:      ["herbal remedies", "common diseases", "wound treatment"],
      scholar:     ["ancient history", "arcane theory", "old languages"],
      thief:       ["hidden passages", "security weaknesses", "black market"],
      soldier:     ["military tactics", "weapon training", "fortification"],
      sailor:      ["sea routes", "weather lore", "naval combat"],
      hunter:      ["animal behavior", "tracking", "wilderness survival"],
      priest:      ["religious texts", "divine rituals", "local legends"],
      bard:        ["songs and stories", "noble gossip", "performance venues"],
      alchemist:   ["potion recipes", "rare ingredients", "chemical reactions"],
      baker:       ["bread recipes", "grain prices", "local festivals"],
      carpenter:   ["woodworking", "building construction", "forest resources"],
      fisher:      ["fishing spots", "water currents", "aquatic life"],
      librarian:   ["book locations", "research methods", "hidden knowledge"],
      noble:       ["politics", "family lineages", "social etiquette"],
      beggar:      ["street secrets", "hidden passages", "who has coin"],
    };
    return [...base, ...(occupational[occupation] ?? [])];
  }

  // -----------------------------------------------------------------------
  // Interactions
  // -----------------------------------------------------------------------

  /**
   * Record an interaction between a player and an NPC.
   * Updates relationship trust and disposition accordingly.
   */
  interact(npcId: string, playerId: string, action: string, outcome: "positive" | "negative" | "neutral"): NPCInteraction {
    const npc = this.getNPCOrThrow(npcId);

    // Get or create relationship
    if (!npc.relationships.has(playerId)) {
      npc.relationships.set(playerId, {
        targetId: playerId,
        disposition: "neutral",
        trust: 0,
        interactionCount: 0,
        lastInteraction: Date.now(),
        notes: "",
      });
    }

    const relationship = npc.relationships.get(playerId)!;
    relationship.interactionCount++;
    relationship.lastInteraction = Date.now();

    // Calculate trust change
    let trustChange = 0;
    switch (outcome) {
      case "positive": trustChange = 5 + Math.floor(this.dice.d6() / 2); break;
      case "negative": trustChange = -(5 + Math.floor(this.dice.d6() / 2)); break;
      case "neutral":  trustChange = 0; break;
    }

    relationship.trust = Math.max(-100, Math.min(100, relationship.trust + trustChange));
    relationship.disposition = this.trustToDisposition(relationship.trust);

    const interaction: NPCInteraction = {
      npcId,
      playerId,
      action,
      outcome,
      trustChange,
      timestamp: Date.now(),
      summary: action,
    };

    this.interactionLog.push(interaction);
    return interaction;
  }

  private trustToDisposition(trust: number): Disposition {
    if (trust >= 30) return "friendly";
    if (trust >= -10) return "neutral";
    if (trust >= -40) return "wary";
    return "hostile";
  }

  // -----------------------------------------------------------------------
  // Memory
  // -----------------------------------------------------------------------

  /** Add a memory about a player to an NPC. */
  addMemory(npcId: string, playerId: string, fact: string): void {
    const npc = this.getNPCOrThrow(npcId);
    if (!npc.memories.has(playerId)) {
      npc.memories.set(playerId, { playerId, facts: [], promises: [], grievances: [] });
    }
    const memory = npc.memories.get(playerId)!;
    if (!memory.facts.includes(fact)) {
      memory.facts.push(fact);
    }
  }

  /** Record a promise made by a player to an NPC. */
  addPromise(npcId: string, playerId: string, promise: string): void {
    const npc = this.getNPCOrThrow(npcId);
    if (!npc.memories.has(playerId)) {
      npc.memories.set(playerId, { playerId, facts: [], promises: [], grievances: [] });
    }
    npc.memories.get(playerId)!.promises.push(promise);
  }

  /** Record a grievance against a player. */
  addGrievance(npcId: string, playerId: string, grievance: string): void {
    const npc = this.getNPCOrThrow(npcId);
    if (!npc.memories.has(playerId)) {
      npc.memories.set(playerId, { playerId, facts: [], promises: [], grievances: [] });
    }
    npc.memories.get(playerId)!.grievances.push(grievance);
  }

  /** Resolve a promise (remove it from the NPC's memory). */
  resolvePromise(npcId: string, playerId: string, promiseIndex: number): boolean {
    const npc = this.getNPCOrThrow(npcId);
    const memory = npc.memories.get(playerId);
    if (!memory || promiseIndex >= memory.promises.length) return false;
    memory.promises.splice(promiseIndex, 1);
    return true;
  }

  /** Check if the NPC knows a specific fact about a player. */
  knowsAbout(npcId: string, playerId: string, topic: string): boolean {
    const npc = this.getNPCOrThrow(npcId);
    const memory = npc.memories.get(playerId);
    if (!memory) return false;
    return memory.facts.some((f) => f.toLowerCase().includes(topic.toLowerCase()));
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  getNPCsByLocation(locationId: string): NPC[] {
    return [...this.npcs.values()].filter((n) => n.location === locationId && n.isAlive);
  }

  getRelationship(npcId: string, playerId: string): Relationship | undefined {
    return this.npcs.get(npcId)?.relationships.get(playerId);
  }

  getInteractionLog(npcId?: string): NPCInteraction[] {
    if (npcId) return this.interactionLog.filter((i) => i.npcId === npcId);
    return [...this.interactionLog];
  }

  /** Remove an NPC (kill them). */
  killNPC(id: string): boolean {
    const npc = this.npcs.get(id);
    if (!npc) return false;
    npc.isAlive = false;
    return true;
  }

  private getNPCOrThrow(id: string): NPC {
    const npc = this.npcs.get(id);
    if (!npc) throw new Error(`NPC not found: ${id}`);
    return npc;
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      npcs: Array.from(this.npcs.entries()).map(([k, v]) => [
        k,
        { ...v, relationships: Array.from(v.relationships.entries()), memories: Array.from(v.memories.entries()) },
      ]),
      interactionLog: this.interactionLog,
      nextNpcId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.npcs = new Map(
      parsed.npcs.map(([k, v]: [string, any]) => [
        k,
        { ...v, relationships: new Map(v.relationships), memories: new Map(v.memories) },
      ])
    );
    this.interactionLog = parsed.interactionLog ?? [];
    nextNpcId = parsed.nextNpcId ?? this.npcs.size + 1;
  }
}
