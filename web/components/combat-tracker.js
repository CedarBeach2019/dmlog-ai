// ─── Combat Tracker Component (Preact + HTM) ────────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';

const CONDITION_ICONS = {
  poisoned: '☠️', stunned: '💫', paralyzed: '⚡', charmed: '💜',
  frightened: '😱', blinded: '🕶️', deafened: '🔇', grappled: '🤼',
  prone: '⬇️', restrained: '⛓️', unconscious: '💤', concentrating: '🔮',
  enraged: '😡', blessed: '✨', shielded: '🛡️', flying: '🕊️',
};

class CombatTracker extends Component {
  advanceTurn() {
    if (!this.props.combat?.active) return;
    fetch(`/v1/game/session/${window.__gameSessionId}/combat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next_turn' }),
    });
  }

  endCombat() {
    fetch(`/v1/game/session/${window.__gameSessionId}/combat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
  }

  hpPercent(hp, max) {
    if (!max) return 100;
    return Math.max(0, Math.min(100, (hp / max) * 100));
  }

  hpColor(pct) {
    if (pct > 60) return '#50c878';
    if (pct > 30) return '#ffa500';
    return '#dc143c';
  }

  render() {
    const { combat } = this.props;
    if (!combat || !combat.active) {
      return html`<div class="combat-tracker empty">
        <p class="empty-state">⚔️ No active combat</p>
        <p class="hint">Use /combat start to begin an encounter</p>
      </div>`;
    }

    return html`
      <div class="combat-tracker">
        <div class="combat-header">
          <span class="round-counter">Round ${combat.rounds}</span>
          <div class="combat-actions">
            <button onClick=${() => this.advanceTurn()}>Next Turn ▶</button>
            <button class="danger" onClick=${() => this.endCombat()}>End Combat</button>
          </div>
        </div>
        <ul class="initiative-list">
          ${combat.initiative.map((p, i) => html`
            <li class=${`initiative-entry ${i === combat.currentTurnIndex ? 'current-turn' : ''} ${p.isPlayer ? 'player' : 'enemy'} ${p.hp <= 0 ? 'dead' : ''}`}
                onClick=${() => this.setState({ selected: this.state.selected === p.id ? null : p.id })}>
              <div class="init-name">
                <span class="turn-marker">${i === combat.currentTurnIndex ? '▶' : ''}</span>
                ${p.name}
              </div>
              <div class="hp-bar-container">
                <div class="hp-bar" style=${{ width: `${this.hpPercent(p.hp, p.maxHp)}%`, background: this.hpColor(this.hpPercent(p.hp, p.maxHp)) }}></div>
                <span class="hp-text">${p.hp}/${p.maxHp}</span>
              </div>
              <div class="init-score">+${p.initiative}</div>
              ${p.conditions.length > 0 && html`
                <div class="conditions">
                  ${p.conditions.map(c => html`<span class="condition" title=${c}>${CONDITION_ICONS[c] || '❓'}</span>`)}
                </div>
              `}
              ${this.state.selected === p.id && html`
                <div class="combatant-detail">
                  <div>AC: ${p.ac}</div>
                  <div>Initiative: ${p.initiative}</div>
                  <div>HP: ${p.hp}/${p.maxHp}</div>
                  ${p.conditions.length > 0 && html`<div>Conditions: ${p.conditions.join(', ')}</div>`}
                </div>
              `}
            </li>
          `)}
        </ul>
      </div>
    `;
  }
}

export { CombatTracker, CONDITION_ICONS };
