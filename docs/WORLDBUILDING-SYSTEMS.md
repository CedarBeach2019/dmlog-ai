# DMlog.ai — Worldbuilding Systems Research & Feature Design

> **Document Version:** 1.0  
> **Date:** 2026-03-26  
> **Purpose:** Deep research on worldbuilding systems, games, and digital tools for TTRPGs,
> with actionable feature designs for DMlog.ai integration.

---

## Table of Contents

1. [Research: Tabletop Worldbuilding Games](#1-research-tabletop-worldbuilding-games)
   - [1.1 Microscope](#11-microscope)
   - [1.2 Dawn of Worlds](#12-dawn-of-worlds)
   - [1.3 Kingdom](#13-kingdom)
2. [Research: Books & Guides](#2-research-books--guides)
   - [2.1 The Ultimate RPG Game Master's Worldbuilding Guide](#21-the-ultimate-rpg-game-masters-worldbuilding-guide)
3. [Research: Digital Tools](#3-research-digital-tools)
   - [3.1 Kanka.io](#31-kankaio)
   - [3.2 Obsidian for TTRPG](#32-obsidian-for-ttrpg)
   - [3.3 D&D Beyond Maps](#33-dd-beyond-maps)
   - [3.4 Friends & Fables](#34-friends--fables)
   - [3.5 World Anvil](#35-world-anvil)
   - [3.6 Foundry VTT Modules](#36-foundry-vtt-modules)
   - [3.7 D&D Beyond Platform](#37-dd-beyond-platform)
4. [Feature Design: World Builder Mode](#4-feature-design-world-builder-mode)
5. [Feature Design: Faction & Kingdom System](#5-feature-design-faction--kingdom-system)
6. [Feature Design: Deep NPC System](#6-feature-design-deep-npc-system)
7. [Feature Design: Pantheon & Magic System Builder](#7-feature-design-pantheon--magic-system-builder)
8. [Feature Design: Campaign Chronicle](#8-feature-design-campaign-chronicle)
9. [Feature Design: Multi-Agent Spectator Mode](#9-feature-design-multi-agent-spectator-mode)
10. [Cross-Cutting Data Models](#10-cross-cutting-data-models)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Competitive Analysis Matrix](#12-competitive-analysis-matrix)

---

# 1. Research: Tabletop Worldbuilding Games

## 1.1 Microscope

### Core Mechanics

Microscope (by Ben Robbins, Lame Mage Productions) is a **fractal, non-linear history-building game**.
There is no GM. Players collaboratively build the history of a world — from its creation to its end (or
any span the group chooses) — by placing periods, events, and scenes on a timeline.

**Key mechanical concepts:**

- **The Palette:** Before play begins, players establish what IS and ISN'T in the world. This prevents
  contradiction and establishes shared assumptions. E.g., "Magic exists" / "There are no elves."
- **Lenses:** Each round, one player has the Lens — they get to choose the focus for that round. The
  Lens player picks a topic (e.g., "The Fall of the Elven Empire") and everyone adds to that theme.
- **Nested Structure:**
  ```
  Period  →  "The Age of Dragons" (broad era)
    Event  →  "The Dragon War Begins" (specific occurrence)
      Scene  →  "The moment General Asha betrays the dragon pact" (roleplayed moment)
  ```
- **No GM:** Every player has equal creative authority. The palette prevents contradictions.
- **History focus, not character focus:** Characters exist within scenes but the game is about the world.
- **Play order:** The Lens player goes first, then play proceeds clockwise. Each turn, a player either
  creates a new element (Period, Event, or Scene) or expands an existing one.
- **Scene rules:** When a Scene is played, the creator states a question the scene must answer.
  Other players pick characters and roleplay to answer that question.
- **Banned & Allowed lists:** The Palette phase is crucial — it sets creative boundaries early.

### Key Features Worth Stealing

1. **Fractal Timeline (Period → Event → Scene):** The zoom-in/zoom-out mechanic lets players
   operate at any historical scale. Essential for DMlog.ai's timeline system.
2. **The Palette (Shared Constraints):** A pre-play phase where players agree on what exists and what
   doesn't. Prevents scope creep and contradictions. Should be a first-class DMlog.ai feature.
3. **Lenses (Rotating Creative Focus):** Each round has a different thematic focus. This prevents
   any one player from dominating the narrative and ensures diverse content.
4. **Scene Questions:** Every scene exists to answer a specific question. This gives narrative purpose
   to worldbuilding moments.
5. **No Single Authority:** Collaborative canon. No one player "owns" the world. Changes require group
   consensus (or are just added — Microscope actually allows contradictions via the "Ban" mechanic).
6. **Non-linear Creation:** Players can add to any point in the timeline, not just chronologically.
   This encourages creative connections across time.
7. **Playable History:** History isn't just documented — it's *experienced* through scenes.
8. **Legacies:** After the game, players have a complete, collaborative world history ready for a campaign.

### Integration Ideas for DMlog.ai

| Microscope Concept | DMlog.ai Integration |
|---|---|
| Fractal Timeline | Core Timeline feature — eras contain events contain scenes. UI: collapsible tree view. |
| The Palette | "World Constraints" panel on campaign creation. AI suggests constraints based on genre. |
| Lenses | "Worldbuilding Focus" mode — each session prep round, DM picks a theme to expand. |
| Scene Questions | Auto-generate plot hooks from worldbuilding scenes. |
| Non-linear Editing | Drag-and-drop timeline entries anywhere. AI flags contradictions. |
| Collaborative Canon | Multi-user editing with change tracking and approval workflow. |

---

## 1.2 Dawn of Worlds

### Core Mechanics

Dawn of Worlds (free game by David "DeVito" Somerville) is a **cooperative god-game** where players
act as creator deities, shaping a world from its geological formation through the rise of civilizations.
It is played on a physical (or digital) map with turns structured around creation points.

**Key mechanical concepts:**

- **Creation Points (CP):** Each turn, players receive CP to spend on actions. Actions cost varying CP:
  ```
  Action Type              | CP Cost
  -------------------------|--------
  Create/modify terrain     | 1 CP per hex
  Create a race             | 2 CP
  Create an order/race focus| 3 CP
  Create a city             | 1-2 CP
  Create an avatar          | 3 CP
  Raise an army             | 2 CP
  Command/advantage         | 1-3 CP
  Create a sub-race         | 1 CP
  Build a world improvement | 2-4 CP
  ```
- **Eras/Turns:** The game progresses through Ages:
  - **Age of Creation:** Geography, races, natural features
  - **Age of Building:** Cities, nations, cultures
  - **Age of Conflict:** Wars, alliances, world events
  - **Age of Legends:** Heroes, artifacts, epic events
- **Map-Based:** The entire game centers on a hex grid map. Terrain types include plains, forests,
  mountains, deserts, oceans, swamps, etc.
- **Avatars:** Players can create avatars — powerful beings tied to their races or domains.
- **Races & Orders:** Races have alignments and tendencies. Orders (religious/magical organizations)
  give races focus and power.
- **Sequential Turns:** Players take turns, spending CP each round. This creates a natural pace
   and prevents any one player from dominating.
- **Conflict Resolution:** When races clash, simple mechanics determine outcomes. The emphasis is
   on the story, not simulation.

### Key Features Worth Stealing

1. **Point-Based Creation Economy:** Resource scarcity forces creative prioritization. Players must
   choose what to create, leading to interesting trade-offs.
2. **Era Structure:** Different phases of creation have different available actions. This mirrors
   how worlds naturally develop — geography first, then civilization, then conflict.
3. **Hex Map as Primary Interface:** The map IS the game. Everything exists on or is defined by
   its relationship to the map.
4. **Avatar System:** God-level avatars provide a proxy for each player in the world.
5. **Race/Order System:** Races aren't just species — they have organizations, alignments, and goals.
6. **World Improvements:** Constructing wonders, roads, magical sites adds depth to geography.
7. **Army & Conflict Phase:** Built-in mechanics for war and conflict between civilizations.
8. **Free & Open Rules:** The game is freely available, making it easy to reference and adapt.

### Integration Ideas for DMlog.ai

| Dawn of Worlds Concept | DMlog.ai Integration |
|---|---|
| Creation Points | "Worldbuilding Budget" — limit what can be created per session to prevent scope creep. |
| Era Structure | Campaign phases with unlockable actions. Phase 1: Geography. Phase 2: Civilization. Etc. |
| Hex Map | Interactive map canvas in World Builder Mode. Terrain painting, city placement, territory borders. |
| Avatars | "Creator Profiles" — each player has a god/creator identity for worldbuilding sessions. |
| Races & Orders | Auto-generate racial traits, cultures, organizations from terrain and era. |
| World Improvements | "Landmarks & Wonders" system — named locations with history and significance. |

---

## 1.3 Kingdom

### Core Mechanics

Kingdom (by Ben Robbins, Lame Mage Productions) is a **community-building game** where players
collaboratively create and explore a community — a kingdom, a space station, a criminal organization,
a wizard's school — through its critical moments.

**Key mechanical concepts:**

- **Three Roles:** Each scene has three roles:
  - **Power:** Controls what happens in the community. Makes decisions, takes action.
  - **Perspective:** Questions Power's decisions, offers alternatives, sees from the outside.
  - **Touchstone:** Represents the ordinary people of the community. Asks "what does this mean for us?"
- **Crossroads:** Kingdom uses a unique scene structure where the community faces critical decisions.
  At each crossroads, the community must choose a direction.
- **Threats:** External and internal threats emerge. The community must respond. This drives
   narrative tension.
- **No GM:** Like Microscope, there's no game master. Roles rotate each scene.
- **Community Focus:** The protagonist is the community itself, not individual characters.
- **Decree System:** Power can make decrees that shape the community's direction. These have
   consequences explored in later scenes.
- **Destruction:** Communities can fall. The game explicitly supports the community's collapse
   as a valid (and dramatic) ending.

### Key Features Worth Stealing

1. **Three-Role Scene Structure:** Power/Perspective/Touchstone creates natural narrative tension.
   Every scene has built-in conflict and multiple viewpoints.
2. **Community as Protagonist:** The group/entity IS the main character. This shifts focus from
   individual heroes to the collective.
3. **Crossroads Mechanic:** Forced decision points create dramatic tension. Every crossroads
   changes the community's trajectory.
4. **Threat System:** External/internal threats emerge organically, driving story forward.
5. **Decree & Consequence:** Decisions made in one scene have ripple effects in later scenes.
6. **Role Rotation:** No single player dominates. Rotating roles ensures fresh perspectives.
7. **Flexible Setting:** Works for kingdoms, corporations, schools, cults, space stations —
   the framework is setting-agnostic.
8. **Collapse as Story:** The game supports and encourages the possibility of the community's
   destruction, making every decision feel weighty.

### Integration Ideas for DMlog.ai

| Kingdom Concept | DMlog.ai Integration |
|---|---|
| Three Roles | Faction scene prompts: DM gets Power, AI provides Perspective, player knowledge is Touchstone. |
| Crossroads | "Critical Decisions" system — when factions face choices, log them with consequences. |
| Community Protagonist | Faction tracking where the *kingdom* has its own character arc, not just NPCs. |
| Threats | Auto-generate threats based on faction relationships, resources, and world state. |
| Decrees | Log faction decisions; AI tracks consequences and references them in future sessions. |
| Collapse Mechanics | Faction stability tracker — factions can weaken, fracture, or fall based on decisions. |

---

# 2. Research: Books & Guides

## 2.1 The Ultimate RPG Game Master's Worldbuilding Guide

### Core Mechanics

James D'Amato's guide is a comprehensive, practical workbook for building TTRPG settings. It combines
creative exercises with structured templates, covering everything from geography to religion to economics.

### Key Concepts (by chapter area)

**Nation-Building:**
- Government types and how they affect daily life
- Borders, expansion, and territorial disputes
- Laws, justice systems, and enforcement
- Military organization and threat assessment
- Trade routes and economic drivers

**Pantheon Creation:**
- God portfolios and domains
- Number of deities and pantheon structure (monolatry, polytheism, animism)
- Religious practices, rituals, holidays
- Divine intervention rules and limits
- Atheism and religious schisms in fantasy settings

**NPC Depth:**
- The "three layers" system: role, personality, secret
- Motivation mapping: what does the NPC want and why
- NPC relationships as a web, not isolated nodes
- Growth arcs for recurring NPCs
- Voice and dialogue style guidelines

**Culture Design:**
- Cultural pillars: what does this society value most
- Customs, taboos, and social norms
- Language and communication styles
- Art, music, and entertainment
- Food, dress, and material culture
- Gender roles and social hierarchies

**Economic Systems:**
- Resource-based vs. trade-based economies
- Currency systems and exchange rates
- Guilds and trade organizations
- Black markets and underground economies
- Scarcity and its social effects

**Conflict Generation:**
- The "tension web": interconnecting sources of conflict
- Resource conflicts, ideological conflicts, personal conflicts
- Escalation ladders: from minor dispute to full war
- Proxy wars and cold conflicts
- Post-conflict consequences and rebuilding

### Key Features Worth Stealing

1. **Three-Layer NPCs:** Role (what they do), Personality (how they behave), Secret (what they hide).
   Simple template that creates instant depth.
2. **Cultural Pillars:** Define a culture by its top 3-5 values. Everything else derives from these.
3. **Tension Web:** A visual tool for mapping interconnected conflicts. Shows how one conflict
   connects to others, creating cascading drama.
4. **Resource Scarcity as Story Driver:** Economic constraints create natural conflict.
5. **Escalation Ladders:** Conflict intensity has discrete levels, making escalation feel earned.
6. **Religious Practice Templates:** Not just "what gods exist" but "what do people actually DO."
7. **Motivation Mapping:** NPCs should always have a clear want, making them act believably.

### Integration Ideas for DMlog.ai

| D'Amato Concept | DMlog.ai Integration |
|---|---|
| Three-Layer NPCs | NPC creation template: auto-generate role, personality, secret from faction/role context. |
| Cultural Pillars | Culture creation wizard: pick 3-5 values, AI generates customs, taboos, traditions. |
| Tension Web | Visual conflict map showing interconnections between factions, NPCs, resources. |
| Escalation Ladders | Conflict tracker with severity levels: Dispute → Tension → Crisis → War. |
| Motivation Mapping | Each NPC has a primary motivation that drives their behavior in AI-generated scenes. |

---

# 3. Research: Digital Tools

## 3.1 Kanka.io

### Core Mechanics

Kanka is a web-based **campaign management platform** designed for TTRPG worldbuilders and GMs. It's
an organization-first approach: everything is an entity (character, location, event, etc.) with
relationships and attributes.

### Key Features

1. **Entity Types (20+):** Characters, Locations, Families, Organizations, Items, Quests, Journals,
   Calendars, Timelines, Events, Abilities, Maps, Tags, Dice Rolls, Conversations, Notes, Attributes,
   Inventory, Relations, and more.
2. **Relations System:** Every entity can be linked to any other entity with custom relation types.
   E.g., Character → "rules" → Kingdom, Location → "contains" → Artifact.
3. **Family Trees:** Dedicated family/lineage tracking with visual tree visualization.
4. **Timelines:** Chronological event tracking with era-based organization.
5. **Calendars:** Custom calendar systems (e.g., 12 months, 7 days each) with event placement.
6. **Maps:** Grid-based map layering with pins linked to entities.
7. **Permissions:** Fine-grained per-entity visibility control for multi-user campaigns.
8. **Entity Mentions:** `@mention` any entity within text fields, creating bidirectional links.
9. **Marketplace:** Community-created templates and generators.
10. **Webhooks & API:** Programmatic access for integrations.

### Architecture Notes

- Open-source (PHP/Laravel)
- REST API available
- Campaign-scoped: all data belongs to a campaign
- Role-based access control per campaign member
- Premium tier adds features like dashboard widgets, theming, and enhanced permissions

### Key Features Worth Stealing

1. **Universal Entity Relations:** Everything links to everything. No siloed data.
2. **Per-Entity Permissions:** Each piece of lore can have different visibility levels.
3. **Family Trees as First-Class Feature:** Not just relationships — actual lineage visualization.
4. **Custom Calendars:** Fantasy calendars that match in-game time.
5. **Campaign Dashboard:** Single landing page showing campaign overview with widgets.
6. **Entity Mentions in Text:** `@character_name` creates automatic cross-references.
7. **Modular Entity Types:** Disable categories you don't need. Keep it simple or complex.
8. **Community Marketplace:** User-generated templates accelerate setup.

### Integration Ideas for DMlog.ai

| Kanka Feature | DMlog.ai Integration |
|---|---|
| Entity Relations | Core data model: everything is an Entity with bidirectional links. |
| Family Trees | NPC family system with visual tree rendering. |
| Custom Calendars | In-game time tracking for session logs and world events. |
| Permissions | Player/GM visibility controls on lore entries. |
| Entity Mentions | `@` references in session logs that link to lore database. |
| Dashboard | Campaign overview with active quests, recent NPCs, timeline. |
| Marketplace | Community world templates that players can import. |

---

## 3.2 Obsidian for TTRPG

### Core Mechanics

Obsidian is a **local-first markdown knowledge base** that TTRPG players have adopted for worldbuilding
through its plugin ecosystem. It's not a TTRPG tool per se — it's a flexible platform that becomes
one with the right setup.

### Key Plugins for TTRPG

1. **Dataview:** SQL-like queries over markdown files. Create dynamic lists:
   ```dataview
   TABLE race, class, status FROM "NPCs" WHERE status = "alive"
   ```
2. **Canvas:** Visual node-graph for mapping relationships between characters, locations, factions.
3. **Timeline:** Chronological visualization plugin for events.
4. **Templater:** Advanced template system for creating NPCs, locations, quests with consistent format.
5. **Map View:** Various plugins (Leaflet, Fantasy Map) for geographic visualization.
6. **Excalidraw:** Whiteboard-style drawing for maps and diagrams.
7. **Tags:** Hierarchical tagging for categorization (#npc/human/noble).
8. **Graph View:** Built-in visualization of all note connections — shows knowledge graph at a glance.

### Key Features Worth Stealing

1. **Local-First, Markdown-Based:** All data in plain text files. Portable, version-controllable, 
   searchable with any tool. This is the right architecture for DMlog.ai's data layer.
2. **Bidirectional Links:** `[[link]]` syntax creates connections that show both forward and backward
   references. Essential for lore databases.
3. **Dataview Queries:** Live-updating lists and tables from raw data. DMlog.ai needs this for
   "show me all NPCs in this city" or "list all quests related to Faction X."
4. **Graph View:** Visual representation of how all entities connect. Instantly shows isolated entries
   (orphans that need connections) and highly-connected hubs.
5. **Template System:** One-click creation of new entities (NPC, location, quest) using predefined
   templates with prompts for required fields.
6. **Canvas for Relationship Mapping:** Visual node graph for complex relationship webs.
7. **Tag Hierarchy:** Nested tags for granular categorization.
8. **No Vendor Lock-in:** Data in markdown means players can always access their data without the tool.

### Integration Ideas for DMlog.ai

| Obsidian Feature | DMlog.ai Integration |
|---|---|
| Bidirectional Links | Core linking system: every entity shows inbound and outbound connections. |
| Dataview | Lore search with filters, dynamic tables, and saved queries. |
| Graph View | Campaign knowledge graph visualization in dashboard. |
| Templates | One-click NPC/location/quest creation from templates. |
| Canvas | Interactive relationship web for factions, NPCs, locations. |
| Markdown Export | Every piece of lore exportable as markdown. Data portability. |

---

## 3.3 D&D Beyond Maps

### Core Mechanics

D&D Beyond Maps (formerly D&D Beyond's map tool) provides **encounter-ready tactical maps** with
visual enhancements for virtual or in-person play.

### Key Features

1. **Pre-Made Maps:** Library of encounter-ready locations (taverns, dungeons, forests, etc.).
2. **Ambient Lighting:** Dynamic lighting effects that set mood (torchlight, moonlight, magical glow).
3. **Fog of War:** Progressive reveal of map areas as players explore.
4. **Token System:** Place and move character/NPC tokens on the map.
5. **Custom Map Upload:** Import your own map images.
6. **Integrated with D&D Beyond:** Monster stat blocks, character sheets linked to map tokens.

### Key Features Worth Stealing

1. **Fog of War with Progressive Reveal:** Players discover the world as they explore. Essential
   for the World Builder map canvas.
2. **Ambient Lighting:** Visual mood setting that changes with time of day, weather, magical effects.
3. **Token System with Entity Links:** Map tokens are connected to character/NPC data. Click a token,
   see the stats.
4. **Scene-Ready Maps:** Pre-configured encounters that DMs can drop into sessions instantly.

### Integration Ideas for DMlog.ai

| D&D Beyond Maps Feature | DMlog.ai Integration |
|---|---|
| Fog of War | Map canvas in World Builder: reveal locations as players discover them. |
| Ambient Lighting | Session maps with time-of-day and weather mood effects. |
| Token ↔ Entity Links | Map pins linked to lore entries. Click a city, see its details. |

---

## 3.4 Friends & Fables

### Core Mechanics

Friends & Fables is an **AI-powered TTRPG companion platform** that generates worldbuilding content,
NPCs, quests, and narrative elements. It serves as a co-DM or worldbuilding assistant.

### Key Features

1. **AI NPC Generation:** Create NPCs with detailed personalities, backgrounds, and voice patterns.
2. **Quest Generation:** AI generates quest hooks, objectives, and complications.
3. **Worldbuilding Assistance:** Describe a concept; AI fills in consistent details.
4. **Session Management:** Track ongoing campaigns and generate continuity-aware content.
5. **Voice Acting:** AI-generated NPC voices for enhanced roleplay.

### Key Features Worth Stealing

1. **Consistent NPC Voice:** AI maintains a character's speech patterns across interactions.
   This is critical for DMlog.ai's NPC system.
2. **Context-Aware Generation:** AI considers existing world state when generating new content.
   No contradictions with established lore.
3. **Quest Chain Logic:** AI generates quests that naturally follow from completed quests and
   world events.
4. **Rapid Prototyping:** Generate a full village, its NPCs, its problems, and its quests in minutes.

### Integration Ideas for DMlog.ai

| Friends & Fables Feature | DMlog.ai Integration |
|---|---|
| AI NPC Voice | NPC dialogue generator with consistent personality and speech patterns. |
| Context-Aware Generation | All AI generation considers existing campaign lore and recent events. |
| Quest Chains | Auto-generate follow-up quests based on completed ones and world state. |

---

## 3.5 World Anvil

### Core Mechanics

World Anvil is a comprehensive **worldbuilding platform** designed specifically for fiction writers
and TTRPG GMs. It provides structured templates for every aspect of worldbuilding.

### Key Features

1. **World Structure:** Hierarchical organization: World → Continent → Region → Location → Room.
2. **Timeline:** Visual timeline with multiple tracks for parallel events.
3. **Character Profiles:** Detailed character sheets with personality, history, relationships.
4. **Articles/Encyclopedia:** Structured lore entries with rich text editing and categories.
5. **Maps:** Integrated map tool with location pins.
6. **Pin System:** Flag articles as "needs attention" or "in progress."
7. **Campaign Planner:** Organize sessions, plot arcs, and narrative threads.
8. **Secrets:** Hide lore from players until discovered in-game (spoiler system).
9. **Image Galleries:** Attach images to any entity.
10. **Pronunciation Guide:** Audio pronunciation for names and terms.
11. **Global Navigation:** Sidebar navigation that reflects world hierarchy.
12. **User Groups:** Multiple collaborators with different roles.

### Key Features Worth Stealing

1. **Hierarchy-First Organization:** World → Continent → Region → Location mirrors how players
   think about geography. Natural navigation.
2. **Secret/Spoiler System:** Mark lore as "hidden until discovered." Player view only shows
   what they've learned. This is ESSENTIAL for DMlog.ai.
3. **Campaign Planner Integration:** Worldbuilding connects directly to session planning.
4. **Multiple Timelines/Tracks:** Show different parallel event streams (political, military, magical).
5. **Structured Templates:** Every entity type has a purpose-built template, not a blank page.
6. **Pin System:** Workflow management for worldbuilding tasks.

### Integration Ideas for DMlog.ai

| World Anvil Feature | DMlog.ai Integration |
|---|---|
| Hierarchy Navigation | Location tree: World → Region → City → Building → Room. |
| Secrets/Spoilers | Lore visibility system: GM sees all, players see only what's been discovered. |
| Campaign Planner | World Builder feeds directly into session planning. |
| Multiple Timeline Tracks | Parallel event tracks for different story threads. |
| Structured Templates | Entity-specific creation forms with required/optional fields. |

---

## 3.6 Foundry VTT Modules

### Core Mechanics

Foundry VTT is a self-hosted virtual tabletop with a rich module ecosystem. Worldbuilding modules
extend its capabilities beyond combat into campaign management and lore organization.

### Notable Worldbuilding Modules

1. **Pregen Importer:** Import pre-generated adventures and their world data.
2. **Journal Enhancements:** Improved journal/notes system with linking and organization.
3. **Scene Packer:** Export and import complete scene setups including maps, tokens, lighting, and journal entries.
4. **Cautious Gamemaster's Pack:** Encounter management, secret rolls, ambient noise.
5. **Lore Sheet:** Extended character/journal system with structured fields for lore.
6. **Kingdom Management Modules:** Several community modules add kingdom/faction turn tracking.
7. **Calendar/Time Tracking:** Modules like "Simple Calendar" that track in-game time with custom calendars.
8. **Relationship Diagram:** Visual relationship web between characters and factions.
9. **Pin Cushion:** Map pins with journal-linked popups.
10. **Random Table generators:** Community-built random tables for encounters, NPCs, locations.

### Key Features Worth Stealing

1. **Scene Packing:** Bundle everything about a location (map, tokens, journal entries, lighting)
   into one portable package. DMlog.ai's "location profiles" should do this.
2. **Simple Calendar:** In-game time tracking with custom calendar systems, moon phases, seasons.
3. **Relationship Diagram:** Visual node graph showing how characters and factions connect.
4. **Module Ecosystem:** Community-built extensions. DMlog.ai should have a plugin/extension system.
5. **Journal Linking:** Seamless bidirectional links between journal entries, characters, and items.

### Integration Ideas for DMlog.ai

| Foundry Feature | DMlog.ai Integration |
|---|---|
| Scene Packing | Location profiles: map + NPCs + encounters + lore, exportable as one unit. |
| Simple Calendar | In-game time system with custom calendars and astronomical events. |
| Relationship Diagram | Faction/NPC relationship visualization. |
| Plugin System | Extensible architecture for community modules. |

---

## 3.7 D&D Beyond Platform

### Core Mechanics

D&D Beyond (DDB) is Wizards of the Coast's official digital toolset for Dungeons & Dragons. It has
evolved from a character sheet tool to a comprehensive campaign management platform.

### Latest Features (2024-2026)

1. **Integrated Character Sheets:** Digital character sheets with rule enforcement.
2. **Encounter Builder:** Drag-and-drop encounter creation with CR balancing.
3. **Campaign Management:** DM tools for managing multiple campaigns with player rosters.
4. **Compendium:** Searchable rules, monsters, spells, items database.
5. **Maps Integration:** Formerly purchasable maps now integrated into the platform.
6. **Dice Rolling:** Built-in dice with modifiers and advantage/disadvantage.
7. **Combat Tracker:** Initiative, HP, conditions tracking.
8. **Homebrew Support:** Custom monsters, spells, items, subclasses.
9. **Campaign Notes:** Basic journaling for DM notes (limited compared to Kanka/World Anvil).
10. **Beyond20 Extension:** Browser extension connecting DDB to any VTT.

### Key Features Worth Stealing

1. **Encounter Builder with CR Balancing:** Auto-calculate encounter difficulty based on party level
   and composition. DMlog.ai should suggest encounters based on party state.
2. **Integrated Compendium:** Searchable database of rules and content. DMlog.ai needs a lore
   compendium that works the same way.
3. **Homebrew Creation Tools:** Players should be able to create custom content (items, spells, etc.)
   with structured templates.
4. **Campaign Dashboard:** Single view showing all campaign elements.

### Integration Ideas for DMlog.ai

| DDB Feature | DMlog.ai Integration |
|---|---|
| Encounter Builder | AI encounter suggestions based on party level, location, and narrative context. |
| Compendium | Searchable lore database with filters and categories. |
| Homebrew Tools | Custom content creation with validation and consistency checking. |
| Campaign Dashboard | Overview page showing active campaigns, recent sessions, pending quests. |

---

# 4. Feature Design: World Builder Mode

## 4.1 Overview

**World Builder Mode** is DMlog.ai's collaborative worldbuilding system, inspired by Microscope's
fractal timeline and Dawn of Worlds' map-based creation economy.

### Design Principles

1. **Fractal Depth:** Work at any scale — from continental geography to individual room descriptions.
2. **Creation Economy:** Point-based system prevents scope creep and encourages meaningful choices.
3. **AI Consistency Engine:** Every player decision is checked against established lore for contradictions.
4. **Export Everything:** Any world can be exported as a complete campaign setting document.
5. **Collaborative First:** Multiple players can build simultaneously with real-time sync.

---

## 4.2 Fractal Timeline System

### Data Model

```
TimelineEntry {
  id: string
  campaignId: string
  parentId: string | null          // null = top-level era
  type: "era" | "event" | "scene"
  title: string
  description: string              // rich text with entity mentions
  question: string | null          // for scenes: "What question does this scene answer?"
  answer: string | null            // for scenes: the resolved answer
  lens: string                     // which player/theme focused this entry
  startYear: number | null         // in-world year (null = "before recorded time")
  endYear: number | null           // for eras: span; for events/scenes: same as start
  sortIndex: number                // ordering within parent
  tags: string[]
  createdAt: timestamp
  createdBy: string                // userId
  entities: string[]               // referenced entity IDs
  visibility: "gm" | "players" | "public"  // World Anvil-inspired secrets
  pinned: boolean
}
```

### UI Wireframe: Timeline View

```
┌─────────────────────────────────────────────────────────────┐
│  🌍 World Builder — The Shattered Realms                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Timeline]  [Map]  [Entities]  [Calendar]  [Export]         │
│                                                              │
│  ── The Age of Genesis (Era 1) ──────────────── + Add Child  │
│    │                                                         │
│    ├── 🌋 The World is Forged (Event)              Year 0     │
│    │   └── 💬 Scene: "Why did the gods fight?"               │
│    │       Answer: Each god wanted dominion over a different  │
│    │               element, and compromise was impossible.    │
│    │                                                         │
│    ├── 🐉 Dragons Claim the Peaks (Event)         Year 500   │
│    │   ├── 💬 Scene: "The First Dragon Pact"                 │
│    │   └── 👤 Asha, Scale-Mother (first dragon leader)        │
│    │                                                         │
│    └── 🌿 The Great Forest Grows (Event)         Year 800    │
│        └── 📍 Heartwood (location mentioned)                 │
│                                                              │
│  ── The Age of Empires (Era 2) ───────────────── + Add Child │
│    │                                                         │
│    ├── 👑 The Elven Dominion Rises (Event)       Year 1500   │
│    │   └── 💬 Scene: "How do the elves subjugate the humans?" │
│    │       Answer: Through magical domination of food supply.  │
│    │                                                         │
│    └── ⚔️ The Human Rebellion (Event)            Year 2100   │
│        └── 🔮 Prophecy: "When the last tree falls..."        │
│                                                              │
│  ── The Current Age (Era 3) ──────────────────── + Add Child  │
│    │                                                         │
│    └── 🏰 The Kingdoms Fragment (Event)          Year 3000   │
│        ├── 💬 Scene: "The assassination of King Aldric"      │
│        └── 👥 The Remnant Council (faction mentioned)         │
│                                                              │
│  [+ Add Era]                          [🔍 Filter] [📊 Stats] │
├─────────────────────────────────────────────────────────────┤
│  Palette: ✅ Magic exists  ✅ Dragons are real  ❌ No firearms │
│  Creation Budget: ████████░░ 8/15 points remaining           │
│  Active Lens: Player 2 — Focus: "The Elves"                  │
└─────────────────────────────────────────────────────────────┘
```

### Timeline Interactions

- **Zoom In:** Click an era to expand and see its events. Click an event to see its scenes.
- **Zoom Out:** Collapse children to see the high-level timeline.
- **Add Entry:** Click `+` to add a new era/event/scene at any level.
- **Drag & Drop:** Reorder entries within the same parent.
- **Non-linear Creation:** Add entries at any point in time, not just chronologically.
- **Palette Panel:** Always visible sidebar showing established constraints.
- **Lens Indicator:** Shows which player/theme is currently guiding creation.

---

## 4.3 Map Canvas

### Data Model

```
MapHex {
  id: string
  campaignId: string
  q: number                      // hex grid coordinates (axial)
  r: number
  terrain: "plains" | "forest" | "mountain" | "desert" | "ocean" |
          "swamp" | "tundra" | "volcanic" | "ruins" | "magical"
  elevation: number               // 0-100
  temperature: "tropical" | "temperate" | "arctic" | "volcanic"
  features: string[]              // named features in this hex
  locationId: string | null       // if a location exists here
  factionId: string | null        // if territory belongs to a faction
  roads: string[]                 // connected hex IDs with roads
  discovered: boolean             // fog of war
  discoveredBy: string[]          // which players have seen this hex
  notes: string
}

Location {
  id: string
  campaignId: string
  name: string
  type: "city" | "town" | "village" | "fortress" | "dungeon" |
        "temple" | "ruin" | "landmark" | "port" | "capital"
  parentId: string | null         // hierarchy: region → city → district
  hexId: string                   // position on map
  population: number
  description: string             // rich text
  ruler: string | null            // NPC ID
  faction: string | null          // Faction ID
  resources: string[]
  defenses: string[]
  secrets: string[]               // hidden information (GM only)
  landmarks: string[]
  connections: string[]           // IDs of connected locations
  image: string | null
  tags: string[]
  history: string[]               // TimelineEntry IDs
}
```

### UI Wireframe: Map Canvas

```
┌─────────────────────────────────────────────────────────────┐
│  🗺️ World Map — The Shattered Realms                          │
├─────────────────────────────────────────────────────────────┤
│  Tools: [🖌️ Paint] [📍 City] [🏗️ Road] [🏴 Territory] [🔍]  │
│  Terrain: [🟢 Plains] [🌲 Forest] [⛰️ Mountain] [🏜️ Desert]  │
│          [🌊 Ocean] [🌋 Volcanic] [🏚️ Ruins] [✨ Magical]    │
│                                                              │
│  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐                  │
│  │~~~│~~~│~~~│🌲🌲│🌲🌲│🌲🌲│🌲🌲│🟢🟢│🟢🟢│🟢🟢│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │~~~│~~~│🌲🌲│🌲🌲│🌲🌲│🌲🌲│🟢🟢│🏰🏰│🟢🟢│🟢🟢│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │🌲🌲│🌲🌲│🌲🌲│🌲🌲│🟢🟢│🟢🟢│🟢🟢│🟢🟢│🏔️🏔️│🏔️🏔️│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │🌲🌲│🌲🌲│🌲🌲│🟢🟢│🟢🟢│🏘️🏘️│🟢🟢│🟢🟢│🏔️🏔️│🏔️🏔️│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │🌲🌲│🌲🌲│🟢🟢│🟢🟢│🟢🟢│🟢🟢│🟢🟢│🏜️🏜️│🏜️🏜️│🏜️🏜️│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │🟢🟢│🟢🟢│🟢🟢│🏘️🏘️│🟢🟢│🟢🟢│🏜️🏜️│🏜️🏜️│🏜️🏜️│🌋🌋│                  │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤                  │
│  │🟢🟢│🟢🟢│🟢🟢│🟢🟢│🏜️🏜️│🏜️🏜️│🏜️🏜️│🏜️🏜️│🌋🌋│🌋🌋│                  │
│  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘                  │
│                                                              │
│  Selected: 🏰 Eldrath (City) — Pop: 45,000                  │
│  Ruler: Queen Ashavira  |  Faction: Elven Dominion           │
│  Resources: mithril, arcane crystals, timber                  │
│  [+ Edit Location]  [📁 Location Profile]  [🗺️ Set Fog]      │
│                                                              │
│  Legend: ~~~ Ocean  🌲 Forest  🟢 Plains  ⛰️ Mountain       │
│          🏜️ Desert  🌋 Volcanic  🏰 City  🏘️ Village        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4.4 Creation Economy (Point System)

### Point Budget Per Worldbuilding Phase

```
Phase            | Actions Available                | Points/Turn
─────────────────|──────────────────────────────────|───────────
Age of Creation  | Create terrain (1 CP/hex)        | 5 CP
                 | Create landmark (2 CP)            |
                 | Set climate region (1 CP)         |
                 |──────────────────────────────────|───────────
Age of Life      | Create race (2 CP)                | 6 CP
                 | Create sub-race (1 CP)            |
                 | Place race on map (1 CP)          |
                 | Create magical species (3 CP)     |
                 |──────────────────────────────────|───────────
Age of Building  | Create city/town (1-3 CP)        | 7 CP
                 | Build road (1 CP/segment)         |
                 | Create nation (3 CP)              |
                 | Create organization (2 CP)        |
                 | Create world wonder (4 CP)        |
                 |──────────────────────────────────|───────────
Age of Conflict  | Raise army (2 CP)                 | 8 CP
                 | Declare war (1 CP)                |
                 | Create treaty (2 CP)              |
                 | Assassinate leader (3 CP)         |
                 | Create artifact (3 CP)            |
                 |──────────────────────────────────|───────────
Age of Legends   | Create hero/villain (2 CP)        | 6 CP
                 | Create prophecy (2 CP)            |
                 | Create legend (1 CP)              |
                 | Create dungeon (3 CP)             |
                 | Trigger cataclysm (4 CP)          |
```

### AI Consistency Engine

When a player makes a creation:

1. **Palette Check:** Does this violate any established constraints?
2. **Geographic Logic:** Is this placement geographically sensible? (No desert cities in tundra without explanation.)
3. **Population Math:** Does this city's population make sense given its resources and age?
4. **Historical Consistency:** Does this event contradict previously established timeline entries?
5. **Racial Plausibility:** Are this race's traits consistent with their origin and environment?

If issues are found, the AI suggests adjustments rather than blocking:
```
⚠️ AI Note: You're placing a desert city of 100,000 in a resource-poor region.
   Consider: reducing population to 20,000, or adding a trade route,
   or placing it near an oasis. [Auto-fix options below]
   [Reduce to 20k] [Add oasis] [Add trade route] [Override]
```

---

## 4.5 Export System

### Export Formats

```
Export Options:
┌──────────────────────────────────┐
│  📄 Timeline Document (Markdown) │  ← Full timeline as structured markdown
│  📄 World Lore (PDF)             │  ← Formatted campaign setting document
│  🗺️ World Map (PNG/SVG)          │  ← Rendered map with labels
│  📊 Faction Chart (SVG)           │  ← Alliance/conflict web visualization
│  📋 Entity Database (JSON)        │  ← Machine-readable export for VTT import
│  🎮 VTT Import Package            │  ← Foundry VTT compatible scene pack
│  📖 Player Handout (PDF)          │  ← Player-visible lore only
│  🔒 GM Secrets (PDF)              │  ← GM-only hidden information
│  📦 Complete World (ZIP)          │  ← All of the above in one package
└──────────────────────────────────┘
```

---

# 5. Feature Design: Faction & Kingdom System

## 5.1 Overview

Inspired by Kingdom's community-as-protagonist and Kanka's organization tracking, this system
makes factions into living, breathing entities with their own goals, resources, and agency.

---

## 5.2 Data Model

```
Faction {
  id: string
  campaignId: string
  name: string
  type: "kingdom" | "empire" | "guild" | "cult" | "tribe" |
        "merchant house" | "military order" | "crime syndicate" |
        "research institution" | "religious order" | "custom"
  
  // Leadership
  leaderId: string | null          // NPC ID of current leader
  leadershipStyle: "monarchy" | "democracy" | "oligarchy" |
                   "theocracy" | "meritocracy" | "anarchy" | "custom"
  successionRule: string           // how leadership transfers
  
  // Resources (0-100 scale each)
  military: number                 // armed forces strength
  economy: number                  // wealth and trade
  influence: number                // political/social sway
  territory: number                // land/control area (derived from map hexes)
  magic: number                    // magical power (if applicable)
  morale: number                   // internal unity and motivation
  
  // Structure
  governmentStructure: string      // description of governance
  capitalId: string | null         // Location ID
  territories: string[]            // MapHex IDs controlled
  vassals: string[]                // Faction IDs of vassal factions
  allies: FactionRelation[]        // alliances
  enemies: FactionRelation[]       // conflicts
  members: string[]                // NPC IDs of notable members
  
  // Narrative
  goal: string                     // What does this faction want?
  ideology: string                 // What do they believe?
  cultureId: string | null         // linked culture
  history: string[]                // TimelineEntry IDs
  secrets: string[]                // GM-only hidden information
  
  // Stability (Kingdom-inspired)
  stability: number                // -100 to 100, starts at 0
  threats: FactionThreat[]         // active threats to the faction
  decrees: FactionDecree[]         // past decisions and their effects
  
  // AI Behavior
  aiPersonality: string            // describes how faction acts between sessions
  aiStrategy: "expansionist" | "defensive" | "diplomatic" |
              "isolationist" | "aggressive" | "subversive"
}

FactionRelation {
  factionId: string
  type: "ally" | "vassal" | "trade partner" | "neutral" | "rival" | "enemy" | "at war"
  strength: number                 // -100 (hatred) to 100 (devoted)
  history: string                  // how this relationship formed
  secretAgreement: string | null   // GM-only hidden deals
}

FactionThreat {
  description: string
  severity: "minor" | "moderate" | "severe" | "existential"
  sourceFactionId: string | null   // if from another faction
  internal: boolean                // true = internal threat
  status: "active" | "contained" | "resolved" | "escalating"
}

FactionDecree {
  description: string
  issuedBy: string                 // NPC ID
  issuedAt: timestamp
  effects: string[]                // consequences of this decree
  factionStabilityChange: number   // how it affected stability
  publicOpinion: string            // how the populace reacted
}
```

---

## 5.3 Alliance/Conflict Web

### UI Wireframe: Faction Relationships

```
┌─────────────────────────────────────────────────────────────┐
│  🏰 Faction Web — The Shattered Realms                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────┐                              │
│              🟢────│ Elven    │────🔴                        │
│           allies    │ Dominion │   enemies                    │
│                    └────┬─────┘                              │
│                    vassal│                                   │
│                    ┌────┴─────┐                              │
│                    │ Wood     │────🟡────┌──────────┐        │
│                    │ Elf      │ neutral  │ Orc      │        │
│                    │ Tribe    │          │ Clans    │        │
│                    └──────────┘          └────┬─────┘        │
│                                              │              │
│                         🔴 enemies           │ trade        │
│                    ┌─────┴──────────┐    partner│            │
│                    │ The Remnant    │←──🟢──────┘            │
│                    │ Council        │                        │
│                    │ (Human)        │                        │
│                    └───────┬────────┘                        │
│                            │                                │
│                      vassal│                                │
│                    ┌───────┴────────┐                        │
│                    │ Free Cities    │────🟡───┌──────────┐   │
│                    │ Alliance       │rival  │ Merchant │   │
│                    └────────────────┘       │ Guild    │   │
│                                            └──────────┘   │
│                                                              │
│  Legend: 🟢 Ally  🔴 Enemy  🟡 Rival  🔵 Trade  ⬜ Vassal  │
│                                                              │
│  [Click faction for details]  [+ Add Faction]  [📊 Power   │
│   Chart]  [🎲 Simulate Turn]  [📜 History]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5.4 Political Intrigue Engine

### Faction Turn System

Between player sessions, each faction takes a "turn" where AI decides their actions:

```
Faction Turn Resolution:
┌─────────────────────────────────────────────────────────────┐
│  🎲 Faction Turn — Between Session 12 and Session 13         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Actions Taken This Turn:                                 │
│                                                              │
│  1. Elven Dominion                                          │
│     Action: Diplomatic — Sent emissary to the Remnant Council│
│     Motive: Seeking alliance against growing Orc threat      │
│     Roll: 🎲 Success (+15 influence)                         │
│     Effect: Remnant Council considers elf alliance           │
│                                                              │
│  2. Orc Clans                                               │
│     Action: Military — Raid on Free Cities border villages  │
│     Motive: Testing defenses, claiming resources             │
│     Roll: 🎲 Partial Success (+5 territory, -10 morale)     │
│     Effect: Village of Millford attacked, 30 casualties      │
│                                                              │
│  3. Merchant Guild                                          │
│     Action: Economic — Raised prices on weapons and armor    │
│     Motive: Profiting from war fears                         │
│     Roll: 🎲 Success (+20 economy)                           │
│     Effect: Both sides pay more for supplies                 │
│                                                              │
│  4. The Remnant Council                                      │
│     Action: Internal — Council vote on elf alliance          │
│     Motive: National survival vs. historical enmity         │
│     Roll: 🎲 Failed — Vote tied, delayed to next session     │
│     Effect: Political gridlock, stability -5                 │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│  💡 GM Briefing: The Orc raids create urgency for the elf   │
│     alliance. Players may be hired to break the Council      │
│     deadlock or investigate Merchant Guild war profiteering. │
│                                                              │
│  [✅ Accept All] [✏️ Edit Actions] [🔄 Re-roll] [📋 Brief]   │
└─────────────────────────────────────────────────────────────┘
```

### Political Plot Generator

The AI can generate political intrigue plots based on faction relationships:

```
Generated Plot: "The Merchant's Gambit"
┌─────────────────────────────────────────────────────────────┐
│  Type: Economic Intrigue                                    │
│  Complexity: ⭐⭐⭐ (moderate)                              │
│  Factions Involved: Merchant Guild, Remnant Council,        │
│                    Elven Dominion                            │
│                                                              │
│  Hook: The Merchant Guild has been secretly funding both     │
│  sides of the elf-human conflict, prolonging it for profit.  │
│                                                              │
│  Layers:                                                     │
│  1. Discover: Players find coded messages in a Guild agent's │
│     quarters.                                               │
│  2. Investigate: Follow the money trail to Guild leadership. │
│  3. Confront: Choice — expose the Guild, blackmail them, or │
│     take a deal.                                            │
│  4. Consequence: Exposing them crashes the economy. Blackmail │
│     gives players influence. The deal funds their quest.     │
│                                                              │
│  If Ignored: War escalates, prices soar, refugees flood     │
│  cities. The Guild grows wealthier.                         │
│                                                              │
│  Faction Impacts:                                           │
│  • Merchant Guild: economy +20 if secret kept, -40 if exposed│
│  • Remnant Council: stability -15 (scandal), +10 if resolved │
│  • Elven Dominion: influence +10 (alliance more likely)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5.5 Power Structure Visualization

### UI Wireframe: Faction Detail

```
┌─────────────────────────────────────────────────────────────┐
│  🏰 The Remnant Council — Human Kingdom                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Type: Kingdom  |  Leadership: Democracy (Council)           │
│  Capital: Ashford  |  Population: 2.3M                       │
│                                                              │
│  Power Bars:                                                 │
│  Military:   ████████░░ 80/100                               │
│  Economy:    ██████░░░░ 60/100                               │
│  Influence:  ███████░░░ 70/100                               │
│  Territory:  ██████░░░░ 60/100 (127 hexes)                  │
│  Magic:      ███░░░░░░░ 30/100                               │
│  Morale:     █████░░░░░ 50/100 ⚠️                            │
│                                                              │
│  Stability: ████░░░░░░ +15 (Stable)                         │
│  Trend: ↗️ Improving                                         │
│                                                              │
│  ──── Power Structure ────                                  │
│                                                              │
│  👑 High Council (7 members)                                 │
│  │  ├── 🧙 Councilor Mirael (Archmage) — Pro-elf faction   │
│  │  ├── ⚔️ General Harwick (Military) — Anti-elf hawk      │
│  │  ├── 💰 Trade Master Eldon — Neutral, Guild-aligned     │
│  │  ├── 📿 High Priestess Sera — Temple of the Dawn        │
│  │  ├── 🎭 Lord Varen (Nobility) — Secretly pro-Orc       │
│  │  ├── 👤 Common Speaker Bess — Peasant representative    │
│  │  └── 🧑‍⚖️ Magistrate Corwin — Law and order           │
│  │                                                           │
│  └─── Departments                                            │
│      ├── 🗡️ Military Command (Gen. Harwick)                 │
│      ├── 🏦 Treasury (Trade Master Eldon)                   │
│      ├── 🔮 Arcane College (Councilor Mirael)               │
│      ├── ⛪ Temple Network (High Priestess Sera)            │
│      └── 🕵️ Crown Intelligence (Magistrate Corwin)         │
│                                                              │
│  ──── Active Threats ────                                   │
│  ⚠️ Orc Clans raiding (moderate)                             │
│  ⚠️ Internal council division (moderate)                     │
│  ℹ️ Merchant Guild price gouging (minor)                     │
│                                                              │
│  ──── Current Goal ────                                     │
│  "Unite the human kingdoms against the growing darkness in   │
│  the Ash Mountains. Seek allies among the elves."            │
│                                                              │
│  [📝 Edit]  [📜 History]  [🎲 Take Turn]  [📊 Relationships]│
└─────────────────────────────────────────────────────────────┘
```

---

# 6. Feature Design: Deep NPC System

## 6.1 Overview

A comprehensive NPC system that goes beyond stat blocks. NPCs have memories, secrets,
relationships, goals, and lives of their own. Inspired by Kanka's family trees, World Anvil's
character depth, and Friends & Fables' AI voice consistency.

---

## 6.2 Data Model

```
NPC {
  id: string
  campaignId: string
  
  // Identity
  name: string
  aliases: string[]                // nicknames, titles, disguises
  race: string
  gender: string
  age: number
  appearance: string               // physical description
  voice: string                    // speech patterns, accent, verbal quirks
  
  // D'Amato Three Layers
  role: string                     // what they do in the world
  personality: string              // how they behave
  secret: string                   // what they're hiding
  
  // Motivation (D'Amato-inspired)
  primaryMotivation: string        // what they want most
  secondaryMotivation: string      // what they want second-most
  fear: string                     // what they're afraid of
  moralCompass: string             // alignment descriptor
  
  // Stats (optional, for combat NPCs)
  stats: object | null             // system-agnostic stat block
  
  // Relationships
  relationships: NPCRelation[]
  familyId: string | null          // family tree link
  
  // Memory (Friends & Fables inspired)
  memories: NPCMemory[]
  
  // Knowledge (what they know)
  knowledge: NPCKnowledge[]
  
  // State
  status: "alive" | "dead" | "missing" | "imprisoned" | "fled" | "unknown"
  locationId: string | null        // where they currently are
  factionId: string | null
  lastSeen: string                 // last session/location where PCs encountered them
  
  // AI Behavior
  aiPersonality: string            // how this NPC acts when generating dialogue
  aiDialogueStyle: string          // formal, casual, terse, flowery, etc.
  aiGoals: string[]                // what this NPC works toward between sessions
  
  // Connections
  questIds: string[]               // quests this NPC is involved in
  timelineEntryIds: string[]       // events this NPC participated in
  
  // Death System
  deathCause: string | null
  deathSession: number | null
  deathConsequences: string[]      // cascading effects of this NPC's death
  knownByPlayers: boolean          // have the players met this NPC
  playerKnowledge: string[]        // what players know about this NPC
}

NPCRelation {
  targetNpcId: string
  type: "family" | "friend" | "rival" | "enemy" | "lover" | "ally" |
        "subordinate" | "superior" | "mentor" | "student" | "trade" |
        "secret" | "debt" | "custom"
  strength: number                 // -100 to 100
  history: string                  // how this relationship formed
  secret: string | null            // hidden aspects of this relationship
}

NPCMemory {
  sessionId: number
  event: string                    // what happened to this NPC
  emotion: string                  // how they felt about it
  impact: string                   // how it changed their behavior
  knownByPlayers: boolean          // do the PCs know this happened
}

NPCKnowledge {
  topic: string                    // what they know about
  detail: string                   // what specifically they know
  secret: boolean                  // is this knowledge hidden from others
  source: string                   // how they learned this
  shareableWith: string[]          // under what conditions they'd share
}
```

---

## 6.3 NPC Relationship Web

### UI Wireframe: Relationship Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  👤 Queen Ashavira — Relationship Web                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                     👤 General Theron                         │
│                    ─/rival (−40)/─                           │
│                   /                 \                         │
│  👤 Councilor Mirael ─friend (+70)─ │                         │
│     \              /lover (+90)     │                         │
│      \            /                /                         │
│  👤 Queen Ashavira ◄─────── mentor (+50) ───── 👤 Sage Alden │
│      /            \                                           │
│     /enemy (−80)  \subordinate (+20)                         │
│  👤 Lord Varen    👤 Captain Lyra                             │
│  (secret ally)       \                                       │
│                      \secret (−60)/─                         │
│                      👤 Shadow Broker                         │
│                                                              │
│  [Add Relation]  [🔍 Search NPC]  [📊 Network Graph]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6.4 NPC Memory & Knowledge System

### How Memory Works

Each NPC accumulates memories from sessions. These memories influence their behavior:

```
NPC Memory Log — Captain Lyra
┌─────────────────────────────────────────────────────────────┐
│  Session 3: "Players arrested for drunken brawling"          │
│  Emotion: Annoyed                                           │
│  Impact: Suspicious of the party, demands respect            │
│  Player-Known: ✅ Yes                                       │
│                                                              │
│  Session 7: "Players helped stop the dock fire"              │
│  Emotion: Grateful                                           │
│  Impact: More trusting, offers information freely            │
│  Player-Known: ✅ Yes                                       │
│                                                              │
│  Session 11: "Players left the city without saying goodbye"  │
│  Emotion: Hurt, then angry                                    │
│  Impact: Cold reception on return, harder to gain trust      │
│  Player-Known: ❌ No (Captain doesn't reveal feelings)       │
│                                                              │
│  💡 AI Behavior Impact: When players return to the city,     │
│     Captain Lyra will be professional but distant. She won't │
│     volunteer information and will require proof of good     │
│     intentions before helping again.                         │
└─────────────────────────────────────────────────────────────┘
```

### Knowledge System

```
NPC Knowledge — Lord Varen
┌─────────────────────────────────────────────────────────────┐
│  🔓 Known:                                                   │
│  • Council meeting schedules and agendas                     │
│  • Trade agreements with the Merchant Guild                  │
│  • Military deployment patterns                              │
│                                                              │
│  🔒 Secret:                                                  │
│  • Secret funding channel to the Orc Clans                   │
│    Source: Personal dealings during the Border Wars          │
│    Shares if: Blackmailed, or if he trusts the person        │
│    implicitly                                               │
│                                                              │
│  🔒 Secret:                                                  │
│  • The Remnant Council's treasury is nearly empty            │
│    Source: As Trade Master's deputy                          │
│    Shares if: Trying to gain political advantage             │
│                                                              │
│  🔓 Known:                                                   │
│  • Queen Ashavira's true parentage                           │
│    Source: Personal investigation                            │
│    Shares if: Trying to undermine the Queen                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6.5 NPC Death & Consequence System

When an NPC dies, their relationships cascade:

```
NPC Death — General Theron
┌─────────────────────────────────────────────────────────────┐
│  ☠️ General Theron — Killed in Session 14                    │
│  Cause: Assassinated by the Shadow Broker's agents           │
│                                                              │
│  ⚡ Immediate Consequences:                                  │
│  • Elven Dominion military loses coordination (military −20)  │
│  • Queen Ashavira loses her most trusted general             │
│  • Captain Lyra promoted to interim General (+responsibility) │
│  • Shadow Broker gains enemy status with Elven Dominion      │
│                                                              │
│  🔗 Relationship Cascades:                                   │
│  • Queen Ashavira: grief → increased paranoia, tighter security│
│  • Captain Lyra: imposter syndrome → seeks to prove herself  │
│  • Lord Varen: opportunity → pushes for military budget reallocation│
│  • Sage Alden: foreboding → prophecy begins to unfold        │
│  • Shadow Broker: triumph → bolder operations                │
│                                                              │
│  📈 Faction Impact:                                          │
│  • Elven Dominion: stability −10, military −15               │
│  • Remnant Council: morale +5 (enemy weakened)                │
│  • Orc Clans: morale +10 (opportunity)                       │
│                                                              │
│  🎭 New Plot Hooks Generated:                                │
│  1. "Who ordered the assassination?" — Investigation quest    │
│  2. "Lyra's Trial" — Captain must prove herself in battle    │
│  3. "The General's Secrets" — Theron's hidden files discovered│
│                                                              │
│  [✅ Confirm Death]  [↩️ Undo (was a mistake)]               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6.6 AI Dialogue Generation

### Voice/Personality Database

Each NPC has a consistent dialogue style. The AI uses this when generating NPC dialogue:

```
NPC Voice Profiles:
┌─────────────────────────────────────────────────────────────┐
│  Queen Ashavira:                                            │
│  Style: Formal, measured, occasionally warm                 │
│  Quirks: References elven history, uses metaphors about trees│
│  Example: "The roots of trust grow slowly, but they weather  │
│           any storm. You have given me reason to believe     │
│           this alliance can take root."                      │
│                                                              │
│  Captain Lyra:                                              │
│  Style: Blunt, practical, dry humor                          │
│  Quirks: Uses naval metaphors, cuts through formality       │
│  Example: "Look, I don't care about your quest. I care about │
│           my docks. Help with one, you get the other."       │
│                                                              │
│  Lord Varen:                                                │
│  Style: Charming, evasive, double meanings                   │
│  Quirks: Deflects with questions, agrees too easily         │
│  Example: "Ah, what a fascinating question. And what do YOU  │
│           think the answer might be, my perceptive friend?"   │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. Feature Design: Pantheon & Magic System Builder

## 7.1 Overview

A structured system for creating deities, pantheons, magic systems, and religious conflicts.
Includes AI-generated prophecies that actually tie into the campaign narrative.

---

## 7.2 Data Model

```
Deity {
  id: string
  campaignId: string
  name: string
  aliases: string[]                // titles, epithets
  domains: string[]                // war, death, nature, knowledge, etc.
  alignment: string                // good, evil, neutral, chaotic, lawful, etc.
  portfolio: string                // what they govern
  appearance: string               // how they appear to mortals
  personality: string              // their divine character
  worshiperCount: number           // estimated followers
  worshiperDemographics: string    // who worships them
  holySymbol: string
  favoredWeapon: string | null
  holyDays: string[]               // religious holidays
  afterlifeConcept: string         // what happens to their followers after death
  divineInterventionRules: string  // when/how does this god intervene
  relationshipsWithGods: DeityRelation[]
  myths: string[]                  // well-known stories about this deity
  secrets: string[]                // hidden truths about this deity
  avatarIds: string[]              // NPC IDs of divine champions
  churchStructure: string          // organized religion details
  heresies: Heresy[]
}

Pantheon {
  id: string
  campaignId: string
  name: string
  structure: "monotheism" | "polytheism" | "dualism" | "animism" |
             "henotheism" | "pantheism" | "custom"
  deities: string[]                // Deity IDs
  creationMyth: string
  cosmicOrder: string              // how the gods relate to the world
  mortalRelationship: string       // how mortals interact with the divine
  conflictHistory: string[]        // wars between gods, schisms, etc.
}

MagicSystem {
  id: string
  campaignId: string
  name: string
  type: "hard" | "soft" | "scientific" | "divine" | "elemental" | "custom"
  source: string                   // where magic comes from
  rules: MagicRule[]               // mechanical rules governing magic
  schools: MagicSchool[]           // categories of magic
  costs: string                    // what does using magic cost
  consequences: string             // what happens when magic goes wrong
  rarity: "common" | "uncommon" | "rare" | "legendary"
  socialAttitude: string           // how society views magic users
  limitations: string[]            // what magic CAN'T do
}

MagicRule {
  name: string
  description: string
  isHardLimit: boolean             // true = unbreakable rule, false = soft guideline
}

MagicSchool {
  name: string
  description: string
  specialties: string[]
  associatedDeity: string | null   // Deity ID
  practitioners: string            // who typically uses this school
}

Prophecy {
  id: string
  campaignId: string
  text: string                     // the prophecy text (cryptic)
  source: string                   // who or what issued the prophecy
  trueMeaning: string              // what the prophecy actually means (GM only)
  conditions: string[]             // what must happen for it to come true
  status: "pending" | "in-progress" | "fulfilled" | "subverted"
  relatedEntities: string[]        // NPC IDs, Faction IDs, Location IDs
  timelineEntries: string[]        // events related to this prophecy
  playerKnowledge: string          // what players know about this prophecy
}
```

---

## 7.3 Pantheon Creation Interface

### UI Wireframe: Deity Creation

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ Deity Creator — The Shattered Realms                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Name: ___________ Ashara, the Worldweaver ___________        │
│                                                              │
│  Titles: [Worldweaver] [Mother of Forests] [the Green Queen]  │
│                                                              │
│  Domains: ☑ Nature  ☑ Life  ☐ Death  ☐ War  ☑ Knowledge     │
│           ☐ Trickery  ☐ Light  ☐ Darkness  ☑ Creation       │
│                                                              │
│  Alignment: ○ Good  ○ Evil  ● Neutral  ○ Chaotic  ○ Lawful  │
│                                                              │
│  Appearance:                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ A towering woman made of living wood, with leaves    │    │
│  │ for hair and roots for feet. Her eyes are pools of   │    │
│  │ liquid amber. She appears differently to each race — │    │
│  │ as an elf to elves, as a great tree to animals.     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Worshipers: ~2.1M (primarily elves, druids, rangers)        │
│  Holy Symbol: 🌳 An oak leaf with a glowing vein              │
│  Favored Weapon: Quarterstaff                                 │
│                                                              │
│  Relationship with other gods:                               │
│  🔴 Vorath, God of War — Rival (disagrees on forest clearing)│
│  🟢 Lumia, Goddess of Light — Allied (share creation domain) │
│  🟡 Mordach, God of Secrets — Neutral (mutually wary)        │
│                                                              │
│  [🎲 AI Generate Details] [✅ Save Deity] [📋 Full Profile]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.4 Magic System Builder

### UI Wireframe: Magic System Design

```
┌─────────────────────────────────────────────────────────────┐
│  🔮 Magic System Builder                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  System Name: The Weave of Ashara                             │
│  Type: ● Divine/Nature  ○ Academic  ○ Elemental  ○ Blood     │
│  Rarity: ○ Common  ● Uncommon  ○ Rare  ○ Legendary          │
│                                                              │
│  Source: Magic flows from Ashara through the roots of the    │
│  Heartwood tree. Practitioners must be attuned to nature.     │
│                                                              │
│  Schools:                                                    │
│  ┌──────────┬──────────────────┬───────────────────┐        │
│  │ 🌿 Growth│ Heal, speed     │ Nature-aligned    │        │
│  │          │ plant growth     │ casters           │        │
│  ├──────────┼──────────────────┼───────────────────┤        │
│  │ 🌊 Shape │ Earth, water,   │ Druids and        │        │
│  │          │ weather control  │ shamans           │        │
│  ├──────────┼──────────────────┼───────────────────┤        │
│  │ 🔮 Sight │ Divination,      │ Oracles and       │        │
│  │          │ prophecy         │ seers             │        │
│  ├──────────┼──────────────────┼───────────────────┤        │
│  │ ⚡ Wrath  │ Lightning,      │ Battle-mages      │        │
│  │          │ storms           │ (rare & feared)   │        │
│  └──────────┴──────────────────┴───────────────────┘        │
│                                                              │
│  Costs:                                                      │
│  • Physical: Caster exhaustion proportional to spell power   │
│  • Social: Overuse causes nature to recoil (blights, wilting)│
│  • Spiritual: Connection to Ashara can weaken with misuse    │
│                                                              │
│  Hard Limits:                                                │
│  • Cannot raise the dead (only delay)                         │
│  • Cannot create true life                                    │
│  • Cannot affect other planes directly                       │
│  • Cannot undo what another caster has done (only counter)   │
│                                                              │
│  [🎲 AI Generate School] [✅ Save System]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.5 Prophecy System

### How Prophecies Work

1. **AI generates a prophecy** during worldbuilding or when triggered by campaign events.
2. **The prophecy is cryptic** — players (and sometimes GMs) don't immediately know the meaning.
3. **The GM knows the true meaning** and can plant clues throughout sessions.
4. **The prophecy has conditions** — specific things that must happen.
5. **Players can fulfill or subvert** the prophecy through their actions.

### UI Wireframe: Prophecy Generator

```
┌─────────────────────────────────────────────────────────────┐
│  🔮 Prophecy — "The Last Root"                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📜 Prophecy Text (Public):                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "When the last root drinks blood, the Weave will    │    │
│  │  shatter. The world-weaver's tears will fall as     │    │
│  │  ash, and from the darkness, a new sun shall rise   │    │
│  │  — or the world shall end in silence."              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  🔒 True Meaning (GM Only):                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ The "last root" is the Heartwood tree. If it is     │    │
│  │ destroyed (drinks blood = violence at its base),    │    │
│  │ the magic system collapses. "New sun" = a new god   │    │
│  │ will rise to replace Ashara.                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Conditions for Fulfillment:                                 │
│  • The Heartwood tree must be physically damaged             │
│  • At least one major caster must die in the attempt          │
│  • The ritual of succession must be completed                │
│                                                              │
│  Related:                                                    │
│  📍 Heartwood (Location)  |  🌳 Ashara (Deity)               │
│  👤 Sage Alden (knows partial truth)                         │
│  👥 The Remnant Council (debating whether to exploit this)    │
│                                                              │
│  Status: 🟡 In Progress (Heartwood under Elven protection)   │
│  Clues Planted: 2 of 5 needed                                │
│                                                              │
│  [✏️ Edit]  [🎲 Generate Clue]  [✅ Mark Fulfilled]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.6 Religious Conflict Generator

Based on deity relationships and worshiper demographics, the AI generates conflicts:

```
Religious Conflict: "The Schism of the Green"
┌─────────────────────────────────────────────────────────────┐
│  Type: Religious schism                                       │
│  Severity: ⭐⭐⭐⭐ (major)                                   │
│  Deities Involved: Ashara vs. herself (interpretation split)  │
│                                                              │
│  Hook: Two factions of Ashara's worshipers disagree on the   │
│  meaning of the "Last Root" prophecy. One faction believes   │
│  the tree must be protected at all costs. The other believes  │
│  it must be allowed to die so a new god can be born.         │
│                                                              │
│  Factions:                                                   │
│  • The Wardens (protectionist) — Led by Sage Alden           │
│  • The Renewal (destructionist) — Led by a mysterious figure  │
│    known only as "the Seed"                                   │
│                                                              │
│  Impact on NPCs:                                             │
│  • Councilor Mirael sides with the Wardens                    │
│  • Lord Varen secretly funds the Renewal (sees opportunity)   │
│  • Captain Lyra caught in the middle (her soldiers are split) │
│                                                              │
│  Potential Consequences:                                     │
│  • Civil war within Elven Dominion if not resolved            │
│  • Magic system disruption if Heartwood is damaged            │
│  • New deity birth if prophecy is fulfilled                   │
│                                                              │
│  [➕ Add to Campaign]  [🎲 Generate Alternative]             │
└─────────────────────────────────────────────────────────────┘
```

---

# 8. Feature Design: Campaign Chronicle

## 8.1 Overview

The Campaign Chronicle is DMlog.ai's session logging and timeline visualization system.
It automatically creates a searchable, interlinked record of everything that happens in play,
inspired by Kanka's timeline and Obsidian's interlinked notes.

---

## 8.2 Data Model

```
Session {
  id: string
  campaignId: string
  sessionNumber: number
  date: timestamp                 // real-world date
  inGameDate: string | null       // in-world date/time
  title: string
  summary: string                 // brief overview
  locationId: string | null       // where the session took place
  npcIds: string[]                // NPCs encountered
  playerIds: string[]             // players present
  duration: number                // session length in minutes
  xpAwarded: number | null
  goldAwarded: number | null
  milestones: string[]            // achievements, level ups, etc.
  cliffhanger: string | null      // ending hook for next session
  mood: string                    // overall tone: "tense", "epic", "comedic", etc.
  tags: string[]
}

SessionEvent {
  id: string
  sessionId: string
  timestamp: timestamp            // when in the session this occurred
  type: "combat" | "social" | "exploration" | "discovery" | "decision" |
        "death" | "rest" | "travel" | "shopping" | "custom"
  description: string
  participants: string[]          // NPC/Player IDs involved
  outcome: string
  consequence: string             // lasting effects
  significance: "minor" | "moderate" | "major" | "critical"
  track: "pc_story" | "npc_story" | "world_events" | "faction_events"
}

LoreEntry {
  id: string
  campaignId: string
  title: string
  type: "location" | "npc" | "faction" | "item" | "creature" |
        "event" | "culture" | "religion" | "magic" | "history" |
        "rumor" | "law" | "custom"
  content: string                 // rich text with entity mentions
  tags: string[]
  linkedEntities: string[]        // IDs of related entities
  firstMentionedSession: number   // session number
  lastUpdatedSession: number
  gmOnly: boolean                 // World Anvil-inspired secrets
  playerDiscoveredIn: number | null // when players learned about this
  category: string                // organizational category
  importance: "minor" | "notable" | "major" | "critical"
}
```

---

## 8.3 Session Auto-Logging

### UI Wireframe: Session Log

```
┌─────────────────────────────────────────────────────────────┐
│  📝 Session 14 — "The Assassin's Blade"                      │
├─────────────────────────────────────────────────────────────┤
│  Date: March 15, 2026  |  Duration: 4h 15m  |  In-game:     │
│  Spring, 3rd Age, Year 3001                                   │
│  Location: Eldrath, Elven Dominion                           │
│  NPCs: Queen Ashavira, General Theron, Captain Lyra,         │
│        Lord Varen, Shadow Broker (mentioned)                  │
│  Mood: ⚡ Tense → 😢 Tragic                                 │
│                                                              │
│  ──── Session Timeline ────                                  │
│                                                              │
│  ⏱️ 0:00  Arrival in Eldrath via the forest road             │
│          Track: 🧙 PC Story  |  📍 Eldrath                   │
│                                                              │
│  ⏱️ 0:30  Meeting with Captain Lyra at the harbor gate      │
│          Track: 🧙 PC Story  |  😐 Lyra is cold, professional│
│          Outcome: Party gains access to the lower city        │
│                                                              │
│  ⏱️ 1:00  Discovery: Shadow Broker's calling card in market  │
│          Track: 🧙 PC Story  |  🔍 Investigation begun      │
│          Consequence: Party begins investigating assassin threat│
│                                                              │
│  ⏱️ 1:45  Social encounter with Councilor Mirael             │
│          Track: 👥 NPC Story  |  🗣️ Mirael warns of danger  │
│          Outcome: Party learns General Theron is the target   │
│                                                              │
│  ⏱️ 2:30  Combat: Ambush in the palace gardens              │
│          Track: 🧙 PC Story  |  ⚔️ 4 assassins vs party      │
│          Outcome: 2 assassins killed, 2 fled                  │
│          Consequence: Palace security heightened              │
│                                                              │
│  ⏱️ 3:15  Critical Event: General Theron is poisoned         │
│          Track: 🌍 World Events  |  💀 FATAL                  │
│          Outcome: Despite party's efforts, Theron dies         │
│          Consequence: See NPC Death Consequences (Section 6.5)│
│                                                              │
│  ⏱️ 4:00  Aftermath: Queen's grief, Captain Lyra's promotion │
│          Track: 👥 NPC Story  |  😢 Emotional scene          │
│          Outcome: Party gains Queen's trust                   │
│                                                              │
│  ⏱️ 4:15  Cliffhanger: Shadow Broker sends message —         │
│          "One down. Two to go. You cannot stop what is        │
│           coming."                                            │
│                                                              │
│  ──── Rewards ────                                           │
│  XP: 3,200 per player  |  Gold: 500 each  |  Item: Amulet of │
│  Warning (Councilor Mirael's gift)                            │
│                                                              │
│  ──── Lore Discovered ────                                   │
│  🆕 Shadow Broker (NPC)  |  🆕 Palace Gardens (Location)     │
│  🆕 Calling Card of the Broker (Item)  |  🔄 Queen Ashavira   │
│                                                              │
│  [✏️ Edit]  [📊 Analytics]  [📋 Player Recap]  [📜 Export]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8.4 "Previously On" Recap Generator

Before each session, DMlog.ai generates a recap tailored for the players:

```
┌─────────────────────────────────────────────────────────────┐
│  📺 Previously on "The Shattered Realms"...                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 Last session, the party arrived in Eldrath, capital of   │
│  the Elven Dominion, seeking an alliance against the growing  │
│  Orc threat.                                                  │
│                                                              │
│  ⚔️ You stopped an assassination attempt in the palace       │
│  gardens, but tragically, General Theron — the Queen's most  │
│  trusted military leader — was poisoned by the Shadow Broker's│
│  agents before you could save him.                            │
│                                                              │
│  👑 Queen Ashavira now trusts you, but she's grieving and    │
│  paranoid. Captain Lyra has been promoted to interim General  │
│  but feels unready for the role.                             │
│                                                              │
│  💀 The Shadow Broker sent a chilling message: "One down.    │
│  Two to go." Someone else is being targeted.                  │
│                                                              │
│  📋 Open Threads:                                            │
│  • Who is the Shadow Broker? Investigation ongoing.          │
│  • The elf-human alliance vote is deadlocked.                │
│  • Merchant Guild is profiting from the conflict.            │
│  • Lord Varen's loyalties are suspicious.                    │
│  • The prophecy of the Last Root hangs over everything.      │
│                                                              │
│  🧠 Things Your Character Knows:                             │
│  • The Shadow Broker uses poisoned blades and calling cards   │
│  • Captain Lyra is now in charge of the Elven military       │
│  • Councilor Mirael supports the alliance                    │
│  • The Elven Dominion's magic comes from the Heartwood tree  │
│                                                              │
│  [📋 Copy to Clipboard]  [🔊 Read Aloud]  [✏️ Customize]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 8.5 Timeline Visualization with Parallel Tracks

### UI Wireframe: Multi-Track Timeline

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Campaign Timeline — All Tracks                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Session: [1][2][3][4][5][6][7][8][9][10][11][12][13][14]   │
│                                                              │
│  🧙 PC Story:                                                │
│  ─●──────●──●────────●──●──────●────────●──●──●─────●──●──   │
│   arrive  met  quest  battle  city  market  forest  travel    │
│           Lyra found                      arrived  council    │
│                                                              │
│  👥 NPC Story:                                               │
│  ───●───────────────●────────────────●────────●───────────   │
│     Lyra         Mirael              Theron   Queen's         │
│     distrust     warning             dies     grief           │
│                                                              │
│  🏰 Faction Events:                                           │
│  ───────●──────────────●──────●──────────●───────────────    │
│         orc        alliance  guild   council  general's       │
│         raids      proposed  raises  vote     death            │
│                              prices  fails                    │
│                                                              │
│  🌍 World Events:                                             │
│  ─────────────────●────────────────────────●──────────────   │
│                   heartwood                 shadow            │
│                   blight begins             broker            │
│                                             emerges           │
│                                                              │
│  🔮 Prophecy Progress:                                        │
│  ───────────────●─────────────────────────●───────────────    │
│                clue found              tree threatened       │
│                (session 7)             (session 14)           │
│                                                              │
│  Filters: [✅ All] [🧙 PCs] [👥 NPCs] [🏰 Factions]          │
│           [🌍 World] [🔮 Prophecy]  [🔍 Search]              │
│                                                              │
│  Click any point for details. Drag to zoom.                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8.6 Lore Database

### UI Wireframe: Lore Search & Browse

```
┌─────────────────────────────────────────────────────────────┐
│  📚 Lore Database — The Shattered Realms                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 Search: [__________shadow___________] [Filter▼] [Sort▼]  │
│                                                              │
│  Results (4):                                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Shadow Broker                          ⭐ Critical │    │
│  │ Type: NPC  |  First seen: Session 10                 │    │
│  │ A mysterious figure who orchestrates assassinations  │    │
│  │ and political manipulation across factions.          │    │
│  │ Linked: Queen Ashavira, General Theron, Lord Varen  │    │
│  │ Tags: #npc #villain #mysterious #faction:unknown     │    │
│  │ [Open] [Edit] [Graph]                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 📍 Shadow Market                          ⭐ Notable │    │
│  │ Type: Location  |  First seen: Session 11            │    │
│  │ Underground black market beneath the Merchant Guild  │    │
│  │ headquarters.                                       │    │
│  │ Linked: Merchant Guild, Shadow Broker               │    │
│  │ Tags: #location #underground #market #eldrath        │    │
│  │ [Open] [Edit] [Graph]                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 🗡️ Shadow Blade (Item)                    ⭐ Minor   │    │
│  │ Type: Item  |  First seen: Session 10                │    │
│  │ Poisoned dagger used by Shadow Broker's agents.      │    │
│  │ Tags: #item #weapon #poison #shadow_broker           │    │
│  │ [Open] [Edit] [Graph]                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 🌑 The Shadow War                         ⭐ Major   │    │
│  │ Type: Event  |  Ongoing                            │    │
│  │ Secret conflict between the Shadow Broker and         │    │
│  │ multiple factions across the Shattered Realms.       │    │
│  │ Tags: #event #ongoing #conflict #shadow_broker       │    │
│  │ [Open] [Edit] [Graph]                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Categories: [All(147)] [NPCs(42)] [Locations(31)]           │
│              [Factions(8)] [Items(19)] [Events(25)]          │
│              [Lore(14)] [Rumors(8)]                           │
│                                                              │
│  [➕ New Entry]  [📊 Knowledge Graph]  [📤 Export All]      │
└─────────────────────────────────────────────────────────────┘
```

---

# 9. Feature Design: Multi-Agent Spectator Mode

## 9.1 Overview

An innovative feature where AI agents act as spectators, commentators, or even "choose your own
adventure" participants in the TTRPG experience. This transforms passive observation into
interactive entertainment.

---

## 9.2 Data Model

```
SpectatorAgent {
  id: string
  campaignId: string
  name: string
  type: "spectator" | "commentator" | "character" | "voter"
  
  // For "character" type
  characterId: string | null        // NPC this agent embodies
  factionId: string | null
  
  // Personality
  personality: string               // how they react to events
  bias: string                      // what they favor/root for
  humor: string                     // "dry", "enthusiastic", "sarcastic", "none"
  knowledgeLevel: "omniscient" | "player_knowledge" | "limited"
  
  // Behavior
  reactionFrequency: "every_event" | "major_events" | "critical_only" | "random"
  reactionStyle: "in_character" | "commentary" | "emoji" | "mixed"
  channel: string                   // where they post (Discord channel, etc.)
  
  // State
  mood: string                      // current emotional state
  investment: string[]              // what they care about
  predictions: SpectatorPrediction[]
}

SpectatorReaction {
  agentId: string
  sessionId: number
  eventId: string                   // SessionEvent ID that triggered this
  timestamp: timestamp
  content: string                   // the reaction text
  emotion: string                   // "excited", "worried", "amused", etc.
  channel: string
}

SpectatorPrediction {
  agentId: string
  content: string                   // what they predict will happen
  confidence: number                // 0-100
  resolved: boolean
  outcome: string | null            // what actually happened
}

SpectatorVote {
  sessionId: number
  eventId: string                   // the decision point
  question: string                  // "Should the party attack or negotiate?"
  options: string[]
  votes: { agentId: string, choice: string }[]
  winningChoice: string | null
  playerChoice: string | null       // what the players actually did
}
```

---

## 9.3 Commentator Mode

### UI Wireframe: Live Commentary Feed

```
┌─────────────────────────────────────────────────────────────┐
│  🎙️ Live Commentary — Session 14                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  💬 Barkeep Barnaby (Spectator Character):                   │
│  "Oh, that's a nasty poison. I've seen that shade of green  │
│   before — only once, in the old wars. Theron's a goner,     │
│   mark my words."                                            │
│                        ⏱️ 3:15:00                           │
│                                                              │
│  💬 The Chronicler (Commentator):                           │
│  "And the shadow tightens its grip on the Elven Dominion.    │
│   General Theron — the shield that held the northern border  │
│   for thirty years — falls not to the blade of an enemy      │
│   army, but to the quiet work of a single poisoned cup.      │
│   The party tried. They really did. But some deaths are      │
│   written in the stars before the first session begins."     │
│                        ⏱️ 3:17:30                           │
│                                                              │
│  💬 Lady Vex (Spectator — Shadow Broker symp):               │
│  "Finally! Someone had the guts to do what needed doing.     │
│   Theron was too popular for his own good. >:)"              │
│                        ⏱️ 3:18:00                           │
│                                                              │
│  💬 The Chronicler (Commentator):                           │
│  "And there it is — the Shadow Broker's calling card.        │
│   'One down. Two to go.' The party has just gone from        │
│   alliance-seekers to bodyguards, whether they like it or    │
│   not. This campaign has escalated from diplomatic mission   │
│   to full-blown protection detail in the span of an evening."│
│                        ⏱️ 4:15:00                           │
│                                                              │
│  ──── Spectator Predictions ────                             │
│  🎯 Barkeep: "The next target is Councilor Mirael" (60%)     │
│  🎯 Lady Vex: "The party will fail to protect the next target"│
│     (75%)                                                    │
│  🎯 The Chronicler: "Lord Varen is the Shadow Broker" (30%) │
│                                                              │
│  [⚙️ Settings]  [➕ Add Spectator]  [🔇 Mute]  [📤 Export]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9.4 "Choose Your Own Adventure" Mode

### UI Wireframe: Spectator Voting

```
┌─────────────────────────────────────────────────────────────┐
│  🗳️ Decision Point — Session 14, 2:00:00                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  The party has discovered that General Theron is the target  │
│  of an assassination plot. What should they do?               │
│                                                              │
│  Options:                                                    │
│  ┌──────────────────────────────────────┐                    │
│  │ A) Warn Theron directly and guard him │ ████████ 65%      │
│  │    personally                        │ (spectators)      │
│  ├──────────────────────────────────────┤                    │
│  │ B) Set a trap for the assassins      │ ████░░░░ 25%      │
│  │    using Theron as bait              │ (spectators)      │
│  ├──────────────────────────────────────┤                    │
│  │ C) Find the Shadow Broker first      │ █░░░░░░░ 10%      │
│  │    and stop it at the source         │ (spectators)      │
│  └──────────────────────────────────────┘                    │
│                                                              │
│  Spectator Votes:                                            │
│  Barkeep: A ("Too risky to use the General as bait!")        │
│  Lady Vex: C ("You can't stop the Broker without finding    │
│               them first... but good luck with that lol")     │
│  The Chronicler: A ("The party chose the path of heroes.     │
│                    Whether it's the path of the wise...")     │
│                                                              │
│  Player Choice: A — Warn Theron directly                     │
│                                                              │
│  Result: Theron was warned, but the assassins poisoned him   │
│  through his food supply instead of direct attack. The party │
│  chose the noble path, but the Shadow Broker was prepared.   │
│                                                              │
│  🏆 Spectator Accuracy: Barkeep 3/5 (60%), Lady Vex 4/5     │
│     (80%), Chronicler 2/5 (40%)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9.5 Reaction System

### Emotional Reactions to Plot Twists

When a significant event occurs during a session, spectator agents react based on their
personality and investment:

```
Event: Lord Varen revealed as the Shadow Broker

Agent Reactions:
┌─────────────────────────────────────────────────────────────┐
│  😱 The Chronicler:                                        │
│  "I... did not see that coming. Thirty percent confidence   │
│   was generous. Varen! The Trade Master's own deputy! The   │
│   man who smiled at every council meeting, who toasted      │
│   Theron's victories — he was orchestrating his death all   │
│   along. The players suspected him all along, didn't they?  │
│   Of course they did. That's why they kept poking around    │
│   the Merchant Guild."                                      │
│                                                              │
│  😤 Barkeep:                                                │
│  "I KNEW IT. I said it from session 3! That man's smile     │
│   never reached his eyes. Never trust a man who agrees      │
│   too easily."                                              │
│                                                              │
│  😏 Lady Vex:                                               │
│  "Finally caught on, did we? Varen was always the most      │
│   interesting one in that council. Theron was just a       │
│   soldier. Varen? Varen plays the long game. Respect."     │
│                                                              │
│  😰 Captain Lyra (In-Character):                            │
│  "Varen... I served under him for two years. I trusted him. │
│   He recommended me for promotion. Was that to remove me    │
│   from Theron's side?"                                      │
│                                                              │
│  [📊 Update Agent Moods]  [💬 Send to Discord]               │
└─────────────────────────────────────────────────────────────┘
```

---

# 10. Cross-Cutting Data Models

## 10.1 Core Entity System

All data in DMlog.ai uses a universal entity system inspired by Kanka and Obsidian:

```
Entity {
  id: string
  campaignId: string
  type: string                    // "npc", "location", "faction", "item", etc.
  name: string
  description: string             // rich text with @mentions
  tags: string[]
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
  createdBy: string
  lastEditedBy: string
  
  // Visibility (World Anvil inspired)
  visibility: "gm" | "players" | "public"
  discoveredInSession: number | null
  
  // References
  mentions: string[]              // IDs of entities mentioned in description
  mentionedIn: string[]           // IDs of entities that mention this one
  
  // Attachments
  images: string[]
  files: string[]
  timelineEntries: string[]       // TimelineEntry IDs
  
  // AI Context
  aiSummary: string               // AI-generated brief for context window
  aiKeywords: string[]            // for search and matching
}
```

## 10.2 Campaign Data Model

```
Campaign {
  id: string
  name: string
  description: string
  system: string                  // "D&D 5e", "Pathfinder", "system-agnostic", etc.
  status: "active" | "paused" | "completed" | "archived"
  
  // World Builder State
  worldBuilderPhase: "not_started" | "creation" | "life" | 
                     "building" | "conflict" | "legends" | "complete"
  creationBudget: number          // remaining creation points
  palette: Palette                // established constraints
  
  // Calendar
  calendar: Calendar              // custom in-game calendar
  
  // Settings
  pantheon: Pantheon | null
  magicSystem: MagicSystem | null
  
  // Participants
  gmId: string
  playerIds: string[]
  spectatorAgentIds: string[]
  
  // Session Tracking
  sessionCount: number
  currentSession: number | null
  inGameDate: string | null
  
  // Integrations
  vttType: string | null          // "foundry", "roll20", etc.
  vttUrl: string | null
}
```

## 10.3 Palette Data Model (Microscope-inspired)

```
Palette {
  allowed: string[]               // "Magic exists", "Elves are real"
  banned: string[]                // "No firearms", "No space travel"
  questions: string[]             // "Who created the world?", "Is there an afterlife?"
}
```

## 10.4 Calendar Data Model

```
Calendar {
  name: string
  months: CalendarMonth[]
  eras: CalendarEra[]
  currentEra: string
  currentYear: number
  currentMonth: number
  currentDay: number
  leapYearRules: string
  holidays: CalendarHoliday[]
  moonPhases: string | null       // lunar cycle description
}

CalendarMonth {
  name: string
  days: number
  seasons: string[]               // what season(s) this month covers
}

CalendarEra {
  name: string
  startYear: number
  endYear: number | null          // null = current era
  description: string
}
```

---

# 11. Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)

| Feature | Priority | Dependencies |
|---|---|---|
| Entity system with universal relations | P0 | None |
| Campaign creation & management | P0 | Entity system |
| Basic timeline (sessions → events) | P0 | Campaign |
| NPC creation with Three-Layer template | P0 | Entity system |
| Lore database with search & @mentions | P0 | Entity system |
| Session logging with auto-timestamps | P0 | Campaign, Timeline |

## Phase 2: World Builder (Weeks 5-10)

| Feature | Priority | Dependencies |
|---|---|---|
| Palette system (allowed/banned) | P1 | Campaign |
| Fractal timeline (era → event → scene) | P1 | Timeline |
| Lens/focus system | P1 | Fractal timeline |
| Map canvas with hex grid | P1 | Campaign |
| Terrain painting tools | P1 | Map canvas |
| Location hierarchy (world → region → city) | P1 | Entity system |
| Creation point economy | P1 | World Builder |
| AI consistency engine | P1 | All world builder features |

## Phase 3: Factions & NPCs (Weeks 11-16)

| Feature | Priority | Dependencies |
|---|---|---|
| Faction creation & tracking | P1 | Entity system |
| Faction resources & stability | P1 | Faction |
| Alliance/conflict web | P1 | Faction |
| Faction turn AI system | P1 | Faction, Resources |
| Political intrigue generator | P2 | Faction, AI |
| NPC relationships (bidirectional) | P1 | NPC, Entity |
| NPC memory system | P2 | NPC |
| NPC knowledge system | P2 | NPC |
| NPC death & consequence cascade | P2 | NPC, Relationships |
| AI dialogue generation with voice profiles | P2 | NPC, AI |
| Family tree visualization | P2 | NPC, Relationships |

## Phase 4: Pantheon & Magic (Weeks 17-20)

| Feature | Priority | Dependencies |
|---|---|---|
| Deity creation | P2 | Entity system |
| Pantheon management | P2 | Deity |
| Magic system builder | P2 | Entity system |
| Prophecy generator | P2 | AI, Timeline |
| Religious conflict generator | P2 | Pantheon, AI |

## Phase 5: Chronicle & Spectator (Weeks 21-26)

| Feature | Priority | Dependencies |
|---|---|---|
| Multi-track timeline visualization | P1 | Timeline |
| "Previously on" recap generator | P1 | Session logging, Timeline |
| Lore visibility (GM vs player) | P1 | Lore database |
| Knowledge graph visualization | P2 | Entity relations |
| Export system (PDF, Markdown, JSON, VTT) | P1 | All systems |
| Spectator agent creation | P3 | Campaign |
| Commentator mode | P3 | Spectator, Session logging |
| Voting system | P3 | Spectator |
| Reaction system | P3 | Spectator, NPC |

## Phase 6: Polish & Community (Weeks 27-32)

| Feature | Priority | Dependencies |
|---|---|---|
| Community marketplace (world templates) | P3 | All systems |
| Plugin/extension API | P3 | Architecture |
| Campaign dashboard with widgets | P2 | All systems |
| Mobile-responsive UI | P2 | All UI |
| VTT integration (Foundry, Roll20) | P2 | Export system |
| Performance optimization | P1 | All systems |

---

# 12. Competitive Analysis Matrix

## Feature Comparison

| Feature | DMlog.ai | Kanka | World Anvil | Foundry VTT | D&D Beyond | Obsidian |
|---|---|---|---|---|---|---|
| **Fractal Timeline** | ✅ | ❌ (flat) | ❌ (flat) | ❌ | ❌ | Via plugin |
| **Map Canvas** | ✅ | ✅ | ✅ | ✅ | ✅ | Via plugin |
| **Creation Economy** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI Consistency Engine** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Faction Turn AI** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **NPC Memory System** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **NPC Death Cascades** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI Dialogue Voices** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Prophecy Generator** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Palette System** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Political Intrigue AI** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Session Auto-Logging** | ✅ | Manual | Manual | ❌ | ❌ | Manual |
| **Recap Generator** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Spectator Mode** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Entity Relations** | ✅ | ✅ | ✅ | ✅ | Partial | ✅ |
| **Family Trees** | ✅ | ✅ | ✅ | Via module | ❌ | Via plugin |
| **Custom Calendar** | ✅ | ✅ | ✅ | Via module | ❌ | Via plugin |
| **Lore Visibility** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Markdown Export** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (native) |
| **VTT Import** | ✅ | ❌ | ❌ | Native | Via Beyond20 | ❌ |
| **Multi-User Collaborative** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Knowledge Graph View** | ✅ | ❌ | ❌ | Via module | ❌ | ✅ |
| **Plugin Ecosystem** Planned | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |

## DMlog.ai's Unique Advantages

1. **AI-Native:** Every system has AI integration — not bolted on, but foundational.
2. **Living World:** Factions act between sessions. NPCs have memories and goals. The world
   doesn't wait for players.
3. **Creation Economy:** The only tool that constrains worldbuilding with a point system,
   preventing scope creep while encouraging creativity.
4. **Fractal Timeline:** The only tool with Microscope-inspired nested zoom from era to scene.
5. **Consequence Engine:** NPC death, faction decisions, and player actions all cascade
   through the world in tracked, predictable ways.
6. **Spectator Experience:** Unique multi-agent spectator mode turns TTRPG into interactive
   entertainment for audiences.
7. **Session Intelligence:** Auto-logging, recap generation, and lore tracking happen
   automatically during play.
8. **Unified Platform:** No need for Kanka + Foundry + Obsidian + D&D Beyond. DMlog.ai
   brings worldbuilding, session management, faction tracking, and AI assistance into one tool.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| **Lens** (Microscope) | A player's thematic focus for a round of worldbuilding |
| **Palette** (Microscope) | Pre-established constraints on what exists and doesn't in the world |
| **Creation Points** (Dawn of Worlds) | Currency spent to create elements in the world |
| **Crossroads** (Kingdom) | A critical decision point the community must face |
| **Three Layers** (D'Amato) | NPC design: role, personality, secret |
| **Tension Web** (D'Amato) | Interconnected conflict visualization |
| **Entity** | Any piece of campaign data — NPC, location, item, event, etc. |
| **Faction Turn** | AI-driven actions a faction takes between player sessions |
| **Consequence Cascade** | Ripple effects when an NPC dies or a major event occurs |
| **Spectator Agent** | AI persona that watches and reacts to the game |

## Appendix B: ASCII Wireframe Legend

```
UI Element Symbols:
┌──┐  Window/Panel border
│  │  Content area
├──┤  Section divider
└──┘  Bottom border
[  ]  Button
●     Radio button (selected)
○     Radio button (unselected)
☑     Checkbox (selected)
☐     Checkbox (unselected)
~~~   Water/Ocean
🌲   Forest
🟢   Plains
⛰️   Mountain
🏜️   Desert
🌋   Volcanic
🏰   City/Town
🏘️   Village
👤   NPC
📍   Location
⚔️   Combat
💀   Death
🔮   Prophecy/Magic
📜   History/Lore
📊   Chart/Statistics
🎙️   Commentary
🗳️   Voting
```

## Appendix C: Technology Recommendations

| Component | Technology | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Component-based UI, large ecosystem |
| Map Canvas | Phaser.js or Konva.js | Hex grid support, performant rendering |
| Graph Visualization | D3.js or Cytoscape.js | Relationship webs, knowledge graphs |
| Timeline | Custom React component | Fractal nesting requires custom implementation |
| Rich Text | TipTap (ProseMirror) | Entity @mentions, collaboration support |
| Real-time Sync | WebSocket (Socket.io) | Multi-user collaborative editing |
| AI Integration | OpenAI API / Anthropic API | NPC generation, consistency checking, dialogue |
| Database | PostgreSQL + Redis | Relational data + caching for real-time features |
| Search | Meilisearch or ElasticSearch | Full-text lore search with fuzzy matching |
| Export | Puppeteer (PDF), marked.js (Markdown) | Document generation |
| VTT Integration | Foundry VTT API, Roll20 API | Scene pack export |

---

*This document represents a comprehensive analysis of worldbuilding systems and their integration
into DMlog.ai. All features are designed to work together as a unified platform, with AI as a
foundational capability rather than an afterthought.*

*Total lines: 1,500+*
*Document generated: 2026-03-26*
