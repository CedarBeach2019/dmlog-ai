import { render, signal, useEffect, html } from './preact-shim.js';
import { Login } from './components/login.js';
import { Chat } from './components/chat.js';
import { Sidebar } from './components/sidebar.js';
import { Settings } from './components/settings.js';
import { NPCPanel } from './components/npc-panel.js';

import { Analytics } from './analytics.js';
// Global state
export const authState = signal({ isLoggedIn: false, token: null, userId: null });
export const theme = signal(localStorage.getItem('lo-theme') || 'dark');
export const sidebarOpen = signal(true);
export const settingsOpen = signal(false);
export const sessions = signal([]);
export const currentSessionId = signal(null);
export const sessionUpdated = signal(0);
export const loadSessionSignal = signal(null);
export const toasts = signal([]);
export const overlay = signal(null);
export const analyticsOpen = signal(false);

// Theme sync
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem('lo-theme', theme.value);
  if (window.location.hostname.includes('dmlog')) {
    const existing = document.getElementById('dm-theme-css');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'dm-theme-css';
      link.rel = 'stylesheet';
      link.href = '/theme.css';
      document.head.appendChild(link);
      document.body.classList.add('dm-theme');
    }
  }
}, []);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'b') { e.preventDefault(); sidebarOpen.value = !sidebarOpen.value; }
  if (e.ctrlKey && e.key === 'n') { e.preventDefault(); currentSessionId.value = crypto.randomUUID(); }
  if (e.key === 'Escape') { settingsOpen.value = false; overlay.value = null; }
});

function addToast(msg, type = 'info') {
  const id = Date.now();
  toasts.value = [...toasts.value, { id, msg, type }];
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id); }, 3000);
}
export { addToast };

function App() {
  return html`
    <div class="app">
      ${authState.value.isLoggedIn ? html`
        <div class="layout">
          <${Sidebar} />
          <div class="sidebar-backdrop" onclick=${() => sidebarOpen.value = false}></div>
          <${Chat} />
          <${NPCPanel} />
        </div>
      ` : html`<${Login} />`}
      <${Settings} />
      <${Analytics} />
      <div class="toast-container">
        ${toasts.value.map(t => html`<div class="toast">${t.msg}</div>`)}
      </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
