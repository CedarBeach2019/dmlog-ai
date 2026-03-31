/**
 * Core Game Engine — turn management, state machine, game loop.
 *
 * Orchestrates the full cycle: player input -> intent parse -> world update
 * -> DM narration. Manages session state, turn counter, active encounters,
 * pending actions, and history for replay/consistency.
 *
 * Uses: World, CombatManager, DiceRoller, CharacterManager, NPCManager, QuestManager
 */

import { World, RandomEncounter, Location, TimeOfDay } from "./world.js";
import { CombatManager, CombatEncounter, Combatant, AttackResult, CombatLogEntry } from "./combat.js";
import { DiceRoller, RollResult } from "./dice.js";
import { CharacterManager, Character, getModifier } from "./character.js";
import { NPCManager, NPC } from "./npc.js";
import { QuestManager, Quest, QuestReward } from "./quest.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GamePhase = "setup" | "playing" | "paused" | "ended";

export type TurnType = "exploration" | "combat" | "social" | "rest";

export type IntentType =
  | "move" | "attack" | "talk" | "investigate" | "use-item"
  | "cast-spell" | "rest" | "check-inventory" | "check-quest"
  | "interact" | "wait" | "flee" | "trade" | "custom";

export interface PlayerIntent {
  type: IntentType;
  raw: string;
  target?: string;
  direction?: string;
  item?: string;
  spell?: string;
  details?: string;
}

export interface StateChange {
  locationChanged: boolean;
  newLocationId?: string;
  combatStarted: boolean;
  combatEnded: boolean;
  combatEncounterId?: string;
  hpChanged: Map<string, { before: number; after: number }>;
  itemsGained: string[];
  itemsLost: string[];
  xpGained: number;
  goldGained: number;
  goldLost: number;
  questsUpdated: string[];
  newQuests: string[];
  conditionsChanged: string[];
  npcsMet: string[];
  timeAdvanced: boolean;
  weatherChanged: boolean;
}

export interface DiceRollRecord {
  roll: RollResult;
  context: string;
  turn: number;
}

export interface TurnResult {
  turnNumber: number;
  turnType: TurnType;
  narration: string;
  stateChanges: StateChange;
  diceRolls: DiceRollRecord[];
  combatUpdate: {
    encounterId: string | null;
    log: CombatLogEntry[];
    isOver: boolean;
    winner: "players" | "enemies" | "none";
  } | null;
  newQuests: Quest[];
  availableActions: string[];
  error?: string;
}

export interface HistoryEntry {
  turn: number;
  timestamp: number;
  playerInput: string;
  intent: PlayerIntent;
  result: TurnResult;
}

export interface GameSession {
  id: string;
  campaignId: string;
  campaignName: string;
  characters: string[];
  currentLocation: string;
  turnCount: number;
  phase: GamePhase;
  history: HistoryEntry[];
  activeEncounterId: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Intent parsing keywords
// ---------------------------------------------------------------------------

const MOVE_KEYWORDS = ["go", "move", "walk", "travel", "head", "north", "south", "east", "west", "enter", "leave", "climb", "descend"];
const ATTACK_KEYWORDS = ["attack", "hit", "strike", "slash", "stab", "shoot", "cast", "fire", "smite", "fight", "kill"];
const TALK_KEYWORDS = ["talk", "speak", "ask", "say", "tell", "greet", "persuade", "intimidate", "deceive", "charm", "chat"];
const INVESTIGATE_KEYWORDS = ["search", "look", "examine", "inspect", "investigate", "check", "perceive", "notice", "find", "detect", "listen"];
const USE_ITEM_KEYWORDS = ["use", "drink", "eat", "apply", "consume", "activate"];
const REST_KEYWORDS = ["rest", "sleep", "camp", "meditate", "short rest", "long rest"];
const INVENTORY_KEYWORDS = ["inventory", "items", "equipment", "backpack", "bag", "gear"];
const QUEST_KEYWORDS = ["quest", "mission", "journal", "task", "objective"];
const INTERACT_KEYWORDS = ["open", "close", "lock", "unlock", "pick up", "push", "pull", "press", "touch", "grab", "take"];
const FLEE_KEYWORDS = ["flee", "run away", "retreat", "escape"];
const TRADE_KEYWORDS = ["buy", "sell", "trade", "shop", "purchase", "barter"];

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let nextSessionId = 1;

// ---------------------------------------------------------------------------
// GameEngine
// ---------------------------------------------------------------------------

export class GameEngine {
  // Subsystems
  private world: World;
  private combat: CombatManager;
  private dice: DiceRoller;
  private characters: CharacterManager;
  private npcs: NPCManager;
  private quests: QuestManager;

