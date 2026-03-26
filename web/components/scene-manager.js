// ─── Scene Manager Component (Preact + HTM) ────────────────────────────────
import { h, Component } from 'preact';
import { html } from 'htm/preact';
import { signal } from 'preact/signals';

const scenes = signal([
  { id: 1, name: 'The Rusty Tankard', description: 'A dimly lit tavern with smoke-stained beams. The air smells of stale ale and roasted meat.', atmosphere: 'Cozy but seedy', npcs: ['Mira "Soot" Vaskar'], map: 'tavern', tags: ['tavern', 'social'] },
  { id: 2, name: 'Forgotten Crypt', description: 'Damp stone walls covered in moss. Water drips from the ceiling into shallow puddles.', atmosphere: 'Eerie, damp', npcs: [], map: 'dungeon', tags: ['dungeon', 'combat'] },
  { id: 3, name: 'Elven Grove', description: 'Ancient trees form a cathedral-like canopy. Bioluminescent fungi glow softly.', atmosphere: 'Mystical, serene', npcs: ['Elara Whisperleaf'], map: 'grass', tags: ['wilderness', 'magical'] },
]);

const currentScene = signal(scenes.value[0]);
const sceneTransition = signal(false);

const SCENE_TEMPLATES = [
  { name: 'Tavern', description: 'A bustling inn with patrons', atmosphere: 'Warm, noisy', tags: ['tavern', 'social'] },
  { name: 'Dungeon Room', description: 'A chamber in an underground complex', atmosphere: 'Dark, foreboding', tags: ['dungeon', 'combat'] },
  { name: 'Forest Clearing', description: 'A peaceful opening in the woods', atmosphere: 'Calm, natural', tags: ['wilderness', 'exploration'] },
  { name: 'City Street', description: 'A busy thoroughfare in a metropolis', atmosphere: 'Bustling, diverse', tags: ['urban', 'social'] },
  { name: 'Throne Room', description: 'A grand hall with a ruling seat', atmosphere: 'Imposing, regal', tags: ['palace', 'political'] },
];

class SceneManager extends Component {
  constructor(props) {
    super(props);
    this.state = { showCreate: false, newScene: {}, showTemplates: false, typewriterText: '', typewriterIdx: 0 };
  }

  changeScene(scene) {
    sceneTransition.value = true;
    // sound placeholder: playSound('scene-transition.mp3');
    setTimeout(() => {
      currentScene.value = scene;
      sceneTransition.value = false;
      this.startTypewriter(scene.description);
    }, 800);
  }

