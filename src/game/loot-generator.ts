// src/game/loot-generator.ts

export interface LootItem {
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'gem' | 'gold' | 'wondrous' | 'ammo';
  rarity: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary';
  value: number; // Value in gold pieces (GP)
  description: string;
  properties?: string[];
}

export interface LootTable {
  cr: number;
  items: LootItem[];
  totalValue: number;
}

export class LootGenerator {
  private lootPool: LootItem[];
  private rng: () => number;

  constructor(seed?: number) {
    // Simple seedable pseudo-random number generator
    let s = seed ?? Date.now();
    this.rng = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    this.lootPool = [...WEAPONS, ...ARMORS, ...POTIONS, ...SCROLLS, ...WONDROUS, ...GEMS];
  }

  // 1. Generate balanced loot based on CR
  public generateLoot(cr: number, partySize: number, isHoarde: boolean): LootTable {
    const items = isHoarde ? this.generateHoarde(cr).items : this.generateIndividualTreasure(cr);
    return {
      cr,
      items: this.balanceLoot(items, cr, partySize),
      totalValue: this.totalValue(items)
    };
  }

  // 2. Generate individual treasure
  public generateIndividualTreasure(cr: number): LootItem[] {
    const gold = this.createGold(this.rollDice(cr + 2, 4));
    const items = this.rollOnTable(this.getLootByRarity('common'), Math.max(1, Math.floor(cr / 5)));
    return [gold, ...items];
  }

  // 3. Generate hoarde treasure
  public generateHoarde(cr: number): LootTable {
    const rarity = this.getRarityByCR(cr);
    const items = this.rollOnTable(this.getLootByRarity(rarity), Math.ceil(cr / 3));
    const gold = this.createGold(this.rollDice(cr * 5, 8));
    return { cr, items: [gold, ...items], totalValue: this.totalValue(items) + gold.value };
  }

  // 4. Generate random item
  public generateRandomItem(rarity?: LootItem['rarity']): LootItem {
    const pool = rarity ? this.getLootByRarity(rarity) : this.lootPool;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  // 5. Get loot by type
  public getLootByType(type: LootItem['type']): LootItem[] {
    return this.lootPool.filter(item => item.type === type);
  }

  // 6. Get loot by rarity
  public getLootByRarity(rarity: LootItem['rarity']): LootItem[] {
    return this.lootPool.filter(item => item.rarity === rarity);
  }

  // 7. Formatted description
  public describeItem(item: LootItem): string {
    const props = item.properties?.length ? ` [${item.properties.join(', ')}]` : '';
    return `${item.name} (${item.rarity} ${item.type}) - ${item.value}GP${props}\n${item.description}`;
  }

  // 8. Total value calculation
  public totalValue(items: LootItem[]): number {
    return items.reduce((sum, item) => sum + item.value, 0);
  }

  // 9. Fair split loot amongst party
  public splitLoot(items: LootItem[], partySize: number): LootItem[][] {
    if (partySize <= 0) return [items];
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const shares: LootItem[][] = Array.from({ length: partySize }, () => []);
    const totals: number[] = Array(partySize).fill(0);

    for (const item of sorted) {
      const minIdx = totals.indexOf(Math.min(...totals));
      shares[minIdx].push(item);
      totals[minIdx] += item.value;
    }
    return shares;
  }

  // 10. Roll on a specific table
  public rollOnTable(table: LootItem[], count: number): LootItem[] {
    const res: LootItem[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(this.rng() * table.length);
      const item = table[idx];
      res.push({ ...item, properties: item.properties ? [...item.properties] : undefined });
    }
    return res;
  }

  // --- Private Helpers ---
  private balanceLoot(items: LootItem[], cr: number, partySize: number): LootItem[] {
    const targetValue = (cr * 50 * partySize);
    const current = this.totalValue(items);
    if (current < targetValue) items.push(this.createGold(targetValue - current));
    return items;
  }

  private getRarityByCR(cr: number): LootItem['rarity'] {
    if (cr >= 17) return 'legendary';
    if (cr >= 11) return 'very-rare';
    if (cr >= 5) return 'rare';
    return 'uncommon';
  }

  private createGold(amount: number): LootItem {
    return { name: 'Gold Pieces', type: 'gold', rarity: 'common', value: Math.floor(amount), description: `A pouch of ${Math.floor(amount)} gold coins.`, properties: ['Currency'] };
  }

  private rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.floor(this.rng() * sides) + 1;
    return total;
  }
}

// --- DATA TABLES (CR 0-20 Ready) ---

