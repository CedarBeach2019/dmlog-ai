/**
 * Character creation and management — D&D 5e inspired.
 *
 * Races, classes, ability scores, leveling, skill checks, saving throws,
 * spell slots, equipment, and character sheet serialization.
 */

import { DiceRoller } from "./dice.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export type RaceName = "human" | "elf" | "dwarf" | "halfling" | "gnome" | "half-orc" | "half-elf" | "tiefling" | "dragonborn";

export type ClassName = "fighter" | "wizard" | "rogue" | "cleric" | "ranger" | "paladin" | "barbarian" | "bard" | "druid" | "monk" | "sorcerer" | "warlock";

export type Alignment = "lawful-good" | "neutral-good" | "chaotic-good" | "lawful-neutral" | "true-neutral" | "chaotic-neutral" | "lawful-evil" | "neutral-evil" | "chaotic-evil";

export type SkillName =
  | "acrobatics" | "animal-handling" | "arcana" | "athletics"
  | "deception" | "history" | "insight" | "intimidation"
  | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleight-of-hand"
  | "stealth" | "survival";

export type HitDieType = "d6" | "d8" | "d10" | "d12";

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SpellSlotInfo {
  [level: string]: { max: number; used: number };
}

export interface Character {
  id: string;
  name: string;
  race: RaceName;
  class: ClassName;
  level: number;
  experience: number;
  alignment: Alignment;
  background: string;
  abilityScores: AbilityScores;
  hp: number;
  maxHp: number;
  temporaryHp: number;
  ac: number;
  speed: number;
  proficiencyBonus: number;
  savingThrowProficiencies: AbilityName[];
  skillProficiencies: SkillName[];
  hitDieType: HitDieType;
  hitDiceRemaining: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  spellSlots: SpellSlotInfo;
  abilities: string[];
  equipment: string[];
  attunedItems: string[];
  gold: number;
  backstory: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const RACIAL_BONUSES: Record<RaceName, Partial<AbilityScores>> = {
  human:      { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  elf:        { dexterity: 2, intelligence: 1 },
  dwarf:      { constitution: 2, strength: 1 },
  halfling:   { dexterity: 2, charisma: 1 },
  gnome:      { intelligence: 2, constitution: 1 },
  "half-orc": { strength: 2, constitution: 1 },
  "half-elf": { charisma: 2, dexterity: 1, wisdom: 1 },
  tiefling:   { charisma: 2, intelligence: 1 },
  dragonborn: { strength: 2, charisma: 1 },
};

const RACIAL_SPEED: Record<RaceName, number> = {
  human: 30, elf: 30, dwarf: 25, halfling: 25, gnome: 25,
  "half-orc": 30, "half-elf": 30, tiefling: 30, dragonborn: 30,
};

const CLASS_HIT_DIE: Record<ClassName, HitDieType> = {
  barbarian: "d12", fighter: "d10", paladin: "d10", ranger: "d10",
  bard: "d8", cleric: "d8", druid: "d8", monk: "d8", rogue: "d8", warlock: "d8",
  sorcerer: "d6", wizard: "d6",
};

const CLASS_SAVE_PROFICIENCIES: Record<ClassName, AbilityName[]> = {
  barbarian: ["strength", "constitution"],
  bard:      ["dexterity", "charisma"],
  cleric:    ["wisdom", "charisma"],
  druid:     ["intelligence", "wisdom"],
  fighter:   ["strength", "constitution"],
  monk:      ["strength", "dexterity"],
  paladin:   ["wisdom", "charisma"],
  ranger:    ["strength", "dexterity"],
  rogue:     ["dexterity", "intelligence"],
  sorcerer:  ["constitution", "charisma"],
  warlock:   ["wisdom", "charisma"],
  wizard:    ["intelligence", "wisdom"],
};

const SKILL_ABILITY: Record<SkillName, AbilityName> = {
  acrobatics:      "dexterity",
  "animal-handling": "wisdom",
  arcana:          "intelligence",
  athletics:       "strength",
  deception:       "charisma",
  history:         "intelligence",
  insight:         "wisdom",
  intimidation:    "charisma",
  investigation:   "intelligence",
  medicine:        "wisdom",
  nature:          "intelligence",
  perception:      "wisdom",
  performance:     "charisma",
  persuasion:      "charisma",
  religion:        "intelligence",
  "sleight-of-hand": "dexterity",
  stealth:         "dexterity",
  survival:        "wisdom",
};

/** Standard array for ability score generation. */
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** XP thresholds for leveling (5e PHB). */
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

/** Spell slots per caster level (full caster). */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2],
  2:  [3],
  3:  [4, 2],
  4:  [4, 3],
  5:  [4, 3, 2],
  6:  [4, 3, 3],
  7:  [4, 3, 3, 1],
  8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const FULL_CASTERS: ClassName[] = ["wizard", "sorcerer", "bard", "cleric", "druid"];
const HALF_CASTERS: ClassName[] = ["paladin", "ranger"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 1;
function generateId(): string {
  return `char_${nextId++}_${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// CharacterManager
// ---------------------------------------------------------------------------

export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private dice = new DiceRoller();

  // -----------------------------------------------------------------------
  // Creation
  // -----------------------------------------------------------------------

  /**
   * Create a new character.
   * @param method - "standard-array", "point-buy", or "roll"
   */
  create(opts: {
    name: string;
    race: RaceName;
    characterClass: ClassName;
    alignment?: Alignment;
    background?: string;
    scoreMethod?: "standard-array" | "point-buy" | "roll";
    preferredScores?: Partial<AbilityScores>;
  }): Character {
    const method = opts.scoreMethod ?? "standard-array";
    let baseScores = this.generateAbilityScores(method);

    // Apply any preferred overrides
    if (opts.preferredScores) {
      for (const key of Object.keys(opts.preferredScores) as AbilityName[]) {
        const val = opts.preferredScores[key];
        if (val !== undefined) {
          baseScores[key] = val;
        }
      }
    }

    // Apply racial bonuses
    const racialBonus = RACIAL_BONUSES[opts.race];
    const finalScores: AbilityScores = { ...baseScores };
    for (const key of Object.keys(racialBonus) as AbilityName[]) {
      finalScores[key] += racialBonus[key] ?? 0;
    }

    const hitDieType = CLASS_HIT_DIE[opts.characterClass];
    const level = 1;
    const maxHp = this.rollHitPoints(hitDieType, finalScores.constitution, level);
    const speed = RACIAL_SPEED[opts.race];

    const character: Character = {
      id: generateId(),
      name: opts.name,
      race: opts.race,
      class: opts.characterClass,
      level,
      experience: 0,
      alignment: opts.alignment ?? "true-neutral",
      background: opts.background ?? "",
      abilityScores: finalScores,
      hp: maxHp,
      maxHp,
      temporaryHp: 0,
      ac: 10 + getModifier(finalScores.dexterity),
      speed,
      proficiencyBonus: getProficiencyBonus(level),
      savingThrowProficiencies: CLASS_SAVE_PROFICIENCIES[opts.characterClass],
      skillProficiencies: [],
      hitDieType,
      hitDiceRemaining: level,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      spellSlots: this.calculateSpellSlots(opts.characterClass, level),
      abilities: [],
      equipment: [],
      attunedItems: [],
      gold: 0,
      backstory: "",
      notes: "",
    };

    this.characters.set(character.id, character);
    return character;
  }

  // -----------------------------------------------------------------------
  // Ability score generation
  // -----------------------------------------------------------------------

  private generateAbilityScores(method: "standard-array" | "point-buy" | "roll"): AbilityScores {
    switch (method) {
      case "standard-array": {
        const arr = [...STANDARD_ARRAY];
        return {
          strength:     arr[0],
          dexterity:    arr[1],
          constitution: arr[2],
          intelligence: arr[3],
          wisdom:       arr[4],
          charisma:     arr[5],
        };
      }
      case "roll": {
        const scores = this.dice.rollAbilityScores();
        return {
          strength:     scores[0],
          dexterity:    scores[1],
          constitution: scores[2],
          intelligence: scores[3],
          wisdom:       scores[4],
          charisma:     scores[5],
        };
      }
      case "point-buy": {
        // Point buy: 27 points. Scores start at 8. Cost table per PHB.
        const costTable: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
        const totalPoints = 27;
        const abilities: AbilityName[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
        const scores: number[] = [8, 8, 8, 8, 8, 8];
        let remaining = totalPoints;

        for (let i = 0; i < 6 && remaining > 0; i++) {
          while (scores[i] < 15 && remaining > 0) {
            const nextScore = scores[i] + 1;
            const cost = costTable[nextScore] - costTable[scores[i]];
            if (remaining >= cost) {
              remaining -= cost;
              scores[i] = nextScore;
            } else {
              break;
            }
          }
        }

        return {
          strength:     scores[0],
          dexterity:    scores[1],
          constitution: scores[2],
          intelligence: scores[3],
          wisdom:       scores[4],
          charisma:     scores[5],
        };
      }
    }
  }

  // -----------------------------------------------------------------------
  // Leveling
  // -----------------------------------------------------------------------

  /**
   * Add experience points and level up if threshold is met.
   * Returns the new level (may be unchanged).
   */
  addExperience(characterId: string, xp: number): number {
    const char = this.getCharacterOrThrow(characterId);
    char.experience += xp;

    let newLevel = char.level;
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (char.experience >= XP_THRESHOLDS[i]) {
        newLevel = i + 1;
        break;
      }
    }

    if (newLevel > char.level) {
      this.levelUp(characterId, newLevel - char.level);
    }

    return char.level;
  }

  /**
   * Level up a character by the given number of levels.
   */
  levelUp(characterId: string, levels = 1): Character {
    const char = this.getCharacterOrThrow(characterId);

    for (let i = 0; i < levels; i++) {
      char.level++;
      const hpGain = this.rollHitPoints(char.hitDieType, char.abilityScores.constitution, 1);
      char.maxHp += hpGain;
      char.hp += hpGain;
      char.hitDiceRemaining++;
      char.proficiencyBonus = getProficiencyBonus(char.level);
      char.spellSlots = this.calculateSpellSlots(char.class, char.level);
    }

    return char;
  }

  private rollHitPoints(hitDie: HitDieType, conScore: number, level: number): number {
    const conMod = getModifier(conScore);
    if (level === 1) {
      // First level: max hit die + con mod
      const maxDie = parseInt(hitDie.substring(1), 10);
      return maxDie + conMod;
    }
    const roll = this.dice.roll(`1${hitDie}`);
    return Math.max(1, roll.total + conMod);
  }

  // -----------------------------------------------------------------------
  // HP and damage
  // -----------------------------------------------------------------------

  /** Apply damage to a character, reducing HP (with temp HP buffer). */
  takeDamage(characterId: string, damage: number): { hpRemaining: number; knockedOut: boolean } {
    const char = this.getCharacterOrThrow(characterId);
    let remaining = damage;

    if (char.temporaryHp > 0) {
      const absorbed = Math.min(char.temporaryHp, remaining);
      char.temporaryHp -= absorbed;
      remaining -= absorbed;
    }

    char.hp = Math.max(0, char.hp - remaining);
    const knockedOut = char.hp === 0;

    return { hpRemaining: char.hp, knockedOut };
  }

  /** Heal a character. */
  heal(characterId: string, amount: number): number {
    const char = this.getCharacterOrThrow(characterId);
    char.hp = Math.min(char.maxHp, char.hp + amount);
    if (char.hp > 0) {
      char.deathSaveSuccesses = 0;
      char.deathSaveFailures = 0;
    }
    return char.hp;
  }

  /** Add temporary hit points. */
  addTemporaryHp(characterId: string, amount: number): number {
    const char = this.getCharacterOrThrow(characterId);
    char.temporaryHp = Math.max(char.temporaryHp, amount);
    return char.temporaryHp;
  }

  /** Record a death save result. Returns whether the character stabilised or died. */
  deathSave(characterId: string, success: boolean): { stabilised: boolean; dead: boolean } {
    const char = this.getCharacterOrThrow(characterId);
    if (success) {
      char.deathSaveSuccesses++;
    } else {
      char.deathSaveFailures++;
    }

    const stabilised = char.deathSaveSuccesses >= 3;
    const dead = char.deathSaveFailures >= 3;

    if (stabilised) {
      char.hp = 1;
      char.deathSaveSuccesses = 0;
      char.deathSaveFailures = 0;
    }

    return { stabilised, dead };
  }

  // -----------------------------------------------------------------------
  // Checks and saves
  // -----------------------------------------------------------------------

  /** Make an ability check: d20 + ability modifier + proficiency (if proficient). */
  abilityCheck(characterId: string, ability: AbilityName, proficient = false): { roll: number; total: number; modifier: number } {
    const char = this.getCharacterOrThrow(characterId);
    const mod = getModifier(char.abilityScores[ability]);
    const prof = proficient ? char.proficiencyBonus : 0;
    const rollResult = this.dice.roll("1d20");
    const total = rollResult.total + mod + prof;
    return { roll: rollResult.total, total, modifier: mod + prof };
  }

  /** Make a saving throw: d20 + ability modifier + proficiency (if proficient). */
  savingThrow(characterId: string, ability: AbilityName): { roll: number; total: number; modifier: number } {
    const char = this.getCharacterOrThrow(characterId);
    const proficient = char.savingThrowProficiencies.includes(ability);
    const mod = getModifier(char.abilityScores[ability]);
    const prof = proficient ? char.proficiencyBonus : 0;
    const rollResult = this.dice.roll("1d20");
    const total = rollResult.total + mod + prof;
    return { roll: rollResult.total, total, modifier: mod + prof };
  }

  /** Make a skill check: d20 + ability modifier + proficiency (if proficient). */
  skillCheck(characterId: string, skill: SkillName): { roll: number; total: number; modifier: number } {
    const char = this.getCharacterOrThrow(characterId);
    const ability = SKILL_ABILITY[skill];
    const proficient = char.skillProficiencies.includes(skill);
    const mod = getModifier(char.abilityScores[ability]);
    const prof = proficient ? char.proficiencyBonus : 0;
    const rollResult = this.dice.roll("1d20");
    const total = rollResult.total + mod + prof;
    return { roll: rollResult.total, total, modifier: mod + prof };
  }

  // -----------------------------------------------------------------------
  // Spell slots
  // -----------------------------------------------------------------------

  /** Use a spell slot of the given level. Returns false if no slots available. */
  useSpellSlot(characterId: string, level: number): boolean {
    const char = this.getCharacterOrThrow(characterId);
    const slotInfo = char.spellSlots[level.toString()];
    if (!slotInfo || slotInfo.used >= slotInfo.max) return false;
    slotInfo.used++;
    return true;
  }

  /** Recover all spell slots (long rest). */
  recoverSpellSlots(characterId: string): void {
    const char = this.getCharacterOrThrow(characterId);
    for (const key of Object.keys(char.spellSlots)) {
      char.spellSlots[key].used = 0;
    }
  }

  private calculateSpellSlots(characterClass: ClassName, level: number): SpellSlotInfo {
    const slots: SpellSlotInfo = {};

    if (FULL_CASTERS.includes(characterClass)) {
      const table = FULL_CASTER_SLOTS[level];
      if (table) {
        table.forEach((max, i) => {
          slots[(i + 1).toString()] = { max, used: 0 };
        });
      }
    } else if (HALF_CASTERS.includes(characterClass)) {
      const effectiveLevel = Math.max(1, Math.floor(level / 2));
      const table = FULL_CASTER_SLOTS[effectiveLevel];
      if (table) {
        table.forEach((max, i) => {
          slots[(i + 1).toString()] = { max, used: 0 };
        });
      }
    }

    return slots;
  }

  // -----------------------------------------------------------------------
  // Rest
  // -----------------------------------------------------------------------

  /** Short rest: spend hit dice to heal. Returns HP healed. */
  shortRest(characterId: string, hitDiceToSpend: number): number {
    const char = this.getCharacterOrThrow(characterId);
    const diceToUse = Math.min(hitDiceToSpend, char.hitDiceRemaining);
    let totalHealed = 0;

    for (let i = 0; i < diceToUse; i++) {
      const roll = this.dice.roll(`1${char.hitDieType}`);
      const conMod = getModifier(char.abilityScores.constitution);
      const healed = Math.max(1, roll.total + conMod);
      totalHealed += healed;
      char.hitDiceRemaining--;
    }

    char.hp = Math.min(char.maxHp, char.hp + totalHealed);
    return totalHealed;
  }

  /** Long rest: full heal, recover hit dice (half of level), recover spell slots. */
  longRest(characterId: string): void {
    const char = this.getCharacterOrThrow(characterId);
    char.hp = char.maxHp;
    char.temporaryHp = 0;
    char.hitDiceRemaining = Math.min(char.level, Math.floor(char.level / 2) + char.hitDiceRemaining);
    char.deathSaveSuccesses = 0;
    char.deathSaveFailures = 0;
    this.recoverSpellSlots(characterId);
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getCharacter(id: string): Character | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): Character[] {
    return [...this.characters.values()];
  }

  removeCharacter(id: string): boolean {
    return this.characters.delete(id);
  }

  private getCharacterOrThrow(id: string): Character {
    const char = this.characters.get(id);
    if (!char) throw new Error(`Character not found: ${id}`);
    return char;
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      characters: Array.from(this.characters.entries()),
      nextId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.characters = new Map(parsed.characters);
    nextId = parsed.nextId ?? this.characters.size + 1;
  }
}

// ---------------------------------------------------------------------------
// Standalone utility functions
// ---------------------------------------------------------------------------

/** Calculate ability score modifier: floor((score - 10) / 2). */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Calculate proficiency bonus from level. */
export function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}
