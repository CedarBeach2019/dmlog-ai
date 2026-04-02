// initiative-tracker.ts

export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'monster';
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  conditions: Array<{ name: string; duration: number; effect: string }>;
  isAlive: boolean;
}

export interface RoundLog {
  round: number;
  turn: string;
  action: string;
  damage?: number;
  healing?: number;
}

export class InitiativeTracker {
  private combatants: Map<string, Combatant> = new Map();
  private turnOrder: string[] = [];
  private currentIndex: number = 0;
  private currentRound: number = 1;
  private log: RoundLog[] = [];
  private isActive: boolean = false;
  private conditionWarnings: string[] = [];

  addCombatant(data: Omit<Combatant, 'conditions' | 'isAlive'>): Combatant {
    const combatant: Combatant = {
      ...data,
      conditions: [],
      isAlive: true
    };
    this.combatants.set(combatant.id, combatant);
    return combatant;
  }

  rollInitiative(): void {
    for (const c of this.combatants.values()) {
      c.initiative = Math.floor(Math.random() * 20) + 1 + Math.floor(Math.random() * 5);
    }
    this.sortCombatants();
    this.isActive = true;
    this.currentRound = 1;
    this.currentIndex = 0;
    this.log = [];
  }

  sortCombatants(): void {
    this.turnOrder = [...this.combatants.values()]
      .sort((a, b) => b.initiative - a.initiative)
      .map(c => c.id);
  }

  nextTurn(): { combatant: Combatant; round: number; isNewRound: boolean } | null {
    if (!this.isActive) return null;

    // Tick conditions at the start of the current combatant's turn
    this.tickConditions();

    // Find next alive combatant
    let attempts = 0;
    do {
      this.currentIndex++;
      if (this.currentIndex >= this.turnOrder.length) {
        this.currentIndex = 0;
        this.currentRound++;
      }
      attempts++;
      if (attempts > this.turnOrder.length) return null; // All dead
    } while (!this.combatants.get(this.turnOrder[this.currentIndex])!.isAlive);

    return {
      combatant: this.getCurrentCombatant(),
      round: this.currentRound,
      isNewRound: this.currentIndex === 0
    };
  }

  applyDamage(id: string, amount: number): { damage: number; remainingHp: number; isDown: boolean } {
    const c = this.combatants.get(id);
    if (!c) throw new Error(`Combatant ${id} not found`);

    const actualDamage = Math.min(amount, c.hp);
    c.hp = Math.max(0, c.hp - actualDamage);
    
    if (c.hp === 0) {
      c.isAlive = false;
    }

    return { damage: actualDamage, remainingHp: c.hp, isDown: !c.isAlive };
  }

  applyHealing(id: string, amount: number): { healing: number; remainingHp: number } {
    const c = this.combatants.get(id);
    if (!c) throw new Error(`Combatant ${id} not found`);

    const actualHealing = Math.min(amount, c.maxHp - c.hp);
    c.hp += actualHealing;

    // Optional logic: revive if healed above 0 (depends on TTRPG rules, keeping it simple here)
    if (c.hp > 0 && !c.isAlive) {
      c.isAlive = true;
    }

    return { healing: actualHealing, remainingHp: c.hp };
  }

  addCondition(id: string, name: string, duration: number, effect: string): void {
    const c = this.combatants.get(id);
    if (!c) throw new Error(`Combatant ${id} not found`);
    
    // Remove existing condition of the same name to refresh it
    this.removeCondition(id, name);
    c.conditions.push({ name, duration, effect });
  }

  removeCondition(id: string, name: string): void {
    const c = this.combatants.get(id);
    if (!c) throw new Error(`Combatant ${id} not found`);
    c.conditions = c.conditions.filter(cond => cond.name !== name);
  }

  tickConditions(): string[] {
    const c = this.getCurrentCombatant();
    if (!c) return [];

    const expired: string[] = [];
    c.conditions = c.conditions.filter(cond => {
      cond.duration--;
      if (cond.duration <= 0) {
        expired.push(`${c.name}'s ${cond.name} has expired.`);
        return false;
      }
      return true;
    });
    
    this.conditionWarnings.push(...expired);
    return expired;
  }

  getCurrentCombatant(): Combatant {
    return this.combatants.get(this.turnOrder[this.currentIndex])!;
  }

  getCombatOrder(): Combatant[] {
    return this.turnOrder
      .map(id => this.combatants.get(id)!)
      .filter(c => c.isAlive);
  }

  logAction(action: string, details?: { damage?: number; healing?: number }): void {
    this.log.push({
      round: this.currentRound,
      turn: this.getCurrentCombatant().name,
      action,
      damage: details?.damage,
      healing: details?.healing
    });
  }

  getCombatSummary(): string {
    const dead = [...this.combatants.values()].filter(c => !c.isAlive);
    const alive = this.getCombatOrder();
    return [
      `--- Combat Summary (Round ${this.currentRound}) ---`,
      `Alive: ${alive.map(c => `${c.name} (${c.hp}/${c.maxHp}HP)`).join(', ') || 'None'}`,
      `Dead/Down: ${dead.map(c => c.name).join(', ') || 'None'}`,
      `Actions Tracked: ${this.log.length}`
    ].join('\n');
  }

  endCombat(): { rounds: number; survivors: Combatant[] } {
    const summary = {
      rounds: this.currentRound,
      survivors: this.getCombatOrder()
    };
    
    // Reset state
    this.combatants.clear();
    this.turnOrder = [];
    this.currentIndex = 0;
    this.currentRound = 1;
    this.isActive = false;
    this.log = [];
    
    return summary;
  }

  serialize(): string {
    return JSON.stringify({
      combatants: [...this.combatants.entries()],
      turnOrder: this.turnOrder,
      currentIndex: this.currentIndex,
      currentRound: this.currentRound,
      log: this.log,
      isActive: this.isActive
    });
  }

  static deserialize(json: string): InitiativeTracker {
    const tracker = new InitiativeTracker();
    const state = JSON.parse(json);
    
    tracker.combatants = new Map(state.combatants);
    tracker.turnOrder = state.turnOrder;
    tracker.currentIndex = state.currentIndex;
    tracker.currentRound = state.currentRound;
    tracker.log = state.log;
    tracker.isActive = state.isActive;
    
    return tracker;
  }
}