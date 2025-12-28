import Dexie, { Table } from 'dexie';

export interface Spool {
    id?: number;
    serial: string; // Unique Identifier (UUID or Tag ID)

    // Basic Info
    brand: string;
    type: string;   // PLA, PETG, etc.
    color: string;
    colorHex?: string;

    // Weights (grams)
    weightRemaining: number;
    weightTotal: number;
    weightSpool?: number; // Tare weight of the empty spool

    // Physical Props
    diameter: number; // usually 1.75
    density?: number; // g/cm3

    // Printing Params
    temperatureNozzleMin?: number;
    temperatureNozzleMax?: number;
    temperatureBedMin?: number;
    temperatureBedMax?: number;

    // Traceability
    batchNumber?: string;
    productionDate?: string; // ISO Date

    // Metadata
    lastScanned?: number;
    detailUrl?: string; // Original URL if scanned via QR

    // Sync fields
    lastUpdated: number; // Timestamp of last modification (for sync)
    createdAt?: number;  // Timestamp of creation
    deleted?: boolean;   // Soft delete flag for sync
}

export class FilamentDatabase extends Dexie {
    spools!: Table<Spool, number>;

    constructor() {
        super('FilamentDB');
        // Note: IndexedDB is schematic-less for data fields, indexes just need to track the keys we query by.
        // Adding new fields to interface doesn't require schema version bump unless we want to INDEX them.
        this.version(1).stores({
            spools: '++id, &serial, brand, type, color, lastScanned'
        });

        // Version 2: Remove unique constraint on serial to allow duplicates (e.g. multiple generic spools)
        this.version(2).stores({
            spools: '++id, serial, brand, type, color, lastScanned'
        });

        // Version 3: Add lastUpdated index for sync functionality
        this.version(3).stores({
            spools: '++id, serial, brand, type, color, lastScanned, lastUpdated'
        }).upgrade(tx => {
            // Migrate existing spools: add lastUpdated timestamp
            return tx.table('spools').toCollection().modify(spool => {
                if (!spool.lastUpdated) {
                    spool.lastUpdated = spool.lastScanned || Date.now();
                }
            });
        });
    }
}

export const db = new FilamentDatabase();

// Helper functions that auto-update lastUpdated timestamp

export async function addSpool(spool: Omit<Spool, 'id' | 'lastUpdated'>) {
    return db.spools.add({
        ...spool,
        lastUpdated: Date.now()
    } as Spool);
}

export async function updateSpool(id: number, changes: Partial<Spool>) {
    return db.spools.update(id, {
        ...changes,
        lastUpdated: Date.now()
    });
}

export async function deleteSpool(id: number) {
    // Soft delete for sync support
    return db.spools.update(id, {
        deleted: true,
        lastUpdated: Date.now()
    });
}

export async function hardDeleteSpool(id: number) {
    // Actual deletion (use sparingly)
    return db.spools.delete(id);
}

// Get spools modified since a timestamp (for sync)
export async function getSpoolsModifiedSince(timestamp: number) {
    return db.spools
        .where('lastUpdated')
        .above(timestamp)
        .and(spool => !spool.deleted)
        .toArray();
}

// Get deleted spools since a timestamp (for sync)
export async function getDeletedSpoolsSince(timestamp: number) {
    return db.spools
        .where('lastUpdated')
        .above(timestamp)
        .and(spool => spool.deleted === true)
        .toArray();
}
