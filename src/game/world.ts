/**
 * World builder — locations, connections, time, weather, history.
 *
 * Manages a graph of locations with dynamic descriptions based on
 * time of day, travel between locations with random encounters,
 * a weather system, scheduled and triggered events, and world state
 * serialization for KV storage.
 */

import { DiceRoller } from "./dice.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Direction = "north" | "south" | "east" | "west" | "up" | "down" | "northeast" | "northwest" | "southeast" | "southwest";

export type WeatherCondition = "clear" | "cloudy" | "rain" | "fog" | "storm" | "snow" | "hail" | "windy";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type TimeOfDay = "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "evening" | "night" | "midnight";

export type LocationType = "town" | "city" | "village" | "dungeon" | "wilderness" | "cave" | "temple" | "tavern" | "shop" | "castle" | "forest" | "mountain" | "lake" | "road" | "port";

export interface Atmosphere {
  lighting: string;
  sounds: string[];
  smells: string[];
  mood: string;
  temperature: number; // Fahrenheit
}

export interface LocationEvent {
  id: string;
  name: string;
  description: string;
  triggerType: "scheduled" | "on-enter" | "on-interact" | "random";
  triggerChance: number;       // 0-1 for random events
  scheduledTurn?: number;      // turn number for scheduled events
  oneShot: boolean;            // only fires once
  fired: boolean;
  effects: string[];           // narrative effects
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  detailedDescription: string;
  connections: Map<Direction, string>;  // direction -> location ID
  npcs: string[];                       // NPC IDs present
  items: string[];                      // item IDs on the ground
  events: LocationEvent[];
  atmosphere: Atmosphere;
  dangerLevel: number;                  // 1-10, affects random encounters
  discovered: boolean;                  // has the party been here
  visited: boolean;                     // has the party visited
  visitCount: number;
  tags: string[];                       // searchable tags
}

export interface WorldTime {
  hour: number;          // 0-23
  minute: number;        // 0-59
  day: number;           // 1-30
  month: number;         // 1-12
  year: number;
  turnCount: number;
}

export interface WeatherState {
  condition: WeatherCondition;
  temperature: number;
  windSpeed: number;     // mph
  visibility: number;    // miles
  duration: number;      // turns remaining
}

export interface WorldEvent {
  id: string;
  timestamp: WorldTime;
  location: string;
  description: string;
  type: "travel" | "combat" | "social" | "discovery" | "weather" | "time" | "custom";
  participants: string[];
}

export interface RandomEncounter {
  name: string;
  description: string;
  dangerLevel: number;
  type: "combat" | "social" | "exploration" | "trap";
  possibleEnemies?: string[];
  possibleNPCs?: string[];
}

export interface LocationTemplate {
  name: string;
  type: LocationType;
  description: string;
  detailedDescription: string;
  dangerLevel: number;
  tags: string[];
  atmosphere: Atmosphere;
}

// ---------------------------------------------------------------------------
// Location templates
// ---------------------------------------------------------------------------

