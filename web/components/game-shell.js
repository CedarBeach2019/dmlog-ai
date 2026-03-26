// ─── Game Shell — Main TTRPG interface (Preact + HTM, no build step) ─────────
import { h, render } from 'preact';
import { html, Component } from 'htm/preact';
import { signal, computed, effect } from 'preact/signals';
import { DiceRoller, rollResults } from './dice-roller.js';
import { CombatTracker } from './combat-tracker.js';
import { CharacterSheet } from './character-sheet.js';
import { MapCanvas } from './map-canvas.js';
import { NpcPanel } from './npc-panel.js';
import { SceneManager } from './scene-manager.js';

// ─── Global Signals ─────────────────────────────────────────────────────────
const sessionPhase = signal('SETUP');
const sessionTitle = signal('DMlog.ai');
const actions = signal([]);
const sidebarTab = signal('character');
const combatState = signal(null);
const characterData = signal(null);
const showSidebar = signal(false);
const sessionTimer = signal(0);
const ambientSound = signal(false);
const connectedPlayers = signal([{ name: 'You', status: 'online' }]);
const showSettings = signal(false);
const phaseTransition = signal(null);

const PHASES = ['SETUP', 'INTRODUCTION', 'EXPLORATION', 'COMBAT', 'ROLEPLAY', 'CLIMAX', 'RESOLUTION', 'WRAP_UP'];
const PHASE_COLORS = {
  SETUP: '#9966cc', INTRODUCTION: '#0f52ba', EXPLORATION: '#50c878',
  COMBAT: '#dc143c', ROLEPLAY: '#e0115f', CLIMAX: '#ffa500',
  RESOLUTION: '#4a9eff', WRAP_UP: '#888',
};
const PHASE_ICONS = {
  SETUP: '⚙️', INTRODUCTION: '📜', EXPLORATION: '🗺️',
  COMBAT: '⚔️', ROLEPLAY: '💬', CLIMAX: '🔥',
  RESOLUTION: '🌅', WRAP_UP: '📋',
};
const SIDEBAR_TABS = ['character', 'npcs', 'combat', 'notes', 'map'];

// Session timer
let timerInterval = null;
function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => { sessionTimer.value++; }, 1000);
}

// Phase transition effect
effect(() => {
  if (phaseTransition.value) {
    setTimeout(() => { phaseTransition.value = null; }, 800);
  }
});

// Auto-scroll
function scrollToBottom() {
  requestAnimationFrame(() => {
    const el = document.getElementById('action-stream');
    if (el) el.scrollTop = el.scrollHeight;
  });
}

// ─── GameShell Component ────────────────────────────────────────────────────
class GameShell extends Component {
  constructor() {
    super();
    this.state = { dragOver: null };
    this.handleInput = this.handleInput.bind(this);
    this.handleAction = this.handleAction.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
    this.setPhase = this.setPhase.bind(this);
    this.quickRoll = this.quickRoll.bind(this);
    this.exportState = this.exportState.bind(this);
    startTimer();
  }

  componentDidMount() {
    // Ctrl+B toggle sidebar
    this._keyHandler = (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this._keyHandler);
    if (timerInterval) clearInterval(timerInterval);
  }

  setPhase(phase) {
    phaseTransition.value = phase;
    sessionPhase.value = phase;
    // sound placeholder: playSound(`phase-${phase.toLowerCase()}.mp3`);
  }

  toggleSidebar() {
    showSidebar.value = !showSidebar.value;
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
    scrollToBottom();
    this.processTurn(input.value.trim());
    input.value = '';
    // Auto-resize
    input.style.height = 'auto';
  }

  handleAction(cmd) {
    const input = this.base.querySelector('.game-input-form textarea');
    if (input) { input.value = cmd + ' '; input.focus(); }
  }