const WEAPONS: LootItem[] = [
  { name: 'Longsword +1', type: 'weapon', rarity: 'uncommon', value: 500, description: 'A finely crafted blade that hums faintly.', properties: ['+1 Attack/Damage'] },
  { name: 'Flame Tongue', type: 'weapon', rarity: 'rare', value: 5000, description: 'Ignites on command, shedding bright light.', properties: ['2d6 Fire Damage'] },
  { name: 'Vorpal Sword', type: 'weapon', rarity: 'legendary', value: 100000, description: 'A razor-sharp blade capable of severing heads.', properties: ['Instant Kill on Nat 20'] },
  { name: 'Dagger of Venom', type: 'weapon', rarity: 'rare', value: 4000, description: 'Can be coated in poison as a bonus action.', properties: ['2d10 Poison Damage'] },
  { name: 'Oathbow', type: 'weapon', rarity: 'very-rare', value: 15000, description: 'Elven bow that marks a target for death.', properties: ['3d6 Extra Damage'] },
  { name: 'Warhammer +2', type: 'weapon', rarity: 'rare', value: 4000, description: 'A heavy hammer crackling with kinetic energy.', properties: ['+2 Attack/Damage'] },
  { name: 'Scimitar of Speed', type: 'weapon', rarity: 'very-rare', value: 20000, description: 'Allows an extra attack as a bonus action.', properties: ['+2 Attack/Damage', 'Bonus Action Attack'] },
  { name: 'Greatsword +3', type: 'weapon', rarity: 'very-rare', value: 25000, description: 'A masterwork blade of incredible sharpness.', properties: ['+3 Attack/Damage'] },
  { name: 'Whip of Warning', type: 'weapon', rarity: 'uncommon', value: 800, description: 'Alerts the wielder to danger.', properties: ['Advantage on Initiative'] },
  { name: 'Mace of Disruption', type: 'weapon', rarity: 'rare', value: 6000, description: 'Blazes with light in the presence of undead.', properties: ['2d6 Radiant Damage'] },
  { name: 'Luck Blade', type: 'weapon', rarity: 'legendary', value: 80000, description: 'Grants the wielder unnatural luck.', properties: ['+1 Attack/Damage', 'Allows Wish spell'] },
  { name: 'Sword of Life Stealing', type: 'weapon', rarity: 'rare', value: 4500, description: 'Drains vitality from foes on a good hit.', properties: ['Heals wielder for damage dealt'] },
  { name: ' Trident of Fish Command', type: 'weapon', rarity: 'uncommon', value: 1200, description: 'Allows control over aquatic beasts.', properties: ['3 Charges'] },
  { name: 'Javelin of Lightning', type: 'weapon', rarity: 'uncommon', value: 1500, description: 'Turns into a bolt of lightning when thrown.', properties: ['4d6 Lightning Damage'] },
  { name: 'Dwarven Thrower', type: 'weapon', rarity: 'very-rare', value: 25000, description: 'A hammer that returns to the thrower\'s hand.', properties: ['+3 Attack/Damage', 'Returning'] },
  { name: 'Sun Blade', type: 'weapon', rarity: 'rare', value: 5000, description: 'A blade of pure light, bane to undead.', properties: ['+2 Attack/Damage', 'Sunlight'] },
  { name: 'Sword of Wounding', type: 'weapon', rarity: 'very-rare', value: 18000, description: 'Causes persistent bleeding wounds.', properties: ['1d4 Bleed Damage'] },
  { name: 'Dragonslayer', type: 'weapon', rarity: 'rare', value: 6000, description: 'Ancient runes glow in the presence of dragons.', properties: ['+2d6 Damage vs Dragons'] },
  { name: 'Staff of Striking', type: 'weapon', rarity: 'very-rare', value: 18000, description: 'Stores kinetic energy for devastating blows.', properties: ['+3 Attack/Damage'] },
  { name: 'Sword of Kas', type: 'weapon', rarity: 'legendary', value: 120000, description: 'Artifact blade forged to destroy a vampire lord.', properties: ['+3 Attack/Damage', 'Bonus vs Undead'] },
];

const ARMORS: LootItem[] = [
  { name: 'Studded Leather +1', type: 'armor', rarity: 'uncommon', value: 500, description: 'Quiet and flexible, offering enhanced protection.', properties: ['+1 AC'] },
  { name: 'Chain Mail +2', type: 'armor', rarity: 'rare', value: 5000, description: 'Heavy links of enchanted steel.', properties: ['+2 AC'] },
  { name: 'Plate Armor of Etherealness', type: 'armor', rarity: 'legendary', value: 90000, description: 'Allows the wearer to step into the Ethereal Plane.', properties: ['+1 AC