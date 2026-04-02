// src/game/reputation-system.ts

export interface Faction {
  id: string;
  name: string;
  alignment: string;
  description: string;
  allies: string[];
  enemies: string[];
  quests: string[];
  ranks: string[];
  base: string;
  leader: string;
  symbol: string;
}

export interface Standing {
  factionId: string;
  reputation: number;
  rank: string;
  title: string;
  perks: string[];
  questsCompleted: number;
  joinedAt: number;
  exiled: boolean;
}

export class ReputationSystem {
  private factions = new Map<string, Faction>();
  private standings = new Map<string, Standing>();

  constructor() {
    this.prePopulateFactions();
  }

  private prePopulateFactions(): void {
    const factionData: Faction[] = [
      {
        id: "iron_guard",
        name: "The Iron Guard",
        alignment: "Lawful Good",
        description: "The steadfast city watch dedicated to law and order.",
        allies: ["silver_flame", "merchants_guild", "celestial_choir"],
        enemies: ["shadow_syndicate", "black_market", "undead_covenant"],
        quests: ["Patrol the Slums", "Arrest the Smugglers", "Defend the Gates"],
        ranks: ["Recruit", "Guardsman", "Captain", "Commander"],
        base: "The Bastion of Justice",
        leader: "Commander Vane",
        symbol: "A silver shield with an iron gauntlet",
      },
      {
        id: "shadow_syndicate",
        name: "The Shadow Syndicate",
        alignment: "Chaotic Evil",
        description: "A ruthless thieves guild operating in the city's underbelly.",
        allies: ["black_market"],
        enemies: ["iron_guard", "silver_flame", "merchants_guild"],
        quests: ["Heist the Treasury", "Assassinate the Informant", "Extort the Merchants"],
        ranks: ["Footpad", "Cutpurse", "Shadow", "Guildmaster"],
        base: "The Obsidian Vault",
        leader: "Silas 'The Wraith' Vance",
        symbol: "A dagger piercing a coin",
      },
      {
        id: "arcane_circle",
        name: "The Arcane Circle",
        alignment: "Neutral",
        description: "A secretive conclave of wizards seeking forbidden knowledge.",
        allies: ["explorers_society"],
        enemies: ["undead_covenant", "bloodfang_clan"],
        quests: ["Recover the Lost Tome", "Seal the Rift", "Gather Leyline Dust"],
        ranks: ["Novice", "Adept", "Magus", "Archmage"],
        base: "The Spire of Stars",
        leader: "Archmage Elara",
        symbol: "An eye within a glowing hexagram",
      },
      {
        id: "merchants_guild",
        name: "The Merchants Guild",
        alignment: "Neutral",
        description: "A powerful trade conglomerate controlling the city's wealth.",
        allies: ["iron_guard", "deep_dwellers"],
        enemies: ["shadow_syndicate", "black_market"],
        quests: ["Escort the Caravan", "Negotiate Trade Treaty", "Break the Monopoly"],
        ranks: ["Associate", "Trader", "Merchant Lord", "High Treasurer"],
        base: "The Gilded Exchange",
        leader: "Lord Sterling",
        symbol: "Golden scales",
      },
      {
        id: "druidic_order",
        name: "The Druidic Order",
        alignment: "Neutral Good",
        description: "Protectors of the ancient wilds and natural balance.",
        allies: ["explorers_society", "celestial_choir"],
        enemies: ["undead_covenant", "bloodfang_clan"],
        quests: ["Cleanse the Blight", "Awaken the Treant", "Stop the Poachers"],
        ranks: ["Initiate", "Warden", "Elder", "Archdruid"],
        base: "The Emerald Grove",
        leader: "Archdruid Sylas",
        symbol: "An oak leaf wrapped in vines",
      },
      {
        id: "silver_flame",
        name: "The Order of the Silver Flame",
        alignment: "Lawful Good",
        description: "Zealous paladins dedicated to eradicating evil.",
        allies: ["iron_guard", "celestial_choir"],
        enemies: ["shadow_syndicate", "undead_covenant", "black_market"],
        quests: ["Purge the Crypt", "Rescue the Captives", "Slay the Demon"],
        ranks: ["Squire", "Knight", "Inquisitor", "Grandmaster"],
        base: "The Radiant Citadel",
        leader: "Grandmaster Kaelen",
        symbol: "A blazing silver sword",
      },
      {
        id: "bloodfang_clan",
        name: "The Bloodfang Clan",
        alignment: "Chaotic Neutral",
        description: "Fierce barbarian warriors from the untamed steppes.",
        allies: ["black_market"],
        enemies: ["iron_guard", "arcane_circle", "druidic_order"],
        quests: ["Hunt the Behemoth", "Raid the Outpost", "Prove Your Strength"],
        ranks: ["Whelp", "Blood-Brother", "Chieftain", "Warlord"],
        base: "The Crimson Crags",
        leader: "Warlord Grom",
        symbol: "A wolf skull",
      },
      {
        id: "deep_dwellers",
        name: "The Deep Dwellers",
        alignment: "Neutral",
        description: "Stoic dwarven miners unearthing the world's deepest secrets.",
        allies: ["merchants_guild", "explorers_society"],
        enemies: ["shadow_syndicate"],
        quests: ["Clear the Mineshaft", "Forge the Mithril", "Defeat the Cave Troll"],
        ranks: ["Miner", "Foreman", "Thane", "Mountain King"],
        base: "The Underforge",
        leader: "King Thordin",
        symbol: "Crossed pickaxes over an anvil",
      },
      {
        id: "celestial_choir",
        name: "The Celestial Choir",
        alignment: "Lawful Good",
        description: "Devout clerics bringing healing and light to the masses.",
        allies: ["silver_flame", "iron_guard", "druidic_order"],
        enemies: ["undead_covenant", "shadow_syndicate"],
        quests: ["Heal the Sick", "Consecrate the Shrine", "Banish the Shadows"],
        ranks: ["Acolyte", "Priest", "Bishop", "High Priest"],
        base: "The Cathedral of Dawn",
        leader: "High Priestess Lyra",
        symbol: "A sunburst",
      },
      {
        id: "black_market",
        name: "The Black Market",
        alignment: "Chaotic Evil",
        description: "A loose network of smugglers dealing in illicit goods.",
        allies: ["shadow_syndicate", "bloodfang_clan"],
        enemies: ["iron_guard", "merchants_guild", "silver_flame"],
        quests: ["Smuggle the Contraband", "Bribe the Guards", "Fence the Jewels"],
        ranks: ["Runner", "Smuggler", "Fixer", "Kingpin"],
        base: "The Sunken Docks",
        leader: "Madam Zora",
        symbol: "A keyhole shaped like a skull",
      },
      {
        id: "explorers_society",
        name: "The Explorers Society",
        alignment: "Neutral",
        description: "Daring adventurers mapping the unknown corners of the world.",
        allies: ["arcane_circle", "deep_dwellers", "druidic_order"],
        enemies: [],
        quests: ["Map the Ruins", "Retrieve the Artifact", "Survive the Jungle"],
        ranks: ["Scout", "Pathfinder", "Trailblazer", "Grand Explorer"],
        base: "The Compass Rose Lodge",
        leader: "Sir Reginald",
        symbol: "A compass over a map",
      },
      {
        id: "undead_covenant",
        name: "The Undead Covenant",
        alignment: "Chaotic Evil",
        description: "Foul necromancers seeking eternal life through undeath.",
        allies: [],
        enemies: ["silver_flame", "celestial_choir", "druidic_order", "iron_guard"],
        quests: ["Harvest the Corpses", "Perform the Ritual", "Raise the Dracolich"],
        ranks: ["Cultist", "Necromancer", "Lich", "Deathlord"],
        base: "The Necropolis",
        leader: "Malthus the Undying",
        symbol: "A skeletal hand holding a black flame",
      }
    ];

    for (const faction of factionData) {
      this.factions.set(faction.id, faction);
    }
  }

