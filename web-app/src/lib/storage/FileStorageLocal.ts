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
 * Local Storage Implementation
 * 
 * Uses browser localStorage to store spools when no server is available.
 * This ensures the app works "out of the box" on mobile without configuration.
 */
export class FileStorageLocal implements ISpoolStorage {
    private readonly STORAGE_KEY = 'filamentdb_spools';

    private getSpoolsMap(): Record<string, Spool> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to parse local spools', e);
            return {};
        }
    }

    private saveSpoolsMap(map: Record<string, Spool>): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(map));
    }

    async getSpool(serial: string): Promise<Spool | null> {
        const map = this.getSpoolsMap();
        return map[serial] || null;
    }

    async listSpools(): Promise<Spool[]> {
        const map = this.getSpoolsMap();
        return Object.values(map).sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    }

    async saveSpool(spool: Spool): Promise<void> {
        if (!spool.serial) throw new Error('Serial required');

        const map = this.getSpoolsMap();
        map[spool.serial] = {
            ...spool,
            lastUpdated: Date.now(),
        };
        this.saveSpoolsMap(map);
    }

    async deleteSpool(serial: string): Promise<void> {
        const map = this.getSpoolsMap();
        if (map[serial]) {
            delete map[serial];
            this.saveSpoolsMap(map);
        }
    }

    async saveSpools(spools: Spool[]): Promise<void> {
        const map = this.getSpoolsMap();
        for (const spool of spools) {
            if (spool.serial) {
                map[spool.serial] = { ...spool, lastUpdated: Date.now() };
            }
        }
        this.saveSpoolsMap(map);
    }

    async deleteSpools(serials: string[]): Promise<void> {
        const map = this.getSpoolsMap();
        for (const serial of serials) {
            delete map[serial];
        }
        this.saveSpoolsMap(map);
    }

    async searchSpools(query: string): Promise<Spool[]> {
        const spools = await this.listSpools();
        const lowerQuery = query.toLowerCase();
        return spools.filter(s =>
            s.brand?.toLowerCase().includes(lowerQuery) ||
            s.type?.toLowerCase().includes(lowerQuery) ||
            s.color?.toLowerCase().includes(lowerQuery) ||
            s.serial.toLowerCase().includes(lowerQuery)
        );
    }

    async filterSpools(filters: SpoolFilters): Promise<Spool[]> {
        let spools = await this.listSpools();

        return spools.filter(spool => {
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

    async getLastModified(serial: string): Promise<number | null> {
        const spool = await this.getSpool(serial);
        return spool ? spool.lastUpdated : null;
    }

    // Export/Import not fully implemented for LocalStorage override, 
    // but stubbed to satisfy interface.
    async exportAll(): Promise<Blob> {
        const map = this.getSpoolsMap();
        return new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    }

    async importAll(data: Blob): Promise<ImportResult> {
        // Basic import support
        try {
            const text = await data.text();
            const map = JSON.parse(text);
            this.saveSpoolsMap(map);
            return {
                imported: Object.keys(map).length,
                skipped: 0,
                errors: []
            };
        } catch (e: any) {
            return { imported: 0, skipped: 0, errors: [e.message] };
        }
    }
}
