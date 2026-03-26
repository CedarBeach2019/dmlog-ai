// ─── Combat Tracker Component (Preact + HTM) ────────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';
import { signal } from 'preact/signals';

const CONDITION_ICONS = {
  poisoned: '☠️', stunned: '💫', paralyzed: '⚡', charmed: '💜',
  frightened: '😱', blinded: '🕶️', deafened: '🔇', grappled: '🤼',
  prone: '⬇️', restrained: '⛓️', unconscious: '💤', concentrating: '🔮',
  enraged: '😡', blessed: '✨', shielded: '🛡️', flying: '🕊️',
  invisible: '👁️‍🗨️', burning: '🔥', bleeding: '🩸', confused: '😵',
};

const CONDITIONS = Object.keys(CONDITION_ICONS);

const combatState = signal(null);
const showStatBlock = signal(null);

// ─── XP Thresholds (per character per difficulty) ───────────────────────────
const XP_THRESHOLDS = {
  easy: [25, 50, 75, 100, 150, 200, 250, 400, 500, 600],
  medium: [50, 100, 150, 200, 400, 500, 600, 800, 1000, 1200],
  hard: [75, 150, 225, 350, 500, 750, 1100, 1400, 2100, 2400],
  deadly: [100, 200, 400, 500, 1100, 1400, 1700, 2100, 3200, 3900],
};

class CombatTracker extends Component {
  constructor(props) {
    super(props);
    this.state = { damageMode: null, damageValue: '', selected: null, victory: null, showEncounterXP: false };
  }

  get combat() { return this.props.combat || combatState.value; }

  advanceTurn() {
    if (!this.combat?.active) return;
    const data = this.combat;
    const next = (data.currentTurnIndex + 1) % data.initiative.length;
    const newRound = next === 0 ? data.rounds + 1 : data.rounds;

    // Check victory/defeat
    const enemiesDown = data.initiative.filter(p => !p.isPlayer && p.hp <= 0).length;
    const totalEnemies = data.initiative.filter(p => !p.isPlayer).length;
    if (enemiesDown === totalEnemies && totalEnemies > 0) {
      this.setState({ victory: 'victory' });
    }

    const playersDown = data.initiative.filter(p => p.isPlayer && p.hp <= 0).length;
    const totalPlayers = data.initiative.filter(p => p.isPlayer).length;
    if (playersDown === totalPlayers && totalPlayers > 0) {
      this.setState({ victory: 'defeat' });
    }

    combatState.value = { ...data, currentTurnIndex: next, rounds: newRound };
    this.sendAction('next_turn');
  }

  endCombat(outcome = 'ended') {
    combatState.value = { ...this.combat, active: false, outcome };
    this.sendAction('end');
  }

