/**
 * EffectsEngine — Triggers visual/audio feedback for game events.
 *
 * Pure CSS-based effects toggled on DOM elements.
 * No external dependencies. Provides getCSS() for injecting styles.
 * Sound effect support via data-attribute placeholders for future audio.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum EffectType {
  SCREEN_SHAKE = 'SCREEN_SHAKE',
  RED_FLASH    = 'RED_FLASH',
  GOLD_GLOW    = 'GOLD_GLOW',
  SPARKLE      = 'SPARKLE',
  FADE_IN      = 'FADE_IN',
  FADE_OUT     = 'FADE_OUT',
  PULSE        = 'PULSE',
  SHAKE        = 'SHAKE',
}

export interface EffectConfig {
  cssClass: string;
  defaultDuration: number;   // ms
  soundPlaceholder?: string; // data-sfx attribute value
}

export type GameEventType =
  | 'combat_hit'
  | 'combat_critical_player'
  | 'combat_critical_enemy'
  | 'spell_cast'
  | 'character_death'
  | 'level_up'
  | 'discovery'
  | 'quest_complete'
  | 'heal'
  | 'rest'
  | 'narration';

// ---------------------------------------------------------------------------
// Configuration maps
// ---------------------------------------------------------------------------

const EFFECT_CONFIGS: Record<EffectType, EffectConfig> = {
  [EffectType.SCREEN_SHAKE]: {
    cssClass: 'dm-fx-screen-shake',
    defaultDuration: 400,
    soundPlaceholder: 'sfx-impact-heavy',
  },
  [EffectType.RED_FLASH]: {
    cssClass: 'dm-fx-red-flash',
    defaultDuration: 300,
    soundPlaceholder: 'sfx-hit-critical',
  },
  [EffectType.GOLD_GLOW]: {
    cssClass: 'dm-fx-gold-glow',
    defaultDuration: 600,
    soundPlaceholder: 'sfx-critical-success',
  },
  [EffectType.SPARKLE]: {
    cssClass: 'dm-fx-sparkle',
    defaultDuration: 3000,
    soundPlaceholder: 'sfx-sparkle',
  },
  [EffectType.FADE_IN]: {
    cssClass: 'dm-fx-fade-in',
    defaultDuration: 500,
  },
  [EffectType.FADE_OUT]: {
    cssClass: 'dm-fx-fade-out',
    defaultDuration: 800,
    soundPlaceholder: 'sfx-death',
  },
  [EffectType.PULSE]: {
    cssClass: 'dm-fx-pulse',
    defaultDuration: 600,
    soundPlaceholder: 'sfx-achievement',
  },
  [EffectType.SHAKE]: {
    cssClass: 'dm-fx-shake',
    defaultDuration: 300,
    soundPlaceholder: 'sfx-impact',
  },
};

/** Map game events to one or more effect types. */
const EVENT_EFFECT_MAP: Record<GameEventType, EffectType[]> = {
  combat_hit:              [EffectType.SHAKE],
  combat_critical_player:  [EffectType.RED_FLASH, EffectType.SCREEN_SHAKE],
  combat_critical_enemy:   [EffectType.GOLD_GLOW],
  spell_cast:              [EffectType.SPARKLE],
  character_death:         [EffectType.FADE_OUT],
  level_up:                [EffectType.SPARKLE],
  discovery:               [EffectType.PULSE, EffectType.GOLD_GLOW],
  quest_complete:          [EffectType.GOLD_GLOW, EffectType.PULSE],
  heal:                    [EffectType.PULSE],
  rest:                    [EffectType.FADE_IN],
  narration:               [EffectType.FADE_IN],
};

// ---------------------------------------------------------------------------
// CSS Keyframes & Classes
// ---------------------------------------------------------------------------

