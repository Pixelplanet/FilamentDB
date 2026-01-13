
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
    private readonly DELETED_FOLDER = 'spools/deleted';
    private readonly HISTORY_FOLDER = 'history';

    constructor() {
        this.ensureDirectories();
    }

    /**
     * Ensure the spools and subfolders exist
     */
    private async ensureDirectories() {
        try {
            await Filesystem.mkdir({
                path: this.FOLDER,
                directory: this.DIRECTORY,
                recursive: true
            });
            await Filesystem.mkdir({
                path: this.DELETED_FOLDER,
                directory: this.DIRECTORY,
                recursive: true
            });
            await Filesystem.mkdir({
                path: this.HISTORY_FOLDER,
                directory: this.DIRECTORY,
                recursive: true
            });
        } catch (e) {
            // Directories likely already exist
        }
    }

    async listSpools(): Promise<Spool[]> {
        try {
            const result = await Filesystem.readdir({
                path: this.FOLDER,
                directory: this.DIRECTORY
            });

            // files contains "deleted" folder, we filter for .json
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
                    // Double check it's not marked deleted (shouldn't be in main folder if moved, but for safety)
                    if (!spool.deleted) {
                        spools.push(spool);
                    }
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

    // ... getSpool and saveSpool ...

    // Override deleteSpool to move to recycle bin
    async deleteSpool(serial: string): Promise<void> {
        const filename = `${this.FOLDER}/${serial}.json`;
        const destFilename = `${this.DELETED_FOLDER}/${serial}.json`;

        try {
            // First read and update the deleted flag
            const spool = await this.getSpool(serial);
            if (spool) {
                spool.deleted = true;
                spool.lastUpdated = Date.now();

                await Filesystem.writeFile({
                    path: destFilename,
                    data: JSON.stringify(spool, null, 2),
                    directory: this.DIRECTORY,
                    encoding: Encoding.UTF8
                });

                // Then remove original
                await Filesystem.deleteFile({
                    path: filename,
                    directory: this.DIRECTORY
                });
            }
        } catch (e) {
            console.error('Failed to move spool to recycle bin', e);
        }
    }

    // ... saveSpools and deleteSpools ...

    // Recycling Bin Methods
    async listDeletedSpools(): Promise<Spool[]> {
        try {
            const result = await Filesystem.readdir({
                path: this.DELETED_FOLDER,
                directory: this.DIRECTORY
            });

            const files = result.files.filter(f => f.name.endsWith('.json'));
            const spools: Spool[] = [];

            await Promise.all(files.map(async (file) => {
                try {
                    const data = await Filesystem.readFile({
                        path: `${this.DELETED_FOLDER}/${file.name}`,
                        directory: this.DIRECTORY,
                        encoding: Encoding.UTF8
                    });

                    const content = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
                    spools.push(JSON.parse(content));
                } catch (err) {
                    // ignore error
                }
            }));

            return spools.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
        } catch (e) {
            return [];
        }
    }

    async restoreSpool(serial: string): Promise<void> {
        const sourceFilename = `${this.DELETED_FOLDER}/${serial}.json`;
        const destFilename = `${this.FOLDER}/${serial}.json`;

        try {
            // Read, un-delete, write to destination
            const data = await Filesystem.readFile({
                path: sourceFilename,
                directory: this.DIRECTORY,
                encoding: Encoding.UTF8
            });
            const content = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
            const spool = JSON.parse(content);

            spool.deleted = undefined; // Remove deleted flag
            spool.lastUpdated = Date.now();

            await Filesystem.writeFile({
                path: destFilename,
                data: JSON.stringify(spool, null, 2),
                directory: this.DIRECTORY,
                encoding: Encoding.UTF8
            });

            // Delete from recycle bin
            await Filesystem.deleteFile({
                path: sourceFilename,
                directory: this.DIRECTORY
            });
        } catch (e) {
            console.error('Failed to restore spool', e);
            throw e;
        }
    }

    async permanentlyDeleteSpool(serial: string): Promise<void> {
        const filename = `${this.DELETED_FOLDER}/${serial}.json`;
        try {
            await Filesystem.deleteFile({
                path: filename,
                directory: this.DIRECTORY
            });
        } catch (e) {
            // Ignore if already gone
        }
    }

    // Usage History

    async getUsageHistory(serial: string): Promise<import('@/db').UsageLog[]> {
        const filename = `${this.HISTORY_FOLDER}/${serial}.json`;
        try {
            const result = await Filesystem.readFile({
                path: filename,
                directory: this.DIRECTORY,
                encoding: Encoding.UTF8
            });
            const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            return JSON.parse(content);
        } catch (e) {
            return [];
        }
    }

    async logUsage(log: import('@/db').UsageLog): Promise<void> {
        const filename = `${this.HISTORY_FOLDER}/${log.spoolId}.json`;
        let history: import('@/db').UsageLog[] = [];

        try {
            // Read existing history
            const result = await Filesystem.readFile({
                path: filename,
                directory: this.DIRECTORY,
                encoding: Encoding.UTF8
            });
            const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            history = JSON.parse(content);
        } catch (e) {
            // File likely doesn't exist yet
            history = [];
        }

        history.push(log);

        await Filesystem.writeFile({
            path: filename,
            data: JSON.stringify(history, null, 2),
            directory: this.DIRECTORY,
            encoding: Encoding.UTF8
        });
    }

    private readonly FOLDER = 'spools';

    // ... search/filter using listSpools ...

    // Original methods are now replaced by the ones above or need to be merged.
    // getSpool needs to check both folders if not found in one? 
    // Usually getSpool is for active inventory.

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
            // Check recycled bin if not found? 
            // For now, ISpoolStorage.getSpool usually implies active. 
            // If we want to support recovering deleted, we might need a separate method or flag.
            return null;
        }
    }

    async saveSpool(spool: Spool, preserveTimestamp: boolean = false): Promise<void> {
        if (!spool.serial) throw new Error('Serial required');

        const spoolToSave = {
            ...spool,
            // Preserve timestamp for synced spools, update for local edits
            lastUpdated: preserveTimestamp ? (spool.lastUpdated || Date.now()) : Date.now()
        };

        const filename = `${this.FOLDER}/${spool.serial}.json`;
        await Filesystem.writeFile({
            path: filename,
            data: JSON.stringify(spoolToSave, null, 2),
            directory: this.DIRECTORY,
            encoding: Encoding.UTF8
        });
    }

    // deleteSpool is already implemented above correctly with soft-delete logic.
    // saveSpools and deleteSpools are batch wrappers around single ops.

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
