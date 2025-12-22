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
    }
}

export const db = new FilamentDatabase();
