// src/game/encounter-builder.ts — DMLog.ai Encounter Builder

export interface Monster {
  name: string;
  cr: number;
  hp: number;
  ac: number;
  damage: string;
  speed: number;
  abilities: string[];
  type: string;
}

export interface EncounterMonster {
  monster: Monster;
  count: number;
}

export interface Encounter {
  id: string;
  name: string;
  description: string;
  monsters: EncounterMonster[];
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';
  partyLevel: number;
  partySize: number;
  xpBudget: number;
  environment: string;
  tactics: string[];
  loot: string[];
}

export interface EncounterBalance {
  encounter: Encounter;
  predictedRounds: number;
  partySurvival: number;
  resourceDrain: number;
  threatLevel: number;
}

export interface PlayerTwin {
  fightingStyle: 'aggressive' | 'defensive' | 'ranged' | 'stealthy' | 'support';
  preferredRange: 'melee' | 'ranged';
  threatTolerance: number;
}

type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly';

const ENVIRONMENTS = ['forest', 'dungeon', 'cave', 'ruins', 'mountain', 'swamp', 'urban', 'coastal'];

export class EncounterBuilder {
  private monsters: Monster[];
  private xpTable: Record<number, number>;
  private customMonsters: Monster[];

  constructor() {
    this.customMonsters = [];
    this.xpTable = {
      0: 10, 0.25: 50, 0.5: 100, 1: 200, 2: 450,
      3: 700, 5: 1800, 7: 2900, 10: 5900, 17: 18000,
    };

    this.monsters = [
      { name: 'Goblin', cr: 0.25, hp: 7, ac: 15, damage: '1d6+2', speed: 30, abilities: ['Nimble Escape'], type: 'humanoid' },
      { name: 'Skeleton', cr: 0.25, hp: 13, ac: 13, damage: '1d6+2', speed: 30, abilities: ['Vulnerability: Bludgeoning'], type: 'undead' },
      { name: 'Wolf', cr: 0.25, hp: 11, ac: 13, damage: '2d6+2', speed: 40, abilities: ['Pack Tactics'], type: 'beast' },
      { name: 'Bandit', cr: 0.5, hp: 11, ac: 12, damage: '1d6+1', speed: 30, abilities: ['Light Crossbow'], type: 'humanoid' },
      { name: 'Zombie', cr: 0.25, hp: 22, ac: 8, damage: '1d6+1', speed: 20, abilities: ['Undead Fortitude'], type: 'undead' },
      { name: 'Giant Rat', cr: 0, hp: 7, ac: 12, damage: '1d4', speed: 30, abilities: ['Pack Tactics'], type: 'beast' },
      { name: 'Guard', cr: 0.5, hp: 11, ac: 16, damage: '1d6+1', speed: 30, abilities: ['Formation Fighting'], type: 'humanoid' },
      { name: 'Skeleton Knight', cr: 1, hp: 22, ac: 16, damage: '1d8+2', speed: 30, abilities: ['Martial Training'], type: 'undead' },
      { name: 'Orc', cr: 0.5, hp: 15, ac: 13, damage: '1d12+3', speed: 30, abilities: ['Aggressive Charge'], type: 'humanoid' },
      { name: 'Bugbear', cr: 1, hp: 27, ac: 16, damage: '2d8+2', speed: 30, abilities: ['Surprise Attack', 'Brute'], type: 'humanoid' },
      { name: 'Shadow', cr: 0.5, hp: 16, ac: 12, damage: '2d6', speed: 40, abilities: ['Strength Drain', 'Amorphous'], type: 'undead' },
      { name: 'Ghoul', cr: 1, hp: 22, ac: 12, damage: '2d6+1', speed: 30, abilities: ['Paralysis Touch'], type: 'undead' },
      { name: 'Ochre Jelly', cr: 2, hp: 45, ac: 8, damage: '2d6+3', speed: 20, abilities: ['Split', 'Immunity: Acid'], type: 'ooze' },
      { name: 'Mimic', cr: 2, hp: 31, ac: 12, damage: '1d8+3', speed: 15, abilities: ['Adhesive', 'Shapechanger'], type: 'monstrosity' },
      { name: 'Owlbear', cr: 3, hp: 59, ac: 13, damage: '2d8+4', speed: 40, abilities: ['Multiattack'], type: 'beast' },
      { name: 'Troll', cr: 5, hp: 84, ac: 15, damage: '3d6+5', speed: 30, abilities: ['Regeneration', 'Keen Smell'], type: 'giant' },
      { name: 'Young Dragon', cr: 7, hp: 133, ac: 17, damage: '3d10+6', speed: 80, abilities: ['Breath Weapon', 'Flight'], type: 'dragon' },
      { name: 'Mind Flayer', cr: 7, hp: 71, ac: 15, damage: '2d10+4', speed: 30, abilities: ['Mind Blast', 'Extract Brain'], type: 'aberration' },
      { name: 'Beholder', cr: 10, hp: 180, ac: 18, damage: '3d6+5', speed: 0, abilities: ['Antimagic Cone', 'Eye Rays'], type: 'aberration' },
      { name: 'Ancient Dragon', cr: 17, hp: 333, ac: 21, damage: '4d10+8', speed: 80, abilities: ['Legendary Actions', 'Frightful Presence', 'Breath Weapon'], type: 'dragon' },
    ];
  }

