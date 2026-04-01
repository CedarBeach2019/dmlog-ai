/**
 * Item and inventory system — D&D 5e inspired.
 *
 * Weapons, armor, consumables, magical items, weight-based encumbrance,
 * equipment slots, attunement, and item comparison.
 */

import { DiceRoller } from "./dice.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemType = "weapon" | "armor" | "potion" | "scroll" | "misc" | "ammo" | "tool" | "treasure";

export type WeaponProperty =
  | "ammunition" | "finesse" | "heavy" | "light" | "loading"
  | "range" | "reach" | "special" | "thrown" | "two-handed" | "versatile";

export type DamageType = "bludgeoning" | "piercing" | "slashing" | "acid" | "cold" | "fire" | "force" | "lightning" | "necrotic" | "poison" | "psychic" | "radiant" | "thunder";

export type ArmorType = "light" | "medium" | "heavy" | "shield";

export type Rarity = "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "artifact";

export type EquipmentSlot = "main-hand" | "off-hand" | "armor" | "shield" | "head" | "cloak" | "boots" | "gloves" | "amulet" | "ring1" | "ring2" | "belt";

export interface WeaponProperties {
  damageDice: string;         // e.g. "1d8"
  damageType: DamageType;
  range: number;              // feet for ranged, 5 for melee
  longRange?: number;         // disadvantage range for ranged weapons
  properties: WeaponProperty[];
  versatileDamageDice?: string; // e.g. "1d10" when used two-handed
}

export interface ArmorProperties {
  acBonus: number;
  armorType: ArmorType;
  stealthDisadvantage: boolean;
  strengthRequirement: number;
  maxDexBonus: number | null; // null means unlimited
}

export interface MagicalEffect {
  name: string;
  description: string;
  /** Additional damage dice added on hit (for weapons). */
  bonusDamageDice?: string;
  /** Flat bonus to attack rolls. */
  attackBonus?: number;
  /** Flat bonus to AC (for armor). */
  acBonus?: number;
  /** Flat bonus to damage rolls. */
  damageBonus?: number;
  /** Requires attunement. */
  requiresAttunement: boolean;
  /** Charges (for scrolls/wands). */
  charges?: number;
  /** Maximum charges. */
  maxCharges?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  value: number;              // in gold pieces
  weight: number;             // in pounds
  rarity: Rarity;
  weapon?: WeaponProperties;
  armor?: ArmorProperties;
  magical?: MagicalEffect;
  consumable: boolean;
  stackable: boolean;
  /** Which equipment slot this item occupies. */
  slot?: EquipmentSlot;
}

export interface InventoryEntry {
  item: Item;
  quantity: number;
  equipped: boolean;
}

