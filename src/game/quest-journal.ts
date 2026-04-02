/**
 * src/game/quest-journal.ts
 * DMLog.ai - Quest Tracking and Journal System
 */

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'faction' | 'personal';
  giver: string;
  location: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  journalEntries: JournalEntry[];
  createdAt: number;
  completedAt?: number;
  partyNotes: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'kill' | 'collect' | 'explore' | 'talk' | 'escort' | 'defend' | 'puzzle';
  target: string;
  current: number;
  required: number;
  completed: boolean;
  hidden: boolean;
}

export interface QuestReward {
  xp: number;
  gold: number;
  items: string[];
  title?: string;
  factionRep?: Array<{ faction: string; amount: number }>;
}

export interface JournalEntry {
  date: number;
  text: string;
  author: string;
  tags: string[];
}

export type CreateQuestInput = Omit<Quest, 'id' | 'status' | 'journalEntries' | 'createdAt' | 'completedAt'> & Partial<Pick<Quest, 'id' | 'status'>>;

export class QuestJournal {
  private quests = new Map<string, Quest>();
  private activeQuestId: string | null = null;
  private completedCount = 0;
  private failedCount = 0;

  /**
   * 1. createQuest
   * Creates a new quest and adds it to the journal.
   */
  public createQuest(data: CreateQuestInput): Quest {
    const id = data.id || this.generateId();
    const newQuest: Quest = {
      ...data,
      id,
      status: data.status || 'not-started',
      journalEntries: [],
      createdAt: Date.now(),
    };

    this.quests.set(id, newQuest);
    return newQuest;
  }

  /**
   * 2. getQuest
   * Retrieves a quest by its ID. Throws if not found.
   */
  public getQuest(id: string): Quest {
    const quest = this.quests.get(id);
    if (!quest) {
      throw new Error(`Quest with ID '${id}' not found.`);
    }
    return quest;
  }

  /**
   * 3. updateStatus
   * Updates the status of a quest, handling completion timestamps and counters.
   */
  public updateStatus(id: string, status: Quest['status']): void {
    const quest = this.getQuest(id);
    const oldStatus = quest.status;

    if (oldStatus === status) return;

    // Adjust counters for old status
    if (oldStatus === 'completed') this.completedCount--;
    if (oldStatus === 'failed') this.failedCount--;

    quest.status = status;

    // Adjust counters and timestamps for new status
    if (status === 'completed') {
      quest.completedAt = Date.now();
      this.completedCount++;
    } else if (status === 'failed') {
      quest.completedAt = Date.now();
      this.failedCount++;
    } else {
      quest.completedAt = undefined;
    }
  }

  /**
   * 4. advanceObjective
   * Increments the progress of a specific objective.
   */
  public advanceObjective(questId: string, objId: string, amount: number): void {
    const quest = this.getQuest(questId);
    const objective = quest.objectives.find((o) => o.id === objId);

    if (!objective) {
      throw new Error(`Objective '${objId}' not found in quest '${questId}'.`);
    }

    if (objective.completed) return;

    objective.current += amount;
    if (objective.current >= objective.required) {
      objective.current = objective.required;
      objective.completed = true;
    }

    this.checkQuestCompletion(questId);
  }

  /**
   * 5. completeObjective
   * Forces an objective to be marked as completed.
   */
  public completeObjective(questId: string, objId: string): void {
    const quest = this.getQuest(questId);
    const objective = quest.objectives.find((o) => o.id === objId);

    if (!objective) {
      throw new Error(`Objective '${objId}' not found in quest '${questId}'.`);
    }

    objective.current = objective.required;
    objective.completed = true;

    this.checkQuestCompletion(questId);
  }

  /**
   * 6. checkQuestCompletion
   * Checks if all objectives are met. If so, completes the quest.
   */
  public checkQuestCompletion(questId: string): boolean {
    const quest = this.getQuest(questId);
    const allCompleted = quest.objectives.every((obj) => obj.completed);

    if (allCompleted && quest.status === 'in-progress') {
      this.updateStatus(questId, 'completed');
    }

    return allCompleted;
  }

  /**
   * 7. getActiveQuests
   * Returns all quests currently in progress.
   */
  public getActiveQuests(): Quest[] {
    return Array.from(this.quests.values()).filter((q) => q.status === 'in-progress');
  }

  /**
   * 8. getCompletedQuests
   * Returns all completed quests.
   */
  public getCompletedQuests(): Quest[] {
    return Array.from(this.quests.values()).filter((q) => q.status === 'completed');
  }

  /**
   * 9. getQuestsByType
   * Returns quests matching a specific type.
   */
  public getQuestsByType(type: Quest['type']): Quest[] {
    return Array.from(this.quests.values()).filter((q) => q.type === type);
  }

  /**
   * 10. getQuestsByGiver
   * Returns quests given by a specific NPC/Entity.
   */
  public getQuestsByGiver(giver: string): Quest[] {
    return Array.from(this.quests.values()).filter((q) => q.giver === giver);
  }

