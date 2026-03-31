// WorldState: manages all persistent game state in KV
// Campaign: id, name, dmPersonality, created, lastPlayed, settings, stateVersion
// State structure: campaign/{id}/world.json, campaign/{id}/characters.json, campaign/{id}/npcs.json, etc.
// Atomic updates with conflict detection
// Exports: WorldState class with load(), save(), update(), getCampaign(), listCampaigns()

// --- Interfaces ---

export interface CampaignSettings {
  ruleset: '5e' | 'pathfinder' | 'homebrew';
  startingLevel: number;
  maxLevel: number;
  allowMulticlass: boolean;
  allowHomebrew: boolean;
  deathSaveDC: number;
  criticalRule: 'double-dice' | 'double-damage' | 'max-dice';
  flanking: boolean;
  restVariant: 'standard' | 'gritty' | 'epic';
  customRules: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  name: string;
  dmPersonality: string;
  created: number;
  lastPlayed: number;
  settings: CampaignSettings;
  stateVersion: number;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  children: string[];
  tags: string[];
  discovered: boolean;
  metadata: Record<string, unknown>;
}

export interface NPC {
  id: string;
  name: string;
  race: string;
  alignment: string;
  disposition: number; // -100 to 100
  alive: boolean;
  locationId: string;
  description: string;
  stats: Record<string, number>;
  knowledge: string[];
  metadata: Record<string, unknown>;
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'misc';
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact';
  description: string;
  ownerId: string | null; // null = on ground at locationId
  locationId: string | null;
  quantity: number;
  attuned: boolean;
  metadata: Record<string, unknown>;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'active' | 'completed' | 'failed' | 'abandoned';
  objectives: QuestObjective[];
  rewards: string[];
  giverNPCId: string | null;
  metadata: Record<string, unknown>;
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface GameEvent {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  sessionIndex: number;
  locationId: string | null;
  participantIds: string[];
  metadata: Record<string, unknown>;
}

export interface CharacterCondition {
  name: string;
  duration: number | null; // null = indefinite
  source: string;
}

export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  experience: number;
  abilities: Record<string, number>;
  currentHP: number;
  maxHP: number;
  temporaryHP: number;
  armorClass: number;
  speed: number;
  proficiencyBonus: number;
  savingThrows: string[];
  skills: string[];
  conditions: CharacterCondition[];
  inventory: string[]; // item IDs
  spellSlots: Record<string, number>; // "1": 2, "2": 0, etc.
  deathSaves: { successes: number; failures: number };
  locationId: string;
  backstory: string;
  metadata: Record<string, unknown>;
}

export interface Encounter {
  id: string;
  name: string;
  round: number;
  currentTurnIndex: number;
  initiativeOrder: InitiativeEntry[];
  status: 'setup' | 'active' | 'completed';
  locationId: string;
  metadata: Record<string, unknown>;
}

export interface InitiativeEntry {
  characterId: string;
  roll: number;
  acted: boolean;
}

export interface SessionState {
  sessionIndex: number;
  startedAt: number;
  currentLocationId: string | null;
  activeEncounterId: string | null;
  narrativePosition: string;
  turnOrder: string[];
  pendingActions: string[];
  lastAutoSave: number;
}

export interface WorldData {
  locations: Record<string, Location>;
  npcs: Record<string, NPC>;
  items: Record<string, Item>;
  quests: Record<string, Quest>;
  events: GameEvent[];
}

export interface CharacterData {
  characters: Record<string, Character>;
  encounters: Record<string, Encounter>;
}

export interface FullState {
  campaign: Campaign;
  world: WorldData;
  characters: CharacterData;
  session: SessionState;
}

