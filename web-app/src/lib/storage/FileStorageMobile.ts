
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Spool } from '@/db';
import {
    ISpoolStorage,
    SpoolFilters,
    StorageStats,
    ImportResult,
    StorageError,
    StorageErrorCode
} from './types';

/**
 * Mobile File Storage Implementation
 * 
 * Uses @capacitor/filesystem to store spools as JSON files in the device's data directory.
 * This provides robust, persistent storage on Android/iOS.
 */
export class FileStorageMobile implements ISpoolStorage {
    private readonly DIRECTORY = Directory.Data;
    private readonly FOLDER = 'spools';

    constructor() {
        this.ensureDirectory();
    }

    /**
     * Ensure the spools folder exists
     */
    private async ensureDirectory() {
        try {
            await Filesystem.mkdir({
                path: this.FOLDER,
                directory: this.DIRECTORY,
                recursive: true
            });
        } catch (e) {
            // Directory likely already exists
        }
    }

    async listSpools(): Promise<Spool[]> {
        try {
            const result = await Filesystem.readdir({
                path: this.FOLDER,
                directory: this.DIRECTORY
            });

            const files = result.files.filter(f => f.name.endsWith('.json'));
            const spools: Spool[] = [];

            // Read in parallel
            await Promise.all(files.map(async (file) => {
                try {
                    const data = await Filesystem.readFile({
                        path: `${this.FOLDER}/${file.name}`,
                        directory: this.DIRECTORY,
                        encoding: Encoding.UTF8
                    });

                    // Capacitor 6+ returns data in 'data' field, simpler for text
                    const content = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
                    const spool = JSON.parse(content);
                    spools.push(spool);
                } catch (err) {
                    console.error(`Failed to read spool ${file.name}`, err);
                }
            }));

            return spools.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

        } catch (error: any) {
            console.error('Failed to list spools', error);
            return [];
        }
    }

    async getSpool(serial: string): Promise<Spool | null> {
        try {
            const filename = `${this.FOLDER}/${serial}.json`;
            const result = await Filesystem.readFile({
                path: filename,
                directory: this.DIRECTORY,
                encoding: Encoding.UTF8
            });

            const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            return JSON.parse(content);
        } catch (error) {
            // If file not found, return null
            return null;
        }
    }

    async saveSpool(spool: Spool): Promise<void> {
        if (!spool.serial) throw new Error('Serial required');

        const spoolToSave = {
            ...spool,
            lastUpdated: Date.now()
        };

        const filename = `${this.FOLDER}/${spool.serial}.json`;
        await Filesystem.writeFile({
            path: filename,
            data: JSON.stringify(spoolToSave, null, 2),
            directory: this.DIRECTORY,
            encoding: Encoding.UTF8
        });
    }

    async deleteSpool(serial: string): Promise<void> {
        const filename = `${this.FOLDER}/${serial}.json`;
        try {
            await Filesystem.deleteFile({
                path: filename,
                directory: this.DIRECTORY
            });
        } catch (e) {
            // Check if file existed, otherwise ignore
        }
    }

    // Batch operations
    async saveSpools(spools: Spool[]): Promise<void> {
        for (const spool of spools) {
            await this.saveSpool(spool);
        }
    }

    async deleteSpools(serials: string[]): Promise<void> {
        for (const serial of serials) {
            await this.deleteSpool(serial);
        }
    }

    // Query operations (in-memory filtering for now, fs query is hard)
    async searchSpools(query: string): Promise<Spool[]> {
        const all = await this.listSpools();
        const lower = query.toLowerCase();
        return all.filter(s =>
            s.brand?.toLowerCase().includes(lower) ||
            s.type?.toLowerCase().includes(lower) ||
            s.color?.toLowerCase().includes(lower) ||
            s.serial.toLowerCase().includes(lower)
        );
    }

    async filterSpools(filters: SpoolFilters): Promise<Spool[]> {
        const all = await this.listSpools();
        return all.filter(spool => {
            if (filters.type && spool.type !== filters.type) return false;
            if (filters.brand && spool.brand !== filters.brand) return false;
            if (filters.color && spool.color !== filters.color) return false;
            if (filters.minWeight !== undefined && spool.weightRemaining < filters.minWeight) return false;
            if (filters.maxWeight !== undefined && spool.weightRemaining > filters.maxWeight) return false;
            if (filters.isEmpty !== undefined) {
                const isEmpty = spool.weightRemaining <= 0;
                if (filters.isEmpty !== isEmpty) return false;
            }
            return true;
        });
    }

    // Metadata
    async getLastModified(serial: string): Promise<number | null> {
        const spool = await this.getSpool(serial);
        return spool?.lastUpdated || null;
    }

    async getStats(): Promise<StorageStats> {
        const spools = await this.listSpools();
        const stats: StorageStats = {
            totalSpools: spools.length,
            totalSize: 0,
            emptySpools: 0,
            brands: {},
            types: {}
        };

        for (const s of spools) {
            if (s.weightRemaining <= 0) stats.emptySpools++;
            if (s.brand) stats.brands[s.brand] = (stats.brands[s.brand] || 0) + 1;
            if (s.type) stats.types[s.type] = (stats.types[s.type] || 0) + 1;
        }
        return stats;
    }

    // Import/Export
    async exportAll(): Promise<Blob> {
        // Simple JSON dump for now
        const spools = await this.listSpools();
        return new Blob([JSON.stringify(spools, null, 2)], { type: 'application/json' });
    }

    async importAll(data: Blob): Promise<ImportResult> {
        try {
            const text = await data.text();
            const spools: Spool[] = JSON.parse(text); // Expecting array or map? Asssuming array for bulk

            // Handle if it's a map
            const list = (Array.isArray(spools) ? spools : Object.values(spools)) as Spool[];

            await this.saveSpools(list);
            return {
                imported: list.length,
                skipped: 0,
                errors: []
            };
        } catch (e: any) {
            return { imported: 0, skipped: 0, errors: [e.message] };
        }
    }
}
