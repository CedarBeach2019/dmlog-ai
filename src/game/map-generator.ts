// src/game/map-generator.ts
// Procedural map and location generation for DMLog.ai TTRPG campaigns

export interface Location {
  id: string;
  name: string;
  type: 'city' | 'village' | 'dungeon' | 'wilderness' | 'tavern' | 'temple' | 'castle' | 'cave' | 'forest' | 'mountain' | 'river';
  description: string;
  population?: number;
  danger: number;
  secrets: string[];
  connectedTo: string[];
  x: number;
  y: number;
  discovered: boolean;
}

export interface Region {
  id: string;
  name: string;
  type: 'kingdom' | 'empire' | 'wilderness' | 'underdark' | 'island';
  locations: string[];
  climate: string;
  ruler?: string;
  description: string;
}

export interface WorldMap {
  regions: Region[];
  locations: Map<string, Location>;
  roads: Array<{ from: string; to: string; type: 'road' | 'path' | 'river' | 'portal'; distance: number }>;
}

const PREFIXES = [
  'Ash', 'Thorn', 'Iron', 'Storm', 'Shadow', 'Silver', 'Dark', 'Crystal', 'Frost', 'Ember',
  'Moon', 'Sun', 'Raven', 'Wolf', 'Gold', 'Blood', 'Night', 'Stone', 'Oak', 'Sea'
];
const SUFFIXES = [
  'haven', 'vale', 'fell', 'wood', 'gate', 'ford', 'mere', 'hold', 'keep', 'reach',
  'watch', 'dale', 'mount', 'brook', 'shire', 'heim', 'burg', 'crest', 'hollow', 'peak'
];

const CLIMATES = ['temperate', 'arid', 'tropical', 'arctic', 'mediterranean', 'continental'];
const RULERS = [
  'King Aldric', 'Queen Seraphina', 'Lord Malachar', 'Archmage Velden', 'Chieftain Grok',
  'Duchess Elara', 'Warlord Kaelen', 'High Priestess Yvaine', 'Elder Theron', 'Baron Vorath'
];

export class MapGenerator {
  private map: WorldMap;
  private usedNames: Set<string> = new Set();

  constructor() {
    this.map = { regions: [], locations: new Map(), roads: [] };
  }

  generateWorldMap(style: string, size: number): WorldMap {
    const clampedSize = Math.max(10, Math.min(100, size));
    const numRegions = Math.max(2, Math.floor(clampedSize / 10));
    const locationsPerRegion = Math.floor(clampedSize / numRegions);

    const types: Location['type'][] = ['city', 'village', 'dungeon', 'wilderness', 'tavern', 'temple', 'castle', 'cave', 'forest', 'mountain', 'river'];

    for (let r = 0; r < numRegions; r++) {
      const region = this.createRegion(r);
      const offsetX = r * 150;
      const offsetY = Math.floor(Math.random() * 100);

      for (let l = 0; l < locationsPerRegion; l++) {
        const locType = types[Math.floor(Math.random() * types.length)];
        const x = offsetX + Math.floor(Math.random() * 120) + 10;
        const y = offsetY + Math.floor(Math.random() * 120) + 10;
        const location = this.generateLocation(region, locType, x, y);
        region.locations.push(location.id);
        this.map.locations.set(location.id, location);
      }
      this.map.regions.push(region);
    }

    this.generateRoads();
    return this.map;
  }

  private createRegion(index: number): Region {
    const regionTypes: Region['type'][] = ['kingdom', 'empire', 'wilderness', 'underdark', 'island'];
    return {
      id: `region-${index}-${Date.now()}`,
      name: this.generateRegionName(),
      type: regionTypes[Math.floor(Math.random() * regionTypes.length)],
      locations: [],
      climate: CLIMATES[Math.floor(Math.random() * CLIMATES.length)],
      ruler: Math.random() > 0.2 ? RULERS[Math.floor(Math.random() * RULERS.length)] : undefined,
      description: `A vast ${regionTypes[index % regionTypes.length]} shrouded in mystery and ancient lore.`
    };
  }

