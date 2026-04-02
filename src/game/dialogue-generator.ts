/**
 * DMLog.ai - src/game/dialogue-generator.ts
 * 
 * Procedural NPC dialogue generation with personality and context.
 */

//=========== INTERFACES ===========//

export interface NPCDialogue {
  npcId: string;
  text: string;
  emotion: 'neutral'|'happy'|'sad'|'angry'|'fearful'|'surprised'|'disgusted';
  tone: 'formal'|'casual'|'aggressive'|'mysterious'|'friendly'|'authoritative';
  context: string;
  questHook?: string;
  shopItems?: string[];
  secrets?: string[];
}

export interface DialogueOption {
  text: string;
  response: string;
  effect: { type: 'reputation'|'quest'|'item'|'info'; value: string; };
  condition?: string;
}

export interface DialogueTree {
  npcId: string;
  greeting: NPCDialogue;
  options: DialogueOption[];
  farewell: NPCDialogue;
  mood: number;
}

//=========== NPC DATA & TYPES ===========//

export type NPCArchetype = 'Guard' | 'Merchant' | 'Innkeeper' | 'Scholar' | 'Blacksmith' | 'Healer' | 'Thief' | 'Noble' | 'Peasant' | 'Druid';

export interface NPCData {
  name: string;
  role: NPCArchetype;
  personality: string; // e.g., "gruff but fair", "cheerful and greedy"
  secrets: string[];
  relationships: Record<string, number>; // npcId -> relationship score
}

type MoodCategory = 'positive' | 'neutral' | 'negative';

//=========== DIALOGUE GENERATOR CLASS ===========//

export class DialogueGenerator {
  private npcPersonalities: Map<string, NPCData> = new Map();
  private dialogueHistory: Map<string, NPCDialogue[]> = new Map();
  private npcMoods: Map<string, number> = new Map();
  private npcDialogueOptions: Map<string, DialogueOption[]> = new Map();