export interface ItemComparison {
  item1: Item;
  item2: Item;
  acDifference?: number;
  damageDifference?: number;
  weightDifference: number;
  valueDifference: number;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Standard item catalog
// ---------------------------------------------------------------------------

const STANDARD_WEAPONS: Omit<Item, "id">[] = [
  { name: "Dagger",          type: "weapon", description: "A small, sharp blade.", value: 2,    weight: 1,  rarity: "common", weapon: { damageDice: "1d4", damageType: "piercing", range: 5, properties: ["finesse", "light", "thrown", "range"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Shortsword",      type: "weapon", description: "A standard infantry sword.", value: 10,   weight: 2,  rarity: "common", weapon: { damageDice: "1d6", damageType: "piercing", range: 5, properties: ["finesse", "light"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Longsword",       type: "weapon", description: "A versatile military sword.", value: 15,   weight: 3,  rarity: "common", weapon: { damageDice: "1d8", damageType: "slashing", range: 5, properties: ["versatile"], versatileDamageDice: "1d10" }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Greatsword",      type: "weapon", description: "A heavy two-handed blade.", value: 50,   weight: 6,  rarity: "common", weapon: { damageDice: "2d6", damageType: "slashing", range: 5, properties: ["heavy", "two-handed"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Battleaxe",       type: "weapon", description: "A sturdy axe.", value: 10,   weight: 4,  rarity: "common", weapon: { damageDice: "1d8", damageType: "slashing", range: 5, properties: ["versatile"], versatileDamageDice: "1d10" }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Greataxe",        type: "weapon", description: "A massive two-handed axe.", value: 30,   weight: 7,  rarity: "common", weapon: { damageDice: "1d12", damageType: "slashing", range: 5, properties: ["heavy", "two-handed"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Mace",            type: "weapon", description: "A blunt crushing weapon.", value: 5,    weight: 4,  rarity: "common", weapon: { damageDice: "1d6", damageType: "bludgeoning", range: 5, properties: [] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Warhammer",       type: "weapon", description: "A military hammer.", value: 15,   weight: 2,  rarity: "common", weapon: { damageDice: "1d8", damageType: "bludgeoning", range: 5, properties: ["versatile"], versatileDamageDice: "1d10" }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Rapier",          type: "weapon", description: "A slender thrusting sword.", value: 25,   weight: 2,  rarity: "common", weapon: { damageDice: "1d8", damageType: "piercing", range: 5, properties: ["finesse"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Shortbow",        type: "weapon", description: "A simple bow.", value: 25,   weight: 2,  rarity: "common", weapon: { damageDice: "1d6", damageType: "piercing", range: 80, longRange: 320, properties: ["ammunition", "two-handed"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Longbow",         type: "weapon", description: "A powerful bow.", value: 50,   weight: 2,  rarity: "common", weapon: { damageDice: "1d8", damageType: "piercing", range: 150, longRange: 600, properties: ["ammunition", "heavy", "two-handed"] }, consumable: false, stackable: false, slot: "main-hand" },
  { name: "Crossbow, Light", type: "weapon", description: "A simple crossbow.", value: 25,   weight: 5,  rarity: "common", weapon: { damageDice: "1d8", damageType: "piercing", range: 80, longRange: 320, properties: ["ammunition", "loading", "two-handed"] }, consumable: false, stackable: false, slot: "main-hand" },
];

const STANDARD_ARMOR: Omit<Item, "id">[] = [
  { name: "Padded Armor",    type: "armor", description: "Quilted layers of cloth.", value: 5,    weight: 8,  rarity: "common", armor: { acBonus: 11, armorType: "light", stealthDisadvantage: true, strengthRequirement: 0, maxDexBonus: null }, consumable: false, stackable: false, slot: "armor" },
  { name: "Leather Armor",   type: "armor", description: "Tanned leather armor.", value: 10,   weight: 10, rarity: "common", armor: { acBonus: 11, armorType: "light", stealthDisadvantage: false, strengthRequirement: 0, maxDexBonus: null }, consumable: false, stackable: false, slot: "armor" },
  { name: "Studded Leather", type: "armor", description: "Leather reinforced with metal studs.", value: 45,   weight: 13, rarity: "common", armor: { acBonus: 12, armorType: "light", stealthDisadvantage: false, strengthRequirement: 0, maxDexBonus: null }, consumable: false, stackable: false, slot: "armor" },
  { name: "Chain Shirt",     type: "armor", description: "Interlocking metal rings.", value: 50,   weight: 20, rarity: "common", armor: { acBonus: 13, armorType: "medium", stealthDisadvantage: false, strengthRequirement: 0, maxDexBonus: 2 }, consumable: false, stackable: false, slot: "armor" },
  { name: "Scale Mail",      type: "armor", description: "Overlapping metal scales.", value: 50,   weight: 45, rarity: "common", armor: { acBonus: 14, armorType: "medium", stealthDisadvantage: true, strengthRequirement: 0, maxDexBonus: 2 }, consumable: false, stackable: false, slot: "armor" },
  { name: "Chain Mail",      type: "armor", description: "Heavy interlocking rings.", value: 75,   weight: 55, rarity: "common", armor: { acBonus: 16, armorType: "heavy", stealthDisadvantage: true, strengthRequirement: 13, maxDexBonus: 0 }, consumable: false, stackable: false, slot: "armor" },
  { name: "Plate Armor",     type: "armor", description: "Full plate of shaped steel.", value: 1500, weight: 65, rarity: "common", armor: { acBonus: 18, armorType: "heavy", stealthDisadvantage: true, strengthRequirement: 15, maxDexBonus: 0 }, consumable: false, stackable: false, slot: "armor" },
  { name: "Shield",          type: "armor", description: "A wooden or metal shield.", value: 10,   weight: 6,  rarity: "common", armor: { acBonus: 2, armorType: "shield", stealthDisadvantage: false, strengthRequirement: 0, maxDexBonus: null }, consumable: false, stackable: false, slot: "shield" },
];

const STANDARD_POTIONS: Omit<Item, "id">[] = [
  { name: "Potion of Healing",     type: "potion", description: "Restores 2d4+2 HP.", value: 50,  weight: 0.5, rarity: "common", consumable: true, stackable: true, magical: { name: "Healing", description: "Restores 2d4+2 HP.", requiresAttunement: false } },
  { name: "Potion of Greater Healing", type: "potion", description: "Restores 4d4+4 HP.", value: 150, weight: 0.5, rarity: "uncommon", consumable: true, stackable: true, magical: { name: "Greater Healing", description: "Restores 4d4+4 HP.", requiresAttunement: false } },
  { name: "Potion of Superior Healing", type: "potion", description: "Restores 8d4+8 HP.", value: 500, weight: 0.5, rarity: "rare", consumable: true, stackable: true, magical: { name: "Superior Healing", description: "Restores 8d4+8 HP.", requiresAttunement: false } },
];

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let nextItemId = 1;
function generateItemId(): string {
  return `item_${nextItemId++}_${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// InventoryManager
// ---------------------------------------------------------------------------

export class InventoryManager {
  private items: Map<string, Item> = new Map();
  private inventories: Map<string, InventoryEntry[]> = new Map(); // keyed by character ID
  private attunedItems: Map<string, Set<string>> = new Map();     // characterId -> set of itemIds
  private dice = new DiceRoller();

  constructor() {
    this.seedStandardItems();
  }

  // -----------------------------------------------------------------------
  // Catalog
  // -----------------------------------------------------------------------

  /** Load standard weapons, armor, and potions into the item catalog. */
  private seedStandardItems(): void {
    for (const template of [...STANDARD_WEAPONS, ...STANDARD_ARMOR, ...STANDARD_POTIONS]) {
      const item: Item = { ...template, id: generateItemId() };
      this.items.set(item.id, item);
    }
  }

  /** Create a custom item and add it to the catalog. */
  createItem(template: Omit<Item, "id">): Item {
    const item: Item = { ...template, id: generateItemId() };
    this.items.set(item.id, item);
    return item;
  }

  /** Get an item by ID. */
  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  /** Find items by name (case-insensitive partial match). */
  findItems(name: string): Item[] {
    const lower = name.toLowerCase();
    return [...this.items.values()].filter((i) => i.name.toLowerCase().includes(lower));
  }

  /** Get all items of a given type. */
  getItemsByType(type: ItemType): Item[] {
    return [...this.items.values()].filter((i) => i.type === type);
  }

  // -----------------------------------------------------------------------
  // Inventory operations
  // -----------------------------------------------------------------------

  /** Add an item to a character's inventory. */
  add(characterId: string, item: Item, quantity = 1): InventoryEntry {
    if (!this.inventories.has(characterId)) {
      this.inventories.set(characterId, []);
    }
    const inv = this.inventories.get(characterId)!;

    // Stack if possible
    if (item.stackable) {
      const existing = inv.find((e) => e.item.id === item.id);
      if (existing) {
        existing.quantity += quantity;
        return existing;
      }
    }

    const entry: InventoryEntry = { item, quantity, equipped: false };
    inv.push(entry);
    return entry;
  }

  /** Remove items from a character's inventory. Returns false if not enough. */
  remove(characterId: string, itemId: string, quantity = 1): boolean {
    const inv = this.inventories.get(characterId);
    if (!inv) return false;

    const idx = inv.findIndex((e) => e.item.id === itemId);
    if (idx === -1) return false;

    const entry = inv[idx];
    if (entry.quantity < quantity) return false;

    entry.quantity -= quantity;
    if (entry.quantity <= 0) {
      // Unequip if necessary
      if (entry.equipped) {
        this.unequip(characterId, itemId);
      }
      inv.splice(idx, 1);
    }

    return true;
  }

  /** Equip an item to its designated slot. Unequips any existing item in that slot. */
  equip(characterId: string, itemId: string): boolean {
    const inv = this.inventories.get(characterId);
    if (!inv) return false;

    const entry = inv.find((e) => e.item.id === itemId);
    if (!entry) return false;

    const slot = entry.item.slot;
    if (!slot) return false;

    // Unequip current item in that slot
    const currentEquipped = inv.find((e) => e.equipped && e.item.slot === slot);
    if (currentEquipped) {
      currentEquipped.equipped = false;
    }

    entry.equipped = true;

    // Handle attunement for magical items
    if (entry.item.magical?.requiresAttunement) {
      if (!this.attunedItems.has(characterId)) {
        this.attunedItems.set(characterId, new Set());
      }
      const attuned = this.attunedItems.get(characterId)!;
      if (attuned.size < 3) {
        attuned.add(itemId);
      }
    }

    return true;
  }

  /** Unequip an item. */
  unequip(characterId: string, itemId: string): boolean {
    const inv = this.inventories.get(characterId);
    if (!inv) return false;

    const entry = inv.find((e) => e.item.id === itemId);
    if (!entry || !entry.equipped) return false;

    entry.equipped = false;

    // Remove attunement
    const attuned = this.attunedItems.get(characterId);
    if (attuned) {
      attuned.delete(itemId);
    }

    return true;
  }

  // -----------------------------------------------------------------------
  // Use consumables
  // -----------------------------------------------------------------------

  /**
   * Use a consumable item (potion, scroll). Returns the effect description
   * and any mechanical result.
   */
  use(characterId: string, itemId: string): { success: boolean; effect: string; value?: number } {
    const inv = this.inventories.get(characterId);
    if (!inv) return { success: false, effect: "No inventory found." };

    const entry = inv.find((e) => e.item.id === itemId);
    if (!entry) return { success: false, effect: "Item not in inventory." };
    if (!entry.item.consumable) return { success: false, effect: "Item is not consumable." };

    const item = entry.item;

    // Resolve potion healing
    if (item.type === "potion" && item.magical) {
      const healingRoll = this.resolvePotionHealing(item);
      this.remove(characterId, itemId);
      return { success: true, effect: item.magical.description, value: healingRoll };
    }

    // Generic consumable
    this.remove(characterId, itemId);
    return { success: true, effect: item.description };
  }

  private resolvePotionHealing(item: Item): number {
    const desc = item.magical?.description ?? "";
    const match = desc.match(/(\d+)d(\d+)\+(\d+)/);
    if (match) {
      const roll = this.dice.roll(`${match[1]}d${match[2]}`);
      return roll.total + parseInt(match[3], 10);
    }
    return 0;
  }

  // -----------------------------------------------------------------------
  // Weight and encumbrance
  // -----------------------------------------------------------------------

  /** Get total carried weight for a character. */
  getWeight(characterId: string): number {
    const inv = this.inventories.get(characterId);
    if (!inv) return 0;

    return inv.reduce((total, entry) => total + entry.item.weight * entry.quantity, 0);
  }

  /** Get encumbrance level: none, encumbered, heavily encumbered. */
  getEncumbrance(characterId: string, strengthScore: number): "none" | "encumbered" | "heavily-encumbered" {
    const weight = this.getWeight(characterId);
    const encumberedThreshold = strengthScore * 5;
    const heavilyThreshold = strengthScore * 10;

    if (weight >= heavilyThreshold) return "heavily-encumbered";
    if (weight >= encumberedThreshold) return "encumbered";
    return "none";
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get all items in a character's inventory. */
  getInventory(characterId: string): InventoryEntry[] {
    return [...(this.inventories.get(characterId) ?? [])];
  }

  /** Get only equipped items. */
  getEquipped(characterId: string): InventoryEntry[] {
    return this.getInventory(characterId).filter((e) => e.equipped);
  }

  /** Get attuned items for a character. */
  getAttuned(characterId: string): Item[] {
    const attuned = this.attunedItems.get(characterId);
    if (!attuned) return [];
    return [...attuned].map((id) => this.items.get(id)).filter((i): i is Item => i !== undefined);
  }

  /** Calculate total AC for a character including equipped armor and shield. */
  calculateAc(characterId: string, dexterityScore: number): number {
    const equipped = this.getEquipped(characterId);
    let ac = 10;
    let dexMod = Math.floor((dexterityScore - 10) / 2);

    for (const entry of equipped) {
      const armor = entry.item.armor;
      if (!armor) continue;

      if (armor.armorType === "shield") {
        ac += armor.acBonus;
      } else {
        ac = armor.acBonus;
        if (armor.maxDexBonus !== null && armor.maxDexBonus !== undefined) {
          dexMod = Math.min(dexMod, armor.maxDexBonus);
        }
      }

      // Magical AC bonus
      if (entry.item.magical?.acBonus) {
        ac += entry.item.magical.acBonus;
      }
    }

    return ac + dexMod;
  }

  // -----------------------------------------------------------------------
  // Item comparison
  // -----------------------------------------------------------------------

  /** Compare two items and return a recommendation. */
  compare(item1: Item, item2: Item): ItemComparison {
    const result: ItemComparison = {
      item1,
      item2,
      weightDifference: item2.weight - item1.weight,
      valueDifference: item2.value - item1.value,
      recommendation: "",
    };

    if (item1.weapon && item2.weapon) {
      const roll1 = this.dice.roll(item1.weapon.damageDice);
      const roll2 = this.dice.roll(item2.weapon.damageDice);
      result.damageDifference = roll2.total - roll1.total;
      result.recommendation = roll2.total > roll1.total
        ? `${item2.name} deals more damage on average.`
        : roll1.total > roll2.total
          ? `${item1.name} deals more damage on average.`
          : "Both weapons deal comparable damage.";
    } else if (item1.armor && item2.armor) {
      result.acDifference = item2.armor.acBonus - item1.armor.acBonus;
      result.recommendation = result.acDifference > 0
        ? `${item2.name} provides better AC.`
        : result.acDifference < 0
          ? `${item1.name} provides better AC.`
          : "Both provide the same AC.";
    } else {
      result.recommendation = "Items are not directly comparable (different types).";
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Currency / Gold
  // -----------------------------------------------------------------------

  private wallets: Map<string, { gold: number; silver: number; copper: number }> = new Map();

  /** Get or create a wallet for a character. */
  getWallet(characterId: string): { gold: number; silver: number; copper: number } {
    if (!this.wallets.has(characterId)) {
      this.wallets.set(characterId, { gold: 0, silver: 0, copper: 0 });
    }
    return this.wallets.get(characterId)!;
  }

  /** Add gold (converts from silver/copper automatically). */
  addGold(characterId: string, gold: number, silver = 0, copper = 0): number {
    const wallet = this.getWallet(characterId);
    wallet.gold += gold;
    wallet.silver += silver;
    wallet.copper += copper;
    // Auto-convert: 100 copper = 10 silver = 1 gold
    while (wallet.copper >= 100) { wallet.copper -= 100; wallet.silver += 10; }
    while (wallet.silver >= 10) { wallet.silver -= 10; wallet.gold += 1; }
    return wallet.gold;
  }

  /** Spend gold. Returns true if sufficient funds. */
  spendGold(characterId: string, gold: number): boolean {
    const wallet = this.getWallet(characterId);
    const totalInCopper = wallet.gold * 100 + wallet.silver * 10 + wallet.copper;
    const costInCopper = gold * 100;
    if (totalInCopper < costInCopper) return false;

    let remaining = costInCopper;
    // Spend copper first, then silver, then gold
    const copperSpent = Math.min(wallet.copper, remaining);
    wallet.copper -= copperSpent;
    remaining -= copperSpent;
    const silverSpent = Math.min(wallet.silver * 10, remaining);
    wallet.silver -= Math.ceil(silverSpent / 10);
    remaining -= silverSpent;
    wallet.gold -= remaining / 100;
    wallet.gold = Math.round(wallet.gold * 100) / 100; // avoid floating point
    return true;
  }

  /** Get total value in gold pieces. */
  getTotalGold(characterId: string): number {
    const w = this.getWallet(characterId);
    return w.gold + w.silver / 10 + w.copper / 100;
  }

  // -----------------------------------------------------------------------
  // Item Identification
  // -----------------------------------------------------------------------

  private identifiedItems: Map<string, Set<string>> = new Map(); // characterId -> set of known item IDs

  /** Check if a character has identified an item. */
  isIdentified(characterId: string, itemId: string): boolean {
    // Common items are always identified
    const item = this.items.get(itemId);
    if (!item) return true;
    if (item.rarity === "common") return true;
    if (!item.magical) return true;

    const known = this.identifiedItems.get(characterId);
    return known?.has(itemId) ?? false;
  }

  /** Identify a magical item (requires Identify spell or short rest study). */
  identifyItem(characterId: string, itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;
    if (item.rarity === "common" || !item.magical) return true;

    if (!this.identifiedItems.has(characterId)) {
      this.identifiedItems.set(characterId, new Set());
    }
    this.identifiedItems.get(characterId)!.add(itemId);
    return true;
  }

  /** Get the unidentified description of a magical item. */
  getUnidentifiedDescription(itemId: string): string {
    const item = this.items.get(itemId);
    if (!item || !item.magical) return item?.description ?? "Unknown item.";

    const rarityHint: Record<Rarity, string> = {
      common: "a faintly glimmering",
      uncommon: "a softly glowing",
      rare: "a brightly gleaming",
      "very-rare": "a pulsing, radiant",
      legendary: "an overwhelmingly brilliant",
      artifact: "an unfathomable, reality-warping",
    };
    return `This appears to be ${rarityHint[item.rarity]} ${item.type}. Its true nature is unknown until identified.`;
  }

  // -----------------------------------------------------------------------
  // Drop / Give / Trade
  // -----------------------------------------------------------------------

  /** Drop an item from inventory (leaves it on the ground at current location). */
  drop(characterId: string, itemId: string, quantity = 1): { success: boolean; item?: Item; description: string } {
    const removed = this.remove(characterId, itemId, quantity);
    const item = this.items.get(itemId);
    if (!removed) return { success: false, description: "You don't have that item." };
    return { success: true, item, description: `Dropped ${quantity}x ${item?.name ?? "item"}.` };
  }

  /** Give an item to another character. */
  give(fromCharacterId: string, toCharacterId: string, itemId: string, quantity = 1): { success: boolean; description: string } {
    const item = this.items.get(itemId);
    if (!item) return { success: false, description: "Item doesn't exist." };

    const removed = this.remove(fromCharacterId, itemId, quantity);
    if (!removed) return { success: false, description: "You don't have that item." };

    // Create a new instance of the item for the recipient
    const newItem: Item = { ...item, id: generateItemId() };
    this.items.set(newItem.id, newItem);
    this.add(toCharacterId, newItem, quantity);

    return { success: true, description: `Gave ${quantity}x ${item.name} to recipient.` };
  }

  /** Trade an item for gold. */
  sell(characterId: string, itemId: string, quantity = 1, sellPriceMultiplier = 0.5): { success: boolean; goldReceived: number; description: string } {
    const item = this.items.get(itemId);
    if (!item) return { success: false, goldReceived: 0, description: "Item doesn't exist." };

    const removed = this.remove(characterId, itemId, quantity);
    if (!removed) return { success: false, goldReceived: 0, description: "You don't have that item." };

    const goldReceived = Math.floor(item.value * sellPriceMultiplier * quantity);
    this.addGold(characterId, goldReceived);

    return { success: true, goldReceived, description: `Sold ${quantity}x ${item.name} for ${goldReceived} gp.` };
  }

  /** Buy an item from a shop (costs gold). */
  buy(characterId: string, itemId: string, quantity = 1): { success: boolean; goldSpent: number; description: string } {
    const item = this.items.get(itemId);
    if (!item) return { success: false, goldSpent: 0, description: "Item not available." };

    const totalCost = item.value * quantity;
    const afforded = this.spendGold(characterId, totalCost);
    if (!afforded) return { success: false, goldSpent: 0, description: `Not enough gold. Need ${totalCost} gp.` };

    const newItem: Item = { ...item, id: generateItemId() };
    this.items.set(newItem.id, newItem);
    this.add(characterId, newItem, quantity);

    return { success: true, goldSpent: totalCost, description: `Bought ${quantity}x ${item.name} for ${totalCost} gp.` };
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      items: Array.from(this.items.entries()),
      inventories: Array.from(this.inventories.entries()).map(([k, v]) => [k, v]),
      attunedItems: Array.from(this.attunedItems.entries()).map(([k, v]) => [k, [...v]]),
      wallets: Array.from(this.wallets.entries()),
      identifiedItems: Array.from(this.identifiedItems.entries()).map(([k, v]) => [k, [...v]]),
      nextItemId,
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.items = new Map(parsed.items);
    this.inventories = new Map(parsed.inventories);
    this.attunedItems = new Map(
      parsed.attunedItems.map(([k, v]: [string, string[]]) => [k, new Set(v)])
    );
    this.wallets = new Map(parsed.wallets ?? []);
    this.identifiedItems = new Map(
      (parsed.identifiedItems ?? []).map(([k, v]: [string, string[]]) => [k, new Set(v)])
    );
    nextItemId = parsed.nextItemId ?? this.items.size + 1;
  }
}
