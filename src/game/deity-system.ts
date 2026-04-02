export interface Deity {
  id: string;
  name: string;
  title: string;
  alignment: string;
  domains: string[];
  symbol: string;
  holyDay: string;
  followers: string;
  dogma: string;
  favoredWeapon: string;
  avatar: string;
  miracles: string[];
  enemyDeities: string[];
  allyDeities: string[];
}

export interface DivineFavor {
  deityId: string;
  favor: number; // -100 to 100
  boons: string[];
  wrath: string;
  oaths: string[];
  answeredPrayers: number;
  level: number; // 0: Apostate, 1: Forsaken, 2: Neutral, 3: Acolyte, 4: Devout, 5: Champion
}

export class DeitySystem {
  private deities = new Map<string, Deity>();
  private favors = new Map<string, DivineFavor>();

  constructor() {
    this.initializeDeities();
  }

  private initializeDeities(): void {
    const pantheon: Deity[] = [
      { id: 'ao', name: 'Ao', title: 'The Overgod', alignment: 'N', domains: ['Nature', 'All'], symbol: 'Tablets of Fate', holyDay: 'None', followers: 'None', dogma: 'Maintain the cosmic balance. Do not interfere unless the pantheon is threatened.', favoredWeapon: 'None', avatar: 'Giant face in the sky', miracles: ['Cosmic Realignment'], enemyDeities: [], allyDeities: [] },
      { id: 'selune', name: 'Selûne', title: 'Our Lady of Silver', alignment: 'CG', domains: ['Moon', 'Life', 'Twilight'], symbol: 'Pair of female eyes surrounded by seven silver stars', holyDay: 'Feast of the Moon', followers: 'Navigators, lycanthropes, female spellcasters', dogma: 'Let all on whom my light falls be welcome. Guide those who are lost.', favoredWeapon: 'Heavy Mace', avatar: 'Radiant woman with long white hair', miracles: ['Moonfire', 'Lunar Healing'], enemyDeities: ['shar'], allyDeities: ['mystra', 'lathander'] },
      { id: 'corellon', name: 'Corellon Larethian', title: 'Creator of the Elves', alignment: 'CG', domains: ['Arcana', 'Light', 'Life'], symbol: 'Crescent moon', holyDay: 'Shieldmeet', followers: 'Elves, half-elves, bards', dogma: 'Protect the elven race. Cultivate beauty, magic, and the arts.', favoredWeapon: 'Longsword', avatar: 'Androgynous elven warrior', miracles: ['Starfall', 'Elven High Magic'], enemyDeities: ['lolth', 'bane'], allyDeities: ['mystra', 'selune', 'oghma'] },
      { id: 'moradin', name: 'Moradin', title: 'The Soul Forger', alignment: 'LG', domains: ['Forge', 'Knowledge'], symbol: 'Flaming anvil', holyDay: 'High Forging', followers: 'Dwarves, smiths, artisans', dogma: 'Honor your ancestors. Forge your body and soul with the same care as your weapons.', favoredWeapon: 'Warhammer', avatar: 'Massive dwarf with a glowing beard', miracles: ['Earthquake', 'Perfect Forging'], enemyDeities: ['lolth'], allyDeities: ['helm', 'tyr'] },
      { id: 'sune', name: 'Sune', title: 'Lady Firehair', alignment: 'CG', domains: ['Light', 'Life'], symbol: 'Face of a beautiful red-haired woman', holyDay: 'Greengrass', followers: 'Lovers, artists, nobles', dogma: 'Love is the greatest of all forces. Cultivate beauty in all things.', favoredWeapon: 'Whip', avatar: 'Stunningly beautiful red-haired woman', miracles: ['Aura of Awe', 'True Resurrection'], enemyDeities: ['shar'], allyDeities: ['selune', 'lathander', 'tymora'] },
      { id: 'tymora', name: 'Tymora', title: 'Lady Luck', alignment: 'CG', domains: ['Trickery'], symbol: 'Face-up coin', holyDay: 'Midsummer', followers: 'Adventurers, gamblers, rogues', dogma: 'Fortune favors the bold. Take risks and trust in your luck.', favoredWeapon: 'Coin (Shuriken)', avatar: 'Tomboyish woman with a mischievous grin', miracles: ['Fortunes Favor', 'Miraculous Escape'], enemyDeities: ['bane'], allyDeities: ['sune', 'lathander'] },
      { id: 'kelemvor', name: 'Kelemvor', title: 'Lord of the Dead', alignment: 'LN', domains: ['Death', 'Grave'], symbol: 'Upright skeletal arm holding balanced scales', holyDay: 'Feast of the Moon', followers: 'Undertakers, necromancers (white), mourners', dogma: 'Death is but part of life. Destroy the undead, for they are an abomination.', favoredWeapon: 'Bastard Sword', avatar: 'Stern warrior in dark chainmail', miracles: ['Mass True Resurrection', 'Banish Undead'], enemyDeities: ['shar', 'lolth'], allyDeities: ['mystra', 'helm'] },
      { id: 'tyr', name: 'Tyr', title: 'The Even-Handed', alignment: 'LG', domains: ['War', 'Order'], symbol: 'Balanced scales resting on a warhammer', holyDay: 'The Seeing Justice', followers: 'Paladins, judges, guards', dogma: 'Uphold the law. Punish the guilty and protect the innocent.', favoredWeapon: 'Longsword', avatar: 'Missing his right hand and blinded', miracles: ['Absolute Justice', 'Divine Smite'], enemyDeities: ['bane', 'lolth'], allyDeities: ['helm', 'moradin', 'lathander'] },
      { id: 'helm', name: 'Helm', title: 'The Watcher', alignment: 'LN', domains: ['Protection', 'Life', 'Twilight'], symbol: 'Staring eye with blue pupil on an upright gauntlet', holyDay: 'Ceremony of Honor', followers: 'Guards, paladins, mercenaries', dogma: 'Never betray a trust. Be vigilant and stand your ground.', favoredWeapon: 'Bastard Sword', avatar: 'Giant man in full plate armor', miracles: ['Impenetrable Ward', 'Mass Heal'], enemyDeities: ['bane', 'shar'], allyDeities: ['tyr', 'moradin'] },
      { id: 'lathander', name: 'Lathander', title: 'The Morninglord', alignment: 'NG', domains: ['Life', 'Light'], symbol: 'Sunrise made of rose, red, and yellow gems', holyDay: 'Midsummer', followers: 'Clerics, youth, athletes', dogma: 'Strive always to aid, to foster new hope, and to nurture new ideas.', favoredWeapon: 'Mace', avatar: 'Athletic young man in golden armor', miracles: ['Dawn\'s Light', 'Resurrection'], enemyDeities: ['shar', 'bane'], allyDeities: ['selune', 'sune', 'tyr'] },
      { id: 'shar', name: 'Shar', title: 'Mistress of the Night', alignment: 'NE', domains: ['Shadow', 'Death', 'Trickery'], symbol: 'Black disk with a deep purple border', holyDay: 'Feast of the Moon', followers: 'Assassins, illusionists, the bitter', dogma: 'Hope is a lie. Embrace the darkness and the void.', favoredWeapon: 'Chakram', avatar: 'Beautiful woman with raven hair and black eyes', miracles: ['Total Eclipse', 'Shadow Weave Mastery'], enemyDeities: ['selune', 'lathander', 'mystra'], allyDeities: ['bane'] },
      { id: 'bane', name: 'Bane', title: 'Lord of Darkness', alignment: 'LE', domains: ['War', 'Order', 'Evil'], symbol: 'Upright black right hand, thumb and fingers together', holyDay: 'The Black Rite', followers: 'Tyrants, conquerors, evil fighters', dogma: 'Rule with an iron fist. Crush the weak and subjugate the strong.', favoredWeapon: 'Morningstar', avatar: 'Dark, imposing armored figure', miracles: ['Mass Domination', 'Word of Death'], enemyDeities: ['tyr', 'helm', 'lathander'], allyDeities: ['shar', 'lolth'] },
      { id: 'lolth', name: 'Lolth', title: 'Queen of Spiders', alignment: 'CE', domains: ['Trickery', 'Death'], symbol: 'Black spider with female drow head', holyDay: 'None', followers: 'Drow, spiders, assassins', dogma: 'Fear is as strong as steel. Betrayal is the natural order.', favoredWeapon: 'Whip', avatar: 'Giant black widow spider or beautiful drow', miracles: ['Web of Death', 'Summon Demon Lords'], enemyDeities: ['corellon', 'selune'], allyDeities: ['bane'] },
      { id: 'mystra', name: 'Mystra', title: 'Mother of All Magic', alignment: 'NG', domains: ['Arcana', 'Knowledge'], symbol: 'Circle of seven blue-white stars with red mist flowing from the center', holyDay: 'None', followers: 'Wizards, sorcerers, sages', dogma: 'Magic is a gift. Use it wisely and protect the Weave.', favoredWeapon: 'Shuriken', avatar: 'Beautiful human woman with glowing blue eyes', miracles: ['Weave Restoration', 'Time Stop'], enemyDeities: ['shar'], allyDeities: ['selune', 'corellon', 'oghma'] },
      { id: 'oghma', name: 'Oghma', title: 'Lord of Knowledge', alignment: 'N', domains: ['Knowledge', 'Bards'], symbol: 'Blank scroll', holyDay: 'Midsummer', followers: 'Bards, scholars, inventors', dogma: 'Knowledge is power. Seek it out and preserve it.', favoredWeapon: 'Longsword', avatar: 'Wise old man with a white beard and a lute', miracles: ['Omniscience', 'Mass Suggestion'], enemyDeities: ['shar', 'bane'], allyDeities: ['mystra', 'corellon'] },
      { id: 'mielikki', name: 'Mielikki', title: 'Our Lady of the Forest', alignment: 'NG', domains: ['Nature', 'Rangers'], symbol: 'Gold-horned, blue-eyed unicorn\'s head', holyDay: 'Greengrass', followers: 'Rangers, druids, dryads', dogma: 'Protect the wild places. Live in harmony with nature.', favoredWeapon: 'Scimitar', avatar: 'Robust, beautiful woman in green and brown', miracles: ['Nature\'s Wrath', 'Mass Cure'], enemyDeities: ['bane', 'lolth'], allyDeities: ['selune', 'corellon'] }
    ];

    pantheon.forEach(d => this.deities.set(d.id, d));
  }

