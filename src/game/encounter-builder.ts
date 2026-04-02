/**
 * DMLog.ai - Procedural Encounter Generator for D&D 5e
 * File: src/game/encounter-builder.ts
 */

export interface Encounter {
  id: string;
  name: string;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  enemies: Array<{
    name: string;
    hp: number;
    ac: number;
    cr: number;
    type: string;
  }>;
  environment: string;
  tactics: string;
  loot: object[];
  xp: number;
  description: string;
}

export interface Biome {
  name: string;
  enemies: Array<{
    name: string;
    cr: number;
    type: string;
    count: [number, number];
  }>;
  features: string[];
  hazards: string[];
}

export class EncounterBuilder {
  private biomes = new Map<string, Biome>();
  private history: Encounter[] = [];

  constructor() {
    this.initializeBiomes();
  }

  /**
   * Pre-populates 10 distinct biomes with 5-8 enemies each, features, and hazards.
   */
  private initializeBiomes(): void {
    const defaultBiomes: Biome[] = [
      {
        name: 'Forest',
        enemies: [
          { name: 'Bandits', cr: 0.125, type: 'humanoid', count: [2, 6] },
          { name: 'Wolf', cr: 0.25, type: 'beast', count: [2, 5] },
          { name: 'Goblin', cr: 0.25, type: 'humanoid', count: [3, 8] },
          { name: 'Bear', cr: 1, type: 'beast', count: [1, 2] },
          { name: 'Dire Wolf', cr: 1, type: 'beast', count: [1, 3] },
          { name: 'Owlbear', cr: 3, type: 'monstrosity', count: [1, 2] },
          { name: 'Treant', cr: 9, type: 'plant', count: [1, 1] },
          { name: 'Green Dragon', cr: 15, type: 'dragon', count: [1, 1] }
        ],
        features: ['Dense thickets', 'Ancient oak trees', 'Fallen logs', 'Babbling brook'],
        hazards: ['Poison ivy', 'Hidden roots (tripping)', 'Obscuring mist']
      },
      {
        name: 'Cave',
        enemies: [
          { name: 'Bat Swarm', cr: 0.25, type: 'beast', count: [1, 4] },
          { name: 'Giant Centipede', cr: 0.25, type: 'beast', count: [2, 6] },
          { name: 'Giant Spider', cr: 1, type: 'beast', count: [1, 3] },
          { name: 'Cave Bear', cr: 2, type: 'beast', count: [1, 2] },
          { name: 'Troll', cr: 5, type: 'giant', count: [1, 2] },
          { name: 'Umber Hulk', cr: 5, type: 'monstrosity', count: [1, 1] },
          { name: 'Roper', cr: 5, type: 'monstrosity', count: [1, 1] },
          { name: 'Purple Worm', cr: 15, type: 'monstrosity', count: [1, 1] }
        ],
        features: ['Stalactites', 'Echoing chambers', 'Underground stream', 'Glowing fungi'],
        hazards: ['Slippery moss', 'Unstable ceiling', 'Pitch black darkness']
      },
      {
        name: 'Swamp',
        enemies: [
          { name: 'Giant Rat', cr: 0.125, type: 'beast', count: [3, 8] },
          { name: 'Crocodile', cr: 0.5, type: 'beast', count: [1, 4] },
          { name: 'Lizardfolk', cr: 0.5, type: 'humanoid', count: [2, 5] },
          { name: 'Giant Toad', cr: 1, type: 'beast', count: [1, 3] },
          { name: 'Will-o\'-Wisp', cr: 2, type: 'undead', count: [1, 3] },
          { name: 'Green Hag', cr: 3, type: 'fey', count: [1, 1] },
          { name: 'Shambling Mound', cr: 5, type: 'plant', count: [1, 1] },
          { name: 'Black Dragon', cr: 14, type: 'dragon', count: [1, 1] }
        ],
        features: ['Murky water', 'Weeping willows', 'Thick fog', 'Half-sunken ruins'],
        hazards: ['Quicksand', 'Disease-carrying insects', 'Poisonous gas pockets']
      },
      {
        name: 'Mountain',
        enemies: [
          { name: 'Eagle', cr: 0, type: 'beast', count: [2, 4] },
          { name: 'Blood Hawk', cr: 0.125, type: 'beast', count: [2, 6] },
          { name: 'Giant Eagle', cr: 1, type: 'beast', count: [1, 2] },
          { name: 'Harpy', cr: 1, type: 'monstrosity', count: [2, 5] },
          { name: 'Griffon', cr: 2, type: 'monstrosity', count: [1, 3] },
          { name: 'Stone Giant', cr: 7, type: 'giant', count: [1, 2] },
          { name: 'Roc', cr: 11, type: 'monstrosity', count: [1, 1] },
          { name: 'Red Dragon', cr: 17, type: 'dragon', count: [1, 1] }
        ],
        features: ['Steep cliffs', 'Snowy peaks', 'Narrow ledges', 'Boulders'],
        hazards: ['Avalanche risk', 'Freezing winds', 'Loose rocks']
      },
      {
        name: 'Desert',
        enemies: [
          { name: 'Jackal', cr: 0, type: 'beast', count: [2, 6] },
          { name: 'Dust Mephit', cr: 0.5, type: 'elemental', count: [2, 4] },
          { name: 'Yuan-ti Pureblood', cr: 1, type: 'humanoid', count: [1, 4] },
          { name: 'Giant Scorpion', cr: 3, type: 'beast', count: [1, 2] },
          { name: 'Mummy', cr: 3, type: 'undead', count: [1, 3] },
          { name: 'Efreeti', cr: 11, type: 'elemental', count: [1, 1] },
          { name: 'Purple Worm', cr: 15, type: 'monstrosity', count: [1, 1] },
          { name: 'Blue Dragon', cr: 16, type: 'dragon', count: [1, 1] }
        ],
        features: ['Rolling dunes', 'Scorched earth', 'Oasis', 'Sandstone ruins'],
        hazards: ['Extreme heat', 'Sandstorms', 'Mirages']
      },
      {
        name: 'Coast',
        enemies: [
          { name: 'Crab', cr: 0, type: 'beast', count: [4, 10] },
          { name: 'Sahuagin', cr: 0.5, type: 'humanoid', count: [2, 6] },
          { name: 'Sea Hag', cr: 2, type: 'fey', count: [1, 1] },
          { name: 'Water Elemental', cr: 5, type: 'elemental', count: [1, 2] },
          { name: 'Marid', cr: 11, type: 'elemental', count: [1, 1] },
          { name: 'Storm Giant', cr: 13, type: 'giant', count: [1, 1] },
          { name: 'Bronze Dragon', cr: 15, type: 'dragon', count: [1, 1] },
          { name: 'Kraken', cr: 23, type: 'monstrosity', count: [1, 1] }
        ],
        features: ['Tide pools', 'Crashing waves', 'Sandy beaches', 'Jagged rocks'],
        hazards: ['High tide', 'Undertow', 'Slippery seaweed']
      },
      {
        name: 'Ruins',
        enemies: [
          { name: 'Skeleton', cr: 0.25, type: 'undead', count: [3, 8] },
          { name: 'Zombie', cr: 0.25, type: 'undead', count: [3, 8] },
          { name: 'Ghoul', cr: 1, type: 'undead', count: [2, 5] },
          { name: 'Gargoyle', cr: 2, type: 'elemental', count: [1, 4] },
          { name: 'Wight', cr: 3, type: 'undead', count: [1, 2] },
          { name: 'Ghost', cr: 4, type: 'undead', count: [1, 1] },
          { name: 'Vampire', cr: 15, type: 'undead', count: [1, 1] },
          { name: 'Lich', cr: 21, type: 'undead', count: [1, 1] }
        ],
        features: ['Crumbling walls', 'Broken statues', 'Overgrown courtyards', 'Hidden vaults'],
        hazards: ['Collapsing floors', 'Ancient traps', 'Cursed objects']
      },
      {
        name: 'Underdark',
        enemies: [
          { name: 'Drow', cr: 0.25, type: 'humanoid', count: [2, 6] },
          { name: 'Duergar', cr: 1, type: 'humanoid', count: [2, 5] },
          { name: 'Hook Horror', cr: 3, type: 'monstrosity', count: [1, 3] },
          { name: 'Drider', cr: 6, type: 'monstrosity', count: [1, 2] },
          { name: 'Mind Flayer', cr: 7, type: 'aberration', count: [1, 2] },
          { name: 'Aboleth', cr: 10, type: 'aberration', count: [1, 1] },
          { name: 'Beholder', cr: 13, type: 'aberration', count: [1, 1] }
        ],
        features: ['Bioluminescent flora', 'Vast chasms', 'Crystal formations', 'Mushroom forests'],
        hazards: ['Madness-inducing whispers', 'Toxic spores', 'Lava flows']
      },
      {
        name: 'Feywild',
        enemies: [
          { name: 'Sprite', cr: 0.25, type: 'fey', count: [3, 7] },
          { name: 'Pixie', cr: 0.25, type: 'fey', count: [2, 5] },
          { name: 'Satyr', cr: 0.5, type: 'fey', count: [1, 4] },
          { name: 'Dryad', cr: 1, type: 'fey', count: [1, 2] },
          { name: 'Displacer Beast', cr: 3, type: 'monstrosity', count: [1, 2] },
          { name: 'Unicorn', cr: 5, type: 'celestial', count: [1, 1] },
          { name: 'Fomorian', cr: 8, type: 'giant', count: [1, 2] },
          { name: 'Treant', cr: 9, type: 'plant', count: [1, 2] }
        ],
        features: ['Oversized vibrant flowers', 'Sparkling streams', 'Twilight sky', 'Fairy rings'],
        hazards: ['Time dilation', 'Memory loss', 'Enchanting music']
      },
      {
        name: 'City',
        enemies: [
          { name: 'Guard', cr: 0.125, type: 'humanoid', count: [2, 6] },
          { name: 'Noble', cr: 0.125, type: 'humanoid', count: [1, 2] },
          { name: 'Thug', cr: 0.5, type: 'humanoid', count: [2, 5] },
          { name: 'Bandit Captain', cr: 2, type: 'humanoid', count: [1, 1] },
          { name: 'Veteran', cr: 3, type: 'humanoid', count: [1, 3] },
          { name: 'Mage', cr: 6, type: 'humanoid', count: [1, 1] },
          { name: 'Assassin', cr: 8, type: 'humanoid', count: [1, 1] }
        ],
        features: ['Cobblestone streets', 'Crowded markets', 'Dark alleyways', 'Taverns'],
        hazards: ['Pickpockets', 'Runaway carts', 'Corrupt officials']
      }
    ];

    defaultBiomes.forEach(b => this.addBiome(b));
  }

