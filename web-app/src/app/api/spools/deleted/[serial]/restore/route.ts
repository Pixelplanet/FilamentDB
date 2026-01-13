/**
 * Restore Deleted Spool API
 * 
 * POST /api/spools/deleted/[serial]/restore - Restore a deleted spool
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { safeJSONParse, prettyJSON, getSpoolFileName } from '@/lib/storage/fileUtils';
import { invalidateSpoolCache } from '@/lib/storage/server';
import { broadcastSyncEvent } from '@/lib/sync/events';

// Directory paths
const DATA_DIR = process.env.DATA_DIR || './data';
const SPOOLS_DIR = path.join(DATA_DIR, 'spools');
const DELETED_DIR = path.join(SPOOLS_DIR, '.deleted');

/**
 * POST /api/spools/deleted/[serial]/restore
 * Restore a deleted spool back to active inventory
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        const deletedPath = path.join(DELETED_DIR, `${serial}.json`);

        // Read the deleted spool
        let content: string;
        try {
            content = await fs.readFile(deletedPath, 'utf-8');
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                return NextResponse.json(
                    { error: 'Deleted spool not found' },
                    { status: 404 }
                );
            }
            throw e;
        }

        const spool = safeJSONParse<Spool>(content);
        if (!spool) {
            return NextResponse.json(
                { error: 'Failed to parse spool data' },
                { status: 500 }
            );
        }

        // Remove deleted flag and update timestamp
        delete spool.deleted;
        spool.lastUpdated = Date.now();

        // Generate new filename and write to active directory
        const newFilename = getSpoolFileName(spool);
        const newPath = path.join(SPOOLS_DIR, newFilename);

        await fs.writeFile(newPath, prettyJSON(spool), 'utf-8');

        // Remove from deleted directory
        await fs.unlink(deletedPath);

        // Also remove tombstone if exists
        const tombstonePath = path.join(SPOOLS_DIR, '.tombstones', `${serial}.json`);
        try {
            await fs.unlink(tombstonePath);
        } catch (e) {
            // Tombstone may not exist, that's fine
        }

        invalidateSpoolCache();
        broadcastSyncEvent('create', serial);

        return NextResponse.json({
            success: true,
            restored: serial,
            filename: newFilename
        });
    } catch (error) {
        console.error('Error restoring spool:', error);
        return NextResponse.json(
            { error: 'Failed to restore spool', details: String(error) },
            { status: 500 }
        );
    }
}
