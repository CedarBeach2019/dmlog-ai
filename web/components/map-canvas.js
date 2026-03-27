// ─── Map Canvas Component — Tactical Battle Map (Preact + HTM) ─────────────
import { html, Component } from '../preact-shim.js';

const BACKGROUNDS = [
  { id: 'grass', name: 'Grass Field', color: '#2d5a1e', pattern: 'grass' },
  { id: 'dungeon', name: 'Dungeon Floor', color: '#4a4a4a', pattern: 'stone' },
  { id: 'tavern', name: 'Tavern', color: '#6b4226', pattern: 'wood' },
  { id: 'water', name: 'Water', color: '#1a4a6b', pattern: 'water' },
  { id: 'snow', name: 'Snow', color: '#d4e5f7', pattern: 'snow' },
];

const TOOLS = [
  { id: 'select', label: '↖️ Select' },
  { id: 'token', label: '👤 Token' },
  { id: 'freehand', label: '✏️ Draw' },
  { id: 'line', label: '📏 Line' },
  { id: 'rect', label: '▭ Rect' },
  { id: 'circle', label: '◯ Circle' },
  { id: 'text', label: 'T Text' },
  { id: 'measure', label: '📐 Measure' },
  { id: 'fog', label: '🌫️ Fog' },
  { id: 'eraser', label: '🧹 Erase' },
];

