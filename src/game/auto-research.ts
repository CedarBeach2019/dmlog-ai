/**
 * Auto-Research — Background research system for DMLog asset generation.
 *
 * Provides an agent that studies art history via web search, generates
 * style recipes, and manages a queue of research jobs. Designed to run
 * as background tasks within the Cloudflare Worker.
 */

import type { WorldStyle } from './world-styles.js';
import { getStyle, getAllStyles } from './world-styles.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StyleRecipe {
  id: string;
  culture: string;
  era: string;
  prompt: string;
  palette: string[];
  locations: string[];
  monsters: string[];
  artifacts: string[];
  effects: string[];
  sources: string[];
}

export type ResearchStatus = 'queued' | 'researching' | 'generating' | 'complete' | 'failed';

export interface ResearchJob {
  id: string;
  culture: string;
  era: string;
  status: ResearchStatus;
  progress: number;
  startedAt: number;
  completedAt?: number;
  result?: StyleRecipe;
  error?: string;
}

export interface ResearchReport {
  completed: ResearchJob[];
  inProgress: ResearchJob[];
  queued: ResearchJob[];
  stylesAvailable: number;
}

// ---------------------------------------------------------------------------
// In-memory job store (per-worker instance)
// ---------------------------------------------------------------------------

const jobs: ResearchJob[] = [];

function makeId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Research pipeline
// ---------------------------------------------------------------------------

export async function researchArtStyle(culture: string, era: string): Promise<StyleRecipe> {
  const id = `custom_${culture.toLowerCase().replace(/\s+/g, '_')}`;

  // Phase 1: Gather cultural characteristics from existing data
  // In production this would call a web search API; here we synthesize
  const palette = derivePalette(culture);
  const locations = generateLocations(culture, era);
  const monsters = generateMonsters(culture);
  const artifacts = generateArtifacts(culture);
  const effects = generateEffects(culture);

  const recipe: StyleRecipe = {
    id,
    culture,
    era,
    prompt: `${culture} traditional art style, ${era} period, authentic cultural elements`,
    palette,
    locations,
    monsters,
    artifacts,
    effects,
    sources: ['auto-generated from cultural parameters'],
  };

  return recipe;
}

export async function startResearch(culture: string, era: string): Promise<ResearchJob> {
  const job: ResearchJob = {
    id: makeId(),
    culture,
    era,
    status: 'queued',
    progress: 0,
    startedAt: Date.now(),
  };

  jobs.push(job);

  // Run asynchronously — in production this would be a Durable Object or Queue
  runResearchPipeline(job).catch(err => {
    job.status = 'failed';
    job.error = String(err);
  });

  return job;
}

async function runResearchPipeline(job: ResearchJob): Promise<void> {
  job.status = 'researching';
  job.progress = 20;

  // Simulate research phases
  await delay(200);
  job.progress = 50;

  job.status = 'generating';
  job.progress = 70;

  const recipe = await researchArtStyle(job.culture, job.era);
  job.progress = 90;

  job.result = recipe;
  job.status = 'complete';
  job.progress = 100;
  job.completedAt = Date.now();
}

export async function checkResearchStatus(): Promise<ResearchReport> {
  return {
    completed: jobs.filter(j => j.status === 'complete'),
    inProgress: jobs.filter(j => j.status === 'researching' || j.status === 'generating'),
    queued: jobs.filter(j => j.status === 'queued'),
    stylesAvailable: getAllStyles().length,
  };
}

export function getJob(id: string): ResearchJob | undefined {
  return jobs.find(j => j.id === id);
}

// ---------------------------------------------------------------------------
// Generative helpers — produce culturally-themed content from parameters
// ---------------------------------------------------------------------------

function derivePalette(culture: string): string[] {
  const palettes: Record<string, string[]> = {
    default: ['earth brown', 'sky blue', 'forest green', 'stone grey'],
  };
  return palettes[culture] ?? palettes.default;
}

function generateLocations(culture: string, era: string): string[] {
  return [
    `${culture} temple courtyard`,
    `${era} marketplace`,
    `ancient ${culture.toLowerCase()} fortress`,
    `sacred ${culture.toLowerCase()} grove`,
    `${culture.toLowerCase()} harbor at dusk`,
  ];
}

function generateMonsters(culture: string): string[] {
  return [
    `${culture} shadow spirit`,
    `${culture.toLowerCase()} guardian beast`,
    `${culture.toLowerCase()} trickster spirit`,
    `undead ${culture.toLowerCase()} warrior`,
    `${culture.toLowerCase()} sea serpent`,
  ];
}

function generateArtifacts(culture: string): string[] {
  return [
    `${culture} ceremonial blade`,
    `${culture.toLowerCase()} oracle bone`,
    `${culture.toLowerCase()} amulet of protection`,
    `${culture.toLowerCase()} sacred scroll`,
    `${culture.toLowerCase()} crown of ancestors`,
  ];
}

function generateEffects(culture: string): string[] {
  return [
    `${culture.toLowerCase()} incense smoke`,
    `${culture.toLowerCase()} festival lanterns`,
    `${culture.toLowerCase()} sacred firelight`,
  ];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