const LOCATION_TEMPLATES: LocationTemplate[] = [
  {
    name: "Crossroads Inn",
    type: "tavern",
    description: "A weathered inn sits at the crossing of two well-traveled roads.",
    detailedDescription: "The Crossroads Inn is a two-story timber building with a slate roof. Warm light spills from its windows, and the sound of laughter and clinking mugs drifts through the thick wooden door. A weathered sign depicting a crossroads swings gently in the breeze.",
    dangerLevel: 1,
    tags: ["rest", "social", "trade", "information"],
    atmosphere: { lighting: "warm candlelight", sounds: ["crackling fire", "muffled conversation", "clinking mugs"], smells: ["roasting meat", "ale", "wood smoke"], mood: "cozy and welcoming", temperature: 68 },
  },
  {
    name: "Ancient Ruins",
    type: "dungeon",
    description: "Crumbling stone walls hint at a structure that was once grand.",
    detailedDescription: "Ancient stone blocks, carved with faded runes, form the skeleton of what was once a mighty fortress. Vines crawl through cracks in the masonry, and the air is thick with dust and the scent of old stone. Shadows pool in corners where sunlight cannot reach.",
    dangerLevel: 7,
    tags: ["exploration", "danger", "treasure", "history"],
    atmosphere: { lighting: "dim, filtered through gaps in the ceiling", sounds: ["dripping water", "echoing wind", "distant scraping"], smells: ["dust", "mold", "ancient stone"], mood: "ominous and mysterious", temperature: 55 },
  },
  {
    name: "Dark Forest",
    type: "forest",
    description: "Towering trees block out most of the sky, casting everything in green shadow.",
    detailedDescription: "The forest is dense and ancient, with massive trees whose trunks are wider than a man is tall. Their canopy interlocks overhead, creating a cathedral of leaves that filters the light into a perpetual green twilight. Undergrowth rustles with unseen movement.",
    dangerLevel: 5,
    tags: ["wilderness", "danger", "nature", "mystery"],
    atmosphere: { lighting: "dim green twilight", sounds: ["rustling leaves", "bird calls", "snapping twigs"], smells: ["pine", "damp earth", "wildflowers"], mood: "watchful and wild", temperature: 60 },
  },
  {
    name: "Mountain Pass",
    type: "mountain",
    description: "A narrow trail winds between towering peaks, with sheer drops on either side.",
    detailedDescription: "The mountain pass is a treacherous trail cut into the side of a massive cliff. To one side, rock rises vertically to snow-capped peaks. To the other, a sheer drop of hundreds of feet to the valley below. The wind howls through the gap, carrying the scent of snow and stone.",
    dangerLevel: 6,
    tags: ["travel", "danger", "cold", "scenic"],
    atmosphere: { lighting: "bright but harsh", sounds: ["howling wind", "falling rocks", "distant eagle cries"], smells: ["cold air", "stone", "snow"], mood: "exposed and dangerous", temperature: 35 },
  },
  {
    name: "Market Square",
    type: "town",
    description: "A bustling square filled with merchants, performers, and townsfolk.",
    detailedDescription: "The market square is alive with color and noise. Stalls and carts line the cobblestone plaza, their owners hawking wares from fresh produce to exotic trinkets. A fountain carved with the likeness of a forgotten hero stands at the center, its water catching the light.",
    dangerLevel: 1,
    tags: ["trade", "social", "information", "quests"],
    atmosphere: { lighting: "bright sunlight", sounds: ["haggling", "laughter", "music", "clattering carts"], smells: ["fresh bread", "spices", "livestock"], mood: "busy and vibrant", temperature: 72 },
  },
];

// ---------------------------------------------------------------------------
// Random encounter tables
// ---------------------------------------------------------------------------

const ENCOUNTER_TABLE: RandomEncounter[] = [
  { name: "Goblin Ambush", description: "A band of goblins leaps from concealment!", dangerLevel: 3, type: "combat", possibleEnemies: ["goblin", "goblin", "goblin"] },
  { name: "Wandering Merchant", description: "A solitary merchant approaches on the road.", dangerLevel: 1, type: "social", possibleNPCs: ["merchant"] },
  { name: "Ancient Shrine", description: "You discover a small shrine hidden off the path.", dangerLevel: 2, type: "exploration" },
  { name: "Wolf Pack", description: "A pack of wolves surrounds you, growling.", dangerLevel: 4, type: "combat", possibleEnemies: ["wolf", "wolf", "wolf", "wolf"] },
  { name: "Lost Traveler", description: "A lost traveler waves for help.", dangerLevel: 1, type: "social", possibleNPCs: ["traveler"] },
  { name: "Hidden Trap", description: "You trigger a concealed trap!", dangerLevel: 3, type: "trap" },
  { name: "Fairy Ring", description: "A circle of mushrooms glows with faint magical light.", dangerLevel: 2, type: "exploration" },
  { name: "Bandit Roadblock", description: "Armed figures block the road ahead, demanding toll.", dangerLevel: 4, type: "combat", possibleEnemies: ["bandit", "bandit", "bandit"] },
];

// ---------------------------------------------------------------------------
// Time-of-day descriptions
// ---------------------------------------------------------------------------

const TIME_DESCRIPTIONS: Record<TimeOfDay, string> = {
  dawn:      "The first light of dawn paints the sky in soft pinks and golds.",
  morning:   "The morning sun climbs steadily, casting long shadows.",
  midday:    "The sun stands high overhead, bathing everything in bright light.",
  afternoon: "The afternoon sun begins its descent, shadows lengthening.",
  dusk:      "The sun dips below the horizon, painting the sky in deep oranges and purples.",
  evening:   "Twilight settles over the land, the last traces of daylight fading.",
  night:     "Darkness covers the land, lit only by moonlight and stars.",
  midnight:  "The dead of night. The world is still and silent under a canopy of stars.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 13) return "midday";
  if (hour >= 13 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 19) return "dusk";
  if (hour >= 19 && hour < 21) return "evening";
  if (hour >= 21 && hour < 24) return "night";
  return "midnight";
}

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