  private getXPBudget(partyLevel: number, partySize: number, difficulty: Difficulty): number {
    const perPlayerXP: Record<Difficulty, number> = {
      trivial: 25,
      easy: 50 + partyLevel * 15,
      medium: 75 + partyLevel * 25,
      hard: 125 + partyLevel * 40,
      deadly: 200 + partyLevel * 60,
    };
    return (perPlayerXP[difficulty] || 50) * partySize;
  }

  private getMonsterXP(cr: number): number {
    if (this.xpTable[cr] !== undefined) return this.xpTable[cr];
    const keys = Object.keys(this.xpTable).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
      if (cr > keys[i] && cr < keys[i + 1]) return this.xpTable[keys[i + 1]];
    }
    return cr > 17 ? 18000 : 10;
  }

  private getMultiplier(count: number): number {
    if (count === 1) return 1.0;
    if (count === 2) return 1.5;
    if (count <= 6) return 2.0;
    if (count <= 10) return 2.5;
    return 3.0;
  }

  private parseAverageDamage(damage: string): number {
    const match = damage.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return 1;
    const num = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const mod = match[3] ? parseInt(match[3]) : 0;
    return num * ((sides + 1) / 2) + mod;
  }

  private selectMonsters(budget: number): EncounterMonster[] {
    const selected: EncounterMonster[] = [];
    let remaining = budget;

    const targetCR = Math.max(0.25, budget / 800);
    const candidates = [...this.monsters].sort((a, b) =>
      Math.abs(a.cr - targetCR) - Math.abs(b.cr - targetCR)
    );

    if (candidates.length > 0) {
      const primary = candidates[0];
      const primaryXP = this.getMonsterXP(primary.cr);
      const count = Math.max(1, Math.min(Math.floor(budget / primaryXP), 12));
      selected.push({ monster: primary, count });
      remaining -= count * primaryXP;
    }

    if (remaining > 50) {
      const supportPool = this.monsters.filter(m => this.getMonsterXP(m.cr) <= remaining);
      if (supportPool.length > 0) {
        const support = supportPool[Math.floor(Math.random() * supportPool.length)];
        const supXP = this.getMonsterXP(support.cr);
        const supCount = Math.max(1, Math.min(Math.floor(remaining / supXP), 6));
        selected.push({ monster: support, count: supCount });
      }
    }

    return selected;
  }

  private generateTactics(monsters: EncounterMonster[]): string[] {
    const tactics: string[] = [];
    monsters.forEach(({ monster, count }) => {
      if (count > 2) tactics.push(`Use ${monster.name} pack tactics to overwhelm`);
      monster.abilities.forEach(a => {
        if (a.includes('Breath') || a.includes('Mind Blast')) tactics.push(`Open with ${a} for area damage`);
        else if (a.includes('Regeneration')) tactics.push(`Force party to focus ${monster.name} to stop regeneration`);
        else if (a.includes('Flight') || a.includes('Speed')) tactics.push(`${monster.name} uses mobility to kite`);
        else if (a.includes('Paralysis') || a.includes('Drain')) tactics.push(`Prioritize ${a} to debilitate targets`);
        else if (a.includes('Legendary')) tactics.push(`Use legendary actions for additional pressure`);
        else if (a.includes('Surprise')) tactics.push(`Ambush with ${monster.name} for extra damage`);
      });
    });
    return tactics;
  }

  private generateLoot(monsters: EncounterMonster[]): string[] {
    const loot: string[] = ['2d6 gold pieces'];
    monsters.forEach(({ monster }) => {
      const cr = monster.cr;
      if (cr >= 0.5) loot.push(`${Math.ceil(cr * 2)}d4 silver pieces`);
      if (cr >= 1) loot.push('Potion of Healing');
      if (cr >= 2) loot.push('Minor magic trinket');
      if (cr >= 5) loot.push('Uncommon magic item');
      if (cr >= 7) loot.push('Rare magic item');
      if (cr >= 10) loot.push('Very rare magic item');
      if (cr >= 17) loot.push('Legendary magic item');
    });
    return [...new Set(loot)];
  }

  buildEncounter(partyLevel: number, partySize: number, difficulty: Difficulty): Encounter {
    const xpBudget = this.getXPBudget(partyLevel, partySize, difficulty);
    const encounterMonsters = this.selectMonsters(xpBudget);
    const environment = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];

    const totalMonsters = encounterMonsters.reduce((sum, e) => sum + e.count, 0);
    const name = totalMonsters === 1
      ? `${encounterMonsters[0].monster.name} Ambush`
      : `${encounterMonsters[0].monster.name} Horde`;
    
    const desc = `A ${difficulty} encounter featuring ${encounterMonsters.map(e => `${e.count}x ${e.monster.name}`).join(' and ')} in a ${environment} setting.`;

    return {
      id: `enc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      description: desc,
      monsters: encounterMonsters,
      difficulty,
      partyLevel,
      partySize,
      xpBudget,
      environment,
      tactics: this.generateTactics(encounterMonsters),
      loot: this.generateLoot(encounterMonsters),
    };
  }

  balanceEncounter(encounter: Encounter): EncounterBalance {
    const totalMonsterHP = encounter.monsters.reduce(
      (sum, e) => sum + e.monster.hp * e.count, 0
    );
    const avgMonsterAC = encounter.monsters.reduce(
      (sum, e) => sum + e.monster.ac * e.count, 0
    ) / Math.max(1, encounter.monsters.reduce((s, e) => s + e.count, 0));

    // Party DPR estimation: ~level * 3 + 5 per character at ~60% hit rate