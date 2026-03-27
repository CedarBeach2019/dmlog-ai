// ─── Director Agent — Routes user input to the correct sub-agent ────────────

import { TTRPGSessionState, TTRPGPhase } from './session-state';
import { ALL_AGENTS } from './agents';

export interface DirectorDecision {
  agent: string;
  instruction: string;
  phase: TTRPGPhase | null;
  confidence: number;
}

export interface DirectorContext {
  recentActions: string[];
  activeNPCNames: string[];
}

interface RoutingRule {
  pattern: RegExp;
  agent: string;
  instruction: string;
  confidence: number;
}

const ROUTING_RULES: RoutingRule[] = [
  // Combat patterns → combat_engine
  { pattern: /\b(attack|strike|slash|stab|shoot|fireball|cast.*spell|swing|smite|cleave)\b/i, agent: 'combat_engine', instruction: 'Resolve this attack/combat action with proper dice rolls and damage.', confidence: 0.95 },
  { pattern: /^\/attack\b/i, agent: 'combat_engine', instruction: 'Process a combat attack.', confidence: 1.0 },
  { pattern: /^\/combat\b/i, agent: 'combat_engine', instruction: 'Manage full combat encounter.', confidence: 1.0 },
  { pattern: /^\/initiative\b/i, agent: 'combat_engine', instruction: 'Roll or manage initiative.', confidence: 1.0 },
  { pattern: /\b(dodge|dodge|parry|block|shield|defend)\b/i, agent: 'combat_engine', instruction: 'Process a defensive combat action.', confidence: 0.85 },
  { pattern: /\b(saving throw|save vs|concentration|death save)\b/i, agent: 'combat_engine', instruction: 'Process a saving throw.', confidence: 0.95 },
  { pattern: /\b(damage|heal|hp|hit points|hit dice|second wind)\b/i, agent: 'combat_engine', instruction: 'Process HP/damage/healing change.', confidence: 0.8 },
  { pattern: /\b(grapple|shove|disarm|trip|grappled)\b/i, agent: 'combat_engine', instruction: 'Resolve a combat maneuver.', confidence: 0.9 },

  // NPC interaction → npc_handler
  { pattern: /\b(talk|speak|ask|tell|say|greet|yell|whisper|persuade|convince|intimidate|deceive|haggle|negotiate)\b.*\b(to|with|the)\s+\w+/i, agent: 'npc_handler', instruction: 'Roleplay the NPC response to this interaction.', confidence: 0.9 },
  { pattern: /^\/npc\b/i, agent: 'npc_handler', instruction: 'Generate or interact with an NPC.', confidence: 1.0 },

  // Scene/description → scene_builder
  { pattern: /\b(describe|look around|examine|inspect|search|investigate|perception|what do i see)\b/i, agent: 'scene_builder', instruction: 'Create an atmospheric description of what the player perceives.', confidence: 0.9 },
  { pattern: /^\/describe\b/i, agent: 'scene_builder', instruction: 'Generate a scene description.', confidence: 1.0 },
  { pattern: /\b(enter|approach|arrive|walk into|come to|reach)\b/i, agent: 'scene_builder', instruction: 'Describe arriving at this new location.', confidence: 0.8 },
  { pattern: /\b(open|door|chest|gate|passage)\b/i, agent: 'scene_builder', instruction: 'Describe what is revealed when opening.', confidence: 0.75 },

  // Meta/lore → lore_keeper
  { pattern: /\b(lore|history|legend|myth|prophecy|backstory|remember when)\b/i, agent: 'lore_keeper', instruction: 'Provide lore-consistent information.', confidence: 0.8 },

  // Dice → local (no AI needed, but route to combat engine for context)
  { pattern: /^\/roll\b/i, agent: 'combat_engine', instruction: 'Process a dice roll request.', confidence: 1.0 },
  { pattern: /\b\d+d\d+/i, agent: 'combat_engine', instruction: 'Process inline dice notation.', confidence: 0.9 },

  // Rest → dungeon_master
  { pattern: /^\/rest\b/i, agent: 'dungeon_master', instruction: 'Process rest mechanics (short/long rest).', confidence: 1.0 },
  { pattern: /\b(short rest|long rest|take a rest|camp|sleep)\b/i, agent: 'dungeon_master', instruction: 'Process rest mechanics.', confidence: 0.85 },
];

