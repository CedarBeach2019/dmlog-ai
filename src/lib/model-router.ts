// Model router — multi-provider with DM-optimized defaults
// Supports DeepSeek, DeepInfra, SiliconFlow, Moonshot, OpenAI, Anthropic
// DM-specific: creative models prioritized for narrative quality

interface ModelConfig {
  name: string;
  provider: string;
  envKey: string;
  url: string;
  model: string;
  maxTokens: number;
  temperature: number;
  tier: 'narrative' | 'creative' | 'fast' | 'fallback';
}

// DM-optimized model list — ordered by quality for D&D narration
const DM_MODELS: ModelConfig[] = [
  // Tier 1: Best narrative quality
  { name: 'Seed-2.0-mini', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'ByteDance/Seed-2.0-mini', maxTokens: 2048, temperature: 0.85, tier: 'narrative' },
  { name: 'Step-3.5-Flash', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'stepfun-ai/Step-3.5-Flash', maxTokens: 2048, temperature: 0.85, tier: 'narrative' },
  { name: 'Seed-OSS-36B', provider: 'siliconflow', envKey: 'SILICONFLOW_API_KEY', url: 'https://api.siliconflow.com/v1/chat/completions', model: 'ByteDance-Seed/Seed-OSS-36B-Instruct', maxTokens: 2048, temperature: 0.85, tier: 'narrative' },

  // Tier 2: Strong general models
  { name: 'Nemotron-120B', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B', maxTokens: 2048, temperature: 0.8, tier: 'creative' },
  { name: 'DeepSeek-Chat', provider: 'deepseek', envKey: 'DEEPSEEK_API_KEY', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', maxTokens: 2048, temperature: 0.8, tier: 'creative' },
  { name: 'Qwen3-32B', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'Qwen/Qwen3-32B', maxTokens: 2048, temperature: 0.8, tier: 'creative' },

  // Tier 3: Fast fallbacks
  { name: 'Mistral-Small', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'mistralai/Mistral-Small-24B-Instruct-2501', maxTokens: 1024, temperature: 0.8, tier: 'fast' },
  { name: 'Phi-4', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'microsoft/phi-4', maxTokens: 1024, temperature: 0.8, tier: 'fast' },

  // Tier 4: Last resort
  { name: 'Gemma-27B', provider: 'deepinfra', envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'google/gemma-3-27b-it', maxTokens: 1024, temperature: 0.8, tier: 'fallback' },
];

// Track which models failed recently (simple cooldown)
const failedModels = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 1 minute cooldown on failed model

function getAvailableModels(env: Record<string, string>): ModelConfig[] {
  return DM_MODELS.filter(m => {
    if (failedModels.has(m.name) && Date.now() - failedModels.get(m.name)! < COOLDOWN_MS) return false;
    return !!env[m.envKey];
  });
}

export function selectDMModel(env: Record<string, string>): ModelConfig | null {
  const available = getAvailableModels(env);
  if (available.length === 0) return null;
  return available[0]; // First available = highest quality
}

export function selectDMModelByTier(env: Record<string, string>, tier: string): ModelConfig | null {
  const available = getAvailableModels(env).filter(m => m.tier === tier);
  if (available.length === 0) return selectDMModel(env);
  return available[0];
}

export function markModelFailed(modelName: string): void {
  failedModels.set(modelName, Date.now());
}

export function getDMModels(): ModelConfig[] {
  return [...DM_MODELS];
}

// For BYOK: user provides their own model config
export function buildBYOKModel(config: { apiUrl: string; apiKey: string; model: string }): ModelConfig {
  return {
    name: 'BYOK: ' + config.model,
    provider: 'byok',
    envKey: '__byok__',
    url: config.apiUrl,
    model: config.model,
    maxTokens: 2048,
    temperature: 0.85,
    tier: 'narrative',
  };
}
