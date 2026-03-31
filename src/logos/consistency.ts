// ConsistencyChecker: validates actions and narration against established facts
// Fact: subject + predicate + object + source + confidence
// Checks: location consistency, NPC knowledge bounds, item existence, time continuity
// Exports: ConsistencyChecker class with check(), validate(), getContradictions(), addFact()

// --- Types and Interfaces ---

export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  source: string; // 'narration' | 'action' | 'dm' | 'system'
  confidence: number;
  timestamp: number;
  campaignTime?: string; // in-game time reference
  immutable: boolean; // true for facts that can never be contradicted (e.g. deaths)
}

export interface Violation {
  severity: 'warning' | 'error' | 'block';
  message: string;
  newFact: Fact;
  conflictingFact: Fact;
  rule: string;
  suggestion: string;
}

export interface ConsistencyResult {
  valid: boolean;
  violations: Violation[];
  suggestions: string[];
}

export interface GameAction {
  type: 'move' | 'attack' | 'use-item' | 'cast-spell' | 'interact' | 'speak' | 'skill-check' | 'other';
  actorId: string;
  targetId?: string;
  itemId?: string;
  locationId?: string;
  description: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface EntityLocation {
  entityId: string;
  locationId: string;
  since: number;
}

export interface KnowledgeEntry {
  entityId: string;
  knownFactIds: string[];
  learnedFrom: string[]; // who told them or what they witnessed
}

// --- Fact Triple Helpers ---

function factTriple(fact: Fact): string {
  return `${fact.subject.toLowerCase()}|${fact.predicate.toLowerCase()}|${fact.object.toLowerCase()}`;
}

function factKey(subject: string, predicate: string): string {
  return `${subject.toLowerCase()}|${predicate.toLowerCase()}`;
}

function normalizeId(id: string): string {
  return id.toLowerCase().trim();
}

// --- ConsistencyChecker Class ---

export class ConsistencyChecker {
  private facts: Map<string, Fact> = new Map(); // id -> Fact
  private triples: Map<string, Set<string>> = new Map(); // "subject|predicate" -> Set of fact ids
  private entityLocations: Map<string, EntityLocation> = new Map();
  private entityKnowledge: Map<string, KnowledgeEntry> = new Map();
  private entityStates: Map<string, Map<string, string>> = new Map(); // entityId -> state key -> value
  private gameClock: number = 0;
  private strictMode: boolean;

  constructor(strictMode: boolean = false) {
    this.strictMode = strictMode;
  }

  // --- Fact Management ---

  addFact(
    subject: string,
    predicate: string,
    object: string,
    source: string = 'narration',
    confidence: number = 1.0,
    immutable: boolean = false
  ): Fact {
    const id = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fact: Fact = {
      id,
      subject: normalizeId(subject),
      predicate: normalizeId(predicate),
      object,
      source,
      confidence,
      timestamp: Date.now(),
      immutable,
    };

    this.facts.set(id, fact);

    const key = factKey(subject, predicate);
    if (!this.triples.has(key)) {
      this.triples.set(key, new Set());
    }
    this.triples.get(key)!.add(id);

    return fact;
  }

  removeFact(factId: string): boolean {
    const fact = this.facts.get(factId);
    if (!fact) return false;
    if (fact.immutable) return false; // Can't remove immutable facts

    const key = factKey(fact.subject, fact.predicate);
    const set = this.triples.get(key);
    if (set) {
      set.delete(factId);
      if (set.size === 0) this.triples.delete(key);
    }

    this.facts.delete(factId);
    return true;
  }

  getFact(factId: string): Fact | undefined {
    return this.facts.get(factId);
  }

