/**
 * Spool Type Definition
 * 
 * Core data structure for filament spools
 * Used by file-based storage system
 */

export interface Spool {
    id?: number; // Legacy field, not used in file storage
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
    notes?: string;     // User notes

    // Sync fields
    lastUpdated: number; // Timestamp of last modification (for sync)
    createdAt?: number;  // Timestamp of creation
    deleted?: boolean;   // Soft delete flag for sync
}

/**
 * NFC Tag Data Interface
 * Data structure from NFC tags (e.g., OpenPrintTag)
 */
export interface NFCTagData {
    brand?: string;
    type?: string;
    color?: string;
    colorHex?: string;
    weight?: number;
    diameter?: number;
    temperatureNozzleMin?: number;
    temperatureNozzleMax?: number;
    temperatureBedMin?: number;
    temperatureBedMax?: number;
    density?: number;
    batchNumber?: string;
    productionDate?: string;
}
