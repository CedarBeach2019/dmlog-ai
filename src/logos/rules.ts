// RulesEngine: resolves all game mechanics
// Skill checks: ability + proficiency + modifiers vs DC
// Saving throws: ability + proficiency vs DC
// Attack rolls: d20 + proficiency + ability vs AC
// Damage: weapon dice + ability modifier, resistance/vulnerability/immunity
// Spell rules: slots, concentration, saves, area of effect
// Exports: RulesEngine class with skillCheck(), savingThrow(), attackRoll(), damageCalc(), spellCheck()

// --- Enums and Types ---

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export type DamageType =
  | 'bludgeoning'
  | 'piercing'
  | 'slashing'
  | 'fire'
  | 'cold'
  | 'lightning'
  | 'thunder'
  | 'acid'
  | 'poison'
  | 'psychic'
  | 'necrotic'
  | 'radiant'
  | 'force';

export type DifficultyClass = 'easy' | 'medium' | 'hard' | 'very-hard' | 'nearly-impossible';

export type CoverType = 'none' | 'half' | 'three-quarters' | 'full';

export type Ruleset = '5e' | 'pathfinder' | 'homebrew';

export type ConditionName =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  criticalHit: boolean;
  criticalMiss: boolean;
}

export interface CheckResult {
  roll: RollResult;
  dc: number;
  success: boolean;
  degree: number; // how much above or below DC
}

export interface DamageResult {
  total: number;
  diceRolls: number[];
  modifier: number;
  damageType: DamageType;
  resisted: boolean;
  vulnerable: boolean;
  immune: boolean;
  effectiveDamage: number;
  isCritical: boolean;
}

export interface AttackResult {
  attackRoll: RollResult;
  targetAC: number;
  hit: boolean;
  critical: boolean;
  damage: DamageResult | null;
}

export interface SpellResult {
  spellName: string;
  spellLevel: number;
  slotUsed: number;
  attackRoll: RollResult | null;
  saveResult: CheckResult | null;
  damage: DamageResult | null;
  concentrationRequired: boolean;
  effectDescription: string;
}

export interface ContestResult {
  initiatorRoll: RollResult;
  opponentRoll: RollResult;
  initiatorWins: boolean;
  tie: boolean;
}

export interface Combatant {
  id: string;
  name: string;
  abilities: Record<Ability, number>;
  proficiencyBonus: number;
  proficiencySkills: string[];
  proficiencySaves: Ability[];
  armorClass: number;
  currentHP: number;
  maxHP: number;
  level: number;
  conditions: ConditionName[];
  resistances: DamageType[];
  vulnerabilities: DamageType[];
  immunities: DamageType[];
  spellSlots: Record<string, number>;
  concentrationActive: boolean;
}

export interface WeaponProfile {
  name: string;
  diceCount: number;
  diceSize: number;
  damageType: DamageType;
  ability: Ability;
  magical: boolean;
  magicalBonus: number;
  versatile: boolean;
  versatileDiceSize: number;
  range: number;
  ranged: boolean;
}

export interface SpellProfile {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  concentration: boolean;
  attackSpell: boolean;
  saveAbility: Ability | null;
  saveDC: number;
  damageDice: { count: number; size: number }[];
  damageType: DamageType | null;
  higherLevelDice: { count: number; size: number }[];
  areaOfEffect: { type: string; size: number } | null;
  description: string;
}

export interface RuleOverrides {
  criticalRule?: 'double-dice' | 'double-damage' | 'max-dice';
  flankingAdvantage?: boolean;
  coverBonus?: Record<CoverType, number>;
  customDC?: Record<DifficultyClass, number>;
  extraDamageOnCrit?: number;
}

// --- Constants ---

export const DC_TABLE: Record<DifficultyClass, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
  'very-hard': 25,
  'nearly-impossible': 30,
};

export const COVER_AC_BONUS: Record<CoverType, number> = {
  none: 0,
  half: 2,
  'three-quarters': 5,
  full: Infinity,
};

const DEFAULT_PROFICIENCY_BY_LEVEL: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6,
};

// --- Dice Utilities ---

export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function sumRolls(rolls: number[]): number {
  return rolls.reduce((acc, r) => acc + r, 0);
}

// --- Ability Modifier ---

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyForLevel(level: number): number {
  if (level < 1) return 2;
  if (level > 20) return 6;
  return DEFAULT_PROFICIENCY_BY_LEVEL[level] ?? 2;
}

