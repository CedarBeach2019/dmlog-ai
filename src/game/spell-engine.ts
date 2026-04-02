/**
 * DMLog.ai - D&D 5e Spellcasting System
 * src/game/spell-engine.ts
 */

// --- INTERFACES ---

/**
 * Represents a single D&D 5e spell.
 */
export interface Spell {
  id: string;
  name: string;
  level: number;
  school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
  castingTime: string;
  range: number; // in feet, 0 for self/touch
  components: {
    v: boolean;
    s: boolean;
    m: string | boolean;
  };
  duration: string;
  concentration: boolean;
  description: string;
  damage?: {
    dice: string; // e.g., "8d6", "1d4+1"
    type: string;
  };
  save?: {
    stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    dc?: number; // Can be calculated from caster
    halfOnSuccess: boolean;
  };
  aoe?: {
    shape: 'sphere' | 'cone' | 'cube' | 'line';
    size: number; // radius, length, etc. in feet
  };
  classes: string[];
}

/**
 * Represents the spell slots for a specific level.
 */
export interface SpellSlot {
  level: number;
  max: number;
  used: number;
}

/**
 * Represents a character capable of casting spells.
 */
export interface SpellCaster {
  id: string;
  name: string;
  class: string;
  level: number;
  spellAbility: 'INT' | 'WIS' | 'CHA';
  spellSaveDc: number;
  spellAttackMod: number;
  slots: SpellSlot[];
  knownSpells: string[]; // Array of spell IDs
}

// --- SPELL DATA ---

