/**
 * Individual Spool API
 * 
 * GET    /api/spools/[serial] - Get a specific spool
 * PUT    /api/spools/[serial] - Update a specific spool
 * DELETE /api/spools/[serial] - Delete a specific spool
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Spool } from '@/db';
import { getSpoolFileName, prettyJSON, safeJSONParse } from '@/lib/storage/fileUtils';

// Must be static for Next.js to parse at build time
export const revalidate = false;

// Directory where spool files are stored
import { SPOOLS_DIR, findSpoolFile, invalidateSpoolCache } from '@/lib/storage/server';
import { createTombstone } from '@/lib/storage/tombstones';
import { broadcastSyncEvent } from '@/lib/sync/events';



/**
 * GET /api/spools/[serial]
 * Get a specific spool by serial number
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        // Find the file
        const filename = await findSpoolFile(serial);

        if (!filename) {
            return NextResponse.json(
                { error: 'Spool not found' },
                { status: 404 }
            );
        }

        // Read and parse the file
        const filePath = path.join(SPOOLS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const spool = safeJSONParse<Spool>(content);

        if (!spool) {
            return NextResponse.json(
                { error: 'Failed to parse spool data' },
                { status: 500 }
            );
        }

        return NextResponse.json(spool);
    } catch (error) {
        console.error('Error getting spool:', error);
        return NextResponse.json(
            { error: 'Failed to get spool', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/spools/[serial]
 * Update a specific spool
 */
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        // Find the existing file
        const oldFilename = await findSpoolFile(serial);

        if (!oldFilename) {
            return NextResponse.json(
                { error: 'Spool not found' },
                { status: 404 }
            );
        }

        // Parse request body
        const updates: Partial<Spool> = await req.json();

        // Read existing spool
        const oldFilePath = path.join(SPOOLS_DIR, oldFilename);
        const oldContent = await fs.readFile(oldFilePath, 'utf-8');
        const existingSpool = safeJSONParse<Spool>(oldContent);

        if (!existingSpool) {
            return NextResponse.json(
                { error: 'Failed to parse existing spool data' },
                { status: 500 }
            );
        }

        // Merge updates
        const updatedSpool: Spool = {
            ...existingSpool,
            ...updates,
            serial, // Ensure serial doesn't change
            lastUpdated: Date.now()
        };

        // Generate new filename (in case type/brand/color changed)
        const newFilename = getSpoolFileName(updatedSpool);
        const newFilePath = path.join(SPOOLS_DIR, newFilename);

        // Write updated file
        await fs.writeFile(newFilePath, prettyJSON(updatedSpool), 'utf-8');

        // If filename changed, delete old file
        if (oldFilename !== newFilename) {
            await fs.unlink(oldFilePath);

            console.log(`Renamed spool file: ${oldFilename} -> ${newFilename}`);
        }

        invalidateSpoolCache();

        // Broadcast sync event
        broadcastSyncEvent('update', serial);

        return NextResponse.json({
            success: true,
            filename: newFilename,
            spool: updatedSpool
        });
    } catch (error) {
        console.error('Error updating spool:', error);
        return NextResponse.json(
            { error: 'Failed to update spool', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/spools/[serial]
 * Delete a specific spool (moves to recycle bin and creates tombstone for sync)
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ serial: string }> }
) {
    try {
        const params = await context.params;
        const serial = params.serial;

        // Find the file
        const filename = await findSpoolFile(serial);

        if (!filename) {
            return NextResponse.json(
                { error: 'Spool not found' },
                { status: 404 }
            );
        }

        // Read the spool before moving
        const filePath = path.join(SPOOLS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        const spool = safeJSONParse<Spool>(content);

        if (!spool) {
            return NextResponse.json(
                { error: 'Failed to parse spool data' },
                { status: 500 }
            );
        }

        // Get device/user ID from request headers
        const deletedBy = req.headers.get('x-device-id') || req.headers.get('x-user-id') || undefined;

        // Mark spool as deleted and update timestamp
        spool.deleted = true;
        spool.lastUpdated = Date.now();

        // Ensure .deleted directory exists
        const deletedDir = path.join(SPOOLS_DIR, '.deleted');
        await fs.mkdir(deletedDir, { recursive: true });

        // Move to .deleted folder (using serial.json for consistency)
        const deletedPath = path.join(deletedDir, `${serial}.json`);
        await fs.writeFile(deletedPath, prettyJSON(spool), 'utf-8');

        // Create tombstone for sync BEFORE deleting the original file
        await createTombstone(SPOOLS_DIR, serial, deletedBy, spool?.ownerId);

        // Delete the original file
        await fs.unlink(filePath);

        invalidateSpoolCache();

        // Broadcast sync event
        broadcastSyncEvent('delete', serial);

        return NextResponse.json({
            success: true,
            deleted: filename,
            tombstone: true,
            recycleBin: true
        });
    } catch (error) {
        console.error('Error deleting spool:', error);
        return NextResponse.json(
            { error: 'Failed to delete spool', details: String(error) },
            { status: 500 }
        );
    }
}