// --- RulesEngine Class ---

export class RulesEngine {
  private ruleset: Ruleset;
  private overrides: RuleOverrides;

  constructor(ruleset: Ruleset = '5e', overrides: RuleOverrides = {}) {
    this.ruleset = ruleset;
    this.overrides = overrides;
  }

  private getDC(difficulty: DifficultyClass): number {
    if (this.overrides.customDC && this.overrides.customDC[difficulty] !== undefined) {
      return this.overrides.customDC[difficulty];
    }
    return DC_TABLE[difficulty];
  }

  private getCoverBonus(cover: CoverType): number {
    if (this.overrides.coverBonus && this.overrides.coverBonus[cover] !== undefined) {
      return this.overrides.coverBonus[cover];
    }
    return COVER_AC_BONUS[cover];
  }

  private makeRollResult(
    d20: number,
    modifier: number
  ): RollResult {
    return {
      total: d20 + modifier,
      rolls: [d20],
      modifier,
      criticalHit: d20 === 20,
      criticalMiss: d20 === 1,
    };
  }

  // --- Skill Check ---

  skillCheck(
    combatant: Combatant,
    ability: Ability,
    skillName: string | null,
    dc: number | DifficultyClass,
    advantage: boolean = false,
    disadvantage: boolean = false
  ): CheckResult {
    const targetDC = typeof dc === 'string' ? this.getDC(dc) : dc;
    const mod = abilityModifier(combatant.abilities[ability]);
    const proficient = skillName !== null && combatant.proficiencySkills.includes(skillName);
    const profBonus = proficient ? combatant.proficiencyBonus : 0;
    const totalMod = mod + profBonus;

    let d20: number;
    if (advantage && !disadvantage) {
      const [a, b] = [rollD20(), rollD20()];
      d20 = Math.max(a, b);
    } else if (disadvantage && !advantage) {
      const [a, b] = [rollD20(), rollD20()];
      d20 = Math.min(a, b);
    } else {
      d20 = rollD20();
    }

    const roll = this.makeRollResult(d20, totalMod);
    const total = roll.total;

    return {
      roll,
      dc: targetDC,
      success: total >= targetDC,
      degree: total - targetDC,
    };
  }

  // --- Saving Throw ---

  savingThrow(
    combatant: Combatant,
    ability: Ability,
    dc: number,
    advantage: boolean = false,
    disadvantage: boolean = false
  ): CheckResult {
    const mod = abilityModifier(combatant.abilities[ability]);
    const proficient = combatant.proficiencySaves.includes(ability);
    const profBonus = proficient ? combatant.proficiencyBonus : 0;
    const totalMod = mod + profBonus;

    let d20: number;
    if (advantage && !disadvantage) {
      d20 = Math.max(rollD20(), rollD20());
    } else if (disadvantage && !advantage) {
      d20 = Math.min(rollD20(), rollD20());
    } else {
      d20 = rollD20();
    }

    const roll = this.makeRollResult(d20, totalMod);

    return {
      roll,
      dc,
      success: roll.total >= dc,
      degree: roll.total - dc,
    };
  }

  // --- Attack Roll ---

  attackRoll(
    attacker: Combatant,
    weapon: WeaponProfile,
    targetAC: number,
    cover: CoverType = 'none',
    advantage: boolean = false,
    disadvantage: boolean = false,
    flanking: boolean = false
  ): RollResult {
    const effectiveFlanking = flanking && (this.overrides.flankingAdvantage ?? false);

    let hasAdvantage = advantage || effectiveFlanking;
    let hasDisadvantage = disadvantage;

    // Ranged attacks at melee range have disadvantage
    if (weapon.ranged) {
      hasDisadvantage = true;
    }

    // Various conditions grant advantage/disadvantage
    if (attacker.conditions.includes('prone')) hasDisadvantage = true;
    if (attacker.conditions.includes('restrained')) hasDisadvantage = true;
    if (attacker.conditions.includes('blinded')) hasDisadvantage = true;
    if (attacker.conditions.includes('invisible')) hasAdvantage = true;

    const abilityMod = abilityModifier(attacker.abilities[weapon.ability]);
    const profBonus = attacker.proficiencyBonus;
    const magicalBonus = weapon.magical ? weapon.magicalBonus : 0;
    const totalMod = abilityMod + profBonus + magicalBonus;

    let d20: number;
    if (hasAdvantage && !hasDisadvantage) {
      d20 = Math.max(rollD20(), rollD20());
    } else if (hasDisadvantage && !hasAdvantage) {
      d20 = Math.min(rollD20(), rollD20());
    } else {
      d20 = rollD20();
    }

    const effectiveAC = targetAC + this.getCoverBonus(cover);
    const roll = this.makeRollResult(d20, totalMod);

    // Full cover: can't be targeted
    if (cover === 'full') {
      roll.total = -1; // impossible to hit
    }

    return roll;
  }