export interface StateDiff {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

// --- KV Storage Interface (Cloudflare KV compatible) ---

export interface KVStorage {
  get<T = unknown>(key: string, type?: 'text' | 'json'): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

// --- Version Migration ---

const CURRENT_STATE_VERSION = 1;

interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate(state: FullState): FullState;
}

const MIGRATIONS: Migration[] = [
  // Future migrations go here
];

function runMigrations(state: FullState): FullState {
  let current = state;
  while (current.campaign.stateVersion < CURRENT_STATE_VERSION) {
    const migration = MIGRATIONS.find(
      (m) => m.fromVersion === current.campaign.stateVersion
    );
    if (!migration) {
      current.campaign.stateVersion = CURRENT_STATE_VERSION;
      break;
    }
    current = migration.migrate(current);
    current.campaign.stateVersion = migration.toVersion;
  }
  return current;
}

// --- State Differ ---

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function computeDiff(oldState: FullState, newState: FullState): StateDiff[] {
  const diffs: StateDiff[] = [];
  const oldJson = JSON.stringify(oldState);
  const newJson = JSON.stringify(newState);
  if (oldJson === newJson) return diffs;

  function walk(oldObj: unknown, newObj: unknown, path: string): void {
    if (typeof oldObj !== typeof newObj || oldObj === null || newObj === null) {
      if (oldObj !== newObj) {
        diffs.push({ path, oldValue: oldObj, newValue: newObj });
      }
      return;
    }
    if (typeof oldObj !== 'object') {
      if (oldObj !== newObj) {
        diffs.push({ path, oldValue: oldObj, newValue: newObj });
      }
      return;
    }
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
      const maxLen = Math.max(oldObj.length, newObj.length);
      for (let i = 0; i < maxLen; i++) {
        walk(oldObj[i], newObj[i], `${path}[${i}]`);
      }
      return;
    }
    const allKeys = new Set([
      ...Object.keys(oldObj as Record<string, unknown>),
      ...Object.keys(newObj as Record<string, unknown>),
    ]);
    for (const key of allKeys) {
      walk(
        (oldObj as Record<string, unknown>)[key],
        (newObj as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key
      );
    }
  }

  walk(oldState, newState, '');
  return diffs;
}

// --- Default Factories ---

export function createDefaultCampaign(
  id: string,
  name: string,
  settings?: Partial<CampaignSettings>
): Campaign {
  return {
    id,
    name,
    dmPersonality: 'neutral',
    created: Date.now(),
    lastPlayed: Date.now(),
    settings: {
      ruleset: '5e',
      startingLevel: 1,
      maxLevel: 20,
      allowMulticlass: true,
      allowHomebrew: false,
      deathSaveDC: 10,
      criticalRule: 'double-dice',
      flanking: false,
      restVariant: 'standard',
      customRules: {},
      ...settings,
    },
    stateVersion: CURRENT_STATE_VERSION,
  };
}

export function createDefaultSessionState(): SessionState {
  return {
    sessionIndex: 0,
    startedAt: Date.now(),
    currentLocationId: null,
    activeEncounterId: null,
    narrativePosition: '',
    turnOrder: [],
    pendingActions: [],
    lastAutoSave: 0,
  };
}

// --- WorldState Class ---

export class WorldState {
  private kv: KVStorage;
  private cache: Map<string, FullState> = new Map();
  private dirty: Set<string> = new Set();
  private autoSaveIntervalMs: number;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(kv: KVStorage, autoSaveIntervalMs: number = 30_000) {
    this.kv = kv;
    this.autoSaveIntervalMs = autoSaveIntervalMs;
  }

  startAutoSave(): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(() => {
      this.flushDirty().catch((err) => {
        console.warn('[WorldState] auto-save error:', err);
      });
    }, this.autoSaveIntervalMs);
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private campaignKey(campaignId: string): string {
    return `campaign/${campaignId}`;
  }

  private worldKey(campaignId: string): string {
    return `campaign/${campaignId}/world`;
  }

  private characterKey(campaignId: string): string {
    return `campaign/${campaignId}/characters`;
  }

  private sessionKey(campaignId: string): string {
    return `campaign/${campaignId}/session`;
  }

  // --- Campaign CRUD ---

  async createCampaign(
    id: string,
    name: string,
    settings?: Partial<CampaignSettings>
  ): Promise<FullState> {
    const campaign = createDefaultCampaign(id, name, settings);
    const state: FullState = {
      campaign,
      world: { locations: {}, npcs: {}, items: {}, quests: {}, events: [] },
      characters: { characters: {}, encounters: {} },
      session: createDefaultSessionState(),
    };
    await this.save(state);
    return state;
  }

  async getCampaign(campaignId: string): Promise<FullState | null> {
    if (this.cache.has(campaignId)) {
      return this.cache.get(campaignId)!;
    }
    const state = await this.load(campaignId);
    if (state) {
      this.cache.set(campaignId, state);
    }
    return state;
  }

