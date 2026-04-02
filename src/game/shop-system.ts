// src/game/shop-system.ts — DMLog.ai In-Game Shop & Economy System

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'scroll' | 'tool' | 'gem' | 'food';
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats: Record<string, number>;
  quantity: number;
  icon: string;
}

export interface Shop {
  id: string;
  name: string;
  type: 'general' | 'weapons' | 'armor' | 'potions' | 'magic';
  keeper: string;
  inventory: string[];
  discount: number;
  reputation: number;
}

export interface Transaction {
  itemId: string;
  price: number;
  type: 'buy' | 'sell';
  timestamp: string;
}

const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

function makeItems(): ShopItem[] {
  return [
    // Weapons (5)
    { id: 'w1', name: 'Rusty Shortsword', description: 'A weathered blade still capable of cutting.', type: 'weapon', price: 15, rarity: 'common', stats: { atk: 4 }, quantity: 5, icon: '🗡️' },
    { id: 'w2', name: 'Iron Longsword', description: 'Standard issue for town guards.', type: 'weapon', price: 45, rarity: 'uncommon', stats: { atk: 7, crit: 2 }, quantity: 3, icon: '🗡️' },
    { id: 'w3', name: 'Elven Rapier', description: 'Graceful and razor-sharp.', type: 'weapon', price: 120, rarity: 'rare', stats: { atk: 10, spd: 5 }, quantity: 2, icon: '🗡️' },
    { id: 'w4', name: 'Dwarven War Axe', description: 'Heavy enough to fell a troll.', type: 'weapon', price: 200, rarity: 'epic', stats: { atk: 16, crit: 4 }, quantity: 1, icon: '🪓' },
    { id: 'w5', name: 'Vorpal Greatsword', description: 'Whispers in the dark. Seeks necks.', type: 'weapon', price: 800, rarity: 'legendary', stats: { atk: 30, crit: 15, spd: 3 }, quantity: 1, icon: '⚔️' },

    // Armor (5)
    { id: 'a1', name: 'Leather Vest', description: 'Basic protection for the road.', type: 'armor', price: 12, rarity: 'common', stats: { def: 3 }, quantity: 6, icon: '🦺' },
    { id: 'a2', name: 'Chainmail Shirt', description: 'Interlocking rings of steel.', type: 'armor', price: 55, rarity: 'uncommon', stats: { def: 7, spd: -1 }, quantity: 4, icon: '🦺' },
    { id: 'a3', name: 'Mithril Plate', description: 'Light as silk, hard as dragonbone.', type: 'armor', price: 150, rarity: 'rare', stats: { def: 12, spd: 2 }, quantity: 2, icon: '🛡️' },
    { id: 'a4', name: 'Dragonscale Cuirass', description: 'Forged from fallen scales.', type: 'armor', price: 280, rarity: 'epic', stats: { def: 18, res_fire: 10 }, quantity: 1, icon: '🛡️' },
    { id: 'a5', name: 'Aegis of the Immortal', description: 'Said to deny death itself.', type: 'armor', price: 900, rarity: 'legendary', stats: { def: 25, hp: 50, regen: 5 }, quantity: 1, icon: '✨' },

    // Potions (5)
    { id: 'p1', name: 'Minor Healing Potion', description: 'Restores a small amount of health.', type: 'potion', price: 8, rarity: 'common', stats: { hp: 10 }, quantity: 20, icon: '🧪' },
    { id: 'p2', name: 'Potion of Swiftness', description: 'Wind in your heels.', type: 'potion', price: 25, rarity: 'uncommon', stats: { spd: 5 }, quantity: 10, icon: '🧪' },
    { id: 'p3', name: 'Elixir of Iron Skin', description: 'Harden your body against blows.', type: 'potion', price: 65, rarity: 'rare', stats: { def: 8 }, quantity: 5, icon: '⚗️' },
    { id: 'p4', name: 'Draught of Giant Strength', description: 'Feel the power of the ancients.', type: 'potion', price: 150, rarity: 'epic', stats: { atk: 15, def: -3 }, quantity: 3, icon: '⚗️' },
    { id: 'p5', name: 'Elixir of Eternal Life', description: 'A fleeting taste of immortality.', type: 'potion', price: 600, rarity: 'legendary', stats: { hp: 100, regen: 10 }, quantity: 1, icon: '💫' },

    // Scrolls (5)
    { id: 's1', name: 'Scroll of Light', description: 'Illuminates dark caves.', type: 'scroll', price: 10, rarity: 'common', stats: { magic: 2 }, quantity: 15, icon: '📜' },
    { id: 's2', name: 'Scroll of Fireball', description: 'Casts a modest fireball.', type: 'scroll', price: 45, rarity: 'uncommon', stats: { magic: 8 }, quantity: 6, icon: '📜' },
    { id: 's3', name: 'Scroll of Dispel', description: 'Breaks enchantments.', type: 'scroll', price: 100, rarity: 'rare', stats: { magic: 12 }, quantity: 3, icon: '📜' },
    { id: 's4', name: 'Scroll of Summoning', description: 'Calls an ethereal companion.', type: 'scroll', price: 210, rarity: 'epic', stats: { magic: 20 }, quantity: 2, icon: '📜' },
    { id: 's5', name: 'Scroll of Time Stop', description: 'Halt the world around you.', type: 'scroll', price: 750, rarity: 'legendary', stats: { magic: 40, spd: 20 }, quantity: 1, icon: '⏳' },

    // Tools (5)
    { id: 't1', name: 'Iron Crowbar', description: 'For prying things open.', type: 'tool', price: 5, rarity: 'common', stats: { utility: 1 }, quantity: 10, icon: '🔧' },
    { id: 't2', name: 'Thieves\' Lockpick Set', description: 'Opens most standard locks.', type: 'tool', price: 30, rarity: 'uncommon', stats: { utility: 4 }, quantity: 6, icon: '🔑' },
    { id: 't3', name: 'Climbing Kit', description: 'Pitons, rope, and harness.', type: 'tool', price: 40, rarity: 'uncommon', stats: { spd: 2 }, quantity: 4, icon: '🧗' },
    { id: 't4', name: 'Disguise Kit', description: 'Become anyone.', type: 'tool', price: 80, rarity: 'rare', stats: { utility: 10 }, quantity: 3, icon: '🎭' },
    { id: 't5', name: 'Portable Hole', description: 'A hole you can carry.', type: 'tool', price: 350, rarity: 'epic', stats: { utility: 25 }, quantity: 1, icon: '🕳️' },

    // Gems (5)
    { id: 'g1', name: 'Chip of Quartz', description: 'Slightly glowing shard.', type: 'gem', price: 10, rarity: 'common', stats: { value: 10 }, quantity: 12, icon: '💎' },
    { id: 'g2', name: 'Sapphire Shard', description: 'Deep blue and radiant.', type: 'gem', price: 55, rarity: 'uncommon', stats: { value: 55 }, quantity: 5, icon: '💎' },
    { id: 'g3', name: 'Fire Opal', description: 'Warm to the touch.', type: 'gem', price: 130, rarity: 'rare', stats: { value: 130, res_fire: 3 }, quantity: 3, icon: '🔶' },
    { id: 'g4', name: 'Black Onyx', description: 'Absorbs light and curses.', type: 'gem', price: 250, rarity: 'epic', stats: { value: 250, res_dark: 10 }, quantity: 2, icon: '🌑' },
    { id: 'g5', name: 'Heart of the Mountain', description: 'The rarest gem beneath the world.', type: 'gem', price: 1000, rarity: 'legendary', stats: { value: 1000, hp: 20, regen: 2 }, quantity: 1, icon: '💠' },
  ];
}

function makeShops(): Shop[] {
  return [
    { id: 'general', name: 'General Store', type: 'general', keeper: 'Brenna Oakhollow', inventory: ['w1', 'a1', 'p1', 's1', 't1', 'g1', 't2'], discount: 0.0, reputation: 0 },
    { id: 'blacksmith', name: 'Blacksmith', type: 'weapons', keeper: 'Durgrim Ironfist', inventory: ['w1', 'w2', 'w3', 'w4', 'w5', 'a1', 'a2', 'a3'], discount: 0.0, reputation: 0 },
    { id: 'alchemist', name: 'Alchemist\'s Apothecary', type: 'potions', keeper: 'Fenwick Muddle', inventory: ['p1', 'p2', 'p3', 'p4', 'p5', 's1', 's2', 't4'], discount: 0.0, reputation: 0 },
    { id: 'enchanter', name: 'Enchanter\'s