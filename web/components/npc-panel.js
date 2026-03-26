// ─── NPC Panel Component (Preact + HTM) ────────────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';
import { signal } from 'preact/signals';

const npcList = signal([
  { id: 1, name: 'Mira "Soot" Vaskar', race: 'Tiefling', class: 'Blacksmith', location: 'Slag Quarter', disposition: 'Friendly', relationship: 'Mentor', personality: 'Gruff but kind', secret: 'Forging replicas of a legendary warhammer' },
  { id: 2, name: 'Captain Valerius', race: 'Human', class: 'Guard Captain', location: 'City Gates', disposition: 'Neutral', relationship: 'Authority', personality: 'Strict, by-the-book', secret: 'Taking bribes from smugglers' },
  { id: 3, name: 'Elara Whisperleaf', race: 'Elf', class: 'Druid', location: 'Ancient Grove', disposition: 'Wary', relationship: 'Ally', personality: 'Ancient, speaks in riddles', secret: 'Guarding a sleeping forest spirit' },
]);

const selectedNpc = signal(null);
const searchQuery = signal('');

class NpcPanel extends Component {
  constructor(props) {
    super(props);
    this.state = { showCreate: false, showRelationships: false, newNpc: {} };
  }

  quickCreate() {
    const names = ['Thorn', 'Lyra', 'Grom', 'Sariel', 'Kael', 'Nyx', 'Orin', 'Vera'];
    const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome', 'Half-Orc'];
    const classes = ['Merchant', 'Guard', 'Noble', 'Priest', 'Mage', 'Rogue', 'Hunter', 'Sailor'];
    const dispositions = ['Friendly', 'Neutral', 'Wary', 'Hostile', 'Indifferent'];
    const relationships = ['Ally', 'Rival', 'Mentor', 'Patron', 'Informant', 'Quest Giver'];

    const newNpc = {
      id: Date.now(),
      name: names[Math.floor(Math.random() * names.length)] + ' ' + races[Math.floor(Math.random() * races.length)],
      race: races[Math.floor(Math.random() * races.length)],
      class: classes[Math.floor(Math.random() * classes.length)],
      location: 'Unknown',
      disposition: dispositions[Math.floor(Math.random() * dispositions.length)],
      relationship: relationships[Math.floor(Math.random() * relationships.length)],
      personality: '',
      secret: '',
      voice: '',
      questInvolvement: '',
    };

    npcList.value = [...npcList.value, newNpc];
    selectedNpc.value = newNpc;
  }

  introduceNpc(npc) {
    // Send to game stream
    const event = {
      type: 'npc_introduction',
      payload: {
        npc: npc.name,
        description: `${npc.race} ${npc.class} from ${npc.location}. ${npc.personality}`,
        disposition: npc.disposition,
      },
      meta: { id: `npc-${Date.now()}`, priority: 6 },
    };
    // Would dispatch to game actions
    console.log('Introduce NPC:', event);
  }

