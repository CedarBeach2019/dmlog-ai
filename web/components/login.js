import { html, useState } from '../preact-shim.js';
import { authState, addToast } from '../app.js';

export function Login() {
  const [mode, setMode] = useState('landing');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const storeToken = (data) => {
    const token = data.token || data.accessToken || data.access_token;
    sessionStorage.setItem('lo-token', token);
    sessionStorage.setItem('lo-guest', data.guest ? '1' : '');
    authState.value = {
      isLoggedIn: true,
      token,
      userId: data.userId || data.user_id,
      isGuest: data.guest || false,
    };
    if (data.guest) {
      addToast(`${data.messagesRemaining} free messages remaining`);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/auth/guest', { method: 'POST' });
      if (!res.ok) throw new Error(`Guest access unavailable (${res.status})`);
      const data = await res.json();
      storeToken(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Login failed (${res.status})`);
      }
      const data = await res.json();
      storeToken(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!passphrase.trim() || passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Registration failed (${res.status})`);
      }
      const data = await res.json();
      storeToken(data);
      addToast('Account created! Your passphrase unlocks your AI memory.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'landing') {
    return html`
      <div class="login">
        <div class="login-card landing">
          <h1>🔐 LOG</h1>
          <p class="tagline">Your AI remembers everything.</p>
          <div class="features">
            <div class="feature">🧠 Every conversation builds your memory</div>
            <div class="feature">🔒 Your data is encrypted at rest</div>
            <div class="feature">⚡ Multi-model routing finds the best response</div>
            <div class="feature">📊 Feedback improves future answers</div>
          </div>
          ${error && html`<div class="error">${error}</div>`}
          <button class="primary guest-btn" onclick=${handleGuest} disabled=${isLoading}>
            ${isLoading ? html`<span class="spinner"></span>` : '⚡ Try it free — no signup'}
          </button>
          <div class="auth-divider"><span>or</span></div>
          <div class="auth-links">
            <button class="link-btn" onclick=${() => setMode('login')}>Sign in with passphrase</button>
            <button class="link-btn" onclick=${() => setMode('register')}>Create new account</button>
          </div>
          <p class="fine-print">Free tier: 5 guest messages, then create an account. $0/month forever.</p>
        </div>
      </div>
    `;
  }

  if (mode === 'login') {
    return html`
      <div class="login">
        <div class="login-card">
          <button class="back-btn" onclick=${() => { setMode('landing'); setError(null); }}>← Back</button>
          <h1>🔐 Sign In</h1>
          <p class="subtitle">Enter your passphrase to unlock your AI memory.</p>
          ${error && html`<div class="error">${error}</div>`}
          <form onSubmit=${handleLogin}>
            <input type="password" placeholder="Passphrase" value=${passphrase}
              onInput=${e => setPassphrase(e.target.value)} disabled=${isLoading}
              autofocus autocomplete="current-password" />
            <button type="submit" class="primary" disabled=${isLoading || !passphrase.trim()} style="width:100%">
              ${isLoading ? html`<span class="spinner"></span>` : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  return html`
    <div class="login">
      <div class="login-card">
        <button class="back-btn" onclick=${() => { setMode('landing'); setError(null); }}>← Back</button>
        <h1>🔐 Create Account</h1>
        <p class="subtitle">Choose a passphrase. This is your key — write it down.</p>
        ${error && html`<div class="error">${error}</div>`}
        <form onSubmit=${handleRegister}>
          <input type="password" placeholder="Passphrase (8+ characters)" value=${passphrase}
            onInput=${e => setPassphrase(e.target.value)} disabled=${isLoading}
            autofocus autocomplete="new-password" minlength="8" />
          <button type="submit" class="primary" disabled=${isLoading || passphrase.length < 8} style="width:100%">
            ${isLoading ? html`<span class="spinner"></span>` : 'Create Account'}
          </button>
        </form>
        <p class="fine-print">Passphrase hashed with PBKDF2 (100K iterations). We can't reset it.</p>
      </div>
    </div>
  `;
}
