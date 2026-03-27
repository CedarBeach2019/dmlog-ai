// ─── Character Sheet Component (Preact + HTM) ───────────────────────────────
import { html, Component, signal } from '../preact-shim.js';

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

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];

// Level-up data (simplified D&D 5e)
const LEVEL_FEATURES = {
  1: { profBonus: 2 },
  2: { profBonus: 2 },
  3: { profBonus: 2 },
  4: { profBonus: 2, asi: true },
  5: { profBonus: 3 },
  6: { profBonus: 3 },
  7: { profBonus: 3 },
  8: { profBonus: 3, asi: true },
  9: { profBonus: 4 },
  10: { profBonus: 4 },
  11: { profBonus: 4 },
  12: { profBonus: 4, asi: true },
  13: { profBonus: 5 },
  14: { profBonus: 5 },
  15: { profBonus: 5 },
  16: { profBonus: 5, asi: true },
  17: { profBonus: 6 },
  18: { profBonus: 6 },
  19: { profBonus: 6, asi: true },
  20: { profBonus: 6 },
};

class CharacterSheet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'stats',
      editMode: false,
      localData: null,
      notes: '',
    };
  }

  get data() { return this.state.localData || this.props.data; }

  componentWillReceiveProps(props) {
    if (props.data && !this.state.localData) {
      this.setState({ localData: props.data, notes: props.data?.notes || '' });
    }
  }

  startEdit() {
    this.setState({ editMode: true, localData: JSON.parse(JSON.stringify(this.data || {})) });
  }

  saveEdit() {
    const d = this.state.localData;
    if (d) {
      // Recalculate modifiers from scores
      ABILITY_ORDER.forEach(a => {
        if (d.abilityScores?.[a]?.score != null) {
          d.abilityScores[a].modifier = Math.floor((d.abilityScores[a].score - 10) / 2);
        }
      });
    }
    this.setState({ editMode: false });
    // Would sync to backend
  }

  cancelEdit() {
    this.setState({ editMode: false, localData: this.props.data ? JSON.parse(JSON.stringify(this.props.data)) : null });
  }

  updateField(path, value) {
    const d = { ...this.state.localData };
    const parts = path.split('.');
    let obj = d;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    this.setState({ localData: d });
  }

  toggleSave(ability) {
    const d = { ...this.state.localData };
    if (!d.savingThrows) d.savingThrows = [];
    const idx = d.savingThrows.indexOf(ability);
    if (idx >= 0) d.savingThrows.splice(idx, 1);
    else d.savingThrows.push(ability);
    this.setState({ localData: d });
  }

  toggleSkillProf(key) {
    const d = { ...this.state.localData };
    if (!d.skills) d.skills = {};
    const sk = d.skills[key] || {};
    if (sk.prof && !sk.expertise) {
      d.skills[key] = { ...sk, expertise: true };
    } else if (sk.expertise) {
      d.skills[key] = { ...sk, expertise: false, prof: false };
    } else {
      d.skills[key] = { ...sk, prof: true };
    }
    this.setState({ localData: d });
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(this.data?.name || 'character').replace(/\s+/g, '-')}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  getProfBonus(level) { return Math.ceil((level || 1) / 4) + 1; }

  render() {
    const data = this.data;
    if (!data) {
      return html`<div class="character-sheet empty">
        <div class="empty-state">
          <div class="empty-icon">🗡️</div>
          <p>No character loaded</p>
          <p class="hint">Create a character to get started</p>
        </div>
      </div>`;
    }

    const tabs = [
      { key: 'stats', label: 'Stats', icon: '📊' },
      { key: 'features', label: 'Features', icon: '⭐' },
      { key: 'equipment', label: 'Equipment', icon: '🎒' },
      { key: 'spells', label: 'Spells', icon: '🔮' },
      { key: 'proficiencies', label: 'Prof.', icon: '🛡️' },
      { key: 'notes', label: 'Notes', icon: '📝' },
    ];

    const nextLevel = Math.min((data.level || 1) + 1, 20);
    const levelInfo = LEVEL_FEATURES[nextLevel];

    return html`
      <div class="character-sheet">
        <!-- Header -->
        <div class="cs-header">
          ${this.state.editMode ? html`
            <input class="cs-name-input" value=${data.character_name || data.name || ''} onInput=${e => this.updateField('name', e.target.value)} placeholder="Character Name" />
            <div class="cs-header-row">
              <input class="cs-small-input" value=${data.race || ''} onInput=${e => this.updateField('race', e.target.value)} placeholder="Race" />
              <input class="cs-small-input" value=${data.className || data.class || ''} onInput=${e => this.updateField('className', e.target.value)} placeholder="Class" />
              <input class="cs-tiny-input" type="number" min="1" max="20" value=${data.level || 1} onInput=${e => this.updateField('level', parseInt(e.target.value) || 1)} placeholder="Lvl" />
            </div>
            <div class="cs-header-row">
              <input class="cs-small-input" value=${data.background || ''} onInput=${e => this.updateField('background', e.target.value)} placeholder="Background" />
              <select class="cs-small-input" value=${data.alignment || 'N'} onChange=${e => this.updateField('alignment', e.target.value)}>
                ${ALIGNMENTS.map(a => html`<option value=${a}>${a}</option>`)}
              </select>
              <input class="cs-small-input" type="number" value=${data.xp || 0} onInput=${e => this.updateField('xp', parseInt(e.target.value) || 0)} placeholder="XP" />
            </div>
          ` : html`
            <h3 class="cs-name">${data.character_name || data.name}</h3>
            <div class="cs-subtitle">${data.race} ${data.className || data.class} ${data.level}</div>
            <div class="cs-meta">${data.background || ''} ${data.alignment ? `| ${data.alignment}` : ''} ${data.xp ? `| ${data.xp} XP` : ''}</div>
          `}
          <div class="cs-actions">
            <button onClick=${() => this.state.editMode ? this.saveEdit() : this.startEdit()}>
              ${this.state.editMode ? '💾 Save' : '✏️ Edit'}
            </button>
            ${this.state.editMode && html`<button onClick=${this.cancelEdit}>✕ Cancel</button>`}
            <button onClick=${this.exportJSON}>📥 Export</button>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="cs-combat-stats">
          <div class="cs-combat-stat">
            <span class="cs-stat-label">AC</span>
            <span class="cs-stat-value">${data.ac}</span>
          </div>
          <div class="cs-combat-stat">
            <span class="cs-stat-label">Initiative</span>
            <span class="cs-stat-value">+${data.abilityScores?.dex?.modifier || 0}</span>
          </div>
          <div class="cs-combat-stat">
            <span class="cs-stat-label">Speed</span>
            <span class="cs-stat-value">${data.speed || 30} ft</span>
          </div>
          <div class="cs-combat-stat hp-stat">
            <span class="cs-stat-label">HP</span>
            <div class="cs-hp-field">
              ${this.state.editMode ? html`
                <input class="cs-hp-input" type="number" value=${data.hp} onInput=${e => this.updateField('hp', parseInt(e.target.value) || 0)} />
                <span>/</span>
                <input class="cs-hp-input" type="number" value=${data.maxHp} onInput=${e => this.updateField('maxHp', parseInt(e.target.value) || 0)} />
              ` : html`
                <span class="cs-stat-value hp-current">${data.hp}</span>
                <span>/</span>
                <span class="cs-stat-value">${data.maxHp}</span>
              `}
              ${data.tempHp > 0 && html`<span class="temp-hp">+${data.tempHp}</span>`}
            </div>
          </div>
          <div class="cs-combat-stat">
            <span class="cs-stat-label">Hit Dice</span>
            <span class="cs-stat-value">${data.level || 1}d${data.hitDie || 8}</span>
          </div>
          <div class="cs-combat-stat">
            <span class="cs-stat-label">Prof</span>
            <span class="cs-stat-value">+${this.getProfBonus(data.level)}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="cs-tabs">
          ${tabs.map(t => html`
            <button class=${`cs-tab ${this.state.tab === t.key ? 'active' : ''}`}
                    onClick=${() => this.setState({ tab: t.key })}>${t.icon} ${t.label}</button>
          `)}
        </div>

        <!-- Tab Content -->
        <div class="cs-content">
          ${this.state.tab === 'stats' && this.renderStats(data)}
          ${this.state.tab === 'features' && this.renderFeatures(data)}
          ${this.state.tab === 'equipment' && this.renderEquipment(data)}
          ${this.state.tab === 'spells' && this.renderSpells(data)}
          ${this.state.tab === 'proficiencies' && this.renderProficiencies(data)}
          ${this.state.tab === 'notes' && this.renderNotes(data)}
        </div>

        <!-- Level Up Helper -->
        ${data.level < 20 && html`
          <div class="level-up-helper">
            <h4>⬆️ Level ${nextLevel} Preview</h4>
            <div class="level-up-info">
              <span>Proficiency: +${levelInfo.profBonus}</span>
              ${levelInfo.asi && html`<span>ASI/Feat available</span>`}
            </div>
          </div>
        `}
      </div>
    `;
  }

  renderStats(data) {
    const profBonus = this.getProfBonus(data.level);
    const abilities = data.abilityScores || {};
    const saves = data.savingThrows || [];

    return html`
      <div class="stats-panel">
        <!-- Ability Scores -->
        <div class="ability-scores">
          ${ABILITY_ORDER.map(a => {
            const s = abilities[a] || { score: 10, modifier: 0 };
            const mod = this.state.editMode ? Math.floor(((s.score || 10) - 10) / 2) : s.modifier;
            const isSaveProf = saves.includes(a);
            const saveBonus = mod + (isSaveProf ? profBonus : 0);
            return html`
              <div class="ability-score">
                <span class="ability-name">${ABILITY_NAMES[a]}</span>
                ${this.state.editMode ? html`
                  <input class="ability-input" type="number" min="1" max="30" value=${s.score || 10}
                    onInput=${e => {
                      const val = parseInt(e.target.value) || 10;
                      this.updateField(`abilityScores.${a}`, { score: val, modifier: Math.floor((val - 10) / 2) });
                    }} />
                ` : html`
                  <span class="ability-mod ${mod >= 0 ? 'positive' : 'negative'}">${mod >= 0 ? '+' : ''}${mod}</span>
                  <span class="ability-score-val">${s.score}</span>
                `}
                <div class=${`save-row ${isSaveProf ? 'proficient' : ''}`} onClick=${() => this.state.editMode && this.toggleSave(a)}>
                  <span class="save-label">Save</span>
                  <span class="save-bonus">${saveBonus >= 0 ? '+' : ''}${saveBonus}</span>
                </div>
              </div>
            `;
          })}
        </div>

        <!-- Skills -->
        <div class="skills-section">
          <h4>Skills</h4>
          <div class="skills-grid">
            ${SKILL_LIST.map(sk => {
              const skillData = data.skills?.[sk.key];
              const abMod = abilities[sk.ability]?.modifier || 0;
              const isProf = skillData?.prof;
              const isExpert = skillData?.expertise;
              const bonus = isProf ? (isExpert ? profBonus * 2 : profBonus) : 0;
              const total = abMod + bonus + (skillData?.bonus || 0);
              return html`
                <div class=${`skill-row ${isProf ? 'proficient' : ''} ${isExpert ? 'expertise' : ''}`}
                     onClick=${() => this.state.editMode && this.toggleSkillProf(sk.key)}>
                  <span class="skill-prof">${isExpert ? '●●' : isProf ? '●' : '○'}</span>
                  <span class="skill-name">${sk.key.replace(/_/g, ' ')}</span>
                  <span class="skill-ability">${ABILITY_NAMES[sk.ability]}</span>
                  <span class="skill-bonus">${total >= 0 ? '+' : ''}${total}</span>
                </div>
              `;
            })}
          </div>
        </div>

        ${data.conditions?.length > 0 && html`
          <div class="conditions-section">
            <h4>Active Conditions</h4>
            <div class="condition-tags">${data.conditions.map(c => html`<span class="condition-tag">${c}</span>`)}</div>
          </div>
        `}
      </div>
    `;
  }

  renderFeatures(data) {
    const features = data.features || [];
    return html`
      <div class="features-panel">
        <h4>Features & Traits</h4>
        <ul class="features-list">
          ${features.map(f => html`
            <li class="feature-item">
              <div class="feature-header">
                <strong>${f.name}</strong>
                ${f.source && html` <span class="feature-source">(${f.source}${f.level ? ` ${f.level}` : ''})</span>`}
              </div>
              ${f.description && html`<p class="feature-desc">${f.description}</p>`}
            </li>
          `)}
          ${features.length === 0 && html`<li class="empty-hint">No features yet</li>`}
        </ul>
      </div>
    `;
  }

  renderEquipment(data) {
    const items = data.inventory || data.equipment || [];
    const totalWeight = items.reduce((sum, i) => sum + (((i.weight || 0) * (i.qty || 1))), 0);
    const equippedWeight = items.filter(i => i.equipped).reduce((sum, i) => sum + (((i.weight || 0) * (i.qty || 1))), 0);

    return html`
      <div class="equipment-panel">
        <h4>Equipment</h4>
        <div class="equipment-header-row">
          <span>Item</span>
          <span>Qty</span>
          <span>Weight</span>
          <span>Value</span>
        </div>
        <div class="equipment-list">
          ${items.map((item, i) => html`
            <div class=${`equip-item ${item.equipped ? 'equipped' : ''}`}>
              <span class="equip-name" onClick=${() => this.state.editMode && this.updateField(`inventory.${i}.equipped`, !item.equipped)}>
                ${item.equipped ? '✦ ' : ''}${item.name}
              </span>
              <span class="equip-qty">${item.qty || 1}</span>
              <span class="equip-weight">${((item.weight || 0) * (item.qty || 1)).toFixed(1)} lb</span>
              <span class="equip-value">${item.value || '—'}</span>
            </div>
          `)}
          ${items.length === 0 && html`<p class="empty-hint">No items yet</p>`}
        </div>
        <div class="carry-summary">
          <span>Carried: ${totalWeight.toFixed(1)} lb</span>
          <span>Equipped: ${equippedWeight.toFixed(1)} lb</span>
          <span class="carry-capacity">Capacity: ${(data.abilityScores?.str?.score || 10) * 15} lb</span>
        </div>
      </div>
    `;
  }

  renderSpells(data) {
    const slots = data.spellSlots || {};
    const known = data.spellsKnown || [];
    const prepared = data.spellsPrepared || [];
    const spellBySchool = {};
    known.forEach(s => {
      // Parse school from spell data if available
      const school = (s.school || s.type || 'General');
      if (!spellBySchool[school]) spellBySchool[school] = [];
      spellBySchool[school].push(typeof s === 'string' ? s : s.name);
    });

    return html`
      <div class="spells-panel">
        <!-- Spell Slots -->
        ${Object.keys(slots).length > 0 && html`
          <div class="spell-slots-section">
            <h4>Spell Slots</h4>
            <div class="spell-slots-grid">
              ${Object.entries(slots).map(([level, info]) => {
                const max = typeof info === 'object' ? info.max : info;
                const used = typeof info === 'object' ? (info.used || 0) : 0;
                return html`
                  <div class="slot-group">
                    <span class="slot-level">${level}</span>
                    <div class="slot-pips">
                      ${Array.from({ length: max }).map((_, i) => html`
                        <span class=${`slot-pip ${i < used ? 'used' : ''}`}></span>
                      `)}
                    </div>
                    <span class="slot-count">${max - used}/${max}</span>
                  </div>
                `;
              })}
            </div>
          </div>
        `}

        <!-- Spells by School -->
        <div class="spells-list-section">
          <h4>Known Spells (${known.length})</h4>
          ${Object.keys(spellBySchool).length > 0 ? Object.entries(spellBySchool).map(([school, spells]) => html`
            <details class="spell-school">
              <summary>${school} (${spells.length})</summary>
              <ul class="spell-list">
                ${spells.map(s => html`
                  <li class=${`spell-item ${prepared.includes(s) ? 'prepared' : ''}`}>${s} ${prepared.includes(s) ? '✦' : ''}</li>
                `)}
              </ul>
            </details>
          `) : html`
            <ul class="spell-list">
              ${known.map(s => html`
                <li class=${`spell-item ${prepared.includes(typeof s === 'string' ? s : s.name) ? 'prepared' : ''}`}>
                  ${typeof s === 'string' ? s : s.name}
                </li>
              `)}
            </ul>
          `}
          ${known.length === 0 && html`<p class="empty-hint">No spells known</p>`}
        </div>
      </div>
    `;
  }

  renderProficiencies(data) {
    const proficiencies = data.proficiencies || [];
    const languages = data.languages || [];

    return html`
      <div class="proficiencies-panel">
        <h4>Proficiencies</h4>
        <ul class="prof-list">
          ${proficiencies.map(p => html`<li>${typeof p === 'string' ? p : p.name} ${p.type ? `(${p.type})` : ''}</li>`)}
          ${proficiencies.length === 0 && html`<li class="empty-hint">None recorded</li>`}
        </ul>
        <h4>Languages</h4>
        <div class="language-tags">
          ${languages.map(l => html`<span class="language-tag">${typeof l === 'string' ? l : l}</span>`)}
          ${languages.length === 0 && html`<span class="empty-hint">Common only</span>`}
        </div>
      </div>
    `;
  }

  renderNotes(data) {
    return html`
      <div class="notes-panel-content">
        <textarea class="cs-notes-textarea" placeholder="Session notes, reminders..."
          value=${this.state.notes}
          onInput=${e => this.setState({ notes: e.target.value })}></textarea>
        ${data.backstory && html`
          <details class="backstory-section">
            <summary>📜 Backstory</summary>
            <p class="backstory-text">${data.backstory}</p>
          </details>
        `}
      </div>
    `;
  }
}

export { CharacterSheet };