  quickRoll(sides) {
    const notation = `1d${sides}`;
    const rolls = [Math.floor(Math.random() * sides) + 1];
    const total = rolls[0];
    const critical = sides === 20 && rolls[0] === 20 ? 'success' : sides === 20 && rolls[0] === 1 ? 'failure' : null;
    rollResults.value = [...rollResults.value.slice(-9), {
      rolls, total, modifier: 0, sides, count: 1, notation,
      critical, timestamp: Date.now(), reason: 'Quick roll',
    }];
    actions.value = [...actions.value, {
      type: 'dice_roll',
      payload: { notation, rolls, modifier: 0, total, critical, reason: 'Quick roll' },
      meta: { id: `dice-${Date.now()}`, priority: 8 },
    }];
    scrollToBottom();
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
      if (data.state?.phase) this.setPhase(data.state.phase);
      if (data.state?.combat) combatState.value = data.state.combat;
      scrollToBottom();
    } catch (err) {
      console.error('Turn error:', err);
    }
  }

  exportState() {
    const data = { actions: actions.value, phase: sessionPhase.value, combat: combatState.value };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dmlog-session-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }

  render() {
    const timer = this.formatTime(sessionTimer.value);
    return html`
      <div class="game-shell ${phaseTransition.value ? 'phase-transitioning' : ''}">
        ${phaseTransition.value && html`
          <div class="phase-transition-overlay">
            <div class="phase-transition-text">${PHASE_ICONS[phaseTransition.value] || ''} ${phaseTransition.value}</div>
          </div>
        `}

        <!-- Top Bar -->
        <header class="game-topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle" onClick=${this.toggleSidebar} title="Toggle sidebar (Ctrl+B)">☰</button>
            <h1 class="session-title">${sessionTitle.value}</h1>
            <span class="phase-badge" style="background:${PHASE_COLORS[sessionPhase.value]}">
              ${PHASE_ICONS[sessionPhase.value] || ''} ${sessionPhase.value}
            </span>
          </div>
          <div class="topbar-right">
            <div class="connected-players" title="Connected players">
              ${connectedPlayers.value.map(p => html`
                <span class="player-dot ${p.status}" title=${p.name}></span>
              `)}
            </div>
            <span class="session-timer" title="Session duration">⏱ ${timer}</span>
            <button class="ambient-toggle ${ambientSound.value ? 'active' : ''}" onClick=${() => ambientSound.value = !ambientSound.value}
                    title="Toggle ambient sound">🔊</button>
            <button class="settings-btn" onClick=${() => showSettings.value = !showSettings.value} title="Settings">⚙️</button>
          </div>
        </header>

        ${showSettings.value && html`
          <div class="settings-overlay" onClick=${() => showSettings.value = false}>
            <div class="settings-panel" onClick=${e => e.stopPropagation()}>
              <h3>Settings</h3>
              <div class="settings-section">
                <h4>Phase</h4>
                <div class="phase-selector">
                  ${PHASES.map(p => html`
                    <button class=${sessionPhase.value === p ? 'active' : ''}
                            onClick=${() => this.setPhase(p)}
                            style="--phase-color:${PHASE_COLORS[p]}">
                      ${PHASE_ICONS[p]} ${p}
                    </button>
                  `)}
                </div>
              </div>
              <div class="settings-section">
                <h4>Session</h4>
                <button onClick=${() => { sessionTimer.value = 0; }}>Reset Timer</button>
                <button onClick=${this.exportState}>Export Session (JSON)</button>
              </div>
              <button class="settings-close" onClick=${() => showSettings.value = false}>✕</button>
            </div>
          </div>
        `}

        <!-- Body -->
        <div class="game-body">
          ${showSidebar.value && html`
            <aside class="game-sidebar">
              <nav class="sidebar-tabs">
                ${SIDEBAR_TABS.map(t => html`
                  <button class=${sidebarTab.value === t ? 'active' : ''} onClick=${() => sidebarTab.value = t}>
                    ${{ character: '🗡️', npcs: '👥', combat: '⚔️', notes: '📝', map: '🗺️' }[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                `)}
              </nav>
              <div class="sidebar-content">
                ${sidebarTab.value === 'character' && html`<${CharacterSheet} data=${characterData.value} />`}
                ${sidebarTab.value === 'npcs' && html`<${NpcPanel} />`}
                ${sidebarTab.value === 'combat' && html`<${CombatTracker} combat=${combatState.value} />`}
                ${sidebarTab.value === 'notes' && html`<${NotesPanel} />`}
                ${sidebarTab.value === 'map' && html`<${MapCanvas} />`}
              </div>
            </aside>
          `}

          <main class="game-main">
            <div class="action-stream" id="action-stream">
              ${actions.value.length === 0 && html`
                <div class="empty-stream">
                  <div class="empty-icon">🐉</div>
                  <h2>Welcome to DMlog.ai</h2>
                  <p>Your adventure awaits. Type a command or describe what you'd like to do.</p>
                  <div class="quick-starts">
                    <button onClick=${() => this.handleAction('/describe A tavern full of shadowy figures')}>Start a Scene</button>
                    <button onClick=${() => this.handleAction('/npc Generate a mysterious innkeeper')}>Create an NPC</button>
                    <button onClick=${() => this.handleAction('/combat start')}>Begin Combat</button>
                  </div>
                </div>
              `}
              ${actions.value.map(a => html`<${ActionRenderer} action=${a} />`)}
            </div>
          </main>
        </div>

        <!-- Bottom Bar -->
        <footer class="game-bottombar">
          <div class="quick-dice-bar">
            ${[{ s: 4, l: 'd4' }, { s: 6, l: 'd6' }, { s: 8, l: 'd8' }, { s: 10, l: 'd10' }, { s: 12, l: 'd12' }, { s: 20, l: 'd20' }].map(d => html`
              <button class="quick-dice-btn d${d.s}" onClick=${() => this.quickRoll(d.s)} title=${`Roll ${d.l}`}>${d.l}</button>
            `)}
          </div>
          <div class="action-buttons">
            <button onClick=${() => this.handleAction('/roll')}>🎲 Roll</button>
            <button onClick=${() => this.handleAction('/attack')}>⚔️ Attack</button>
            <button onClick=${() => this.handleAction('/describe')}>👁️ Describe</button>
            <button onClick=${() => this.handleAction('/scene')}>🎬 Scene</button>
            <button onClick=${() => this.handleAction('/rest')}>🏕️ Rest</button>
            <button onClick=${() => this.handleAction('/npc')}>👤 NPC</button>
          </div>
          <form class="game-input-form" onSubmit=${this.handleInput}>
            <textarea placeholder="What do you do?" rows="1" onInput=${(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
            <button type="submit" class="send-btn" title="Send">▶</button>
          </form>
        </footer>
      </div>
    `;
  }
}

