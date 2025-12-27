import { db, Spool, getSpoolsModifiedSince, getDeletedSpoolsSince } from '@/db';

const LAST_SYNC_KEY = 'filamentdb_last_sync_timestamp';
const SYNC_URL_KEY = 'filamentdb_sync_url';
const SYNC_API_KEY = 'filamentdb_sync_api_key';

export interface SyncConfig {
    serverUrl: string;
    apiKey: string;
}

export interface SyncResult {
    success: boolean;
    stats: {
        uploaded: number;
        downloaded: number;
        conflictsResolved: number;
    };
    error?: string;
}

export interface SyncRequest {
    apiKey: string;
    deviceId: string;
    lastSyncTime: number;
    changes: Spool[];
    deletions: number[];
}

export interface SyncResponse {
    success: boolean;
    serverTime: number;
    changes: Spool[];
    deletions: number[];
    conflicts?: Array<{
        spoolId: number;
        resolution: 'client' | 'server';
    }>;
    stats: {
        totalSpools: number;
        synced: number;
        conflictsResolved: number;
    };
    error?: string;
}

export class SyncManager {
    private static instance: SyncManager;

    private constructor() { }

    static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    // Get stored configuration
    getConfig(): SyncConfig | null {
        if (typeof window === 'undefined') return null;

        const serverUrl = localStorage.getItem(SYNC_URL_KEY);
        const apiKey = localStorage.getItem(SYNC_API_KEY);

        if (!serverUrl || !apiKey) return null;

        return { serverUrl, apiKey };
    }

    // Save configuration
    saveConfig(config: SyncConfig) {
        if (typeof window === 'undefined') return;

        localStorage.setItem(SYNC_URL_KEY, config.serverUrl);
        localStorage.setItem(SYNC_API_KEY, config.apiKey);
    }

    // Get last sync timestamp
    getLastSyncTime(): number {
        if (typeof window === 'undefined') return 0;

        const stored = localStorage.getItem(LAST_SYNC_KEY);
        return stored ? parseInt(stored, 10) : 0;
    }

    // Update last sync timestamp
    private setLastSyncTime(timestamp: number) {
        if (typeof window === 'undefined') return;

        localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
    }

    // Get or create device ID
    private getDeviceId(): string {
        if (typeof window === 'undefined') return 'server';

        const key = 'filamentdb_device_id';
        let deviceId = localStorage.getItem(key);

        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem(key, deviceId);
        }

        return deviceId;
    }

    // Perform sync
    async sync(config?: SyncConfig): Promise<SyncResult> {
        const syncConfig = config || this.getConfig();

        if (!syncConfig) {
            return {
                success: false,
                stats: { uploaded: 0, downloaded: 0, conflictsResolved: 0 },
                error: 'Sync not configured. Please set server URL and API key.'
            };
        }

        const lastSyncTime = this.getLastSyncTime();
        const syncStartTime = Date.now();

        try {
            // Get local changes since last sync
            const localChanges = await getSpoolsModifiedSince(lastSyncTime);
            const localDeletions = await getDeletedSpoolsSince(lastSyncTime);
            const deletionIds = localDeletions.map(s => s.id).filter(id => id !== undefined) as number[];

            // Prepare sync request
            const request: SyncRequest = {
                apiKey: syncConfig.apiKey,
                deviceId: this.getDeviceId(),
                lastSyncTime,
                changes: localChanges,
                deletions: deletionIds
            };

            // Send to server
            const response = await fetch(`${syncConfig.serverUrl}/api/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data: SyncResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Sync failed');
            }

            // Apply server changes
            let conflictsResolved = 0;

            if (data.changes && data.changes.length > 0) {
                for (const serverSpool of data.changes) {
                    // Check for conflicts
                    const localSpool = serverSpool.id ? await db.spools.get(serverSpool.id) : null;

                    if (localSpool && localSpool.lastUpdated > lastSyncTime) {
                        // Conflict detected: both local and server modified
                        const resolved = this.resolveConflict(localSpool, serverSpool);
                        await db.spools.put(resolved);
                        conflictsResolved++;
                    } else {
                        // No conflict: apply server change
                        await db.spools.put(serverSpool);
                    }
                }
            }

            // Apply server deletions
            if (data.deletions && data.deletions.length > 0) {
                await db.spools.bulkDelete(data.deletions);
            }

            // Update last sync time
            this.setLastSyncTime(syncStartTime);

            return {
                success: true,
                stats: {
                    uploaded: localChanges.length + deletionIds.length,
                    downloaded: data.changes.length + data.deletions.length,
                    conflictsResolved
                }
            };

        } catch (error: any) {
            console.error('Sync error:', error);
            return {
                success: false,
                stats: { uploaded: 0, downloaded: 0, conflictsResolved: 0 },
                error: error.message || 'Unknown sync error'
            };
        }
    }

    // Conflict resolution: Last-Write-Wins
    private resolveConflict(local: Spool, server: Spool): Spool {
        // Compare timestamps
        if (server.lastUpdated > local.lastUpdated) {
            // Server wins
            return server;
        } else if (local.lastUpdated > server.lastUpdated) {
            // Local wins
            return local;
        } else {
            // Same timestamp: merge intelligently
            return {
                ...server,
                // Use lower weight (more conservative)
                weightRemaining: Math.min(local.weightRemaining, server.weightRemaining),
                // Prefer local notes if present
                // Keep latest lastUpdated
                lastUpdated: Math.max(local.lastUpdated, server.lastUpdated)
            };
        }
    }

    // Clear sync configuration
    clearConfig() {
        if (typeof window === 'undefined') return;

        localStorage.removeItem(SYNC_URL_KEY);
        localStorage.removeItem(SYNC_API_KEY);
        localStorage.removeItem(LAST_SYNC_KEY);
    }

    // Check if sync is configured
    isSyncConfigured(): boolean {
        return this.getConfig() !== null;
    }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();
