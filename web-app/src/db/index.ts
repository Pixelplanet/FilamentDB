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
    series?: string; // e.g. "PolyLite", "Prusament"
    type: string; // PLA, PETG, etc.
    color: string; // "Galaxy Black"
    colorHex?: string; // #000000
    // User Management
    ownerId?: string;
    visibility?: 'private' | 'public';
    finish?: 'plain' | 'glossy' | 'matte' | 'silk' | 'textured' | 'n/a';

    // Weights (g)
    weightTotal: number; // Nominal Net Weight
    weightRemaining: number;
    weightSpool: number; // Tare

    // Dimensions
    diameter: number;
    density: number;

    // Thermal
    temperatureNozzleMin: number;
    temperatureNozzleMax: number;
    temperatureBedMin: number;
    temperatureBedMax: number;
    temperatureChamberMin?: number;
    temperatureChamberMax?: number;
    temperatureChamberIdeal?: number;
    temperaturePreheat?: number; // New from Generator

    // Advanced Material Props (OpenPrintTag Spec)
    tags?: string[]; // Key 28
    gtin?: string; // Key 4
    countryOfOrigin?: string; // Key 55 (ISO 3166-1 alpha-2)
    transmissionDistance?: number; // Key 27
    shoreHardnessA?: number; // Key 31
    shoreHardnessD?: number; // Key 32

    // Spool Dimensions (mm)
    spoolWidth?: number; // Key 42
    spoolOuterDiameter?: number; // Key 43
    spoolInnerDiameter?: number; // Key 44
    spoolHoleDiameter?: number; // Key 45


    // Traceability
    batchNumber?: string;
    productionDate?: string; // ISO Date
    nfcTagSerial?: string;   // NFC Tag hardware serial number
    nfcTagHistory?: Array<{  // Complete history of tag associations
        timestamp: number;
        action: 'assigned' | 'reassigned' | 'removed';
        tagSerial: string;
        previousTagSerial?: string; // For reassignment
        notes?: string;
    }>;

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

export interface MaterialProfile {
    id: string; // UUID
    name: string; // e.g. "Polylactic Acid"
    type: string; // Abbreviation e.g. "PLA" - used as key
    density?: number;
    temperatureNozzleMin?: number;
    temperatureNozzleMax?: number;
    temperatureBedMin?: number;
    temperatureBedMax?: number;
}

/**
 * Filament Usage Log
 * 
 * Records consumption of filament for statistics and history.
 */
export interface UsageLog {
    id: string; // UUID
    spoolId: string;
    timestamp: number;
    amount: number; // Grams used (positive value)
    previousWeight: number;
    newWeight: number;
    action: 'print' | 'manual_adjustment' | 'correction' | 'initial_weight';
    notes?: string;
}
