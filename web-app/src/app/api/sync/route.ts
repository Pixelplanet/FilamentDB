
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { getSpoolFileName, prettyJSON, safeJSONParse } from '@/lib/storage/fileUtils';
import { SPOOLS_DIR, findSpoolFile, invalidateSpoolCache } from '@/lib/storage/server';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

export const revalidate = false;

// Feature Flags
const AUTH_ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'dev-key-change-in-production';

// Ensure spools directory exists
async function ensureSpoolsDir() {
    try {
        await fs.access(SPOOLS_DIR);
    } catch {
        await fs.mkdir(SPOOLS_DIR, { recursive: true });
    }
}

interface SyncRequest {
    apiKey?: string;
    lastSyncTime: number;
    changes: Spool[];
    deletions: number[]; // Deletions by ID usually, but we use Serial sometimes? 
    // Mobile Sync sends IDs. Spools have IDs? Types says ID is optional number.
    // We should probably rely on Serial for sync if possible, but existing sync might use IDs.
    // Let's check existing sync.ts: It sends "deletions: number[]".
    // But our spools are file-based, serial-based.
    // We need to map ID to Serial or support Serial deletions.
    // If ID is not persistent across devices (it is auto-increment on some DBs), Serial is better.
    // But Mobile App might be using IDs locally.
    // Let's assume deletions might need robust handling.
}

export async function POST(req: NextRequest) {
    try {
        await ensureSpoolsDir();
        const body: SyncRequest = await req.json();

        // 1. Authentication
        let user = null;
        if (AUTH_ENABLED) {
            user = await getUserFromRequest(req);

            // If no user, check API Key (System Sync / Legacy)
            if (!user && body.apiKey !== SYNC_API_KEY) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            // Check API Key
            if (body.apiKey !== SYNC_API_KEY) {
                return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
            }
        }

        const serverChanges: Spool[] = [];
        const conflictsResolved = 0; // Tracking not fully impl here yet

        // 2. Load all Server Spools (for diffing) - Expensive but needed for simple sync
        // Optimization: We could filter by timestamp if we trust file mod times, 
        // but we need to check IDs for deletions and serials for matching.
        const files = await fs.readdir(SPOOLS_DIR);
        const serverSpools: Spool[] = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(SPOOLS_DIR, file), 'utf-8');
                const s = safeJSONParse<Spool>(content);
                if (s) serverSpools.push(s);
            } catch { }
        }

        // 3. Process Client Changes
        for (const clientSpool of body.changes) {
            // Find existing
            const existing = serverSpools.find(s => s.serial === clientSpool.serial); // Match by Serial first

            // Auth Check for this spool
            if (AUTH_ENABLED && user) {
                // Determine ownership
                if (existing) {
                    if (existing.ownerId && existing.ownerId !== user.id && user.role !== 'admin') {
                        console.warn(`Sync: User ${user.username} tried to modify spool ${existing.serial} owned by ${existing.ownerId} `);
                        continue; // Skip unauthorized change
                    }
                    // Preserve Owner
                    clientSpool.ownerId = existing.ownerId;
                } else {
                    // New or Adoption
                    // If existing has NO owner, it's legacy/public.
                    // If User edits it, maybe they claim it? 
                    // Or we intentionally set ownerId.
                    clientSpool.ownerId = user.id;
                }

                // Visibility
                if (!clientSpool.visibility) clientSpool.visibility = 'private'; // Default
            }

            // Timestamp Check (Conflict Resolution)
            if (existing) {
                if (existing.lastUpdated > clientSpool.lastUpdated) {
                    // Server wins (Conflict)
                    // We don't write. We will return existing as "change" to client later.
                    continue;
                }
            }

            // Write Change
            const filename = getSpoolFileName(clientSpool);
            await fs.writeFile(path.join(SPOOLS_DIR, filename), prettyJSON(clientSpool), 'utf-8');

            // Invalidate cache if new
            if (!existing) invalidateSpoolCache();

            // Handle Renames (if serial changed? Serial shouldn't change. If brand/name changed, filename changes)
            if (existing) {
                const oldName = getSpoolFileName(existing);
                if (oldName !== filename) {
                    await fs.unlink(path.join(SPOOLS_DIR, oldName)).catch(() => { });
                }
            }
        }

        // 4. Process Deletions
        // Client sends IDs. We need to find spools with those IDs.
        // Wait, Mobile IDs are numbers? Spool.id is number (Legacy) or String (UUID)?
        // Types in db/index.ts say `id ?: number`.
        for (const id of body.deletions) {
            const toDelete = serverSpools.find(s => s.id === id);
            if (toDelete) {
                if (AUTH_ENABLED && user) {
                    if (toDelete.ownerId && toDelete.ownerId !== user.id && user.role !== 'admin') {
                        continue;
                    }
                }
                const filename = getSpoolFileName(toDelete);
                await fs.unlink(path.join(SPOOLS_DIR, filename)).catch(() => { });
                invalidateSpoolCache();
            }
        }

        // 5. Gather Server Changes (Changes occurring AFTER client's lastSyncTime)
        // We need to re-read? Or just use serverSpools (which might be stale if we just wrote? No, we iterated serverSpools before write).
        // Actually, we should return the UPDATED state.
        // But for "Server Changes", we want to send what the Client DOESN'T have.
        // If we just wrote Client's change, we don't need to echo it back unless conflict?
        // Logic:
        // Iterate all Server Spools (Fresh List).
        // If spool.lastUpdated > body.lastSyncTime -> Include.
        // Filter by Visibility for User.

        const finalFiles = await fs.readdir(SPOOLS_DIR);
        const finalSpools: Spool[] = [];
        for (const file of finalFiles) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(SPOOLS_DIR, file), 'utf-8');
                const s = safeJSONParse<Spool>(content);
                if (s) finalSpools.push(s);
            } catch { }
        }

        const changesToSend = finalSpools.filter(s => {
            // Time Check
            if (s.lastUpdated <= body.lastSyncTime) return false;

            // Auth Check
            if (AUTH_ENABLED && user) {
                const isOwner = s.ownerId === user.id;
                const isAdmin = user.role === 'admin';
                const isPublic = s.visibility === 'public';
                const isLegacy = !s.ownerId;
                return isOwner || isAdmin || isPublic || isLegacy;
            }

            return true;
        });

        // 6. Return
        return NextResponse.json({
            success: true,
            serverTime: Date.now(),
            changes: changesToSend,
            deletions: [], // We don't track server-side deletions cleanly yet (no tombstoning in file system? Deletion log needed?)
            // If file is gone, client keeps it?
            // "Sync" assumes Deleted IDs are tracked.
            // If we assume "Simple Sync" (Client pushes, Client pulls), Client needs to know what was deleted on server.
            // Since we deleted files, we lost the record. 
            // We need a "Deletion Log" if we want 2-way deletion sync.
            // Current "simpleSync" implementation on client likely relies on separate deletion list?
            // Or maybe it does not handle Server-Side deletions syncing to Mobile well without a log.
            // For now, we return empty deletions.
        });

    } catch (e: any) {
        console.error('Unified Sync Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
