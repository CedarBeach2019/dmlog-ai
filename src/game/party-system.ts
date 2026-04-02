/**
 * DMLog.ai - Party System
 *
 * This module manages party creation, member management, companion AI,
 * and group dynamics for a role-playing game. It tracks party stats,
 * member relationships (loyalty), and logs significant events.
 */

export interface PartyMember {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  abilities: string[];
  inventory: string[];
  personality: string;
  loyalty: number; // 0-100 scale
}

export interface Party {
  id: string;
  name: string;
  members: PartyMember[];
  leader: string; // PartyMember ID
  gold: number;
  reputation: number; // -100 (Hated) to 100 (Revered)
  active: boolean;
}

export interface PartyEvent {
  partyId: string;
  type: 'join' | 'leave' | 'level_up' | 'death' | 'conflict' | 'celebration';
  member: string; // PartyMember ID
  description: string;
  timestamp: string;
}

export class PartySystem {
  private parties: Map<string, Party> = new Map();
  private events: PartyEvent[] = [];

  // --- Private Helper Methods ---

  private _generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private _logEvent(
    partyId: string,
    type: PartyEvent['type'],
    memberId: string,
    description: string
  ): void {
    const event: PartyEvent = {
      partyId,
      type,
      member: memberId,
      description,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
  }

  private _getPartyOrThrow(partyId: string): Party {
    const party = this.parties.get(partyId);
    if (!party) {
      throw new Error(`Party with ID "${partyId}" not found.`);
    }
    return party;
  }

  private _getMemberOrThrow(party: Party, memberId: string): PartyMember {
    const member = party.members.find(m => m.id === memberId);
    if (!member) {
      throw new Error(`Member with ID "${memberId}" not found in party "${party.name}".`);
    }
    return member;
  }

  // --- Public API ---

  /** 1. Creates a new party with a founding member as the leader. */
  public createParty(name: string, leader: PartyMember): Party {
    const partyId = this._generateId();
    const newParty: Party = {
      id: partyId,
      name,
      members: [leader],
      leader: leader.id,
      gold: 100,
      reputation: 0,
      active: true,
    };
    this.parties.set(partyId, newParty);
    this._logEvent(partyId, 'join', leader.id, `${leader.name} formed the party "${name}".`);
    return newParty;
  }

  /** 2. Adds a new member to an existing party. */
  public addMember(partyId: string, member: PartyMember): void {
    const party = this._getPartyOrThrow(partyId);
    if (party.members.some(m => m.id === member.id)) {
      throw new Error(`Member with ID "${member.id}" already exists in the party.`);
    }
    party.members.push(member);
    this._logEvent(partyId, 'join', member.id, `${member.name} has joined the party.`);
  }

  /** 3. Removes a member from a party. Reassigns leader if necessary. */
  public removeMember(partyId: string, memberId: string): void {
    const party = this._getPartyOrThrow(partyId);
    const memberIndex = party.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      throw new Error(`Member with ID "${memberId}" not found.`);
    }
    const [removedMember] = party.members.splice(memberIndex, 1);
    this._logEvent(partyId, 'leave', memberId, `${removedMember.name} has left the party.`);

    if (party.members.length === 0) {
      party.active = false;
    } else if (party.leader === memberId) {
      party.leader = party.members[0].id; // Assign the next member as leader
    }
  }

  /** 4. Retrieves a party by its ID. */
  public getParty(partyId: string): Party {
    return this._getPartyOrThrow(partyId);
  }

  /** 5. Sets a new leader for the party. */
  public setLeader(partyId: string, memberId: string): void {
    const party = this._getPartyOrThrow(partyId);
    this._getMemberOrThrow(party, memberId); // Ensures member exists
    party.leader = memberId;
  }

  /** 6. Gets the current number of members in a party. */
  public getPartySize(partyId: string): number {
    return this._getPartyOrThrow(partyId).members.length;
  }

  /** 7. Calculates the average level of the party members. */
  public getAverageLevel(partyId: string): number {
    const party = this._getPartyOrThrow(partyId);
    if (party.members.length === 0) return 0;
    const totalLevel = party.members.reduce((sum, m) => sum + m.level, 0);
    return totalLevel / party.members.length;
  }

  /** 8. Calculates the total current HP of all party members. */
  public getTotalHP(partyId: string): number {
    const party = this._getPartyOrThrow(partyId);
    return party.members.reduce((sum, m) => sum + m.hp, 0);
  }

  /** 9. Gets the party's current gold total. */
  public getPartyGold(partyId: string): number {
    return this._getPartyOrThrow(partyId).gold;
  }

  /** 10. Adds gold to the party's treasury. */
  public addGold(partyId: string, amount: number): void {
    if (amount < 0) throw new Error("Cannot add a negative amount of gold.");
    const party = this._getPartyOrThrow(partyId);
    party.gold += amount;
  }