  //=========== NPC ARCHETYPE DIALOGUE TEMPLATES ===========//
  private static ARCHETYPE_DATA = {
    Guard: {
      greetings: {
        positive: ["Well met, citizen. The streets are safe on my watch.", "Good to see a friendly face. Stay safe."],
        neutral: ["State your business.", "Move along.", "What do you want?"],
        negative: ["Don't cause any trouble. I've got my eye on you.", "I'm watching you, scum."],
      },
      farewells: {
        positive: ["Stay safe out there.", "May your travels be uneventful."],
        neutral: ["Be on your way.", "Don't loiter."],
        negative: ["Get out of my sight.", "And don't come back."],
      },
      rumors: ["Heard the blacksmith got a shipment of rare ore.", "They say a ghost haunts the old tower at night."],
      questHooks: ["We've had reports of goblins on the east road. The captain is offering a reward."],
      ambient: ["Just another quiet day...", "My feet are killing me.", "Wish I was at the tavern."],
    },
    Merchant: {
      greetings: {
        positive: ["Welcome, welcome! You'll find no better prices in all the land!", "Ah, my favorite customer! What can I get for you?"],
        neutral: ["Looking to buy? Or just browse?", "Finest wares in the city."],
        negative: ["If you're not buying, you're wasting my time.", "Don't touch what you can't afford."],
      },
      farewells: {
        positive: ["A pleasure doing business with you!", "Come back soon!"],
        neutral: ["Thank you for your patronage.", "Farewell."],
        negative: ["Finally. Don't let the door hit you on the way out."],
      },
      rumors: ["A caravan from the south is overdue. I'm starting to worry about my shipment.", "The nobles are paying top coin for exotic silks."],
      questHooks: ["I need a rare ingredient for a potion I'm selling. It only grows in the Sunken Grotto. Interested?"],
      ambient: ["Quality goods for quality prices...", "Hmm, need to restock the health potions."],
    },
    Innkeeper: {
      greetings: {
        positive: ["Welcome, friend! Pull up a chair, warm yourself by the fire!", "Back so soon? The usual?"],
        neutral: ["Welcome to the {location}. Need a room, or just a drink?", "What can I get for you, traveler?"],
        negative: ["We don't want any trouble here.", "Wipe your feet. And don't start anything."],
      },
      farewells: {
        positive: ["Safe travels, friend! Don't be a stranger!", "Come back anytime!"],
        neutral: ["Mind how you go.", "Good night."],
        negative: ["And stay out.", "Your kind isn't welcome here."],
      },
      rumors: ["That shady fellow in the corner? He's been asking about the old ruins.", "A group of adventurers passed through yesterday, heading for the Dragon's Peak."],
      questHooks: ["My cellar is infested with giant rats. I'd be mighty grateful to anyone who could clear them out."],
      ambient: ["Another round for table three!", "Time to clean these tankards again."],
    },
    // Add other archetypes for brevity, but the structure is the same.
    Scholar: {
      greetings: { positive: ["A thirst for knowledge! Excellent!"], neutral: ["Can I help you?"], negative: ["Please don't touch the scrolls."] },
      farewells: { positive: ["May your mind stay sharp."], neutral: ["Until next time."], negative: ["I have work to do."] },
      rumors: ["I've read that a solar eclipse is due next month. A bad omen."],
      questHooks: ["I'm missing a crucial page from 'The Annals of the Dragon War'. I believe it's in a tomb nearby."],
      ambient: ["Fascinating... the implications are staggering.", "Where did I put that quill?"],
    },
    Blacksmith: {
      greetings: { positive: ["Good to see you! Need a fresh edge on that blade?"], neutral: ["What do you need? Armor or a weapon?"], negative: ["Don't waste my time."] },
      farewells: { positive: ["May your blade stay sharp."], neutral: ["Done."], negative: ["Get out of my forge."] },
      rumors: ["The king's guard ordered a hundred new longswords. Something is brewing."],
      questHooks: ["The fire in my forge is dying. I need special coals from the volcanic caves to relight it."],
      ambient: ["More steel... needs more heat.", "*CLANG* *CLANG* *HISS*"],
    },
    Healer: {
      greetings: { positive: ["The spirits welcome you, child. How may I help?"], neutral: ["Are you in need of healing?"], negative: ["Your aura is dark. Be gone."] },
      farewells: { positive: ["Walk in the light.", "Be well."], neutral: ["Farewell."], negative: ["Do not return."] },
      rumors: ["A plague is spreading in the eastern farmlands. It is a sad time."],
      questHooks: ["I need a rare Moonpetal flower for a poultice. It only blooms at night by the waterfall."],
      ambient: ["The spirits are restless today.", "This world needs more healing."],
    },
    Thief: {
      greetings: { positive: ["You're the one they're talking about. I like your style."], neutral: ["Psst. Over here. What do you need?"], negative: ["I don't know you. Piss off."] },
      farewells: { positive: ["Stay in the shadows.", "Good hunting."], neutral: ["Be seeing you."], negative: ["We never spoke."] },
      rumors: ["The magistrate keeps his tax money in a vault under the city hall. Lightly guarded, I hear."],
      questHooks: ["I need a 'package' retrieved from the captain of the guard's office. No questions asked."],
      ambient: ["Everyone has a price...", "Need to keep my skills sharp."],
    },
    Noble: {
      greetings: { positive: ["Ah, a person of some standing! A pleasure."], neutral: ["State your purpose for addressing me."], negative: ["Ugh, another commoner. What is it?"] },
      farewells: { positive: ["A pleasure, as always."], neutral: ["You are dismissed."], negative: ["Now, leave me."] },
      rumors: ["Lord Valerius is planning a lavish ball. I simply must get an invitation."],
      questHooks: ["Someone stole my family's signet ring! I suspect a servant. Find it, and you'll be richly rewarded."],
      ambient: ["The quality of the wine has been so poor lately.", "It's so hard to find good help these days."],
    },
    Peasant: {
      greetings: { positive: ["Oh, hello there! A fine day, isn't it?", "Blessings upon you, traveler."], neutral: ["Good day, milord/milady.", "Can I help you?"], negative: ["Please, I don't want any trouble.", "Leave me be."] },
      farewells: { positive: ["May your roads be safe!", "Gods keep you."], neutral: ["Bye now."], negative: ["Please, just go."] },
      rumors: ["My neighbor, Old Man Willow, swears he saw a wolf the size of a horse in the woods.", "The crops are failing again this year."],
      questHooks: ["Wolves have been taking our chickens. We can't afford to lose any more. Can you help?"],
      ambient: ["So much work to do before sunset.", "I hope it rains soon. The fields are so dry."],
    },
    Druid: {
      greetings: { positive: ["The forest welcomes you, friend.", "Your spirit is in tune with nature. Welcome."], neutral: ["Why have you come to this sacred place?", "The trees are watching."], negative: ["You reek of the city. State your business and leave."] },
      farewells: { positive: ["May the path rise up to meet you.", "Follow the wind."], neutral: ["The forest will guide you."], negative: ["Do not disturb the balance again."] },
      rumors: ["A great corruption is seeping into the roots of the Elderwood.", "The animals are agitated. A great beast has awoken."],
      questHooks: ["A blight is poisoning my grove. I need you to find the source at the heart of the swamp and cleanse it."],
      ambient: ["Listen... the leaves are speaking.", "All is connected."],
    },
  };

