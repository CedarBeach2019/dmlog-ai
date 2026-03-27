import { html, useState, useEffect } from '../preact-shim.js';
import { settingsOpen, theme } from '../app.js';

export function Settings() {
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState([
    { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', key: '' },
  ]);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') settingsOpen.value = false; };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return html`
    <div class="settings-backdrop ${settingsOpen.value ? 'open' : ''}" onclick=${() => settingsOpen.value = false}></div>
    <div class="settings-overlay ${settingsOpen.value ? 'open' : ''}">
      <div class="settings-header">
        <h2>⚙ Settings</h2>
        <button onclick=${() => settingsOpen.value = false}>✕</button>
      </div>
      <div class="settings-tabs">
        ${['providers', 'preferences', 'theme'].map(t => html`
          <button class=${tab === t ? 'active' : ''} onclick=${() => setTab(t)}>
            ${t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        `)}
      </div>
      <div class="settings-body">
        ${tab === 'providers' && html`
          <div>
            <div class="settings-section">
              <h3>Configured Providers</h3>
              ${providers.map(p => html`
                <div class="provider-item">
                  <div><div class="name">${p.name}</div><div class="model">${p.model}</div></div>
                  <button onclick=${() => setProviders(prev => prev.filter(x => x.id !== p.id))}>🗑</button>
                </div>
              `)}
            </div>
            ${showAddProvider ? html`
              <div class="settings-section">
                <h3>New Provider</h3>
                <div style="display:flex;flex-direction:column;gap:.5rem;">
                  <input placeholder="Name" />
                  <input placeholder="Model" />
                  <input type="password" placeholder="API Key" />
                  <div style="display:flex;gap:.5rem;">
                    <button class="primary" onclick=${() => setShowAddProvider(false)}>Add</button>
                    <button onclick=${() => setShowAddProvider(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ` : html`<button onclick=${() => setShowAddProvider(true)}>+ Add Provider</button>`}
          </div>
        `}
        ${tab === 'preferences' && html`
          <div class="settings-section">
            <h3>Privacy</h3>
            <div class="toggle-row">
              <span>Privacy mode (PII detection)</span>
              <button class="toggle ${privacyMode ? 'on' : ''}" onclick=${() => setPrivacyMode(!privacyMode)}></button>
            </div>
            <div class="toggle-row">
              <span>Cache responses</span>
              <button class="toggle ${cacheEnabled ? 'on' : ''}" onclick=${() => setCacheEnabled(!cacheEnabled)}></button>
            </div>
          </div>
        `}
        ${tab === 'theme' && html`
          <div class="settings-section">
            <h3>Appearance</h3>
            <div class="toggle-row">
              <span>Dark mode</span>
              <button class="toggle ${theme.value === 'dark' ? 'on' : ''}"
                onclick=${() => theme.value = theme.value === 'dark' ? 'light' : 'dark'}></button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}
