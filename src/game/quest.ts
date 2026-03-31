/**
 * Quest tracking system — D&D 5e inspired.
 *
 * Quest creation with multiple objectives, optional objectives for bonus
 * rewards, quest chains with prerequisites, dynamic quest generation,
 * hidden objectives, and reward tracking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestStatus = "available" | "active" | "complete" | "failed" | "expired";

export type QuestType = "main" | "side" | "fetch" | "kill" | "escort" | "explore" | "puzzle" | "social";

export interface QuestReward {
  experience: number;
  gold: number;
  items: string[];          // item IDs
  unlockQuests: string[];   // quest IDs that become available on completion
  reputation?: { faction: string; change: number };
}

export interface Objective {
  id: string;
  description: string;
  completed: boolean;
  optional: boolean;
  hidden: boolean;         // not shown until discovered
  discovered: boolean;     // whether a hidden objective has been revealed
  targetCount?: number;    // e.g., "kill 5 goblins"
  currentCount?: number;   // progress toward target
  targetLocation?: string; // location ID for travel objectives
  targetNPC?: string;      // NPC ID for social objectives
  targetItem?: string;     // item ID for fetch objectives
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  objectives: Objective[];
  rewards: QuestReward;
  bonusRewards?: QuestReward;   // for completing all optional objectives
  dependencies: string[];       // quest IDs that must be completed first
  giver: string;                // NPC ID
  location: string;             // location ID where quest was given
  assignedTo: string[];         // character IDs
  timeLimit?: number;           // turns until quest expires
  turnsElapsed: number;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuestChain {
  id: string;
  name: string;
  description: string;
  quests: string[];             // quest IDs in order
  finalReward?: QuestReward;    // bonus for completing entire chain
}

// ---------------------------------------------------------------------------
// Quest Manager
// ---------------------------------------------------------------------------

let nextQuestId = 1;

export class QuestManager {
  private quests: Map<string, Quest> = new Map();
  private chains: Map<string, QuestChain> = new Map();

  // -----------------------------------------------------------------------
  // Creation
  // -----------------------------------------------------------------------

  /**
   * Create a new quest.
   */
  create(opts: {
    title: string;
    description: string;
    type: QuestType;
    objectives: Omit<Objective, "id" | "completed" | "discovered" | "currentCount">[];
    rewards: QuestReward;
    bonusRewards?: QuestReward;
    dependencies?: string[];
    giver: string;
    location: string;
    assignedTo?: string[];
    timeLimit?: number;
  }): Quest {
    const now = Date.now();
    const quest: Quest = {
      id: `quest_${nextQuestId++}_${now.toString(36)}`,
      title: opts.title,
      description: opts.description,
      type: opts.type,
      status: "available",
      objectives: opts.objectives.map((o, i) => ({
        ...o,
        id: `obj_${i + 1}_${now.toString(36)}`,
        completed: false,
        discovered: !o.hidden,
        currentCount: 0,
      })),
      rewards: opts.rewards,
      bonusRewards: opts.bonusRewards,
      dependencies: opts.dependencies ?? [],
      giver: opts.giver,
      location: opts.location,
      assignedTo: opts.assignedTo ?? [],
      timeLimit: opts.timeLimit,
      turnsElapsed: 0,
      notes: "",
      createdAt: now,
      updatedAt: now,
    };

    this.quests.set(quest.id, quest);
    return quest;
  }

  /**
   * Create a quest chain — a sequence of linked quests.
   * Each quest in the chain has the previous quest as a dependency.
   */
  createChain(opts: {
    name: string;
    description: string;
    quests: Omit<Quest, "id" | "createdAt" | "updatedAt" | "turnsElapsed" | "notes">[];
    finalReward?: QuestReward;
  }): QuestChain {
    const now = Date.now();
    const questIds: string[] = [];

    for (let i = 0; i < opts.quests.length; i++) {
      const q = opts.quests[i];
      const dependencies = i > 0 ? [questIds[i - 1]] : [];

      const quest: Quest = {
        ...q,
        id: `quest_${nextQuestId++}_${now.toString(36)}`,
        objectives: q.objectives.map((o, j) => ({
          ...o,
          id: `obj_${j + 1}_${now.toString(36)}`,
          completed: false,
          discovered: !o.hidden,
          currentCount: 0,
        })),
        dependencies,
        turnsElapsed: 0,
        notes: "",
        createdAt: now,
        updatedAt: now,
      };

      this.quests.set(quest.id, quest);
      questIds.push(quest.id);
    }

    const chain: QuestChain = {
      id: `chain_${Date.now().toString(36)}`,
      name: opts.name,
      description: opts.description,
      quests: questIds,
      finalReward: opts.finalReward,
    };

    this.chains.set(chain.id, chain);
    return chain;
  }

  // -----------------------------------------------------------------------
  // Quest lifecycle
  // -----------------------------------------------------------------------

  /** Accept a quest (move from available to active). */
  accept(questId: string, characterIds: string[]): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== "available") return false;

    // Check dependencies
    for (const depId of quest.dependencies) {
      const dep = this.quests.get(depId);
      if (!dep || dep.status !== "complete") return false;
    }

    quest.status = "active";
    quest.assignedTo = characterIds;
    quest.updatedAt = Date.now();
    return true;
  }

  /** Update an objective's progress. */
  updateObjective(questId: string, objectiveId: string, progress: {
    completed?: boolean;
    incrementCount?: number;
  }): { objectiveCompleted: boolean; questCompleted: boolean; allOptionalCompleted: boolean } | null {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== "active") return null;

    const objective = quest.objectives.find((o) => o.id === objectiveId);
    if (!objective) return null;

    if (progress.completed !== undefined) {
      objective.completed = progress.completed;
    }

    if (progress.incrementCount !== undefined && objective.targetCount) {
      objective.currentCount = Math.min(
        (objective.currentCount ?? 0) + progress.incrementCount,
        objective.targetCount
      );
      if (objective.currentCount >= objective.targetCount) {
        objective.completed = true;
      }
    }

    quest.updatedAt = Date.now();

    const requiredCompleted = quest.objectives
      .filter((o) => !o.optional)
      .every((o) => o.completed);

    const allOptionalCompleted = quest.objectives
      .every((o) => o.completed);

    if (requiredCompleted) {
      this.complete(questId, allOptionalCompleted);
    }

    return {
      objectiveCompleted: objective.completed,
      questCompleted: requiredCompleted,
      allOptionalCompleted,
    };
  }

  /** Discover a hidden objective. */
  discoverObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;

    const objective = quest.objectives.find((o) => o.id === objectiveId);
    if (!objective || !objective.hidden) return false;

    objective.discovered = true;
    quest.updatedAt = Date.now();
    return true;
  }

  /** Complete a quest and distribute rewards. */
  complete(questId: string, includeBonus = false): QuestReward | null {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== "active") return null;

    quest.status = "complete";
    quest.updatedAt = Date.now();

    let rewards = { ...quest.rewards };

    if (includeBonus && quest.bonusRewards) {
      rewards = {
        experience: rewards.experience + quest.bonusRewards.experience,
        gold: rewards.gold + quest.bonusRewards.gold,
        items: [...rewards.items, ...quest.bonusRewards.items],
        unlockQuests: [...rewards.unlockQuests, ...quest.bonusRewards.unlockQuests],
      };
    }

    // Unlock dependent quests
    for (const questId of rewards.unlockQuests) {
      const dependent = this.quests.get(questId);
      if (dependent && dependent.status === "available") {
        // Dependencies are already set; just marking it as properly available
      }
    }

    // Check if this completes a chain
    this.checkChainCompletion(questId);

    return rewards;
  }

  /** Fail a quest. */
  fail(questId: string, reason: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;

    quest.status = "failed";
    quest.notes += `\nFailed: ${reason}`;
    quest.updatedAt = Date.now();
    return true;
  }

  /** Advance the turn counter for timed quests. */
  advanceTurn(questId: string): { expired: boolean } {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== "active" || !quest.timeLimit) {
      return { expired: false };
    }

    quest.turnsElapsed++;
    quest.updatedAt = Date.now();

    if (quest.turnsElapsed >= quest.timeLimit) {
      quest.status = "expired";
      quest.notes += "\nQuest expired due to time limit.";
      return { expired: true };
    }

    return { expired: false };
  }

  // -----------------------------------------------------------------------
  // Dynamic quest generation
  // -----------------------------------------------------------------------

  /**
   * Generate a quest dynamically based on context.
   */
  generateDynamic(opts: {
    type: QuestType;
    location: string;
    giver: string;
    playerLevel: number;
    characterIds: string[];
  }): Quest {
    const templates: Record<QuestType, { title: string; description: string; objectives: Omit<Objective, "id" | "completed" | "discovered" | "currentCount">[]; baseXP: number; baseGold: number }> = {
      fetch: {
        title: "Gathering Supplies",
        description: "A local needs help acquiring rare supplies.",
        objectives: [
          { description: "Find the required item", optional: false, hidden: false, targetCount: 1, targetItem: "special_ingredient" },
          { description: "Return the item to the giver", optional: false, hidden: false },
          { description: "Find a bonus item for extra reward", optional: true, hidden: true, targetCount: 1 },
        ],
        baseXP: 100,
        baseGold: 25,
      },
      kill: {
        title: "Monster Hunt",
        description: "Dangerous creatures threaten the area.",
        objectives: [
          { description: "Defeat the target creatures", optional: false, hidden: false, targetCount: 3 },
          { description: "Find the creature's lair", optional: false, hidden: true },
          { description: "Spare the young creatures", optional: true, hidden: false },
        ],
        baseXP: 150,
        baseGold: 50,
      },
      escort: {
        title: "Safe Passage",
        description: "Someone needs an escort to a distant location.",
        objectives: [
          { description: "Escort the NPC to the destination", optional: false, hidden: false, targetLocation: "destination_town" },
          { description: "Keep the NPC alive", optional: false, hidden: false },
          { description: "Find a shortcut", optional: true, hidden: true },
        ],
        baseXP: 200,
        baseGold: 75,
      },
      explore: {
        title: "Uncharted Territory",
        description: "An unexplored area awaits investigation.",
        objectives: [
          { description: "Explore the unknown area", optional: false, hidden: false, targetLocation: "dungeon_entrance" },
          { description: "Map the area", optional: false, hidden: false },
          { description: "Find hidden treasure", optional: true, hidden: true },
        ],
        baseXP: 175,
        baseGold: 40,
      },
      social: {
        title: "Diplomatic Mission",
        description: "Someone needs help negotiating a delicate situation.",
        objectives: [
          { description: "Speak with the target NPC", optional: false, hidden: false, targetNPC: "target_npc" },
          { description: "Convince them to help", optional: false, hidden: false },
          { description: "Discover their secret motivation", optional: true, hidden: true },
        ],
        baseXP: 125,
        baseGold: 30,
      },
      puzzle: {
        title: "Ancient Mystery",
        description: "An ancient puzzle stands between you and your goal.",
        objectives: [
          { description: "Investigate the puzzle", optional: false, hidden: false },
          { description: "Solve the puzzle", optional: false, hidden: false },
          { description: "Find the hidden compartment", optional: true, hidden: true },
        ],
        baseXP: 200,
        baseGold: 60,
      },
      main: {
        title: "The Main Quest",
        description: "A critical mission that advances the story.",
        objectives: [
          { description: "Investigate the threat", optional: false, hidden: false },
          { description: "Confront the source", optional: false, hidden: false },
          { description: "Report back", optional: false, hidden: false },
        ],
        baseXP: 300,
        baseGold: 100,
      },
      side: {
        title: "Side Adventure",
        description: "An interesting diversion from the main path.",
        objectives: [
          { description: "Investigate the situation", optional: false, hidden: false },
          { description: "Resolve the problem", optional: false, hidden: false },
        ],
        baseXP: 75,
        baseGold: 20,
      },
    };

    const template = templates[opts.type];
    const levelMultiplier = 1 + (opts.playerLevel - 1) * 0.15;

    return this.create({
      title: template.title,
      description: template.description,
      type: opts.type,
      objectives: template.objectives,
      rewards: {
        experience: Math.floor(template.baseXP * levelMultiplier),
        gold: Math.floor(template.baseGold * levelMultiplier),
        items: [],
        unlockQuests: [],
      },
      giver: opts.giver,
      location: opts.location,
      assignedTo: opts.characterIds,
    });
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get all active quests. */
  getActive(): Quest[] {
    return [...this.quests.values()].filter((q) => q.status === "active");
  }

  /** Get all available quests (dependencies met). */
  getAvailable(): Quest[] {
    return [...this.quests.values()].filter((q) => {
      if (q.status !== "available") return false;
      return q.dependencies.every((depId) => {
        const dep = this.quests.get(depId);
        return dep && dep.status === "complete";
      });
    });
  }

  /** Get quests assigned to a specific character. */
  getByCharacter(characterId: string): Quest[] {
    return [...this.quests.values()].filter(
      (q) => q.assignedTo.includes(characterId) && q.status === "active"
    );
  }

  /** Get a quest by ID. */
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /** Get visible objectives for a quest (hides undiscovered hidden objectives). */
  getVisibleObjectives(questId: string): Objective[] {
    const quest = this.quests.get(questId);
    if (!quest) return [];
    return quest.objectives.filter((o) => !o.hidden || o.discovered);
  }

  /** Get quest progress as a percentage. */
  getProgress(questId: string): number {
    const quest = this.quests.get(questId);
    if (!quest) return 0;

    const required = quest.objectives.filter((o) => !o.optional);
    if (required.length === 0) return 100;

    const completed = required.filter((o) => o.completed).length;
    return Math.round((completed / required.length) * 100);
  }

  /** Get all quest chains. */
  getChains(): QuestChain[] {
    return [...this.chains.values()];
  }

  /** Get chain progress. */
  getChainProgress(chainId: string): { total: number; completed: number; currentQuest: Quest | null } {
    const chain = this.chains.get(chainId);
    if (!chain) return { total: 0, completed: 0, currentQuest: null };

    let completed = 0;
    let currentQuest: Quest | null = null;

    for (const questId of chain.quests) {
      const quest = this.quests.get(questId);
      if (!quest) continue;
      if (quest.status === "complete") {
        completed++;
      } else if (!currentQuest && quest.status !== "failed" && quest.status !== "expired") {
        currentQuest = quest;
      }
    }

    return { total: chain.quests.length, completed, currentQuest };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private checkChainCompletion(questId: string): void {
    for (const chain of this.chains.values()) {
      if (!chain.quests.includes(questId)) continue;

      const allComplete = chain.quests.every((id) => {
        const q = this.quests.get(id);
        return q && q.status === "complete";
      });

      if (allComplete && chain.finalReward) {
        // Chain completed — caller should distribute finalReward
      }
    }
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      quests: Array.from(this.quests.entries()),
      chains: Array.from(this.chains.entries()),
      nextQuestId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.quests = new Map(parsed.quests);
    this.chains = new Map(parsed.chains);
    nextQuestId = parsed.nextQuestId ?? this.quests.size + 1;
  }
}