  // --- 1. Generate Encounter ---
  public generate(
    partyLevel: number,
    partySize: number,
    biomeName: string,
    difficulty: Encounter['difficulty'] = 'medium'
  ): Encounter {
    const biome = this.getBiome(biomeName) || this.getBiome('Forest');
    const targetXp = this.getTargetXp(partyLevel, partySize, difficulty);
    
    let currentXp = 0;
    const enemies: Encounter['enemies'] = [];
    
    // Filter enemies that are too strong individually
    const available = biome.enemies.filter(e => this.crToXp(e.cr) <= targetXp * 1.2);
    const pool = available.length > 0 ? available : [biome.enemies[0]];

    let safety = 0;
    while (currentXp < targetXp && safety < 50) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      const xpVal = this.crToXp(template.cr);
      
      if (currentXp + xpVal > targetXp * 1.25 && enemies.length > 0) break;

      enemies.push(this.instantiateEnemy(template));
      currentXp += xpVal;
      safety++;
    }

    const actualDifficulty = this.getDifficulty(currentXp, partyLevel, partySize) as Encounter['difficulty'];

    const encounter: Encounter = {
      id: this.uuid(),
      name: `${actualDifficulty.charAt(0).toUpperCase() + actualDifficulty.slice(1)} ${biome.name} Encounter`,
      difficulty: actualDifficulty,
      enemies,
      environment: this.getEnvironmentDescription(biome),
      tactics: this.getTactics(enemies),
      loot: this.generateLoot(Math.max(...enemies.map(e => e.cr))),
      xp: currentXp,
      description: `The party is confronted by ${enemies.length} enemies in the ${biome.name.toLowerCase()}.`
    };

