// ─── Character Sheet Component (Preact + HTM) ───────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';

const ABILITY_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

const SKILL_LIST = [
  { key: 'acrobatics', ability: 'dex' }, { key: 'animal_handling', ability: 'wis' },
  { key: 'arcana', ability: 'int' }, { key: 'athletics', ability: 'str' },
  { key: 'deception', ability: 'cha' }, { key: 'history', ability: 'int' },
  { key: 'insight', ability: 'wis' }, { key: 'intimidation', ability: 'cha' },
  { key: 'investigation', ability: 'int' }, { key: 'medicine', ability: 'wis' },
  { key: 'nature', ability: 'int' }, { key: 'perception', ability: 'wis' },
  { key: 'performance', ability: 'cha' }, { key: 'persuasion', ability: 'cha' },
  { key: 'religion', ability: 'int' }, { key: 'sleight_of_hand', ability: 'dex' },
  { key: 'stealth', ability: 'dex' }, { key: 'survival', ability: 'wis' },
];

class CharacterSheet extends Component {
  constructor(props) {
    super(props);
    this.state.tab = 'stats';
  }

  render() {
    const { data } = this.props;
    if (!data) {
      return html`<div class="character-sheet empty">
        <p class="empty-state">No character loaded</p>
        <p class="hint">Create a character to get started</p>
      </div>`;
    }

    const tabs = ['Stats', 'Equipment', 'Spells', 'Features', 'Notes'];

    return html`
      <div class="character-sheet">
        <div class="char-header">
          <h3 class="char-name">${data.name}</h3>
          <span class="char-subtitle">${data.race} ${data.className} ${data.level}</span>
        </div>

        <div class="char-quick-stats">
          <div class="quick-stat">
            <span class="stat-label">HP</span>
            <span class="stat-value">${data.hp}<small>/${data.maxHp}</small></span>
          </div>
          <div class="quick-stat">
            <span class="stat-label">AC</span>
            <span class="stat-value">${data.ac}</span>
          </div>
          <div class="quick-stat">
            <span class="stat-label">Speed</span>
            <span class="stat-value">${data.speed}ft</span>
          </div>
          <div class="quick-stat">
            <span class="stat-label">Prof</span>
            <span class="stat-value">+${Math.ceil(data.level / 4) + 1}</span>
          </div>
        </div>

        <div class="sheet-tabs">
          ${tabs.map(t => html`
            <button class=${this.state.tab === t.toLowerCase() ? 'active' : ''}
                    onClick=${() => this.setState({ tab: t.toLowerCase() })}>${t}</button>
          `)}
        </div>

        <div class="sheet-content">
          ${this.state.tab === 'stats' && this.renderStats(data)}
          ${this.state.tab === 'equipment' && this.renderEquipment(data)}
          ${this.state.tab === 'spells' && this.renderSpells(data)}
          ${this.state.tab === 'features' && this.renderFeatures(data)}
          ${this.state.tab === 'notes' && this.renderNotes(data)}
        </div>
      </div>
    `;
  }

  renderStats(data) {
    const profBonus = Math.ceil(data.level / 4) + 1;
    return html`
      <div class="ability-scores">
        ${ABILITY_ORDER.map(a => {
          const s = data.abilityScores?.[a] || { score: 10, modifier: 0 };
          return html`
            <div class="ability-score">
              <span class="ability-name">${ABILITY_NAMES[a]}</span>
              <span class="ability-mod ${s.modifier >= 0 ? 'positive' : 'negative'}">${s.modifier >= 0 ? '+' : ''}${s.modifier}</span>
              <span class="ability-score-val">${s.score}</span>
            </div>
          `;
        })}
      </div>
      <div class="skills-list">
        <h4>Skills</h4>
        ${SKILL_LIST.map(sk => {
          const skillData = data.skills?.[sk.key];
          const abMod = data.abilityScores?.[sk.ability]?.modifier || 0;
          const bonus = skillData?.prof ? (skillData.expertise ? profBonus * 2 : profBonus) : 0;
          const total = abMod + bonus + (skillData?.bonus || 0);
          return html`
            <div class="skill-row ${skillData?.prof ? 'proficient' : ''}">
              <span class="skill-prof">${skillData?.prof ? (skillData.expertise ? '●●' : '●') : '○'}</span>
              <span class="skill-name">${sk.key.replace('_', ' ')}</span>
              <span class="skill-bonus">${total >= 0 ? '+' : ''}${total}</span>
            </div>
          `;
        })}
      </div>
      ${data.conditions?.length > 0 && html`
        <div class="conditions-section">
          <h4>Conditions</h4>
          <div class="condition-tags">${data.conditions.map(c => html`<span class="condition-tag">${c}</span>`)}</div>
        </div>
      `}
    `;
  }

  renderEquipment(data) {
    const items = data.inventory || [];
    const totalWeight = items.reduce((sum, i) => sum + ((i.weight || 0) * i.qty), 0);
    return html`
      <div class="equipment-list">
        ${items.length === 0 ? html`<p class="empty-hint">No items yet</p>` :
          items.map(item => html`
            <div class="equip-item">
              <span class="equip-name">${item.name}</span>
              <span class="equip-qty">x${item.qty}</span>
              ${item.weight != null && html`<span class="equip-weight">${(item.weight * item.qty).toFixed(1)} lb</span>`}
            </div>
          `)
        }
      </div>
      <div class="carry-weight">Total: ${totalWeight.toFixed(1)} lb</div>
    `;
  }

  renderSpells(data) {
    const slots = data.spellSlots || {};
    const known = data.spellsKnown || [];
    return html`
      <div class="spell-section">
        ${Object.keys(slots).length > 0 && html`
          <h4>Spell Slots</h4>
          <div class="spell-slots">
            ${Object.entries(slots).map(([level, max]) => html`
              <div class="slot-row">
                <span>Level ${level}</span>
                <span>${max} slots</span>
              </div>
            `)}
          </div>
        `}
        <h4>Spells Known</h4>
        <ul class="spell-list">
          ${known.map(s => html`<li>${s}</li>`)}
          ${known.length === 0 && html`<li class="empty-hint">No spells known</li>`}
        </ul>
      </div>
    `;
  }

  renderFeatures(data) {
    const features = data.features || [];
    return html`
      <ul class="features-list">
        ${features.map(f => html`
          <li class="feature-item">
            <strong>${f.name}</strong>
            ${f.source && html` <small class="feature-source">(${f.source})</small>`}
            ${f.description && html`<p class="feature-desc">${f.description}</p>`}
          </li>
        `)}
        ${features.length === 0 && html`<li class="empty-hint">No features</li>`}
      </ul>
    `;
  }

  renderNotes(data) {
    return html`
      <div class="notes-section">
        <textarea class="notes-textarea" placeholder="Session notes...">${data.notes || ''}</textarea>
        ${data.backstory && html`
          <details class="backstory">
            <summary>Backstory</summary>
            <p>${data.backstory}</p>
          </details>
        `}
      </div>
    `;
  }
}

export { CharacterSheet };
