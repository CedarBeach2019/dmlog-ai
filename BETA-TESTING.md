# DMlog.ai Beta Testing Guide

**Live URL**: https://dmlog-ai.magnus-digennaro.workers.dev  
**Core URL**: https://log-origin.magnus-digennaro.workers.dev  
**Date**: 2026-03-27

## Quick Start (No Account Needed)

1. Visit the URL → Landing page with castle emoji
2. Click **"🎮 Start a Campaign — No Signup"**
3. Pick a world (4 options), class (6 options), name your hero
4. AI generates opening scene → Click "Continue the Adventure"
5. You're in the chat! DM responds, NPCs auto-extracted, dice roller available

## Test Checklist

### Authentication
- [ ] Guest mode: Click "⚡ Quick play" → get 5 free messages
- [ ] After 5 messages → inline "Create Free Account" prompt appears
- [ ] Register: Click "Create account" → set passphrase (8+ chars) → logged in
- [ ] Login: Log out (clear sessionStorage), log back in with passphrase
- [ ] Guest limit doesn't affect logged-in users

### Chat
- [ ] Send a message → streaming response appears word-by-word
- [ ] Typing indicator (bouncing dots) shows before first token
- [ ] Messages have timestamps and model badges
- [ ] 👍👎 feedback buttons work (toast confirmation)
- [ ] Enter sends, Shift+Enter for newline
- [ ] Prompt chips on empty state (tavern, treasure, dragon, world)

### Sessions
- [ ] Sidebar shows session list with message counts
- [ ] Click a session → loads history
- [ ] "⚔️ New Adventure" clears chat for new session
- [ ] 📝 Recap button generates AI summary
- [ ] 📥 Export button downloads .md file
- [ ] 🗑️ Delete removes session
- [ ] 🔍 Search bar filters sessions by text

### Draft Comparison
- [ ] Click 🎯 button → enter draft mode
- [ ] Type a message → 2 drafts appear side-by-side (Creative + Concise)
- [ ] Click "✓ Use this" on one → selected, other dismissed
- [ ] Draft mode exits, selected response becomes chat message

### Dice Roller
- [ ] Click 🎲 button → popup appears above input
- [ ] Select dice type (d4, d6, d8, d10, d12, d20, d100)
- [ ] Adjust count (1-10) and modifier (+/-)
- [ ] Click Roll → animated result appears
- [ ] Result posted as system message in chat

### Character Stats
- [ ] After quickstart: thin stats bar shows below chat header
- [ ] Shows STR/DEX/CON/INT/WIS/CHA values
- [ ] Click to expand/collapse
- [ ] HP bar visible

### NPC Panel
- [ ] Right panel shows "👥 NPCs"
- [ ] Character card from quickstart (icon, name, class, world)
- [ ] As DM mentions NPCs → they appear in the list
- [ ] Click NPC → expand details (first seen, last seen, mention count)
- [ ] Panel refreshes after each message

### Settings (⚙️)
- [ ] Models tab: Shows DeepSeek with green status dot
- [ ] Play tab: Streaming toggle, PII toggle, Dark mode toggle
- [ ] Toggling any setting → persists (survives page reload)
- [ ] About tab: Source links, tech badges, version info
- [ ] Keyboard shortcuts: Enter, Shift+Enter, Ctrl+B, Esc

### Analytics (📊)
- [ ] Click 📊 in chat actions → analytics panel opens
- [ ] Overview tab: message count, sessions, satisfaction, avg latency
- [ ] Routes tab: route distribution, model performance
- [ ] Activity tab: daily activity chart

### Theme
- [ ] Dark mode (default) → gold accents on DM messages
- [ ] Click ☀️ → light mode → theme persists
- [ ] PWA: Can "Add to Home Screen" on mobile

### Mobile
- [ ] Sidebar collapses → hamburger menu ☰
- [ ] NPC panel hides on small screens
- [ ] Session cards stack, buttons tappable
- [ ] Text input doesn't overflow screen

## Known Issues (Beta)
1. **No real browser testing yet** — all verified via curl + code review
2. **PII shows dehydrated tokens** if you type real PII (by design — encrypted)
3. **Rate limit** — 60 req/min per IP, can hit during rapid testing
4. **NPC extraction** — regex-based, may miss unusual name formats
5. **Dice roller** — client-side only, no server-side dice verification
6. **Character stats** — only from quickstart, no in-game stat changes
7. **Export** — no timestamped versions, just current snapshot

## API Endpoints (for power users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /v1/auth/guest | Guest token (5 messages) |
| POST | /v1/auth/register | Create account (passphrase) |
| POST | /v1/auth/login | Login |
| POST | /v1/chat/completions | Chat (streaming SSE) |
| GET | /v1/sessions | List sessions |
| POST | /v1/sessions | Create session |
| GET | /v1/sessions/:id | Load session + messages |
| GET | /v1/sessions/:id/recap | AI-generated recap |
| GET | /v1/sessions/:id/export?format=md\|json | Download session |
| DELETE | /v1/sessions/:id | Delete session |
| PATCH | /v1/sessions/:id | Update summary |
| POST | /v1/drafts/compare | Draft comparison (2 profiles) |
| POST | /v1/drafts/winner/:id | Record draft winner |
| GET | /v1/chat/npcs | List extracted NPCs |
| GET | /v1/preferences | Get user preferences |
| PUT | /v1/preferences | Update preferences |
| GET | /v1/analytics/summary | Quick stats |
| GET | /v1/analytics/routes | Route + model analytics |
| GET | /v1/health | Health check |

## Tech Stack
- **Runtime**: Cloudflare Workers (edge, cold start ~5ms)
- **Database**: D1 (SQLite at the edge)
- **Cache**: KV (rate limits, guest tokens)
- **AI**: DeepSeek (deepseek-chat)
- **Frontend**: Preact 10.20.2 + HTM 3.1.1 (no build step, 16 components)
- **Auth**: PBKDF2 100K iterations, JWT
- **Privacy**: PII dehydrate/rehydrate (entity tokens like [EMAIL_1])
- **Routing**: 16 regex-based rules (5ms classification)
