import { html, useState, useEffect } from '../preact-shim.js';
import { authState, addToast } from '../app.js';

export function Analytics() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);

  const getToken = () => sessionStorage.getItem('lo-token') || authState.value.token;

  const fetchData = async (tabId) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (tabId === 'overview' || !summary) {
        const res = await fetch('/v1/analytics/summary', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setSummary(await res.json());
      }
      if (tabId === 'routes' || tabId === 'activity') {
        const res = await fetch('/v1/analytics/routes', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setRoutes(await res.json());
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) fetchData(tab);
  }, [open, tab]);

  if (!open) return null;

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'routes', label: '🧭 Routes' },
    { id: 'activity', label: '📈 Activity' },
  ];

  return html`
    <div class="analytics-overlay" onclick=${() => setOpen(false)}>
      <div class="analytics-panel" onclick=${(e) => e.stopPropagation()}>
        <div class="analytics-header">
          <h2>📊 Analytics</h2>
          <button class="icon-btn" onclick=${() => setOpen(false)}>✕</button>
        </div>
        <div class="analytics-tabs">
          ${tabs.map(t => html`
            <button class=${tab === t.id ? 'active' : ''} onclick=${() => setTab(t.id)}>${t.label}</button>
          `)}
        </div>
        <div class="analytics-body">
          ${loading ? html`<div class="analytics-loading"><span class="spinner"></span> Loading...</div>` :
            tab === 'overview' && summary ? html`
              <div class="analytics-grid">
                <div class="analytics-stat">
                  <div class="stat-value">${summary.interactions}</div>
                  <div class="stat-label">Messages</div>
                </div>
                <div class="analytics-stat">
                  <div class="stat-value">${summary.sessions}</div>
                  <div class="stat-label">Sessions</div>
                </div>
                <div class="analytics-stat">
                  <div class="stat-value">${summary.satisfaction}%</div>
                  <div class="stat-label">Satisfaction</div>
                </div>
                <div class="analytics-stat">
                  <div class="stat-value">${summary.avgLatencyMs}ms</div>
                  <div class="stat-label">Avg Latency</div>
                </div>
                <div class="analytics-stat">
                  <div class="stat-value">👍 ${summary.thumbsUp} / 👎 ${summary.thumbsDown}</div>
                  <div class="stat-label">Feedback</div>
                </div>
                <div class="analytics-stat">
                  <div class="stat-value">${summary.npcsDiscovered}</div>
                  <div class="stat-label">NPCs Found</div>
                </div>
              </div>
              ${summary.firstInteraction && html`
                <div class="analytics-note">
                  First interaction: ${new Date(summary.firstInteraction).toLocaleDateString()} |
                  Last: ${new Date(summary.lastInteraction).toLocaleDateString()}
                </div>
              `}
            ` : tab === 'routes' && routes ? html`
              <div class="analytics-section">
                <h3>🧭 Route Distribution</h3>
                <div class="analytics-table">
                  <div class="at-row at-header">
                    <span>Route</span><span>Count</span><span>Avg Latency</span><span>Satisfaction</span>
                  </div>
                  ${(routes.routes || []).map(r => html`
                    <div class="at-row">
                      <span class="route-badge">${r.action}</span>
                      <span>${r.count}</span>
                      <span>${r.avgLatencyMs}ms</span>
                      <span class="satisfaction ${r.satisfaction >= 80 ? 'good' : r.satisfaction >= 50 ? 'mid' : 'low'}">${r.satisfaction}%</span>
                    </div>
                  `)}
                </div>
              </div>
              <div class="analytics-section">
                <h3>🤖 Model Performance</h3>
                <div class="analytics-table">
                  <div class="at-row at-header">
                    <span>Model</span><span>Uses</span><span>Avg Latency</span><span>Satisfaction</span>
                  </div>
                  ${(routes.models || []).map(m => html`
                    <div class="at-row">
                      <span>${m.model}</span>
                      <span>${m.count}</span>
                      <span>${m.avgLatencyMs}ms</span>
                      <span class="satisfaction ${m.satisfaction >= 80 ? 'good' : m.satisfaction >= 50 ? 'mid' : 'low'}">${m.satisfaction}%</span>
                    </div>
                  `)}
                </div>
              </div>
              ${(routes.draftWins || []).length > 0 ? html`
                <div class="analytics-section">
                  <h3>🏆 Draft Winners</h3>
                  ${routes.draftWins.map(d => html`
                    <div class="draft-win">${d.profile}: ${d.wins} wins</div>
                  `)}
                </div>
              ` : null}
            ` : tab === 'activity' && routes ? html`
              <div class="analytics-section">
                <h3>📈 Daily Activity (Last 30 days)</h3>
                <div class="activity-chart">
                  ${(routes.dailyActivity || []).map(d => html`
                    <div class="activity-bar-wrap" title="${d.day}: ${d.messages} messages">
                      <div class="activity-bar" style="height:${Math.max(4, Math.min(100, d.messages * 5))}%"></div>
                      <span class="activity-label">${d.day.slice(5)}</span>
                    </div>
                  `)}
                </div>
              </div>
              ${(routes.recentFeedback || []).length > 0 ? html`
                <div class="analytics-section">
                  <h3>💬 Recent Feedback</h3>
                  ${(routes.recentFeedback || []).map(f => html`
                    <div class="feedback-item">
                      <span>${f.feedback === 'up' ? '👍' : '👎'}</span>
                      <span class="route-badge">${f.action}</span>
                      <span>${f.model}</span>
                      <span class="feedback-time">${new Date(f.time).toLocaleString()}</span>
                    </div>
                  `)}
                </div>
              ` : null}
            : html`<div class="analytics-empty">No data yet. Start chatting to see analytics.</div>`
          }
        </div>
      </div>
    </div>
  `;
}
