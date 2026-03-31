/**
 * Dice Roller — D&D 5e standard dice with crypto-secure randomness.
 *
 * Supports notation like "2d6+3", "4d6kh3", "1d20adv", "1d20dis".
 * All randomness uses crypto.getRandomValues for fairness.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RollResult {
  /** The final total after modifiers and keep/drop rules. */
  total: number;
  /** Individual die values before any modifications. */
  rolls: number[];
  /** Which dice were dropped (if any). */
  dropped: number[];
  /** The dice notation that produced this result. */
  notation: string;
  /** Whether this was an advantage roll. */
  advantage: boolean;
  /** Whether this was a disadvantage roll. */
  disadvantage: boolean;
  /** Whether this was a critical hit (natural 20 on a d20). */
  criticalHit: boolean;
  /** Whether this was a critical miss (natural 1 on a d20). */
  criticalMiss: boolean;
  /** Modifier applied after summing dice. */
  modifier: number;
}

export interface RollStatistics {
  /** Total number of rolls recorded. */
  totalRolls: number;
  /** Sum of all totals. */
  sumOfTotals: number;
  /** Average total. */
  average: number;
  /** Distribution of results keyed by total. */
  distribution: Map<number, number>;
  /** Number of natural 20s. */
  nat20s: number;
  /** Number of natural 1s. */
  nat1s: number;
}

export interface ParsedNotation {
  count: number;
  sides: number;
  modifier: number;
  /** Keep highest N dice. */
  keepHighest: number | null;
  /** Drop lowest N dice. */
  dropLowest: number | null;
  /** Reroll dice that show 1. */
  rerollOnes: boolean;
  advantage: boolean;
  disadvantage: boolean;
}

// ---------------------------------------------------------------------------
// Crypto-secure random helpers
// ---------------------------------------------------------------------------

function cryptoInt(max: number): number {
  // Returns a random integer in [0, max) using crypto.getRandomValues.
  if (max <= 0) throw new Error("max must be positive");
  const byteCount = Math.ceil(Math.log2(max) / 8) || 1;
  const buf = new Uint8Array(byteCount);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = 0;
    for (let i = 0; i < byteCount; i++) {
      value = (value << 8) | buf[i];
    }
  } while (value >= Math.floor(0x10000_0000 / max) * max);
  return value % max;
}

function rollDie(sides: number): number {
  if (sides < 1) throw new Error(`Invalid die: d${sides}`);
  return cryptoInt(sides) + 1;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const NOTATION_RE = /^(\d+)?d(\d+)(kh(\d+))?(dl(\d+))?(r1)?([+-]\d+)?(adv|dis)?$/i;

/**
 * Parse a standard dice notation string into its components.
 *
 * Supported forms:
 *   - `d20`, `1d20` — basic roll
 *   - `2d6+3` — count, sides, modifier
 *   - `4d6kh3` — roll 4d6, keep highest 3
 *   - `2d6dl1` — roll 2d6, drop lowest 1
 *   - `1d20adv` — advantage (roll 2d20, keep highest)
 *   - `1d20dis` — disadvantage (roll 2d20, keep lowest)
 *   - `1d20r1`  — reroll any die showing 1 once
 */
export function parseNotation(notation: string): ParsedNotation {
  const normalized = notation.trim().toLowerCase().replace(/\s/g, "");
  const match = normalized.match(NOTATION_RE);
  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}"`);
  }

  const count = parseInt(match[1] || "1", 10);
  const sides = parseInt(match[2], 10);
  const keepHighest = match[4] ? parseInt(match[4], 10) : null;
  const dropLowest = match[6] ? parseInt(match[6], 10) : null;
  const rerollOnes = match[7] === "r1";
  const modifier = match[8] ? parseInt(match[8], 10) : 0;
  const advantage = match[9] === "adv";
  const disadvantage = match[9] === "dis";

  if (count < 1) throw new Error("Dice count must be at least 1");
  if (sides < 1) throw new Error("Dice sides must be at least 1");

  return { count, sides, modifier, keepHighest, dropLowest, rerollOnes, advantage, disadvantage };
}

// ---------------------------------------------------------------------------
// DiceRoller
// ---------------------------------------------------------------------------

export class DiceRoller {
  private history: RollResult[] = [];
  private nat20Count = 0;
  private nat1Count = 0;

  // -----------------------------------------------------------------------
  // Core roll
  // -----------------------------------------------------------------------