  resolveAttack(
    attacker: Combatant,
    weapon: WeaponProfile,
    target: Combatant,
    cover: CoverType = 'none',
    advantage: boolean = false,
    disadvantage: boolean = false,
    flanking: boolean = false
  ): AttackResult {
    const attackRoll = this.attackRoll(
      attacker, weapon, target.armorClass, cover, advantage, disadvantage, flanking
    );

    let hit = false;
    let critical = false;

    if (attackRoll.criticalMiss) {
      hit = false;
    } else if (attackRoll.criticalHit) {
      hit = true;
      critical = true;
    } else if (cover === 'full') {
      hit = false;
    } else {
      hit = attackRoll.total >= target.armorClass;
    }

    let damage: DamageResult | null = null;
    if (hit) {
      damage = this.damageCalc(
        weapon,
        attacker,
        target,
        critical
      );
    }

    return { attackRoll, targetAC: target.armorClass, hit, critical, damage };
  }

  // --- Damage Calculation ---

  damageCalc(
    weapon: WeaponProfile,
    attacker: Combatant,
    target: Combatant,
    critical: boolean = false
  ): DamageResult {
    const diceCount = weapon.versatile ? 1 : weapon.diceCount;
    const diceSize = weapon.versatile ? weapon.versatileDiceSize : weapon.diceSize;

    let effectiveDiceCount = diceCount;
    if (critical) {
      const critRule = this.overrides.criticalRule ?? 'double-dice';
      switch (critRule) {
        case 'double-dice':
          effectiveDiceCount = diceCount * 2;
          break;
        case 'max-dice':
          effectiveDiceCount = diceCount;
          break;
        case 'double-damage':
          effectiveDiceCount = diceCount;
          break;
      }
    }

    const diceRolls = rollDice(effectiveDiceCount, diceSize);
    let diceTotal = sumRolls(diceRolls);

    if (critical && this.overrides.criticalRule === 'max-dice') {
      // Maximize base dice, roll the crit dice
      diceTotal = diceCount * diceSize + sumRolls(rollDice(diceCount, diceSize));
    }

    const abilityMod = abilityModifier(attacker.abilities[weapon.ability]);
    const magicalBonus = weapon.magical ? weapon.magicalBonus : 0;
    let total = diceTotal + Math.max(0, abilityMod) + magicalBonus;

    if (critical && this.overrides.criticalRule === 'double-damage') {
      total *= 2;
    }

    if (this.overrides.extraDamageOnCrit && critical) {
      total += this.overrides.extraDamageOnCrit;
    }

    // Resistance / Vulnerability / Immunity
    const isImmune = target.immunities.includes(weapon.damageType);
    const isResistant = target.resistances.includes(weapon.damageType);
    const isVulnerable = target.vulnerabilities.includes(weapon.damageType);

    let effectiveDamage = total;
    if (isImmune) {
      effectiveDamage = 0;
    } else if (isResistant) {
      effectiveDamage = Math.floor(total / 2);
    } else if (isVulnerable) {
      effectiveDamage = total * 2;
    }

    return {
      total,
      diceRolls,
      modifier: Math.max(0, abilityMod) + magicalBonus,
      damageType: weapon.damageType,
      resisted: isResistant,
      vulnerable: isVulnerable,
      immune: isImmune,
      effectiveDamage,
      isCritical: critical,
    };
  }

