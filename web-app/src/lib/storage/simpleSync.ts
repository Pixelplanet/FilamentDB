/**
 * Simplified File-Based Sync
 * 
 * Syncs spools between devices using file timestamps
 * Now includes tombstone support for proper deletion sync
 */

import { Spool } from '@/db';
import { getStorage, ISpoolStorage } from '@/lib/storage';
import { addSyncLog, SyncChange } from './syncHistory';

// Tombstone interface matching server
interface Tombstone {
    serial: string;
    deletedAt: number;
    deletedBy?: string;
}

export interface SyncConfig {
    serverUrl: string;
    apiKey?: string;
    token?: string;
}

export interface SyncResult {
    uploaded: string[];      // Serials uploaded to server
    downloaded: string[];    // Serials downloaded from server
    deleted: string[];       // Serials deleted during sync
    conflicts: string[];     // Serials with conflicts (should be rare)
    errors: string[];        // Error messages
    summary: {
        totalProcessed: number;
        uploadCount: number;
        downloadCount: number;
        deleteCount: number;
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
 * 3. Get list of remote tombstones (deleted spools)
 * 4. For each spool:
 *    - If only exists locally AND server has tombstone -> Delete locally (server deleted it)
 *    - If only exists locally -> Upload (new spool)
 *    - If only exists remotely AND NOT in local tombstones -> Download
 *    - If exists in both -> compare lastUpdated, sync newer
 * 5. Push any local deletions to server
 * 
 * @param config Sync configuration
 * @returns Sync result
 */
export async function syncSpools(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
        uploaded: [],
        downloaded: [],
        deleted: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            deleteCount: 0,
            conflictCount: 0,
            errorCount: 0,
            duration: 0
        }
    };

    const changes: SyncChange[] = [];

    try {
        const storage = getStorage();

        // Build auth headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (config.token) {
            headers['Authorization'] = `Bearer ${config.token}`;
        } else if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        // 1. Get local spools
        console.log('📖 Fetching local spools...');
        const localSpools = await storage.listSpools();
        const localMap = new Map(localSpools.map(s => [s.serial, s]));

        // 2. Get remote spools
        console.log('📡 Fetching remote spools...');
        console.log(`🌐 Connecting to: ${config.serverUrl}/api/spools`);
        console.log(`🔑 Auth method: ${config.token ? 'User Token' : config.apiKey ? 'API Key' : 'None'}`);

        let response;
        try {
            response = await fetch(`${config.serverUrl}/api/spools`, {
                headers,
                mode: 'cors',
                credentials: 'include',
            });
        } catch (fetchError: any) {
            const errorDetails = {
                message: fetchError.message,
                name: fetchError.name,
                serverUrl: config.serverUrl,
                suggestion: 'Check if server is reachable. Use http://[IP]:3000 (not localhost) on mobile devices.'
            };
            console.error('❌ Network fetch failed:', errorDetails);
            throw new Error(`Network Error: ${fetchError.message}. Is the server URL correct? (Use IP address, not localhost)`);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details');
            console.error(`❌ Server returned ${response.status}: ${response.statusText}`);
            console.error(`Response body: ${errorText}`);
            throw new Error(`Server Error (${response.status}): ${response.statusText}. ${errorText}`);
        }

        const remoteSpools: Spool[] = await response.json();
        const remoteMap = new Map(remoteSpools.map(s => [s.serial, s]));