// ─── Notes Panel (simple) ───────────────────────────────────────────────────
function NotesPanel() {
  return html`
    <div class="notes-panel">
      <h3>📝 Session Notes</h3>
      <textarea class="dm-notes" placeholder="DM notes, plot hooks, reminders..."></textarea>
      <div class="notes-section">
        <h4>Quick Notes</h4>
        <div class="note-tags">
          ${['Plot Hook', 'Foreshadow', 'Rule Ruling', 'Loot to Remember'].map(tag => html`
            <button class="note-tag-btn" onClick=${() => {}}>${tag}</button>
          `)}
        </div>
      </div>
    </div>
  `;
}

// ─── Action Renderer ────────────────────────────────────────────────────────
class ActionRenderer extends Component {
  shouldComponentUpdate({ action }) {
    return action.meta?.id !== this.props.action?.meta?.id;
  }

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
        return html`<div class="action-dice-roll ${payload.critical ? 'crit-' + payload.critical : ''}">
          <span class="dice-notation">${payload.notation}</span>
          <span class="dice-rolls">[${payload.rolls.join(', ')}]${payload.modifier ? ` ${payload.modifier >= 0 ? '+' : ''}${payload.modifier}` : ''}</span>
          <span class="dice-total ${payload.critical === 'success' ? 'nat20' : payload.critical === 'failure' ? 'nat1' : ''}">${payload.total}</span>
          ${payload.critical === 'success' && html`<span class="crit-banner nat20-banner">🎉 NATURAL 20!</span>`}
          ${payload.critical === 'failure' && html`<span class="crit-banner nat1-banner">💀 CRITICAL FAIL!</span>`}
          ${payload.reason && html`<span class="dice-reason">${payload.reason}</span>`}
          ${payload.difficulty_class != null && html`<span class="dice-dc ${payload.success ? 'success' : 'fail'}">DC ${payload.difficulty_class} — ${payload.success ? 'Success!' : 'Failure!'}</span>`}
        </div>`;
      case 'scene_transition':
        return html`<div class="action-scene-transition">
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
      case 'damage':
        return html`<div class="action-damage ${payload.healing ? 'healing' : ''}">
          <span>${payload.target}: </span>
          <span class="damage-number ${payload.healing ? 'heal' : 'hurt'}">${payload.healing ? '+' : '-'}${payload.amount}</span>
          <span class="damage-type">${payload.type || ''}</span>
        </div>`;
      default:
        return html`<div class="action-unknown">[${type}]</div>`;
    }
  }
}

// ─── Markdown Helper ────────────────────────────────────────────────────────
function markdownToHtml(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export { GameShell, ActionRenderer };
export function initGameShell(container, sessionId) {
  window.__gameSessionId = sessionId;
  render(html`<${GameShell} />`, container);
  return { actions, sessionPhase, combatState, characterData };
}