  startTypewriter(text) {
    this.setState({ typewriterText: '', typewriterIdx: 0 });
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= text.length) {
        clearInterval(interval);
        return;
      }
      this.setState({ typewriterText: text.slice(0, idx + 1), typewriterIdx: idx + 1 });
      idx++;
    }, 30);
  }

  createFromTemplate(template) {
    const newScene = {
      id: Date.now(),
      name: template.name,
      description: template.description,
      atmosphere: template.atmosphere,
      npcs: [],
      map: template.name.toLowerCase().includes('dungeon') ? 'dungeon' : 
           template.name.toLowerCase().includes('forest') ? 'grass' : 'tavern',
      tags: template.tags,
    };
    scenes.value = [...scenes.value, newScene];
    this.changeScene(newScene);
    this.setState({ showTemplates: false });
  }

  render() {
    return html`
      <div class="scene-manager">
        <!-- Current Scene Display -->
        <div class="current-scene">
          <div class="scene-header">
            <h3>🎬 Current Scene</h3>
            <button onClick=${() => this.setState({ showTemplates: true })}>📋 Templates</button>
          </div>
          ${sceneTransition.value && html`
            <div class="scene-transition-overlay">
              <div class="transition-text">FADE TO BLACK...</div>
            </div>
          `}
          <div class="scene-card ${sceneTransition.value ? 'transitioning' : ''}">
            <h4 class="scene-name">${currentScene.value.name}</h4>
            <div class="scene-description">
              ${this.state.typewriterText || currentScene.value.description}
              ${this.state.typewriterIdx < currentScene.value.description.length && html`
                <span class="typewriter-cursor">|</span>
              `}
            </div>
            <div class="scene-meta">
              <span class="scene-atmosphere">🌫️ ${currentScene.value.atmosphere}</span>
              ${currentScene.value.npcs.length > 0 && html`
                <span class="scene-npcs">👥 ${currentScene.value.npcs.join(', ')}</span>
              `}
              <div class="scene-tags">
                ${currentScene.value.tags.map(t => html`<span class="scene-tag">${t}</span>`)}
              </div>
            </div>
          </div>
        </div>

        <!-- Scene Library -->
        <div class="scene-library">
          <h4>Scene Library</h4>
          <div class="scene-list">
            ${scenes.value.map(scene => html`
              <div class=${`scene-list-item ${currentScene.value.id === scene.id ? 'active' : ''}`}
                   onClick=${() => this.changeScene(scene)}>
                <div class="scene-item-name">${scene.name}</div>
                <div class="scene-item-desc">${scene.description.slice(0, 60)}...</div>
                <div class="scene-item-tags">
                  ${scene.tags.map(t => html`<span class="scene-tag-small">${t}</span>`)}
                </div>
              </div>
            `)}
          </div>
          <button class="create-scene-btn" onClick=${() => this.setState({ showCreate: true })}>
            + Create New Scene
          </button>
        </div>

        <!-- Templates Modal -->
        ${this.state.showTemplates && html`
          <div class="templates-overlay" onClick=${() => this.setState({ showTemplates: false })}>
            <div class="templates-modal" onClick=${e => e.stopPropagation()}>
              <h4>Scene Templates</h4>
              <div class="templates-grid">
                ${SCENE_TEMPLATES.map(t => html`
                  <div class="template-card" onClick=${() => this.createFromTemplate(t)}>
                    <h5>${t.name}</h5>
                    <p>${t.description}</p>
                    <div class="template-atmosphere">${t.atmosphere}</div>
                    <div class="template-tags">
                      ${t.tags.map(tag => html`<span>${tag}</span>`)}
                    </div>
                  </div>
                `)}
              </div>
              <button class="close-templates" onClick=${() => this.setState({ showTemplates: false })}>✕</button>
            </div>
          </div>
        `}

        <!-- Create Scene Modal -->
        ${this.state.showCreate && html`
          <div class="scene-create-overlay" onClick=${() => this.setState({ showCreate: false })}>
            <div class="scene-create-modal" onClick=${e => e.stopPropagation()}>
              <h4>Create Scene</h4>
              <div class="scene-create-form">
                <input placeholder="Scene Name" value=${this.state.newScene.name || ''}
                  onInput=${e => this.setState(s => ({ newScene: { ...s.newScene, name: e.target.value } }))} />
                <textarea placeholder="Description" rows="3"
                  value=${this.state.newScene.description || ''}
                  onInput=${e => this.setState(s => ({ newScene: { ...s.newScene, description: e.target.value } }))} />
                <input placeholder="Atmosphere (e.g., 'Eerie, damp')"
                  value=${this.state.newScene.atmosphere || ''}
                  onInput=${e => this.setState(s => ({ newScene: { ...s.newScene, atmosphere: e.target.value } }))} />
                <input placeholder="NPCs (comma separated)"
                  value=${this.state.newScene.npcs || ''}
                  onInput=${e => this.setState(s => ({ newScene: { ...s.newScene, npcs: e.target.value.split(',').map(s => s.trim()) } }))} />
                <select value=${this.state.newScene.map || 'tavern'}
                  onChange=${e => this.setState(s => ({ newScene: { ...s.newScene, map: e.target.value } }))}>
                  <option value="tavern">Tavern</option>
                  <option value="dungeon">Dungeon</option>
                  <option value="grass">Grass Field</option>
                  <option value="water">Water</option>
                  <option value="snow">Snow</option>
                </select>
                <input placeholder="Tags (comma separated)"
                  value=${this.state.newScene.tags || ''}
                  onInput=${e => this.setState(s => ({ newScene: { ...s.newScene, tags: e.target.value.split(',').map(s => s.trim()) } }))} />
                <div class="modal-actions">
                  <button onClick=${() => {
                    const scene = {
                      id: Date.now(),
                      ...this.state.newScene,
                      npcs: typeof this.state.newScene.npcs === 'string' ? this.state.newScene.npcs.split(',').map(s => s.trim()) : this.state.newScene.npcs || [],
                      tags: typeof this.state.newScene.tags === 'string' ? this.state.newScene.tags.split(',').map(s => s.trim()) : this.state.newScene.tags || [],
                    };
                    scenes.value = [...scenes.value, scene];
                    this.changeScene(scene);
                    this.setState({ showCreate: false, newScene: {} });
                  }}>Create Scene</button>
                  <button onClick=${() => this.setState({ showCreate: false, newScene: {} })}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }
}

export { SceneManager, currentScene };
