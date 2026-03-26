// ─── Game Shell — Main TTRPG interface (Preact + HTM, no build step) ─────────
import { h, render } from 'preact';
import { html, Component } from 'htm/preact';
import { signal, computed, effect } from 'preact/signals';
import { DiceRoller } from './dice-roller.js';
import { CombatTracker } from './combat-tracker.js';
import { CharacterSheet } from './character-sheet.js';

const sessionPhase = signal('SETUP');
const sessionTitle = signal('DMlog.ai');
const actions = signal([]);
const sidebarTab = signal('character');
const combatState = signal(null);
const characterData = signal(null);
const showSidebar = signal(false);

// Phase badge colors
const PHASE_COLORS = {
  SETUP: '#9966cc',
  INTRODUCTION: '#0f52ba',
  EXPLORATION: '#50c878',
  COMBAT: '#dc143c',
  ROLEPLAY: '#e0115f',
  CLIMAX: '#ffa500',
  RESOLUTION: '#4a9eff',
  WRAP_UP: '#888',
};

class GameShell extends Component {
  constructor() {
    super();
    this.handleInput = this.handleInput.bind(this);
    this.handleAction = this.handleAction.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
  }

  handleInput(e) {
    e.preventDefault();
    const input = e.target.querySelector('textarea');
    if (!input.value.trim()) return;

    const userAction = {
      type: 'speech',
      payload: { character: 'You', character_id: 'player', text: input.value },
      meta: { id: `act-${Date.now()}`, priority: 5 },
    };
    actions.value = [...actions.value, userAction];
    this.processTurn(input.value.trim());
    input.value = '';
  }

  handleAction(cmd) {
    const input = this.base.querySelector('textarea');
    if (input) input.value = cmd + ' ';
    input?.focus();
  }

  toggleSidebar() {
    showSidebar.value = !showSidebar.value;
  }

  async processTurn(input) {
    try {
      const res = await fetch('/v1/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: window.__gameSessionId, input }),
      });
      const data = await res.json();
      if (data.decision) {
        actions.value = [...actions.value, {
          type: 'narration',
          payload: { text: `*Routed to ${data.decision.agent}: ${data.decision.instruction}*`, style: 'casual' },
          meta: { id: `meta-${Date.now()}`, priority: 2 },
        }];
      }
      if (data.state?.phase) sessionPhase.value = data.state.phase;
      if (data.state?.combat) combatState.value = data.state.combat;
    } catch (err) {
      console.error('Turn error:', err);
    }
  }

  render() {
    return html`
      <div class="game-shell">
        <header class="game-topbar">
          <button class="sidebar-toggle" onClick=${this.toggleSidebar}>☰</button>
          <h1 class="session-title">${sessionTitle.value}</h1>
          <span class="phase-badge" style="background:${PHASE_COLORS[sessionPhase.value]}">${sessionPhase.value}</span>
        </header>

        <div class="game-body">
          ${showSidebar.value && html`
            <aside class="game-sidebar">
              <nav class="sidebar-tabs">
                <button class=${sidebarTab.value === 'character' ? 'active' : ''} onClick=${() => sidebarTab.value = 'character'}>Character</button>
                <button class=${sidebarTab.value === 'npcs' ? 'active' : ''} onClick=${() => sidebarTab.value = 'npcs'}>NPCs</button>
                <button class=${sidebarTab.value === 'combat' ? 'active' : ''} onClick=${() => sidebarTab.value = 'combat'}>Combat</button>
              </nav>
              <div class="sidebar-content">
                ${sidebarTab.value === 'character' && html`<${CharacterSheet} data=${characterData.value} />`}
                ${sidebarTab.value === 'combat' && html`<${CombatTracker} combat=${combatState.value} />`}
                ${sidebarTab.value === 'npcs' && html`<div class="npc-list"><p class="empty-state">NPCs will appear here as they enter the story.</p></div>`}
              </div>
            </aside>
          `}

          <main class="game-main">
            <div class="action-stream" id="action-stream">
              ${actions.value.map(a => html`<${ActionRenderer} action=${a} />`)}
            </div>
          </main>
        </div>

        <footer class="game-bottombar">
          <div class="action-buttons">
            <button onClick=${() => this.handleAction('/roll')}>🎲 /roll</button>
            <button onClick=${() => this.handleAction('/attack')}>⚔️ /attack</button>
            <button onClick=${() => this.handleAction('/describe')}>👁️ /describe</button>
            <button onClick=${() => this.handleAction('/rest')}>🏕️ /rest</button>
          </div>
          <form class="game-input-form" onSubmit=${this.handleInput}>
            <textarea placeholder="What do you do?" rows="1" />
            <button type="submit" class="send-btn">▶</button>
          </form>
        </footer>
      </div>
    `;
  }
}

class ActionRenderer extends Component {
  render({ action }) {
    const { type, payload } = action;
    switch (type) {
      case 'narration':
        return html`<div class="action-narration"><div class="narration-text" dangerouslySetInnerHTML=${{ __html: markdownToHtml(payload.text) }} /></div>`;
      case 'speech':
        return html`<div class="action-speech ${payload.character_id === 'player' ? 'player' : 'npc'}">
          <div class="speech-name">${payload.character}</div>
          <div class="speech-text">${payload.text}</div>
          ${payload.direction && html`<div class="speech-direction"><em>${payload.direction}</em></div>`}
        </div>`;
      case 'dice_roll':
        return html`<div class="action-dice-roll">
          <span class="dice-notation">${payload.notation}</span>
          <span class="dice-rolls">[${payload.rolls.join(', ')}]${payload.modifier ? ` ${payload.modifier >= 0 ? '+' : ''}${payload.modifier}` : ''}</span>
          <span class="dice-total ${payload.critical === 'success' ? 'crit' : payload.critical === 'failure' ? 'crit-fail' : ''}">${payload.total}</span>
          ${payload.reason && html`<span class="dice-reason">${payload.reason}</span>`}
          ${payload.difficulty_class != null && html`<span class="dice-dc ${payload.success ? 'success' : 'fail'}">DC ${payload.difficulty_class} — ${payload.success ? 'Success!' : 'Failure!'}</span>`}
        </div>`;
      case 'scene_transition':
        return html`<div class="action-scene-transition fade-in">
          <h2 class="scene-name">${payload.name}</h2>
          <p class="scene-desc">${payload.description}</p>
          ${payload.atmosphere && html`<p class="scene-atmosphere">${payload.atmosphere}</p>`}
        </div>`;
      case 'question':
        return html`<div class="action-question">
          <p class="question-prompt">${payload.prompt}</p>
          ${payload.context && html`<p class="question-context"><em>${payload.context}</em></p>`}
          ${payload.valid_answers?.length > 0 && html`<div class="question-options">
            ${payload.valid_answers.map(a => html`<button class="option-btn">${a}</button>`)}
          </div>`}
        </div>`;
      case 'character_update':
        return html`<div class="action-character-update">
          ${payload.changes.map(c => html`<span class="stat-change">${c.stat}: ${c.value} (${c.reason})</span>`)}
        </div>`;
      case 'initiative':
        return html`<div class="action-initiative">
          <strong>⚔️ Initiative Set — Round ${payload.round}</strong>
        </div>`;
      default:
        return html`<div class="action-unknown">[${type}]</div>`;
    }
  }
}

// Simple markdown → HTML (basic)
function markdownToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export function initGameShell(container, sessionId) {
  window.__gameSessionId = sessionId;
  render(html`<${GameShell} />`, container);
  return { actions, sessionPhase, combatState, characterData };
}