  //=========== PUBLIC METHODS ===========//

  /**
   * Registers a new NPC with the dialogue system.
   * @param id - The unique ID for the NPC.
   * @param data - The NPC's data, including name, role, and personality.
   */
  public registerNPC(id: string, data: NPCData): void {
    this.npcPersonalities.set(id, data);
    this.npcMoods.set(id, 0); // Start at neutral mood
    this.dialogueHistory.set(id, []);
    this.npcDialogueOptions.set(id, []);
  }

  /**
   * Generates a complete dialogue tree for an NPC.
   * @param npcId - The ID of the NPC.
   * @returns A DialogueTree object.
   */
  public generateDialogueTree(npcId: string): DialogueTree | null {
    if (!this.npcPersonalities.has(npcId)) return null;

    const greeting = this.generateGreeting(npcId, { time: 'day', location: 'town square' });
    const farewell = this._generateFarewell(npcId);
    const options = this.npcDialogueOptions.get(npcId) || [];
    const mood = this.getMood(npcId);

    return { npcId, greeting, options, farewell, mood };
  }

  /**
   * Generates a greeting from an NPC.
   * @param npcId - The ID of the NPC.
   * @param context - World context like time and location.
   * @returns An NPCDialogue object for the greeting.
   */
  public generateGreeting(npcId: string, context: { time: string, location: string }): NPCDialogue {
    const npcData = this.getNPCData(npcId);
    if (!npcData) return this._createDefaultDialogue(npcId, "...", "Error");

    const archetype = DialogueGenerator.ARCHETYPE_DATA[npcData.role];
    const moodCategory = this._getMoodCategory(this.getMood(npcId));
    const template = this._selectTemplate(archetype.greetings[moodCategory]);
    const text = this._processTemplate(template, npcData, context);

    const dialogue: NPCDialogue = {
      npcId,
      text,
      emotion: moodCategory === 'positive' ? 'happy' : moodCategory === 'negative' ? 'angry' : 'neutral',
      tone: 'casual',
      context: 'greeting',
    };
    this._logDialogue(npcId, dialogue);
    return dialogue;
  }

  /**
   * Generates a generic response from an NPC based on their current mood.
   * @param npcId - The ID of the NPC.
   * @param playerMessage - The player's input (currently unused, for future NLP).
   * @returns An NPCDialogue object for the response.
   */
  public generateResponse(npcId: string, playerMessage: string): NPCDialogue {
    const mood = this.getMood(npcId);
    let text = "Is that so?";
    if (mood > 30) text = "That's wonderful to hear!";
    else if (mood < -30) text = "I don't have time for this nonsense.";
    
    const dialogue: NPCDialogue = {
      npcId,
      text,
      emotion: 'neutral',
      tone: 'casual',
      context: 'response',
    };
    this._logDialogue(npcId, dialogue);
    return dialogue;
  }

  /**
   * Generates random idle dialogue for an NPC.
   * @param npcId - The ID of the NPC.
   * @returns An NPCDialogue object for ambient chatter.
   */
  public generateAmbientDialogue(npcId: string): NPCDialogue {
    const npcData = this.getNPCData(npcId);
    if (!npcData) return this._createDefaultDialogue(npcId, "...", "Ambient");

    const archetype = DialogueGenerator.ARCHETYPE_DATA[npcData.role];
    const template = this._selectTemplate(archetype.ambient);
    const text = this._processTemplate(template, npcData, {});

    return {
      npcId,
      text,
      emotion: 'neutral',
      tone: 'casual',
      context: 'ambient',
    };
  }