  sendAction(action, data = {}) {
    fetch(`/v1/game/session/${window.__gameSessionId}/combat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    }).catch(console.error);
  }

  applyDamage(id, amount) {
    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) return;
    const updated = this.combat.initiative.map(p =>
      p.id === id ? { ...p, hp: Math.max(0, p.hp - amount) } : p
    );
    combatState.value = { ...this.combat, initiative: updated };
    this.setState({ damageMode: null, damageValue: '' });
  }

  applyHealing(id, amount) {
    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) return;
    const updated = this.combat.initiative.map(p =>
      p.id === id ? { ...p, hp: Math.min(p.maxHp, p.hp + amount) } : p
    );
    combatState.value = { ...this.combat, initiative: updated };
    this.setState({ damageMode: null, damageValue: '' });
  }

  toggleCondition(id, cond) {
    const updated = this.combat.initiative.map(p => {
      if (p.id !== id) return p;
      const conditions = p.conditions.includes(cond)
        ? p.conditions.filter(c => c !== cond)
        : [...p.conditions, cond];
      return { ...p, conditions };
    });
    combatState.value = { ...this.combat, initiative: updated };
  }

  reorderInitiative(fromIdx, toIdx) {
    const list = [...this.combat.initiative];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    // Adjust current turn index
    let currentTurn = this.combat.currentTurnIndex;
    if (fromIdx < currentTurn && toIdx >= currentTurn) currentTurn--;
    else if (fromIdx > currentTurn && toIdx <= currentTurn) currentTurn++;
    if (fromIdx === currentTurn) currentTurn = toIdx;
    combatState.value = { ...this.combat, initiative: list, currentTurnIndex: currentTurn };
  }

  calculateXP() {
    const enemies = this.combat.initiative.filter(p => !p.isPlayer);
    const partySize = Math.max(1, this.combat.initiative.filter(p => p.isPlayer).length);
    const avgLevel = this.combat.initiative.filter(p => p.isPlayer).reduce((sum, p) => sum + (p.level || 1), 0) / partySize;
    const levelIdx = Math.min(Math.floor(avgLevel) - 1, 9);

    const totalXP = enemies.reduce((sum, e) => sum + (e.cr ? this.crToXP(e.cr) : 0), 0);
    const adjustedXP = totalXP * (partySize === 1 ? 1.5 : partySize === 2 ? 1 : partySize <= 3 ? 0.75 : partySize <= 5 ? 0.5 : partySize <= 6 ? 0.4 : 0.25);
    let difficulty = 'trivial';
    if (adjustedXP >= XP_THRESHOLDS.deadly[levelIdx]) difficulty = 'deadly';
    else if (adjustedXP >= XP_THRESHOLDS.hard[levelIdx]) difficulty = 'hard';
    else if (adjustedXP >= XP_THRESHOLDS.medium[levelIdx]) difficulty = 'medium';
    else if (adjustedXP >= XP_THRESHOLDS.easy[levelIdx]) difficulty = 'easy';

    return { totalXP, adjustedXP, difficulty, partySize, avgLevel: Math.round(avgLevel) };
  }

  crToXP(cr) {
    const crs = { '0': 10, '0.125': 25, '0.25': 50, '0.5': 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900 };
    return crs[cr] || crs[1] * cr || 200;
  }

  hpPercent(hp, max) { return max ? Math.max(0, Math.min(100, (hp / max) * 100)) : 100; }

  hpColor(pct) {
    if (pct > 60) return '#50c878';
    if (pct > 30) return '#ffa500';
    return '#dc143c';
  }

  render() {
    const combat = this.combat;

    if (this.state.victory) {
      return html`<div class=${`combat-tracker ${this.state.victory === 'victory' ? 'victory-screen' : 'defeat-screen'}`}>
        <div class="victory-content">
          <div class="victory-icon">${this.state.victory === 'victory' ? '🏆' : '💀'}</div>
          <h2>${this.state.victory === 'victory' ? 'Victory!' : 'Defeat...'}</h2>
          ${this.state.victory === 'victory' && html`
            <div class="xp-reward">
              <h4>Experience Earned</h4>
              <p class="xp-amount">${this.calculateXP().totalXP} XP (total) / ~${Math.round(this.calculateXP().totalXP / this.calculateXP().partySize)} XP each</p>
            </div>
          `}
          <div class="victory-actions">
            <button onClick=${() => this.setState({ victory: null })}>Continue</button>
            <button onClick=${() => this.endCombat(this.state.victory)}>End Combat</button>
          </div>
        </div>
      </div>`;
    }

    if (!combat || !combat.active) {
      return html`<div class="combat-tracker empty">
        <p class="empty-state">⚔️ No active combat</p>
        <p class="hint">Use /combat start to begin an encounter</p>
      </div>`;
    }

    const xp = this.calculateXP();
    return html`
      <div class="combat-tracker">
        <div class="combat-header">
          <div class="combat-header-left">
            <span class="round-counter">Round ${combat.rounds}</span>
            <span class="combat-difficulty ${xp.difficulty}">${xp.difficulty}</span>
          </div>
          <div class="combat-header-right">
            <button class="xp-calc-btn" onClick=${() => this.setState(s => ({ showEncounterXP: !s.showEncounterXP }))}>
              💎 ${xp.totalXP} XP
            </button>
            <button class="next-turn-btn" onClick=${() => this.advanceTurn()}>Next Turn ▶</button>
            <button class="end-combat-btn danger" onClick=${() => this.endCombat('fled')}>End</button>
          </div>
        </div>

        ${this.state.showEncounterXP && html`
          <div class="xp-calculator">
            <div class="xp-row"><span>Total XP:</span><strong>${xp.totalXP}</strong></div>
            <div class="xp-row"><span>Adjusted (x${xp.partySize} party):</span><strong>${xp.adjustedXP}</strong></div>
            <div class="xp-row"><span>Difficulty:</span><strong class=${xp.difficulty}>${xp.difficulty}</strong></div>
            <div class="xp-row"><span>Per character:</span><strong>~${Math.round(xp.totalXP / xp.partySize)}</strong></div>
          </div>
        `}

        <ul class="initiative-list">
          ${combat.initiative.map((p, i) => html`
            <li class=${`initiative-entry ${i === combat.currentTurnIndex ? 'current-turn' : ''} ${p.isPlayer ? 'player' : 'enemy'} ${p.hp <= 0 ? 'dead' : ''}`}
                onClick=${() => this.setState(s => ({ selected: s.selected === p.id ? null : p.id }))}>
              <div class="init-reorder">
                ${i > 0 && html`<button class="reorder-btn" onClick=${(e) => { e.stopPropagation(); this.reorderInitiative(i, i - 1); }}>▲</button>`}
                ${i < combat.initiative.length - 1 && html`<button class="reorder-btn" onClick=${(e) => { e.stopPropagation(); this.reorderInitiative(i, i + 1); }}>▼</button>`}
              </div>
              <div class="init-main">
                <div class="init-name-row">
                  <span class="turn-marker">${i === combat.currentTurnIndex ? '▶' : ''}</span>
                  <span class="init-name ${p.hp <= 0 ? 'dead-name' : ''}">${p.name}</span>
                  <span class="init-score">+${p.initiative}</span>
                  ${p.isPlayer ? '' : html`<span class="cr-badge">CR ${p.cr || '?'}</span>`}
                </div>
                <div class="hp-bar-container">
                  <div class="hp-bar" style=${{ width: `${this.hpPercent(p.hp, p.maxHp)}%`, background: this.hpColor(this.hpPercent(p.hp, p.maxHp)) }}></div>
                  <span class="hp-text">${p.hp}/${p.maxHp}${p.tempHp > 0 ? ` (+${p.tempHp})` : ''}</span>
                </div>
                <div class="conditions-row">
                  ${p.conditions.map(c => html`
                    <span class="condition-badge" title=${c} onClick=${(e) => { e.stopPropagation(); this.toggleCondition(p.id, c); }}>
                      ${CONDITION_ICONS[c] || '❓'} ${c}
                    </span>
                  `)}
                  <button class="add-condition-btn" onClick=${(e) => { e.stopPropagation(); this.setState({ addingConditionTo: p.id }); }} title="Add condition">+</button>
                </div>
                ${this.state.addingConditionTo === p.id && html`
                  <div class="condition-picker">
                    ${CONDITIONS.filter(c => !p.conditions.includes(c)).map(c => html`
                      <button class="condition-option" onClick=${(e) => { e.stopPropagation(); this.toggleCondition(p.id, c); this.setState({ addingConditionTo: null }); }}>
                        ${CONDITION_ICONS[c]} ${c}
                      </button>
                    `)}
                  </div>
                `}
              </div>
              <div class="init-actions">
                <button class="damage-btn" onClick=${(e) => { e.stopPropagation(); this.setState({ damageMode: 'damage', damageValue: '', damageTarget: p.id }); }}>⚔️</button>
                <button class="heal-btn" onClick=${(e) => { e.stopPropagation(); this.setState({ damageMode: 'heal', damageValue: '', damageTarget: p.id }); }}>💚</button>
              </div>

              ${this.state.selected === p.id && html`
                <div class="combatant-detail">
                  <div class="detail-row"><span>AC:</span> <strong>${p.ac}</strong></div>
                  <div class="detail-row"><span>HP:</span> <strong>${p.hp}/${p.maxHp}</strong></div>
                  <div class="detail-row"><span>Speed:</span> <strong>${p.speed || 30} ft</strong></div>
                  ${p.str != null && html`<div class="detail-row"><span>STR:</span> <strong>${p.str}</strong> DEX: <strong>${p.dex}</strong> CON: <strong>${p.con}</strong></div>`}
                  ${p.deathSaves != null && html`
                    <div class="death-saves">
                      <span>Death Saves:</span>
                      <div class="death-save-row">
                        <span class="death-save-label">Successes:</span>
                        ${[0,1,2].map(i => html`<span class=${`death-save-check success ${i < (p.deathSaves.successes || 0) ? 'filled' : ''}`}>✓</span>`)}
                      </div>
                      <div class="death-save-row">
                        <span class="death-save-label">Failures:</span>
                        ${[0,1,2].map(i => html`<span class=${`death-save-check failure ${i < (p.deathSaves.failures || 0) ? 'filled' : ''}`}>✗</span>`)}
                      </div>
                    </div>
                  `}
                </div>
              `}
            </li>
          `)}
        </ul>

        <!-- Damage/Heal Modal -->
        ${this.state.damageMode && html`
          <div class="damage-modal" onClick=${() => this.setState({ damageMode: null })}>
            <div class="damage-modal-content" onClick=${e => e.stopPropagation()}>
              <h4>${this.state.damageMode === 'damage' ? '⚔️ Apply Damage' : '💚 Apply Healing'}</h4>
              <input type="number" min="1" placeholder="Amount" autofocus
                value=${this.state.damageValue}
                onInput=${e => this.setState({ damageValue: e.target.value })}
                onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); this.state.damageMode === 'damage' ? this.applyDamage(this.state.damageTarget, this.state.damageValue) : this.applyHealing(this.state.damageTarget, this.state.damageValue); } }} />
              <div class="damage-quick-btns">
                ${[1, 5, 10, 15, 20, 25, 50].map(n => html`
                  <button onClick=${() => this.state.damageMode === 'damage' ? this.applyDamage(this.state.damageTarget, n) : this.applyHealing(this.state.damageTarget, n)}>${n}</button>
                `)}
              </div>
            </div>
          </div>
        `}

        <!-- Stat Block Quick View -->
        ${this.state.showStatBlock && html`
          <div class="stat-block-overlay" onClick=${() => this.setState({ showStatBlock: null })}>
            <div class="stat-block" onClick=${e => e.stopPropagation()}>
              <div class="stat-block-header">
                <h3>${this.state.showStatBlock.name}</h3>
                <span class="stat-block-type">${this.state.showStatBlock.type || ''} ${this.state.showStatBlock.alignment || ''}</span>
              </div>
              <div class="stat-block-stats">
                <span>AC ${this.state.showStatBlock.ac}</span>
                <span>HP ${this.state.showStatBlock.hp}</span>
                <span>Speed ${this.state.showStatBlock.speed || 30} ft</span>
              </div>
              ${(this.state.showStatBlock.abilities || this.state.showStatBlock.str != null) && html`
                <div class="stat-block-abilities">
                  ${['str','dex','con','int','wis','cha'].map(a => {
                    const v = this.state.showStatBlock[a] || this.state.showStatBlock.abilities?.[a] || 10;
                    return html`<span>${a.toUpperCase()} ${v} (${Math.floor((v - 10) / 2) >= 0 ? '+' : ''}${Math.floor((v - 10) / 2)})</span>`;
                  })}
                </div>
              `}
              <button class="stat-block-close" onClick=${() => this.setState({ showStatBlock: null })}>✕</button>
            </div>
          </div>
        `}
      </div>
    `;
  }
}

export { CombatTracker, combatState, CONDITION_ICONS };