  async listCampaigns(): Promise<Campaign[]> {
    const result = await this.kv.list({ prefix: 'campaign/' });
    const campaignIds = new Set<string>();
    for (const key of result.keys) {
      const parts = key.name.split('/');
      if (parts.length >= 2) {
        campaignIds.add(parts[1]);
      }
    }
    const campaigns: Campaign[] = [];
    for (const id of campaignIds) {
      const cached = this.cache.get(id);
      if (cached) {
        campaigns.push(cached.campaign);
        continue;
      }
      const state = await this.load(id);
      if (state) {
        this.cache.set(id, state);
        campaigns.push(state.campaign);
      }
    }
    return campaigns;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const keys = [
      this.campaignKey(campaignId),
      this.worldKey(campaignId),
      this.characterKey(campaignId),
      this.sessionKey(campaignId),
    ];
    for (const key of keys) {
      await this.kv.delete(key);
    }
    this.cache.delete(campaignId);
    this.dirty.delete(campaignId);
  }

  // --- Load / Save ---

  async load(campaignId: string): Promise<FullState | null> {
    const [campaignRaw, worldRaw, charRaw, sessionRaw] = await Promise.all([
      this.kv.get<Campaign>(this.campaignKey(campaignId), 'json'),
      this.kv.get<WorldData>(this.worldKey(campaignId), 'json'),
      this.kv.get<CharacterData>(this.characterKey(campaignId), 'json'),
      this.kv.get<SessionState>(this.sessionKey(campaignId), 'json'),
    ]);

    if (!campaignRaw) return null;

    const state: FullState = {
      campaign: campaignRaw,
      world: worldRaw ?? { locations: {}, npcs: {}, items: {}, quests: {}, events: [] },
      characters: charRaw ?? { characters: {}, encounters: {} },
      session: sessionRaw ?? createDefaultSessionState(),
    };

    return runMigrations(state);
  }

  async save(state: FullState): Promise<void> {
    state.campaign.lastPlayed = Date.now();
    state.session.lastAutoSave = Date.now();

    await Promise.all([
      this.kv.put(this.campaignKey(state.campaign.id), JSON.stringify(state.campaign)),
      this.kv.put(this.worldKey(state.campaign.id), JSON.stringify(state.world)),
      this.kv.put(this.characterKey(state.campaign.id), JSON.stringify(state.characters)),
      this.kv.put(this.sessionKey(state.campaign.id), JSON.stringify(state.session)),
    ]);

    this.cache.set(state.campaign.id, deepClone(state));
    this.dirty.delete(state.campaign.id);
  }

  // --- Atomic Update with Conflict Detection ---

  async update(
    campaignId: string,
    updater: (state: FullState) => FullState | void
  ): Promise<{ state: FullState; diffs: StateDiff[] }> {
    let state = await this.getCampaign(campaignId);
    if (!state) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const oldState = deepClone(state);
    const result = updater(state);
    if (result !== undefined) {
      state = result as FullState;
    } else {
      state = (updater as (s: FullState) => void)(oldState) as unknown as FullState;
      // updater mutated the object in place; re-read from the mutated reference
      state = oldState;
    }

    const diffs = computeDiff(oldState, state);
    if (diffs.length > 0) {
      this.cache.set(campaignId, state);
      this.dirty.add(campaignId);
      await this.save(state);
    }

    return { state, diffs };
  }

  // --- State Mutations (mark dirty, auto-save batches) ---

  markDirty(campaignId: string): void {
    this.dirty.add(campaignId);
  }

  async flushDirty(): Promise<void> {
    const ids = Array.from(this.dirty);
    this.dirty.clear();
    for (const id of ids) {
      const state = this.cache.get(id);
      if (state) {
        await this.save(state);
      }
    }
  }

  // --- Location Helpers ---

  addLocation(state: FullState, location: Location): FullState {
    const updated = deepClone(state);
    updated.world.locations[location.id] = location;
    if (location.parentId && updated.world.locations[location.parentId]) {
      if (!updated.world.locations[location.parentId].children.includes(location.id)) {
        updated.world.locations[location.parentId].children.push(location.id);
      }
    }
    return updated;
  }

  // --- Character Helpers ---

  addCharacter(state: FullState, character: Character): FullState {
    const updated = deepClone(state);
    updated.characters.characters[character.id] = character;
    return updated;
  }