  /**
   * 11. addJournalEntry
   * Adds a narrative entry to a specific quest's journal.
   */
  public addJournalEntry(questId: string, text: string, author: string, tags: string[] = []): void {
    const quest = this.getQuest(questId);
    quest.journalEntries.push({
      date: Date.now(),
      text,
      author,
      tags,
    });
  }

  /**
   * 12. getJournal
   * Retrieves all journal entries for a specific quest.
   */
  public getJournal(questId: string): JournalEntry[] {
    return this.getQuest(questId).journalEntries;
  }

  /**
   * 13. getFullJournal
   * Retrieves all journal entries across all quests, sorted chronologically.
   */
  public getFullJournal(): JournalEntry[] {
    const allEntries: JournalEntry[] = [];
    for (const quest of this.quests.values()) {
      allEntries.push(...quest.journalEntries);
    }
    return allEntries.sort((a, b) => a.date - b.date);
  }

  /**
   * 14. getQuestProgress
   * Returns the completion percentage of a quest (0 to 100).
   */
  public getQuestProgress(questId: string): number {
    const quest = this.getQuest(questId);
    if (quest.objectives.length === 0) return quest.status === 'completed' ? 100 : 0;

    let totalProgress = 0;
    for (const obj of quest.objectives) {
      const ratio = obj.required > 0 ? Math.min(obj.current / obj.required, 1) : (obj.completed ? 1 : 0);
      totalProgress += ratio;
    }

    return Math.round((totalProgress / quest.objectives.length) * 100);
  }

  /**
   * 15. getRewardsSummary
   * Aggregates rewards from all completed quests.
   */
  public getRewardsSummary(): { totalXP: number; totalGold: number; items: string[] } {
    let totalXP = 0;
    let totalGold = 0;
    const items: string[] = [];

    for (const quest of this.getCompletedQuests()) {
      totalXP += quest.rewards.xp;
      totalGold += quest.rewards.gold;
      items.push(...quest.rewards.items);
    }

    return { totalXP, totalGold, items };
  }

  /**
   * 16. generateQuestSummary
   * Generates a formatted markdown-like string summarizing the quest.
   */
  public generateQuestSummary(questId: string): string {
    const q = this.getQuest(questId);
    const lines = [
      `# ${q.name} [${q.status.toUpperCase()}]`,
      `**Type:** ${q.type} | **Giver:** ${q.giver} | **Location:** ${q.location}`,
      `> ${q.description}`,
      `\n## Objectives:`,
    ];

    for (const obj of q.objectives) {
      if (obj.hidden && !obj.completed) continue;
      const mark = obj.completed ? '[x]' : '[ ]';
      lines.push(`- ${mark} ${obj.description} (${obj.current}/${obj.required})`);
    }

    lines.push(`\n## Rewards:`);
    lines.push(`- XP: ${q.rewards.xp}`);
    lines.push(`- Gold: ${q.rewards.gold}`);
    if (q.rewards.items.length) lines.push(`- Items: ${q.rewards.items.join(', ')}`);
    if (q.rewards.title) lines.push(`- Title: ${q.rewards.title}`);

    return lines.join('\n');
  }

  /**
   * 17. getActiveObjectives
   * Returns a flattened list of all incomplete objectives from active quests.
   */
  public getActiveObjectives(): Array<{ quest: string; objective: string; progress: string }> {
    const activeObjs: Array<{ quest: string; objective: string; progress: string }> = [];

    for (const quest of this.getActiveQuests()) {
      for (const obj of quest.objectives) {
        if (!obj.completed && !obj.hidden) {
          activeObjs.push({
            quest: quest.name,
            objective: obj.description,
            progress: `${obj.current}/${obj.required}`,
          });
        }
      }
    }

    return activeObjs;
  }

  /**
   * 18. searchJournal
   * Searches all journal entries for a specific text query or tag.
   */
  public searchJournal(query: string): JournalEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getFullJournal().filter(
      (entry) =>
        entry.text.toLowerCase().includes(lowerQuery) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 19. failQuest
   * Fails a quest and logs the reason in the journal.
   */
  public failQuest(id: string, reason: string): void {
    this.updateStatus(id, 'failed');
    this.addJournalEntry(id, `Quest Failed: ${reason}`, 'System', ['failed', 'system']);
  }

  /**
   * 20. serialize
   * Exports the entire journal state to a JSON string.
   */
  public serialize(): string {
    return JSON.stringify({
      quests: Array.from(this.quests.entries()),
      activeQuestId: this.activeQuestId,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
    });
  }

  /**
   * 20. deserialize
   * Imports journal state from a JSON string.
   */
  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.quests = new Map(parsed.quests);
      this.activeQuestId = parsed.activeQuestId;
      this.completedCount = parsed.completedCount;
      this.failedCount = parsed.failedCount;
    } catch (error) {
      throw new Error('Failed to deserialize QuestJournal data.');
    }
  }

  /**
   * Helper: Generate a simple unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }
}