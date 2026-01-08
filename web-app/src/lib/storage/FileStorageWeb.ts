/**
 * File Storage - Web Implementation
 * 
 * Uses API endpoints to manage spools stored as files on the server
 */

import { Spool } from '@/db';
import {
    ISpoolStorage,
    SpoolFilters,
    StorageStats,
    ImportResult,
    StorageError,
    StorageErrorCode
} from './types';
import { getSpoolFileName } from './fileUtils';

/**
 * Web-based storage implementation
 * Stores files on server, accessed via API
 */
export class FileStorageWeb implements ISpoolStorage {
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    // ===== CRUD Operations =====

    async getSpool(serial: string): Promise<Spool | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/spools/${encodeURIComponent(serial)}`, {
                credentials: 'include'
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new StorageError(
                    `Failed to get spool: ${response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to get spool: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }

    async listSpools(): Promise<Spool[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/spools`, {
                credentials: 'include'
            });

            if (!response.ok) {
                // If we get a 404 on the API route, it usually means the server URL is wrong or points to the static app
                // Return empty list instead of throwing to allow the app to load
                if (response.status === 404) return [];

                throw new StorageError(
                    `Failed to list spools: ${response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR
                );
            }

            // Verify content type is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // This happens when the API path returns HTML (e.g. index.html fallback)
                // This implies the server URL is not providing the API
                console.warn('Received non-JSON response from API, returning empty list');
                return [];
            }

            return await response.json();
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to list spools: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }

    async saveSpool(spool: Spool): Promise<void> {
        try {
            // Validate spool data
            if (!spool.serial) {
                throw new StorageError(
                    'Spool must have a serial number',
                    StorageErrorCode.INVALID_DATA
                );
            }

            // Update lastUpdated timestamp
            const spoolToSave = {
                ...spool,
                lastUpdated: Date.now()
            };

            const response = await fetch(`${this.baseUrl}/api/spools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spoolToSave),
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new StorageError(
                    `Failed to save spool: ${error.error || response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR,
                    error
                );
            }
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to save spool: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }

    async deleteSpool(serial: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/api/spools/${encodeURIComponent(serial)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.status === 404) {
                throw new StorageError(
                    `Spool not found: ${serial}`,
                    StorageErrorCode.NOT_FOUND
                );
            }

            if (!response.ok) {
                throw new StorageError(
                    `Failed to delete spool: ${response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR
                );
            }
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to delete spool: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }

    // ===== Batch Operations =====

    async saveSpools(spools: Spool[]): Promise<void> {
        // Save sequentially to avoid overwhelming server
        for (const spool of spools) {
            await this.saveSpool(spool);
        }
    }

    async deleteSpools(serials: string[]): Promise<void> {
        // Delete sequentially
        for (const serial of serials) {
            await this.deleteSpool(serial);
        }
    }

    // ===== Query Operations =====

    async searchSpools(query: string): Promise<Spool[]> {
        const allSpools = await this.listSpools();
        const lowerQuery = query.toLowerCase();

        return allSpools.filter(spool =>
            (spool.brand?.toLowerCase().includes(lowerQuery)) ||
            (spool.type?.toLowerCase().includes(lowerQuery)) ||
            (spool.color?.toLowerCase().includes(lowerQuery)) ||
            (spool.notes?.toLowerCase().includes(lowerQuery)) ||
            (spool.serial?.toLowerCase().includes(lowerQuery))
        );
    }

    async filterSpools(filters: SpoolFilters): Promise<Spool[]> {
        const allSpools = await this.listSpools();

        return allSpools.filter(spool => {
            // Filter by type
            if (filters.type && spool.type !== filters.type) {
                return false;
            }

            // Filter by brand
            if (filters.brand && spool.brand !== filters.brand) {
                return false;
            }

            // Filter by color
            if (filters.color && spool.color !== filters.color) {
                return false;
            }

            // Filter by weight range
            if (filters.minWeight !== undefined && spool.weightRemaining < filters.minWeight) {
                return false;
            }

            if (filters.maxWeight !== undefined && spool.weightRemaining > filters.maxWeight) {
                return false;
            }

            // Filter by empty status
            if (filters.isEmpty !== undefined) {
                const isEmpty = spool.weightRemaining <= 0;
                if (filters.isEmpty !== isEmpty) {
                    return false;
                }
            }

            // Filter by notes
            if (filters.hasNotes !== undefined) {
                const hasNotes = !!spool.notes && spool.notes.trim().length > 0;
                if (filters.hasNotes !== hasNotes) {
                    return false;
                }
            }

            return true;
        });
    }

    // ===== Metadata =====

    async getLastModified(serial: string): Promise<number | null> {
        const spool = await this.getSpool(serial);
        return spool?.lastUpdated || null;
    }

    async getStats(): Promise<StorageStats> {
        const spools = await this.listSpools();

        const stats: StorageStats = {
            totalSpools: spools.length,
            totalSize: 0, // Would need server to calculate actual file sizes
            emptySpools: 0,
            types: {},
            brands: {}
        };

        for (const spool of spools) {
            // Count empty spools
            if (spool.weightRemaining <= 0) {
                stats.emptySpools++;
            }

            // Count by type
            if (spool.type) {
                stats.types[spool.type] = (stats.types[spool.type] || 0) + 1;
            }

            // Count by brand
            if (spool.brand) {
                stats.brands[spool.brand] = (stats.brands[spool.brand] || 0) + 1;
            }
        }

        return stats;
    }

    // ===== Import/Export =====

    async exportAll(): Promise<Blob> {
        try {
            const response = await fetch(`${this.baseUrl}/api/spools/export`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new StorageError(
                    `Failed to export spools: ${response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR
                );
            }

            return await response.blob();
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to export spools: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }

    async importAll(data: Blob): Promise<ImportResult> {
        try {
            const formData = new FormData();
            formData.append('file', data, 'spools.zip');

            const response = await fetch(`${this.baseUrl}/api/spools/import`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new StorageError(
                    `Failed to import spools: ${response.statusText}`,
                    StorageErrorCode.NETWORK_ERROR
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw new StorageError(
                `Failed to import spools: ${error}`,
                StorageErrorCode.UNKNOWN,
                error
            );
        }
    }
}
