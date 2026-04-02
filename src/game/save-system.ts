// src/game/save-system.ts

/**
 * Represents the full data structure of a single save game.
 */
interface SaveData {
    id: string; // Unique identifier for the save
    campaignId: string; // Identifier for the campaign this save belongs to
    name: string; // User-friendly name for the save (e.g., "Chapter 3 - Before Boss")
    version: number; // Schema version of the 'data' payload, for migration purposes
    timestamp: string; // ISO 8601 string (e.g., "2023-10-27T10:00:00.000Z")
    data: Record<string, unknown>; // The actual game state data
    size: number; // Approximate size of the 'data' payload in bytes
    checksum: string; // Simple hash of JSON.stringify(data) for integrity verification
}

/**
 * Represents a simplified view of a save game, suitable for listing in UI.
 */
interface SaveSlot {
    id