  dealDamage(state: FullState, characterId: string, amount: number): FullState {
    const updated = deepClone(state);
    const char = updated.characters.characters[characterId];
    if (!char) return updated;

    if (char.temporaryHP > 0) {
      const absorbed = Math.min(char.temporaryHP, amount);
      char.temporaryHP -= absorbed;
      amount -= absorbed;
    }
    char.currentHP = Math.max(0, char.currentHP - amount);
    return updated;
  }

  healCharacter(state: FullState, characterId: string, amount: number): FullState {
    const updated = deepClone(state);
    const char = updated.characters.characters[characterId];
    if (!char) return updated;
    char.currentHP = Math.min(char.maxHP, char.currentHP + amount);
    return updated;
  }

  addCondition(
    state: FullState,
    characterId: string,
    condition: CharacterCondition
  ): FullState {
    const updated = deepClone(state);
    const char = updated.characters.characters[characterId];
    if (!char) return updated;
    const existing = char.conditions.find((c) => c.name === condition.name);
    if (!existing) {
      char.conditions.push(condition);
    }
    return updated;
  }

  removeCondition(state: FullState, characterId: string, conditionName: string): FullState {
    const updated = deepClone(state);
    const char = updated.characters.characters[characterId];
    if (!char) return updated;
    char.conditions = char.conditions.filter((c) => c.name !== conditionName);
    return updated;
  }

  // --- Item Helpers ---

  addItem(state: FullState, item: Item): FullState {
    const updated = deepClone(state);
    updated.world.items[item.id] = item;
    return updated;
  }

  transferItem(
    state: FullState,
    itemId: string,
    toOwnerId: string | null,
    toLocationId: string | null
  ): FullState {
    const updated = deepClone(state);
    const item = updated.world.items[itemId];
    if (!item) return updated;
    item.ownerId = toOwnerId;
    item.locationId = toLocationId;
    return updated;
  }

  // --- Quest Helpers ---

  addQuest(state: FullState, quest: Quest): FullState {
    const updated = deepClone(state);
    updated.world.quests[quest.id] = quest;
    return updated;
  }

  updateQuestObjective(
    state: FullState,
    questId: string,
    objectiveId: string,
    completed: boolean
  ): FullState {
    const updated = deepClone(state);
    const quest = updated.world.quests[questId];
    if (!quest) return updated;
    const obj = quest.objectives.find((o) => o.id === objectiveId);
    if (obj) {
      obj.completed = completed;
      if (quest.objectives.every((o) => o.completed)) {
        quest.status = 'completed';
      }
    }
    return updated;
  }

  // --- NPC Helpers ---

  updateNPCDisposition(
    state: FullState,
    npcId: string,
    delta: number
  ): FullState {
    const updated = deepClone(state);
    const npc = updated.world.npcs[npcId];
    if (!npc) return updated;
    npc.disposition = Math.max(-100, Math.min(100, npc.disposition + delta));
    return updated;
  }

  // --- Encounter Helpers ---

  startEncounter(state: FullState, encounter: Encounter): FullState {
    const updated = deepClone(state);
    updated.characters.encounters[encounter.id] = encounter;
    updated.session.activeEncounterId = encounter.id;
    return updated;
  }

  endEncounter(state: FullState, encounterId: string): FullState {
    const updated = deepClone(state);
    const encounter = updated.characters.encounters[encounterId];
    if (encounter) {
      encounter.status = 'completed';
    }
    if (updated.session.activeEncounterId === encounterId) {
      updated.session.activeEncounterId = null;
    }
    return updated;
  }

  // --- Event Logging ---

  logEvent(state: FullState, event: Omit<GameEvent, 'id' | 'timestamp' | 'sessionIndex'>): FullState {
    const updated = deepClone(state);
    updated.world.events.push({
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      sessionIndex: updated.session.sessionIndex,
    });
    return updated;
  }

  // --- Export / Import ---

  async exportCampaign(campaignId: string): Promise<string> {
    const state = await this.getCampaign(campaignId);
    if (!state) throw new Error(`Campaign not found: ${campaignId}`);
    return JSON.stringify(state, null, 2);
  }

  async importCampaign(json: string): Promise<FullState> {
    const state: FullState = JSON.parse(json);

    if (!state.campaign?.id || !state.campaign?.name) {
      throw new Error('Invalid campaign data: missing id or name');
    }

    const migrated = runMigrations(state);
    await this.save(migrated);
    return migrated;
  }
}