        // 3. Get remote tombstones (deleted spools markers)
        console.log('🪦 Fetching remote tombstones...');
        let remoteTombstones: Tombstone[] = [];
        try {
            const tombstoneResponse = await fetch(`${config.serverUrl}/api/sync/tombstones`, {
                headers,
                mode: 'cors',
                credentials: 'include',
            });
            if (tombstoneResponse.ok) {
                const data = await tombstoneResponse.json();
                remoteTombstones = data.tombstones || [];
                console.log(`🪦 Found ${remoteTombstones.length} remote tombstones`);
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch tombstones (server may be older version):', e);
        }
        const remoteTombstoneMap = new Map(remoteTombstones.map(t => [t.serial, t]));

        // 4. Get local tombstones (if storage supports it)
        let localTombstones: Tombstone[] = [];
        if ('getLocalTombstones' in storage) {
            localTombstones = await (storage as ISpoolStorage & { getLocalTombstones: () => Promise<Tombstone[]> }).getLocalTombstones();
            console.log(`🪦 Found ${localTombstones.length} local tombstones`);
        }
        const localTombstoneMap = new Map(localTombstones.map(t => [t.serial, t]));

        // 5. Merge and process all serials
        const allSerials = new Set([
            ...Array.from(localMap.keys()),
            ...Array.from(remoteMap.keys()),
            ...Array.from(remoteTombstoneMap.keys()),
            ...Array.from(localTombstoneMap.keys())
        ]);

        console.log(`Processing ${allSerials.size} unique spools...`);

        for (const serial of allSerials) {
            try {
                const localSpool = localMap.get(serial);
                const remoteSpool = remoteMap.get(serial);
                const remoteTombstone = remoteTombstoneMap.get(serial);
                const localTombstone = localTombstoneMap.get(serial);

                // Case 1: Server has tombstone for this spool
                if (remoteTombstone) {
                    if (localSpool) {
                        // Local spool exists but server deleted it
                        const localTime = localSpool.lastUpdated || 0;
                        if (remoteTombstone.deletedAt > localTime) {
                            // Server deletion is newer - delete locally
                            console.log(`🗑️ Server deleted ${serial}, removing locally...`);
                            await storage.deleteSpool(serial);
                            result.deleted.push(serial);
                            result.summary.deleteCount++;
                            changes.push({
                                serial,
                                action: 'deleted',
                                previousSpool: localSpool
                            });
                        } else {
                            // Local edit is newer - re-upload to server
                            console.log(`📤 Local spool ${serial} is newer than server deletion, re-uploading...`);
                            await uploadSpool(config, localSpool);
                            result.uploaded.push(serial);
                            result.summary.uploadCount++;
                        }
                    }
                    // If no local spool and server has tombstone, nothing to do
                    result.summary.totalProcessed++;
                    continue;
                }

                // Case 2: We have a local tombstone (we deleted it locally)
                if (localTombstone && !localSpool) {
                    if (remoteSpool) {
                        // Remote still has it, we deleted it locally
                        const remoteTime = remoteSpool.lastUpdated || 0;
                        if (localTombstone.deletedAt > remoteTime) {
                            // Our deletion is newer - push delete to server
                            console.log(`📤 Pushing local delete of ${serial} to server...`);
                            await deleteSpool(config, serial);
                            result.deleted.push(serial);
                            result.summary.deleteCount++;
                        } else {
                            // Remote update is newer than our deletion - restore locally
                            console.log(`📥 Remote ${serial} updated after our deletion, restoring...`);
                            await storage.saveSpool(remoteSpool, true);
                            result.downloaded.push(serial);
                            result.summary.downloadCount++;
                            changes.push({
                                serial,
                                action: 'created',
                                newSpool: remoteSpool
                            });
                            // Clear local tombstone
                            if ('deleteLocalTombstone' in storage) {
                                await (storage as ISpoolStorage & { deleteLocalTombstone: (s: string) => Promise<void> }).deleteLocalTombstone(serial);
                            }
                        }
                    }
                    result.summary.totalProcessed++;
                    continue;
                }

                // Case 3: Local only (no tombstones involved) -> Upload
                if (localSpool && !remoteSpool) {
                    await uploadSpool(config, localSpool);
                    result.uploaded.push(serial);
                    result.summary.uploadCount++;
                }

                // Case 4: Remote only (no tombstones involved) -> Download
                else if (!localSpool && remoteSpool) {
                    await storage.saveSpool(remoteSpool, true); // preserveTimestamp = true
                    result.downloaded.push(serial);
                    result.summary.downloadCount++;

                    changes.push({
                        serial,
                        action: 'created',
                        newSpool: remoteSpool
                    });
                }

                // Case 5: Both exist -> Compare timestamps
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
                        await storage.saveSpool(remoteSpool, true); // preserveTimestamp = true
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
        if (changes.length > 0 || result.summary.uploadCount > 0 || result.summary.deleteCount > 0) {
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
    if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    } else if (config.apiKey) {
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
 * Delete a spool from the server
 */
async function deleteSpool(config: SyncConfig, serial: string): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    } else if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.serverUrl}/api/spools/${serial}`, {
        method: 'DELETE',
        headers
    });

    if (!response.ok && response.status !== 404) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
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
    if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    } else if (config.apiKey) {
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
        deleted: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            deleteCount: 0,
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
        deleted: [],
        conflicts: [],
        errors: [],
        summary: {
            totalProcessed: 0,
            uploadCount: 0,
            downloadCount: 0,
            deleteCount: 0,
            conflictCount: 0,
            errorCount: 0,
            duration: 0
        }
    };

    try {
        const storage = getStorage();

        const headers: Record<string, string> = {};
        if (config.token) {
            headers['Authorization'] = `Bearer ${config.token}`;
        } else if (config.apiKey) {
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