  /**
   * Roll dice from a notation string and return a detailed result.
   */
  roll(notation: string): RollResult {
    const parsed = parseNotation(notation);
    const effectiveCount = parsed.advantage || parsed.disadvantage ? 2 : parsed.count;
    const effectiveSides = parsed.advantage || parsed.disadvantage ? parsed.sides : parsed.sides;

    // Roll all dice
    let rolls: number[] = [];
    for (let i = 0; i < effectiveCount; i++) {
      let die = rollDie(effectiveSides);
      if (parsed.rerollOnes && die === 1) {
        die = rollDie(effectiveSides);
      }
      rolls.push(die);
    }

    let dropped: number[] = [];

    // Apply advantage / disadvantage
    if (parsed.advantage) {
      const sorted = [...rolls].sort((a, b) => b - a);
      dropped = sorted.slice(1);
      rolls = [sorted[0]];
    } else if (parsed.disadvantage) {
      const sorted = [...rolls].sort((a, b) => a - b);
      dropped = sorted.slice(1);
      rolls = [sorted[0]];
    } else {
      // Apply keep highest
      if (parsed.keepHighest !== null && parsed.keepHighest < rolls.length) {
        const indexed = rolls.map((v, i) => ({ v, i }));
        indexed.sort((a, b) => a.v - b.v);
        const dropCount = rolls.length - parsed.keepHighest;
        const toDrop = new Set(indexed.slice(0, dropCount).map((x) => x.i));
        dropped = rolls.filter((_, i) => toDrop.has(i));
        rolls = rolls.filter((_, i) => !toDrop.has(i));
      }

      // Apply drop lowest
      if (parsed.dropLowest !== null && parsed.dropLowest < rolls.length) {
        const indexed = rolls.map((v, i) => ({ v, i }));
        indexed.sort((a, b) => a.v - b.v);
        const toDrop = new Set(indexed.slice(0, parsed.dropLowest).map((x) => x.i));
        dropped = dropped.concat(rolls.filter((_, i) => toDrop.has(i)));
        rolls = rolls.filter((_, i) => !toDrop.has(i));
      }
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + parsed.modifier;

    // Critical detection (only meaningful on d20)
    const isD20 = effectiveSides === 20;
    const firstRoll = rolls[0] ?? 0;
    const criticalHit = isD20 && firstRoll === 20;
    const criticalMiss = isD20 && firstRoll === 1;

    const result: RollResult = {
      total,
      rolls: [...rolls],
      dropped,
      notation,
      advantage: parsed.advantage,
      disadvantage: parsed.disadvantage,
      criticalHit,
      criticalMiss,
      modifier: parsed.modifier,
    };

    // Update statistics
    if (criticalHit) this.nat20Count++;
    if (criticalMiss) this.nat1Count++;
    this.history.push(result);

    return result;
  }

  // -----------------------------------------------------------------------
  // Convenience methods
  // -----------------------------------------------------------------------

  /** Roll a single d4. */
  d4(): number {
    return this.roll("1d4").total;
  }

  /** Roll a single d6. */
  d6(): number {
    return this.roll("1d6").total;
  }

  /** Roll a single d8. */
  d8(): number {
    return this.roll("1d8").total;
  }

  /** Roll a single d10. */
  d10(): number {
    return this.roll("1d10").total;
  }

  /** Roll a single d12. */
  d12(): number {
    return this.roll("1d12").total;
  }

  /** Roll a single d20. */
  d20(): number {
    return this.roll("1d20").total;
  }

  /** Roll a single d100 (percentile). */
  d100(): number {
    return this.roll("1d100").total;
  }

  /** Roll with advantage: 2d20 keep highest. */
  rollAdvantage(notation = "1d20"): RollResult {
    return this.roll(notation.replace(/(adv|dis)?$/i, "") + "adv");
  }

  /** Roll with disadvantage: 2d20 keep lowest. */
  rollDisadvantage(notation = "1d20"): RollResult {
    return this.roll(notation.replace(/(adv|dis)?$/i, "") + "dis");
  }

  /**
   * Roll 4d6 and keep the highest 3 — standard ability score generation.
   */
  rollAbilityScore(): RollResult {
    return this.roll("4d6kh3");
  }

  /**
   * Generate a full set of 6 ability scores using the 4d6-drop-lowest method.
   */
  rollAbilityScores(): number[] {
    return Array.from({ length: 6 }, () => this.rollAbilityScore().total);
  }

  // -----------------------------------------------------------------------
  // Parsing helper
  // -----------------------------------------------------------------------

  /** Parse a notation string into its components (convenience wrapper). */
  parse(notation: string): ParsedNotation {
    return parseNotation(notation);
  }

  // -----------------------------------------------------------------------
  // Statistics
  // -----------------------------------------------------------------------

  /** Get the full roll history. */
  getHistory(): RollResult[] {
    return [...this.history];
  }

  /** Clear roll history and statistics. */
  clearHistory(): void {
    this.history = [];
    this.nat20Count = 0;
    this.nat1Count = 0;
  }

  /** Compute statistics across all recorded rolls. */
  getStatistics(): RollStatistics {
    const distribution = new Map<number, number>();
    let sum = 0;

    for (const r of this.history) {
      sum += r.total;
      distribution.set(r.total, (distribution.get(r.total) ?? 0) + 1);
    }

    return {
      totalRolls: this.history.length,
      sumOfTotals: sum,
      average: this.history.length > 0 ? sum / this.history.length : 0,
      distribution,
      nat20s: this.nat20Count,
      nat1s: this.nat1Count,
    };
  }

  /**
   * Serialize the roller state (history and stats) for persistence.
   */
  serialize(): string {
    return JSON.stringify({
      history: this.history,
      nat20Count: this.nat20Count,
      nat1Count: this.nat1Count,
    });
  }

  /**
   * Restore roller state from a serialized string.
   */
  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.history = parsed.history;
    this.nat20Count = parsed.nat20Count ?? 0;
    this.nat1Count = parsed.nat1Count ?? 0;
  }
}
