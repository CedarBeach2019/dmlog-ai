import { html, useState, useEffect } from '../preact-shim.js';
import { authState, addToast } from '../app.js';

export function NPCPanel() {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [open, setOpen] = useState(true);
  const getToken = () => sessionStorage.getItem('lo-token') || authState.value.token;

  const fetchNPCs = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/v1/chat/npcs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setNpcs(data.npcs || []);
    } catch (err) {
      console.error('Failed to fetch NPCs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNPCs(); }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    const diffHrs = Math.floor((Date.now() - new Date(ts)) / 3600000);
    if (diffHrs < 1) return 'just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  };

  if (!open) {
    return html`
      <div class="npc-panel collapsed" onclick=${() => setOpen(true)}>
        👥 NPCs (${npcs.length})
      </div>
    `;
  }

  return html`
    <div class="npc-panel">
      <div class="npc-header">
        <span>👥 NPCs (${npcs.length})</span>
        <div>
          <button onclick=${fetchNPCs} title="Refresh">🔄</button>
          <button onclick=${() => setOpen(false)}>✕</button>
        </div>
      </div>
      <div class="npc-list">
        ${loading ? html`<div class="npc-loading">Scanning sessions...</div>` :
          npcs.length === 0 ? html`<div class="npc-empty">No NPCs discovered yet. Start playing!</div>` :
          npcs.map(npc => html`
            <div class="npc-item" onclick=${() => setExpanded(expanded === npc.name ? null : npc.name)}>
              <div class="npc-name">${npc.name}</div>
              ${npc.title ? html`<div class="npc-title">${npc.title}</div>` : null}
              <div class="npc-meta">
                ${npc.mentionCount} mentions · last ${formatTime(npc.lastMentioned)}
              </div>
              ${expanded === npc.name && html`
                <div class="npc-detail">
                  ${npc.description ? html`<div class="npc-desc">${npc.description}</div>` : null}
                  <div class="npc-desc">First seen: ${new Date(npc.firstMentioned).toLocaleDateString()}</div>
                  <div class="npc-desc">Last seen: ${new Date(npc.lastMentioned).toLocaleDateString()}</div>
                  <div class="npc-desc">Total mentions: ${npc.mentionCount}</div>
                </div>
              `}
            </div>
          `)
        }
      </div>
    </div>
  `;
}
