// src/core/a2a-handler.ts

declare const crypto: {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};

export interface AgentIdentity {
  id: string;
  name: string;
  capabilities: string[];
  publicKey?: string;
  endpoint?: string;
}

export interface A2AMessage {
  id: string;
  from: AgentIdentity;
  to: AgentIdentity;
  type: 'request' | 'response' | 'event' | 'handoff' | 'broadcast';
  payload: any;
  privacy: 'public' | 'shared' | 'private';
  timestamp: number;
  signature?: string;
  correlationId?: string;
  ttl?: number;
}

export interface A2AResponse {
  success: boolean;
  data?: any;
  error?: string;
  correlationId?: string;
}

export class A2AHandler {
  public agents: Map<string, AgentIdentity> = new Map();
  public inbox: A2AMessage[] = [];
  public sent: A2AMessage[] = [];
  public sharedSecrets: Map<string, string> = new Map();

  public registerAgent(agent: AgentIdentity): void {
    this.agents.set(agent.id, agent);
  }

  public unregisterAgent(id: string): void {
    this.agents.delete(id);
    this.sharedSecrets.delete(id);
    // Clean up messages involving the unregistered agent
    this.inbox = this.inbox.filter(m => m.from.id !== id && m.to.id !== id);
    this.sent = this.sent.filter(m => m.from.id !== id && m.to.id !== id);
  }

  public getAgent(id: string): AgentIdentity | undefined {
    return this.agents.get(id);
  }

  public listAgents(): AgentIdentity[] {
    return Array.from(this.agents.values());
  }

  public send(fromId: string, toId: string, type: A2AMessage['type'], payload: any, privacy: A2AMessage['privacy']): A2AMessage {
    const from = this.getAgent(fromId);
    const to = this.getAgent(toId);
    if (!from) throw new Error(`Sender agent not found: ${fromId}`);
    if (!to) throw new Error(`Recipient agent not found: ${toId}`);

    const message: A2AMessage = {
      id: crypto.getRandomValues(new Uint8Array(16)).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), ''),
      from, to, type, payload, privacy,
      timestamp: Date.now(),
      ttl: 3600000 // default 1 hour
    };

    if (privacy === 'shared' || privacy === 'private') {
      const secret = this.sharedSecrets.get(toId) || this.sharedSecrets.get(fromId);
      if (secret) message.signature = this.sign(message, secret);
    }

    this.sent.push(message);
    this.inbox.push(message);
    return message;
  }

  public broadcast(fromId: string, type: A2AMessage['type'], payload: any): A2AMessage[] {
    const messages: A2AMessage[] = [];
    for (const agent of this.agents.values()) {
      if (agent.id !== fromId) {
        messages.push(this.send(fromId, agent.id, type, payload, 'public'));
      }
    }
    return messages;
  }

  public receive(agentId: string): A2AMessage[] {
    const messages = this.inbox.filter(m => m.to.id === agentId);
    this.inbox = this.inbox.filter(m => m.to.id !== agentId);
    return messages;
  }

  public respond(originalMessage: A2AMessage, payload: any): A2AMessage {
    const response = this.send(originalMessage.to.id, originalMessage.from.id, 'response', payload, originalMessage.privacy);
    response.correlationId = originalMessage.id;
    return response;
  }

  public createHandoff(fromId: string, toId: string, context: any, privacy: A2AMessage['privacy']): A2AMessage {
    return this.send(fromId, toId, 'handoff', context, privacy);
  }

  public async receiveHandoff(message: A2AMessage): Promise<A2AResponse> {
    if (message.type !== 'handoff') {
      return { success: false, error: 'Invalid message type: not a handoff', correlationId: message.id };
    }

    const isVerified = await this.verify(message);
    if (message.privacy !== 'public' && !isVerified) {
      return { success: false, error: 'Signature verification failed', correlationId: message.id };
    }

    // In a full implementation, we would apply the context to the receiving agent here.
    return { success: true, data: message.payload, correlationId: message.id };
  }

  public async sign(message: A2AMessage, secret: string): Promise<string> {
    const dataToSign = `${message.id}:${message.from.id}:${message.to.id}:${JSON.stringify(message.payload)}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async verify(message: A2AMessage): Promise<boolean> {
    if (!message.signature) return message.privacy === 'public';

    const secret = this.sharedSecrets.get(message.from.id) || this.sharedSecrets.get(message.to.id);
    if (!secret) return false;

    const expectedSignature = await this.sign(message, secret);
    return expectedSignature === message.signature;
  }

  public setSharedSecret(agentId: string, secret: string): void {
    this.sharedSecrets.set(agentId, secret);
  }

  public getInboxCount(agentId: string): number {
    return this.inbox.filter(m => m.to.id === agentId).length;
  }

  public getConversation(agentId: string, otherId: string): A2AMessage[] {
    return this.inbox.filter(m => 
      (m.from.id === agentId && m.to.id === otherId) || 
      (m.from.id === otherId && m.to.id === agentId)
    );
  }

  public expireMessages(): number {
    const now = Date.now();
    const initialLength = this.inbox.length;
    this.inbox = this.inbox.filter(m => !m.ttl || (now - m.timestamp < m.ttl));
    return initialLength - this.inbox.length;
  }

  public serialize(): string {
    return JSON.stringify({
      agents: Array.from(this.agents.entries()),
      inbox: this.inbox,
      sent: this.sent,
      sharedSecrets: Array.from(this.sharedSecrets.entries())
    });
  }

  public deserialize(json: string): void {
    try {
      const state = JSON.parse(json);
      if (state.agents) this.agents = new Map(state.agents);
      if (state.inbox) this.inbox = state.inbox;
      if (state.sent) this.sent = state.sent;
      if (state.sharedSecrets) this.sharedSecrets = new Map(state.sharedSecrets);
    } catch (error) {
      throw new Error('Failed to deserialize A2A state');
    }
  }
}