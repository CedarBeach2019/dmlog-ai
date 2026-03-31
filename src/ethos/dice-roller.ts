/**
 * CryptoDiceRoller — Fair, verifiable dice rolls using Web Crypto API.
 *
 * All randomness sourced from crypto.getRandomValues for true cryptographic fairness.
 * Supports standard TTRPG dice, advantage/disadvantage, batch rolling, and a fairness audit log.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RollResult {
  dice: string;           // e.g. "2d20+3"
  sides: number;
  rolls: number[];
  modifier: number;
  total: number;          // sum of rolls only
  finalTotal: number;     // total + modifier
  timestamp: number;
  advantage?: 'advantage' | 'disadvantage' | null;
  keptRoll?: number;      // the roll kept after adv/disadv
  droppedRoll?: number;   // the roll dropped after adv/disadv
}

export interface FairnessStats {
  totalRolls: number;
  mean: number;
  expectedMean: number;
  distribution: Map<number, number>;
  chiSquare: number;
}

export interface AuditEntry {
  id: string;
  result: RollResult;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard TTRPG dice sides. */
export const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSides = typeof STANDARD_DICE[number];

/** UX animation delays (milliseconds). */
export const ANIMATION = {
  SINGLE_ROLL: 300,
  MULTI_ROLL: 150,     // per-die delay when rolling batches
  ADVANTAGE_PAUSE: 200, // extra pause before revealing kept die
} as const;

// ---------------------------------------------------------------------------
// CryptoDiceRoller
// ---------------------------------------------------------------------------

export class CryptoDiceRoller {
  private auditLog: AuditEntry[] = [];
  private rollCounter = 0;

  // -----------------------------------------------------------------------
  // Core roll
  // -----------------------------------------------------------------------

  /**
   * Roll a single die with `sides` using crypto.getRandomValues.
   * Returns a uniformly distributed integer in [1, sides].
   */
  roll(sides: number): number {
    if (sides < 2 || !Number.isInteger(sides)) {
      throw new Error(`Invalid die sides: ${sides}. Must be an integer >= 2.`);
    }
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    // Uniform modulo reduction — bias is negligible for dice sizes << 2^32
    return (buffer[0] % sides) + 1;
  }

  // -----------------------------------------------------------------------
  // Parsed roll  (e.g. "2d20+3")
  // -----------------------------------------------------------------------

  /**
   * Parse a dice notation string and roll it.
   * Supports: NdS, NdS+M, NdS-M, dS, dS+M.
   */
  rollParsed(notation: string): RollResult {
    const match = notation.toLowerCase().trim().match(/^(\d+)?d(\d+)([+-]\d+)?$/);
    if (!match) {
      throw new Error(`Invalid dice notation: "${notation}". Expected format like 2d6, d20+3, 4d6-1.`);
    }
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    return this.rollMultiple(count, sides, modifier);
  }

  // -----------------------------------------------------------------------
  // Multiple dice
  // -----------------------------------------------------------------------

  /**
   * Roll `count` dice each with `sides`, apply `modifier`.
   * Result includes every individual roll for transparency.
   */
  rollMultiple(count: number, sides: number, modifier: number = 0): RollResult {
    if (count < 1 || !Number.isInteger(count)) {
      throw new Error(`Invalid dice count: ${count}. Must be a positive integer.`);
    }
    if (count > 100) {
      throw new Error(`Dice count ${count} exceeds maximum of 100.`);
    }

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.roll(sides));
    }

    const total = rolls.reduce((sum, r) => sum + r, 0);
    const result: RollResult = {
      dice: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}`,
      sides,
      rolls,
      modifier,
      total,
      finalTotal: total + modifier,
      timestamp: Date.now(),
    };

    this.recordAudit(result);
    return result;
  }

  // -----------------------------------------------------------------------
  // Advantage / Disadvantage
  // -----------------------------------------------------------------------

  /**
   * Roll 2d20 and keep the higher (advantage) or lower (disadvantage) result.
   * Both rolls are recorded for audit transparency.
   */
  rollWithAdvantage(type: 'advantage' | 'disadvantage', modifier: number = 0): RollResult {
    const rollA = this.roll(20);
    const rollB = this.roll(20);

    const kept = type === 'advantage' ? Math.max(rollA, rollB) : Math.min(rollA, rollB);
    const dropped = kept === rollA ? rollB : rollA;

    const result: RollResult = {
      dice: `2d20${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}`,
      sides: 20,
      rolls: [rollA, rollB],
      modifier,
      total: kept,
      finalTotal: kept + modifier,
      timestamp: Date.now(),
      advantage: type,
      keptRoll: kept,
      droppedRoll: dropped,
    };

    this.recordAudit(result);
    return result;
  }

  // -----------------------------------------------------------------------
  // Batch rolling  (e.g. 8d6 fireball)
  // -----------------------------------------------------------------------

  /**
   * Roll a batch of identical dice and return each individual roll plus totals.
   * Useful for damage rolls like 8d6 fireball where you want to see each die.
   */
  rollBatch(count: number, sides: number): RollResult {
    return this.rollMultiple(count, sides, 0);
  }

  // -----------------------------------------------------------------------
  // Fairness statistics
  // -----------------------------------------------------------------------

  /**
   * Compute basic fairness statistics across all recorded rolls for a given die size.
   * Returns mean, expected mean, frequency distribution, and chi-square statistic.
   */
  getFairnessStats(sides: number): FairnessStats {
    const relevantEntries = this.auditLog.filter(e => e.result.sides === sides);
    const allRolls = relevantEntries.flatMap(e => e.result.rolls);

    if (allRolls.length === 0) {
      return { totalRolls: 0, mean: 0, expectedMean: (sides + 1) / 2, distribution: new Map(), chiSquare: 0 };
    }

    const mean = allRolls.reduce((s, r) => s + r, 0) / allRolls.length;
    const expectedMean = (sides + 1) / 2;

    // Build distribution
    const distribution = new Map<number, number>();
    for (let face = 1; face <= sides; face++) {
      distribution.set(face, 0);
    }
    for (const r of allRolls) {
      distribution.set(r, (distribution.get(r) ?? 0) + 1);
    }

    // Chi-square test
    const expected = allRolls.length / sides;
    let chiSquare = 0;
    for (let face = 1; face <= sides; face++) {
      const observed = distribution.get(face) ?? 0;
      chiSquare += ((observed - expected) ** 2) / expected;
    }

    return { totalRolls: allRolls.length, mean, expectedMean, distribution, chiSquare };
  }

  // -----------------------------------------------------------------------
  // Audit log
  // -----------------------------------------------------------------------

  /** Record a roll result in the audit log. */
  private recordAudit(result: RollResult): void {
    this.rollCounter++;
    this.auditLog.push({
      id: `roll-${this.rollCounter}`,
      result,
      timestamp: result.timestamp,
    });
    // Keep the log bounded — retain the latest 10 000 entries
    if (this.auditLog.length > 10_000) {
      this.auditLog = this.auditLog.slice(-5_000);
    }
  }

  /** Return a snapshot of the full audit log. */
  getAuditLog(): ReadonlyArray<Readonly<AuditEntry>> {
    return this.auditLog;
  }

  /** Clear the audit log and reset counters. */
  clearAuditLog(): void {
    this.auditLog = [];
    this.rollCounter = 0;
  }

  /** Number of recorded rolls. */
  get rollCount(): number {
    return this.rollCounter;
  }
}

// ---------------------------------------------------------------------------
// Singleton convenience (optional)
// ---------------------------------------------------------------------------

export const diceRoller = new CryptoDiceRoller();
