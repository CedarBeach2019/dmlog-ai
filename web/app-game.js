// DMlog.ai — Game Session Entry Point
import { render, signal, effect } from 'preact';
import { html } from 'htm/preact';
import { GameShell } from './components/game-shell.js';

const auth = signal(null);
const session = signal(null);
const gamePhase = signal('setup');

// Load auth from sessionStorage
const stored = sessionStorage.getItem('dmlog_auth');
if (stored) try { auth.value = JSON.parse(stored); } catch {}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'b') { e.preventDefault(); /* toggle sidebar */ }
});

effect(() => {
  if (auth.value) {
    sessionStorage.setItem('dmlog_auth', JSON.stringify(auth.value));
  }
});

function App() {
  if (!auth.value) {
    return html`
      <div class="login-screen">
        <h1>🐉 DMlog.ai</h1>
        <p>Your AI Dungeon Master Remembers</p>
        <form onSubmit=${handleLogin}>
          <input type="text" id="username" placeholder="Player name" required />
          <input type="password" id="passphrase" placeholder="Passphrase" required minlength="8" />
          <button type="submit">Enter the Realm</button>
        </form>
      </div>
    `;
  }
  return html`<${GameShell} auth=${auth.value} session=${session} phase=${gamePhase} />`;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const passphrase = document.getElementById('passphrase').value;
  try {
    const res = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passphrase }),
    });
    const data = await res.json();
    if (data.token) {
      auth.value = { token: data.token, userId: data.userId, username };
    } else {
      // Try register
      const regRes = await fetch('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passphrase }),
      });
      const regData = await regRes.json();
      if (regData.token) {
        auth.value = { token: regData.token, userId: regData.userId, username };
      }
    }
  } catch (err) {
    console.error('Auth failed:', err);
  }
}

render(html`<${App} />`, document.getElementById('app'));
