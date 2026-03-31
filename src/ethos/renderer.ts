/**
 * GameRenderer — Converts game events into display instructions.
 *
 * Produces both an HTML string and a plain-text fallback.
 * Highlights entities (@NPC, *location*, [item]) with themed styles.
 * Supports combat summaries with text-based HP bars, dice result boxes,
 * system messages, and theme-aware CSS class hints.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'dark' | 'light';

export type SectionKind = 'narrative' | 'combat' | 'system' | 'dialogue';

export interface RenderedOutput {
  html: string;
  text: string;
  highlights: Highlight[];
  effects: string[];       // effect IDs to trigger (from EffectsEngine)
  section: SectionKind;
}

export interface Highlight {
  entity: string;
  type: 'npc' | 'location' | 'item' | 'spell' | 'keyword';
  startIndex: number;
  endIndex: number;
}

export interface CombatSummary {
  actorName: string;
  action: string;           // e.g. "slashes", "casts Fireball at"
  targetName: string;
  targetHp: number;
  targetMaxHp: number;
  damage?: number;
  healing?: number;
  diceResult?: string;      // e.g. "2d6+3 = 12"
  isCritical?: boolean;
  isPlayerTarget?: boolean;
}

export interface DiceDisplay {
  notation: string;         // e.g. "2d20+3"
  rolls: number[];
  total: number;
  modifier: number;
  finalTotal: number;
  advantage?: 'advantage' | 'disadvantage' | null;
  keptRoll?: number;
  droppedRoll?: number;
}

export interface SystemMessageData {
  kind: 'level_up' | 'quest_complete' | 'quest_start' | 'achievement' | 'death' | 'rest' | 'spell_learned' | 'warning';
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NPC_PATTERN = /@([A-Z][A-Za-z\s]+?)(?=[\s,.\-!:;?)]|$)/g;
const LOCATION_PATTERN = /\*([^*]+)\*/g;
const ITEM_PATTERN = /\[([^\]]+)\]/g;

const THEME_CLASSES: Record<Theme, string> = {
  dark: 'dm-theme-dark',
  light: 'dm-theme-light',
};

// ---------------------------------------------------------------------------
// GameRenderer
// ---------------------------------------------------------------------------

export class GameRenderer {
  private theme: Theme = 'dark';

  constructor(theme: Theme = 'dark') {
    this.theme = theme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  get themeClass(): string {
    return THEME_CLASSES[this.theme];
  }

  // -----------------------------------------------------------------------
  // Narration
  // -----------------------------------------------------------------------

  /**
   * Render a narrative text block.
   * Entity patterns are converted to styled HTML spans.
   */
  renderNarration(text: string): RenderedOutput {
    const highlights: Highlight[] = this.extractHighlights(text);

    let html = this.escapeHtml(text);

    // Apply entity highlighting (order matters — items first to avoid nested spans)
    html = html
      .replace(/\[([^\]]+)\]/g, '<span class="dm-entity dm-item">$1</span>')
      .replace(/\*([^*]+)\*/g, '<span class="dm-entity dm-location">$1</span>')
      .replace(/@([A-Z][A-Za-z\s]+?)(?=[\s,.\-!:;?)]|$)/g, '<span class="dm-entity dm-npc">$1</span>');

