/**
 * NPC Extraction — parses AI narrative text for NPC mentions.
 * Extracts names, descriptions, and relationships from chat responses.
 * Stores in D1 for the sidebar NPC panel.
 */
import type { D1Database } from '@cloudflare/workers-types';

export interface ExtractedNPC {
  name: string;
  title?: string;
  description?: string;
  location?: string;
  firstMentioned: string; // ISO timestamp
  lastMentioned: string;
  mentionCount: number;
}

/**
 * Extract NPC names from narrative text.
 * Pattern: capitalized words followed by descriptive phrases.
 * e.g., "The innkeeper, Bartholomew, poured ale" → name: "Bartholomew"
 */
export function extractNPCs(text: string): ExtractedNPC[] {
  const npcs: ExtractedNPC[] = [];
  const now = new Date().toISOString();

  // Pattern 1: "Name, the Title" — "Elara, the Elven Ranger"
  const titlePattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?), (?:the |a |an )([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b/g;
  let match;
  while ((match = titlePattern.exec(text)) !== null) {
    // Filter common false positives
    if (['The', 'This', 'That', 'Your', 'My', 'His', 'Her'].includes(match[1])) continue;
    // Filter D&D terms
    if (['Dungeon', 'Dragon', 'Magic', 'Arcane', 'Divine', 'Nature', 'Ranger', 'Fighter', 'Wizard', 'Cleric', 'Rogue', 'Bard', 'Paladin', 'Barbarian', 'Monk', 'Druid', 'Sorcerer', 'Warlock'].includes(match[1])) continue;

    npcs.push({
      name: match[1],
      title: match[2].toLowerCase(),
      description: '',
      firstMentioned: now,
      lastMentioned: now,
      mentionCount: 1,
    });
  }

  // Pattern 2: "Name the Title" — "Bartholomew the innkeeper"
  const titlePattern2 = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) the ([a-z]+(?: [a-z]+)?)\b/g;
  while ((match = titlePattern2.exec(text)) !== null) {
    if (['The', 'This', 'That', 'Your', 'My'].includes(match[1])) continue;
    const name = match[1];
    const title = match[2];
    // Avoid duplicates
    if (npcs.find(n => n.name === name)) continue;
    // Only accept if title looks like a job/descriptor
    if (title.length > 3 && title.length < 25) {
      npcs.push({
        name,
        title,
        description: '',
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1,
      });
    }
  }

  // Pattern 3: Proper names in quotes — "Greetings, traveler," said the old woman
  const quotedPattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?)\b(?=.*(?:said|whispered|shouted|called|replied|muttered|cried|laughed|sighed))/gi;
  while ((match = quotedPattern.exec(text)) !== null) {
    if (['The', 'This', 'That', 'Your', 'My', 'His', 'Her', 'You', 'It', 'They', 'We', 'There', 'Here', 'What', 'How', 'Why', 'When', 'Where'].includes(match[1])) continue;
    const name = match[1];
    if (!npcs.find(n => n.name === name)) {
      npcs.push({
        name,
        description: '',
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1,
      });
    }
  }

  // Pattern 4: "A [adjective] [race] named Name"
  const namedPattern = /\b(?:a|an|the)\s+(?:old|young|tall|short|dark|pale|scarred|hooded|robed|armored)\s+(?:man|woman|elf|dwarf|halfling|gnome|orc|goblin|dragon|giant|troll|wizard|witch|priest|guard|merchant|thief|bard|knight|queen|king|prince|princess|captain|commander|captain|sergeant|soldier|boy|girl|child|elder)\s+(?:named|called)\s+([A-Z][a-z]+)/g;
  while ((match = namedPattern.exec(text)) !== null) {
    const name = match[1];
    if (!npcs.find(n => n.name === name)) {
      npcs.push({
        name,
        description: '',
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1,
      });
    }
  }

  return npcs;
}

/**
 * Upsert extracted NPCs into D1.
 */
export async function upsertNPCs(db: D1Database, userId: string, npcs: ExtractedNPC[], sessionId: string) {
  for (const npc of npcs) {
    try {
      await db.prepare(`
        INSERT INTO npcs (id, user_id, session_id, name, title, description, first_mentioned, last_mentioned, mention_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, name) DO UPDATE SET
          title = COALESCE(NULLIF(excluded.title, ''), npcs.title),
          description = COALESCE(NULLIF(excluded.description, ''), npcs.description),
          last_mentioned = excluded.last_mentioned,
          mention_count = npcs.mention_count + 1
      `).bind(
        crypto.randomUUID(), userId, sessionId,
        npc.name, npc.title || null, npc.description || null,
        npc.firstMentioned, npc.lastMentioned, npc.mentionCount,
      ).run();
    } catch (err) {
      console.error(`Failed to upsert NPC ${npc.name}:`, err);
    }
  }
}

/**
 * Get all NPCs for a user.
 */
export async function getNPCs(db: D1Database, userId: string): Promise<ExtractedNPC[]> {
  const result = await db.prepare(`
    SELECT name, title, description, first_mentioned, last_mentioned, mention_count
    FROM npcs WHERE user_id = ? ORDER BY last_mentioned DESC LIMIT 50
  `).bind(userId).all<{ name: string; title: string | null; description: string | null; first_mentioned: string; last_mentioned: string; mention_count: number }>();

  return (result.results ?? []).map(r => ({
    name: r.name,
    title: r.title || undefined,
    description: r.description || undefined,
    firstMentioned: r.first_mentioned,
    lastMentioned: r.last_mentioned,
    mentionCount: r.mention_count,
  }));
}