let nextLocationId = 1;

// ---------------------------------------------------------------------------
// World class
// ---------------------------------------------------------------------------

export class World {
  private locations: Map<string, Location> = new Map();
  private time: WorldTime;
  private weather: WeatherState;
  private history: WorldEvent[] = [];
  private dice = new DiceRoller();

  constructor(startYear = 1247) {
    this.time = { hour: 8, minute: 0, day: 1, month: 3, year: startYear, turnCount: 0 };
    this.weather = { condition: "clear", temperature: 65, windSpeed: 5, visibility: 10, duration: 10 };
  }

  // -----------------------------------------------------------------------
  // Location management
  // -----------------------------------------------------------------------

  /**
   * Create a location from a template or custom definition.
   */
  createLocation(opts: {
    name: string;
    type: LocationType;
    description: string;
    detailedDescription?: string;
    dangerLevel?: number;
    tags?: string[];
    atmosphere?: Partial<Atmosphere>;
  }): Location {
    const now = this.time.turnCount;
    const location: Location = {
      id: `loc_${nextLocationId++}_${Date.now().toString(36)}`,
      name: opts.name,
      type: opts.type,
      description: opts.description,
      detailedDescription: opts.detailedDescription ?? opts.description,
      connections: new Map(),
      npcs: [],
      items: [],
      events: [],
      atmosphere: {
        lighting: opts.atmosphere?.lighting ?? "natural light",
        sounds: opts.atmosphere?.sounds ?? [],
        smells: opts.atmosphere?.smells ?? [],
        mood: opts.atmosphere?.mood ?? "neutral",
        temperature: opts.atmosphere?.temperature ?? 65,
      },
      dangerLevel: opts.dangerLevel ?? 1,
      discovered: false,
      visited: false,
      visitCount: 0,
      tags: opts.tags ?? [],
    };

    this.locations.set(location.id, location);
    return location;
  }

  /** Generate a location from built-in templates. */
  generateFromTemplate(templateIndex?: number): Location {
    const idx = templateIndex ?? Math.floor((this.dice.d100() / 100) * LOCATION_TEMPLATES.length);
    const template = LOCATION_TEMPLATES[Math.min(idx, LOCATION_TEMPLATES.length - 1)];

    return this.createLocation({
      name: template.name,
      type: template.type,
      description: template.description,
      detailedDescription: template.detailedDescription,
      dangerLevel: template.dangerLevel,
      tags: template.tags,
      atmosphere: template.atmosphere,
    });
  }

  /** Connect two locations in the given directions. */
  connect(locationA: string, directionAtoB: Direction, locationB: string, directionBtoA: Direction): boolean {
    const locA = this.locations.get(locationA);
    const locB = this.locations.get(locationB);
    if (!locA || !locB) return false;

    locA.connections.set(directionAtoB, locationB);
    locB.connections.set(directionBtoA, locationA);
    return true;
  }

  // -----------------------------------------------------------------------
  // Travel
  // -----------------------------------------------------------------------

  /**
   * Travel from a location in a given direction.
   * May trigger random encounters.
   */
  travel(fromLocationId: string, direction: Direction): {
    success: boolean;
    destination: Location | null;
    encounter: RandomEncounter | null;
    description: string;
  } {
    const from = this.locations.get(fromLocationId);
    if (!from) return { success: false, destination: null, encounter: null, description: "Location not found." };

    const destId = from.connections.get(direction);
    if (!destId) return { success: false, destination: null, encounter: null, description: `Nothing lies to the ${direction}.` };

    const destination = this.locations.get(destId);
    if (!destination) return { success: false, destination: null, encounter: null, description: "The path leads nowhere." };

    // Mark as discovered and visited
    destination.discovered = true;
    destination.visited = true;
    destination.visitCount++;

    // Check for random encounter
    let encounter: RandomEncounter | null = null;
    const dangerAvg = (from.dangerLevel + destination.dangerLevel) / 2;
    const encounterChance = dangerAvg * 0.05; // up to 50% chance for danger 10

    if (this.dice.d100() / 100 < encounterChance) {
      const validEncounters = ENCOUNTER_TABLE.filter((e) => e.dangerLevel <= dangerAvg + 2);
      if (validEncounters.length > 0) {
        const idx = Math.floor((this.dice.d100() / 100) * validEncounters.length);
        encounter = validEncounters[Math.min(idx, validEncounters.length - 1)];
      }
    }

    // Record in history
    this.recordEvent({
      location: destId,
      description: `Traveled ${direction} from ${from.name} to ${destination.name}.`,
      type: "travel",
      participants: [],
    });

    const timeOfDay = getTimeOfDay(this.time.hour);
    const travelDesc = `${TIME_DESCRIPTIONS[timeOfDay]} ${encounter ? encounter.description : `You arrive at ${destination.name}.`}`;

    return { success: true, destination, encounter, description: travelDesc };
  }

