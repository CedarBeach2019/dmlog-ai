/**
 * demo-encounter.ts — Dragon's Lair: a PLATO-style branching encounter.
 *
 * 10 units with perception checks, combat, negotiation, a help loop,
 * and a hidden path for observant players.
 *
 * Author: Superinstance & Lucineer (DiGennaro et al.)
 */

import type { EncounterGraph } from '../lib/encounter-engine.js';

export const dragonLair: EncounterGraph = {
  id: 'dragons-lair',
  name: "The Dragon's Lair",
  startUnit: 'entrance',
  createdAt: Date.now(),
  nodes: {
    entrance: {
      id: 'entrance',
      type: 'narration',
      content: 'You stand before the yawning mouth of a cave carved into the mountainside. Heat radiates outward in waves, and the scent of sulfur and scorched metal fills your nostrils. Ancient draconic runes glow faintly along the archway — a warning, or perhaps a welcome. The passage ahead splits: a wide, scorched corridor to the left, and a narrow, shadow-filled crevice to the right.',
      onSuccess: 'approach',
    },

    approach: {
      id: 'approach',
      type: 'choice',
      content: 'The cave stretches before you. Two passages diverge in the smoky darkness. What do you do?',
      choices: [
        { text: 'Take the wide corridor — confront whatever awaits', nextUnit: 'wide_corridor' },
        { text: 'Squeeze through the narrow crevice', nextUnit: 'perception_check' },
        { text: 'Call out to the dragon — attempt negotiation', nextUnit: 'negotiation' },
      ],
      onHelp: 'approach_help',
    },

    approach_help: {
      id: 'approach_help',
      type: 'help',
      content: '💡 Hint: The narrow crevice is harder to navigate but might reveal secrets. The wide corridor is the direct path to the dragon. Negotiation requires charisma but could avoid combat entirely. If you have a high perception, the crevice rewards observation.',
      onSuccess: 'approach',
    },

    perception_check: {
      id: 'perception_check',
      type: 'skill_check',
      content: 'You squeeze through the tight crevice. The walls are slick with moisture and ancient carvings. You notice something faint — a seam in the stone that doesn\'t look natural. Roll a Perception check (DC 14) to investigate.',
      dc: 14,
      skill: 'perception',
      retryCount: 2,
      onSuccess: 'secret_door',
      onFail: 'crevice_dead_end',
      onHelp: 'perception_help',
    },

    perception_help: {
      id: 'perception_help',
      type: 'help',
      content: '💡 Hint: Look for patterns in the stone carvings. Dragons often hide their most valuable treasures behind mechanisms. Try tracing the runes with your fingers — you might feel a recessed button or hidden latch.',
      onSuccess: 'perception_check',
    },

    secret_door: {
      id: 'secret_door',
      type: 'narration',
      content: 'Your keen eyes spot it — a hidden door disguised as solid rock. The draconic runes form a key pattern when traced in the right order. The door swings inward silently, revealing a treasury of gold, gems, and ancient artifacts. The dragon sleeps on a mound of coins in the main chamber beyond, completely unaware of the secret entrance. You could loot the treasury and escape, or use this position to your advantage.',
      onSuccess: 'secret_choice',
    },

    secret_choice: {
      id: 'secret_choice',
      type: 'choice',
      content: 'The treasury glitters before you. The dragon slumbers mere feet away. What\'s your move?',
      choices: [
        { text: 'Grab what you can and flee silently', nextUnit: 'success_loot' },
        { text: 'Sneak past to ambush the dragon from behind', nextUnit: 'combat_advantage' },
        { text: 'Approach the sleeping dragon peacefully', nextUnit: 'negotiation' },
      ],
    },

    wide_corridor: {
      id: 'wide_corridor',
      type: 'narration',
      content: 'The wide corridor opens into a vast cavern. Scales the size of shields glint in the firelight. A massive red dragon — Ignis the Everburning — turns its head toward you. Smoke curls from between teeth as long as greatswords. "Another band of treasure hunters," it rumbles. "How... predictable." Its tail sweeps the gold beneath it, a mountain of stolen wealth.',
      onSuccess: 'dragon_face',
    },

    dragon_face: {
      id: 'dragon_face',
      type: 'choice',
      content: 'Ignis the Everburning towers above you, its molten eyes fixed on your party. The air itself seems to burn. What do you do?',
      choices: [
        { text: 'Draw weapons and attack!', nextUnit: 'combat_dragon' },
        { text: 'Attempt to negotiate — offer information or service', nextUnit: 'negotiation' },
        { text: 'Create a distraction and retreat', nextUnit: 'fail_retreat' },
      ],
      onHelp: 'dragon_help',
    },

    dragon_help: {
      id: 'dragon_help',
      type: 'help',
      content: '💡 Hint: Red dragons are proud and vain. Complimenting its hoard or acknowledging its power might buy time. Fighting head-on is extremely dangerous — look for environmental advantages like the unstable stalactites above. Retreating isn\'t shameful — it\'s strategic.',
      onSuccess: 'dragon_face',
    },

    combat_dragon: {
      id: 'combat_dragon',
      type: 'combat',
      content: 'Steel rings out against ancient scales! Ignis unleashes a torrent of flame as your party spreads across the cavern. Roll for initiative! The dragon\'s AC is 19, and its breath weapon deals 12d6 fire damage in a 60-foot cone. The cavern has unstable stalactites (DC 12 to knock down for 4d10 bludgeoning damage).',
      onSuccess: 'success_victory',
      onFail: 'fail_defeat',
      onHelp: 'combat_help',
    },

    combat_advantage: {
      id: 'combat_advantage',
      type: 'combat',
      content: 'You strike from the shadows! With surprise on your side, you gain advantage on your first attack. Ignis roars in fury as it wheels to face this unexpected threat. The dragon is caught off-guard — its AC is effectively 17 for the first round, and you deal Sneak Attack damage if applicable.',
      onSuccess: 'success_victory',
      onFail: 'fail_defeat',
    },

    combat_help: {
      id: 'combat_help',
      type: 'help',
      content: '💡 Hint: Use the environment! The stalactites can be knocked down with a well-placed arrow or thunder damage. Fire resistance potions (if you have them) negate the breath weapon. The dragon is vulnerable to cold damage. Spread out to avoid area-of-effect attacks. Target the wings to ground it.',
      onSuccess: 'combat_dragon',
    },

    negotiation: {
      id: 'negotiation',
      type: 'skill_check',
      content: 'You sheathe your weapons and raise your hands. "Great Ignis," you begin, "we come not to steal, but to offer a trade." The dragon\'s eyes narrow with suspicion — but also curiosity. Make a Persuasion check (DC 16). Higher rolls unlock better outcomes.',
      dc: 16,
      skill: 'persuasion',
      retryCount: 2,
      onSuccess: 'success_negotiation',
      onFail: 'negotiation_fail',
      onHelp: 'negotiation_help',
    },

    negotiation_help: {
      id: 'negotiation_help',
      type: 'help',
      content: '💡 Hint: Dragons respect strength and wit. Don\'t grovel — speak as an equal. Offer something the dragon values: rare information, a service (perhaps dealing with adventurers who\'ve been pestering it), or knowledge of a rival dragon\'s weakness. Flattery about its hoard can lower the DC.',
      onSuccess: 'negotiation',
    },

    negotiation_fail: {
      id: 'negotiation_fail',
      type: 'choice',
      content: '"Your words are as empty as your pockets," Ignis snarls. It advances, cornering your party. You need a new approach — fast.',
      choices: [
        { text: 'Fight your way out', nextUnit: 'combat_dragon' },
        { text: 'Offer something specific — knowledge of a rival dragon', nextUnit: 'success_negotiation' },
        { text: 'Use a distraction to escape', nextUnit: 'fail_retreat' },
      ],
    },

    success_victory: {
      id: 'success_victory',
      type: 'terminal',
      content: '🏆 VICTORY! Ignis the Everburning collapses with a thunderous crash, sending gold coins cascading across the cavern floor. The dragon\'s hoard is yours — centuries of accumulated wealth, magical artifacts, and ancient tomes. Your names will be sung in taverns across the realm. Among the treasure, you find a sentient sword that whispers of even greater adventures to come...',
    },

    success_negotiation: {
      id: 'success_negotiation',
      type: 'terminal',
      content: '🏆 ALLIANCE! Ignis regards you with newfound respect. "Perhaps you are not like the others," it rumbles. The dragon offers a single magnificent treasure as payment for your future services — and a warning: "A greater threat stirs beneath these mountains. When it awakens, even I may need allies." You leave the lair richer and with a powerful (if dangerous) new contact.',
    },

    success_loot: {
      id: 'success_loot',
      type: 'terminal',
      content: '🏆 HEIST SUCCESS! You fill your packs with gold, gems, and a mysterious amulet that pulses with inner fire. You slip back through the secret door as silently as you came. Behind you, Ignis snores on, none the wiser. The heist of the century — and the dragon still guards the rest of its hoard for another day of adventure.',
    },

    fail_retreat: {
      id: 'fail_retreat',
      type: 'terminal',
      content: '💨 RETREAT! You bolt for the cave entrance as Ignis\'s fire scorches the stone behind you. You escape with your lives but nothing else. The dragon\'s mocking laughter echoes off the mountainside as you flee into the night. Defeated, but alive — and perhaps wiser. The dragon\'s lair still holds its secrets, and you now know the layout. Next time, you\'ll be ready.',
    },

    fail_defeat: {
      id: 'fail_defeat',
      type: 'terminal',
      content: '💀 TPK... almost. Ignis\'s flames overwhelm your party. You barely escape, singed and battered, carrying your unconscious companions. The dragon returns to its slumber atop its hoard. It was a fool\'s errand — but the taste of failure only sharpens your resolve. You\'ll need better preparation, stronger allies, or a smarter plan before facing Ignis again.',
    },

    crevice_dead_end: {
      id: 'crevice_dead_end',
      type: 'choice',
      content: 'The crevice narrows until you can go no further. You found some interesting carvings but no way forward. The air is getting thin. You\'ll have to go back.',
      choices: [
        { text: 'Return and take the wide corridor', nextUnit: 'wide_corridor' },
        { text: 'Return and try to negotiate with the dragon', nextUnit: 'negotiation' },
        { text: 'Examine the carvings more carefully (one more try)', nextUnit: 'perception_check' },
      ],
    },
  },
};