    return {
      html: `<div class="dm-narrative ${this.themeClass}">${html}</div>`,
      text: text
        .replace(NPC_PATTERN, '$1')
        .replace(LOCATION_PATTERN, '$1')
        .replace(ITEM_PATTERN, '$1'),
      highlights,
      effects: [],
      section: 'narrative',
    };
  }

  // -----------------------------------------------------------------------
  // Combat
  // -----------------------------------------------------------------------

  /**
   * Render a combat summary with HP bar, damage/healing, and optional dice result.
   */
  renderCombat(summary: CombatSummary): RenderedOutput {
    const hpBar = this.renderHpBar(summary.targetHp, summary.targetMaxHp);
    const hpPercent = Math.round((summary.targetHp / summary.targetMaxHp) * 100);

    const effects: string[] = [];
    if (summary.isCritical && summary.isPlayerTarget) effects.push('RED_FLASH');
    if (summary.isCritical && !summary.isPlayerTarget) effects.push('GOLD_GLOW');
    if (summary.damage && summary.damage > 0) effects.push('SHAKE');

    let actionText = '';
    if (summary.damage) {
      actionText = `<span class="dm-combat-damage">-${summary.damage} HP</span>`;
    }
    if (summary.healing) {
      actionText = `<span class="dm-combat-heal">+${summary.healing} HP</span>`;
    }

    const diceHtml = summary.diceResult
      ? `<span class="dm-dice-inline">${this.escapeHtml(summary.diceResult)}</span>`
      : '';

    const critTag = summary.isCritical
      ? '<span class="dm-critical">CRITICAL HIT!</span> '
      : '';

    const html = [
      `<div class="dm-combat ${this.themeClass}">`,
      `  <div class="dm-combat-header">`,
      `    ${critTag}<strong class="dm-combat-actor">${this.escapeHtml(summary.actorName)}</strong>`,
      `    ${this.escapeHtml(summary.action)}`,
      `    <strong class="dm-combat-target">${this.escapeHtml(summary.targetName)}</strong>`,
      `    ${diceHtml}`,
      `  </div>`,
      `  <div class="dm-combat-result">`,
      `    ${actionText}`,
      `  </div>`,
      `  <div class="dm-combat-hp">`,
      `    <span class="dm-hp-label">${this.escapeHtml(summary.targetName)}</span>`,
      `    <span class="dm-hp-bar">${hpBar}</span>`,
      `    <span class="dm-hp-values">${summary.targetHp}/${summary.targetMaxHp}</span>`,
      `  </div>`,
      `</div>`,
    ].join('\n');

    const plainText = [
      `${summary.isCritical ? 'CRITICAL! ' : ''}${summary.actorName} ${summary.action} ${summary.targetName}`,
      summary.diceResult ? `  ${summary.diceResult}` : '',
      summary.damage ? `  -${summary.damage} HP` : '',
      summary.healing ? `  +${summary.healing} HP` : '',
      `  ${summary.targetName}: ${hpBar} ${summary.targetHp}/${summary.targetMaxHp}`,
    ].filter(Boolean).join('\n');

    return {
      html,
      text: plainText,
      highlights: [
        { entity: summary.actorName, type: 'npc', startIndex: 0, endIndex: summary.actorName.length },
        { entity: summary.targetName, type: 'npc', startIndex: 0, endIndex: summary.targetName.length },
      ],
      effects,
      section: 'combat',
    };
  }

  // -----------------------------------------------------------------------
  // Dice result
  // -----------------------------------------------------------------------

  /**
   * Render a prominent dice result with box-drawing characters.
   */
  renderDiceResult(dice: DiceDisplay): RenderedOutput {
    const rollsDisplay = dice.rolls.join(', ');
    const advTag = dice.advantage
      ? ` (${dice.advantage === 'advantage' ? 'Advantage' : 'Disadvantage'}: kept ${dice.keptRoll}, dropped ${dice.droppedRoll})`
      : '';

    const top    = '┌─────────────────────────┐';
    const bottom = '└─────────────────────────┘';

    const html = [
      `<div class="dm-dice-result ${this.themeClass}">`,
      `  <div class="dm-dice-notation">${this.escapeHtml(dice.notation)}</div>`,
      `  <div class="dm-dice-rolls">[${rollsDisplay}]${dice.modifier !== 0 ? ` ${dice.modifier > 0 ? '+' : ''}${dice.modifier}` : ''}</div>`,
      dice.advantage ? `  <div class="dm-dice-advantage">${dice.advantage === 'advantage' ? '▲ Advantage' : '▼ Disadvantage'}: kept ${dice.keptRoll}, dropped ${dice.droppedRoll}</div>` : '',
      `  <div class="dm-dice-total">= ${dice.finalTotal}</div>`,
      `</div>`,
    ].filter(Boolean).join('\n');

    const plainText = [
      top,
      `│  ${dice.notation}`,
      `│  [${rollsDisplay}]${dice.modifier !== 0 ? ` ${dice.modifier > 0 ? '+' : ''}${dice.modifier}` : ''}${advTag}`,
      `│  = ${dice.finalTotal}`,
      bottom,
    ].join('\n');

    const isCrit = dice.sides === 20 && dice.rolls.some(r => r === 20);
    const isFumble = dice.sides === 20 && dice.rolls.some(r => r === 1);
    const effects: string[] = [];
    if (isCrit) effects.push('GOLD_GLOW');
    if (isFumble) effects.push('RED_FLASH');

    return {
      html,
      text: plainText,
      highlights: [],
      effects,
      section: 'system',
    };
  }

  // -----------------------------------------------------------------------
  // System message
  // -----------------------------------------------------------------------

  /**
   * Render a system message (level up, quest complete, etc.).
   */
  renderSystemMessage(data: SystemMessageData): RenderedOutput {
    const kindClass = `dm-system-${data.kind.replace('_', '-')}`;
    const effects: string[] = [];

    switch (data.kind) {
      case 'level_up':       effects.push('SPARKLE'); break;
      case 'quest_complete': effects.push('GOLD_GLOW'); break;
      case 'death':          effects.push('FADE_OUT'); break;
      case 'achievement':    effects.push('PULSE'); break;
      case 'warning':        effects.push('RED_FLASH'); break;
    }

    const icons: Record<SystemMessageData['kind'], string> = {
      level_up:       '⬆',
      quest_complete: '✦',
      quest_start:    '▻',
      achievement:    '★',
      death:          '✝',
      rest:           '♨',
      spell_learned:  '✧',
      warning:        '⚠',
    };

    const html = [
      `<div class="dm-system ${kindClass} ${this.themeClass}">`,
      `  <div class="dm-system-icon">${icons[data.kind]}</div>`,
      `  <div class="dm-system-title">${this.escapeHtml(data.title)}</div>`,
      `  <div class="dm-system-body">${this.escapeHtml(data.body)}</div>`,
      `</div>`,
    ].join('\n');

    const plainText = `${icons[data.kind]} ${data.title}\n${data.body}`;

    return {
      html,
      text: plainText,
      highlights: [],
      effects,
      section: 'system',
    };
  }

  // -----------------------------------------------------------------------
  // Dialogue
  // -----------------------------------------------------------------------

  /**
   * Render an NPC dialogue line with the speaker's name styled.
   */
  renderDialogue(speaker: string, line: string): RenderedOutput {
    const html = [
      `<div class="dm-dialogue ${this.themeClass}">`,
      `  <span class="dm-dialogue-speaker">${this.escapeHtml(speaker)}:</span>`,
      `  <span class="dm-dialogue-text">"${this.escapeHtml(line)}"</span>`,
      `</div>`,
    ].join('\n');

    return {
      html,
      text: `${speaker}: "${line}"`,
      highlights: [{ entity: speaker, type: 'npc', startIndex: 0, endIndex: speaker.length }],
      effects: [],
      section: 'dialogue',
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Render a text-based HP bar. Filled blocks vs empty blocks. */
  private renderHpBar(current: number, max: number): string {
    const barWidth = 10;
    const filled = Math.max(0, Math.min(barWidth, Math.round((current / max) * barWidth)));
    const empty = barWidth - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /** Extract highlight metadata from raw text before HTML escaping. */
  private extractHighlights(text: string): Highlight[] {
    const highlights: Highlight[] = [];

    let match: RegExpExecArray | null;
    NPC_PATTERN.lastIndex = 0;
    while ((match = NPC_PATTERN.exec(text)) !== null) {
      highlights.push({ entity: match[1], type: 'npc', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    LOCATION_PATTERN.lastIndex = 0;
    while ((match = LOCATION_PATTERN.exec(text)) !== null) {
      highlights.push({ entity: match[1], type: 'location', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    ITEM_PATTERN.lastIndex = 0;
    while ((match = ITEM_PATTERN.exec(text)) !== null) {
      highlights.push({ entity: match[1], type: 'item', startIndex: match.index, endIndex: match.index + match[0].length });
    }

    return highlights;
  }

  /** Escape HTML special characters. */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
