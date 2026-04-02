/**
 * @file src/game/economy-system.ts
 * @description D&D 5e Economy, Shops, Trading, and Crafting System for DMLog.ai
 */

export interface ShopItem {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
  rarity: string;
  description: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  keeper: string;
  keeperPersonality: string;
  items: ShopItem[];
  buyMultiplier: number;
  sellMultiplier: number;
  specialty: string;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'craft';
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  partyGold: number;
  date: number;
  itemType?: string; // Extended for category tracking
}

export interface CraftingRecipe {
  id: string;
  name: string;
  cost: number;
  type: string;
}

export class EconomySystem {
  private shops = new Map<string, Shop>();
  private transactions: Transaction[] = [];
  private partyGold = 100;

  constructor() {
    this.prePopulateShops();
  }

  /**
   * Pre-populates the economy with 8 distinct shops and initial inventories.
   */
  private prePopulateShops(): void {
    const defaultShops: Shop[] = [
      {
        id: 'shop_general', name: 'Barthen\'s Provisions', location: 'Town Square', keeper: 'Elmar Barthen', keeperPersonality: 'Friendly', specialty: 'basic goods', buyMultiplier: 1.0, sellMultiplier: 0.5,
        items: [
          { id: 'item_rations', name: 'Rations (1 day)', type: 'Adventuring Gear', price: 0.5, quantity: 50, rarity: 'Common', description: 'Basic travel food.' },
          { id: 'item_rope', name: 'Hempen Rope (50 ft)', type: 'Adventuring Gear', price: 1, quantity: 10, rarity: 'Common', description: 'Sturdy rope.' }
        ]
      },
      {
        id: 'shop_blacksmith', name: 'The Smoldering Anvil', location: 'Market District', keeper: 'Thorek Ironjaw', keeperPersonality: 'Gruff', specialty: 'weapons, armor', buyMultiplier: 1.2, sellMultiplier: 0.6,
        items: [
          { id: 'item_longsword', name: 'Longsword', type: 'Weapon', price: 15, quantity: 5, rarity: 'Common', description: 'Versatile slashing weapon.' },
          { id: 'item_chainmail', name: 'Chain Mail', type: 'Armor', price: 75, quantity: 2, rarity: 'Common', description: 'Heavy armor.' }
        ]
      },
      {
        id: 'shop_magic', name: 'Mystic Aura', location: 'Mage Quarter', keeper: 'Xanath', keeperPersonality: 'Eccentric', specialty: 'scrolls, potions, wands', buyMultiplier: 1.5, sellMultiplier: 0.4,
        items: [
          { id: 'item_pot_heal', name: 'Potion of Healing', type: 'Potion', price: 50, quantity: 10, rarity: 'Uncommon', description: 'Restores 2d4+2 HP.' },
          { id: 'item_scr_missile', name: 'Scroll of Magic Missile', type: 'Scroll', price: 100, quantity: 3, rarity: 'Uncommon', description: 'Casts Magic Missile at 1st level.' }
        ]
      },
      {
        id: 'shop_apothecary', name: 'Nature\'s Bounty', location: 'Outskirts', keeper: 'Elara', keeperPersonality: 'Calm', specialty: 'healing items, herbs', buyMultiplier: 1.1, sellMultiplier: 0.5,
        items: [
          { id: 'item_antitoxin', name: 'Antitoxin', type: 'Consumable', price: 50, quantity: 5, rarity: 'Uncommon', description: 'Advantage on saving throws against poison.' },
          { id: 'item_healer_kit', name: 'Healer\'s Kit', type: 'Adventuring Gear', price: 5, quantity: 8, rarity: 'Common', description: 'Stabilize a dying creature.' }
        ]
      },
      {
        id: 'shop_tavern', name: 'The Prancing Pony', location: 'Crossroads', keeper: 'Barliman', keeperPersonality: 'Hasty', specialty: 'food, drink, rumors', buyMultiplier: 1.0, sellMultiplier: 0.1,
        items: [
          { id: 'item_ale', name: 'Mug of Ale', type: 'Food/Drink', price: 0.04, quantity: 100, rarity: 'Common', description: 'A frothy mug of local ale.' },
          { id: 'item_stew', name: 'Bowl of Stew', type: 'Food/Drink', price: 0.1, quantity: 30, rarity: 'Common', description: 'Hearty meat and potato stew.' }
        ]
      },
      {
        id: 'shop_fence', name: 'Shadow\'s Edge', location: 'Alleyway', keeper: 'Sly', keeperPersonality: 'Paranoid', specialty: 'stolen goods, rare items', buyMultiplier: 1.3, sellMultiplier: 0.7,
        items: [
          { id: 'item_thieves_tools', name: 'Thieves\' Tools', type: 'Tools', price: 25, quantity: 2, rarity: 'Common', description: 'Picks and files for locks and traps.' },
          { id: 'item_poison', name: 'Basic Poison', type: 'Poison', price: 100, quantity: 3, rarity: 'Uncommon', description: 'Coats a weapon to deal extra damage.' }
        ]
      },
      {
        id: 'shop_noble', name: 'Silken Threads', location: 'High District', keeper: 'Lady Vesper', keeperPersonality: 'Snobby', specialty: 'fine clothing, jewelry', buyMultiplier: 2.0, sellMultiplier: 0.3,
        items: [
          { id: 'item_fine_clothes', name: 'Fine Clothes', type: 'Clothing', price: 15, quantity: 4, rarity: 'Common', description: 'High-quality attire for nobles.' },
          { id: 'item_signet_ring', name: 'Signet Ring', type: 'Jewelry', price: 5, quantity: 6, rarity: 'Common', description: 'Used to seal official documents.' }
        ]
      },
      {
        id: 'shop_exotic', name: 'Far Reaches', location: 'Docks', keeper: 'Hassan', keeperPersonality: 'Charismatic', specialty: 'imported goods, curiosities', buyMultiplier: 1.4, sellMultiplier: 0.6,
        items: [
          { id: 'item_silk', name: 'Square of Silk', type: 'Trade Good', price: 10, quantity: 20, rarity: 'Common', description: 'Fine imported fabric.' },
          { id: 'item_spyglass', name: 'Spyglass', type: 'Adventuring Gear', price: 1000, quantity: 1, rarity: 'Rare', description: 'Magnifies objects seen through it.' }
        ]
      }
    ];

    for (const shop of defaultShops) {
      this.createShop(shop);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  // 1. createShop
  public createShop(data: Omit<Shop, 'id'> & { id?: string }): Shop {
    const newShop: Shop = {
      id: data.id || `shop_${this.generateId()}`,
      name: data.name,
      location: data.location,
      keeper: data.keeper,
      keeperPersonality: data.keeperPersonality,
      items: data.items || [],
      buyMultiplier: data.buyMultiplier,
      sellMultiplier: data.sellMultiplier,
      specialty: data.specialty
    };
    this.shops.set(newShop.id, newShop);
    return newShop;
  }

  // 2. getShop
  public getShop(id: string): Shop {
    const shop = this.shops.get(id);
    if (!shop) throw new Error(`Shop with ID ${id} not found.`);
    return shop;
  }

  // 3. addItem
  public addItem(shopId: string, item: ShopItem): void {
    const shop = this.getShop(shopId);
    const existing = shop.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      shop.items.push(item);
    }
  }

  // 4. removeItem
  public removeItem(shopId: string, itemId: string): void {
    const shop = this.getShop(shopId);
    shop.items = shop.items.filter(i => i.id !== itemId);
  }

  // 5. buyItem
  public buyItem(shopId: string, itemId: string, qty: number): Transaction {
    const shop = this.getShop(shopId);
    const item = shop.items.find(i => i.id === itemId);
    
    if (!item) throw new Error('Item not found in shop.');
    if (item.quantity < qty) throw new Error('Not enough stock available.');
    
    const unitPrice = item.price * shop.buyMultiplier;
    const totalCost = unitPrice * qty;
    
    if (this.partyGold < totalCost) throw new Error('Not enough gold.');
    
    this.partyGold -= totalCost;
    item.quantity -= qty;
    
    const transaction: Transaction = {
      id: `tx_${this.generateId()}`,
      type: 'buy',
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      price: totalCost,
      partyGold: this.partyGold,
      date: Date.now(),
      itemType: item.type
    };
    
    this.transactions.push(transaction);
    return transaction;
  }

  // 6. sellItem
  public sellItem(shopId: string, itemId: string, qty: number): Transaction {
    const shop = this.getShop(shopId);
    let item = shop.items.find(i => i.id === itemId);
    
    // If the shop doesn't carry it, we can't easily determine base price without a global DB.
    // For this system, we assume the item must exist in the shop's catalog (even at 0 qty).
    if (!item) throw new Error('This shop does not trade in this item.');
    
    const unitPrice = item.price * shop.sellMultiplier;
    const totalRevenue = unitPrice * qty;
    
    this.partyGold += totalRevenue;
    item.quantity += qty;
    
    const transaction: Transaction = {
      id: `tx_${this.generateId()}`,
      type: 'sell',
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      price: totalRevenue,
      partyGold: this.partyGold,
      date: Date.now(),
      itemType: item.type
    };
    
    this.transactions.push(transaction);
    return transaction;
  }

  // 7. getPartyGold
  public getPartyGold(): number {
    return this.partyGold;
  }

  // 8. setPartyGold
  public setPartyGold(amount: number): void {
    this.partyGold = Math.max(0, amount);
  }

  // 9. craftItem
  public craftItem(recipe: CraftingRecipe, materials: string[]): Transaction {
    if (this.partyGold < recipe.cost) {
      throw new Error('Not enough gold to cover crafting costs.');
    }
    
    this.partyGold -= recipe.cost;
    
    const transaction: Transaction = {
      id: `tx_${this.generateId()}`,
      type: 'craft',
      itemId: recipe.id,
      itemName: recipe.name,
      quantity: 1,
      price: recipe.cost,
      partyGold: this.partyGold,
      date: Date.now(),
      itemType: recipe.type
    };
    
    this.transactions.push(transaction);
    return transaction;
  }

  // 10. getTransactionHistory
  public getTransactionHistory(days?: number): Transaction[] {
    if (!days) return [...this.transactions];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.transactions.filter(tx => tx.date >= cutoff);
  }

  // 11. getSpendingByCategory
  public getSpendingByCategory(): Map<string, number> {
    const spending = new Map<string, number>();
    
    for (const tx of this.transactions) {
      if (tx.type === 'buy' || tx.type === 'craft') {
        const category = tx.itemType || 'Miscellaneous';
        const current = spending.get(category) || 0;
        spending.set(category, current + tx.price);
      }
    }
    
    return spending;
  }

  // 12. getIncomeVsExpense
  public getIncomeVsExpense(days: number): { income: number; expense: number; net: number } {
    const history = this.getTransactionHistory(days);
    let income = 0;
    let expense = 0;
    
    for (const tx of history) {
      if (tx.type === 'sell') income += tx.price;
      if (tx.type === 'buy' || tx.type === 'craft') expense += tx.price;
    }
    
    return { income, expense, net: income - expense };
  }

  // 13. getShopInventory
  public getShopInventory(shopId: string): ShopItem[] {
    return this.getShop(shopId).items;
  }

  // 14. searchShops
  public searchShops(itemName: string): Array<{ shop: string; item: ShopItem; price: number }> {
    const results: Array<{ shop: string; item: ShopItem; price: number }> = [];
    const query = itemName.toLowerCase();
    
    for (const shop of this.shops.values()) {
      for (const item of shop.items) {
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            shop: shop.name,
            item,
            price: item.price * shop.buyMultiplier
          });
        }
      }
    }
    return results;
  }

  // 15. getBestPrice
  public getBestPrice(itemName: string, type: 'buy' | 'sell'): { shop: string; price: number } {
    const matches = this.searchShops(itemName);
    if (matches.length === 0) throw new Error('Item not found in any shop.');
    
    let bestShop = '';
    let bestPrice = type === 'buy' ? Infinity : -Infinity;
    
    for (const match of matches) {
      const shop = Array.from(this.shops.values()).find(s => s.name === match.shop)!;
      const effectivePrice = type === 'buy' 
        ? match.item.price * shop.buyMultiplier 
        : match.item.price * shop.sellMultiplier;
        
      if (type === 'buy' && effectivePrice < bestPrice) {
        bestPrice = effectivePrice;
        bestShop = shop.name;
      } else if (type === 'sell' && effectivePrice > bestPrice) {
        bestPrice = effectivePrice;
        bestShop = shop.name;
      }
    }
    
    return { shop: bestShop, price: bestPrice };
  }

  // 16. restockShop
  public restockShop(shopId: string): void {
    const shop = this.getShop(shopId);
    for (const item of shop.items) {
      // Add 1 to 5 items randomly to simulate restocking
      item.quantity += Math.floor(Math.random() * 5) + 1;
    }
  }

  // 17. generatePrice
  public generatePrice(itemName: string, rarity: string): number {
    const basePrices: Record<string, number> = {
      'common': 10,
      'uncommon': 100,
      'rare': 1000,
      'very rare': 10000,
      'legendary': 50000
    };
    
    const base = basePrices[rarity.toLowerCase()] || 10;
    // Add a slight random variance (-10% to +10%)
    const variance = 1 + ((Math.random() * 0.2) - 0.1);
    return Math.round(base * variance);
  }

  // 18. getWealthLevel
  public getWealthLevel(): string {
    if (this.partyGold < 10) return 'Dirt Poor';
    if (this.partyGold < 100) return 'Poor';
    if (this.partyGold < 1000) return 'Modest';
    if (this.partyGold < 5000) return 'Comfortable';
    if (this.partyGold < 10000) return 'Wealthy';
    return 'Lavish';
  }

  // 19. getEconomySummary
  public getEconomySummary(): string {
    const { income, expense } = this.getIncomeVsExpense(36500); // All time roughly
    return `Party Wealth: ${this.partyGold.toFixed(2)} gp (${this.getWealthLevel()}). ` +
           `Total Earned: ${income.toFixed(2)} gp. Total Spent: ${expense.toFixed(2)} gp. ` +
           `Active Shops: ${this.shops.size}.`;
  }

  // 20. serialize / deserialize
  public serialize(): string {
    const data = {
      shops: Array.from(this.shops.entries()),
      transactions: this.transactions,
      partyGold: this.partyGold
    };
    return JSON.stringify(data);
  }

  public deserialize(dataString: string): void {
    try {
      const data = JSON.parse(dataString);
      this.shops = new Map(data.shops);
      this.transactions = data.transactions || [];
      this.partyGold = data.partyGold || 0;
    } catch (e) {
      throw new Error('Failed to deserialize economy data.');
    }
  }
}