  // Session state
  private session: GameSession;
  private activeEncounter: CombatEncounter | null = null;

  // KV storage simulation (would be replaced by real KV in production)
  private savedSessions: Map<string, string> = new Map();

  constructor() {
    this.world = new World();
    this.combat = new CombatManager();
    this.dice = new DiceRoller();
    this.characters = new CharacterManager();
    this.npcs = new NPCManager();
    this.quests = new QuestManager();

    this.session = this.createDefaultSession();
  }

  private createDefaultSession(): GameSession {
    return {
      id: `session_${nextSessionId++}_${Date.now().toString(36)}`,
      campaignId: "",
      campaignName: "Untitled Campaign",
      characters: [],
      currentLocation: "",
      turnCount: 0,
      phase: "setup",
      history: [],
      activeEncounterId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    };
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start a new game session.
   * Sets up the world, creates initial locations, and transitions to playing.
   */
  start(opts: {
    campaignId: string;
    campaignName: string;
    characterIds: string[];
    startingLocationId?: string;
  }): GameSession {
    this.session = {
      ...this.createDefaultSession(),
      campaignId: opts.campaignId,
      campaignName: opts.campaignName,
      characters: opts.characterIds,
      currentLocation: opts.startingLocationId ?? "",
      phase: "playing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Generate starting location if none provided
    if (!this.session.currentLocation) {
      const startLocation = this.world.generateFromTemplate(4); // Market Square
      this.session.currentLocation = startLocation.id;
      startLocation.discovered = true;
      startLocation.visited = true;
      startLocation.visitCount = 1;
    }

    // Generate a few connected locations
    this.generateInitialWorld();

    return { ...this.session };
  }

  private generateInitialWorld(): void {
    // Create a small starter area
    const inn = this.world.generateFromTemplate(0);    // Crossroads Inn
    const ruins = this.world.generateFromTemplate(1);  // Ancient Ruins
    const forest = this.world.generateFromTemplate(2);  // Dark Forest
    const mountain = this.world.generateFromTemplate(3); // Mountain Pass

    const start = this.world.getLocation(this.session.currentLocation);
    if (!start) return;

    // Connect locations
    if (inn) this.world.connect(start.id, "north", inn.id, "south");
    if (forest) this.world.connect(start.id, "east", forest.id, "west");
    if (ruins) this.world.connect(start.id, "south", ruins.id, "north");
    if (mountain) this.world.connect(start.id, "west", mountain.id, "east");

    // Add cross-connections
    if (inn && forest) this.world.connect(inn.id, "east", forest.id, "northwest");
    if (forest && ruins) this.world.connect(forest.id, "south", ruins.id, "northeast");

    // Place some NPCs
    if (inn) {
      const innkeeper = this.npcs.generate({ occupation: "innkeeper", location: inn.id });
      this.world.addNPCToLocation(innkeeper.id, inn.id);

      const bard = this.npcs.generate({ race: "half-elf", occupation: "bard", location: inn.id });
      this.world.addNPCToLocation(bard.id, inn.id);
    }

    if (ruins) {
      const scholar = this.npcs.generate({ race: "human", occupation: "scholar", location: ruins.id });
      this.world.addNPCToLocation(scholar.id, ruins.id);
    }

    // Create an initial quest
    if (inn) {
      const innkeeperNpc = this.npcs.getNPCsByLocation(inn.id)[0];
      if (innkeeperNpc) {
        this.quests.create({
          title: "The Missing Shipment",
          description: "The innkeeper's latest supply shipment never arrived. Investigate what happened.",
          type: "explore",
          objectives: [
            { description: "Ask about the missing shipment", optional: false, hidden: false },
            { description: "Find the wagon on the road", optional: false, hidden: false, targetLocation: "loc_*" },
            { description: "Discover what happened", optional: false, hidden: true },
            { description: "Recover the cargo", optional: true, hidden: false },
          ],
          rewards: { experience: 200, gold: 50, items: [], unlockQuests: [] },
          giver: innkeeperNpc.id,
          location: inn.id,
          assignedTo: this.session.characters,
        });
      }
    }
  }

  /** Pause the game. */
  pause(): boolean {
    if (this.session.phase !== "playing") return false;
    this.session.phase = "paused";
    this.session.updatedAt = Date.now();
    return true;
  }

  /** Resume from pause. */
  resume(): boolean {
    if (this.session.phase !== "paused") return false;
    this.session.phase = "playing";
    this.session.updatedAt = Date.now();
    return true;
  }

  /** End the session. */
  endSession(): boolean {
    this.session.phase = "ended";
    this.session.updatedAt = Date.now();
    this.autoSave();
    return true;
  }

  // -----------------------------------------------------------------------
  // Core game loop: process player action
  // -----------------------------------------------------------------------

  /**
   * Process a player's action and return the full turn result.
   * This is the main entry point for gameplay.
   */
  async processAction(playerInput: string): Promise<TurnResult> {
    if (this.session.phase !== "playing") {
      return this.errorResult("Game is not in playing state.");
    }

    this.session.turnCount++;
    const turnNumber = this.session.turnCount;
    const diceRolls: DiceRollRecord[] = [];

    // 1. Parse intent
    const intent = this.parseIntent(playerInput);

    // 2. Determine turn type
    const turnType = this.determineTurnType(intent);

    // 3. Initialize state changes
    const stateChanges: StateChange = {
      locationChanged: false,
      combatStarted: false,
      combatEnded: false,
      hpChanged: new Map(),
      itemsGained: [],
      itemsLost: [],
      xpGained: 0,
      goldGained: 0,
      goldLost: 0,
      questsUpdated: [],
      newQuests: [],
      conditionsChanged: [],
      npcsMet: [],
      timeAdvanced: false,
      weatherChanged: false,
    };

    // 4. Process based on intent type
    let narration = "";
    let combatUpdate: TurnResult["combatUpdate"] = null;

    try {
      switch (intent.type) {
        case "move":
          ({ narration, stateChanges } = await this.processMove(intent, stateChanges, diceRolls));
          break;

        case "attack":
          ({ narration, stateChanges, combatUpdate } = await this.processAttack(intent, stateChanges, diceRolls));
          break;

        case "talk":
          ({ narration, stateChanges } = await this.processTalk(intent, stateChanges, diceRolls));
          break;

        case "investigate":
          ({ narration, stateChanges } = await this.processInvestigate(intent, stateChanges, diceRolls));
          break;

        case "use-item":
          ({ narration, stateChanges } = await this.processUseItem(intent, stateChanges, diceRolls));
          break;

        case "rest":
          ({ narration, stateChanges } = await this.processRest(intent, stateChanges, diceRolls));
          break;

        case "interact":
          ({ narration, stateChanges } = await this.processInteract(intent, stateChanges, diceRolls));
          break;

        case "flee":
          ({ narration, stateChanges, combatUpdate } = await this.processFlee(intent, stateChanges, diceRolls));
          break;

        case "check-inventory":
          narration = this.buildInventoryNarration();
          break;

        case "check-quest":
          narration = this.buildQuestNarration();
          break;

        case "trade":
          ({ narration, stateChanges } = await this.processTrade(intent, stateChanges, diceRolls));
          break;

        case "wait":
          narration = "You wait, taking in your surroundings.";
          this.world.advanceTime(0, 30);
          stateChanges.timeAdvanced = true;
          break;

        default:
          ({ narration, stateChanges } = await this.processCustomAction(intent, stateChanges, diceRolls));
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      return this.errorResult(message, turnNumber, turnType);
    }

    // 5. Advance time for most actions
    if (intent.type !== "check-inventory" && intent.type !== "check-quest") {
      if (!stateChanges.timeAdvanced) {
        this.world.advanceTime(0, 10); // 10 minutes per turn
        stateChanges.timeAdvanced = true;
      }
    }

    // 6. Check for combat end
    if (this.session.activeEncounterId) {
      const combatStatus = this.combat.isCombatOver(this.session.activeEncounterId);
      if (combatStatus.over) {
        stateChanges.combatEnded = true;
        this.session.activeEncounterId = null;
        combatUpdate = {
          encounterId: this.session.activeEncounterId,
          log: [],
          isOver: true,
          winner: combatStatus.winner,
        };
      }
    }

    // 7. Check location events
    const events = this.world.checkLocationEvents(this.session.currentLocation, "random");
    if (events.length > 0) {
      narration += " " + events.map((e) => e.description).join(" ");
    }

    // 8. Check for new available quests
    const newQuests = this.quests.getAvailable().filter(
      (q) => !this.session.history.some((h) => h.result.newQuests.some((nq) => nq.id === q.id))
    );

    // 9. Build available actions
    const availableActions = this.getAvailableActions();

    // 10. Build result
    const result: TurnResult = {
      turnNumber,
      turnType,
      narration,
      stateChanges,
      diceRolls,
      combatUpdate,
      newQuests,
      availableActions,
    };

    // 11. Record in history
    this.session.history.push({
      turn: turnNumber,
      timestamp: Date.now(),
      playerInput,
      intent,
      result,
    });

    this.session.updatedAt = Date.now();

    // Auto-save periodically
    if (turnNumber % 5 === 0) {
      this.autoSave();
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Intent parsing
  // -----------------------------------------------------------------------

  private parseIntent(input: string): PlayerIntent {
    const lower = input.toLowerCase().trim();

    // Check for direction-only input
    const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
    for (const dir of directions) {
      if (lower === dir || lower === `go ${dir}` || lower === `go ${dir}ern`) {
        return { type: "move", raw: input, direction: dir };
      }
    }

    // Keyword-based classification
    if (this.matchesKeywords(lower, ATTACK_KEYWORDS)) {
      return { type: "attack", raw: input, target: this.extractTarget(lower) };
    }
    if (this.matchesKeywords(lower, TALK_KEYWORDS)) {
      return { type: "talk", raw: input, target: this.extractTarget(lower) };
    }
    if (this.matchesKeywords(lower, MOVE_KEYWORDS)) {
      return { type: "move", raw: input, direction: this.extractDirection(lower) };
    }
    if (this.matchesKeywords(lower, INVESTIGATE_KEYWORDS)) {
      return { type: "investigate", raw: input, target: this.extractTarget(lower) };
    }
    if (this.matchesKeywords(lower, USE_ITEM_KEYWORDS)) {
      return { type: "use-item", raw: input, item: this.extractItem(lower) };
    }
    if (this.matchesKeywords(lower, REST_KEYWORDS)) {
      return { type: "rest", raw: input, details: lower.includes("long") ? "long" : "short" };
    }
    if (this.matchesKeywords(lower, INVENTORY_KEYWORDS)) {
      return { type: "check-inventory", raw: input };
    }
    if (this.matchesKeywords(lower, QUEST_KEYWORDS)) {
      return { type: "check-quest", raw: input };
    }
    if (this.matchesKeywords(lower, INTERACT_KEYWORDS)) {
      return { type: "interact", raw: input, target: this.extractTarget(lower) };
    }
    if (this.matchesKeywords(lower, FLEE_KEYWORDS)) {
      return { type: "flee", raw: input };
    }
    if (this.matchesKeywords(lower, TRADE_KEYWORDS)) {
      return { type: "trade", raw: input, target: this.extractTarget(lower) };
    }

    return { type: "custom", raw: input, details: input };
  }

  private matchesKeywords(input: string, keywords: string[]): boolean {
    return keywords.some((kw) => input.includes(kw));
  }

  private extractDirection(input: string): string | undefined {
    const directions = ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"];
    for (const dir of directions) {
      if (input.includes(dir)) return dir;
    }
    return undefined;
  }

  private extractTarget(input: string): string | undefined {
    // Simple extraction: return the last meaningful word group
    const words = input.split(/\s+/);
    if (words.length > 1) {
      return words.slice(-2).join(" ");
    }
    return undefined;
  }

  private extractItem(input: string): string | undefined {
    const useWords = ["use", "drink", "eat", "apply", "consume", "activate"];
    const words = input.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (useWords.includes(words[i]) && i + 1 < words.length) {
        return words.slice(i + 1).join(" ");
      }
    }
    return undefined;
  }

  private determineTurnType(intent: PlayerIntent): TurnType {
    switch (intent.type) {
      case "attack": return "combat";
      case "talk": return "social";
      case "rest": return "rest";
      default: return "exploration";
    }
  }

  // -----------------------------------------------------------------------
  // Action processors
  // -----------------------------------------------------------------------

  private async processMove(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    const direction = intent.direction;
    if (!direction) {
      return { narration: "Which direction would you like to go?", stateChanges: state };
    }

    const travelResult = this.world.travel(this.session.currentLocation, direction);

    if (!travelResult.success || !travelResult.destination) {
      return { narration: travelResult.description, stateChanges: state };
    }

    state.locationChanged = true;
    state.newLocationId = travelResult.destination.id;
    this.session.currentLocation = travelResult.destination.id;

    // Record NPCs at new location as met
    for (const npcId of travelResult.destination.npcs) {
      state.npcsMet.push(npcId);
    }

    let narration = travelResult.description;

    // Handle random encounter
    if (travelResult.encounter) {
      narration += `\n\n${travelResult.encounter.description}`;
      state.combatStarted = true;

      // Start combat encounter with simple monsters
      const monsterCombatant: Omit<Combatant, "initiative" | "isAlive" | "deathSaves" | "concentrating"> = {
        id: `monster_${Date.now().toString(36)}`,
        name: travelResult.encounter.name,
        type: "monster",
        hp: 20 + travelResult.encounter.dangerLevel * 10,
        maxHp: 20 + travelResult.encounter.dangerLevel * 10,
        temporaryHp: 0,
        ac: 10 + travelResult.encounter.dangerLevel,
        dexterityScore: 12,
        conditions: [],
        actions: [{
          name: "Attack",
          description: "A physical attack.",
          attackBonus: travelResult.encounter.dangerLevel + 3,
          damageDice: `1d${4 + travelResult.encounter.dangerLevel * 2}`,
          damageType: "slashing",
          damageBonus: travelResult.encounter.dangerLevel,
          range: 5,
          isSavingThrow: false,
          saveAbility: "",
          saveDC: 0,
        }],
        ref: travelResult.encounter.name,
        initiativeBonus: 0,
      };

      const encounter = this.combat.startEncounter([monsterCombatant]);
      this.session.activeEncounterId = encounter.id;
      this.activeEncounter = encounter;
    }

    return { narration, stateChanges: state };
  }

  private async processAttack(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange; combatUpdate: TurnResult["combatUpdate"] }> {
    if (!this.session.activeEncounterId) {
      return {
        narration: "There is nothing to attack right now. You are not in combat.",
        stateChanges: state,
        combatUpdate: null,
      };
    }

    const encounter = this.combat;
    const encounterId = this.session.activeEncounterId;
    const current = encounter.getCurrentCombatant(encounterId);

    // If it's not the player's turn, handle enemy turns first
    if (current && current.type !== "player") {
      // Process enemy turn (simplified auto-attack)
      const players = encounter.getAliveCombatants(encounterId).filter((c) => c.type === "player");
      if (players.length > 0) {
        const target = players[Math.floor(Math.random() * players.length)];
        const result = encounter.attack(encounterId, current.id, target.id);
        const rollRecord: DiceRollRecord = { roll: { total: result.attackTotal, rolls: [result.attackRoll], dropped: [], notation: "1d20", advantage: false, disadvantage: false, criticalHit: result.critical, criticalMiss: false, modifier: 0 }, context: `${current.name} attacks ${target.name}`, turn: this.session.turnCount };
        diceRolls.push(rollRecord);

        if (result.damage > 0) {
          state.hpChanged.set(target.id, { before: target.hp + result.damage, after: target.hp });
        }
      }
      encounter.nextTurn(encounterId);
    }

    // Player attacks target
    const aliveEnemies = encounter.getAliveCombatants(encounterId).filter((c) => c.type !== "player");
    const target = aliveEnemies[0]; // Simplified: attack first available enemy

    if (!target) {
      return {
        narration: "There are no enemies to attack.",
        stateChanges: state,
        combatUpdate: null,
      };
    }

    const activeCharId = this.session.characters[0];
    const character = this.characters.getCharacter(activeCharId);
    const attackBonus = character ? getModifier(character.abilityScores.strength) + character.proficiencyBonus : 5;
    const weaponDice = "1d8";
    const damageMod = character ? getModifier(character.abilityScores.strength) : 3;

    const attackRoll = this.dice.roll("1d20");
    diceRolls.push({ roll: attackRoll, context: `Attack roll vs ${target.name}`, turn: this.session.turnCount });

    const hit = attackRoll.total + attackBonus >= target.ac;
    const critical = attackRoll.total === 20;
    let damage = 0;

    if (hit) {
      const damageRoll = this.dice.roll(critical ? `2${weaponDice}` : `1${weaponDice}`);
      diceRolls.push({ roll: damageRoll, context: `Damage roll (${critical ? "critical" : "normal"})`, turn: this.session.turnCount });
      damage = damageRoll.total + damageMod;
      encounter.applyDamage(encounterId, target.id, damage);
    }

    const combatStatus = this.combat.isCombatOver(encounterId);
    let narration: string;
    if (hit) {
      narration = critical
        ? `Critical hit! You strike ${target.name} with devastating force for ${damage} damage!`
        : `Your attack hits ${target.name} for ${damage} damage.`;
    } else {
      narration = `Your attack misses ${target.name}. (Rolled ${attackRoll.total + attackBonus} vs AC ${target.ac})`;
    }

    if (combatStatus.over) {
      narration += " All enemies have been defeated!";
      state.combatEnded = true;
      state.xpGained = 50; // Simplified XP reward
      this.session.activeEncounterId = null;
    }

    encounter.nextTurn(encounterId);

    const combatUpdate: TurnResult["combatUpdate"] = {
      encounterId,
      log: encounter.getCombatLog(encounterId).slice(-3),
      isOver: combatStatus.over,
      winner: combatStatus.winner,
    };

    return { narration, stateChanges: state, combatUpdate };
  }

  private async processTalk(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    const location = this.world.getLocation(this.session.currentLocation);
    if (!location) {
      return { narration: "You are nowhere. There is no one to talk to.", stateChanges: state };
    }

    const npcsHere = location.npcs;
    if (npcsHere.length === 0) {
      return { narration: "There is no one here to talk to.", stateChanges: state };
    }

    // Find the target NPC or default to the first one
    let targetNpcId = npcsHere[0];
    if (intent.target) {
      const found = npcsHere.find((id) => {
        const npc = this.npcs.getNPC(id);
        return npc && npc.name.toLowerCase().includes(intent.target!.toLowerCase());
      });
      if (found) targetNpcId = found;
    }

    const npc = this.npcs.getNPC(targetNpcId);
    if (!npc) {
      return { narration: "That person doesn't seem to be here.", stateChanges: state };
    }

    // Roll a charisma check
    const activeCharId = this.session.characters[0];
    const character = this.characters.getCharacter(activeCharId);
    let checkResult = 0;
    if (character) {
      const check = this.characters.skillCheck(activeCharId, "persuasion");
      checkResult = check.total;
      diceRolls.push({ roll: { total: check.total, rolls: [check.roll], dropped: [], notation: "1d20", advantage: false, disadvantage: false, criticalHit: false, criticalMiss: false, modifier: check.modifier }, context: `Persuasion check with ${npc.name}`, turn: this.session.turnCount });
    }

    // Determine outcome based on check
    const isPositive = checkResult >= 12;
    const outcome = isPositive ? "positive" : checkResult >= 8 ? "neutral" : "negative";

    const interaction = this.npcs.interact(npc.id, activeCharId, intent.raw, outcome);

    // Get NPC knowledge to share
    const knowledge = npc.knowledge.length > 0
      ? npc.knowledge[Math.floor(Math.random() * npc.knowledge.length)]
      : "nothing in particular";

    const disposition = npc.relationships.get(activeCharId)?.disposition ?? "neutral";

    let narration: string;
    if (isPositive) {
      narration = `${npc.name} listens attentively. "${this.generatePositiveResponse(npc, knowledge)}" They seem ${disposition} toward you.`;
    } else if (checkResult >= 8) {
      narration = `${npc.name} considers your words. "${this.generateNeutralResponse(npc, knowledge)}"`;
    } else {
      narration = `${npc.name} doesn't seem receptive. "${this.generateNegativeResponse(npc)}"`;
    }

    state.npcsMet.push(npc.id);

    return { narration, stateChanges: state };
  }

  private async processInvestigate(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    const location = this.world.getLocation(this.session.currentLocation);
    if (!location) {
      return { narration: "There is nothing to investigate.", stateChanges: state };
    }

    // Roll perception check
    const activeCharId = this.session.characters[0];
    let checkResult = 10;
    if (activeCharId) {
      const check = this.characters.skillCheck(activeCharId, "perception");
      checkResult = check.total;
      diceRolls.push({ roll: { total: check.total, rolls: [check.roll], dropped: [], notation: "1d20", advantage: false, disadvantage: false, criticalHit: false, criticalMiss: false, modifier: check.modifier }, context: "Perception check", turn: this.session.turnCount });
    }

    const description = this.world.getLocationDescription(this.session.currentLocation);

    let narration: string;
    if (checkResult >= 18) {
      narration = `You examine the area carefully and notice fine details others might miss. ${description} You spot something hidden!`;
      state.itemsGained.push("hidden_trinket");
    } else if (checkResult >= 12) {
      narration = `You take a thorough look around. ${description} Everything seems as it appears.`;
    } else {
      narration = `You glance around but don't notice anything remarkable. ${location.description}`;
    }

    return { narration, stateChanges: state };
  }

  private async processUseItem(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    if (!intent.item) {
      return { narration: "What item would you like to use?", stateChanges: state };
    }

    return { narration: `You reach for your ${intent.item}... (item system integration pending)`, stateChanges: state };
  }

  private async processRest(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    const isLongRest = intent.details === "long";
    const activeCharId = this.session.characters[0];
    const character = this.characters.getCharacter(activeCharId);

    if (isLongRest) {
      if (character) {
        this.characters.longRest(activeCharId);
      }
      this.world.advanceTime(8);
      state.timeAdvanced = true;

      return {
        narration: "You settle in for a long rest. After 8 hours of sleep, you wake feeling refreshed and fully restored. Your wounds have healed and your mind is clear.",
        stateChanges: state,
      };
    } else {
      let shortRestNarration = "You take a short rest.";
      if (character) {
        const healed = this.characters.shortRest(activeCharId, 1);
        shortRestNarration = `You take a short rest, spending a hit die to recover ${healed} HP. You feel somewhat better, but could use more rest.`;
      }
      this.world.advanceTime(1);
      state.timeAdvanced = true;

      return {
        narration: shortRestNarration,
        stateChanges: state,
      };
    }
  }

  private async processInteract(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    return {
      narration: `You interact with the environment: ${intent.raw}. The world responds to your action.`,
      stateChanges: state,
    };
  }

  private async processFlee(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateState; combatUpdate: TurnResult["combatUpdate"] }> {
    if (!this.session.activeEncounterId) {
      return {
        narration: "There is nothing to flee from.",
        stateChanges: state,
        combatUpdate: null,
      };
    }

    // Roll for escape
    const escapeRoll = this.dice.roll("1d20");
    diceRolls.push({ roll: escapeRoll, context: "Escape attempt", turn: this.session.turnCount });

    if (escapeRoll.total >= 10) {
      this.combat.endEncounter(this.session.activeEncounterId);
      const encounterId = this.session.activeEncounterId;
      this.session.activeEncounterId = null;
      state.combatEnded = true;

      return {
        narration: "You successfully disengage and flee from combat!",
        stateChanges: state,
        combatUpdate: { encounterId, log: [], isOver: true, winner: "none" },
      };
    }

    return {
      narration: "You try to flee but cannot escape! The enemy blocks your path.",
      stateChanges: state,
      combatUpdate: null,
    };
  }

  private async processTrade(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    return {
      narration: "You look for a merchant to trade with... (trade system integration pending)",
      stateChanges: state,
    };
  }

  private async processCustomAction(intent: PlayerIntent, state: StateChange, diceRolls: DiceRollRecord[]): Promise<{ narration: string; stateChanges: StateChange }> {
    // For any unstructured player input, generate a generic response
    const location = this.world.getLocation(this.session.currentLocation);
    const timeOfDay = this.world.getTimeOfDay();

    return {
      narration: `You ${intent.raw}. ${location ? location.description : "The world responds to your action."}`,
      stateChanges: state,
    };
  }

  // -----------------------------------------------------------------------
  // Narration helpers
  // -----------------------------------------------------------------------

  private generatePositiveResponse(npc: NPC, knowledge: string): string {
    const responses = [
      `I'm glad you asked. What I know about ${knowledge} might interest you.`,
      `You seem trustworthy. Let me tell you about ${knowledge}.`,
      `I've been waiting for someone like you. Regarding ${knowledge}...`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateNeutralResponse(npc: NPC, knowledge: string): string {
    const responses = [
      `I suppose I can share what I know about ${knowledge}.`,
      `Hmm, ${knowledge} you say? I know a little about that.`,
      `I don't have much to say, but ${knowledge} is worth knowing.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateNegativeResponse(npc: NPC): string {
    const responses = [
      "I don't have time for this.",
      "Why should I tell you anything?",
      "Mind your own business.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private buildInventoryNarration(): string {
    const activeCharId = this.session.characters[0];
    const character = this.characters.getCharacter(activeCharId);
    if (!character) return "You have no character sheet to check.";

    return [
      `--- ${character.name}'s Inventory ---`,
      `HP: ${character.hp}/${character.maxHp} | AC: ${character.ac} | Gold: ${character.gold}`,
      `Equipment: ${character.equipment.length > 0 ? character.equipment.join(", ") : "None"}`,
      `Level ${character.level} ${character.race} ${character.class}`,
      `STR: ${character.abilityScores.strength} | DEX: ${character.abilityScores.dexterity} | CON: ${character.abilityScores.constitution}`,
      `INT: ${character.abilityScores.intelligence} | WIS: ${character.abilityScores.wisdom} | CHA: ${character.abilityScores.charisma}`,
    ].join("\n");
  }

  private buildQuestNarration(): string {
    const activeQuests = this.quests.getActive();
    const availableQuests = this.quests.getAvailable();

    const lines: string[] = ["--- Quest Journal ---"];

    if (activeQuests.length === 0 && availableQuests.length === 0) {
      lines.push("No quests currently tracked.");
    }

    if (activeQuests.length > 0) {
      lines.push("\nActive Quests:");
      for (const quest of activeQuests) {
        const progress = this.quests.getProgress(quest.id);
        lines.push(`  * ${quest.title} (${progress}%)`);
        const objectives = this.quests.getVisibleObjectives(quest.id);
        for (const obj of objectives) {
          const status = obj.completed ? "[X]" : "[ ]";
          const count = obj.targetCount ? ` (${obj.currentCount ?? 0}/${obj.targetCount})` : "";
          lines.push(`    ${status} ${obj.description}${count}`);
        }
      }
    }

    if (availableQuests.length > 0) {
      lines.push("\nAvailable Quests:");
      for (const quest of availableQuests) {
        lines.push(`  ? ${quest.title}: ${quest.description}`);
      }
    }

    return lines.join("\n");
  }

  private getAvailableActions(): string[] {
    const actions: string[] = [];
    const location = this.world.getLocation(this.session.currentLocation);

    if (this.session.activeEncounterId) {
      actions.push("Attack an enemy", "Flee from combat", "Use an item");

      const encounter = this.combat;
      const combatStatus = encounter.isCombatOver(this.session.activeEncounterId);
      if (!combatStatus.over) {
        actions.push("Cast a spell");
      }
    } else {
      actions.push("Look around", "Investigate", "Check inventory", "Check quests");

      if (location) {
        // Movement options
        const connections = this.world.getConnectedLocations(location.id);
        for (const conn of connections) {
          actions.push(`Go ${conn.direction} to ${conn.location.name}`);
        }

        // NPC interactions
        if (location.npcs.length > 0) {
          actions.push("Talk to someone nearby");
        }

        // Rest options
        if (location.type === "tavern" || location.type === "town" || location.type === "inn") {
          actions.push("Take a short rest", "Take a long rest");
        }
      }
    }

    return actions;
  }

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  private errorResult(message: string, turnNumber?: number, turnType?: TurnType): TurnResult {
    return {
      turnNumber: turnNumber ?? this.session.turnCount,
      turnType: turnType ?? "exploration",
      narration: message,
      stateChanges: {
        locationChanged: false,
        combatStarted: false,
        combatEnded: false,
        hpChanged: new Map(),
        itemsGained: [],
        itemsLost: [],
        xpGained: 0,
        goldGained: 0,
        goldLost: 0,
        questsUpdated: [],
        newQuests: [],
        conditionsChanged: [],
        npcsMet: [],
        timeAdvanced: false,
        weatherChanged: false,
      },
      diceRolls: [],
      combatUpdate: null,
      newQuests: [],
      availableActions: [],
      error: message,
    };
  }

  // -----------------------------------------------------------------------
  // State access
  // -----------------------------------------------------------------------

  /** Get the current game session state. */
  getState(): GameSession {
    return { ...this.session, history: [...this.session.history] };
  }

  /** Get the current game phase. */
  getPhase(): GamePhase {
    return this.session.phase;
  }

  /** Get the current location. */
  getCurrentLocation(): Location | undefined {
    return this.world.getLocation(this.session.currentLocation);
  }

  /** Get the current turn count. */
  getTurnCount(): number {
    return this.session.turnCount;
  }

  /** Get subsystem references for direct access. */
  getWorld(): World { return this.world; }
  getCombatManager(): CombatManager { return this.combat; }
  getDiceRoller(): DiceRoller { return this.dice; }
  getCharacterManager(): CharacterManager { return this.characters; }
  getNPCManager(): NPCManager { return this.npcs; }
  getQuestManager(): QuestManager { return this.quests; }

  /** Get the full history log. */
  getHistory(): HistoryEntry[] {
    return [...this.session.history];
  }

  /** Get a specific turn from history. */
  getTurn(turnNumber: number): HistoryEntry | undefined {
    return this.session.history.find((h) => h.turn === turnNumber);
  }

  /** Get the last N turns from history. */
  getRecentHistory(count: number): HistoryEntry[] {
    return this.session.history.slice(-count);
  }

  // -----------------------------------------------------------------------
  // Save / Load
  // -----------------------------------------------------------------------

  /** Save the session to KV storage. */
  save(sessionId?: string): void {
    const id = sessionId ?? this.session.id;
    this.savedSessions.set(id, this.serialize());
    this.session.updatedAt = Date.now();
  }

  /** Load a session from KV storage. */
  load(sessionId: string): boolean {
    const data = this.savedSessions.get(sessionId);
    if (!data) return false;

    this.deserialize(data);
    return true;
  }

  /** Auto-save the current session. */
  private autoSave(): void {
    this.save();
  }

  /** List all saved session IDs. */
  listSavedSessions(): string[] {
    return [...this.savedSessions.keys()];
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      session: this.session,
      worldData: this.world.serialize(),
      combatData: this.combat.serialize(),
      characterData: this.characters.serialize(),
      npcData: this.npcs.serialize(),
      questData: this.quests.serialize(),
      diceData: this.dice.serialize(),
      nextSessionId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);

    this.session = parsed.session;
    this.world.deserialize(parsed.worldData);
    this.combat.deserialize(parsed.combatData);
    this.characters.deserialize(parsed.characterData);
    this.npcs.deserialize(parsed.npcData);
    this.quests.deserialize(parsed.questData);
    this.dice.deserialize(parsed.diceData);
    nextSessionId = parsed.nextSessionId ?? nextSessionId;
  }
}