  render() {
    const filtered = npcList.value.filter(npc =>
      npc.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      npc.race.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      npc.location.toLowerCase().includes(searchQuery.value.toLowerCase())
    );

    const current = selectedNpc.value || filtered[0];

    return html`
      <div class="npc-panel">
        <!-- Header -->
        <div class="npc-header">
          <h3>👥 NPCs</h3>
          <div class="npc-actions">
            <button onClick=${() => this.quickCreate()} title="Quick Generate">🎲 Generate</button>
            <button onClick=${() => this.setState({ showCreate: true })} title="Create New">+ New</button>
            <button onClick=${() => this.setState(s => ({ showRelationships: !s.showRelationships }))} title="Relationship Web">🕸️</button>
          </div>
        </div>

        <!-- Search -->
        <div class="npc-search">
          <input type="text" placeholder="Search NPCs..." value=${searchQuery.value}
            onInput=${e => searchQuery.value = e.target.value} />
        </div>

        <!-- Two-column layout -->
        <div class="npc-layout">
          <!-- NPC List -->
          <div class="npc-list">
            ${filtered.map(npc => html`
              <div class=${`npc-card ${current?.id === npc.id ? 'selected' : ''}`}
                   onClick=${() => selectedNpc.value = npc}>
                <div class="npc-card-header">
                  <span class="npc-name">${npc.name}</span>
                  <span class="npc-race-class">${npc.race} ${npc.class}</span>
                </div>
                <div class="npc-card-details">
                  <span class="npc-location">📍 ${npc.location}</span>
                  <span class=${`npc-disposition ${npc.disposition.toLowerCase()}`}>${npc.disposition}</span>
                </div>
                <div class="npc-card-actions">
                  <button class="npc-intro-btn" onClick=${(e) => { e.stopPropagation(); this.introduceNpc(npc); }}>Introduce</button>
                </div>
              </div>
            `)}
            ${filtered.length === 0 && html`<p class="empty-hint">No NPCs found</p>`}
          </div>

          <!-- NPC Detail -->
          ${current && html`
            <div class="npc-detail">
              <div class="npc-detail-header">
                <h4>${current.name}</h4>
                <span class="npc-subtitle">${current.race} ${current.class}</span>
              </div>
              <div class="npc-detail-grid">
                <div class="npc-detail-row">
                  <span class="label">Location:</span>
                  <span>${current.location}</span>
                </div>
                <div class="npc-detail-row">
                  <span class="label">Disposition:</span>
                  <span class=${`disposition-badge ${current.disposition.toLowerCase()}`}>${current.disposition}</span>
                </div>
                <div class="npc-detail-row">
                  <span class="label">Relationship:</span>
                  <span>${current.relationship}</span>
                </div>
              </div>
              <div class="npc-detail-section">
                <h5>Personality</h5>
                <p class="npc-text">${current.personality || 'No personality noted.'}</p>
              </div>
              <div class="npc-detail-section">
                <h5>Secret</h5>
                <p class="npc-text secret">${current.secret || 'No secret known.'}</p>
              </div>
              <div class="npc-detail-section">
                <h5>Voice / Mannerisms</h5>
                <p class="npc-text">${current.voice || 'No voice notes.'}</p>
              </div>
              <div class="npc-detail-section">
                <h5>Quest Involvement</h5>
                <p class="npc-text">${current.questInvolvement || 'Not involved in any quests.'}</p>
              </div>
              <div class="npc-detail-actions">
                <button onClick=${() => this.introduceNpc(current)}>Introduce to Scene</button>
                <button onClick=${() => {}}>Edit</button>
                <button class="danger" onClick=${() => {
                  npcList.value = npcList.value.filter(n => n.id !== current.id);
                  selectedNpc.value = null;
                }}>Remove</button>
              </div>
            </div>
          `}
        </div>

        <!-- Relationship Web -->
        ${this.state.showRelationships && html`
          <div class="relationship-overlay" onClick=${() => this.setState({ showRelationships: false })}>
            <div class="relationship-web" onClick=${e => e.stopPropagation()}>
              <h4>Relationship Web</h4>
              <div class="relationship-nodes">
                ${npcList.value.map(npc => html`
                  <div class="relationship-node" style=${{ left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%` }}>
                    <div class="node-name">${npc.name}</div>
                    <div class="node-relation">${npc.relationship}</div>
                  </div>
                `)}
              </div>
              <button class="close-web" onClick=${() => this.setState({ showRelationships: false })}>✕</button>
            </div>
          </div>
        `}

        <!-- Create NPC Modal -->
        ${this.state.showCreate && html`
          <div class="npc-create-overlay" onClick=${() => this.setState({ showCreate: false })}>
            <div class="npc-create-modal" onClick=${e => e.stopPropagation()}>
              <h4>Create NPC</h4>
              <div class="npc-create-form">
                <input placeholder="Name" value=${this.state.newNpc.name || ''}
                  onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, name: e.target.value } }))} />
                <div class="form-row">
                  <input placeholder="Race" value=${this.state.newNpc.race || ''}
                    onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, race: e.target.value } }))} />
                  <input placeholder="Class/Occupation" value=${this.state.newNpc.class || ''}
                    onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, class: e.target.value } }))} />
                </div>
                <div class="form-row">
                  <input placeholder="Location" value=${this.state.newNpc.location || ''}
                    onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, location: e.target.value } }))} />
                  <select value=${this.state.newNpc.disposition || 'Neutral'}
                    onChange=${e => this.setState(s => ({ newNpc: { ...s.newNpc, disposition: e.target.value } }))}>
                    <option value="Friendly">Friendly</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Wary">Wary</option>
                    <option value="Hostile">Hostile</option>
                  </select>
                </div>
                <textarea placeholder="Personality traits, voice, mannerisms..."
                  value=${this.state.newNpc.personality || ''}
                  onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, personality: e.target.value } }))} />
                <textarea placeholder="Secret (DM only)"
                  value=${this.state.newNpc.secret || ''}
                  onInput=${e => this.setState(s => ({ newNpc: { ...s.newNpc, secret: e.target.value } }))} />
                <div class="modal-actions">
                  <button onClick=${() => {
                    const npc = { ...this.state.newNpc, id: Date.now() };
                    npcList.value = [...npcList.value, npc];
                    selectedNpc.value = npc;
                    this.setState({ showCreate: false, newNpc: {} });
                  }}>Create</button>
                  <button onClick=${() => this.setState({ showCreate: false, newNpc: {} })}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
}

export { NpcPanel };
