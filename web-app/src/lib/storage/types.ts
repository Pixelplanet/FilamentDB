/**
 * Storage Types & Interfaces
 * 
 * Defines the core types for the file-based storage system
 */

import { Spool } from '@/db';

/**
 * Storage interface that abstracts file operations
 * Works on both web (API-based) and mobile (FS API)
 */
export interface ISpoolStorage {
    // ===== CRUD Operations =====

    /**
     * Get a single spool by serial number
     * @param serial - Unique serial identifier
     * @returns Spool object or null if not found
     */
    getSpool(serial: string): Promise<Spool | null>;

    /**
     * List all spools
     * @returns Array of all spools
     */
    listSpools(): Promise<Spool[]>;

    /**
     * Save a spool (create or update)
     * @param spool - Spool object to save
     * @param preserveTimestamp - If true, preserve the spool's lastUpdated field (for sync downloads)
     * @returns void
     */
    saveSpool(spool: Spool, preserveTimestamp?: boolean): Promise<void>;

    /**
     * Delete a spool by serial number
     * @param serial - Unique serial identifier
     * @returns void
     */
    deleteSpool(serial: string): Promise<void>;

    // ===== Batch Operations =====

    /**
     * Save multiple spools at once
     * @param spools - Array of spools to save
     * @returns void
     */
    saveSpools(spools: Spool[]): Promise<void>;

    /**
     * Delete multiple spools at once
     * @param serials - Array of serial numbers
     * @returns void
     */
    deleteSpools(serials: string[]): Promise<void>;

    // ===== Query Operations =====

    /**
     * Search spools by text query
     * Searches across brand, type, color, and notes
     * @param query - Search text
     * @returns Array of matching spools
     */
    searchSpools(query: string): Promise<Spool[]>;

    /**
     * Filter spools by criteria
     * @param filters - Filter criteria
     * @returns Array of matching spools
     */
    filterSpools(filters: SpoolFilters): Promise<Spool[]>;

    // ===== Metadata =====

    /**
     * Get last modified timestamp for a spool
     * @param serial - Unique serial identifier
     * @returns Unix timestamp (milliseconds) or null
     */
    getLastModified(serial: string): Promise<number | null>;

    /**
     * Get storage statistics
     * @returns Storage stats
     */
    getStats(): Promise<StorageStats>;

    // ===== Import/Export =====

    /**
     * Export all spools as a backup
     * @returns Blob containing ZIP of all JSON files
     */
    exportAll(): Promise<Blob>;

    /**
     * Import spools from a backup
     * @param data - Blob containing ZIP of JSON files
     * @returns Import result
     */
    importAll(data: Blob): Promise<ImportResult>;

    // ===== Usage History =====

    /**
     * Get usage history for a spool
     * @param serial - Serial number
     */
    getUsageHistory(serial: string): Promise<import('@/db').UsageLog[]>;

    /**
     * Log filament usage
     * @param log - Usage log entry
     */
    logUsage(log: import('@/db').UsageLog): Promise<void>;

    // ===== Recycling Bin =====

    /**
     * List deleted spools (in recycling bin)
     */
    listDeletedSpools(): Promise<Spool[]>;

    /**
     * Restore a deleted spool from recycling bin
     * @param serial - Serial number
     */
    restoreSpool(serial: string): Promise<void>;

    /**
     * Permanently delete a spool (remove from recycling bin)
     * @param serial - Serial number
     */
    permanentlyDeleteSpool(serial: string): Promise<void>;
}

/**
 * Filter criteria for spools
 */
export interface SpoolFilters {
    type?: string;           // Filter by material type (PLA, PETG, etc)
    brand?: string;          // Filter by brand
    color?: string;          // Filter by color name
    minWeight?: number;      // Minimum remaining weight
    maxWeight?: number;      // Maximum remaining weight
    isEmpty?: boolean;       // Show only empty spools
    hasNotes?: boolean;      // Show only spools with notes
}

/**
 * Storage statistics
 */
export interface StorageStats {
    totalSpools: number;     // Total number of spools
    totalSize: number;       // Total size in bytes
    emptySpools: number;     // Number of empty spools
    types: Record<string, number>;  // Count by type
    brands: Record<string, number>; // Count by brand
}

/**
 * Import result
 */
export interface ImportResult {
    imported: number;        // Number of spools imported
    skipped: number;         // Number of spools skipped (duplicates)
    errors: string[];        // Array of error messages
}

/**
 * Storage error types
 */
export class StorageError extends Error {
    constructor(
        message: string,
        public code: StorageErrorCode,
        public details?: any
    ) {
        super(message);
        this.name = 'StorageError';
    }
}

export enum StorageErrorCode {
    NOT_FOUND = 'NOT_FOUND',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    INVALID_DATA = 'INVALID_DATA',
    DUPLICATE = 'DUPLICATE',
    NETWORK_ERROR = 'NETWORK_ERROR',
    FILESYSTEM_ERROR = 'FILESYSTEM_ERROR',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Platform type for storage implementation
 */
export enum StoragePlatform {
    WEB = 'web',
    MOBILE = 'mobile'
}
