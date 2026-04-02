/**
 * src/game/dialogue-tree-expanded.ts
 * DMLog.ai - Advanced Dialogue System
 * 
 * Features: Branching, conditions, NPC personality, procedural generation, and state management.
 * Zero external dependencies.
 */

export interface DialogCondition {
  check: string;
  value: any;
}

export interface DialogAction {
  type: 'give' | 'take' | 'teleport' | 'flag' | 'quest';
  target: string;
  amount?: number;
}

export interface DialogChoice {
  text: string;
  nextId: string;
  conditions?: DialogCondition[];
}

export interface DialogNode {
  id: string;
  text: string;
  speaker: string;
  mood: string;
  conditions?: DialogCondition[];
  actions?: DialogAction[];
  choices: DialogChoice[];
  onEnter?: string;
  onExit?: string;
}

export interface DialogTree {
  id: string;
  npcId: string;
  nodes: Map<string, DialogNode>;
  startId: string;
  flags: Map<string, any>;
}

export class DialogueTreeEngine {
  private trees = new Map<string, DialogTree>();
  private activeNodes = new Map<string, string>();
  private histories = new Map<string, string[]>();

  // 1. createTree
  public createTree(npcId: string, startNodeId: string): DialogTree {
    const id = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tree: DialogTree = {
      id,
      npcId,
      startId: startNodeId,
      nodes: new Map<string, DialogNode>(),
      flags: new Map<string, any>()
    };
    this.trees.set(id, tree);
    return tree;
  }

  // 2. addNode
  public addNode(treeId: string, node: DialogNode): void {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);
    tree.nodes.set(node.id, node);
  }

  // 3. getNode
  public getNode(treeId: string, nodeId: string): DialogNode {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);
    const node = tree.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found in tree ${treeId}`);
    return node;
  }

  // 4. startDialog
  public startDialog(treeId: string): DialogNode {
    const tree = this.trees.get(treeId);
    if (!tree) throw new Error(`Tree ${treeId} not found`);
    
    const startNode = this.getNode(treeId, tree.startId);
    this.activeNodes.set(treeId, startNode.id);
    this.histories.set(treeId, [startNode.text]);
    
    if (startNode.actions) {
      this.executeActions(treeId, startNode.actions);
    }
    
    return startNode;
  }

  // 5. makeChoice
  public makeChoice(treeId: string, choiceIndex: number): DialogNode | null {
    const activeNodeId = this.activeNodes.get(treeId);
    if (!activeNodeId) return null;
    
    const currentNode = this.getNode(treeId, activeNodeId);
    const choice = currentNode.choices[choiceIndex];
    if (!choice) return null;

    // Verify conditions before proceeding
    if (choice.conditions) {
      for (const cond of choice.conditions) {
        if (!this.checkCondition(treeId, cond)) return null;
      }
    }

    const nextNode = this.getNode(treeId, choice.nextId);
    this.activeNodes.set(treeId, nextNode.id);

    if (nextNode.actions) {
      this.executeActions(treeId, nextNode.actions);
    }

    const history = this.histories.get(treeId) || [];
    history.push(nextNode.text);
    this.histories.set(treeId, history);

    return nextNode;
  }

  // 6. getAvailableChoices
  public getAvailableChoices(treeId: string): Array<{text: string; available: boolean}> {
    const activeNodeId = this.activeNodes.get(treeId);
    if (!activeNodeId) return [];
    
    const node = this.getNode(treeId, activeNodeId);
    return node.choices.map(choice => {
      let available = true;
      if (choice.conditions) {
        available = choice.conditions.every(cond => this.checkCondition(treeId, cond));
      }
      return { text: choice.text, available };
    });
  }

  // 7. checkCondition
  public checkCondition(treeId: string, condition: DialogCondition): boolean {
    const { check, value } = condition;
    switch (check) {
      case 'has-item': 
        return (this.getFlag(treeId, `item_${value}`) || 0) > 0;
      case 'has-gold': 
        return (this.getFlag(treeId, 'gold') || 0) >= Number(value);
      case 'quest-complete': 
        return this.getFlag(treeId, `quest_${value}`) === 'complete';
      case 'reputation': 
        return (this.getFlag(treeId, 'reputation') || 0) >= Number(value);
      case 'level': 
        return (this.getFlag(treeId, 'level') || 1) >= Number(value);
      case 'class': 
        return this.getFlag(treeId, 'class') === value;
      case 'race': 
        return this.getFlag(treeId, 'race') === value;
      case 'flag':
        if (typeof value === 'object' && value !== null) {
          return this.getFlag(treeId, value.key) === value.value;
        }
        return !!this.getFlag(treeId, value);
      default:
        return false;
    }
  }

  // 8. executeActions
  public executeActions(treeId: string, actions: DialogAction[]): string[] {
    const results: string[] = [];
    for (const act of actions) {
      const amount = act.amount ?? 1;
      switch (act.type) {
        case 'give':
          if (act.target === 'gold') {
            this.setFlag(treeId, 'gold', (this.getFlag(treeId, 'gold') || 0) + amount);
            results.push(`Received ${amount} gold.`);
          } else {
            this.setFlag(treeId, `item_${act.target}`, (this.getFlag(treeId, `item_${act.target}`) || 0) + amount);
            results.push(`Received ${amount}x ${act.target}.`);
          }
          break;
        case 'take':
          if (act.target === 'gold') {