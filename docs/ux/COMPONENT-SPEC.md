# Component Specification — log-origin

> Detailed component specifications for the 12 core UI components in log-origin.

## Table of Contents

1. [Component Overview](#1-component-overview)
2. [App Component](#2-app-component)
3. [Login Component](#3-login-component)
4. [Chat Component](#4-chat-component)
5. [Message Component](#5-message-component)
6. [MessageInput Component](#6-messageinput-component)
7. [DraftPanel Component](#7-draftpanel-component)
8. [DraftCard Component](#8-draftcard-component)
9. [Sidebar Component](#9-sidebar-component)
10. [Settings Component](#10-settings-component)
11. [ProviderSetup Component](#11-providersetup-component)
12. [Metrics Component](#12-metrics-component)
13. [Toast Component](#13-toast-component)
14. [Component Interactions](#14-component-interactions)
15. [State Management Details](#15-state-management-details)

---

## 1. Component Overview

### Component Hierarchy

```
App (root)
├── Login (conditional)
├── Layout (conditional)
│   ├── Sidebar
│   ├── Chat
│   │   ├── Message (multiple)
│   │   ├── MessageInput
│   │   └── DraftPanel (conditional)
│   ├── Settings (overlay)
│   ├── Metrics (overlay)
│   └── Toast (floating)
```

### Technology Stack

- **Framework:** Preact 10.26 (4KB)
- **State Management:** preact-signals (2KB)
- **Styling:** CSS custom properties (no framework)
- **Templating:** HTM (tagged template literals, 1KB)
- **Icons:** Inline SVG (no icon library)
- **Build:** None (static assets served by Worker)

---

## 2. App Component

### Purpose
Root component that manages authentication state, theme, and global layout.

### Props
None (root component)

### State
```typescript
interface AppState {
  isLoggedIn: boolean;
  userId: string | null;
  theme: 'dark' | 'light';
  isLoading: boolean;
  error: string | null;
}
```

### Signals
```typescript
// Global signals (shared across components)
const authState = signal({ isLoggedIn: false, userId: null });
const theme = signal<'dark' | 'light'>('dark');
const toasts = signal<Toast[]>([]);
const overlay = signal<'settings' | 'metrics' | 'draft' | null>(null);
```

### Template
```javascript
function App() {
  return html`
    <div class="app" data-theme=${theme.value}>
      ${authState.value.isLoggedIn
        ? html`<${Layout} />`
        : html`<${Login} />`
      }
      <${ToastContainer} />
    </div>
  `;
}
```

### CSS
```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--lo-bg-primary);
  color: var(--lo-text-primary);
  font-family: var(--lo-font-sans);
  font-size: var(--lo-font-size-base);
  line-height: 1.5;
  overflow: hidden;
}
```

---

## 3. Login Component

### Purpose
Handle passphrase authentication and initial setup.

### Props
None

### State
```typescript
interface LoginState {
  passphrase: string;
  isLoading: boolean;
  error: string | null;
  showRecoveryKey: boolean;
  recoveryKey: string | null;
}
```

### Events
- `onSubmit`: Send passphrase to `/api/auth`
- `onRecoveryKeyGenerated`: Display recovery key for user to save
- `onAutoLockChange`: Toggle "stay logged in" preference

### Template
```javascript
function Login() {
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }
      
      const data = await response.json();
      authState.value = { isLoggedIn: true, userId: data.user_id };
      
      // Show recovery key if this is first login
      if (data.is_first_login) {
        const key = await generateRecoveryKey(passphrase);
        setRecoveryKey(key);
        setShowRecoveryKey(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return html`
    <div class="login">
      <div class="login-card">
        <div class="login-header">
          <h1>🔐 log-origin</h1>
          <p>Your AI remembers</p>
        </div>
        
        ${showRecoveryKey
          ? html`
              <div class="recovery-key">
                <h2>🔑 Save Your Recovery Key</h2>
                <p>If you lose your passphrase, this key is the ONLY way to recover your data.</p>
                <div class="key-display">${recoveryKey}</div>
                <div class="key-actions">
                  <button onclick=${() => navigator.clipboard.writeText(recoveryKey)}>
                    Copy to Clipboard
                  </button>
                  <button onclick=${() => setShowRecoveryKey(false)}>
                    I've Saved It
                  </button>
                </div>
              </div>
            `
          : html`
              <form class="login-form" onsubmit=${handleSubmit}>
                ${error && html`<div class="error">${error}</div>`}
                
                <label for="passphrase">Passphrase</label>
                <input
                  type="password"
                  id="passphrase"
                  value=${passphrase}
                  oninput=${(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your passphrase"
                  autocomplete="current-password"
                  autofocus
                  required
                />
                
                <div class="login-options">
                  <label>
                    <input type="checkbox" checked />
                    Auto-lock after 15 minutes
                  </label>
                  <label>
                    <input type="checkbox" />
                    Stay logged in (not recommended)
                  </label>
                </div>
                
                <button type="submit" disabled=${isLoading}>
                  ${isLoading ? 'Unlocking...' : 'Unlock'}
                </button>
              </form>
            `
        }
      </div>
    </div>
  `;
}
```

### CSS
```css
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: var(--lo-space-lg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--lo-bg-secondary);
  border: 1px solid var(--lo-border);
  border-radius: var(--lo-border-radius);
  padding: var(--lo-space-xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: var(--lo-space-xl);
}

.login-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.login-header p {
  margin: var(--lo-space-xs) 0 0;
  color: var(--lo-text-secondary);
  font-size: var(--lo-font-size-sm);
}

.login-form label {
  display: block;
  margin-bottom: var(--lo-space-xs);
  font-weight: 500;
  color: var(--lo-text-secondary);
}

.login-form input[type="password"] {
  width: 100%;
  padding: var(--lo-space-sm) var(--lo-space-md);
  background: var(--lo-bg-tertiary);
  border: 1px solid var(--lo-border);
  border-radius: var(--lo-border-radius);
  color: var(--lo-text-primary);
  font-size: var(--lo-font-size-base);
  margin-bottom: var(--lo-space-lg);
}

.login-form input[type="password"]:focus {
  outline: none;
  border-color: var(--lo-accent);
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.login-options {
  margin-bottom: var(--lo-space-lg);
  font-size: var(--lo-font-size-sm);
}

.login-options label {
  display: flex;
  align-items: center;
  margin-bottom: var(--lo-space-sm);
  font-weight: normal;
}

.login-options input[type="checkbox"] {
  margin-right: var(--lo-space-sm);
}

.login-form button {
  width: 100%;
  padding: var(--lo-space-sm) var(--lo-space-md);
  background: var(--lo-accent);
  color: white;
  border: none;
  border-radius: var(--lo-border-radius);
  font-size: var(--lo-font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--lo-transition);
}

.login-form button:hover {
  background: var(--lo-accent-hover);
}

.login-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid var(--lo-error);
  color: var(--lo-error);
  padding: var(--lo-space-sm) var(--lo-space-md);
  border-radius: var(--lo-border-radius);
  margin-bottom: var(--lo-space-lg);
  font-size: var(--lo-font-size-sm);
}

.recovery-key {
  text-align: center;
}

.recovery-key h2 {
  margin: 0 0 var(--lo-space-sm);
  font-size: 1.25rem;
}

.recovery-key p {
  margin: 0 0 var(--lo-space-lg);
  color: var(--lo-text-secondary);
  font-size: var(--lo-font-size-sm);
  line-height: 1.6;
}

.key-display {
  background: var(--lo-bg-tertiary);
  border: 1px solid var(--lo-border);
  border-radius: var(--lo-border-radius);
  padding: var(--lo-space-md);
  margin-bottom: var(--lo-space-lg);
  font-family: var(--lo-font-mono);
  font-size: var(--lo-font-size-sm);
  word-break: break-all;
  user-select: all;
}

.key-actions {
  display: flex;
  gap: var(--lo-space-sm);
}

.key-actions button {
  flex: 1;
  padding: var(--lo-space-sm) var(--lo-space-md);
  background: var(--lo-bg-tertiary);
  border: 1px solid var(--lo-border);
  border-radius: var(--lo-border-radius);
  color: var(--lo-text-primary);
  font-size: var(--lo-font-size-base);
  cursor: pointer;
  transition: all var(--lo-transition);
}

.key-actions button:hover {
  background: var(--lo-bg-secondary);
  border-color: var(--lo-accent);
}
```

---

## 4. Chat Component

### Purpose
Main chat interface displaying messages and handling input.

### Props
```typescript
interface ChatProps {
  sessionId: string;
  sessionTitle: string;
}
```

### State
```typescript
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  draftRoundId: string | null;
  showDraftPanel: boolean;
}
```

### Signals
```typescript
const activeSessionId = signal<string | null>(null);
const sessions = signal<Session[]>([]);
const messages = signal<Message[]>([]);
```

### Template
```javascript
function Chat({ sessionId, sessionTitle }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  const [draftRoundId, setDraftRoundId] = useState(null);
  
  const activeSession = computed(() =>
    sessions.value.find(s => s.id === activeSessionId.value)
  );
  
  const handleSendMessage = async (content, commandPrefix) => {
    if (commandPrefix === 'draft') {
      setShowDraftPanel(true);
      // Execute draft round
      const roundId = await executeDraftRound(content);
      setDraftRoundId(roundId);
    } else {
      // Normal message
      setIsStreaming(true);
      await sendMessage(content, commandPrefix);
      setIsStreaming(false);
    }
  };
  
  const handlePickWinner = async (providerId) => {
    await submitDraftWinner(draftRoundId, providerId);
    setShowDraftPanel(false);
    setDraftRoundId(null);
  };

  return html`
    <div class="chat">
      <div class="chat-header">
        <h2>${sessionTitle}</h2>
        <div class="chat-actions">
          <button onclick=${() => overlay.value = 'metrics'}>
            📊 Metrics
          </button>
        </div>
      </div>
      
      <div class="messages">
        ${messages.value.map(msg => html`
          <${Message} key=${msg.id} message=${msg} />
        `)}
        
        ${isStreaming && html`
          <div class="streaming-indicator">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        `}
      </div>
      
      ${showDraftPanel
        ? html`
            <${DraftPanel}
              roundId=${draftRoundId}
              onPickWinner=${handlePickWinner}
              onClose=${() => setShowDraftPanel(false)}
            />
          `
        : html`
            <${MessageInput}
              onSend=${handleSendMessage}
              disabled=${isStreaming}
            />
          `
      }
    </div>
  `;
}
```

### CSS
```css
.chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100vh;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lo-space-md) var(--lo-space-lg);
  border-bottom: 1px solid var(--lo-border);
  background: var(--lo-bg-secondary);
  flex-shrink: 0;
}

.chat-header h2 {
  margin: 0;
  font-size: var(--lo-font-size-lg);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-actions button {
  background: none;
  border: 1px solid var(--lo-border);
  border-radius: var(--lo-border-radius);
  color: var(--lo-text-secondary);
  padding: var(--lo-space-xs) var(--lo-space-sm);
  font-size: var(--lo-font-size-sm);
  cursor: pointer;
  transition: all var(--lo-transition);
}

.chat-actions button:hover {
  border-color: var(--lo-accent);
  color: var(--lo-text-primary);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--lo-space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--lo-space-lg);
}

.streaming-indicator {
  display: flex;
  align-items: center;
  padding: var(--lo-space-md);
  background: var(--lo-bg-secondary);
  border-radius: var(--lo-border-radius);
  margin-top: var(--lo-space-md);
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: var(--lo-text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
```

---

## 5. Message Component

### Purpose
Display a single message with role-specific styling and actions.

### Props
```typescript
interface MessageProps {
  message: {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
    model?: string;
    provider?: string;
    latencyMs?: number;
    tokens?: { prompt: number; completion: number };
    createdAt: string;
    _meta?: {
      route?: { action: string; confidence: number };
      pii?: { detected: number; tokens: string[] };
      interactionId?: string;
    };
  };
}
```

### State
```typescript
interface MessageState {
  isExpanded: boolean;
  showFeedback: boolean;
  feedbackSubmitted: boolean;
}
```

### Template
```javascript
function Message({ message }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const isAssistant = message.role === 'assistant';
  const hasFeedback = message._meta?.interactionId;
  
  const handleFeedback = async (rating) => {
    if (!hasFeedback) return;
    
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interaction_id: message._meta.interactionId,
        rating,
      }),
    });
    
    setFeedbackSubmitted(true);
    setShowFeedback(false);
    
    // Show toast
    toasts.value = [...toasts.value, {
      id: Date.now().toString(),
      type: 'success',
      message: 'Feedback recorded',
      duration: 3000,
    }];
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return html`
    <div class="message ${message.role} ${isExpanded ? 'expanded' : ''}">
      <div class="message-header">
        <div class="message-role">
          ${message.role === 'user' ? '👤 You' : '🤖 Assistant'}
          ${message.model && html`<span class="model">${message.model}</span>`}
          ${message.latencyMs && html`<span class="latency">${message.latencyMs}ms</span>`}
        </div>
        <div class="message-time">${formatTime(message.createdAt)}</div>
      </div>
      
      <div class="message-content">
        ${message.content}
      </div>
      
      <div class="message-actions">
        <button onclick=${() => navigator.clipboard.writeText(message.content)}>
          📋 Copy
        </button>
        
        ${isAssistant && hasFeedback && !feedbackSubmitted && html`
          <button onclick=${() => setShowFeedback(!showFeedback)}>
            ${showFeedback ? 'Cancel' : '👍👎 Feedback'}
          </button>
        `}
        
        ${message.content.length > 500 && html`
          <button onclick=${() => setIsExpanded(!isExpanded)}>
            ${isExpanded ? 'Show less' : 'Show more'}
          </button>
        `}
      </div>
      
      ${showFeedback && html`
        <div class="feedback-buttons">
          <button onclick=${() => handleFeedback('up')} class="feedback-up">
            👍 Helpful
          </button>
          <button onclick=${() => handleFeedback('down')} class="feedback-down">
            👎 Not helpful
          </button>
        </div>
      `}
      
      ${feedbackSubmitted && html`
        <div class="feedback-submitted">
          ✓ Feedback submitted
        </div>
      `}
      
      ${message._meta?.route && html`
        <div class="message-meta">
          <span class="route-badge">${message._meta.route.action}</span>
          ${message._meta.route.confidence && html`
            <span class="confidence">${Math.round(message._meta.route.confidence * 100)}%</span>
          `}
        </div>
      `}
    </div>
  `;
}