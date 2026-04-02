# CLAUDE.md — DMLog.ai

## Project Overview
DMLog.ai is an AI-powered Dungeon Master for tabletop roleplaying games (D&D 5e), built as a Cloudflare Worker. It uses a BYOK (Bring Your Own Key) architecture where users supply their own LLM API keys to route requests to their preferred provider. Part of the Cocapn ecosystem at cocapn.ai.

GitHub Organization: **Lucineer**

## Architecture Summary

Single Cloudflare Worker serving everything:
- **Inline HTML UI** — all frontend HTML is string-interpolated directly in worker.ts
- **API Routes** — /api/chat, /api/byok, /api/campaign/:id/*, /health, /setup
- **BYOK LLM Routing** — 7 providers with cascading config discovery
- **Game Engine** — full D&D 5e systems in src/game/
- **Static Assets** — 42 scene images served from /public/

### Data Flow
```
User → Worker (worker.ts) → BYOK Module (byok.ts) → LLM Provider
                                ↓
                        Game Engine (src/game/)
                                ↓
                        KV Store (DMLOG_MEMORY)
```

## Key Commands

```bash
wrangler dev          # Local development server
wrangler deploy       # Deploy to Cloudflare Workers
wrangler tail         # Stream production logs
git push              # Deploy on push (if CI configured)
```

## Code Style & Conventions

- **TypeScript throughout**, no build step — Cloudflare runs TS natively
- **Zero runtime dependencies** for MVP — no npm packages
- **All commits** attributed to `Author: Superinstance`
- **Brand accent color**: #c9a23c (gold) — used in UI and theming
- **Inline HTML pattern** — no ASSETS binding, all HTML is string templates in worker.ts
- **No framework** — vanilla TS, direct Worker API

## Testing Approach

- Manual testing via `wrangler dev`
- `/health` endpoint for uptime monitoring
- Test BYOK routing with each provider manually
- Verify KV reads/writes through campaign endpoints

## Important File Paths

| Path | Purpose |
|------|---------|
| `src/worker.ts` | Worker entry point, all routes, inline HTML |
| `src/lib/byok.ts` | BYOK module — 503 lines, 7 LLM providers |
| `src/game/` | All D&D game systems |
| `public/` | 42 scene images |
| `wrangler.toml` | Cloudflare Worker config, KV bindings |
| `CLAUDE.md` | This file |

### Game Engine Modules (src/game/)
combat, spells, loot, NPCs, encounters, economy, factions, deities, weather, maps, quests, dialogue trees, character sheets, ability scores, trap system, reputation system, spellbook, monster manual, initiative tracker, magic item generator, random encounters, NPC generator

## What NOT to Change

- **BYOK module structure** — the config discovery cascade (URL params → Auth header → Cookie → KV → fail) is load-bearing
- **Inline HTML pattern** — no migration to ASSETS binding or external templates
- **Zero-dependency constraint** — do not add npm packages without discussion
- **KV binding name** `DMLOG_MEMORY` — referenced across campaign routes

## How to Add New Features

1. Create new module in `src/game/` or `src/lib/`
2. Import in `src/worker.ts`
3. Add route handler to the appropriate section in the fetch handler
4. For new LLM providers, extend `src/lib/byok.ts`
5. For new game systems, add to `src/game/` and integrate with existing combat/encounter flows

### Route Pattern
```typescript
// In worker.ts fetch handler
if (url.pathname.startsWith('/api/your-endpoint')) {
  return handleYourFeature(request, env);
}
```

## Deployment

1. `wrangler deploy` — deploys directly to Cloudflare
2. Ensure KV namespace `DMLOG_MEMORY` is bound in wrangler.toml
3. No environment variables needed — BYOK means users provide their own keys
4. Verify `/health` returns 200 after deploy

## Ecosystem Links

- **cocapn.ai** — parent ecosystem hub
- **Lucineer** — GitHub organization
- Other *log.ai repos follow the same Worker + BYOK + inline HTML pattern

## Project Stats
- 81 TypeScript files
- Primary theme: D&D 5e
- 7 LLM providers supported
- 42 scene images
- Cloudflare Workers runtime
