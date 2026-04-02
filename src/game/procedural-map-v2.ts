// src/game/procedural-map-v2.ts

export interface MapTile {
  x: number;
  y: number;
  biome: string;
  elevation: number;
  feature: string;
  poi?: POI;
}

export interface POI {
  id: string;
  name: string;
  type: 'city' | 'town' | 'village' | 'dungeon' | 'temple' | 'tower' | 'cave' | 'camp' | 'ruins';
  description: string;
  danger: number;
  loot: string;
  connections: string[];
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: MapTile[][];
  pois: POI[];
  roads: Array<{ from: string; to: string }>;
  seed: number;
}

export class ProceduralMapV2 {
  private maps = new Map<string, GameMap>();

  // 1. Generate a new procedural map
  public generate(name: string, width: number, height: number, seed: number = Math.random() * 10000): GameMap {
    const id = `map-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tiles: MapTile[][] = [];
    const pois: POI[] = [];
    const roads: Array<{ from: string; to: string }> = [];

    for (let y = 0; y < height; y++) {
      const row: MapTile[] = [];
      for (let x = 0; x < width; x++) {
        row.push(this.generateTile(x, y, seed));
      }
      tiles.push(row);
    }

    // Sprinkle POIs
    const poiCount = Math.max(3, Math.floor((width * height) / 50));
    const poiTypes: POI['type'][] = ['city', 'town', 'village', 'dungeon', 'temple', 'tower', 'cave', 'camp', 'ruins'];
    
    for (let i = 0; i < poiCount; i++) {
      const px = Math.floor(this.pseudoRandom(seed + i * 10) * width);
      const py = Math.floor(this.pseudoRandom(seed + i * 20) * height);
      const tile = tiles[py][px];
      
      if (!tile.poi && tile.biome !== 'ocean') {
        const type = poiTypes[Math.floor(this.pseudoRandom(seed + i * 30) * poiTypes.length)];
        const poi: POI = {
          id: `poi-${id}-${i}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} of ${name}`,
          type,
          description: `A mysterious ${type} located in the ${tile.biome}.`,
          danger: Math.floor(this.pseudoRandom(seed + i * 40) * 10) + 1,
          loot: ['Gold', 'Artifact', 'Weapons', 'Potions'][Math.floor(this.pseudoRandom(seed + i * 50) * 4)],
          connections: []
        };
        tile.poi = poi;
        pois.push(poi);
      }
    }

    // Generate Roads (Connect POIs)
    for (let i = 0; i < pois.length; i++) {
      const current = pois[i];
      // Connect to 1 or 2 random other POIs
      const connections = 1 + Math.floor(this.pseudoRandom(seed + i) * 2);
      for (let c = 0; c < connections; c++) {
        const target = pois[Math.floor(this.pseudoRandom(seed + i + c) * pois.length)];
        if (target.id !== current.id && !current.connections.includes(target.id)) {
          current.connections.push(target.id);
          target.connections.push(current.id); // Bidirectional
          roads.push({ from: current.id, to: target.id });
        }
      }
    }

    const gameMap: GameMap = { id, name, width, height, tiles, pois, roads, seed };
    this.maps.set(id, gameMap);
    return gameMap;
  }

  // 2. Get map by ID
  public getMap(id: string): GameMap {
    const map = this.maps.get(id);
    if (!map) throw new Error(`Map ${id} not found`);
    return map;
  }

  // 3. Get specific tile
  public getTile(mapId: string, x: number, y: number): MapTile {
    const map = this.getMap(mapId);
    if (y < 0 || y >= map.height || x < 0 || x >= map.width) throw new Error('Out of bounds');
    return map.tiles[y][x];
  }

  // 4. Update tile properties
  public setTile(mapId: string, x: number, y: number, updates: Partial<MapTile>): void {
    const tile = this.getTile(mapId, x, y);
    Object.assign(tile, updates);
  }

  // 5. Get all POIs
  public getPOIs(mapId: string): POI[] {
    return this.getMap(mapId).pois;
  }

  // 6. Get specific POI
  public getPOI(mapId: string, poiId: string): POI {
    const poi = this.getMap(mapId).pois.find(p => p.id === poiId);
    if (!poi) throw new Error(`POI ${poiId} not found`);
    return poi;
  }

  // 7. Get POIs by type
  public getPOIsByType(mapId: string, type: POI['type']): POI[] {
    return this.getMap(mapId).pois.filter(p => p.type === type);
  }

  // 8. Get dangerous areas
  public getDangerousAreas(mapId: string, minDanger: number): POI[] {
    return this.getMap(mapId).pois.filter(p => p.danger >= minDanger);
  }

  // 9. Simple pathfinding (BFS on POI connections)
  public getPath(mapId: string, from: string, to: string): string[] {
    const map = this.getMap(mapId);
    const queue: { id: string; path: string[] }[] = [{ id: from, path: [from] }];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === to) return path;

      const poi = map.pois.find(p => p.id === id);
      if (!poi) continue;

      for (const neighbor of poi.connections) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...path, neighbor] });
        }
      }
    }
    return []; // No path found
  }

  // 10. Add POI to map
  public addPOI(mapId: string, poi: POI, x: number, y: number): void {
    const map = this.getMap(mapId);
    const tile = this.getTile(mapId, x, y);
    tile.poi = poi;
    map.pois.push(poi);
  }

  // 11. Remove POI
  public removePOI(mapId: string, poiId: string): void {
    const map = this.getMap(mapId);
    map.pois = map.pois.filter(p => p.id !== poiId);
    map.roads = map.roads.filter(r => r.from !== poiId && r.to !== poiId);
    
    // Remove from connections
    map.pois.forEach(p => {
      p.connections = p.connections.filter(c => c !== poiId);
    });

    // Remove from tile
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y][x].poi?.id === poiId) {
          map.tiles[y][x].poi = undefined;
        }
      }
    }
  }

  // 12. Get biome distribution
  public getBiomeDistribution(mapId: string): Map<string, number> {
    const map = this.getMap(mapId);
    const dist = new Map<string, number>();
    for (const row of map.tiles) {
      for (const tile of row) {
        dist.set(tile.biome, (dist.get(tile.biome) || 0) + 1);
      }
    }
    return dist;
  }

  // 13. Get map statistics
  public getMapStats(mapId: string): { biomes: number; pois: number; roads: number; danger: number } {
    const map = this.getMap(mapId);
    const biomes = this.getBiomeDistribution(mapId).size;
    const avgDanger = map.pois.length ? map.pois.reduce((sum, p) => sum + p.danger, 0) / map.pois.length : 0;
    
    return {
      biomes,
      pois: map.pois.length,
      roads: map.roads.length,
      danger: Number(avgDanger.toFixed(2))
    };
  }

  // 14. Generate ASCII representation
  public generateASCII(mapId: string): string {
    const map = this.getMap(mapId);
    let ascii = '';
    
    const biomeChars: Record<string, string> = {
      'ocean': '~', 'beach': '.', 'plains': '-', 'forest': 'T', 'mountain': '^', 'snow': '*'
    };

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.poi) {
          ascii += tile.poi.type.charAt(0).toUpperCase();
        } else {
          ascii += biomeChars[tile.biome] || '?';
        }
      }
      ascii += '\n';
    }
    return ascii;
  }

  // 15. Get adjacent POIs
  public getAdjacentPOIs(mapId: string, poiId: string): POI[] {
    const poi = this.getPOI(mapId, poiId);
    const map = this.getMap(mapId);
    return poi.connections.map(id => map.pois.find(p => p.id === id)).filter((p): p is POI => !!p);
  }

  // 16. Get random encounter based on location
  public getRandomEncounter(mapId: string, x: number, y: number): string {
    const tile = this.getTile(mapId, x, y);
    const isDangerous = tile.poi ? tile.poi.danger > 5 : false;
    
    const encounters: Record<string, string[]> = {
      'ocean': ['Pirate ship spotted!', 'A sea monster breaches the surface.', 'Calm waters.'],
      'forest': ['Bandits ambush you!', 'You find wild berries.', 'A pack of wolves approaches.'],
      'mountain': ['A rockslide blocks the path!', 'You spot a griffin nest.', 'Harsh winds drain your stamina.'],
      'plains': ['A wandering merchant greets you.', 'Wild horses graze nearby.', 'Goblin scouting party!'],
      'default': ['Nothing but eerie silence.', 'You find an old coin in the dirt.']
    };

    const list = encounters[tile.biome] || encounters['default'];
    let encounter = list[Math.floor(Math.random() * list.length)];
    
    if (isDangerous) encounter = `[DANGER] ${encounter} They look hostile!`;
    return encounter;
  }

  // 17. Expand map in a direction
  public expandMap(mapId: string, direction: 'north' | 'south' | 'east' | 'west', amount: number): void {
    const map = this.getMap(mapId);
    
    if (direction === 'south' || direction === 'north') {
      for (let i = 0; i < amount; i++) {
        const newRow: MapTile[] = [];
        const y = direction === 'south' ? map.height + i : -1 - i;
        for (let x = 0; x < map.width; x++) {
          newRow.push(this.generateTile(x, y, map.seed));
        }
        if (direction === 'south') map.tiles.push(newRow);
        else map.tiles.unshift(newRow);
      }
      map.height += amount;
    } else {
      for (let y = 0; y < map.height; y++) {
        for (let i = 0; i < amount; i++) {
          const x = direction === 'east' ? map.width + i : -1 - i;
          const newTile = this.generateTile(x, y, map.seed);
          if (direction === 'east') map.tiles[y].push(newTile);
          else map.tiles[y].unshift(newTile);
        }
      }
      map.width += amount;
    }

    // Re-index coordinates if shifted
    if (direction === 'north' || direction === 'west') {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          map.tiles[y][x].x = x;
          map.tiles[y][x].y = y;
        }
      }
    }
  }

  // 18. Get all maps
  public getAllMaps(): GameMap[] {
    return Array.from(this.maps.values());
  }

  // 19. Serialize and Deserialize
  public serialize(mapId: string): string {
    return JSON.stringify(this.getMap(mapId));
  }

  public deserialize(data: string): GameMap {
    const map: GameMap = JSON.parse(data);
    this.maps.set(map.id, map);
    return map;
  }

  // 20. Get travel time in hours
  public getTravelTime(mapId: string, fromId: string, toId: string, speed: number): number {
    const map = this.getMap(mapId);
    let fromTile: MapTile | null = null;
    let toTile: MapTile | null = null;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y][x].poi?.id === fromId) fromTile = map.tiles[y][x];
        if (map.tiles[y][x].poi?.id === toId) toTile = map.tiles[y][x];
      }
    }

    if (!fromTile || !toTile) throw new Error('POI locations not found on map tiles');

    // Calculate Euclidean distance
    const distance = Math.hypot(toTile.x - fromTile.x, toTile.y - fromTile.y);
    
    // Terrain modifier based on destination biome
    const terrainMods: Record<string, number> = { 'mountain': 2.0, 'forest': 1.5, 'ocean': 3.0, 'plains': 1.0 };
    const modifier = terrainMods[toTile.biome] || 1.2;

    // Assume 1 tile = 10 miles
    return (distance * 10 * modifier) / speed;
  }

  // --- Private Helpers ---

  private generateTile(x: number, y: number, seed: number): MapTile {
    const elevation = this.smoothNoise(x, y, seed);
    let biome = 'plains';
    if (elevation < 0.3) biome = 'ocean';
    else if (elevation < 0.4) biome = 'beach';
    else if (elevation < 0.6) biome = 'plains';
    else if (elevation < 0.8) biome = 'forest';
    else if (elevation < 0.95) biome = 'mountain';
    else biome = 'snow';

    return { x, y, biome, elevation, feature: 'none' };
  }

  private smoothNoise(x: number, y: number, seed: number): number {
    // Simple deterministic pseudo-noise function
    const v = Math.sin(x * 0.15 + seed) + Math.cos(y * 0.15 + seed) + Math.sin((x + y) * 0.05 + seed);
    return (v + 3) / 6; // Normalize to roughly 0-1
  }

  private pseudoRandom(seed: number): number {
    let t = seed + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}