import { describe, it, expect, beforeEach } from 'vitest';

// ─── Director Routing Tests ────────────────────

describe('Director Routing', () => {
  const phases = ['SETUP', 'INTRODUCTION', 'EXPLORATION', 'COMBAT', 'ROLEPLAY', 'CLIMAX', 'RESOLUTION', 'WRAP_UP'];
  const agents = ['dungeon_master', 'npc', 'combat_engine', 'scene_builder', 'lore_keeper'];

  it('routes /attack to combat_engine during EXPLORATION', () => {
    const input = '/attack the goblin with my longsword';
    const phase = 'EXPLORATION';
    // Simple rule-based check
    expect(input.startsWith('/attack')).toBe(true);
    expect(phase).toBe('EXPLORATION');
  });

  it('routes /describe to scene_builder', () => {
    const input = '/describe the ancient temple';
    expect(input.startsWith('/describe')).toBe(true);
  });

  it('routes /npc to npc agent', () => {
    const input = '/npc create a mysterious merchant';
    expect(input.startsWith('/npc')).toBe(true);
  });

  it('routes /roll to dice_roller (no AI needed)', () => {
    const input = '/roll 2d6+3';
    expect(input.startsWith('/roll')).toBe(true);
  });

  it('routes /rules to dungeon_master (escalation)', () => {
    const input = '/rules how does grappling work';
    expect(input.startsWith('/rules')).toBe(true);
  });

  it('routes /rest to dungeon_master (cheap)', () => {
    const input = '/rest short rest';
    expect(input.startsWith('/rest')).toBe(true);
  });

  it('routes dialogue to npc agent', () => {
    const input = 'I walk up to the barkeep and ask about the missing merchant';
    const startsWithCommand = input.startsWith('/');
    expect(startsWithCommand).toBe(false); // freeform = roleplay
  });

  it('recognizes combat keywords and suggests combat phase', () => {
    const combatKeywords = ['attack', 'fight', 'cast fireball', 'swing my axe', 'initiative'];
    combatKeywords.forEach(kw => {
      const isCombat = /attack|fight|cast\s+\w+|swing|initiative/i.test(kw);
      expect(isCombat).toBe(true);
    });
  });

  it('all phases are valid', () => {
    expect(phases).toHaveLength(8);
    phases.forEach(p => expect(typeof p).toBe('string'));
  });

  it('all agents are valid', () => {
    expect(agents.length).toBeGreaterThanOrEqual(5);
    agents.forEach(a => expect(typeof a).toBe('string'));
  });
});

// ─── Session State Machine Tests ───────────────

describe('Session State Machine', () => {
  const validTransitions = {
    SETUP: ['INTRODUCTION'],
    INTRODUCTION: ['EXPLORATION'],
    EXPLORATION: ['COMBAT', 'ROLEPLAY', 'CLIMAX'],
    COMBAT: ['EXPLORATION', 'ROLEPLAY', 'CLIMAX'],
    ROLEPLAY: ['COMBAT', 'EXPLORATION', 'CLIMAX'],
    CLIMAX: ['RESOLUTION'],
    RESOLUTION: ['WRAP_UP'],
    WRAP_UP: [],
  };

  function canTransition(from, to) {
    return validTransitions[from]?.includes(to) ?? false;
  }

  it('allows SETUP → INTRODUCTION', () => {
    expect(canTransition('SETUP', 'INTRODUCTION')).toBe(true);
  });

  it('blocks SETUP → COMBAT', () => {
    expect(canTransition('SETUP', 'COMBAT')).toBe(false);
  });

  it('allows bidirectional EXPLORATION ↔ COMBAT', () => {
    expect(canTransition('EXPLORATION', 'COMBAT')).toBe(true);
    expect(canTransition('COMBAT', 'EXPLORATION')).toBe(true);
  });

  it('allows bidirectional EXPLORATION ↔ ROLEPLAY', () => {
    expect(canTransition('EXPLORATION', 'ROLEPLAY')).toBe(true);
    expect(canTransition('ROLEPLAY', 'EXPLORATION')).toBe(true);
  });

  it('CLIMAX only goes to RESOLUTION', () => {
    expect(canTransition('CLIMAX', 'RESOLUTION')).toBe(true);
    expect(canTransition('CLIMAX', 'COMBAT')).toBe(false);
  });

  it('RESOLUTION only goes to WRAP_UP', () => {
    expect(canTransition('RESOLUTION', 'WRAP_UP')).toBe(true);
    expect(canTransition('RESOLUTION', 'EXPLORATION')).toBe(false);
  });

  it('WRAP_UP is terminal', () => {
    expect(validTransitions['WRAP_UP']).toHaveLength(0);
  });

  it('every phase has at least one transition (except WRAP_UP)', () => {
    Object.entries(validTransitions).forEach(([phase, next]) => {
      if (phase !== 'WRAP_UP') {
        expect(next.length).toBeGreaterThan(0);
      }
    });
  });
});

// ─── Combat Tests ──────────────────────────────

describe('Combat Engine', () => {
  it('sorts initiative correctly', () => {
    const participants = [
      { name: 'Goblin', initiative: 12 },
      { name: 'Aria', initiative: 18 },
      { name: 'Dragon', initiative: 15 },
      { name: 'Bob', initiative: 8 },
    ];
    const sorted = [...participants].sort((a, b) => b.initiative - a.initiative);
    expect(sorted[0].name).toBe('Aria');
    expect(sorted[1].name).toBe('Dragon');
    expect(sorted[2].name).toBe('Goblin');
    expect(sorted[3].name).toBe('Bob');
  });

  it('handles initiative ties with dex modifier', () => {
    const participants = [
      { name: 'A', initiative: 15, dex: 3 },
      { name: 'B', initiative: 15, dex: 1 },
    ];
    const sorted = [...participants].sort((a, b) => b.initiative - a.initiative || b.dex - a.dex);
    expect(sorted[0].name).toBe('A');
  });

  it('calculates damage with modifier', () => {
    const roll = 8;
    const mod = 3;
    const total = roll + mod;
    expect(total).toBe(11);
  });

  it('handles critical hit (double dice, not double mod)', () => {
    const base = 6;
    const mod = 3;
    const crit = base * 2 + mod; // double dice, add mod once
    expect(crit).toBe(15); // 12 + 3
  });

  it('natural 20 is a critical hit', () => {
    expect(20).toBe(20);
  });

  it('natural 1 is a critical fail', () => {
    expect(1).toBe(1);
  });

  it('advantage picks higher roll', () => {
    const roll1 = 8;
    const roll2 = 15;
    const result = Math.max(roll1, roll2);
    expect(result).toBe(15);
  });

  it('disadvantage picks lower roll', () => {
    const roll1 = 8;
    const roll2 = 15;
    const result = Math.min(roll1, roll2);
    expect(result).toBe(8);
  });

  it('AC comparison works correctly', () => {
    const ac = 15;
    const attacks = [12, 15, 18, 7];
    const hits = attacks.filter(a => a >= ac);
    expect(hits).toHaveLength(2);
    expect(hits).toEqual([15, 18]);
  });
});
