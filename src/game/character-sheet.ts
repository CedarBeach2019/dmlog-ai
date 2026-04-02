// src/game/character-sheet.ts
// DMLog.ai — Full D&D 5e Character Management

export interface Equipment {
  name: string;
  type: string;
  quantity: number;
  weight: number;
  value: number;
  equipped: boolean;
  description?: string;
  properties?: string[];
}

export interface Character {
  id: string;
  name: string;
  race: string;
  className: string;
  level: number;
  xp: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  proficiencyBonus: number;
  skills: Record<string, boolean>;
  savingThrows: Record<string, boolean>;
  equipment: Equipment[];
  features: string[];
  spells: string[];
  gold: number;
  notes: string;
  backstory: string;
  portrait?: string;
}

interface DeathSaves { successes: number; failures: number; }

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const SKILL_MAP: Record<string, keyof Character['abilities']> = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str', deception: 'cha',
  history: 'int', insight: 'wis', intimidation: 'cha', investigation: 'int', medicine: 'wis',
  nature: 'int', perception: 'wis', performance: 'cha', persuasion: 'cha', religion: 'int',
  sleightOfHand: 'dex', stealth: 'dex', survival: 'wis'
};

export class CharacterSheet {
  private characters: Map<string, Character> = new Map();
  private deathSaves: Map<string, DeathSaves> = new Map();