    this.history.push(encounter);
    return encounter;
  }

  // --- 2. Generate Random ---
  public generateRandom(partyLevel: number, partySize: number): Encounter {
    const biomeKeys = Array.from(this.biomes.keys());
    const randomBiome = biomeKeys[Math.floor(Math.random() * biomeKeys.length)];
    const difficulties: Encounter['difficulty'][] = ['easy', 'medium', 'hard', 'deadly'];
    const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    return this.generate(partyLevel, partySize, randomBiome, randomDiff);
  }

  // --- 3. Generate Boss ---
  public generateBoss(partyLevel: number): Encounter {
    const targetXp = partyLevel * 100 * 4; // Deadly for 4 players
    let bestEnemy = null;
    let bestDiff = Infinity;
    let bestBiome = 'Forest';

    for (const [bName, biome] of this.biomes.entries()) {
      for (const enemy of biome.enemies) {
        const diff = Math.abs(this.crToXp(enemy.cr) - targetXp);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestEnemy = enemy;
          bestBiome = bName;
        }
      }
    }

    const biome = this.getBiome(bestBiome);
    const boss = this.instantiateEnemy(bestEnemy!);
    boss.hp = Math.floor(boss.hp * 1.5); // Boss HP buff

    const encounter: Encounter = {
      id: this.uuid(),
      name: `Boss: ${boss.name}`,
      difficulty: 'deadly',
      enemies: [boss],
      environment: this.getEnvironmentDescription(biome) + " The area feels ominous and heavily guarded.",
      tactics: "The boss uses its environment to its advantage, targeting the weakest party members first.",
      loot: this.generateLoot(boss.cr + 2), // Better loot
      xp: this.crToXp(boss.cr),
      description: `A terrifying ${boss.name} stands before the party, ready for a fight to the death.`
    };

    this.history.push(encounter);
    return encounter;
  }

  // --- 4. Generate Ambush ---
  public generateAmbush(partyLevel: number, partySize: number, terrain: string): Encounter {
    const encounter = this.generate(partyLevel, partySize, terrain, 'hard');
    encounter.name = `Ambush in the ${terrain}`;
    encounter.tactics = "Ambush! Enemies start hidden and attack with surprise. They focus fire on the most vulnerable target.";
    encounter.description = `Without warning, enemies spring from concealment in the ${terrain.toLowerCase()}!`;
    return encounter;
  }

  // --- 5. Generate Social ---
  public generateSocial(partyLevel: number): Encounter {
    const biome = this.getBiome('City') || Array.from(this.biomes.values())[0];
    const socialEnemies = biome.enemies.filter(e => e.type === 'humanoid' || e.type === 'fey');
    const template = socialEnemies.length ? socialEnemies[Math.floor(Math.random() * socialEnemies.length)] : biome.enemies[0];

    const encounter: Encounter = {
      id: this.uuid(),
      name: `Social: ${template.name}`,
      difficulty: 'trivial',
      enemies: [this.instantiateEnemy(template)],
      environment: this.getEnvironmentDescription(biome),
      tactics: "Non-hostile. Open to conversation, negotiation, or trade.",
      loot: [],
      xp: 0,
      description: `The party encounters a ${template.name} who seems willing to talk rather than fight.`
    };

    this.history.push(encounter);
    return encounter;
  }

  // --- 6. Get Difficulty ---
  public getDifficulty(xp: number, partyLevel: number, partySize: number): string {
    const xpPerPlayer = xp / partySize;
    if (xpPerPlayer < partyLevel * 25) return 'trivial';
    if (xpPerPlayer < partyLevel * 50) return 'easy';
    if (xpPerPlayer < partyLevel * 75) return 'medium';
    if (xpPerPlayer < partyLevel * 100) return 'hard';
    return 'deadly';
  }

  // --- 7. Calculate XP ---
  public calculateXP(enemies: Encounter['enemies']): number {
    return enemies.reduce((total, enemy) => total + this.crToXp(enemy.cr), 0);
  }

  // --- 8. Get Biome ---
  public getBiome(name: string): Biome {
    const biome = this.biomes.get(name);
    if (!biome) throw new Error(`Biome '${name}' not found.`);
    return biome;
  }

  // --- 9. Add Biome ---
  public addBiome(data: Biome): void {
    this.biomes.set(data.name, data);
  }

  // --- 10. Get Encounter History ---
  public getEncounterHistory(): Encounter[] {
    return [...this.history];
  }

  // --- 11. Get Encounters By Difficulty ---
  public getEncountersByDifficulty(diff: Encounter['difficulty']): Encounter[] {
    return this.history.filter(e => e.difficulty === diff);
  }

  // --- 12. Get Encounters By Biome ---
  public getEncountersByBiome(biomeName: string): Encounter[] {
    return this.history.filter(e => e.environment.includes(biomeName));
  }

  // --- 13. Scale Encounter ---
  public scaleEncounter(encounter: Encounter, newLevel: number): Encounter {
    // Attempt to extract biome from environment string, fallback to Forest
    const biomeName = Array.from(this.biomes.keys()).find(b => encounter.environment.includes(b)) || 'Forest';
    // Estimate party size based on old XP and old difficulty
    const partySize = 4; // Defaulting to 4 for scaling simplicity
    
    return this.generate(newLevel, partySize, biomeName, encounter.difficulty === 'trivial' ? 'easy' : encounter.difficulty);
  }

  // --- 14. Get Environment Description ---
  public getEnvironmentDescription(biome: Biome): string {
    const feature = biome.features[Math.floor(Math.random() * biome.features.length)];
    const hazard = biome.hazards[Math.floor(Math.random() * biome.hazards.length)];
    return `A ${biome.name} environment featuring ${feature.toLowerCase()}. Beware of ${hazard.toLowerCase()}.`;
  }

  // --- 15. Get Tactics ---
  public getTactics(enemies: Encounter['enemies']): string {
    const types = new Set(enemies.map(e => e.type.toLowerCase()));
    const tactics: string[] = [];

    if (types.has('beast')) tactics.push("Beasts use pack tactics and target the smallest or most isolated party member.");
    if (types.has('dragon')) tactics.push("Dragons stay mobile, using breath weapons early and often.");
    if (types.has('humanoid')) tactics.push("Humanoids utilize cover, focus fire on spellcasters, and may retreat if outmatched.");
    if (types.has('undead')) tactics.push("Undead fight relentlessly to the death, ignoring their own safety.");
    if (types.has('monstrosity')) tactics.push("Monstrosities rely on their unique physical traits and ambush tactics.");
    if (types.has('aberration')) tactics.push("Aberrations use mind-altering abilities to confuse and divide the party.");
    
    if (tactics.length === 0) tactics.push("Enemies attack the closest threat directly.");
    
    return tactics.join(" ");
  }

  // --- 16. Generate Loot ---
  public generateLoot(cr: number): object[] {
    const loot: object[] = [];
    const gold = Math.floor(Math.random() * (cr * 50 + 10)) + 5;
    loot.push({ type: 'currency', name: 'Gold Pieces', amount: gold });

    if (cr >= 2 && Math.random() > 0.5) {
      loot.push({ type: 'consumable', rarity: 'common', name: 'Potion of Healing' });
    }
    if (cr >= 5 && Math.random() > 0.6) {
      loot.push({ type: 'magic_item', rarity: 'uncommon', name: '+1 Weapon or Armor' });
    }
    if (cr >= 10 && Math.random() > 0.7) {
      loot.push({ type: 'magic_item', rarity: 'rare', name: 'Wondrous Item (Rare)' });
    }
    if (cr >= 15 && Math.random() > 0.8) {
      loot.push({ type: 'magic_item', rarity: 'very_rare', name: 'Legendary Artifact' });
    }

    return loot;
  }

  // --- 17. Serialize / Deserialize ---
  public serialize(): string {
    return JSON.stringify({
      history: this.history,
      biomes: Array.from(this.biomes.entries())
    });
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.history) this.history = parsed.history;
      if (parsed.biomes) this.biomes = new Map(parsed.biomes);
    } catch (e) {
      throw new Error("Failed to deserialize EncounterBuilder data.");
    }
  }

  // --- Helper Methods ---

  private getTargetXp(partyLevel: number,