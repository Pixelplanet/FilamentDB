/**
 * Tombstone System for Sync Deletions
 * 
 * When a spool is deleted, instead of just removing the file, we create a "tombstone"
 * record that indicates the deletion. This allows sync to properly propagate deletions
 * across devices.
 * 
 * Structure:
 * - data/spools/.deleted/{serial}.json - Contains tombstone records
 * - Tombstones are kept for 30 days then can be purged
 */

import { promises as fs } from 'fs';
import path from 'path';

// Tombstone record structure
export interface Tombstone {
    serial: string;
    deletedAt: number;      // Unix timestamp
    deletedBy?: string;     // Device ID or user ID that performed deletion
    originalOwnerId?: string; // Owner of the spool before deletion
}

// Directory for tombstones (relative to SPOOLS_DIR)
export const TOMBSTONES_SUBDIR = '.deleted';

// How long to keep tombstones (30 days in milliseconds)
export const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * Get the path to the tombstones directory
 */
export function getTombstonesDir(spoolsDir: string): string {
    return path.join(spoolsDir, TOMBSTONES_SUBDIR);
}

/**
 * Ensure the tombstones directory exists
 */
export async function ensureTombstonesDir(spoolsDir: string): Promise<void> {
    const tombstonesDir = getTombstonesDir(spoolsDir);
    try {
        await fs.access(tombstonesDir);
    } catch {
        await fs.mkdir(tombstonesDir, { recursive: true });
    }
}

/**
 * Create a tombstone for a deleted spool
 */
export async function createTombstone(
    spoolsDir: string,
    serial: string,
    deletedBy?: string,
    originalOwnerId?: string
): Promise<Tombstone> {
    await ensureTombstonesDir(spoolsDir);

    const tombstone: Tombstone = {
        serial,
        deletedAt: Date.now(),
        deletedBy,
        originalOwnerId
    };

    const tombstonePath = path.join(getTombstonesDir(spoolsDir), `${serial}.json`);
    await fs.writeFile(tombstonePath, JSON.stringify(tombstone, null, 2), 'utf-8');

    console.log(`[Tombstone] Created for serial: ${serial}`);

    return tombstone;
}

/**
 * Get a tombstone by serial number
 */
export async function getTombstone(spoolsDir: string, serial: string): Promise<Tombstone | null> {
    const tombstonePath = path.join(getTombstonesDir(spoolsDir), `${serial}.json`);

    try {
        const content = await fs.readFile(tombstonePath, 'utf-8');
        return JSON.parse(content) as Tombstone;
    } catch {
        return null;
    }
}

/**
 * Get all tombstones
 */
export async function getAllTombstones(spoolsDir: string): Promise<Tombstone[]> {
    const tombstonesDir = getTombstonesDir(spoolsDir);

    try {
        await ensureTombstonesDir(spoolsDir);
        const files = await fs.readdir(tombstonesDir);
        const tombstones: Tombstone[] = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            try {
                const content = await fs.readFile(path.join(tombstonesDir, file), 'utf-8');
                const tombstone = JSON.parse(content) as Tombstone;
                tombstones.push(tombstone);
            } catch (error) {
                console.error(`Error reading tombstone file ${file}:`, error);
            }
        }

        return tombstones;
    } catch {
        return [];
    }
}

/**
 * Delete a tombstone (used when a spool is recreated or after sync confirmation)
 */
export async function deleteTombstone(spoolsDir: string, serial: string): Promise<boolean> {
    const tombstonePath = path.join(getTombstonesDir(spoolsDir), `${serial}.json`);

    try {
        await fs.unlink(tombstonePath);
        console.log(`[Tombstone] Removed for serial: ${serial}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Purge old tombstones (older than TOMBSTONE_TTL)
 */
export async function purgeTombstones(spoolsDir: string): Promise<number> {
    const tombstones = await getAllTombstones(spoolsDir);
    const now = Date.now();
    let purgedCount = 0;

    for (const tombstone of tombstones) {
        if (now - tombstone.deletedAt > TOMBSTONE_TTL) {
            const deleted = await deleteTombstone(spoolsDir, tombstone.serial);
            if (deleted) purgedCount++;
        }
    }

    if (purgedCount > 0) {
        console.log(`[Tombstone] Purged ${purgedCount} old tombstones`);
    }

    return purgedCount;
}
