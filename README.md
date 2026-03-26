# DMlog.ai 🐉

> **Your AI Dungeon Master Remembers.**

DMlog.ai is an AI-powered Dungeon Master for D&D 5e and other TTRPGs. Unlike any other AI DM, it **never forgets** — every session, NPC, plot twist, and player choice is logged and remembered across campaigns.

## Why DMlog.ai?

- **Persistent Memory**: The LOG remembers every session. NPCs you met 6 months ago remember you too.
- **Multiple DM Voices**: Compare how a rules-lawyer DM vs. a narrative DM would handle the same scene.
- **Style Learning**: Over time, the AI learns what your table enjoys — more combat? More roleplay? More puzzles?
- **Prep Assistant**: Generate NPCs, encounters, loot, and world-building on demand.
- **Session Recap**: Never lose track of where the story left off.

## Quick Start

### 1. Clone & Deploy

```bash
git clone https://github.com/CedarBeach2019/dmlog-ai.git
cd dmlog-ai
npm install

# Create Cloudflare resources
CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 create dmlog-db
# Update wrangler.toml with database_id
CLOUDFLARE_API_TOKEN=xxx npx wrangler kv namespace create dmlog-kv
# Update wrangler.toml with KV id

# Run migration
CLOUDFLARE_API_TOKEN=xxx npx wrangler d1 execute dmlog-db --remote --file=migrations/0001_initial.sql

# Set secrets
echo "your-jwt-secret" | CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put JWT_SECRET
echo "your-deepseek-key" | CLOUDFLARE_API_TOKEN=xxx npx wrangler secret put DEEPSEEK_API_KEY

# Deploy
CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy
```

### 2. Start Playing

Register an account, then start chatting. Use slash commands to trigger specific DM behaviors:

| Command | Behavior | Why |
|---------|----------|-----|
| `/attack` | Detailed combat logic | Needs accuracy |
| `/describe` | Atmospheric scene-setting | Creative flair |
| `/rules` | D&D 5e rules reference | Must be precise |
| `/npc` | Compare NPC personality options | Multiple voices |
| `/loot` | Treasure generation | Fun, fast |
| `/roll` | Dice rolling | No AI needed |
| `/rest` | Recovery mechanics | Rules knowledge |
| `/backstory` | World-consistent character history | Context matters |

## The LOG Advantage

Every interaction is stored as an **interaction record** — the input, the classification, which AI model handled it, the response, and any feedback you give. This creates something no other AI DM has:

**Comparative training data.** When you use draft mode to compare how two DM voices handle the same scene, and pick a winner, that preference is logged. Over time, the routing system learns your table's style and routes to the right model automatically.

This is the **moat**. The more you play, the better your DM gets.

## Fork of log-origin

DMlog.ai is a themed fork of [log-origin](https://github.com/CedarBeach2019/log-origin) — the white-label AI gateway. All customization lives in `config/custom/`:

- `personality.md` — DM persona with 4 voice modes
- `rules.json` — TTRPG-specific routing rules
- `theme.css` — Fantasy parchment/gold UI theme
- `templates/` — 8 D&D prompt templates

## Architecture

- **Runtime**: Cloudflare Workers (free tier: 100K req/day)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Cache**: Cloudflare KV
- **AI**: DeepSeek (configurable — add any OpenAI-compatible provider)
- **UI**: Preact + HTM (no build step, <30KB)
- **Auth**: PBKDF2 passphrase hashing, JWT via Web Crypto

## Cost

$0/month on Cloudflare's free tier. 100,000 requests/day, 5GB D1 storage, unlimited KV reads.

## License

MIT