// Phase transition suggestions based on events
const PHASE_TRANSITIONS: Array<{ trigger: RegExp; from: TTRPGPhase[]; to: TTRPGPhase }> = [
  { trigger: /\b(ambush|combat begins|enemy attacks|roll initiative|draw weapon|fight)\b/i, from: [TTRPGPhase.EXPLORATION, TTRPGPhase.ROLEPLAY, TTRPGPhase.INTRODUCTION], to: TTRPGPhase.COMBAT as TTRPGPhase },
  { trigger: /\b(enemy defeated|combat over|last enemy falls|fled combat)\b/i, from: [TTRPGPhase.COMBAT], to: TTRPGPhase.RESOLUTION as TTRPGPhase },
  { trigger: /\b(rest|sleep|make camp)\b/i, from: [TTRPGPhase.EXPLORATION, TTRPGPhase.COMBAT], to: TTRPGPhase.RESOLUTION as TTRPGPhase },
];

export function routeToAgent(
  userInput: string,
  sessionState: TTRPGSessionState,
  context: DirectorContext
): DirectorDecision {
  const input = userInput.trim();

  // Check routing rules
  let bestMatch: RoutingRule | null = null;
  for (const rule of ROUTING_RULES) {
    if (rule.pattern.test(input)) {
      if (!bestMatch || rule.confidence > bestMatch.confidence) {
        bestMatch = rule;
      }
    }
  }

  // If combat is active, heavily prefer combat engine for action-like inputs
  if (sessionState.combat.active && !/^\/(describe|npc|rest|roll)/i.test(input)) {
    const isAction = /\b(attack|cast|move|use|drink|dash|disengage|help|hide|ready|search|grapple|shove)\b/i.test(input);
    if (isAction && (!bestMatch || bestMatch.confidence < 0.95)) {
      return {
        agent: 'combat_engine',
        instruction: 'Resolve this combat action in the current initiative order.',
        phase: null,
        confidence: 0.95,
      };
    }
  }

  // Check for phase transition suggestions
  let suggestedPhase: TTRPGPhase | null = null;
  for (const pt of PHASE_TRANSITIONS) {
    if (pt.trigger.test(input) && pt.from.includes(sessionState.phase)) {
      suggestedPhase = pt.to;
      break;
    }
  }

  if (bestMatch) {
    return {
      agent: bestMatch.agent,
      instruction: bestMatch.instruction,
      phase: suggestedPhase,
      confidence: bestMatch.confidence,
    };
  }

  // Check if talking to a known NPC
  const npcMatch = context.activeNPCNames.find(name =>
    new RegExp(`\\b${name}\\b`, 'i').test(input)
  );
  if (npcMatch) {
    return {
      agent: 'npc_handler',
      instruction: `Roleplay ${npcMatch}'s response to this interaction. Maintain their established personality.`,
      phase: suggestedPhase,
      confidence: 0.85,
    };
  }

  // Default: dungeon master handles ambiguous inputs
  return {
    agent: 'dungeon_master',
    instruction: 'Handle this player action in the narrative. Maintain story consistency and pacing.',
    phase: suggestedPhase,
    confidence: 0.5,
  };
}

export function suggestPhaseTransition(
  userInput: string,
  currentPhase: TTRPGPhase
): TTRPGPhase | null {
  for (const pt of PHASE_TRANSITIONS) {
    if (pt.trigger.test(userInput) && pt.from.includes(currentPhase)) {
      return pt.to;
    }
  }
  return null;
}