  generateLocation(region: Region, type: Location['type'], x: number, y: number): Location {
    const id = `loc-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const danger = ['dungeon', 'cave', 'wilderness'].includes(type) ? Math.floor(Math.random() * 5) + 5 : Math.floor(Math.random() * 5);
    const population = ['city', 'village', 'town'].includes(type) ? Math.floor(Math.random() * 50000) + 100 : undefined;

    return {
      id, name: this.generateLocationName(type), type, x, y,
      description: `A ${type} situated in the ${region.name}, waiting to be explored.`,
      population, danger, secrets: [], connectedTo: [], discovered: false
    };
  }

  private generateRoads(): void {
    const locs = Array.from(this.map.locations.values());
    // Connect sequential locations
    for (let i = 0; i < locs.length - 1; i++) {
      this.addConnection(locs[i].id, locs[i + 1].id, 'path');
    }
    // Cross-region connections
    for (let i = 0; i < locs.length - 2; i += Math.floor(Math.random() * 3) + 2) {
      if (i + 2 < locs.length) this.addConnection(locs[i].id, locs[i + 2].id, Math.random() > 0.8 ? 'portal' : 'road');
    }
  }

  addConnection(fromId: string, toId: string, type: 'road' | 'path' | 'river' | 'portal'): void {
    const from = this.map.locations.get(fromId);
    const to = this.map.locations.get(toId);
    if (!from || !to || from.connectedTo.includes(toId)) return;

    from.connectedTo.push(toId);
    to.connectedTo.push(fromId);

    const dx = from.x - to.x;
    const dy = from.y - to.y;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

    this.map.roads.push({ from: fromId, to: toId, type, distance });
  }

  getConnectedLocations(locationId: string): Location[] {
    const loc = this.map.locations.get(locationId);
    if (!loc) return [];
    return loc.connectedTo.map(id => this.map.locations.get(id)!).filter(Boolean);
  }

  getTravelPath(fromId: string, toId: string): string[] {
    if (fromId === toId) return [fromId];
    const queue: string[][] = [[fromId]];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      const loc = this.map.locations.get(current);
      if (!loc) continue;

      for (const neighbor of loc.connectedTo) {
        if (neighbor === toId) return [...path, neighbor];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [];
  }

  getTravelDistance(fromId: string, toId: string): number {
    const path = this.getTravelPath(fromId, toId);
    if (path.length < 2) return 0;
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const road = this.map.roads.find(r =>
        (r.from === path[i] && r.to === path[i + 1]) || (r.to === path[i] && r.from === path[i + 1])
      );
      if (road) totalDistance += road.distance;
    }
    return totalDistance;
  }

  discoverLocation(locationId: string): void {
    const loc = this.map.locations.get(locationId);
    if (loc) loc.discovered = true;
  }

  getUndiscoveredLocations(): Location[] {
    return Array.from(this.map.locations.values()).filter(l => !l.discovered);
  }

  getDangerLevel(locationId: string): number {
    return this.map.locations.get(locationId)?.danger ?? -1;
  }

  getLocationDescription(locationId: string): string {
    const loc = this.map.locations.get(locationId);
    if (!loc) return 'Unknown location.';
    const dangerTxt = loc.danger >= 7 ? 'Extreme peril lurks here' : loc.danger >= 4 ? 'Danger is ever-present' : 'Relatively safe';
    const popTxt = loc.population ? ` Home to ${loc.population} souls.` : '';
    return `${loc.name}, a ${loc.type} in the region. ${dangerTxt}.${popTxt} ${loc.secrets.length ? 'Whispers of hidden secrets abound.' : ''}`;
  }

  addSecret(locationId: string, secret: string): void {
    this.map.locations.get(locationId)?.secrets.push(secret);
  }

  generateRegionName(): string {
    let name: string;
    do { name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}${SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]}`;
    } while (this.usedNames.has(name));
    this.usedNames.add(name);
    return name;
  }

  generateLocationName(type: Location['type']): string {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const descriptor: Record<string, string> = {
      city: 'City of', village: 'Village of', dungeon: 'Depths of', wilderness: 'The',
      tavern: 'The', temple: 'Temple of', castle: 'Castle', cave: 'Caverns of',
      forest: 'Forest of', mountain: 'Mount', river: 'River'
    };
    return `${descriptor[type] || 'Ruins of'} ${prefix}${suffix}`;
  }

  getMapSummary(): string {
    let summary = `=== World Map Summary ===\nRegions: ${this.map.regions.length}\nLocations: ${this.map.locations.size}\nRoads: ${this.map.roads.length}\n\n`;
    for (const region of this.map.regions) {
      summary += `--- ${region.name} (${region.type}) ---\nClimate: ${region.climate}\nRuler: ${region.ruler || 'None'}\nLocations: ${region.locations.length}\n\n`;
    }
    return summary;
  }

  serialize(): string { return JSON.stringify({ regions: this.map.regions, locations: Array.from(this.map.locations.entries()), roads: this.map.roads }); }

  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.map = { regions: data.regions, locations: new Map(data.locations), roads: data.roads };
  }
}