  // 1. getFaction
  public getFaction(id: string): Faction {
    const faction = this.factions.get(id);
    if (!faction) throw new Error(`Faction ${id} not found.`);
    return faction;
  }

  // 2. getAllFactions
  public getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  // 3. getStanding
  public getStanding(factionId: string): Standing {
    if (!this.standings.has(factionId)) {
      const faction = this.getFaction(factionId);
      this.standings.set(factionId, {
        factionId,
        reputation: 0,
        rank: faction.ranks[0],
        title: faction.ranks[0],
        perks: [],
        questsCompleted: 0,
        joinedAt: Date.now(),
        exiled: false,
      });
    }
    return this.standings.get(factionId)!;
  }

  // 4. modifyReputation
  public modifyReputation(factionId: string, amount: number): Standing {
    const standing = this.getStanding(factionId);
    if (standing.exiled) return standing;

    standing.reputation = Math.max(-100, Math.min(100, standing.reputation + amount));
    this.updateRankAndPerks(factionId, standing);
    return standing;
  }

  private updateRankAndPerks(factionId: string, standing: Standing): void {
    const faction = this.getFaction(factionId);
    let rankIndex = 0;

    if (standing.reputation < -50) {
      standing.rank = "Hunted";
      standing.title = "Enemy of the Faction";
      standing.perks = [];
      return;
    } else if (standing.reputation < 0) {
      standing.rank = "Disliked";
      standing.title = "Outsider";
      standing.perks = [];
      return;
    } else if (standing.reputation >= 75) {
      rankIndex = 3;
    } else if (standing.reputation >= 50) {
      rankIndex = 2;
    } else if (standing.reputation >= 25) {
      rankIndex = 1;
    }

    standing.rank = faction.ranks[rankIndex];
    standing.title = faction.ranks[rankIndex];
    
    // Assign perks based on rank index
    const allPerks = [`${factionId}_access`, `${factionId}_discount`, `${factionId}_elite_gear`, `${factionId}_leadership`];
    standing.perks = allPerks.slice(0, rankIndex + 1);
  }

