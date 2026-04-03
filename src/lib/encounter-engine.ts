/**
 * encounter-engine.ts — PLATO TUTOR-inspired branching encounter engine for D&D.
 *
 * Each encounter is a directed graph of "units" (story beats). Player responses
 * trigger conditional jumps — just like TUTOR's "ans" evaluation with help loops,
 * retry counters, and fail-forward paths.
 *
 * Author: Superinstance & Lucineer (DiGennaro et al.)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncounterChoice {
  text: string;
  nextUnit: string;
  condition?: string; // e.g. "perception >= 15"
}

export interface EncounterUnit {
  id: string;
  type: 'narration' | 'choice' | 'combat' | 'skill_check' | 'help' | 'terminal';
  content: string;
  choices?: EncounterChoice[];
  onSuccess?: string;
  onFail?: string;
  onHelp?: string;
  retryCount?: number; // max retries before fail-forward (like PLATO's n1)
  dc?: number; // difficulty class for skill checks
  skill?: string; // skill name for skill checks
}

export interface EncounterGraph {
  id: string;
  name: string;
  nodes: Record<string, EncounterUnit>;
  startUnit: string;
  createdAt: number;
}

export interface EncounterState {
  encounterId: string;
  currentUnit: string;
  history: Array<{ unit: string; choice?: string; result?: string; timestamp: number }>;
  retries: Record<string, number>; // unit id → attempt count
  helpUsed: string[];
  completed: boolean;
  startedAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Graph validation — ensure no dead-ends (fail-forward)
// ---------------------------------------------------------------------------

export function validateGraph(graph: EncounterGraph): string[] {
  const errors: string[] = [];
  for (const [id, unit] of Object.entries(graph.nodes)) {
    if (unit.type === 'terminal') continue;
    // Every non-terminal must have at least one exit
    const hasChoices = unit.choices && unit.choices.length > 0;
    const hasOnSuccess = !!unit.onSuccess;
    const hasOnFail = !!unit.onFail;
    if (!hasChoices && !hasOnSuccess && !hasOnFail) {
      errors.push(`Unit "${id}" has no exit path — violates fail-forward`);
    }
    // Verify targets exist
    if (unit.choices) {
      for (const c of unit.choices) {
        if (!graph.nodes[c.nextUnit]) errors.push(`Unit "${id}" references missing unit "${c.nextUnit}"`);
      }
    }
    if (unit.onSuccess && !graph.nodes[unit.onSuccess]) errors.push(`Unit "${id}" onSuccess targets missing "${unit.onSuccess}"`);
    if (unit.onFail && !graph.nodes[unit.onFail]) errors.push(`Unit "${id}" onFail targets missing "${unit.onFail}"`);
    if (unit.onHelp && !graph.nodes[unit.onHelp]) errors.push(`Unit "${id}" onHelp targets missing "${unit.onHelp}"`);
  }
  // Verify start unit exists
  if (!graph.nodes[graph.startUnit]) errors.push(`startUnit "${graph.startUnit}" not found`);
  return errors;
}

// ---------------------------------------------------------------------------
// Evaluate a simple condition string (e.g. "perception >= 15")
// ---------------------------------------------------------------------------

export function evaluateCondition(condition: string, context: Record<string, number>): boolean {
  try {
    const expr = condition.replace(/(\w+)\s*([><=!]+)\s*(\d+)/g, (_, key, op, val) => {
      return `${context[key] ?? 0} ${op} ${val}`;
    });
    // eslint-disable-next-line no-eval
    return eval(expr);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Advance to next unit, handling skill checks, retries, and fail-forward
// ---------------------------------------------------------------------------

export function advance(
  graph: EncounterGraph,
  state: EncounterState,
  choiceText?: string,
  checkResult?: { success: boolean; roll?: number }
): { unit: EncounterUnit; state: EncounterState; message?: string } {
  const current = graph.nodes[state.currentUnit];
  if (!current) throw new Error(`Current unit "${state.currentUnit}" not found`);

  const now = Date.now();
  state.updatedAt = now;

  // Record history
  state.history.push({
    unit: state.currentUnit,
    choice: choiceText,
    result: checkResult?.success ? 'success' : checkResult ? 'fail' : undefined,
    timestamp: now,
  });

  // --- Skill check units ---
  if (current.type === 'skill_check' && checkResult) {
    const retries = (state.retries[state.currentUnit] || 0) + 1;
    state.retries[state.currentUnit] = retries;

    if (checkResult.success) {
      const nextId = current.onSuccess;
      if (nextId) {
        state.currentUnit = nextId;
        return { unit: graph.nodes[nextId], state, message: 'Success!' };
      }
    } else {
      // Retry or fail-forward
      const maxRetries = current.retryCount ?? 2;
      if (retries < maxRetries) {
        return { unit: current, state, message: `Failed. ${maxRetries - retries} attempt(s) remaining.` };
      }
      if (current.onFail) {
        state.currentUnit = current.onFail;
        return { unit: graph.nodes[current.onFail], state, message: 'Fail-forward triggered.' };
      }
    }
  }

  // --- Choice units ---
  if (current.type === 'choice' && choiceText && current.choices) {
    const match = current.choices.find(c => c.text.toLowerCase().includes(choiceText.toLowerCase()));
    if (match) {
      if (match.condition && !evaluateCondition(match.condition, {})) {
        return { unit: current, state, message: `You can't do that right now.` };
      }
      state.currentUnit = match.nextUnit;
      return { unit: graph.nodes[match.nextUnit], state };
    }
    // No matching choice — stay put with hint
    return { unit: current, state, message: 'That\'s not an option. Try something else.' };
  }

  // --- Combat units (simplified — just advance on success/fail) ---
  if (current.type === 'combat' && checkResult) {
    if (checkResult.success && current.onSuccess) {
      state.currentUnit = current.onSuccess;
      return { unit: graph.nodes[current.onSuccess], state, message: 'Victory!' };
    }
    if (!checkResult.success && current.onFail) {
      state.currentUnit = current.onFail;
      return { unit: graph.nodes[current.onFail], state, message: 'Defeat...' };
    }
  }

  // --- Terminal ---
  if (current.type === 'terminal') {
    state.completed = true;
    return { unit: current, state };
  }

  // --- Narration — auto-advance to first choice or onSuccess ---
  if (current.type === 'narration') {
    if (current.onSuccess) {
      state.currentUnit = current.onSuccess;
      return { unit: graph.nodes[current.onSuccess], state };
    }
    state.completed = true;
    return { unit: current, state };
  }

  return { unit: current, state };
}

// ---------------------------------------------------------------------------
// Help loop — navigate to help unit, then return
// ---------------------------------------------------------------------------

export function triggerHelp(
  graph: EncounterGraph,
  state: EncounterState
): { unit: EncounterUnit; state: EncounterState } {
  const current = graph.nodes[state.currentUnit];
  if (!current?.onHelp) {
    return { unit: current, state };
  }
  state.helpUsed.push(state.currentUnit);
  state.currentUnit = current.onHelp;
  state.updatedAt = Date.now();
  return { unit: graph.nodes[current.onHelp], state };
}

// ---------------------------------------------------------------------------
// Return from help to previous unit
// ---------------------------------------------------------------------------

export function returnFromHelp(
  graph: EncounterGraph,
  state: EncounterState
): { unit: EncounterUnit; state: EncounterState } {
  if (state.helpUsed.length === 0) {
    return { unit: graph.nodes[state.currentUnit], state };
  }
  const previousUnit = state.helpUsed.pop()!;
  state.currentUnit = previousUnit;
  state.updatedAt = Date.now();
  return { unit: graph.nodes[previousUnit], state };
}

// ---------------------------------------------------------------------------
// KV persistence helpers
// ---------------------------------------------------------------------------

export function stateKey(encounterId: string): string {
  return `encounter:state:${encounterId}`;
}

export function graphKey(encounterId: string): string {
  return `encounter:graph:${encounterId}`;
}

// ---------------------------------------------------------------------------
// Generate a visual DOT-style representation of the encounter graph
// ---------------------------------------------------------------------------

export function graphToDot(graph: EncounterGraph): string {
  let dot = `digraph "${graph.name}" {\n  rankdir=TB;\n`;
  const colors: Record<string, string> = {
    narration: '#6366f1',
    choice: '#f59e0b',
    combat: '#ef4444',
    skill_check: '#10b981',
    help: '#8b5cf6',
    terminal: '#6b7280',
  };
  for (const [id, unit] of Object.entries(graph.nodes)) {
    const color = colors[unit.type] || '#6b7280';
    const shape = unit.type === 'terminal' ? 'doublecircle' : unit.type === 'choice' ? 'diamond' : 'box';
    const label = unit.content.slice(0, 30).replace(/"/g, '\\"');
    dot += `  "${id}" [shape=${shape}, style=filled, fillcolor="${color}", fontcolor=white, label="${id}\\n${label}"];\n`;
  }
  for (const [id, unit] of Object.entries(graph.nodes)) {
    if (unit.choices) {
      for (const c of unit.choices) {
        dot += `  "${id}" -> "${c.nextUnit}" [label="${c.text.slice(0, 20).replace(/"/g, '')}"];\n`;
      }
    }
    if (unit.onSuccess) dot += `  "${id}" -> "${unit.onSuccess}" [color=green, label="success"];\n`;
    if (unit.onFail) dot += `  "${id}" -> "${unit.onFail}" [color=red, label="fail"];\n`;
    if (unit.onHelp) dot += `  "${id}" -> "${unit.onHelp}" [color=purple, style=dashed, label="help"];\n`;
  }
  dot += '}\n';
  return dot;
}

// ---------------------------------------------------------------------------
// Generate a simple ASCII tree representation
// ---------------------------------------------------------------------------

export function graphToAscii(graph: EncounterGraph): string {
  const visited = new Set<string>();
  const lines: string[] = [];
  lines.push(`📍 ${graph.name}`);
  lines.push('');

  function walk(unitId: string, prefix: string) {
    if (visited.has(unitId)) {
      lines.push(`${prefix}↩ ${unitId} (loop)`);
      return;
    }
    visited.add(unitId);
    const unit = graph.nodes[unitId];
    if (!unit) return;
    const icon: Record<string, string> = {
      narration: '📖', choice: '🔀', combat: '⚔️', skill_check: '🎯', help: '💡', terminal: '🏁',
    };
    lines.push(`${prefix}${icon[unit.type] || '📍'} ${unitId} [${unit.type}]`);
    lines.push(`${prefix}   "${unit.content.slice(0, 60)}..."`);
    if (unit.choices) {
      for (const c of unit.choices) {
        lines.push(`${prefix}   → "${c.text}" → ${c.nextUnit}`);
      }
    }
    if (unit.onSuccess) lines.push(`${prefix}   ✅ success → ${unit.onSuccess}`);
    if (unit.onFail) lines.push(`${prefix}   ❌ fail → ${unit.onFail}`);
    if (unit.onHelp) lines.push(`${prefix}   💡 help → ${unit.onHelp}`);
    lines.push('');

    // Follow first unvisited edge
    if (unit.choices?.[0]) walk(unit.choices[0].nextUnit, prefix + '  ');
    else if (unit.onSuccess) walk(unit.onSuccess, prefix + '  ');
  }

  walk(graph.startUnit, '');
  return lines.join('\n');
}
