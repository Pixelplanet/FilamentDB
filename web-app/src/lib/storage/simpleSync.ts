/**
 * Simplified File-Based Sync
 * 
 * Syncs spools between devices using file timestamps
 * Much simpler than delta sync - just compares modification times
 */

import { Spool } from '@/db';
import { getStorage } from '@/lib/storage';

export interface SyncConfig {
    serverUrl: string;
    apiKey?: string;
}

export interface SyncResult {
    uploaded: string[];      // Serials uploaded to server
    downloaded: string[];    // Serials downloaded from server
    conflicts: string[];     // Serials with conflicts (should be rare)
    errors: string[];        // Error messages
    summary: {
        totalProcessed: number;
        uploadCount: number;
        downloadCount: number;
        conflictCount: number;
        errorCount: number;
        duration: number;       // milliseconds
    };
}

/**
 * Sync spools with server using file-based approach
 * 
 * Algorithm:
 * 1. Get list of local spools
 * 2. Get list of remote spools
 * 3. For each spool:
 *    - If only exists locally -> upload
 *    - If only exists remotely -> download
 *    - If exists in both -> compare lastUpdated, sync newer
 * 
 * @param config Sync configuration
 * @returns Sync result
 */
import { addSyncLog, SyncChange } from './syncHistory';

// ... (Result types)

export async function syncSpools(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
        uploaded: [],
        downloaded: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            conflictCount: 0,
            errorCount: 0,
            duration: 0
        }
    };

    const changes: SyncChange[] = [];

    try {
        const storage = getStorage();

        // 1. Get local spools
        console.log('📖 Fetching local spools...');
        const localSpools = await storage.listSpools();
        const localMap = new Map(localSpools.map(s => [s.serial, s]));

        // 2. Get remote spools
        // ... (fetch logic same) ...
        // To save tokens, assuming fetch logic is preserved or I should write it carefully.
        // I will copy the fetch logic from original file since I am replacing the WHOLE function roughly?
        // Actually, replace_file_content replaces a block.
        // Let's rely on finding lines. Since the function is long, I should probably replace the whole body or key parts.
        // Let's try to keeping it cleaner by just modifying the loop.

        // WAIT: I cannot use `replace_file_content` easily to inject logic throughout the function without rewriting the whole function body in the tool call.
        // I will rewrite the `syncSpools` function entirely in the replacement.

        // ... (Fetch remote Logic)
        console.log('📡 Fetching remote spools...');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(`${config.serverUrl}/api/spools`, { headers });

        if (!response.ok) {
            throw new Error(`Failed to fetch remote spools: ${response.statusText}`);
        }

        const remoteSpools: Spool[] = await response.json();
        const remoteMap = new Map(remoteSpools.map(s => [s.serial, s]));

        // 3. Find unique
        const allSerials = new Set([
            ...Array.from(localMap.keys()),
            ...Array.from(remoteMap.keys())
        ]);

        console.log(`Processing ${allSerials.size} unique spools...`);

        for (const serial of allSerials) {
            try {
                const localSpool = localMap.get(serial);
                const remoteSpool = remoteMap.get(serial);

                // Case 1: Local only -> Upload
                if (localSpool && !remoteSpool) {
                    await uploadSpool(config, localSpool);
                    result.uploaded.push(serial);
                    result.summary.uploadCount++;
                    // No local change to log for history (it's outgoing)
                }

                // Case 2: Remote only -> Download
                else if (!localSpool && remoteSpool) {
                    await storage.saveSpool(remoteSpool);
                    result.downloaded.push(serial);
                    result.summary.downloadCount++;

                    changes.push({
                        serial,
                        action: 'created',
                        newSpool: remoteSpool
                    });
                }

                // Case 3: Both exist
                else if (localSpool && remoteSpool) {
                    const localTime = localSpool.lastUpdated || 0;
                    const remoteTime = remoteSpool.lastUpdated || 0;

                    if (localTime > remoteTime) {
                        // Local is newer -> Upload
                        await uploadSpool(config, localSpool);
                        result.uploaded.push(serial);
                        result.summary.uploadCount++;
                    } else if (remoteTime > localTime) {
                        // Remote is newer -> Download (Overwrite Local)
                        await storage.saveSpool(remoteSpool);
                        result.downloaded.push(serial);
                        result.summary.downloadCount++;

                        changes.push({
                            serial,
                            action: 'updated',
                            previousSpool: localSpool,
                            newSpool: remoteSpool
                        });
                    }
                }
                result.summary.totalProcessed++;

            } catch (error) {
                const errorMsg = `Error syncing ${serial}: ${error}`;
                result.errors.push(errorMsg);
                result.summary.errorCount++;
                console.error(errorMsg);
            }
        }

        result.summary.duration = Date.now() - startTime;

        // Save History
        if (changes.length > 0 || result.summary.uploadCount > 0) {
            await addSyncLog({
                timestamp: Date.now(),
                direction: 'incoming', // Mixed, but primary concern is incoming changes
                changes: changes,
                serverUrl: config.serverUrl,
                status: result.summary.errorCount === 0 ? 'success' : 'partial',
                error: result.errors.length > 0 ? result.errors[0] : undefined
            });
        }

        return result;

    } catch (error: any) {
        // Log failure
        await addSyncLog({
            timestamp: Date.now(),
            direction: 'incoming',
            changes: [],
            serverUrl: config.serverUrl,
            status: 'failed',
            error: error.message || String(error)
        });

        result.errors.push(`Sync failed: ${error}`);
        result.summary.errorCount++;
        result.summary.duration = Date.now() - startTime;
        throw error;
    }
}