class MapCanvas extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showGrid: true,
      gridSize: 5, // feet per square
      zoom: 1,
      panX: 0,
      panY: 0,
      background: BACKGROUNDS[0],
      activeTool: 'select',
      tokens: [],
      drawings: [],
      fogRevealed: new Set(),
      isDragging: false,
      dragTarget: null,
      drawStart: null,
      drawPoints: [],
      measureStart: null,
      measureEnd: null,
      showTokenDialog: false,
      newTokenType: 'player',
    };
    this.canvasRef = null;
    this.animFrame = null;
  }

  componentDidMount() {
    this.renderCanvas();
    window.addEventListener('resize', () => this.renderCanvas());
  }

  componentDidUpdate() {
    this.renderCanvas();
  }

  componentWillUnmount() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  get scale() { return this.state.zoom * 40 / this.state.gridSize; } // pixels per foot
  get pxPerGrid() { return this.scale * this.state.gridSize; }

  canvasCoords(e) {
    const rect = this.canvasRef.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.state.panX) / this.scale;
    const y = (e.clientY - rect.top - this.state.panY) / this.scale;
    return { x, y };
  }

  snapToGrid(x, y) {
    const g = this.state.gridSize;
    return { x: Math.floor(x / g) * g, y: Math.floor(y / g) * g };
  }

  renderCanvas() {
    const canvas = this.canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { zoom, panX, panY, showGrid, gridSize, background } = this.state;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, w, h);

    // Pattern overlay
    this.drawPattern(ctx, background.pattern, w, h);

    ctx.translate(panX, panY);
    ctx.scale(zoom * 40 / gridSize, zoom * 40 / gridSize);

    // Grid
    if (showGrid) this.drawGrid(ctx, w, h, gridSize);

    // Drawings layer
    this.state.drawings.forEach(d => this.drawShape(ctx, d));

    // Tokens layer
    this.state.tokens.forEach((t, i) => this.drawToken(ctx, t, i));

    // Fog layer
    this.drawFog(ctx, w, h, gridSize);

    // Current drawing
    if (this.state.drawPoints.length > 0 && this.state.activeTool === 'freehand') {
      this.drawFreehand(ctx, this.state.drawPoints);
    }

    // Measure line
    if (this.state.measureStart && this.state.measureEnd) {
      const s = this.state.measureStart, e = this.state.measureEnd;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2 / (zoom * 40 / gridSize);
      ctx.setLineDash([5 / (zoom * 40 / gridSize), 5 / (zoom * 40 / gridSize)]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const dist = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
      const midX = (s.x + e.x) / 2, midY = (s.y + e.y) / 2;
      ctx.fillStyle = '#ffd700';
      ctx.font = `${14 / (zoom * 40 / gridSize)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${dist.toFixed(1)} ft`, midX, midY - 8 / (zoom * 40 / gridSize));
    }

    ctx.restore();
  }

  drawPattern(ctx, pattern, w, h) {
    if (pattern === 'grass') {
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        ctx.fillStyle = '#1a3a0a';
        ctx.fillRect(x, y, 2, 4);
      }
      ctx.globalAlpha = 1;
    } else if (pattern === 'stone') {
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        for (let y = 0; y < h; y += 30) {
          ctx.strokeRect(x + (y % 60 ? 20 : 0), y, 40, 30);
        }
      }
      ctx.globalAlpha = 1;
    } else if (pattern === 'wood') {
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y * 0.1) * 3);
        ctx.lineTo(w, y + Math.sin(y * 0.1 + 2) * 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawGrid(ctx, w, h, gridSize) {
    const invScale = 1 / (this.state.zoom * 40 / gridSize);
    const xStart = Math.floor(-this.state.panX * invScale / gridSize) * gridSize;
    const yStart = Math.floor(-this.state.panY * invScale / gridSize) * gridSize;
    const xEnd = xStart + w * invScale;
    const yEnd = yStart + h * invScale;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5 * invScale;
    for (let x = xStart; x <= xEnd; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, yStart); ctx.lineTo(x, yEnd); ctx.stroke();
    }
    for (let y = yStart; y <= yEnd; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(xEnd, y); ctx.stroke();
    }
  }

  drawToken(ctx, token, idx) {
    const r = token.size || 2.5; // feet
    const x = token.x + r, y = token.y + r;
    const isPlayer = token.type === 'player';
    const isSelected = this.state.dragTarget?.type === 'token' && this.state.dragTarget?.idx === idx;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isPlayer ? '#0f52ba' : '#dc143c';
    if (isSelected) ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.3;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(r, 2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = (token.name || 'NPC').slice(0, 3).toUpperCase();
    ctx.fillText(label, x, y);

    // HP bar
    if (token.hp != null && token.maxHp != null) {
      const barW = r * 2, barH = 0.6;
      const barY = y + r + 0.3;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - r, barY, barW, barH);
      const pct = Math.max(0, token.hp / token.maxHp);
      ctx.fillStyle = pct > 0.6 ? '#50c878' : pct > 0.3 ? '#ffa500' : '#dc143c';
      ctx.fillRect(x - r, barY, barW * pct, barH);
    }
  }

  drawShape(ctx, shape) {
    ctx.strokeStyle = shape.color || '#ffd700';
    ctx.fillStyle = shape.fill || 'transparent';
    ctx.lineWidth = 0.3;
    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
    } else if (shape.type === 'rect') {
      if (shape.fill !== 'transparent') ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      if (shape.fill !== 'transparent') ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'freehand') {
      this.drawFreehand(ctx, shape.points);
    } else if (shape.type === 'text') {
      ctx.fillStyle = shape.color || '#ffd700';
      ctx.font = `${shape.fontSize || 2}px sans-serif`;
      ctx.fillText(shape.text, shape.x, shape.y);
    }
  }

  drawFreehand(ctx, points) {
    if (points.length < 2) return;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 0.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }

  drawFog(ctx, w, h, gridSize) {
    const invScale = 1 / (this.state.zoom * 40 / gridSize);
    const revealed = this.state.fogRevealed;
    if (revealed.size === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-this.state.panX * invScale, -this.state.panY * invScale, w * invScale, h * invScale);
      return;
    }
    // Simple per-cell fog
    const xStart = Math.floor(-this.state.panX * invScale / gridSize) * gridSize;
    const yStart = Math.floor(-this.state.panY * invScale / gridSize) * gridSize;
    const xEnd = xStart + w * invScale + gridSize;
    const yEnd = yStart + h * invScale + gridSize;
    for (let x = xStart; x <= xEnd; x += gridSize) {
      for (let y = yStart; y <= yEnd; y += gridSize) {
        const key = `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
        if (!revealed.has(key)) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, y, gridSize, gridSize);
        }
      }
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────
  handleMouseDown(e) {
    const pos = this.canvasCoords(e);
    const tool = this.state.activeTool;

    if (tool === 'select') {
      // Check if clicking on a token
      const gridSize = this.state.gridSize;
      const snapped = this.snapToGrid(pos.x, pos.y);
      const tokenIdx = this.state.tokens.findIndex(t => {
        const ts = this.snapToGrid(t.x, t.y);
        return ts.x === snapped.x && ts.y === snapped.y;
      });
      if (tokenIdx >= 0) {
        this.setState({ isDragging: true, dragTarget: { type: 'token', idx: tokenIdx } });
      }
    } else if (tool === 'freehand') {
      this.setState({ isDragging: true, drawPoints: [pos] });
    } else if (tool === 'line' || tool === 'measure') {
      this.setState({ isDragging: true, drawStart: pos, [tool === 'measure' ? 'measureStart' : 'drawStart']: pos });
    } else if (tool === 'rect' || tool === 'circle') {
      this.setState({ isDragging: true, drawStart: pos });
    } else if (tool === 'token') {
      const snapped = this.snapToGrid(pos.x, pos.y);
      this.setState({ showTokenDialog: true, tokenPos: snapped });
    } else if (tool === 'fog') {
      const gridSize = this.state.gridSize;
      const key = `${Math.floor(pos.x / gridSize)},${Math.floor(pos.y / gridSize)}`;
      const revealed = new Set(this.state.fogRevealed);
      revealed.add(key);
      this.setState({ fogRevealed: revealed });
    } else if (tool === 'eraser') {
      this.eraseAt(pos);
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const snapped = this.snapToGrid(pos.x, pos.y);
        this.setState(s => ({
          drawings: [...s.drawings, { type: 'text', x: snapped.x, y: snapped.y, text, color: '#ffd700', fontSize: 2 }]
        }));
      }
    }
  }

  handleMouseMove(e) {
    if (!this.state.isDragging) return;
    const pos = this.canvasCoords(e);
    const tool = this.state.activeTool;

    if (tool === 'select' && this.state.dragTarget?.type === 'token') {
      const snapped = this.snapToGrid(pos.x, pos.y);
      const tokens = [...this.state.tokens];
      const idx = this.state.dragTarget.idx;
      tokens[idx] = { ...tokens[idx], x: snapped.x, y: snapped.y };
      this.setState({ tokens });
    } else if (tool === 'freehand') {
      this.setState(s => ({ drawPoints: [...s.drawPoints, pos] }));
    } else if (tool === 'measure') {
      this.setState({ measureEnd: pos });
    }
  }

  handleMouseUp(e) {
    if (!this.state.isDragging) return;
    const pos = this.canvasCoords(e);
    const tool = this.state.activeTool;
    const start = this.state.drawStart || this.state.measureStart;

    if (tool === 'freehand' && this.state.drawPoints.length > 1) {
      this.setState(s => ({
        drawings: [...s.drawings, { type: 'freehand', points: [...s.drawPoints], color: '#ffd700' }],
        drawPoints: [],
      }));
    } else if (tool === 'line' && start) {
      this.setState(s => ({
        drawings: [...s.drawings, { type: 'line', x1: start.x, y1: start.y, x2: pos.x, y2: pos.y, color: '#ffd700' }],
        drawStart: null,
      }));
    } else if (tool === 'rect' && start) {
      const snapped = this.snapToGrid(pos.x, pos.y);
      const snappedStart = this.snapToGrid(start.x, start.y);
      this.setState(s => ({
        drawings: [...s.drawings, {
          type: 'rect', x: snappedStart.x, y: snappedStart.y,
          w: snapped.x - snappedStart.x, h: snapped.y - snappedStart.y,
          color: '#ffd700', fill: 'rgba(255,215,0,0.1)',
        }],
        drawStart: null,
      }));
    } else if (tool === 'circle' && start) {
      const r = Math.sqrt((pos.x - start.x) ** 2 + (pos.y - start.y) ** 2);
      this.setState(s => ({
        drawings: [...s.drawings, { type: 'circle', cx: start.x, cy: start.y, r, color: '#ffd700', fill: 'rgba(255,215,0,0.1)' }],
        drawStart: null,
      }));
    } else if (tool === 'measure') {
      // Keep measurement visible until next action
    }

    this.setState({ isDragging: false, dragTarget: null, measureStart: null });
  }

  handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.setState(s => ({ zoom: Math.max(0.25, Math.min(3, s.zoom + delta)) }));
  }

  eraseAt(pos) {
    const gridSize = this.state.gridSize;
    const idx = this.state.drawings.findIndex(d => {
      if (d.type === 'text') {
        return Math.abs(d.x - pos.x) < gridSize && Math.abs(d.y - pos.y) < gridSize;
      }
      if (d.type === 'freehand') {
        return d.points.some(p => Math.abs(p.x - pos.x) < gridSize && Math.abs(p.y - pos.y) < gridSize);
      }
      return false;
    });
    if (idx >= 0) {
      const drawings = [...this.state.drawings];
      drawings.splice(idx, 1);
      this.setState({ drawings });
    }
  }

  addToken(name, type) {
    const pos = this.state.tokenPos || { x: 0, y: 0 };
    this.setState(s => ({
      tokens: [...s.tokens, {
        name, type, x: pos.x, y: pos.y,
        hp: type === 'player' ? 10 : 20,
        maxHp: type === 'player' ? 10 : 20,
        size: 2.5,
      }],
      showTokenDialog: false,
    }));
  }

  clearMap() {
    this.setState({ tokens: [], drawings: [], fogRevealed: new Set(), measureEnd: null });
  }

  revealAll() {
    const gridSize = this.state.gridSize;
    const revealed = new Set();
    for (let x = -20; x <= 20; x++) {
      for (let y = -20; y <= 20; y++) {
        revealed.add(`${x},${y}`);
      }
    }
    this.setState({ fogRevealed: revealed });
  }

  render() {
    return html`
      <div class="map-canvas-container">
        <!-- Toolbar -->
        <div class="map-toolbar">
          <div class="map-tools">
            ${TOOLS.map(t => html`
              <button class=${`map-tool-btn ${this.state.activeTool === t.id ? 'active' : ''}`}
                      onClick=${() => this.setState({ activeTool: t.id, measureEnd: null })} title=${t.label}>${t.label}</button>
            `)}
          </div>
          <div class="map-controls">
            <button onClick=${() => this.setState(s => ({ showGrid: !s.showGrid }))}>
              ${this.state.showGrid ? '🔲' : '⬜'} Grid
            </button>
            <label class="grid-size-label">Size:
              <select value=${this.state.gridSize} onChange=${e => this.setState({ gridSize: parseInt(e.target.value) })}>
                <option value="5">5 ft</option>
                <option value="10">10 ft</option>
                <option value="15">15 ft</option>
              </select>
            </label>
            <select value=${this.state.background.id} onChange=${e => {
              const bg = BACKGROUNDS.find(b => b.id === e.target.value);
              if (bg) this.setState({ background: bg });
            }}>
              ${BACKGROUNDS.map(b => html`<option value=${b.id}>${b.name}</option>`)}
            </select>
            <button onClick=${this.revealAll.bind(this)}>🌫️ Reveal All</button>
            <button onClick=${this.clearMap.bind(this)}>🗑️ Clear</button>
            <span class="zoom-level">${Math.round(this.state.zoom * 100)}%</span>
          </div>
        </div>

        <!-- Canvas -->
        <div class="map-canvas-wrapper">
          <canvas ref=${c => this.canvasRef = c}
            class="map-canvas"
            onMouseDown=${this.handleMouseDown.bind(this)}
            onMouseMove=${this.handleMouseMove.bind(this)}
            onMouseUp=${this.handleMouseUp.bind(this)}
            onMouseLeave=${() => this.setState({ isDragging: false })}
            onWheel=${this.handleWheel.bind(this)}
          />
        </div>

        <!-- Token Dialog -->
        ${this.state.showTokenDialog && html`
          <div class="token-dialog">
            <h4>Add Token</h4>
            <input placeholder="Name" id="token-name-input" />
            <div class="token-type-row">
              <button onClick=${() => { const name = document.getElementById('token-name-input')?.value || 'Hero'; this.addToken(name, 'player'); }}>👤 Player</button>
              <button onClick=${() => { const name = document.getElementById('token-name-input')?.value || 'NPC'; this.addToken(name, 'npc'); }}>👹 NPC</button>
              <button onClick=${() => { const name = document.getElementById('token-name-input')?.value || 'Monster'; this.addToken(name, 'enemy'); }}>💀 Enemy</button>
            </div>
            <button class="token-cancel" onClick=${() => this.setState({ showTokenDialog: false })}>Cancel</button>
          </div>
        `}
      </div>
    `;
  }
}

export { MapCanvas };
