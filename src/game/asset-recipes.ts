/**
 * Asset Recipes — Prompt recipe system for DMLog asset generation.
 *
 * Builds structured prompts from components: asset type, subject, style,
 * resolution, and extra modifiers. Includes pre-built recipes for common
 * requests and specialized builders for sprites and scenes.
 */

import type { Resolution } from './world-styles.js';
import { getStyle, RESOLUTION_PROMPTS } from './world-styles.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetType = 'location' | 'monster' | 'item' | 'portrait' | 'map' | 'effect';

interface AssetRecipe {
  name: string;
  type: AssetType;
  subject: string;
  style: string;
  resolution: Resolution;
  extras: string[];
}

// ---------------------------------------------------------------------------
// Type-specific prompt templates
// ---------------------------------------------------------------------------

const TYPE_TEMPLATES: Record<AssetType, (subject: string, stylePrompt: string, extras: string[]) => string> = {
  location: (s, sp, ex) =>
    `${sp} of ${s}, establishing shot, sweeping vista, ${ex.join(', ')}, atmospheric, detailed environment, rich textures`,
  monster: (s, sp, ex) =>
    `${sp} depicting ${s}, dynamic pose, menacing presence, ${ex.join(', ')}, dramatic lighting, detailed anatomy`,
  item: (s, sp, ex) =>
    `${sp} showcasing ${s}, centered composition, intricate details, ${ex.join(', ')}, material textures, ornamental borders`,
  portrait: (s, sp, ex) =>
    `${sp} portrait of ${s}, upper body, expressive face, ${ex.join(', ')}, atmospheric background, character design`,
  map: (s, sp, ex) =>
    `${sp} illustrated map of ${s}, parchment texture, cartographic symbols, ${ex.join(', ')}, hand-drawn quality, compass rose`,
  effect: (s, sp, ex) =>
    `${sp} visual effect of ${s}, ethereal, translucent, ${ex.join(', ')}, particle effects, magical glow`,
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildAssetPrompt(
  type: AssetType,
  subject: string,
  style: string,
  resolution: Resolution = 'oil',
  extras: string[] = [],
): string {
  const s = getStyle(style);
  const stylePrompt = s ? s.prompt : style;
  const resPrompt = RESOLUTION_PROMPTS[resolution] ?? '';
  const template = TYPE_TEMPLATES[type];

  const base = template(subject, stylePrompt, extras);
  return `${resPrompt} ${base}`.replace(/\s+/g, ' ').trim();
}

export function buildSpritePrompt(
  character: string,
  palette: string[],
  action: string,
): string {
  const colors = palette.slice(0, 4).join(', ');
  return `SNES-era 32x32 pixel art sprite of ${character}, ${action} pose, ${colors} color palette, clean outlines, transparent background, 4-directional, game character sheet`;
}

export function buildScenePrompt(
  location: string,
  timeOfDay: string,
  weather: string,
  mood: string,
): string {
  return `Cinematic scene of ${location}, ${timeOfDay} lighting, ${weather} weather, ${mood} mood, establishing shot, detailed environment, atmospheric, concept art quality, rich colors`;
}

// ---------------------------------------------------------------------------
// Pre-built recipes
// ---------------------------------------------------------------------------

export const ASSET_RECIPES: AssetRecipe[] = [
  { name: 'Dark Forest Camp', type: 'location', subject: 'haunted forest clearing with campfire', style: 'celtic_druid', resolution: 'oil', extras: ['moonlight filtering through canopy', 'mysterious shadows'] },
  { name: 'Desert bazaar', type: 'location', subject: 'bustling desert marketplace', style: 'arabian_nights', resolution: 'watercolor', extras: ['sunset glow', 'spice stalls'] },
  { name: 'Mountain onsen', type: 'location', subject: 'steaming mountain hot spring inn', style: 'japanese_ukiyoe', resolution: 'oil', extras: ['snow-capped peaks', 'lantern light'] },
  { name: 'Jungle temple', type: 'location', subject: 'overgrown stepped pyramid in jungle', style: 'aztec_sun', resolution: 'photorealistic', extras: ['vine-covered stairs', 'dappled sunlight'] },
  { name: 'Dragon encounter', type: 'monster', subject: 'ancient dragon atop treasure hoard', style: 'norse_viking', resolution: 'oil', extras: ['fire breath', 'gold coins scattered'] },
  { name: 'Ghost maiden', type: 'monster', subject: 'weeping ghost woman by river', style: 'japanese_ukiyoe', resolution: 'watercolor', extras: ['willow tree', 'moonlit water'] },
  { name: 'Trickster god', type: 'monster', subject: 'spider trickster weaving illusions', style: 'african_ancestor', resolution: 'oil', extras: ['golden web threads', 'sunset silhouette'] },
  { name: 'Vampire lord', type: 'portrait', subject: 'elegant vampire noble in castle', style: 'slavic_dark', resolution: 'oil', extras: ['candlelit hall', 'red velvet cloak'] },
  { name: 'Samurai ronin', type: 'portrait', subject: 'wandering ronin under cherry blossoms', style: 'japanese_ukiyoe', resolution: 'watercolor', extras: ['windblown petals', 'distant mountain'] },
  { name: 'Healer elder', type: 'portrait', subject: 'wise village healer with herb pouch', style: 'native_spiritwalker', resolution: 'oil', extras: ['eagle feather', 'sage smoke'] },
  { name: 'Cursed blade', type: 'item', subject: 'cursed katana with spirit trapped in steel', style: 'japanese_ukiyoe', resolution: 'oil', extras: ['glowing runes', 'spirit wisps'] },
  { name: 'World map', type: 'map', subject: 'fantasy continent with trade routes and ruins', style: 'arabian_nights', resolution: 'oil', extras: ['sea monsters in margins', 'caravan paths'] },
  { name: 'Healing aura', type: 'effect', subject: 'divine healing light radiating outward', style: 'celtic_druid', resolution: 'watercolor', extras: ['golden particles', 'knotwork frame'] },
  { name: 'Fire storm', type: 'effect', subject: 'ifrit summoning fire storm', style: 'arabian_nights', resolution: 'oil', extras: ['sand mixing with flame', 'geometric patterns'] },
];
