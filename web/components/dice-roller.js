// ─── Dice Roller Component (Preact + HTM) ────────────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';
import { signal, computed } from 'preact/signals';

const DICE_TYPES = [
  { sides: 4, label: 'd4', cssClass: 'd4' },
  { sides: 6, label: 'd6', cssClass: 'd6' },
  { sides: 8, label: 'd8', cssClass: 'd8' },
  { sides: 10, label: 'd10', cssClass: 'd10' },
  { sides: 12, label: 'd12', cssClass: 'd12' },
  { sides: 20, label: 'd20', cssClass: 'd20' },
  { sides: 100, label: 'd100', cssClass: 'd100' },
];

const rollResults = signal([]);
const isRolling = signal(false);
const selectedDice = signal(20);
const diceCount = signal(1);
const modifier = signal(0);

class DiceRoller extends Component {
  roll() {
    if (isRolling.value) return;
    isRolling.value = true;
    const count = diceCount.value;
    const sides = selectedDice.value;
    const mod = modifier.value;
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0) + mod;

    setTimeout(() => {
      rollResults.value = [...rollResults.value, {
        rolls, total, modifier: mod, sides, count,
        notation: `${count}d${sides}${mod >= 0 ? (mod > 0 ? '+' : '') : ''}${mod || ''}`,
        critical: sides === 20 && count === 1 && rolls[0] === 20 ? 'success' :
                  sides === 20 && count === 1 && rolls[0] === 1 ? 'failure' : null,
        timestamp: Date.now(),
      }];
      isRolling.value = false;
    }, 600);
  }

  render() {
    return html`
      <div class="dice-roller">
        <div class="dice-selector">
          ${DICE_TYPES.map(d => html`
            <button class=${`dice-btn ${selectedDice.value === d.sides ? 'active' : ''}`}
                    onClick=${() => selectedDice.value = d.sides}>${d.label}</button>
          `)}
        </div>
        <div class="dice-controls">
          <label>Qty: <input type="number" min="1" max="20" value=${diceCount.value}
                    onInput=${e => diceCount.value = Math.max(1, parseInt(e.target.value) || 1)} /></label>
          <label>Mod: <input type="number" value=${modifier.value}
                    onInput=${e => modifier.value = parseInt(e.target.value) || 0} /></label>
          <button class="roll-btn ${isRolling.value ? 'rolling' : ''}" onClick=${() => this.roll()}>
            ${isRolling.value ? '🎲 Rolling...' : '🎲 Roll!'}
          </button>
        </div>
        ${isRolling.value && html`
          <div class="dice-animation">
            <div class="dice-face tumbler"></div>
          </div>
        `}
        <div class="roll-history">
          ${rollResults.value.slice().reverse().map((r, i) => html`
            <div class="roll-result ${r.critical ? `crit-${r.critical}` : ''}">
              <span class="roll-notation">${r.notation}</span>
              <span class="roll-values">[${r.rolls.join(', ')}]${r.modifier ? (r.modifier >= 0 ? ' +' : ' ') + r.modifier : ''}</span>
              <span class="roll-total">${r.total}</span>
              ${r.critical && html`<span class="crit-label">${r.critical === 'success' ? '🎉 NAT 20!' : '💀 NAT 1!'}</span>`}
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

export { DiceRoller, rollResults, selectedDice, diceCount, modifier };