  /** Get the description for a location, adjusted for time of day. */
  getLocationDescription(locationId: string): string {
    const location = this.locations.get(locationId);
    if (!location) return "Unknown location.";

    const timeOfDay = getTimeOfDay(this.time.hour);
    const timePrefix = TIME_DESCRIPTIONS[timeOfDay];
    const weatherDesc = this.getWeatherDescription();

    return `${timePrefix} ${location.detailedDescription} ${weatherDesc}`;
  }

  // -----------------------------------------------------------------------
  // Time system
  // -----------------------------------------------------------------------

  /** Advance time by a number of hours (and minutes). */
  advanceTime(hours = 0, minutes = 0): WorldTime {
    this.time.turnCount++;
    this.time.minute += minutes;
    this.time.hour += hours;

    // Roll over minutes
    while (this.time.minute >= 60) {
      this.time.minute -= 60;
      this.time.hour++;
    }

    // Roll over hours
    while (this.time.hour >= 24) {
      this.time.hour -= 24;
      this.time.day++;
    }

    // Roll over days
    const daysInMonth = 30;
    while (this.time.day > daysInMonth) {
      this.time.day -= daysInMonth;
      this.time.month++;
    }

    // Roll over months
    while (this.time.month > 12) {
      this.time.month -= 12;
      this.time.year++;
    }

    // Update weather
    this.weather.duration--;
    if (this.weather.duration <= 0) {
      this.updateWeather();
    }

    this.recordEvent({
      description: `Time advances to day ${this.time.day}, month ${this.time.month}, year ${this.time.year}. ${getTimeOfDay(this.time.hour)}.`,
      type: "time",
      location: "",
      participants: [],
    });

    return { ...this.time };
  }

  getTime(): WorldTime {
    return { ...this.time };
  }

  getTimeOfDay(): TimeOfDay {
    return getTimeOfDay(this.time.hour);
  }

  getSeason(): Season {
    return getSeason(this.time.month);
  }

  // -----------------------------------------------------------------------
  // Weather system
  // -----------------------------------------------------------------------

  private updateWeather(): void {
    const season = getSeason(this.time.month);
    const timeOfDay = getTimeOfDay(this.time.hour);

    const seasonWeather: Record<Season, WeatherCondition[]> = {
      spring: ["clear", "cloudy", "rain", "fog", "windy", "storm"],
      summer: ["clear", "clear", "clear", "cloudy", "storm"],
      autumn: ["cloudy", "rain", "fog", "windy", "clear"],
      winter: ["snow", "cloudy", "clear", "fog", "snow", "hail"],
    };

    const options = seasonWeather[season];
    const idx = Math.floor((this.dice.d100() / 100) * options.length);
    const condition = options[Math.min(idx, options.length - 1)];

    const baseTempBySeason: Record<Season, number> = { spring: 60, summer: 80, autumn: 55, winter: 30 };
    const baseTemp = baseTempBySeason[season];
    const timeOffset = timeOfDay === "night" || timeOfDay === "midnight" ? -15 : timeOfDay === "dawn" ? -5 : 5;

    const conditionTempOffset: Record<WeatherCondition, number> = {
      clear: 5, cloudy: -3, rain: -8, fog: -5, storm: -12, snow: -20, hail: -15, windy: -10,
    };

    this.weather = {
      condition,
      temperature: baseTemp + timeOffset + (conditionTempOffset[condition] ?? 0) + this.dice.d6() - 3,
      windSpeed: condition === "storm" ? 30 + this.dice.d20() : condition === "windy" ? 15 + this.dice.d10() : this.dice.d10(),
      visibility: condition === "fog" ? 0.25 : condition === "storm" ? 1 : condition === "snow" ? 2 : condition === "rain" ? 3 : 10,
      duration: 5 + this.dice.d10(),
    };

    this.recordEvent({
      description: `The weather changes: ${condition}, ${this.weather.temperature}F, wind ${this.weather.windSpeed}mph.`,
      type: "weather",
      location: "",
      participants: [],
    });
  }

