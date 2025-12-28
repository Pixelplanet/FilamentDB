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

    try {
        const storage = getStorage();

        // 1. Get local spools
        console.log('📖 Fetching local spools...');
        const localSpools = await storage.listSpools();
        const localMap = new Map(localSpools.map(s => [s.serial, s]));
        console.log(`Found ${localSpools.length} local spools`);

        // 2. Get remote spools
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
        console.log(`Found ${remoteSpools.length} remote spools`);

        // 3. Find all unique serials
        const allSerials = new Set([
            ...Array.from(localMap.keys()),
            ...Array.from(remoteMap.keys())
        ]);

        console.log(`Processing ${allSerials.size} unique spools...`);

        // 4. Process each spool
        for (const serial of allSerials) {
            try {
                const localSpool = localMap.get(serial);
                const remoteSpool = remoteMap.get(serial);

                // Case 1: Only exists locally -> upload
                if (localSpool && !remoteSpool) {
                    await uploadSpool(config, localSpool);
                    result.uploaded.push(serial);
                    result.summary.uploadCount++;
                    console.log(`⬆️  Uploaded: ${serial}`);
                }

                // Case 2: Only exists remotely -> download
                else if (!localSpool && remoteSpool) {
                    await storage.saveSpool(remoteSpool);
                    result.downloaded.push(serial);
                    result.summary.downloadCount++;
                    console.log(`⬇️  Downloaded: ${serial}`);
                }

                // Case 3: Exists in both -> compare timestamps
                else if (localSpool && remoteSpool) {
                    const localTime = localSpool.lastUpdated || 0;
                    const remoteTime = remoteSpool.lastUpdated || 0;

                    if (localTime > remoteTime) {
                        // Local is newer -> upload
                        await uploadSpool(config, localSpool);
                        result.uploaded.push(serial);
                        result.summary.uploadCount++;
                        console.log(`⬆️  Updated remote: ${serial}`);
                    } else if (remoteTime > localTime) {
                        // Remote is newer -> download
                        await storage.saveSpool(remoteSpool);
                        result.downloaded.push(serial);
                        result.summary.downloadCount++;
                        console.log(`⬇️  Updated local: ${serial}`);
                    } else {
                        // Same timestamp -> no sync needed
                        console.log(`✓ In sync: ${serial}`);
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

        // Calculate duration
        result.summary.duration = Date.now() - startTime;

        console.log('\n✅ Sync complete!');
        console.log(`📊 Stats: ${result.summary.uploadCount} uploaded, ${result.summary.downloadCount} downloaded, ${result.summary.errorCount} errors`);
        console.log(`⏱️  Duration: ${result.summary.duration}ms`);

        return result;
    } catch (error) {
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