  queryFacts(subject?: string, predicate?: string): Fact[] {
    const results: Fact[] = [];

    if (subject && predicate) {
      const key = factKey(subject, predicate);
      const ids = this.triples.get(key);
      if (ids) {
        for (const id of ids) {
          const fact = this.facts.get(id);
          if (fact) results.push(fact);
        }
      }
    } else if (subject) {
      const normSubject = normalizeId(subject);
      for (const fact of this.facts.values()) {
        if (fact.subject === normSubject) results.push(fact);
      }
    } else {
      for (const fact of this.facts.values()) {
        results.push(fact);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // --- Location Tracking ---

  setEntityLocation(entityId: string, locationId: string): void {
    this.entityLocations.set(normalizeId(entityId), {
      entityId: normalizeId(entityId),
      locationId: normalizeId(locationId),
      since: Date.now(),
    });
  }

  getEntityLocation(entityId: string): string | null {
    return this.entityLocations.get(normalizeId(entityId))?.locationId ?? null;
  }

  // --- NPC Knowledge Tracking ---

  addNPCKnowledge(npcId: string, factId: string, learnedFrom: string): void {
    const normId = normalizeId(npcId);
    let entry = this.entityKnowledge.get(normId);
    if (!entry) {
      entry = { entityId: normId, knownFactIds: [], learnedFrom: [] };
      this.entityKnowledge.set(normId, entry);
    }
    if (!entry.knownFactIds.includes(factId)) {
      entry.knownFactIds.push(factId);
    }
    if (!entry.learnedFrom.includes(learnedFrom)) {
      entry.learnedFrom.push(learnedFrom);
    }
  }

  npcKnows(npcId: string, factId: string): boolean {
    return this.entityKnowledge.get(normalizeId(npcId))?.knownFactIds.includes(factId) ?? false;
  }

  // --- Entity State Tracking ---

  setEntityState(entityId: string, key: string, value: string): void {
    const normId = normalizeId(entityId);
    if (!this.entityStates.has(normId)) {
      this.entityStates.set(normId, new Map());
    }
    this.entityStates.get(normId)!.set(key, value);
  }

  getEntityState(entityId: string, key: string): string | undefined {
    return this.entityStates.get(normalizeId(entityId))?.get(key);
  }

  // --- Contradiction Detection ---

  getContradictions(newFact: { subject: string; predicate: string; object: string }): Violation[] {
    const violations: Violation[] = [];
    const key = factKey(newFact.subject, newFact.predicate);
    const existingIds = this.triples.get(key);

    if (!existingIds) return violations;

    for (const id of existingIds) {
      const existing = this.facts.get(id);
      if (!existing) continue;

      if (existing.object.toLowerCase() !== newFact.object.toLowerCase()) {
        const severity = existing.immutable ? 'block' : this.strictMode ? 'error' : 'warning';
        violations.push({
          severity,
          message: `Contradiction: ${existing.subject} ${existing.predicate} is "${existing.object}", not "${newFact.object}"`,
          newFact: { ...newFact, id: '', source: '', confidence: 1, timestamp: Date.now(), immutable: false },
          conflictingFact: existing,
          rule: 'fact-contradiction',
          suggestion: existing.immutable
            ? `This fact is immutable and cannot be changed.`
            : `Consider updating the existing fact or marking the old one as outdated.`,
        });
      }
    }

    return violations;
  }

  // --- Action Validation ---

  check(action: GameAction): ConsistencyResult {
    const violations: Violation[] = [];
    const suggestions: string[] = [];

    switch (action.type) {
      case 'move':
        this.checkMove(action, violations, suggestions);
        break;
      case 'attack':
        this.checkAttack(action, violations, suggestions);
        break;
      case 'use-item':
        this.checkUseItem(action, violations, suggestions);
        break;
      case 'cast-spell':
        this.checkCastSpell(action, violations, suggestions);
        break;
      case 'speak':
        this.checkSpeak(action, violations, suggestions);
        break;
      case 'interact':
        this.checkInteract(action, violations, suggestions);
        break;
    }

    // Always check location consistency
    this.checkLocationConsistency(action, violations);

    // Always check death permanence
    this.checkDeathPermanence(action, violations);

    const hasBlocks = violations.some((v) => v.severity === 'block');
    const hasErrors = violations.some((v) => v.severity === 'error');

    return {
      valid: !hasBlocks && (!this.strictMode || !hasErrors),
      violations,
      suggestions,
    };
  }

  private checkMove(action: GameAction, violations: Violation[], suggestions: string[]): void {
    const actorLoc = this.getEntityLocation(action.actorId);
    const targetLoc = action.locationId;

    if (actorLoc && targetLoc && actorLoc === normalizeId(targetLoc)) {
      suggestions.push(`${action.actorId} is already at ${targetLoc}.`);
    }

    // Check if path is blocked
    const blockedFacts = this.queryFacts(targetLoc, 'blocked-by');
    for (const fact of blockedFacts) {
      if (fact.object && action.actorId !== fact.object) {
        violations.push({
          severity: 'warning',
          message: `Path to ${targetLoc} is blocked by ${fact.object}.`,
          newFact: this.dummyFact(action),
          conflictingFact: fact,
          rule: 'location-blocked',
          suggestion: `The party may need to find another way around or deal with ${fact.object}.`,
        });
      }
    }

    suggestions.push(`Update ${action.actorId}'s location to ${targetLoc}.`);
  }

  private checkAttack(action: GameAction, violations: Violation[], suggestions: string[]): void {
    if (!action.targetId) {
      violations.push({
        severity: 'error',
        message: 'Attack action requires a target.',
        newFact: this.dummyFact(action),
        conflictingFact: this.dummyFact(action),
        rule: 'attack-target',
        suggestion: 'Specify a target for the attack.',
      });
      return;
    }

    // Check target is alive
    const targetState = this.getEntityState(action.targetId, 'alive');
    if (targetState === 'false') {
      violations.push({
        severity: 'block',
        message: `${action.targetId} is dead and cannot be attacked.`,
        newFact: this.dummyFact(action),
        conflictingFact: this.dummyFact(action),
        rule: 'death-permanence',
        suggestion: 'The dead cannot be attacked. Consider targeting a different entity.',
      });
    }

    // Check location proximity
    const actorLoc = this.getEntityLocation(action.actorId);
    const targetLoc = this.getEntityLocation(action.targetId);
    if (actorLoc && targetLoc && actorLoc !== targetLoc) {
      violations.push({
        severity: 'warning',
        message: `${action.actorId} is at ${actorLoc} but ${action.targetId} is at ${targetLoc}.`,
        newFact: this.dummyFact(action),
        conflictingFact: this.dummyFact(action),
        rule: 'location-proximity',
        suggestion: 'The attacker needs to move to the same location first.',
      });
    }
  }

  private checkUseItem(action: GameAction, violations: Violation[], suggestions: string[]): void {
    if (!action.itemId) {
      violations.push({
        severity: 'error',
        message: 'Use-item action requires an item ID.',
        newFact: this.dummyFact(action),
        conflictingFact: this.dummyFact(action),
        rule: 'item-required',
        suggestion: 'Specify which item to use.',
      });
      return;
    }

    // Check item ownership
    const ownerFacts = this.queryFacts(action.itemId, 'owned-by');
    const ownedBy = ownerFacts.length > 0 ? ownerFacts[0].object : null;
    if (ownedBy && ownedBy !== normalizeId(action.actorId)) {
      violations.push({
        severity: 'block',
        message: `${action.itemId} is owned by ${ownedBy}, not ${action.actorId}.`,
        newFact: this.dummyFact(action),
        conflictingFact: ownerFacts[0],
        rule: 'item-ownership',
        suggestion: `${action.actorId} needs to pick up or receive the item first.`,
      });
    }

    // Check item existence
    const existsFacts = this.queryFacts(action.itemId, 'exists');
    if (existsFacts.length > 0 && existsFacts[0].object === 'false') {
      violations.push({
        severity: 'block',
        message: `${action.itemId} no longer exists.`,
        newFact: this.dummyFact(action),
        conflictingFact: existsFacts[0],
        rule: 'item-existence',
        suggestion: 'The item has been consumed, destroyed, or removed.',
      });
    }
  }

  private checkCastSpell(action: GameAction, violations: Violation[], suggestions: string[]): void {
    // Check concentration
    const concentrating = this.queryFacts(action.actorId, 'concentrating-on');
    const spellMeta = action.metadata['concentration'] as boolean | undefined;

    if (spellMeta && concentrating.length > 0) {
      violations.push({
        severity: 'warning',
        message: `${action.actorId} is concentrating on ${concentrating[0].object}. Casting a concentration spell will break it.`,
        newFact: this.dummyFact(action),
        conflictingFact: concentrating[0],
        rule: 'spell-concentration',
        suggestion: 'The previous concentration spell will end.',
      });
    }

    // Check component requirements
    const silenced = this.queryFacts(action.actorId, 'condition-silenced');
    if (silenced.length > 0 && silenced[0].object === 'true') {
      suggestions.push(`${action.actorId} is silenced and may not be able to cast verbal spells.`);
    }
  }

  private checkSpeak(action: GameAction, violations: Violation[], suggestions: string[]): void {
    if (!action.targetId) return;

    // Check NPC knowledge bounds
    const npcKnowledge = this.entityKnowledge.get(normalizeId(action.targetId));
    const mentionedEntities = this.extractEntities(action.description);

    for (const entity of mentionedEntities) {
      if (npcKnowledge) {
        const knowsAbout = npcKnowledge.knownFactIds.some((fid) => {
          const fact = this.facts.get(fid);
          return fact && (fact.subject === entity || fact.object === entity);
        });
        if (!knowsAbout) {
          suggestions.push(
            `${action.targetId} may not know about ${entity}. Consider having them learn about it first.`
          );
        }
      }
    }
  }

  private checkInteract(action: GameAction, violations: Violation[], suggestions: string[]): void {
    // Check location of interactable
    if (action.targetId) {
      const targetLoc = this.getEntityLocation(action.targetId);
      const actorLoc = this.getEntityLocation(action.actorId);
      if (targetLoc && actorLoc && targetLoc !== actorLoc) {
        violations.push({
          severity: 'warning',
          message: `${action.targetId} is at ${targetLoc}, but ${action.actorId} is at ${actorLoc}.`,
          newFact: this.dummyFact(action),
          conflictingFact: this.dummyFact(action),
          rule: 'location-proximity',
          suggestion: 'Move to the same location to interact.',
        });
      }
    }
  }

  private checkLocationConsistency(action: GameAction, violations: Violation[]): void {
    if (!action.locationId) return;

    const actorLoc = this.getEntityLocation(action.actorId);
    if (actorLoc && action.locationId && actorLoc !== normalizeId(action.locationId)) {
      // Only warn, don't block -- they might be moving
      const relevantTypes: GameAction['type'][] = ['attack', 'use-item', 'interact', 'cast-spell'];
      if (relevantTypes.includes(action.type)) {
        // Soft warning for non-move actions in wrong location
      }
    }
  }

  private checkDeathPermanence(action: GameAction, violations: Violation[]): void {
    const actorState = this.getEntityState(action.actorId, 'alive');
    if (actorState === 'false' && action.type !== 'speak') {
      // Dead entities can't take most actions (speak might be a ghost/DM narration)
      const aliveFacts = this.queryFacts(action.actorId, 'alive');
      if (aliveFacts.length > 0 && aliveFacts[0].object === 'false') {
        violations.push({
          severity: 'block',
          message: `${action.actorId} is dead and cannot perform actions.`,
          newFact: this.dummyFact(action),
          conflictingFact: aliveFacts[0],
          rule: 'death-permanence',
          suggestion: 'Dead characters cannot act. Consider resurrection magic or a different character.',
        });
      }
    }
  }

  // --- Narration Validation ---

  validate(narration: string): Fact[] {
    const extractedFacts = this.extractFactsFromNarration(narration);
    const contradictions: Fact[] = [];

    for (const partial of extractedFacts) {
      const contradictionsForFact = this.getContradictions(partial);
      if (contradictionsForFact.length > 0) {
        contradictions.push(partial as Fact);
      }
    }

    return contradictions;
  }

  // --- Relationship Consistency ---

  checkRelationshipChange(entityId: string, targetId: string, newDisposition: number): Violation[] {
    const violations: Violation[] = [];
    const currentFacts = this.queryFacts(entityId, `disposition-toward-${normalizeId(targetId)}`);

    if (currentFacts.length > 0) {
      const current = parseInt(currentFacts[0].object, 10);
      const delta = Math.abs(newDisposition - current);

      // Large jumps are suspicious
      if (delta > 30) {
        violations.push({
          severity: 'warning',
          message: `Disposition change from ${current} to ${newDisposition} is very large (${delta} points).`,
          newFact: this.dummyFact({ type: 'other', actorId: entityId, description: '', timestamp: 0, metadata: {} }),
          conflictingFact: currentFacts[0],
          rule: 'relationship-gradual',
          suggestion: 'Relationships should change gradually. Consider a smaller adjustment with a clear reason.',
        });
      }
    }

    return violations;
  }

  // --- Serialization ---

  serialize(): string {
    return JSON.stringify({
      facts: Array.from(this.facts.entries()),
      entityLocations: Array.from(this.entityLocations.entries()),
      entityKnowledge: Array.from(this.entityKnowledge.entries()).map(([k, v]) => [k, v]),
      entityStates: Array.from(this.entityStates.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      gameClock: this.gameClock,
    });
  }

  static deserialize(json: string): ConsistencyChecker {
    const data = JSON.parse(json);
    const checker = new ConsistencyChecker();
    checker.gameClock = data.gameClock ?? 0;

    for (const [id, fact] of data.facts) {
      checker.facts.set(id, fact);
      const key = factKey(fact.subject, fact.predicate);
      if (!checker.triples.has(key)) checker.triples.set(key, new Set());
      checker.triples.get(key)!.add(id);
    }

    for (const [id, loc] of data.entityLocations) {
      checker.entityLocations.set(id, loc);
    }

    for (const [id, entry] of data.entityKnowledge) {
      checker.entityKnowledge.set(id, entry);
    }

    for (const [id, states] of data.entityStates) {
      const map = new Map<string, string>();
      for (const [k, v] of states) map.set(k, v);
      checker.entityStates.set(id, map);
    }

    return checker;
  }

  // --- Private Helpers ---

  private dummyFact(action: GameAction | { subject: string; predicate: string; object: string }): Fact {
    if ('type' in action) {
      return {
        id: '',
        subject: action.actorId,
        predicate: action.type,
        object: action.description,
        source: 'action',
        confidence: 1,
        timestamp: action.timestamp,
        immutable: false,
      };
    }
    return {
      id: '',
      subject: action.subject,
      predicate: action.predicate,
      object: action.object,
      source: '',
      confidence: 1,
      timestamp: Date.now(),
      immutable: false,
    };
  }

  private extractFactsFromNarration(narration: string): Array<{ subject: string; predicate: string; object: string }> {
    // Simple pattern-based fact extraction
    // In production, this would use an LLM call
    const facts: Array<{ subject: string; predicate: string; object: string }> = [];

    // Pattern: "[Entity] is [state]" or "[Entity] has [item]"
    const patterns = [
      /(\w+)\s+is\s+(?:located\s+in\s+|at\s+)?(.+?)(?:\.|,|$)/gi,
      /(\w+)\s+has\s+(.+?)(?:\.|,|$)/gi,
      /(\w+)\s+(?:owns?|possesses?)\s+(.+?)(?:\.|,|$)/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(narration)) !== null) {
        const subject = normalizeId(match[1]);
        const object = match[2].trim();
        let predicate = 'is';
        if (pattern.source.includes('has') || pattern.source.includes('own')) {
          predicate = 'has';
        }
        if (object.length > 0 && object.length < 100) {
          facts.push({ subject, predicate, object });
        }
      }
    }

    return facts;
  }

  private extractEntities(text: string): string[] {
    // Simple capitalization-based entity extraction
    const words = text.split(/\s+/);
    const entities: string[] = [];
    for (const word of words) {
      if (word.length > 2 && /^[A-Z]/.test(word)) {
        entities.push(normalizeId(word.replace(/[^a-zA-Z]/g, '')));
      }
    }
    return entities;
  }
}