  // 5. completeQuestForFaction
  public completeQuestForFaction(factionId: string): Standing {
    const standing = this.getStanding(factionId);
    standing.questsCompleted += 1;
    return this.modifyReputation(factionId, 15); // +15 rep per quest
  }

  // 6. getRank
  public getRank(factionId: string): string {
    return this.getStanding(factionId).rank;
  }

  // 7. getMaxRank
  public getMaxRank(factionId: string): string {
    const faction = this.getFaction(factionId);
    return faction.ranks[faction.ranks.length - 1];
  }

  // 8. getPerks
  public getPerks(factionId: string): string[] {
    return this.getStanding(factionId).perks;
  }

  // 9. isAlliedWith
  public isAlliedWith(factionId: string): boolean {
    const standing = this.getStanding(factionId);
    return standing.reputation >= 50 && !standing.exiled;
  }

  // 10. isHostileTo
  public isHostileTo(factionId: string): boolean {
    const standing = this.getStanding(factionId);
    return standing.reputation <= -50 || standing.exiled;
  }

  // 11. exileFrom
  public exileFrom(factionId: string): void {
    const standing = this.getStanding(factionId);
    standing.exiled = true;
    standing.reputation = -100;
    standing.rank = "Exiled";
    standing.title = "Traitor";
    standing.perks = [];
  }

  // 12. getFactionRelations
  public getFactionRelations(factionId: string): { allies: string[]; enemies: string[] } {
    const faction = this.getFaction(factionId);
    return { allies: faction.allies, enemies: faction.enemies };
  }

  // 13. getReputationSummary
  public getReputationSummary(): string {
    if (this.standings.size === 0) return "No known factions.";
    let summary = "Reputation Summary:\n";
    for (const [id, standing] of this.standings.entries()) {
      const faction = this.getFaction(id);
      summary += `- ${faction.name}: ${standing.reputation} Rep (${standing.rank})\n`;
    }
    return summary.trim();
  }

  // 14. getMostHated
  public getMostHated(): string {
    let lowestRep = Infinity;
    let hatedId = "";
    for (const [id, standing] of this.standings.entries()) {
      if (standing.reputation < lowestRep) {
        lowestRep = standing.reputation;
        hatedId = id;
      }
    }
    return hatedId || "None";
  }

  // 15. getMostLoved
  public getMostLoved(): string {
    let highestRep = -Infinity;
    let lovedId = "";
    for (const [id, standing] of this.standings.entries()) {
      if (standing.reputation > highestRep) {
        highestRep = standing.reputation;
        lovedId = id;
      }
    }
    return lovedId || "None";
  }

  // 16. getPerkDescription
  public getPerkDescription(perk: string): string {
    if (perk.endsWith("_access")) return "Grants access to the faction's secure base and basic facilities.";
    if (perk.endsWith("_discount")) return "Provides a 15% discount on all goods and services from faction vendors.";
    if (perk.endsWith("_elite_gear")) return "Unlocks the ability to purchase elite, faction-specific weaponry and armor.";
    if (perk.endsWith("_leadership")) return "Grants command over lower-ranking faction members and a daily resource stipend.";
    return "An unknown faction benefit.";
  }

  // 17. getFactionQuests
  public getFactionQuests(factionId: string): string[] {
    return this.getFaction(factionId).quests;
  }

  // 18. getFactionShop
  public getFactionShop(factionId: string): string[] {
    const standing = this.getStanding(factionId);
    const shop: string[] = ["Basic Rations", "Standard Healing Potion"];
    
    if (standing.reputation >= 25) {
      shop.push("Faction Tabard", "Sturdy Boots");
    }
    if (standing.reputation >= 50) {
      shop.push("Greater Healing Potion", "Faction Insignia Ring");
    }
    if (standing.reputation >= 75) {
      shop.push("Masterwork Weapon", "Artifact of the Leader");
    }
    
    return standing.exiled || standing.reputation < 0 ? [] : shop;
  }

  // 19. serialize / deserialize
  public serialize(): string {
    return JSON.stringify(Array.from(this.standings.entries()));
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as [string, Standing][];
      this.standings = new Map<string, Standing>(parsed);
    } catch (e) {
      throw new Error("Failed to deserialize reputation data.");
    }
  }
}