  calculateDamage(
    diceCount: number,
    diceSize: number,
    damageType: DamageType,
    abilityScore: number,
    magicalBonus: number = 0,
    target: Pick<Combatant, 'resistances' | 'vulnerabilities' | 'immunities'> | null = null,
    critical: boolean = false
  ): DamageResult {
    let effectiveCount = critical ? diceCount * 2 : diceCount;
    const diceRolls = rollDice(effectiveCount, diceSize);
    const diceTotal = sumRolls(diceRolls);
    const abilityMod = abilityModifier(abilityScore);
    let total = diceTotal + Math.max(0, abilityMod) + magicalBonus;

    const isImmune = target?.immunities.includes(damageType) ?? false;
    const isResistant = target?.resistances.includes(damageType) ?? false;
    const isVulnerable = target?.vulnerabilities.includes(damageType) ?? false;

    let effectiveDamage = total;
    if (isImmune) effectiveDamage = 0;
    else if (isResistant) effectiveDamage = Math.floor(total / 2);
    else if (isVulnerable) effectiveDamage = total * 2;

    return {
      total,
      diceRolls,
      modifier: Math.max(0, abilityMod) + magicalBonus,
      damageType,
      resisted: isResistant,
      vulnerable: isVulnerable,
      immune: isImmune,
      effectiveDamage,
      isCritical: critical,
    };
  }

  // --- Spell Check ---

  spellCheck(
    caster: Combatant,
    spell: SpellProfile,
    slotLevel: number,
    targets: Combatant[]
  ): SpellResult {
    // Verify slot available
    const slotsAtLevel = caster.spellSlots[String(slotLevel)] ?? 0;
    if (slotsAtLevel <= 0 && slotLevel > 0) {
      return {
        spellName: spell.name,
        spellLevel: spell.level,
        slotUsed: slotLevel,
        attackRoll: null,
        saveResult: null,
        damage: null,
        concentrationRequired: spell.concentration,
        effectDescription: 'Spell slot not available.',
      };
    }

    // Break concentration if casting another concentration spell
    if (spell.concentration && caster.concentrationActive) {
      // Previous concentration is broken
    }

    let attackRoll: RollResult | null = null;
    let saveResult: CheckResult | null = null;
    let damage: DamageResult | null = null;

    if (spell.attackSpell) {
      // Spell attack roll
      const spellAbility: Ability = 'intelligence'; // default; could be configurable
      const abilityMod = abilityModifier(caster.abilities[spellAbility]);
      const totalMod = abilityMod + caster.proficiencyBonus;
      const d20 = rollD20();
      attackRoll = this.makeRollResult(d20, totalMod);
    } else if (spell.saveAbility) {
      // Target saves
      const spellAbility: Ability = 'intelligence';
      const abilityMod = abilityModifier(caster.abilities[spellAbility]);
      const casterDC = 8 + caster.proficiencyBonus + abilityMod;

      if (targets.length > 0) {
        saveResult = this.savingThrow(targets[0], spell.saveAbility, casterDC);
      }
    }

    // Calculate damage
    if (spell.damageType && spell.damageDice.length > 0) {
      const allDice = [...spell.damageDice];
      // Add higher level dice
      const levelDiff = slotLevel - spell.level;
      if (levelDiff > 0) {
        for (let i = 0; i < levelDiff; i++) {
          allDice.push(...spell.higherLevelDice);
        }
      }

      let totalDamage = 0;
      const allRolls: number[] = [];
      for (const die of allDice) {
        const rolls = rollDice(die.count, die.size);
        allRolls.push(...rolls);
        totalDamage += sumRolls(rolls);
      }

      const target = targets[0] ?? null;
      const isImmune = target?.immunities.includes(spell.damageType) ?? false;
      const isResistant = target?.resistances.includes(spell.damageType) ?? false;
      const isVulnerable = target?.vulnerabilities.includes(spell.damageType) ?? false;

      let effectiveDamage = totalDamage;
      if (isImmune) effectiveDamage = 0;
      else if (isResistant) effectiveDamage = Math.floor(totalDamage / 2);
      else if (isVulnerable) effectiveDamage = totalDamage * 2;

      const isHit = attackRoll ? !attackRoll.criticalMiss : true;
      const saveSuccess = saveResult?.success ?? false;

      damage = {
        total: isHit ? totalDamage : 0,
        diceRolls: allRolls,
        modifier: 0,
        damageType: spell.damageType,
        resisted: isResistant,
        vulnerable: isVulnerable,
        immune: isImmune,
        effectiveDamage: isHit && !saveSuccess ? effectiveDamage : saveSuccess ? Math.floor(effectiveDamage / 2) : 0,
        isCritical: attackRoll?.criticalHit ?? false,
      };
    }

    const effectParts: string[] = [];
    if (spell.areaOfEffect) {
      effectParts.push(`Area: ${spell.areaOfEffect.size}ft ${spell.areaOfEffect.type}`);
    }
    if (spell.concentration) {
      effectParts.push('Concentration required');
    }
    if (spell.duration !== 'Instantaneous') {
      effectParts.push(`Duration: ${spell.duration}`);
    }

    return {
      spellName: spell.name,
      spellLevel: spell.level,
      slotUsed: slotLevel,
      attackRoll,
      saveResult,
      damage,
      concentrationRequired: spell.concentration,
      effectDescription: effectParts.join('; ') || 'Instantaneous effect',
    };
  }

