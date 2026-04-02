// src/game/spell-system.ts
// DMLog.ai - D&D 5e Spell System: Spell tracking, slot management, and casting.

export interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  concentration: boolean;
  ritual: boolean;
  classes: string[];
}

export interface SpellSlot {
  level: number;
  max: number;
  current: number;
}

export interface CastResult {
  spell: string;
  slotUsed: number;
  remainingSlots: number;
  concentration: boolean;
  dc?: number;
  attackBonus?: number;
}

export interface SpellStats {
  damage: string;
  save: string;
  area: string;
  duration: string;
}

export class SpellSystem {
  private spells: Map<string, Spell> = new Map();
  private activeConcentration: Spell | null = null;
  private slots: SpellSlot[] = [];

  constructor() {
    this.initSpells();
  }

  private initSpells(): void {
    const s = (
      name: string, level: number, school: string, castingTime: string,
      range: string, components: string, duration: string, desc: string,
      conc: boolean, ritual: boolean, classes: string[]
    ) => this.spells.set(name.toLowerCase(), {
      name, level, school, castingTime, range, components, duration, description: desc, concentration: conc, ritual, classes
    });

    // Cantrips (Level 0)
    s('Fire Bolt', 0, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous',
      'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.', false, false, ['Sorcerer', 'Wizard']);
    s('Light', 0, 'Evocation', '1 action', 'Touch', 'V, M', '1 hour',
      'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.', false, false, ['Bard', 'Cleric', 'Sorcerer', 'Wizard']);
    s('Message', 0, 'Transmutation', '1 action', '120 feet', 'V, S, M', '1 round',
      'You point your finger toward a creature within range and whisper a message. The target hears the message and can reply in a whisper that only you can hear.', false, false, ['Bard', 'Sorcerer', 'Wizard']);
    s('Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V, S', '1 minute',
      'A spectral, floating hand appears at a point you choose within range. You can use the hand to manipulate objects, open unlocked doors, or stow items.', false, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Minor Illusion', 0, 'Illusion', '1 action', '30 feet', 'S, M', '1 minute',
      'You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again.', false, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Prestidigitation', 0, 'Transmutation', '1 action', '10 feet', 'V, S', '1 hour',
      'This spell is a minor magical trick that novice spellcasters use for practice. You create one of a variety of magical effects.', false, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);

    // Level 1
    s('Shield', 1, 'Abjuration', '1 reaction', 'Self', 'V, S', '1 round',
      'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.', false, false, ['Sorcerer', 'Wizard']);
    s('Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V, S', 'Instantaneous',
      'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.', false, false, ['Sorcerer', 'Wizard']);
    s('Healing Word', 1, 'Evocation', '1 bonus action', '60 feet', 'V', 'Instantaneous',
      'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', false, false, ['Bard', 'Cleric', 'Druid']);
    s('Detect Magic', 1, 'Divination', '1 action', 'Self', 'V, S', '10 minutes',
      'For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic.', false, true, ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard']);
    s('Charm Person', 1, 'Enchantment', '1 action', '30 feet', 'V, S', '1 hour',
      'You attempt to charm a humanoid you can see within range. It must make a Wisdom saving throw, and does so with advantage if you or your companions are fighting it. If it fails the saving throw, it is charmed by you until the spell ends.', false, false, ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Sleep', 1, 'Enchantment', '1 action', '90 feet', 'V, S, M', '1 minute',
      'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect.', false, false, ['Bard', 'Sorcerer', 'Wizard']);

    // Level 2
    s('Misty Step', 2, 'Conjuration', '1 bonus action', 'Self', 'V', 'Instantaneous',
      'Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.', false, false, ['Sorcerer', 'Warlock', 'Wizard']);
    s('Hold Person', 2, 'Enchantment', '1 action', '60 feet', 'V, S, M', '1 minute',
      'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.', true, false, ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Invisibility', 2, 'Illusion', '1 action', 'Touch', 'V, S, M', '1 hour',
      'A creature you touch becomes invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target\'s person.', true, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Web', 2, 'Conjuration', '1 action', '60 feet', 'V, S, M', '1 hour',
      'You conjure a mass of thick, sticky webbing at a point of your choice within range. The webs fill a 20-foot cube from that point for the duration.', true, false, ['Sorcerer', 'Wizard']);
    s('Shatter', 2, 'Evocation', '1 action', '60 feet', 'V, S, M', 'Instantaneous',
      'A sudden loud ringing noise, painfully intense, erupts from a point of your choice within range. Each creature in a 10-foot-radius sphere centered on that point must make a Constitution saving throw.', false, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Silence', 2, 'Illusion', '1 action', '120 feet', 'V, S', '10 minutes',
      'For the duration, no sound can be created within or pass through a 20-foot-radius sphere centered on a point you choose within range.', true, true, ['Bard', 'Cleric', 'Ranger']);

    // Level 3
    s('Fireball', 3, 'Evocation', '1 action', '150 feet', 'V, S, M', 'Instantaneous',
      'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw.', false, false, ['Sorcerer', 'Wizard']);
    s('Counterspell', 3, 'Abjuration', '1 reaction', '60 feet', 'S', 'Instantaneous',
      'You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect.', false, false, ['Sorcerer', 'Warlock', 'Wizard']);
    s('Dispel Magic', 3, 'Abjuration', '1 action', '120 feet', 'V, S', 'Instantaneous',
      'Choose one creature, object, or magical effect within range. Any spell of 3rd level or lower on the target ends.', false, false, ['Bard', 'Cleric', 'Druid', 'Paladin', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Fly', 3, 'Transmutation', '1 action', 'Touch', 'V, S, M', '10 minutes',
      'You touch a willing creature. The target gains a flying speed of 60 feet for the duration.', true, false, ['Bard', 'Sorcerer', 'Warlock', 'Wizard']);
    s('Lightning Bolt', 3, 'Evocation', '1 action', 'Self', 'V, S, M', 'Instantaneous',
      'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose.', false, false, ['Sorcerer', 'Wizard']);
    s('Spirit Guardians', 3, 'Conjuration', '1 action', 'Self', 'V, S', '1 minute',
      'You call forth spirits to protect you. They flit around you to a distance of 15 feet for the duration. If a creature enters the area or starts its turn there, it must make a Wisdom saving throw.', true, false, ['Cleric']);

    // Level 4
    s('Polymorph', 4, 'Transmutation', '1 action', '60 feet', 'V, S, M', '1 hour',
      'This spell transforms a creature that you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect.', true, false, ['