  createCharacter(data: Partial<Character> & { name: string }): Character {
    const id = `char_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const character: Character = {
      id, name: data.name, race: data.race ?? 'Human', className: data.className ?? 'Fighter',
      level: data.level ?? 1, xp: data.xp ?? 0,
      abilities: data.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      hp: data.hp ?? 10, maxHp: data.maxHp ?? 10, tempHp: data.tempHp ?? 0,
      ac: data.ac ?? 10, speed: data.speed ?? 30,
      proficiencyBonus: data.proficiencyBonus ?? 2,
      skills: data.skills ?? {}, savingThrows: data.savingThrows ?? {},
      equipment: data.equipment ?? [], features: data.features ?? [],
      spells: data.spells ?? [], gold: data.gold ?? 0,
      notes: data.notes ?? '', backstory: data.backstory ?? '', portrait: data.portrait,
    };
    this.characters.set(id, character);
    this.deathSaves.set(id, { successes: 0, failures: 0 });
    return character;
  }

  getCharacter(id: string): Character {
    const char = this.characters.get(id);
    if (!char) throw new Error(`Character ${id} not found`);
    return char;
  }

  updateCharacter(id: string, updates: Partial<Character>): void {
    const char = this.getCharacter(id);
    this.characters.set(id, { ...char, ...updates, id: char.id });
  }

  levelUp(id: string, xpGained: number): { newLevel: number; hpGained: number; featuresGained: string[] } {
    const char = this.getCharacter(id);
    char.xp += xpGained;
    const oldLevel = char.level;

    while (char.level < 20 && char.xp >= (XP_THRESHOLDS[char.level] ?? Infinity)) {
      char.level++;
    }

    const levelsGained = char.level - oldLevel;
    const hpGained = levelsGained * (Math.max(1, this.modScore('con')) + 5); // Avg d10 hit die
    char.maxHp += hpGained;
    char.hp += hpGained;

    const featuresGained: string[] = [];
    [5, 11, 17].forEach(lvl => { if (char.level >= lvl && oldLevel < lvl) featuresGained.push(`Proficiency +${this.getProficiency(char.level)}`); });
    char.proficiencyBonus = this.getProficiency(char.level);

    this.characters.set(id, char);
    return { newLevel: char.level, hpGained, featuresGained };
  }

  private getProficiency(level: number): number { return Math.ceil(level / 4) + 1; }

  modScore(ability: keyof Character['abilities']): number {
    return Math.floor((this.getCharacter(Object.values(this.characters.keys().next().value ?? {})[0] ?? '').abilities[ability] - 10) / 2);
  }

  getMod(score: number): number { return Math.floor((score - 10) / 2); }

  skillBonus(skillName: string, charId?: string): number {
    const char = charId ? this.getCharacter(charId) : this.characters.values().next().value as Character;
    const ability = SKILL_MAP[skillName];
    if (!ability) return 0;
    const mod = this.getMod(char.abilities[ability]);
    return mod + (char.skills[skillName] ? char.proficiencyBonus : 0);
  }

  savingThrowBonus(ability: keyof Character['abilities'], charId?: string): number {
    const char = charId ? this.getCharacter(charId) : this.characters.values().next().value as Character;
    return this.getMod(char.abilities[ability]) + (char.savingThrows[ability] ? char.proficiencyBonus : 0);
  }

  getPassivePerception(charId?: string): number { return 10 + this.skillBonus('perception', charId); }
  getPassiveInvestigation(charId?: string): number { return 10 + this.skillBonus('investigation', charId); }
  getInitiative(charId?: string): number { 
    const char = charId ? this.getCharacter(charId) : this.characters.values().next().value as Character;
    return this.getMod(char.abilities.dex); 
  }

  addEquipment(id: string, item: Equipment): void {
    const char = this.getCharacter(id);
    const existing = char.equipment.find(e => e.name.toLowerCase() === item.name.toLowerCase());
    if (existing) existing.quantity += item.quantity;
    else char.equipment.push({ ...item });
    this.characters.set(id, char);
  }

  removeEquipment(id: string, itemName: string): void {
    const char = this.getCharacter(id);
    char.equipment = char.equipment.filter(e => e.name.toLowerCase() !== itemName.toLowerCase());
    this.characters.set(id, char);
  }

  equipItem(id: string, itemName: string): void {
    const char = this.getCharacter(id);
    const item = char.equipment.find(e => e.name.toLowerCase() === itemName.toLowerCase());
    if (item) item.equipped = !item.equipped;
    this.characters.set(id, char);
  }

  getEquippedItems(id: string): Equipment[] { return this.getCharacter(id).equipment.filter(e => e.equipped); }
  getTotalWeight(id: string): number { return this.getCharacter(id).equipment.reduce((sum, e) => sum + (e.weight * e.quantity), 0); }
  getCarryingCapacity(id: string): number { return this.getCharacter(id).abilities.str * 15; }

  applyDamage(id: string, amount: number): { remaining: number; isDown: boolean; deathSaves: DeathSaves } {
    const char = this.getCharacter(id);
    const ds = this.deathSaves.get(id) ?? { successes: 0, failures: 0 };
    let remaining = amount;

    if (char.tempHp > 0) {
      const absorbed = Math.min(char.tempHp, remaining);
      char.tempHp -= absorbed;
      remaining -= absorbed;
    }

    char.hp = Math.max(0, char.hp - remaining);
    let isDown = false;

    if (char.hp === 0) {
      isDown = true;
      ds.failures += (amount >= char.maxHp) ? 2 : 0; // Massive damage (simplified)
      if (ds.failures >= 3) char.hp = -1; // Dead
    }

    this.characters.set(id, char);
    this.deathSaves.set(id, ds);
    return { remaining: char.hp, isDown, deathSaves: { ...ds } };
  }

  applyHealing(id: string, amount: number): { remaining: number; overhealed: number } {
    const char = this.getCharacter(id);
    this.deathSaves.set(id, { successes: 0, failures: 0 }); // Reset on stabilization/heal
    const overhealed = Math.max(0, char.hp + amount - char.maxHp);
    char.hp = Math.min(char.maxHp, char.hp + amount);
    this.characters.set(id, char);
    return { remaining: char.hp, overhealed };
  }

  getCharacterSummary(id: string): string {
    const c = this.getCharacter(id);
    return `${c.name} — ${c.race} ${c.className} ${c.level} | HP: ${c.hp}/${c.maxHp} AC: ${c.ac} | XP: ${c.xp}`;
  }

  exportCharacterSheet(id: string): string {
    const c = this.getCharacter(id);
    const m = (a: keyof Character['abilities']) => this.getMod(c.abilities[a]);
    const s = (sk: string) => this.skillBonus(sk, id);
    const eq = (e: Equipment) => `- ${e.name} (x${e.quantity}) [${e.equipped ? 'E' : '‒'}] ${e.weight}lb ${e.value}gp`;
    
    return `# ${c.name}
**${c.race} ${c.className} ${c.level}** | XP: ${c.xp} | Prof: +${c.proficiencyBonus}
## Combat
**HP:** ${c.hp}/${c.maxHp} (Temp: ${c.tempHp}) | **AC:** ${c.ac} | **Speed:** ${c.speed}ft | **Init:** ${this.getInitiative(id)}
## Abilities
| STR | DEX | CON | INT | WIS | CHA |
|:---:|:---:|:---:|:---:|:---:|:---:|
| ${c.abilities.str} (${m('str')}) | ${c.abilities.dex} (${m('dex')}) | ${c.abilities.con} (${m('con')}) | ${c.abilities.int} (${m('int')}) | ${c.abilities.wis} (${m('wis')}) | ${c.abilities.cha} (${m('cha')}) |
## Skills & Saves
**Passive Perception:** ${this.getPassivePerception(id)} | **Passive Investigation:** ${this.getPassiveInvest