const CSS = `
/* DMLog EffectsEngine — Auto-generated CSS */

@keyframes dm-fx-shake-kf {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px) translateY(2px); }
  40%      { transform: translateX(5px) translateY(-2px); }
  60%      { transform: translateX(-4px) translateY(1px); }
  80%      { transform: translateX(3px) translateY(-1px); }
}

@keyframes dm-fx-screen-shake-kf {
  0%, 100% { transform: translate(0, 0); }
  10%      { transform: translate(-8px, -4px); }
  20%      { transform: translate(7px, 3px); }
  30%      { transform: translate(-5px, 5px); }
  40%      { transform: translate(6px, -3px); }
  50%      { transform: translate(-4px, 2px); }
  60%      { transform: translate(3px, -4px); }
  70%      { transform: translate(-2px, 3px); }
  80%      { transform: translate(4px, -2px); }
  90%      { transform: translate(-3px, 1px); }
}

@keyframes dm-fx-red-flash-kf {
  0%   { background-color: transparent; }
  30%  { background-color: rgba(220, 40, 40, 0.35); }
  100% { background-color: transparent; }
}

@keyframes dm-fx-gold-glow-kf {
  0%   { box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
  50%  { box-shadow: 0 0 24px 4px rgba(212, 175, 55, 0.6); }
  100% { box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
}

@keyframes dm-fx-sparkle-kf {
  0%   { opacity: 1; filter: brightness(1); }
  25%  { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 6px gold); }
  50%  { opacity: 1; filter: brightness(1); }
  75%  { opacity: 1; filter: brightness(1.4) drop-shadow(0 0 4px gold); }
  100% { opacity: 1; filter: brightness(1); }
}

@keyframes dm-fx-fade-in-kf {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes dm-fx-fade-out-kf {
  0%   { opacity: 1; }
  100% { opacity: 0.15; filter: grayscale(0.8); }
}

@keyframes dm-fx-pulse-kf {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}

/* Effect CSS classes */
.dm-fx-shake {
  animation: dm-fx-shake-kf 0.3s ease-in-out;
}

.dm-fx-screen-shake {
  animation: dm-fx-screen-shake-kf 0.4s ease-in-out;
}

.dm-fx-red-flash {
  animation: dm-fx-red-flash-kf 0.3s ease-out;
}

.dm-fx-gold-glow {
  animation: dm-fx-gold-glow-kf 0.6s ease-in-out;
}

.dm-fx-sparkle {
  animation: dm-fx-sparkle-kf 1s ease-in-out infinite;
}

.dm-fx-fade-in {
  animation: dm-fx-fade-in-kf 0.5s ease-out;
}

.dm-fx-fade-out {
  animation: dm-fx-fade-out-kf 0.8s ease-out forwards;
}

.dm-fx-pulse {
  animation: dm-fx-pulse-kf 0.6s ease-in-out;
}
`;

// ---------------------------------------------------------------------------
// EffectsEngine
// ---------------------------------------------------------------------------

export class EffectsEngine {
  private activeEffects: Map<string, { cssClass: string; timerId: ReturnType<typeof setTimeout> }> = new Map();

  /**
   * Trigger an effect on a DOM element by its ID.
   * Adds the CSS class for `duration` ms, then removes it.
   *
   * In a Workers environment where DOM is unavailable, this is a no-op at runtime
   * but still records the effect for client-side replay.
   */
  trigger(effectType: EffectType, elementId: string, duration?: number): void {
    const config = EFFECT_CONFIGS[effectType];
    if (!config) {
      console.warn(`[EffectsEngine] Unknown effect type: ${effectType}`);
      return;
    }

    const ms = duration ?? config.defaultDuration;

    // Clear any existing effect on this element
    this.clearEffect(elementId);

    // Store the active effect
    const timerId = setTimeout(() => {
      this.removeCssClass(elementId, config.cssClass);
      this.activeEffects.delete(elementId);
    }, ms);

    this.activeEffects.set(elementId, { cssClass: config.cssClass, timerId });

    // Apply the CSS class
    this.addCssClass(elementId, config.cssClass);

    // Set sound placeholder data attribute for future audio integration
    if (config.soundPlaceholder) {
      this.setDataAttribute(elementId, 'data-sfx', config.soundPlaceholder);
    }
  }

  /**
   * Trigger all effects mapped to a game event type.
   */
  triggerForEvent(event: GameEventType, elementId: string, duration?: number): void {
    const effects = EVENT_EFFECT_MAP[event] ?? [];
    // Stagger multiple effects by 50ms each
    effects.forEach((effect, i) => {
      setTimeout(() => this.trigger(effect, elementId, duration), i * 50);
    });
  }

  /**
   * Immediately remove all active effects from a given element.
   */
  clearEffect(elementId: string): void {
    const active = this.activeEffects.get(elementId);
    if (active) {
      clearTimeout(active.timerId);
      this.removeCssClass(elementId, active.cssClass);
      this.activeEffects.delete(elementId);
    }
  }

  /**
   * Remove all active effects across all elements.
   */
  clearAll(): void {
    for (const elementId of this.activeEffects.keys()) {
      this.clearEffect(elementId);
    }
  }

  /**
   * Return all effect CSS as a single stylesheet string.
   * Inject into <style> or use with CSS-in-JS.
   */
  getCSS(): string {
    return CSS;
  }

  /**
   * Get the list of effect types that would fire for a given game event.
   * Useful for serialising to the client when DOM is not available server-side.
   */
  getEffectsForEvent(event: GameEventType): EffectType[] {
    return EVENT_EFFECT_MAP[event] ?? [];
  }

  // -----------------------------------------------------------------------
  // DOM helpers (safe for Workers — guard with typeof check)
  // -----------------------------------------------------------------------

  private addCssClass(elementId: string, cssClass: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el) el.classList.add(cssClass);
    }
  }

  private removeCssClass(elementId: string, cssClass: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el) el.classList.remove(cssClass);
    }
  }

  private setDataAttribute(elementId: string, attr: string, value: string): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId);
      if (el) el.setAttribute(attr, value);
    }
  }
}
