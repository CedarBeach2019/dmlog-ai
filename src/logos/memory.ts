// CampaignMemory: stores and retrieves campaign knowledge
// Memory types: session summary, player preference, plot thread, NPC detail, world fact
// Confidence decay: explicit > observed > inferred
// Retrieval: semantic search by relevance to current context
// Exports: CampaignMemory class with store(), recall(), summarize(), getRelevant()

// --- Types and Enums ---

export enum MemoryType {
  SESSION_SUMMARY = 'session_summary',
  PLAYER_PREFERENCE = 'player_preference',
  PLOT_THREAD = 'plot_thread',
  NPC_DETAIL = 'npc_detail',
  WORLD_FACT = 'world_fact',
  COMBAT_LOG = 'combat_log',
  DISCOVERY = 'discovery',
}

export enum PlotThreadStatus {
  INTRODUCED = 'introduced',
  DEVELOPING = 'developing',
  RESOLVED = 'resolved',
  ABANDONED = 'abandoned',
}

export enum ConfidenceLevel {
  EXPLICIT = 1.0,
  OBSERVED = 0.9,
  INFERRED = 0.7,
  GENERATED = 0.5,
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  originalConfidence: number;
  created: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
  relatedEntities: string[];
  metadata: Record<string, unknown>;
}

export interface PlotThread extends MemoryEntry {
  type: MemoryType.PLOT_THREAD;
  status: PlotThreadStatus;
  importance: number; // 1-10
  connectedThreads: string[];
}

export interface CombatLogEntry extends MemoryEntry {
  type: MemoryType.COMBAT_LOG;
  sessionIndex: number;
  participants: string[];
  outcome: string;
  damageDealt: number;
  damageReceived: number;
}

export interface SessionSummary extends MemoryEntry {
  type: MemoryType.SESSION_SUMMARY;
  sessionIndex: number;
  duration: number;
  keyEvents: string[];
  charactersPresent: string[];
  locationsVisited: string[];
}

export interface GameContext {
  currentLocation: string;
  activeNPCs: string[];
  partyMembers: string[];
  sceneType: 'combat' | 'roleplay' | 'exploration' | 'rest' | 'travel' | 'shopping';
  sessionIndex: number;
  recentTopics: string[];
  activeQuests: string[];
}

export interface RecallQuery {
  text: string;
  tags?: string[];
  types?: MemoryType[];
  minConfidence?: number;
  limit?: number;
  relatedTo?: string[];
}

export interface RecallResult {
  entry: MemoryEntry;
  relevanceScore: number;
  matchedTags: string[];
  matchedEntities: string[];
}

const MAX_MEMORY_ENTRIES = 1000;
const DECAY_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DECAY_RATE = 0.95; // confidence multiplier per decay tick

// --- Tag Extraction ---

function extractTags(text: string): string[] {
  const normalized = text.toLowerCase();
  const words = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const unique = new Set(words);
  return Array.from(unique);
}

function tagOverlap(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 || tagsB.length === 0) return 0;
  const setA = new Set(tagsA);
  const matches = tagsB.filter((t) => setA.has(t)).length;
  return matches / Math.max(tagsA.length, tagsB.length);
}

function entityOverlap(entitiesA: string[], entitiesB: string[]): number {
  if (entitiesA.length === 0 || entitiesB.length === 0) return 0;
  const setA = new Set(entitiesA.map((e) => e.toLowerCase()));
  const matches = entitiesB.filter((e) => setA.has(e.toLowerCase())).length;
  return matches / Math.max(entitiesA.length, entitiesB.length);
}

// --- CampaignMemory Class ---