  // --- Contests (Grapple, Shove, Disarm) ---

  contest(
    initiator: Combatant,
    initiatorAbility: Ability,
    opponent: Combatant,
    opponentAbility: Ability,
    initiatorProficient: boolean = false,
    opponentProficient: boolean = false
  ): ContestResult {
    const initMod = abilityModifier(initiator.abilities[initiatorAbility])
      + (initiatorProficient ? initiator.proficiencyBonus : 0);
    const oppMod = abilityModifier(opponent.abilities[opponentAbility])
      + (opponentProficient ? opponent.proficiencyBonus : 0);

    const initD20 = rollD20();
    const oppD20 = rollD20();

    const initiatorRoll = this.makeRollResult(initD20, initMod);
    const opponentRoll = this.makeRollResult(oppD20, oppMod);

    return {
      initiatorRoll,
      opponentRoll,
      initiatorWins: initiatorRoll.total > opponentRoll.total,
      tie: initiatorRoll.total === opponentRoll.total,
    };
  }

  grapple(initiator: Combatant, opponent: Combatant): ContestResult {
    const oppUsesAcrobatics = (opponent.abilities.dexterity > opponent.abilities.strength);
    return this.contest(
      initiator,
      'strength' as Ability,
      opponent,
      oppUsesAcrobatics ? 'dexterity' as Ability : 'strength' as Ability,
      false,
      false
    );
  }

  shove(initiator: Combatant, opponent: Combatant): ContestResult {
    return this.contest(initiator, 'strength' as Ability, opponent, 'strength' as Ability);
  }

  disarm(initiator: Combatant, opponent: Combatant): ContestResult {
    return this.contest(initiator, 'strength' as Ability, opponent, 'strength' as Ability);
  }

  // --- Death Saves ---

  deathSave(combatant: Combatant): { roll: number; successes: number; failures: number; stabilized: boolean; dead: boolean } {
    const d20 = rollD20();
    let successes = 0;
    let failures = 0;

    if (d20 === 20) {
      successes = 2;
    } else if (d20 === 1) {
      failures = 2;
    } else if (d20 >= 10) {
      successes = 1;
    } else {
      failures = 1;
    }

    return {
      roll: d20,
      successes,
      failures,
      stabilized: false, // caller tracks cumulative
      dead: false,
    };
  }

  // --- Cover Calculation ---

  effectiveAC(target: Combatant, cover: CoverType): number {
    if (cover === 'full') return Infinity;
    return target.armorClass + this.getCoverBonus(cover);
  }

  // --- Utility ---

  getPassivePerception(combatant: Combatant): number {
    const wis = abilityModifier(combatant.abilities.wisdom);
    const proficient = combatant.proficiencySkills.includes('perception');
    return 10 + wis + (proficient ? combatant.proficiencyBonus : 0);
  }

  getPassiveInsight(combatant: Combatant): number {
    const wis = abilityModifier(combatant.abilities.wisdom);
    const proficient = combatant.proficiencySkills.includes('insight');
    return 10 + wis + (proficient ? combatant.proficiencyBonus : 0);
  }

  getPassiveInvestigation(combatant: Combatant): number {
    const int = abilityModifier(combatant.abilities.intelligence);
    const proficient = combatant.proficiencySkills.includes('investigation');
    return 10 + int + (proficient ? combatant.proficiencyBonus : 0);
  }

  carryCapacity(combatant: Combatant): number {
    return combatant.abilities.strength * 15;
  }

  encumbered(combatant: Combatant, carriedWeight: number): { encumbered: boolean; heavily: boolean } {
    const str = combatant.abilities.strength;
    return {
      encumbered: carriedWeight > str * 5,
      heavily: carriedWeight > str * 10,
    };
  }
}