  getWeather(): WeatherState {
    return { ...this.weather };
  }

  private getWeatherDescription(): string {
    const parts: string[] = [];
    if (this.weather.condition !== "clear") {
      parts.push(`The weather is ${this.weather.condition}.`);
    }
    if (this.weather.temperature < 40) {
      parts.push("It is cold.");
    } else if (this.weather.temperature > 85) {
      parts.push("It is hot.");
    }
    if (this.weather.windSpeed > 20) {
      parts.push("Strong winds blow.");
    }
    if (this.weather.visibility < 1) {
      parts.push("Visibility is very poor.");
    }
    return parts.length > 0 ? parts.join(" ") : "";
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  /** Add a custom event to a location. */
  addLocationEvent(locationId: string, event: Omit<LocationEvent, "id" | "fired">): LocationEvent | null {
    const location = this.locations.get(locationId);
    if (!location) return null;

    const locEvent: LocationEvent = {
      ...event,
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      fired: false,
    };

    location.events.push(locEvent);
    return locEvent;
  }

  /** Check and trigger events for a location. */
  checkLocationEvents(locationId: string, triggerType: "on-enter" | "on-interact" | "random"): LocationEvent[] {
    const location = this.locations.get(locationId);
    if (!location) return [];

    const triggered: LocationEvent[] = [];

    for (const event of location.events) {
      if (event.fired && event.oneShot) continue;
      if (event.triggerType !== triggerType) continue;

      let shouldTrigger = false;
      if (triggerType === "random") {
        shouldTrigger = this.dice.d100() / 100 < event.triggerChance;
      } else if (triggerType === "on-enter") {
        shouldTrigger = true;
      } else {
        shouldTrigger = this.dice.d100() / 100 < event.triggerChance;
      }

      if (shouldTrigger) {
        triggered.push(event);
        if (event.oneShot) event.fired = true;
        this.recordEvent({
          location: locationId,
          description: `Event: ${event.name} — ${event.description}`,
          type: "custom",
          participants: [],
        });
      }
    }

    return triggered;
  }

  // -----------------------------------------------------------------------
  // History
  // -----------------------------------------------------------------------

  private recordEvent(event: Omit<WorldEvent, "id" | "timestamp">): void {
    this.history.push({
      ...event,
      id: `wevt_${Date.now().toString(36)}_${this.history.length}`,
      timestamp: { ...this.time },
    });
  }

  getHistory(limit?: number): WorldEvent[] {
    const events = [...this.history];
    return limit ? events.slice(-limit) : events;
  }

  getHistoryByLocation(locationId: string): WorldEvent[] {
    return this.history.filter((e) => e.location === locationId);
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getLocation(id: string): Location | undefined {
    return this.locations.get(id);
  }

  getLocations(): Location[] {
    return [...this.locations.values()];
  }

  getDiscoveredLocations(): Location[] {
    return [...this.locations.values()].filter((l) => l.discovered);
  }

  getConnectedLocations(locationId: string): { direction: Direction; location: Location }[] {
    const location = this.locations.get(locationId);
    if (!location) return [];

    const result: { direction: Direction; location: Location }[] = [];
    for (const [direction, destId] of location.connections) {
      const dest = this.locations.get(destId);
      if (dest) {
        result.push({ direction, location: dest });
      }
    }
    return result;
  }

  addNPCToLocation(npcId: string, locationId: string): boolean {
    const location = this.locations.get(locationId);
    if (!location) return false;
    if (!location.npcs.includes(npcId)) {
      location.npcs.push(npcId);
    }
    return true;
  }

  removeNPCFromLocation(npcId: string, locationId: string): boolean {
    const location = this.locations.get(locationId);
    if (!location) return false;
    const idx = location.npcs.indexOf(npcId);
    if (idx === -1) return false;
    location.npcs.splice(idx, 1);
    return true;
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      locations: Array.from(this.locations.entries()).map(([k, v]) => [
        k,
        { ...v, connections: Array.from(v.connections.entries()) },
      ]),
      time: this.time,
      weather: this.weather,
      history: this.history,
      nextLocationId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.locations = new Map(
      parsed.locations.map(([k, v]: [string, any]) => [
        k,
        { ...v, connections: new Map(v.connections) },
      ])
    );
    this.time = parsed.time;
    this.weather = parsed.weather;
    this.history = parsed.history ?? [];
    nextLocationId = parsed.nextLocationId ?? this.locations.size + 1;
  }
}