  /**
   * Generates a reaction to a world event.
   * @param npcId - The ID of the NPC.
   * @param event - A string describing the event (e.g., "dragon_attack").
   * @returns An NPCDialogue object for the reaction.
   */
  public generateReaction(npcId: string, event: string): NPCDialogue {
    // This is a simplified implementation. A real one would have more event types.
    const text = `By the gods! A ${event.replace('_', ' ')}! We're all doomed!`;
    return {
      npcId,
      text,
      emotion: 'fearful',
      tone: 'aggressive',
      context: `reaction_to_${event}`,
    };
  }

  /**
   * Generates a quest hook from an NPC.
   * @param npcId - The ID of the NPC.
   * @returns A string containing the quest hook.
   */
  public generateQuestHook(npcId: string): string | null {
    const npcData = this.getNPCData(npcId);
    if (!npcData) return null;
    const archetype = DialogueGenerator.ARCHETYPE_DATA[npcData.role];
    return this._selectTemplate(archetype.questHooks);
  }

  /**
   * Generates a list of rumors from an NPC.
   * @param npcId - The ID of the NPC.
   * @returns An array of strings containing rumors.
   */
  public generateRumors(npcId: string): string[] {
    const npcData = this.getNPCData(npcId);
    if (!npcData) return [];
    const archetype = DialogueGenerator.ARCHETYPE_DATA[npcData.role];
    // Return one or two random rumors
    return [this._selectTemplate(archetype.rumors)];
  }

  /**
   * Generates dialogue specific to a merchant's shop.
   * @param npcId - The ID of the merchant NPC.
   * @param items - A list of items to potentially mention.
   * @returns An NPCDialogue object.
   */
  public generateShopDialogue(npcId: string, items: string[]): NPCDialogue {
    const npcData = this.getNPCData(npcId);
    if (!npcData || npcData.role !== 'Merchant') {
      return this._createDefaultDialogue(npcId, "I have nothing to sell.", "Shop");
    }
    const item = items[Math.floor(Math.random() * items.length)] || 'fine goods';
    const text = `Looking for something special? I just got a new shipment of ${item}. Best quality, you won't regret it!`;
    return {
      npcId,
      text,
      emotion: 'happy',
      tone: 'friendly',
      context: 'shop',
      shopItems: items,
    };
  }

  /**
   * Reveals a secret if the NPC's mood is high enough.
   * @param npcId - The ID of the NPC.
   * @returns A secret string or null if conditions aren't met.
   */
  public getSecret(npcId: string): string | null {
    const mood = this.getMood(npcId);
    const npcData = this.getNPCData(npcId);
    if (mood > 70 && npcData && npcData.secrets.length > 0) {
      return npcData.secrets[0]; // Return the first secret for simplicity
    }
    return null;
  }

  /** Adds a player dialogue option for a specific NPC. */
  public addDialogueOption(npcId: string, option: DialogueOption): void {
    if (!this.npcDialogueOptions.has(npcId)) {
      this.npcDialogueOptions.set(npcId, []);
    }
    this.npcDialogueOptions.get(npcId)?.push(option);
  }

  /** Gets the current mood of an NPC. */
  public getMood(npcId: string): number {
    return this.npcMoods.get(npcId) || 0;
  }

  /** Adjusts the mood of an NPC. */
  public adjustMood(npcId: string, amount: number): void {
    const currentMood = this.getMood(npcId);
    const newMood = Math.max(-100, Math.min(100, currentMood + amount));
    this.npcMoods.set(npcId, newMood);
  }

  /** Retrieves the dialogue history for an NPC. */
  public getDialogueHistory(npcId: string): NPCDialogue[] {
    return this.dialogueHistory.get(npcId) || [];
  }

  /** Retrieves the registered data for an NPC. */
  public getNPCData(id: string): NPCData | undefined {
    return this.npcPersonalities.get(id);
  }

  /** Serializes the generator's state to a JSON string. */
  public serialize(): string {
    const state = {
      npcPersonalities: Array.from(this.npcPersonalities.entries()),
      dialogueHistory: Array.from(this.dialogueHistory.entries()),
      npcMoods: Array.from(this.npcMoods.entries()),
      npcDialogueOptions: Array.from(this.npcDialogueOptions.entries()),