  /** 11. Spends gold from the party's treasury. Returns false if funds are insufficient. */
  public spendGold(partyId: string, amount: number): boolean {
    if (amount < 0) throw new Error("Cannot spend a negative amount of gold.");
    const party = this._getPartyOrThrow(partyId);
    if (party.gold < amount) {
      return false;
    }
    party.gold -= amount;
    return true;
  }

  /** 12. Adjusts a member's loyalty, clamping between 0 and 100. */
  public adjustLoyalty(partyId: string, memberId: string, amount: number): void {
    const party = this._getPartyOrThrow(partyId);
    const member = this._getMemberOrThrow(party, memberId);
    member.loyalty = Math.max(0, Math.min(100, member.loyalty + amount));
  }

  /** 13. Gets a specific member's loyalty. */
  public getLoyalty(partyId: string, memberId: string): number {
    const party = this._getPartyOrThrow(partyId);
    return this._getMemberOrThrow(party, memberId).loyalty;
  }

  /** 14. Checks for potential conflicts based on low loyalty or personality clashes. */
  public checkConflict(partyId: string): string | null {
    const party = this._getPartyOrThrow(partyId);
    const lowLoyaltyMember = party.members.find(m => m.loyalty < 25);
    if (lowLoyaltyMember) {
      return `${lowLoyaltyMember.name} is feeling disgruntled and may cause trouble.`;
    }

    const lawful = party.members.find(m => m.personality.includes('Lawful'));
    const chaotic = party.members.find(m => m.personality.includes('Chaotic'));
    if (lawful && chaotic) {
      return `${lawful.name} (Lawful) and ${chaotic.name} (Chaotic) are arguing over methods.`;
    }
    return null;
  }

  /** 15. Attempts to resolve an internal party conflict. */
  public resolveConflict(partyId: string, method: 'negotiate' | 'intimidate' | 'bribe'): string {
    const party = this._getPartyOrThrow(partyId);
    const target = party.members.find(m => m.loyalty < 25) || party.members[1];
    if (!target) return "No conflict to resolve.";

    let outcome = '';
    switch (method) {
      case 'negotiate':
        if (Math.random() > 0.4) {
          this.adjustLoyalty(partyId, target.id, 15);
          outcome = `A calm discussion has eased tensions with ${target.name}.`;
          this._logEvent(partyId, 'celebration', target.id, 'A conflict was resolved through negotiation.');
        } else {
          this.adjustLoyalty(partyId, target.id, -10);
          outcome = `Negotiations failed, worsening the mood of ${target.name}.`;
        }
        break;
      case 'intimidate':
        if (Math.random() > 0.6) {
          this.adjustLoyalty(partyId, target.id, 5);
          outcome = `${target.name} has been cowed into submission, for now.`;
        } else {
          this.adjustLoyalty(partyId, target.id, -20);
          outcome = `An attempt to intimidate ${target.name} backfired spectacularly.`;
          this._logEvent(partyId, 'conflict', target.id, 'A conflict escalated due to intimidation.');
        }
        break;
      case 'bribe':
        if (this.spendGold(partyId, 50)) {
          this.adjustLoyalty(partyId, target.id, 25);
          outcome = `${target.name}'s loyalty has been bought with 50 gold.`;
        } else {
          outcome = "You lack the gold to bribe anyone.";
        }
        break;
    }
    return outcome;
  }

  /** 16. Levels up a party member, increasing their stats. */
  public levelUp(partyId: string, memberId: string): void {
    const party = this._getPartyOrThrow(partyId);
    const member = this._getMemberOrThrow(party, memberId);
    member.level++;
    const hpGain = Math.floor(Math.random() * 8) + 2;
    member.maxHp += hpGain;
    member.hp = member.maxHp; // Full heal on level up
    this._logEvent(partyId, 'level_up', memberId, `${member.name} has reached level ${member.level}!`);
  }

  /** 17. Heals a party member for a given amount. */
  public heal(partyId: string, memberId: string, amount: number): void {
    const party = this._getPartyOrThrow(partyId);
    const member = this._getMemberOrThrow(party, memberId);
    if (member.hp <= 0) return; // Cannot heal the dead
    member.hp = Math.min(member.maxHp, member.hp + amount);
  }

  /** 18. Deals damage to a party member, returning their remaining HP. */
  public damage(partyId: string, memberId: string, amount: number): number {
    const party = this._getPartyOrThrow(partyId);
    const member = this._getMemberOrThrow(party, memberId);
    member.hp = Math.max(0, member.hp - amount);
    if (member.hp === 0) {
      this._logEvent(partyId, 'death', memberId, `${member.name} has fallen in battle.`);
    }
    return member.hp;
  }

  /** 19. Checks if a party member is alive. */
  public isAlive(partyId: string, memberId: string): boolean {
    const party = this._getPartyOrThrow(partyId);
    return this._getMemberOrThrow(party, memberId).hp > 0;
  }

  /** 20. Returns an array of all dead members in the party. */
  public getDeadMembers(partyId: string):