// Pre-populating with iconic D&D 5e spells.
const ALL_SPELLS_DATA: Spell[] = [
  // Cantrips (Level 0)
  { id: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'Evocation', castingTime: '1 action', range: 120, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'Hurl a mote of fire at a creature or object.', damage: { dice: '1d10', type: 'fire' }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'mage-hand', name: 'Mage Hand', level: 0, school: 'Conjuration', castingTime: '1 action', range: 30, components: { v: true, s: true, m: false }, duration: '1 minute', concentration: false, description: 'A spectral, floating hand appears at a point you choose within range.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'light', name: 'Light', level: 0, school: 'Evocation', castingTime: '1 action', range: 0, components: { v: true, s: false, m: 'a firefly or phosphorescent moss' }, duration: '1 hour', concentration: false, description: 'You touch one object and cause it to shed bright light in a 20-foot radius.', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'] },
  { id: 'prestidigitation', name: 'Prestidigitation', level: 0, school: 'Transmutation', castingTime: '1 action', range: 10, components: { v: true, s: true, m: false }, duration: 'Up to 1 hour', concentration: false, description: 'You create one of several minor magical effects.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'eldritch-blast', name: 'Eldritch Blast', level: 0, school: 'Evocation', castingTime: '1 action', range: 120, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'A beam of crackling energy streaks toward a creature within range.', damage: { dice: '1d10', type: 'force' }, classes: ['Warlock'] },
  // Level 1
  { id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'Evocation', castingTime: '1 action', range: 120, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range.', damage: { dice: '1d4+1', type: 'force' }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'shield', name: 'Shield', level: 1, school: 'Abjuration', castingTime: '1 reaction', range: 0, components: { v: true, s: true, m: false }, duration: '1 round', concentration: false, description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC.', classes: ['Sorcerer', 'Wizard'] },
  { id: 'sleep', name: 'Sleep', level: 1, school: 'Enchantment', castingTime: '1 action', range: 90, components: { v: true, s: true, m: 'a pinch of fine sand, rose petals, or a cricket' }, duration: '1 minute', concentration: false, description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect.', aoe: { shape: 'sphere', size: 20 }, classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'healing-word', name: 'Healing Word', level: 1, school: 'Evocation', castingTime: '1 bonus action', range: 60, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', classes: ['Bard', 'Cleric', 'Druid'] },
  { id: 'thunderwave', name: 'Thunderwave', level: 1, school: 'Evocation', castingTime: '1 action', range: 0, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'A wave of thunderous force sweeps out from you.', damage: { dice: '2d8', type: 'thunder' }, save: { stat: 'CON', halfOnSuccess: true }, aoe: { shape: 'cube', size: 15 }, classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'] },
  { id: 'bless', name: 'Bless', level: 1, school: 'Enchantment', castingTime: '1 action', range: 30, components: { v: true, s: true, m: 'a sprinkling of holy water' }, duration: 'Up to 1 minute', concentration: true, description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.', classes: ['Cleric', 'Paladin'] },
  { id: 'detect-magic', name: 'Detect Magic', level: 1, school: 'Divination', castingTime: '1 action', range: 0, components: { v: true, s: true, m: false }, duration: 'Up to 10 minutes', concentration: true, description: 'For the duration, you sense the presence of magic within 30 feet of you.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard'] },
  // Level 2
  { id: 'misty-step', name: 'Misty Step', level: 2, school: 'Conjuration', castingTime: '1 bonus action', range: 0, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'invisibility', name: 'Invisibility', level: 2, school: 'Illusion', castingTime: '1 action', range: 0, components: { v: true, s: true, m: 'an eyelash encased in gum arabic' }, duration: 'Up to 1 hour', concentration: true, description: 'A creature you touch becomes invisible until the spell ends.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'web', name: 'Web', level: 2, school: 'Conjuration', castingTime: '1 action', range: 60, components: { v: true, s: true, m: 'a bit of spiderweb' }, duration: 'Up to 1 hour', concentration: true, description: 'You conjure a mass of thick, sticky webbing at a point of your choice within range.', aoe: { shape: 'cube', size: 20 }, save: { stat: 'DEX', halfOnSuccess: false }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'hold-person', name: 'Hold Person', level: 2, school: 'Enchantment', castingTime: '1 action', range: 60, components: { v: true, s: true, m: 'a small, straight piece of iron' }, duration: 'Up to 1 minute', concentration: true, description: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.', save: { stat: 'WIS', halfOnSuccess: false }, classes: ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'shatter', name: 'Shatter', level: 2, school: 'Evocation', castingTime: '1 action', range: 60, components: { v: true, s: true, m: 'a chip of mica' }, duration: 'Instantaneous', concentration: false, description: 'A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range.', damage: { dice: '3d8', type: 'thunder' }, save: { stat: 'CON', halfOnSuccess: true }, aoe: { shape: 'sphere', size: 10 }, classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'darkness', name: 'Darkness', level: 2, school: 'Evocation', castingTime: '1 action', range: 60, components: { v: true, s: false, m: 'bat fur and a drop of pitch or piece of coal' }, duration: 'Up to 10 minutes', concentration: true, description: 'Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere for the duration.', aoe: { shape: 'sphere', size: 15 }, classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  // Level 3
  { id: 'fireball', name: 'Fireball', level: 3, school: 'Evocation', castingTime: '1 action', range: 150, components: { v: true, s: true, m: 'a tiny ball of bat guano and sulfur' }, duration: 'Instantaneous', concentration: false, description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.', damage: { dice: '8d6', type: 'fire' }, save: { stat: 'DEX', halfOnSuccess: true }, aoe: { shape: 'sphere', size: 20 }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'counterspell', name: 'Counterspell', level: 3, school: 'Abjuration', castingTime: '1 reaction', range: 60, components: { v: false, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'You attempt to interrupt a creature in the process of casting a spell.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'dispel-magic', name: 'Dispel Magic', level: 3, school: 'Abjuration', castingTime: '1 action', range: 120, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends.', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'fly', name: 'Fly', level: 3, school: 'Transmutation', castingTime: '1 action', range: 0, components: { v: true, s: true, m: 'a wing feather from any bird' }, duration: 'Up to 10 minutes', concentration: true, description: 'You touch a willing creature. The target gains a flying speed of 60 feet for the duration.', classes: ['Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'lightning-bolt', name: 'Lightning Bolt', level: 3, school: 'Evocation', castingTime: '1 action', range: 0, components: { v: true, s: true, m: 'a bit of fur and a rod of amber, crystal, or glass' }, duration: 'Instantaneous', concentration: false, description: 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose.', damage: { dice: '8d6', type: 'lightning' }, save: { stat: 'DEX', halfOnSuccess: true }, aoe: { shape: 'line', size: 100 }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'revivify', name: 'Revivify', level: 3, school: 'Necromancy', castingTime: '1 action', range: 0, components: { v: true, s: true, m: 'diamonds worth 300 gp, which the spell consumes' }, duration: 'Instantaneous', concentration: false, description: 'You touch a creature that has died within the last minute. That creature returns to life with 1 hit point.', classes: ['Cleric', 'Paladin'] },
  // Level 4
  { id: 'polymorph', name: 'Polymorph', level: 4, school: 'Transmutation', castingTime: '1 action', range: 60, components: { v: true, s: true, m: 'a caterpillar cocoon' }, duration: 'Up to 1 hour', concentration: true, description: 'This spell transforms a creature that you can see within range into a new form.', save: { stat: 'WIS', halfOnSuccess: false }, classes: ['Bard', 'Druid', 'Sorcerer', 'Wizard'] },
  { id: 'greater-invisibility', name: 'Greater Invisibility', level: 4, school: 'Illusion', castingTime: '1 action', range: 0, components: { v: true, s: true, m: false }, duration: 'Up to 1 minute', concentration: true, description: 'You or a creature you touch becomes invisible for the duration. The spell ends for a target that attacks or casts a spell.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  { id: 'dimension-door', name: 'Dimension Door', level: 4, school: 'Conjuration', castingTime: '1 action', range: 500, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'You teleport yourself from your current location to any other spot within range.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'ice-storm', name: 'Ice Storm', level: 4, school: 'Evocation', castingTime: '1 action', range: 300, components: { v: true, s: true, m: 'a pinch of dust and a few drops of water' }, duration: 'Instantaneous', concentration: false, description: 'A hail of rock-hard ice pounds to the ground in a 20-foot-radius, 40-foot-high cylinder centered on a point within range.', damage: { dice: '2d8', type: 'bludgeoning' }, save: { stat: 'DEX', halfOnSuccess: true }, aoe: { shape: 'sphere', size: 20 }, classes: ['Druid', 'Sorcerer', 'Wizard'] },
  // Level 5
  { id: 'cone-of-cold', name: 'Cone of Cold', level: 5, school: 'Evocation', castingTime: '1 action', range: 0, components: { v: true, s: true, m: 'a small crystal or glass cone' }, duration: 'Instantaneous', concentration: false, description: 'A blast of cold air erupts from your hands.', damage: { dice: '8d8', type: 'cold' }, save: { stat: 'CON', halfOnSuccess: true }, aoe: { shape: 'cone', size: 60 }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'wall-of-force', name: 'Wall of Force', level: 5, school: 'Evocation', castingTime: '1 action', range: 120, components: { v: true, s: true, m: 'a pinch of powder made from a clear gem' }, duration: 'Up to 10 minutes', concentration: true, description: 'An invisible wall of force springs into existence at a point you choose within range.', classes: ['Wizard'] },
  // Level 6
  { id: 'disintegrate', name: 'Disintegrate', level: 6, school: 'Transmutation', castingTime: '1 action', range: 60, components: { v: true, s: true, m: 'a lodestone and a pinch of dust' }, duration: 'Instantaneous', concentration: false, description: 'A thin green ray springs from your pointing finger to a target that you can see within range. The target can be a creature, an object, or a creation of magical force.', damage: { dice: '10d6+40', type: 'force' }, save: { stat: 'DEX', halfOnSuccess: false }, classes: ['Sorcerer', 'Wizard'] },
  // Level 7
  { id: 'teleport', name: 'Teleport', level: 7, school: 'Conjuration', castingTime: '1 action', range: 10, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'This spell instantly transports you and up to eight willing creatures of your choice that you can see within range, or a single object that you can see within range, to a destination you select.', classes: ['Bard', 'Sorcerer', 'Wizard'] },
  // Level 9
  { id: 'meteor-swarm', name: 'Meteor Swarm', level: 9, school: 'Evocation', castingTime: '1 action', range: 1, components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, description: 'Blazing orbs of fire plummet to the ground at four different points you can see within range.', damage: { dice: '20d6', type: 'fire' }, save: { stat: 'DEX', halfOnSuccess: true }, aoe: { shape: 'sphere', size: 40 }, classes: ['Sorcerer', 'Wizard'] },
  { id: 'power-word-kill', name: 'Power Word Kill', level: 9, school: 'Enchantment', castingTime: '1 action', range: 60, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'You utter a word of power that can compel one creature you can see within range to die instantly if it has 100 hit points or fewer.', classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'] },
  { id: 'wish', name: 'Wish', level: 9, school: 'Conjuration', castingTime: '1 action', range: 0, components: { v: true, s: false, m: false }, duration: 'Instantaneous', concentration: false, description: 'Wish is the mightiest spell a mortal creature can cast. By simply speaking aloud, you can alter the very foundations of reality in accord with your desires.', classes: ['Sorcerer', 'Wizard'] },
];


/**
 * Manages spells, casters, and the logic of spellcasting in a D&D 5e game.
 */
export class SpellEngine {
  private spells = new Map<string, Spell>();
  private casters = new Map<string, SpellCaster>();

  constructor() {
    ALL_SPELLS_DATA.forEach(spell => {
      this.spells.set(spell.id, spell);
    });
  }

  // --- Spell Queries ---

  /** 1. Gets a spell by its unique ID. */
  getSpell(id: string): Spell | undefined {
    return this.spells.get(id);
  }

  /** 2. Searches for spells by a query string in name or description. */
  searchSpells(query: string): Spell[] {
    const lowerCaseQuery = query.toLowerCase();
    return this.getAllSpells().filter(spell =>
      spell.name.toLowerCase().includes(lowerCaseQuery) ||
      spell.description.toLowerCase().includes(lowerCaseQuery)
    );
  }

  /** 3. Gets all spells of a specific level. */
  getSpellsByLevel(level: number): Spell[] {
    return this.getAllSpells().filter(spell => spell.level === level);
  }

  /** 4. Gets all spells of a specific school of magic. */
  getSpellsBySchool(school: string): Spell[] {
    return this.getAllSpells().filter(spell => spell.school.toLowerCase() === school.toLowerCase());
  }

  /** 5. Gets all spells available to a specific class. */
  getSpellsByClass(cls: string): Spell[] {
    const lowerCaseClass = cls.toLowerCase();
    return this.getAllSpells().filter(spell =>
      spell.classes.some(c => c.toLowerCase() === lowerCaseClass)
    );
  }

  /** 18. Gets all spells loaded in the engine. */
  getAllSpells(): Spell[] {
    return Array.from(this.spells.values());
  }

  // --- Caster Management ---

  /** 6. Adds a new spellcaster to the engine. */
  addCaster(data: Omit<SpellCaster, 'id'> & { id?: string }): SpellCaster {
    const id = data.id || `caster-${Date.now()}-${Math.random()}`;
    const newCaster: SpellCaster = { ...data, id };
    this.casters.set(id, newCaster);
    return newCaster;
  }

  /** 7. Teaches a spell to a caster. */
  learnSpell(casterId: string, spellId: string): void {
    const caster = this.casters.get(casterId);
    const spell = this.spells.get(spellId);
    if (!caster || !spell) {
      throw new Error('Caster or Spell not found.');
    }
    if (!caster.knownSpells.includes(spellId)) {
      caster.knownSpells.push(spellId);
    }
  }

  /** 8. Makes a caster forget a spell. */
  forgetSpell(casterId: string, spellId: string): void {
    const caster = this.casters.get(casterId);
    if (!caster) {
      throw new Error('Caster not found.');
    }
    caster.knownSpells = caster.knownSpells.filter(id => id !== spellId);
  }

  // --- Casting & Mechanics ---

  /** 9. Simulates casting a spell. */
  castSpell(casterId: string, spellId: string, targets?: any[]): { success: boolean; message: string; damage?: number; saves?: { target: any; success: boolean; roll: number }[] } {
    const caster = this.casters.get(casterId);
    const spell = this.spells.get(spellId);

    if (!caster || !spell) {
      return { success: false, message: 'Caster or Spell not found.' };
    }

    if (!this.canCast(casterId, spellId)) {
      return { success: false, message: `${caster.name} cannot cast ${spell.name} right now.` };
    }

    // Use a spell slot
    this.useSlot(casterId, spell.level);

    let damageResult: number | undefined;
    if (spell.damage) {
      damageResult = this.parseAndRollDice(spell.damage.dice);
    }

    // This is a simplified simulation. A real game would need target AC, stats, etc.
    const result = {
      success: true,
      message: `${caster.name} casts ${spell.name}!`,
      damage: damageResult,
    };

    return result;
  }

  /** 10. Rolls dice based on a string like "XdY+Z". */
  private parseAndRollDice(dice: string): number {
    const match = dice.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
    if (!match) throw new Error(`Invalid dice string format: ${dice}`);

    const numDice = parseInt(match[1], 10);
    const numSides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * numSides) + 1;
    }
    return total + modifier;
  }

  /** 11. Simulates a saving throw roll. */
  rollSavingThrow(dc: number, modifier: number): { success: boolean; roll: number } {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    return { success: total >= dc, roll: total };
  }

  // --- Slot Management ---

  /** 12. Expends a spell slot for a given level. Returns true if successful. */
  useSlot(casterId: string, level: number): boolean {
    if (level === 0) return true; // Cantrips don't use slots.

    const caster = this.casters.get(casterId);
    if (!caster) return false;

    const slot = caster.slots.find(s => s.level === level);
    if (slot && slot.used < slot.max) {
      slot.used++;
      return true;
    }
    return false;
  }

  /** 13. Resets spell slots after a rest. */
  restSlots(casterId: string, type: 'short' | 'long'): void {
    const caster = this.casters.get(casterId);
    if (!caster) throw new Error('Caster not found.');

    if (type === 'long') {
      caster.slots.forEach(slot => {
        slot.used = 0;
      });
    }
    // Short rest logic is class-specific (e.g., Warlocks) and is omitted for simplicity.
  }

  // --- Caster State Queries ---

  /** 14. Gets spells a caster knows and has slots to cast. */
  getAvailableSpells(casterId: string): Spell[] {
    const caster = this.casters.get(casterId);
    if (!caster) return [];

    return caster.knownSpells
      .map(id => this.getSpell(id))
      .filter((spell): spell is Spell => {
        if (!spell) return false;
        if (spell.level === 0) return true;
        const slot = caster.slots.find(s => s.level === spell.level);
        return !!slot && slot.used < slot.max;
      });
  }

  /** 15. Gets all spells known by a caster. */
  getSpellList(casterId: string): Spell[] {
    const caster = this.casters.get(casterId);
    if (!caster) return [];
    return caster.knownSpells
      .map(id => this.getSpell(id))
      .filter((spell): spell is Spell => !!spell);
  }

  /** 16. Gets the current status of a caster's spell slots. */
  getSlotStatus(casterId: string): SpellSlot[] {
    const caster = this.casters.get(casterId);
    return caster ? caster.slots : [];
  }

  /** 17. Checks if a caster knows a spell and has a slot for it. */
  canCast(casterId: string, spellId: string): boolean {
    const caster = this.casters.get(casterId);
    const spell = this.spells.get(spellId);

    if (!caster || !spell) return false;

    // Check if the spell is known
    if (!caster.knownSpells.includes(spellId)) return false;

    // Cantrips can always be cast
    if (spell.level === 0) return true;

    // Check for available spell slot
    const slot = caster.slots.find(s => s.level === spell.level);
    return !!slot && slot.used < slot.max;
  }

  // --- Serialization ---

  /** 19. Serializes the engine's state to a JSON string. */
  serialize(): string {
    const state = {
      spells: Array.from(this.spells.entries()),
      casters: Array.from(this.casters.entries()),
    };
    return JSON.stringify(state, null, 2);
  }

  /** 19. Deserializes a JSON string to restore the engine's state. */
  deserialize(jsonString: string): void {
    const state = JSON.parse(jsonString);
    this.spells = new Map<string, Spell>(state.spells);
    this.casters = new Map<string, SpellCaster>(state.casters);
  }
}