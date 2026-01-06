import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Must be static for Next.js to parse at build time
// Docker builds use force-dynamic (server mode)
// Mobile builds handled separately with build:mobile script
export const dynamic = 'force-dynamic';
export const revalidate = false;

// Types matching client
interface Spool {
    id?: number;
    serial: string;
    brand: string;
    type: string;
    color: string;
    colorHex?: string;
    weightRemaining: number;
    weightTotal: number;
    diameter: number;
    lastUpdated: number;
    deleted?: boolean;
    [key: string]: any; // Allow other fields
}

interface SyncRequest {
    apiKey: string;
    deviceId: string;
    lastSyncTime: number;
    changes: Spool[];
    deletions: number[];
}

interface SyncData {
    spools: Spool[];
    lastModified: number;
}

// Configuration
const SYNC_DATA_DIR = process.env.SYNC_DATA_DIR || path.join(process.cwd(), 'data');
const SYNC_DATA_FILE = path.join(SYNC_DATA_DIR, 'sync.json');
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'dev-key-change-in-production';

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(SYNC_DATA_DIR);
    } catch {
        await fs.mkdir(SYNC_DATA_DIR, { recursive: true });
    }
}

// Load sync data from file
async function loadSyncData(): Promise<SyncData> {
    try {
        await ensureDataDir();
        const data = await fs.readFile(SYNC_DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is invalid, return empty data
        return {
            spools: [],
            lastModified: Date.now()
        };
    }
}

// Save sync data to file
async function saveSyncData(data: SyncData) {
    await ensureDataDir();
    await fs.writeFile(SYNC_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const SYNC_LOGS_FILE = path.join(SYNC_DATA_DIR, 'sync-logs.json');

interface ServerLogEntry {
    id: string;
    timestamp: number;
    clientIp?: string;
    changesCount: number;
    deletionsCount: number;
    userAgent?: string;
    status: 'success' | 'failed';
    error?: string;
}

async function logSyncEvent(event: Omit<ServerLogEntry, 'id' | 'timestamp'>) {
    try {
        await ensureDataDir();
        let logs: ServerLogEntry[] = [];
        try {
            const data = await fs.readFile(SYNC_LOGS_FILE, 'utf-8');
            logs = JSON.parse(data);
        } catch {
            // No logs yet
        }

        logs.unshift({
            ...event,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        });

        // Keep last 100 logs
        if (logs.length > 100) logs.length = 100;

        await fs.writeFile(SYNC_LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error('Failed to write sync log', e);
    }
}

// Handle sync request
export async function POST(request: NextRequest) {
    try {
        const body: SyncRequest = await request.json();

        // Validate API key
        if (body.apiKey !== SYNC_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'Invalid API key' },
                { status: 401 }
            );
        }

        // Load current server data
        const serverData = await loadSyncData();
        const serverTime = Date.now();

        // Track changes for response
        const serverChanges: Spool[] = [];
        const serverDeletions: number[] = [];
        let conflictsResolved = 0;

        // Apply client changes to server
        for (const clientSpool of body.changes) {
            const existingIndex = serverData.spools.findIndex(
                s => s.id === clientSpool.id || s.serial === clientSpool.serial
            );

            if (existingIndex >= 0) {
                // Spool exists on server - check for conflict
                const serverSpool = serverData.spools[existingIndex];

                if (serverSpool.lastUpdated > body.lastSyncTime) {
                    // Conflict: both client and server modified
                    const resolved = resolveConflict(clientSpool, serverSpool);
                    serverData.spools[existingIndex] = resolved;
                    conflictsResolved++;
                } else {
                    // No conflict: client change wins
                    serverData.spools[existingIndex] = clientSpool;
                }
            } else {
                // New spool from client
                serverData.spools.push(clientSpool);
            }
        }

        // Apply client deletions to server
        for (const deletionId of body.deletions) {
            const index = serverData.spools.findIndex(s => s.id === deletionId);
            if (index >= 0) {
                serverData.spools.splice(index, 1);
            }
        }

        // Get server changes since client's last sync
        for (const spool of serverData.spools) {
            if (spool.lastUpdated > body.lastSyncTime && !spool.deleted) {
                serverChanges.push(spool);
            }
        }

        // Update server's last modified time
        serverData.lastModified = serverTime;

        // Log the event
        await logSyncEvent({
            clientIp: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            changesCount: body.changes.length,
            deletionsCount: body.deletions.length,
            status: 'success'
        });

        // Save updated data
        await saveSyncData(serverData);

        // Send response
        return NextResponse.json({
            success: true,
            serverTime,
            changes: serverChanges,
            deletions: serverDeletions,
            stats: {
                totalSpools: serverData.spools.filter(s => !s.deleted).length,
                synced: body.changes.length + body.deletions.length,
                conflictsResolved
            }
        });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Sync failed' },
            { status: 500 }
        );
    }
}

// Conflict resolution helper (same as client)
function resolveConflict(client: Spool, server: Spool): Spool {
    if (server.lastUpdated > client.lastUpdated) {
        return server;
    } else if (client.lastUpdated > server.lastUpdated) {
        return client;
    } else {
        // Same timestamp: merge
        return {
            ...server,
            weightRemaining: Math.min(client.weightRemaining, server.weightRemaining),
            lastUpdated: Math.max(client.lastUpdated, server.lastUpdated)
        };
    }
}

// GET handler for checking sync status or fetching logs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        if (searchParams.get('logs') === 'true') {
            // Basic API Key check for logs (security) - reading logs should probably be protected
            const apiKey = request.headers.get('x-api-key');
            if (apiKey !== SYNC_API_KEY) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }

            try {
                const logsData = await fs.readFile(SYNC_LOGS_FILE, 'utf-8');
                return NextResponse.json({ success: true, logs: JSON.parse(logsData) });
            } catch {
                return NextResponse.json({ success: true, logs: [] });
            }
        }

        const data = await loadSyncData();
        return NextResponse.json({
            success: true,
            totalSpools: data.spools.filter(s => !s.deleted).length,
            lastModified: data.lastModified
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