/**
 * Upload a spool to the server
 */
async function uploadSpool(config: SyncConfig, spool: Spool): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.serverUrl}/api/spools`, {
        method: 'POST',
        headers,
        body: JSON.stringify(spool)
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
}

/**
 * Get sync status for a specific spool
 */
export async function getSpoolSyncStatus(
    serial: string,
    config: SyncConfig
): Promise<{
    local: Spool | null;
    remote: Spool | null;
    status: 'in-sync' | 'local-newer' | 'remote-newer' | 'local-only' | 'remote-only';
}> {
    const storage = getStorage();

    // Get local
    const local = await storage.getSpool(serial);

    // Get remote
    const headers: Record<string, string> = {};
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let remote: Spool | null = null;
    try {
        const response = await fetch(`${config.serverUrl}/api/spools/${serial}`, { headers });
        if (response.ok) {
            remote = await response.json();
        }
    } catch {
        // Remote doesn't exist or error
    }

    // Determine status
    let status: 'in-sync' | 'local-newer' | 'remote-newer' | 'local-only' | 'remote-only';

    if (!local && !remote) {
        status = 'in-sync'; // Both don't exist
    } else if (local && !remote) {
        status = 'local-only';
    } else if (!local && remote) {
        status = 'remote-only';
    } else if (local && remote) {
        const localTime = local.lastUpdated || 0;
        const remoteTime = remote.lastUpdated || 0;

        if (localTime > remoteTime) {
            status = 'local-newer';
        } else if (remoteTime > localTime) {
            status = 'remote-newer';
        } else {
            status = 'in-sync';
        }
    } else {
        status = 'in-sync';
    }

    return { local, remote, status };
}

/**
 * Push all local spools to server (one-way sync)
 */
export async function pushAllSpools(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
        uploaded: [],
        downloaded: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            conflictCount: 0,
            errorCount: 0,
            duration: 0
        }
    };

    try {
        const storage = getStorage();
        const localSpools = await storage.listSpools();

        console.log(`⬆️  Pushing ${localSpools.length} spools to server...`);

        for (const spool of localSpools) {
            try {
                await uploadSpool(config, spool);
                result.uploaded.push(spool.serial);
                result.summary.uploadCount++;
                result.summary.totalProcessed++;
            } catch (error) {
                const errorMsg = `Failed to upload ${spool.serial}: ${error}`;
                result.errors.push(errorMsg);
                result.summary.errorCount++;
                console.error(errorMsg);
            }
        }

        result.summary.duration = Date.now() - startTime;
        return result;
    } catch (error) {
        result.errors.push(`Push failed: ${error}`);
        result.summary.errorCount++;
        result.summary.duration = Date.now() - startTime;
        throw error;
    }
}

/**
 * Pull all remote spools to local (one-way sync)
 */
export async function pullAllSpools(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
        uploaded: [],
        downloaded: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            conflictCount: 0,
            errorCount: 0,
            duration: 0
        }
    };

    try {
        const storage = getStorage();

        const headers: Record<string, string> = {};
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(`${config.serverUrl}/api/spools`, { headers });

        if (!response.ok) {
            throw new Error(`Failed to fetch remote spools: ${response.statusText}`);
        }

        const remoteSpools: Spool[] = await response.json();

        console.log(`⬇️  Pulling ${remoteSpools.length} spools from server...`);

        for (const spool of remoteSpools) {
            try {
                await storage.saveSpool(spool);
                result.downloaded.push(spool.serial);
                result.summary.downloadCount++;
                result.summary.totalProcessed++;
            } catch (error) {
                const errorMsg = `Failed to download ${spool.serial}: ${error}`;
                result.errors.push(errorMsg);
                result.summary.errorCount++;
                console.error(errorMsg);
            }
        }

        result.summary.duration = Date.now() - startTime;
        return result;
    } catch (error) {
        result.errors.push(`Pull failed: ${error}`);
        result.summary.errorCount++;
        result.summary.duration = Date.now() - startTime;
        throw error;
    }
}