  // 1. getDeity
  public getDeity(id: string): Deity {
    const deity = this.deities.get(id);
    if (!deity) throw new Error(`Deity ${id} not found.`);
    return deity;
  }

  // 2. searchDeities
  public searchDeities(query: string): Deity[] {
    const q = query.toLowerCase();
    return Array.from(this.deities.values()).filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.title.toLowerCase().includes(q) || 
      d.domains.some(dom => dom.toLowerCase().includes(q))
    );
  }

  // 3. getByAlignment
  public getByAlignment(alignment: string): Deity[] {
    return Array.from(this.deities.values()).filter(d => d.alignment === alignment);
  }

  // 4. getByDomain
  public getByDomain(domain: string): Deity[] {
    const dLower = domain.toLowerCase();
    return Array.from(this.deities.values()).filter(d => 
      d.domains.some(dom => dom.toLowerCase() === dLower)
    );
  }

  // 5. followDeity
  public followDeity(characterId: string, deityId: string): DivineFavor {
    if (!this.deities.has(deityId)) throw new Error(`Deity ${deityId} not found.`);
    const favor: DivineFavor = {
      deityId,
      favor: 0,
      boons: [],
      wrath: '',
      oaths: [],
      answeredPrayers: 0,
      level: 2 // Neutral
    };
    this.favors.set(characterId, favor);
    return favor;
  }

  // 6. gainFavor
  public gainFavor(characterId: string, amount: number): void {
    const favor = this.getFavorRecord(characterId);
    favor.favor = Math.min(100, favor.favor + amount);
    this.updateFavorLevel(favor);
  }

  // 7. loseFavor
  public loseFavor(characterId: string, amount: number): void {
    const favor = this.getFavorRecord(characterId);
    favor.favor = Math.max(-100, favor.favor - amount);
    this.updateFavorLevel(favor);
  }

  // 8. pray
  public pray(characterId: string, request: string): { answered: boolean; result: string } {
    const favor = this.getFavorRecord(characterId);
    const deity = this.getDeity(favor.deityId);
    
    let chance = 0.01; // Base chance
    if (favor.level === 5) chance = 0.75; // Champion
    else if (favor.level === 4) chance = 0.40; // Devout
    else if (favor.level === 3) chance = 0.15; // Acolyte
    else if (favor.level < 2) chance = 0.0; // Forsaken/Apostate

    const answered = Math.random() < chance;
    if (answered) {
      favor.answeredPrayers++;
      return { answered: true, result: `${deity.name} has heard your plea: "${request}". A subtle miracle manifests.` };
    }
    return { answered: false, result: `Your prayers to ${deity.name} echo into the void.` };
  }

  // 9. getDivineIntervention
  public getDivineIntervention(characterId: string): string {
    const favor = this.getFavorRecord(characterId);
    const deity = this.getDeity(favor.deityId);
    
    if (favor.level >= 4) {
      const miracle = deity.miracles[Math.floor(Math.random() * deity.miracles.length)];
      return `The heavens part as ${deity.name} intervenes directly, unleashing ${miracle} upon the battlefield!`;
    } else if (favor.level <= 1) {
      return `${deity.name} turns their gaze upon you, but it is filled with disdain. No help arrives.`;
    }
    return `You feel a brief warmth from ${deity.name}, granting you a momentary surge of resolve.`;
  }

  // 10. getFavorLevel
  public getFavorLevel(characterId: string): string {
    const favor = this.getFavorRecord(characterId);
    const levels = ['Apostate', 'Forsaken', 'Neutral', 'Acolyte', 'Devout', 'Champion'];
    return levels[favor.level];
  }

  // 11. getBoons
  public getBoons(characterId: string): string[] {
    return this.getFavorRecord(characterId).boons;
  }

  // 12. getWrath
  public getWrath(characterId: string): string {
    return this.getFavorRecord(characterId).wrath;
  }

  // 13. breakOath
  public breakOath(characterId: string): void {
    const favor = this.getFavorRecord(characterId);
    const deity = this.getDeity(favor.deityId);
    this.loseFavor(characterId, 50);
    favor.oaths = [];
    favor.wrath = `Cursed by ${deity.name} for breaking a sacred oath.`;
  }

  // 14. makeOath
  public makeOath(characterId: string, oath: string): void {
    const favor = this.getFavorRecord(characterId);
    favor.oaths.push(oath);
    this.gainFavor(characterId, 5); // Small bump for devotion
  }

  // 15. getDeityDogma
  public getDeityDogma(deityId: string): string {
    return this.getDeity(deityId).dogma;
  }

  // 16. getHolyDays
  public getHolyDays(deityId: string): string {
    return this.getDeity(deityId).holyDay;
  }

  // 17. getMiracles
  public getMiracles(deityId: string): string[] {
    return this.getDeity(deityId).miracles;
  }

  // 18. getPantheon
  public getPantheon(): Deity[] {
    return Array.from(this.deities.values());
  }

  // 19. getDeityRivalries
  public getDeityRivalries(deityId: string): { enemies: string[]; allies: string[] } {
    const deity = this.getDeity(deityId);
    return { enemies: deity.enemyDeities, allies: deity.allyDeities };
  }

  // 20. serialize / deserialize
  public serialize(): string {
    return JSON.stringify(Array.from(this.favors.entries()));
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as [string, DivineFavor][];
      this.favors = new Map(parsed);
    } catch (e) {
      throw new Error("Failed to deserialize deity system data.");
    }
  }

  // --- Private Helpers ---
  private getFavorRecord(characterId: string): DivineFavor {
    const favor = this.favors.get(characterId);
    if (!favor) throw new Error(`Character ${characterId} does not follow a deity.`);
    return favor;
  }

  private updateFavorLevel(favor: DivineFavor): void {
    const f = favor.favor;
    if (f >= 90) favor.level = 5; // Champion
    else if (f >= 50) favor.level = 4; // Devout
    else if (f >= 20) favor.level = 3; // Acolyte
    else if (f >= -19) favor.level = 2; // Neutral
    else if (f >= -50) favor.level = 1; // Forsaken
    else favor.level = 0; // Apostate

    // Auto-manage boons based on level
    if (favor.level >= 4 && !favor.boons.includes('Divine Shield')) favor.boons.push('Divine Shield');
    if (favor.level >= 5 && !favor.boons.includes('Aura of the Chosen')) favor.boons.push('Aura of the Chosen');
    
    // Clear wrath if redeemed
    if (favor.level >= 2) favor.wrath = '';
  }
}