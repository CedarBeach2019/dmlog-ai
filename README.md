# DMLog.ai — An AI Dungeon Master That Lives in Your Campaign Repo

> **Every NPC remembers. Every choice matters. The world evolves.**

DMLog.ai is an AI-powered TTRPG platform where the repo IS the Dungeon Master. Fork it, customize the DM's soul, deploy, and play. Built on the [cocapn](https://github.com/Lucineer/cocapn) paradigm — the agent lives in the repository, remembers across sessions, and evolves with your campaign.

## Quick Start

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/dmlog-ai.git
cd dmlog-ai
npm install
```

### 2. Configure Your LLM

```bash
# Set your LLM API key in .dev.vars
echo 'LLM_API_KEY=your-key' > .dev.vars
# Set the provider: openai, anthropic, or deepseek
echo 'LLM_PROVIDER=openai' >> .dev.vars
# Optional: override the model
echo 'LLM_MODEL=gpt-4o-mini' >> .dev.vars
```

### 3. Run Locally

```bash
npx wrangler dev
open http://localhost:8787
```

### 4. Deploy

```bash
npx wrangler deploy
```

Your DM is live. Share the URL with your players.

## Campaign Creation

Campaigns store world state, characters, NPCs, quests, and narrative history in Cloudflare KV.

### Create a Campaign

```bash
curl -X POST https://your-domain/api/campaign \
  -H 'Content-Type: application/json' \
  -d '{"name": "Shadows of Thornhaven", "system": "D&D 5e"}'
```

Returns a campaign ID and default world state (starting location, empty character roster).

### Load a Campaign

```bash
curl https://your-domain/api/campaign/<id>
```

Returns the full world state: characters, NPCs, locations, quests, combat state, and narrative log.

## DM Personality Customization

The DM's personality lives in `cocapn/soul.md`. Edit it, commit it, and the DM changes. It's version-controlled personality.

```markdown
---
name: grimshaw
tone: grim
avatar: 🦴
---

# I Am Your Dungeon Master

You are Grimshaw, a grim and methodical DM. You describe horror in clinical
detail. You reward cleverness and punish recklessness. You never fudge dice.
```

### Available Tones

| Tone | Style |
|------|-------|
| `dramatic` | Cinematic descriptions, heroic pacing |
| `humorous` | Witty narration, fourth-wall leans |
| `grim` | Dark atmosphere, lethal consequences |
| `mysterious` | Ambiguous clues, slow reveals |
| `casual` | Conversational, rules-light, fast-paced |

### Canon Enforcement

The DM maintains a **canon ledger** — established facts extracted from narration. Before every response, the system checks for contradictions against this ledger. If a dead NPC is narrated as alive, or a destroyed location is described as intact, the DM flags and corrects the inconsistency.

Canon facts are stored per campaign in KV at `campaign/{id}/canon.json`:

```json
{
  "subject": "Grimjaw",
  "fact": "Grimjaw is a troll chained in the depths below Brindenford",
  "source": "dm_narration",
  "timestamp": 1710000000000
}
```

## Game System

### Dice

| Input | Result |
|-------|--------|
| `d20` | Roll one 20-sided die |
| `2d6+3` | Roll 2d6, add 3 |
| `4d6kh3` | Roll 4d6, keep highest 3 |
| `1d20adv` | d20 with advantage |
| `1d20dis` | d20 with disadvantage |

All rolls use `crypto.getRandomValues()` — verifiable, auditable, fair.

### Combat

- **Initiative**: d20 + DEX modifier
- **Attack**: d20 + proficiency + STR/DEX vs AC
- **Damage**: weapon dice + modifier, doubled on crit
- **Conditions**: 15 types (blinded, charmed, frightened, grappled, paralyzed, etc.)
- **Death saves**: three successes stabilize, three failures die

### Character Creation

- **Races**: Human, Elf, Dwarf, Halfling, Gnome, Half-Orc, Tiefling, Dragonborn
- **Classes**: All 12 D&D 5e classes
- **Ability Scores**: Standard array, point buy, or 4d6 drop lowest
- **Equipment**: Weapons, armor, potions, scrolls, magical items with attunement

### World Systems

- Connected location graph with directional travel
- Day/night cycle with time-aware descriptions
- Dynamic weather (clear, rain, fog, storm, snow)
- Random encounter tables during travel
- NPC generation with backstories, motivations, and relationship webs

## Pro DM Features

### Story Snapshots

Capture and share campaign state at any point:

```bash
curl -X POST https://your-domain/api/campaign/<id>/snapshot
```

Returns a full snapshot including world state, character sheets, quest log, recent narrative, and canon facts — both as JSON and as formatted text for sharing.

### Multi-Channel Play

- **Web**: Full immersive UI with parchment theme, dice animations, and combat effects
- **Telegram**: Set `TELEGRAM_BOT_TOKEN` in `.dev.vars`, register webhook at `/api/channels/telegram`
- **Discord**: Set `DISCORD_PUBLIC_KEY` and `DISCORD_BOT_TOKEN`, register commands at `/api/channels/discord/register`

### Streaming Responses

The chat endpoint supports Server-Sent Events for real-time narration:

```bash
curl -X POST https://your-domain/api/chat?stream=true \
  -H 'Content-Type: application/json' \
  -d '{"message": "I open the door", "campaignId": "..."}'
```

Returns `text/event-stream` with `chunk`, `done`, and `canon_warning` events.

### A2A Protocol

Coordinate multiple campaigns in a shared world: broadcast events, migrate NPCs, enable cross-campaign trade and shared quests.

## API Reference

### Chat

```
POST /api/chat
Body: { message: string, campaignId?: string, characterId?: string }
Query: ?stream=true for SSE streaming
Response: { narration: string, intent: string, canonWarning?: string, worldState: object }
```

### Campaigns

```
POST   /api/campaign                  — Create campaign
GET    /api/campaign                  — List campaigns
GET    /api/campaign/:id              — Get world state
DELETE /api/campaign/:id              — Delete campaign
POST   /api/campaign/:id/snapshot     — Create story snapshot
```

### WebSocket

```
ws://host/ws
Send:    { type: 'join' | 'chat' | 'ping', payload: { ... } }
Receive: { type: 'joined' | 'start' | 'chunk' | 'done' | 'error', ... }
```

## Architecture

DMLog.ai uses a **Tripartite Architecture**:

| Layer | Name | Role |
|-------|------|------|
| **Pathos** | The DM | Personality, narrative voice, story generation |
| **Logos** | The World | State persistence, rules engine, consistency, memory |
| **Ethos** | The Action | Dice rolling, UI rendering, visual/audio effects |

### Tech Stack

- **Runtime**: Cloudflare Workers (Edge)
- **Storage**: Cloudflare KV (world state, campaigns, canon)
- **Language**: TypeScript (strict, ESM)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **LLM**: Multi-provider (OpenAI, Anthropic, DeepSeek)

## Screenshots

### Landing Page
A dark, gold-accented landing page with Cinzel headings, parchment textures, and a demo of a live session transcript showing DM narration, player actions, and dice rolls.

### Game Interface
Three-column layout: character sheet (left), narrative feed (center), game tools (right). Parchment-textured DM messages, d20 spin animations on dice rolls, red flash for damage, gold glow for healing. Portrait avatars on every message. Mobile-responsive with simplified sidebar toggles.

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Commits by agentic workers use `Author: Superinstance`.

## License

MIT License — see [LICENSE](./LICENSE)

---

Built with [cocapn](https://github.com/Lucineer/cocapn) — the repo IS the agent.