export class CampaignMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private campaignId: string;
  private maxEntries: number;
  private lastDecay: number;

  constructor(campaignId: string, maxEntries: number = MAX_MEMORY_ENTRIES) {
    this.campaignId = campaignId;
    this.maxEntries = maxEntries;
    this.lastDecay = Date.now();
  }

  // --- Store ---

  store(
    type: MemoryType,
    content: string,
    confidence: ConfidenceLevel | number = ConfidenceLevel.OBSERVED,
    tags: string[] = [],
    relatedEntities: string[] = [],
    metadata: Record<string, unknown> = {}
  ): MemoryEntry {
    const id = this.generateId();
    const effectiveConfidence = typeof confidence === 'number' ? confidence : confidence;
    const autoTags = extractTags(content);

    const entry: MemoryEntry = {
      id,
      type,
      content,
      confidence: effectiveConfidence,
      originalConfidence: effectiveConfidence,
      created: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      tags: Array.from(new Set([...autoTags, ...tags])),
      relatedEntities,
      metadata,
    };

    this.entries.set(id, entry);
    this.enforceLimit();
    return entry;
  }

  storePlotThread(
    content: string,
    importance: number = 5,
    tags: string[] = [],
    relatedEntities: string[] = []
  ): PlotThread {
    const base = this.store(
      MemoryType.PLOT_THREAD,
      content,
      ConfidenceLevel.EXPLICIT,
      tags,
      relatedEntities
    );

    const thread: PlotThread = {
      ...base,
      type: MemoryType.PLOT_THREAD,
      status: PlotThreadStatus.INTRODUCED,
      importance,
      connectedThreads: [],
    };

    this.entries.set(base.id, thread);
    return thread;
  }

  storeCombatLog(
    content: string,
    sessionIndex: number,
    participants: string[],
    outcome: string,
    damageDealt: number,
    damageReceived: number
  ): CombatLogEntry {
    const base = this.store(
      MemoryType.COMBAT_LOG,
      content,
      ConfidenceLevel.OBSERVED,
      [],
      participants
    );

    const log: CombatLogEntry = {
      ...base,
      type: MemoryType.COMBAT_LOG,
      sessionIndex,
      participants,
      outcome,
      damageDealt,
      damageReceived,
    };

    this.entries.set(base.id, log);
    return log;
  }

  storeSessionSummary(
    content: string,
    sessionIndex: number,
    duration: number,
    keyEvents: string[],
    charactersPresent: string[],
    locationsVisited: string[]
  ): SessionSummary {
    const base = this.store(
      MemoryType.SESSION_SUMMARY,
      content,
      ConfidenceLevel.EXPLICIT,
      [],
      [...charactersPresent, ...locationsVisited]
    );

    const summary: SessionSummary = {
      ...base,
      type: MemoryType.SESSION_SUMMARY,
      sessionIndex,
      duration,
      keyEvents,
      charactersPresent,
      locationsVisited,
    };

    this.entries.set(base.id, summary);
    return summary;
  }

  // --- Recall ---

  recall(query: RecallQuery): RecallResult[] {
    const queryTags = [...extractTags(query.text), ...(query.tags ?? [])];
    const results: RecallResult[] = [];

    for (const entry of this.entries.values()) {
      // Filter by type
      if (query.types && query.types.length > 0 && !query.types.includes(entry.type)) {
        continue;
      }

      // Filter by confidence
      const minConf = query.minConfidence ?? 0;
      if (entry.confidence < minConf) {
        continue;
      }

      // Filter by related entities
      if (query.relatedTo && query.relatedTo.length > 0) {
        const hasMatch = query.relatedTo.some((e) =>
          entry.relatedEntities.map((re) => re.toLowerCase()).includes(e.toLowerCase())
        );
        if (!hasMatch) continue;
      }

      const matchedTags = entry.tags.filter((t) =>
        queryTags.some((qt) => qt === t)
      );
      const matchedEntities = entry.relatedEntities.filter((e) =>
        (query.relatedTo ?? []).map((q) => q.toLowerCase()).includes(e.toLowerCase())
      );

      const tagScore = tagOverlap(queryTags, entry.tags);
      const entityScore = entityOverlap(
        query.relatedTo ?? [],
        entry.relatedEntities
      );
      const textScore = this.textRelevance(query.text, entry.content);
      const confidenceBonus = entry.confidence * 0.2;
      const recencyBonus = this.recencyScore(entry.created) * 0.1;

      const relevanceScore =
        tagScore * 0.35 +
        entityScore * 0.25 +
        textScore * 0.25 +
        confidenceBonus +
        recencyBonus;

      if (relevanceScore > 0.05) {
        results.push({
          entry,
          relevanceScore,
          matchedTags,
          matchedEntities,
        });

        // Update access stats
        entry.lastAccessed = Date.now();
        entry.accessCount++;
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, query.limit ?? 20);
  }

  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id);
  }

  // --- Relevance Retrieval ---

  getRelevantForScene(sceneType: string, context: GameContext): RecallResult[] {
    const typeMap: Record<string, MemoryType[]> = {
      combat: [MemoryType.COMBAT_LOG, MemoryType.PLOT_THREAD, MemoryType.NPC_DETAIL],
      roleplay: [MemoryType.NPC_DETAIL, MemoryType.PLOT_THREAD, MemoryType.PLAYER_PREFERENCE, MemoryType.WORLD_FACT],
      exploration: [MemoryType.WORLD_FACT, MemoryType.DISCOVERY, MemoryType.PLOT_THREAD],
      rest: [MemoryType.SESSION_SUMMARY, MemoryType.PLOT_THREAD, MemoryType.PLAYER_PREFERENCE],
      travel: [MemoryType.WORLD_FACT, MemoryType.DISCOVERY, MemoryType.SESSION_SUMMARY],
      shopping: [MemoryType.WORLD_FACT, MemoryType.NPC_DETAIL, MemoryType.PLAYER_PREFERENCE],
    };

    return this.recall({
      text: context.recentTopics.join(' '),
      types: typeMap[sceneType] ?? [],
      relatedTo: [...context.activeNPCs, ...context.partyMembers, context.currentLocation],
      limit: 10,
    });
  }

  // --- Plot Thread Management ---

  getActivePlotThreads(): PlotThread[] {
    const threads: PlotThread[] = [];
    for (const entry of this.entries.values()) {
      if (
        entry.type === MemoryType.PLOT_THREAD &&
        (entry as PlotThread).status !== PlotThreadStatus.RESOLVED &&
        (entry as PlotThread).status !== PlotThreadStatus.ABANDONED
      ) {
        threads.push(entry as PlotThread);
      }
    }
    return threads.sort((a, b) => b.importance - a.importance);
  }

  updatePlotThreadStatus(threadId: string, status: PlotThreadStatus): PlotThread | null {
    const entry = this.entries.get(threadId);
    if (!entry || entry.type !== MemoryType.PLOT_THREAD) return null;
    const thread = entry as PlotThread;
    thread.status = status;
    this.entries.set(threadId, thread);
    return thread;
  }

  // --- Player Preference Learning ---

  getPlayerPreferences(): MemoryEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.type === MemoryType.PLAYER_PREFERENCE)
      .sort((a, b) => b.confidence - a.confidence);
  }

  learnPreference(
    content: string,
    confidence: ConfidenceLevel = ConfidenceLevel.OBSERVED,
    tags: string[] = []
  ): MemoryEntry {
    // Check for existing similar preference
    const existing = Array.from(this.entries.values()).find(
      (e) =>
        e.type === MemoryType.PLAYER_PREFERENCE &&
        this.textRelevance(content, e.content) > 0.7
    );

    if (existing) {
      // Reinforce existing preference
      existing.confidence = Math.min(1.0, existing.confidence + 0.05);
      existing.lastAccessed = Date.now();
      existing.accessCount++;
      return existing;
    }

    return this.store(MemoryType.PLAYER_PREFERENCE, content, confidence, tags);
  }

  // --- Summarization ---

  summarize(sessionActions: string[], sessionIndex: number): SessionSummary {
    const keyEvents = sessionActions.slice(-10);
    const content = this.generateSummaryText(sessionActions);
    return this.storeSessionSummary(
      content,
      sessionIndex,
      0,
      keyEvents,
      [],
      []
    );
  }

  private generateSummaryText(actions: string[]): string {
    if (actions.length === 0) return 'Empty session.';
    if (actions.length <= 5) return actions.join('. ') + '.';
    const first = actions.slice(0, 2).join('. ');
    const last = actions.slice(-2).join('. ');
    return `${first}. ... ${last}. (${actions.length} total actions)`;
  }

  // --- Confidence Decay ---

  runDecay(): number {
    const now = Date.now();
    if (now - this.lastDecay < DECAY_INTERVAL_MS) return 0;

    let decayed = 0;
    for (const entry of this.entries.values()) {
      // Explicit memories don't decay
      if (entry.originalConfidence >= ConfidenceLevel.EXPLICIT) continue;

      entry.confidence *= DECAY_RATE;
      decayed++;

      // Remove very low confidence entries
      if (entry.confidence < 0.1) {
        this.entries.delete(entry.id);
      }
    }

    this.lastDecay = now;
    return decayed;
  }

  // --- Utility ---

  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  count(): number {
    return this.entries.size;
  }

  getByType(type: MemoryType): MemoryEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.type === type);
  }

  // --- Serialization ---

  serialize(): string {
    return JSON.stringify({
      campaignId: this.campaignId,
      entries: Array.from(this.entries.entries()),
      lastDecay: this.lastDecay,
    });
  }

  static deserialize(json: string): CampaignMemory {
    const data = JSON.parse(json);
    const mem = new CampaignMemory(data.campaignId);
    mem.lastDecay = data.lastDecay ?? Date.now();
    for (const [id, entry] of data.entries) {
      mem.entries.set(id, entry);
    }
    return mem;
  }

  // --- Private Helpers ---

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private enforceLimit(): void {
    if (this.entries.size <= this.maxEntries) return;

    // Evict lowest confidence, oldest accessed entries
    const sorted = Array.from(this.entries.entries()).sort(([, a], [, b]) => {
      const scoreA = a.confidence * 0.7 + this.recencyScore(a.lastAccessed) * 0.3;
      const scoreB = b.confidence * 0.7 + this.recencyScore(b.lastAccessed) * 0.3;
      return scoreA - scoreB;
    });

    const toRemove = this.entries.size - this.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      this.entries.delete(sorted[i][0]);
    }
  }

  private textRelevance(query: string, content: string): number {
    const queryWords = new Set(extractTags(query));
    const contentWords = new Set(extractTags(content));
    if (queryWords.size === 0 || contentWords.size === 0) return 0;

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.has(word)) matches++;
    }
    return matches / Math.max(queryWords.size, contentWords.size);
  }

  private recencyScore(timestamp: number): number {
    const ageMs = Date.now() - timestamp;
    const ageHours = ageMs / (1000 * 60 * 60);
    // Exponential decay: 1.0 for recent, approaching 0 for old
    return Math.exp(-ageHours / 48);
  }
}
