export interface Session {
  id: string;
  number: number;
  date: number;
  duration: number;
  summary: string;
  xpAwarded: number;
  encounters: string[];
  decisions: string[];
  notes: string;
}

export interface Campaign {
  id: string;
  name: string;
  setting: string;
  tone: string;
  partyId: string;
  sessions: Session[];
  activeQuests: string[];
  completedQuests: string[];
  worldState: Map<string, any>;
  notes: string[];
  createdAt: number;
  updatedAt: number;
  level: number;
}

export class CampaignManager {
  private campaigns = new Map<string, Campaign>();
  private activeId: string | null = null;

  // --- 1. Create Campaign ---
  public createCampaign(name: string, setting: string, tone: string): Campaign {
    const id = this.generateId();
    const campaign: Campaign = {
      id,
      name,
      setting,
      tone,
      partyId: "",
      sessions: [],
      activeQuests: [],
      completedQuests: [],
      worldState: new Map<string, any>(),
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      level: 1
    };
    
    this.campaigns.set(id, campaign);
    if (!this.activeId) this.activeId = id;
    return campaign;
  }

  // --- 2. Get Campaign ---
  public getCampaign(id: string): Campaign {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new Error(`Campaign with ID '${id}' not found.`);
    return campaign;
  }

  // --- 3. Set Active ---
  public setActive(id: string): void {
    if (!this.campaigns.has(id)) throw new Error(`Campaign with ID '${id}' not found.`);
    this.activeId = id;
  }

  // --- 4. Get Active ---
  public getActive(): Campaign | null {
    if (!this.activeId) return null;
    return this.campaigns.get(this.activeId) || null;
  }

  // --- 5. Start Session ---
  public startSession(campaignId: string): Session {
    const campaign = this.getCampaign(campaignId);
    const session: Session = {
      id: this.generateId(),
      number: campaign.sessions.length + 1,
      date: Date.now(),
      duration: 0,
      summary: "",
      xpAwarded: 0,
      encounters: [],
      decisions: [],
      notes: ""
    };
    
    campaign.sessions.push(session);
    this.touch(campaign);
    return session;
  }

  // --- 6. End Session ---
  public endSession(
    campaignId: string, 
    summary: string, 
    xp: number, 
    encounters: string[], 
    decisions: string[]
  ): Session {
    const campaign = this.getCampaign(campaignId);
    const session = campaign.sessions[campaign.sessions.length - 1];
    
    if (!session) throw new Error("No active session found to end.");
    if (session.duration > 0) throw new Error("Latest session is already ended.");

    session.duration = Date.now() - session.date;
    session.summary = summary;
    session.xpAwarded = xp;
    session.encounters = encounters;
    session.decisions = decisions;
    
    this.touch(campaign);
    return session;
  }

  // --- 7. Get Session History ---
  public getSessionHistory(campaignId: string): Session[] {
    return this.getCampaign(campaignId).sessions;
  }

  // --- 8. Get Latest Session ---
  public getLatestSession(campaignId: string): Session | null {
    const sessions = this.getCampaign(campaignId).sessions;
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  }

  // --- 9. Add Quest ---
  public addQuest(campaignId: string, questId: string): void {
    const campaign = this.getCampaign(campaignId);
    if (!campaign.activeQuests.includes(questId) && !campaign.completedQuests.includes(questId)) {
      campaign.activeQuests.push(questId);
      this.touch(campaign);
    }
  }

  // --- 10. Complete Quest ---
  public completeQuest(campaignId: string, questId: string): void {
    const campaign = this.getCampaign(campaignId);
    const index = campaign.activeQuests.indexOf(questId);
    
    if (index !== -1) {
      campaign.activeQuests.splice(index, 1);
      campaign.completedQuests.push(questId);
      this.touch(campaign);
    }
  }

  // --- 11. Get Active Quests ---
  public getActiveQuests(campaignId: string): string[] {
    return this.getCampaign(campaignId).activeQuests;
  }

  // --- 12. Set World State ---
  public setWorldState(campaignId: string, key: string, value: any): void {
    const campaign = this.getCampaign(campaignId);
    campaign.worldState.set(key, value);
    this.touch(campaign);
  }

  // --- 13. Get World State ---
  public getWorldState(campaignId: string, key: string): any {
    return this.getCampaign(campaignId).worldState.get(key);
  }

  // --- 14. Add Note ---
  public addNote(campaignId: string, note: string): void {
    const campaign = this.getCampaign(campaignId);
    campaign.notes.push(note);
    this.touch(campaign);
  }

  // --- 15. Get Campaign Summary ---
  public getCampaignSummary(campaignId: string): string {
    const c = this.getCampaign(campaignId);
    const created = new Date(c.createdAt).toLocaleDateString();
    const updated = new Date(c.updatedAt).toLocaleDateString();
    
    return `
=========================================
Campaign: ${c.name}
Setting: ${c.setting} | Tone: ${c.tone}
Party Level: ${c.level}
=========================================
Sessions Played: ${c.sessions.length}
Active Quests: ${c.activeQuests.length}
Completed Quests: ${c.completedQuests.length}
Created: ${created} | Last Updated: ${updated}
=========================================`.trim();
  }

  // --- 16. Get Party Level ---
  public getPartyLevel(campaignId: string): number {
    return this.getCampaign(campaignId).level;
  }

  // --- 17. Advance Level ---
  public advanceLevel(campaignId: string): void {
    const campaign = this.getCampaign(campaignId);
    campaign.level += 1;
    this.touch(campaign);
  }

  // --- 18. Get Campaign Timeline ---
  public getCampaignTimeline(campaignId: string): string {
    const c = this.getCampaign(campaignId);
    if (c.sessions.length === 0) return "No sessions recorded yet.";
    
    return c.sessions.map(s => {
      const dateStr = new Date(s.date).toLocaleDateString();
      const status = s.duration === 0 ? "(In Progress)" : `(${Math.round(s.duration / 60000)} mins)`;
      return `Session ${s.number} - ${dateStr} ${status}\n  Summary: ${s.summary || "Pending..."}\n  XP Awarded: ${s.xpAwarded}`;
    }).join('\n\n');
  }

  // --- 19. Get All Campaigns ---
  public getAllCampaigns(): Campaign[] {
    return Array.from(this.campaigns.values());
  }

  // --- 20. Serialize / Deserialize ---
  public serialize(): string {
    const serializedCampaigns = Array.from(this.campaigns.values()).map(c => ({
      ...c,
      worldState: Array.from(c.worldState.entries()) // Convert Map to Array of Tuples for JSON
    }));

    return JSON.stringify({
      activeId: this.activeId,
      campaigns: serializedCampaigns
    });
  }

  public deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.campaigns.clear();
      this.activeId = parsed.activeId || null;

      if (Array.isArray(parsed.campaigns)) {
        for (const cData of parsed.campaigns) {
          const campaign: Campaign = {
            ...cData,
            worldState: new Map(cData.worldState || []) // Restore Map from Tuples
          };
          this.campaigns.set(campaign.id, campaign);
        }
      }
    } catch (error) {
      throw new Error("Failed to deserialize campaign data.");
    }
  }

  // --- Private Helpers ---
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  private touch(campaign: Campaign): void {
    campaign.updatedAt = Date.now();
  }
}